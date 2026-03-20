/**
 * Smart Digital Canteen System - Authentication Module
 * 
 * This file handles all authentication-related functionality:
 * - User registration
 * - User login
 * - Role-based authentication
 * - Session management
 * - Logout functionality
 */

// ============================================
// AUTH FUNCTIONS
// ============================================

/**
 * Register a new user
 * @param {object} userData - User registration data
 * @returns {object} Result object with success status and message
 */
function registerUser(userData) {
    const { name, email, password, role = USER_ROLES.CUSTOMER } = userData;
    
    // Validate required fields
    if (!name || !email || !password) {
        return { success: false, message: 'All fields are required' };
    }
    
    // Validate email format
    if (!isValidEmail(email)) {
        return { success: false, message: 'Please enter a valid email address' };
    }
    
    // Validate password length
    if (password.length < 6) {
        return { success: false, message: 'Password must be at least 6 characters' };
    }
    
    // Get existing users
    const users = getFromStorage(STORAGE_KEYS.USERS) || [];
    
    // Check if email already exists
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        return { success: false, message: 'Email already registered' };
    }
    
    // Create new user
    const newUser = {
        id: generateId(),
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: password, // In production, this should be hashed
        role: role,
        createdAt: new Date().toISOString()
    };
    
    // Add user to storage
    users.push(newUser);
    saveToStorage(STORAGE_KEYS.USERS, users);
    
    // If staff, also add to staff members list
    if (role === USER_ROLES.STAFF) {
        const staffMembers = getFromStorage(STORAGE_KEYS.STAFF_MEMBERS) || [];
        staffMembers.push({
            ...newUser,
            ordersCompleted: 0,
            rating: 0,
            joinedAt: newUser.createdAt
        });
        saveToStorage(STORAGE_KEYS.STAFF_MEMBERS, staffMembers);
    }
    
    return { success: true, message: 'Registration successful!', user: newUser };
}

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} expectedRole - Expected role for the login page
 * @returns {object} Result object with success status and user data
 */
function loginUser(email, password, expectedRole = null) {
    // Validate inputs
    if (!email || !password) {
        return { success: false, message: 'Email and password are required' };
    }
    
    // Get users
    const users = getFromStorage(STORAGE_KEYS.USERS) || [];
    
    // Find user by email (case-insensitive)
    const user = users.find(u => 
        u.email.toLowerCase() === email.toLowerCase().trim()
    );
    
    // Check if user exists
    if (!user) {
        return { success: false, message: 'Invalid email or password' };
    }
    
    // Check password
    if (user.password !== password) {
        return { success: false, message: 'Invalid email or password' };
    }
    
    // Check role if expected role is specified
    if (expectedRole && user.role !== expectedRole) {
        return { 
            success: false, 
            message: `This login is for ${expectedRole}s only. Please use the correct login page.` 
        };
    }
    
    // Create session (store current user)
    const sessionUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        loginAt: new Date().toISOString()
    };
    
    saveToStorage(STORAGE_KEYS.CURRENT_USER, sessionUser);
    
    return { success: true, message: 'Login successful!', user: sessionUser };
}

/**
 * Logout current user
 */
function logoutUser() {
    removeFromStorage(STORAGE_KEYS.CURRENT_USER);
    // Clear cart on logout
    removeFromStorage(STORAGE_KEYS.CART);
    navigateTo('../index.html');
}

/**
 * Get current logged-in user
 * @returns {object|null} Current user or null
 */
function getCurrentUser() {
    return getFromStorage(STORAGE_KEYS.CURRENT_USER);
}

/**
 * Check if user is logged in
 * @returns {boolean}
 */
function isLoggedIn() {
    return getCurrentUser() !== null;
}

/**
 * Check if current user has specific role
 * @param {string} role - Role to check
 * @returns {boolean}
 */
function hasRole(role) {
    const user = getCurrentUser();
    return user && user.role === role;
}

/**
 * Protect page - redirect if not authenticated or wrong role
 * @param {string} requiredRole - Required role for access
 */
function protectPage(requiredRole) {
    const user = getCurrentUser();
    
    if (!user) {
        showToast('Please login to continue', 'warning');
        setTimeout(() => {
            navigateTo('../index.html');
        }, 1000);
        return false;
    }
    
    if (requiredRole && user.role !== requiredRole) {
        showToast('Access denied. You do not have permission.', 'error');
        setTimeout(() => {
            redirectToDashboard(user.role);
        }, 1000);
        return false;
    }
    
    return true;
}

/**
 * Redirect user to appropriate dashboard based on role
 * @param {string} role - User role
 */
function redirectToDashboard(role) {
    switch (role) {
        case USER_ROLES.CUSTOMER:
            navigateTo('../customer/landing.html');
            break;
        case USER_ROLES.STAFF:
            navigateTo('../staff/landing.html');
            break;
        case USER_ROLES.ADMIN:
            navigateTo('../admin/landing.html');
            break;
        default:
            navigateTo('../index.html');
    }
}

// ============================================
// LOGIN FORM HANDLER
// ============================================

/**
 * Setup login form handler
 * @param {string} formId - Form element ID
 * @param {string} role - Expected user role
 */
function setupLoginForm(formId, role) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = form.querySelector('[name="email"]').value;
        const password = form.querySelector('[name="password"]').value;
        
        const result = loginUser(email, password, role);
        
        if (result.success) {
            showToast(result.message, 'success');
            setTimeout(() => {
                redirectToDashboard(role);
            }, 1000);
        } else {
            showToast(result.message, 'error');
        }
    });
}

/**
 * Setup registration form handler
 * @param {string} formId - Form element ID
 * @param {string} role - User role for registration
 */
function setupRegisterForm(formId, role) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = form.querySelector('[name="name"]').value;
        const email = form.querySelector('[name="email"]').value;
        const password = form.querySelector('[name="password"]').value;
        const confirmPassword = form.querySelector('[name="confirmPassword"]')?.value;
        
        // Check password confirmation
        if (confirmPassword && password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }
        
        const result = registerUser({ name, email, password, role });
        
        if (result.success) {
            showToast(result.message, 'success');
            setTimeout(() => {
                // Redirect to login page
                switch (role) {
                    case USER_ROLES.CUSTOMER:
                        navigateTo('login.html');
                        break;
                    case USER_ROLES.STAFF:
                        navigateTo('login.html');
                        break;
                    default:
                        navigateTo('../index.html');
                }
            }, 1500);
        } else {
            showToast(result.message, 'error');
        }
    });
}

/**
 * Setup logout button handler
 */
function setupLogoutButton() {
    const logoutBtns = document.querySelectorAll('.logout-btn, [data-action="logout"]');
    
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                logoutUser();
            }
        });
    });
}

// ============================================
// INITIALIZATION
// ============================================

// Auto-setup logout buttons when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setupLogoutButton();
});
