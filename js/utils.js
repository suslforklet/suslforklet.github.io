/**
 * Smart Digital Canteen System - Utility Functions
 * 
 * This file contains common utility functions used across the application.
 * These functions help with:
 * - LocalStorage operations
 * - Token generation
 * - Date/Time formatting
 * - Notifications
 * - Common DOM operations
 */

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEYS = {
    USERS: 'canteen_users',
    CURRENT_USER: 'canteen_current_user',
    MENU_ITEMS: 'canteen_menu_items',
    CART: 'canteen_cart',
    ORDERS: 'canteen_orders',
    SHOP_LOCATION: 'canteen_shop_location',
    STAFF_MEMBERS: 'canteen_staff_members'
};

// Order statuses
const ORDER_STATUS = {
    PENDING: 'pending',
    PREPARING: 'preparing',
    READY: 'ready',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
};

// User roles
const USER_ROLES = {
    CUSTOMER: 'customer',
    STAFF: 'staff',
    ADMIN: 'admin'
};

// ============================================
// LOCAL STORAGE OPERATIONS
// ============================================

/**
 * Get data from localStorage
 * @param {string} key - Storage key
 * @returns {any} Parsed data or null
 */
function getFromStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return null;
    }
}

/**
 * Save data to localStorage
 * @param {string} key - Storage key
 * @param {any} data - Data to save
 */
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

/**
 * Remove data from localStorage
 * @param {string} key - Storage key
 */
function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Error removing from localStorage:', error);
    }
}

/**
 * Clear all canteen data from localStorage
 */
function clearAllStorage() {
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
}

// ============================================
// TOKEN GENERATION
// ============================================

/**
 * Generate a unique token number for orders
 * Format: TKN-YYYYMMDD-XXXX (e.g., TKN-20260110-0042)
 * @returns {string} Unique token number
 */
function generateToken() {
    const date = new Date();
    const dateStr = date.getFullYear().toString() +
        (date.getMonth() + 1).toString().padStart(2, '0') +
        date.getDate().toString().padStart(2, '0');
    
    // Get today's order count to generate sequential token
    const orders = getFromStorage(STORAGE_KEYS.ORDERS) || [];
    const todayOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt).toDateString();
        return orderDate === date.toDateString();
    });
    
    const sequenceNum = (todayOrders.length + 1).toString().padStart(4, '0');
    return `TKN-${dateStr}-${sequenceNum}`;
}

/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ============================================
// DATE/TIME FORMATTING
// ============================================

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
    const d = new Date(date);
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return d.toLocaleDateString('en-US', options);
}

/**
 * Format date to short format
 * @param {string|Date} date - Date to format
 * @returns {string} Short formatted date
 */
function formatDateShort(date) {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
    });
}

/**
 * Format time only
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted time
 */
function formatTime(date) {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

/**
 * Get relative time string (e.g., "2 minutes ago")
 * @param {string|Date} date - Date to compare
 * @returns {string} Relative time string
 */
function getRelativeTime(date) {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now - d;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    return formatDateShort(date);
}

// ============================================
// CURRENCY FORMATTING
// ============================================

/**
 * Format number to currency
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
    return 'Rs. ' + parseFloat(amount).toFixed(2);
}

// ============================================
// NOTIFICATIONS (TOAST)
// ============================================

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds
 */
function showToast(message, type = 'info', duration = 3000) {
    // Create toast container if it doesn't exist
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icon based on type
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);

    // Remove toast after duration
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ============================================
// DOM UTILITIES
// ============================================

/**
 * Get element by ID (shorthand)
 * @param {string} id - Element ID
 * @returns {HTMLElement|null}
 */
function $(id) {
    return document.getElementById(id);
}

/**
 * Query selector shorthand
 * @param {string} selector - CSS selector
 * @returns {HTMLElement|null}
 */
function $$(selector) {
    return document.querySelector(selector);
}

/**
 * Query selector all shorthand
 * @param {string} selector - CSS selector
 * @returns {NodeList}
 */
function $$$(selector) {
    return document.querySelectorAll(selector);
}

/**
 * Create HTML element with attributes
 * @param {string} tag - HTML tag
 * @param {object} attrs - Attributes object
 * @param {string} innerHTML - Inner HTML content
 * @returns {HTMLElement}
 */
function createElement(tag, attrs = {}, innerHTML = '') {
    const element = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'dataset') {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                element.dataset[dataKey] = dataValue;
            });
        } else {
            element.setAttribute(key, value);
        }
    });
    if (innerHTML) element.innerHTML = innerHTML;
    return element;
}

/**
 * Add event listener with delegation
 * @param {HTMLElement} parent - Parent element
 * @param {string} eventType - Event type
 * @param {string} selector - Child selector
 * @param {Function} handler - Event handler
 */
function delegate(parent, eventType, selector, handler) {
    parent.addEventListener(eventType, (event) => {
        const target = event.target.closest(selector);
        if (target && parent.contains(target)) {
            handler.call(target, event);
        }
    });
}

// ============================================
// FORM VALIDATION
// ============================================

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean}
 */
function isValidPhone(phone) {
    const regex = /^[\d\s\-+()]{10,}$/;
    return regex.test(phone);
}

/**
 * Validate required field
 * @param {string} value - Value to check
 * @returns {boolean}
 */
function isRequired(value) {
    return value !== null && value !== undefined && value.toString().trim() !== '';
}

/**
 * Validate minimum length
 * @param {string} value - Value to check
 * @param {number} minLength - Minimum length
 * @returns {boolean}
 */
function hasMinLength(value, minLength) {
    return value && value.length >= minLength;
}

// ============================================
// URL UTILITIES
// ============================================

/**
 * Get URL query parameter
 * @param {string} param - Parameter name
 * @returns {string|null}
 */
function getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

/**
 * Navigate to a page
 * @param {string} url - URL to navigate to
 */
function navigateTo(url) {
    window.location.href = url;
}

/**
 * Redirect to login if not authenticated
 * @param {string} requiredRole - Required role for access
 */
function requireAuth(requiredRole = null) {
    const currentUser = getFromStorage(STORAGE_KEYS.CURRENT_USER);
    
    if (!currentUser) {
        navigateTo('../index.html');
        return false;
    }
    
    if (requiredRole && currentUser.role !== requiredRole) {
        showToast('You do not have permission to access this page', 'error');
        
        // Redirect to appropriate dashboard
        switch (currentUser.role) {
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
        return false;
    }
    
    return true;
}

// ============================================
// INITIALIZE SAMPLE DATA
// ============================================

/**
 * Initialize application with sample data if not exists
 */
function initializeSampleData() {
    // Sample Menu Items
    if (!getFromStorage(STORAGE_KEYS.MENU_ITEMS)) {
        const sampleMenuItems = [
            {
                id: generateId(),
                name: 'Chicken Rice',
                description: 'Aromatic rice served with tender chicken pieces and special sauce',
                price: 350,
                category: 'Rice',
                image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400',
                available: true,
                preparationTime: 15
            },
            {
                id: generateId(),
                name: 'Vegetable Fried Rice',
                description: 'Wok-fried rice with fresh vegetables and soy sauce',
                price: 280,
                category: 'Rice',
                image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400',
                available: true,
                preparationTime: 12
            },
            {
                id: generateId(),
                name: 'Chicken Kottu',
                description: 'Shredded roti stir-fried with chicken, vegetables, and spices',
                price: 400,
                category: 'Kottu',
                image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400',
                available: true,
                preparationTime: 18
            },
            {
                id: generateId(),
                name: 'Cheese Kottu',
                description: 'Classic kottu topped with melted cheese',
                price: 450,
                category: 'Kottu',
                image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400',
                available: true,
                preparationTime: 20
            },
            {
                id: generateId(),
                name: 'Chicken Burger',
                description: 'Crispy chicken patty with lettuce, tomato, and special sauce',
                price: 320,
                category: 'Burgers',
                image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
                available: true,
                preparationTime: 10
            },
            {
                id: generateId(),
                name: 'Beef Burger',
                description: 'Juicy beef patty with cheese, pickles, and classic toppings',
                price: 380,
                category: 'Burgers',
                image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
                available: true,
                preparationTime: 12
            },
            {
                id: generateId(),
                name: 'Fish & Chips',
                description: 'Crispy battered fish fillets with golden fries',
                price: 420,
                category: 'Seafood',
                image: 'https://images.unsplash.com/photo-1579208575657-c595a05383b7?w=400',
                available: true,
                preparationTime: 15
            },
            {
                id: generateId(),
                name: 'Chicken Submarine',
                description: 'Long bread roll filled with spicy chicken, veggies, and sauce',
                price: 350,
                category: 'Submarines',
                image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=400',
                available: true,
                preparationTime: 8
            },
            {
                id: generateId(),
                name: 'Vegetable Submarine',
                description: 'Fresh vegetables with cheese in a toasted sub roll',
                price: 280,
                category: 'Submarines',
                image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=400',
                available: true,
                preparationTime: 7
            },
            {
                id: generateId(),
                name: 'Fresh Orange Juice',
                description: 'Freshly squeezed orange juice',
                price: 150,
                category: 'Beverages',
                image: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=400',
                available: true,
                preparationTime: 5
            },
            {
                id: generateId(),
                name: 'Mango Smoothie',
                description: 'Creamy smoothie made with fresh mangoes',
                price: 180,
                category: 'Beverages',
                image: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=400',
                available: true,
                preparationTime: 5
            },
            {
                id: generateId(),
                name: 'Chocolate Cake Slice',
                description: 'Rich chocolate cake with chocolate frosting',
                price: 200,
                category: 'Desserts',
                image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400',
                available: true,
                preparationTime: 2
            },
            {
                id: generateId(),
                name: 'Ice Cream Sundae',
                description: 'Vanilla ice cream with chocolate sauce and toppings',
                price: 220,
                category: 'Desserts',
                image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400',
                available: true,
                preparationTime: 3
            },
            {
                id: generateId(),
                name: 'French Fries',
                description: 'Crispy golden French fries with ketchup',
                price: 150,
                category: 'Snacks',
                image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400',
                available: true,
                preparationTime: 8
            },
            {
                id: generateId(),
                name: 'Chicken Wings',
                description: 'Spicy chicken wings with dipping sauce',
                price: 350,
                category: 'Snacks',
                image: 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=400',
                available: true,
                preparationTime: 12
            }
        ];
        saveToStorage(STORAGE_KEYS.MENU_ITEMS, sampleMenuItems);
    }

    // Sample Admin User
    const users = getFromStorage(STORAGE_KEYS.USERS) || [];
    if (!users.find(u => u.role === USER_ROLES.ADMIN)) {
        users.push({
            id: generateId(),
            name: 'Admin User',
            email: 'admin@canteen.com',
            password: 'admin123',
            role: USER_ROLES.ADMIN,
            createdAt: new Date().toISOString()
        });
        saveToStorage(STORAGE_KEYS.USERS, users);
    }

    // Sample Staff Members
    if (!getFromStorage(STORAGE_KEYS.STAFF_MEMBERS)) {
        const sampleStaff = [
            {
                id: generateId(),
                name: 'John Cook',
                email: 'john@canteen.com',
                password: 'staff123',
                role: USER_ROLES.STAFF,
                ordersCompleted: 45,
                rating: 4.5,
                joinedAt: new Date().toISOString()
            },
            {
                id: generateId(),
                name: 'Sarah Helper',
                email: 'sarah@canteen.com',
                password: 'staff123',
                role: USER_ROLES.STAFF,
                ordersCompleted: 38,
                rating: 4.8,
                joinedAt: new Date().toISOString()
            }
        ];
        saveToStorage(STORAGE_KEYS.STAFF_MEMBERS, sampleStaff);
        
        // Also add to users
        sampleStaff.forEach(staff => {
            const existingUsers = getFromStorage(STORAGE_KEYS.USERS) || [];
            if (!existingUsers.find(u => u.email === staff.email)) {
                existingUsers.push(staff);
                saveToStorage(STORAGE_KEYS.USERS, existingUsers);
            }
        });
    }

    // Sample Shop Location
    if (!getFromStorage(STORAGE_KEYS.SHOP_LOCATION)) {
        saveToStorage(STORAGE_KEYS.SHOP_LOCATION, {
            name: 'SUSL Main Canteen',
            address: 'Sabaragamuwa University of Sri Lanka, Belihuloya',
            lat: 6.7106,
            lng: 80.7846,
            phone: '+94 45 2280014',
            openHours: '7:00 AM - 8:00 PM'
        });
    }

    // Initialize empty orders and cart
    if (!getFromStorage(STORAGE_KEYS.ORDERS)) {
        saveToStorage(STORAGE_KEYS.ORDERS, []);
    }
    if (!getFromStorage(STORAGE_KEYS.CART)) {
        saveToStorage(STORAGE_KEYS.CART, []);
    }
}

// ============================================
// NAVIGATION HELPERS
// ============================================

/**
 * Setup mobile navigation toggle
 */
function setupMobileNav() {
    const toggle = document.querySelector('.navbar-toggle');
    const nav = document.querySelector('.navbar-nav');
    
    if (toggle && nav) {
        toggle.addEventListener('click', () => {
            nav.classList.toggle('active');
        });

        // Close nav when clicking outside
        document.addEventListener('click', (e) => {
            if (!toggle.contains(e.target) && !nav.contains(e.target)) {
                nav.classList.remove('active');
            }
        });
    }
}

/**
 * Update cart count badge
 */
function updateCartBadge() {
    const cart = getFromStorage(STORAGE_KEYS.CART) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.querySelector('.cart-count');
    
    if (badge) {
        badge.textContent = totalItems;
        badge.style.display = totalItems > 0 ? 'block' : 'none';
    }
}

/**
 * Update user info in navbar
 */
function updateUserNav() {
    const currentUser = getFromStorage(STORAGE_KEYS.CURRENT_USER);
    const userNameEl = document.querySelector('.user-name');
    
    if (userNameEl && currentUser) {
        userNameEl.textContent = currentUser.name;
    }
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize sample data when utils.js loads
document.addEventListener('DOMContentLoaded', () => {
    initializeSampleData();
    setupMobileNav();
    updateCartBadge();
    updateUserNav();
});

// Export for use in other modules (if using ES modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        STORAGE_KEYS,
        ORDER_STATUS,
        USER_ROLES,
        getFromStorage,
        saveToStorage,
        removeFromStorage,
        generateToken,
        generateId,
        formatDate,
        formatCurrency,
        showToast,
        requireAuth,
        navigateTo
    };
}
