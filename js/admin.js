/**
 * Smart Digital Canteen System - Admin Module
 * 
 * This file handles admin-specific functionality:
 * - Staff member management
 * - Performance tracking
 * - Shop location management
 * - System statistics
 */

// ============================================
// ADMIN DASHBOARD FUNCTIONS
// ============================================

/**
 * Initialize admin dashboard
 */
function initAdminDashboard() {
    // Check authentication
    if (!protectPage(USER_ROLES.ADMIN)) return;
    
    // Render dashboard components
    renderAdminStats();
    renderStaffList('staffListContainer');
    
    // Update user name in navbar
    const currentUser = getCurrentUser();
    const userNameEl = document.querySelector('.user-name');
    if (userNameEl && currentUser) {
        userNameEl.textContent = currentUser.name;
    }
}

/**
 * Render admin statistics
 */
function renderAdminStats() {
    const orders = getAllOrders();
    const today = new Date().toDateString();
    const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
    
    // Calculate stats
    const stats = {
        totalOrders: todayOrders.length,
        completedOrders: todayOrders.filter(o => o.status === ORDER_STATUS.COMPLETED).length,
        pendingOrders: todayOrders.filter(o => 
            o.status === ORDER_STATUS.PENDING || 
            o.status === ORDER_STATUS.PREPARING ||
            o.status === ORDER_STATUS.READY
        ).length,
        totalRevenue: todayOrders
            .filter(o => o.status === ORDER_STATUS.COMPLETED)
            .reduce((sum, o) => sum + o.total, 0),
        staffCount: (getFromStorage(STORAGE_KEYS.STAFF_MEMBERS) || []).length
    };
    
    // Update DOM
    const totalOrdersEl = document.getElementById('totalOrders');
    const completedOrdersEl = document.getElementById('completedOrders');
    const pendingOrdersEl = document.getElementById('pendingOrders');
    const totalRevenueEl = document.getElementById('totalRevenue');
    const staffCountEl = document.getElementById('staffCount');
    
    if (totalOrdersEl) totalOrdersEl.textContent = stats.totalOrders;
    if (completedOrdersEl) completedOrdersEl.textContent = stats.completedOrders;
    if (pendingOrdersEl) pendingOrdersEl.textContent = stats.pendingOrders;
    if (totalRevenueEl) totalRevenueEl.textContent = formatCurrency(stats.totalRevenue);
    if (staffCountEl) staffCountEl.textContent = stats.staffCount;
}

// ============================================
// STAFF MANAGEMENT
// ============================================

/**
 * Get all staff members
 * @returns {Array} Array of staff members
 */
function getStaffMembers() {
    return getFromStorage(STORAGE_KEYS.STAFF_MEMBERS) || [];
}

/**
 * Add new staff member
 * @param {object} staffData - Staff member data
 * @returns {object} Result object
 */
function addStaffMember(staffData) {
    const { name, email, password } = staffData;
    
    // Validate required fields
    if (!name || !email || !password) {
        return { success: false, message: 'All fields are required' };
    }
    
    // Validate email
    if (!isValidEmail(email)) {
        return { success: false, message: 'Please enter a valid email' };
    }
    
    // Check if email exists
    const users = getFromStorage(STORAGE_KEYS.USERS) || [];
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        return { success: false, message: 'Email already registered' };
    }
    
    // Create staff member
    const newStaff = {
        id: generateId(),
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: password,
        role: USER_ROLES.STAFF,
        ordersCompleted: 0,
        rating: 0,
        joinedAt: new Date().toISOString()
    };
    
    // Add to staff members
    const staffMembers = getStaffMembers();
    staffMembers.push(newStaff);
    saveToStorage(STORAGE_KEYS.STAFF_MEMBERS, staffMembers);
    
    // Add to users
    users.push({
        id: newStaff.id,
        name: newStaff.name,
        email: newStaff.email,
        password: newStaff.password,
        role: USER_ROLES.STAFF,
        createdAt: newStaff.joinedAt
    });
    saveToStorage(STORAGE_KEYS.USERS, users);
    
    return { success: true, message: 'Staff member added successfully!', staff: newStaff };
}

/**
 * Remove staff member
 * @param {string} staffId - Staff member ID
 * @returns {object} Result object
 */
function removeStaffMember(staffId) {
    // Remove from staff members
    const staffMembers = getStaffMembers();
    const filteredStaff = staffMembers.filter(s => s.id !== staffId);
    
    if (filteredStaff.length === staffMembers.length) {
        return { success: false, message: 'Staff member not found' };
    }
    
    saveToStorage(STORAGE_KEYS.STAFF_MEMBERS, filteredStaff);
    
    // Also remove from users
    const users = getFromStorage(STORAGE_KEYS.USERS) || [];
    const filteredUsers = users.filter(u => u.id !== staffId);
    saveToStorage(STORAGE_KEYS.USERS, filteredUsers);
    
    return { success: true, message: 'Staff member removed successfully!' };
}

/**
 * Get staff performance data
 * @param {string} staffId - Staff member ID
 * @returns {object} Performance data
 */
function getStaffPerformance(staffId) {
    const staffMembers = getStaffMembers();
    const staff = staffMembers.find(s => s.id === staffId);
    
    if (!staff) return null;
    
    // Get orders completed by this staff (in real app, orders would have staffId)
    const orders = getAllOrders();
    const today = new Date().toDateString();
    
    // For demo, we'll use general stats
    const todayOrders = orders.filter(o => 
        new Date(o.createdAt).toDateString() === today &&
        o.status === ORDER_STATUS.COMPLETED
    );
    
    return {
        ...staff,
        todayOrders: Math.floor(todayOrders.length / (staffMembers.length || 1)),
        totalOrders: staff.ordersCompleted || 0
    };
}

/**
 * Render staff list
 * @param {string} containerId - Container element ID
 */
function renderStaffList(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const staffMembers = getStaffMembers();
    
    if (staffMembers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <h3 class="empty-state-title">No staff members</h3>
                <p class="empty-state-text">Add your first staff member to get started</p>
                <button class="btn btn-admin-primary" onclick="openAddStaffModal()">
                    ➕ Add Staff Member
                </button>
            </div>
        `;
        return;
    }
    
    let html = '<div class="staff-grid">';
    
    staffMembers.forEach(staff => {
        const performance = getStaffPerformance(staff.id);
        const initials = staff.name.split(' ').map(n => n[0]).join('').toUpperCase();
        
        html += `
            <div class="staff-card" data-staff-id="${staff.id}">
                <div class="staff-avatar">${initials}</div>
                <h3 class="staff-name">${staff.name}</h3>
                <p class="staff-email">${staff.email}</p>
                <div class="staff-stats">
                    <div class="staff-stat">
                        <div class="staff-stat-value">${performance?.totalOrders || 0}</div>
                        <div class="staff-stat-label">Total Orders</div>
                    </div>
                    <div class="staff-stat">
                        <div class="staff-stat-value">${performance?.todayOrders || 0}</div>
                        <div class="staff-stat-label">Today</div>
                    </div>
                </div>
                <p style="color: var(--gray-dark); font-size: 0.75rem; margin-top: 0.5rem;">
                    Joined: ${formatDateShort(staff.joinedAt)}
                </p>
                <button class="btn btn-danger btn-sm mt-md remove-staff-btn" data-staff-id="${staff.id}">
                    🗑️ Remove
                </button>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    // Setup remove handlers
    setupStaffRemoveHandlers(containerId);
}

/**
 * Setup staff remove button handlers
 * @param {string} containerId - Container element ID
 */
function setupStaffRemoveHandlers(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-staff-btn');
        if (removeBtn) {
            const staffId = removeBtn.dataset.staffId;
            if (confirm('Are you sure you want to remove this staff member?')) {
                const result = removeStaffMember(staffId);
                if (result.success) {
                    showToast(result.message, 'success');
                    renderStaffList(containerId);
                    renderAdminStats();
                } else {
                    showToast(result.message, 'error');
                }
            }
        }
    });
}

/**
 * Open add staff modal
 */
function openAddStaffModal() {
    const modal = document.getElementById('addStaffModal');
    if (modal) {
        modal.classList.add('active');
    }
}

/**
 * Setup add staff form
 */
function setupAddStaffForm() {
    const form = document.getElementById('addStaffForm');
    if (!form) return;
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const staffData = {
            name: form.querySelector('[name="staffName"]').value,
            email: form.querySelector('[name="staffEmail"]').value,
            password: form.querySelector('[name="staffPassword"]').value
        };
        
        const result = addStaffMember(staffData);
        
        if (result.success) {
            showToast(result.message, 'success');
            form.reset();
            renderStaffList('staffListContainer');
            renderAdminStats();
            closeModal('addStaffModal');
        } else {
            showToast(result.message, 'error');
        }
    });
}

// ============================================
// SHOP LOCATION MANAGEMENT
// ============================================

/**
 * Get shop location
 * @returns {object|null} Shop location data
 */
function getShopLocation() {
    return getFromStorage(STORAGE_KEYS.SHOP_LOCATION);
}

/**
 * Save shop location
 * @param {object} locationData - Location data
 * @returns {object} Result object
 */
function saveShopLocation(locationData) {
    const { name, address, lat, lng, phone, openHours } = locationData;
    
    if (!name || !address) {
        return { success: false, message: 'Name and address are required' };
    }
    
    const location = {
        name: name.trim(),
        address: address.trim(),
        lat: parseFloat(lat) || 0,
        lng: parseFloat(lng) || 0,
        phone: phone?.trim() || '',
        openHours: openHours?.trim() || ''
    };
    
    saveToStorage(STORAGE_KEYS.SHOP_LOCATION, location);
    
    return { success: true, message: 'Shop location saved successfully!', location };
}

/**
 * Render shop location form
 * @param {string} containerId - Container element ID
 */
function renderShopLocationForm(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const location = getShopLocation() || {};
    
    container.innerHTML = `
        <form id="shopLocationForm" class="card">
            <h3>Shop Location Settings</h3>
            
            <div class="form-group">
                <label class="form-label">Shop Name *</label>
                <input type="text" name="shopName" class="form-input admin-input" 
                       value="${location.name || ''}" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Address *</label>
                <textarea name="shopAddress" class="form-textarea" required>${location.address || ''}</textarea>
            </div>
            
            <div class="flex gap-md">
                <div class="form-group" style="flex: 1;">
                    <label class="form-label">Latitude</label>
                    <input type="number" step="any" name="shopLat" class="form-input admin-input" 
                           value="${location.lat || ''}" placeholder="e.g., 6.7106">
                </div>
                <div class="form-group" style="flex: 1;">
                    <label class="form-label">Longitude</label>
                    <input type="number" step="any" name="shopLng" class="form-input admin-input" 
                           value="${location.lng || ''}" placeholder="e.g., 80.7846">
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Phone Number</label>
                <input type="tel" name="shopPhone" class="form-input admin-input" 
                       value="${location.phone || ''}" placeholder="e.g., +94 45 2280014">
            </div>
            
            <div class="form-group">
                <label class="form-label">Opening Hours</label>
                <input type="text" name="shopHours" class="form-input admin-input" 
                       value="${location.openHours || ''}" placeholder="e.g., 7:00 AM - 8:00 PM">
            </div>
            
            <div class="mt-lg">
                <button type="submit" class="btn btn-admin-primary">
                    💾 Save Location
                </button>
            </div>
            
            ${location.lat && location.lng ? `
                <div class="mt-lg">
                    <h4>Preview Location</h4>
                    <div class="map-container">
                        <div class="map-placeholder">
                            <span class="icon">🗺️</span>
                            <p>${location.name}</p>
                            <a href="https://www.google.com/maps?q=${location.lat},${location.lng}" 
                               target="_blank" class="btn btn-admin-outline btn-sm mt-sm">
                                View on Google Maps
                            </a>
                        </div>
                    </div>
                </div>
            ` : ''}
        </form>
    `;
    
    // Setup form handler
    const form = document.getElementById('shopLocationForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const locationData = {
                name: form.querySelector('[name="shopName"]').value,
                address: form.querySelector('[name="shopAddress"]').value,
                lat: form.querySelector('[name="shopLat"]').value,
                lng: form.querySelector('[name="shopLng"]').value,
                phone: form.querySelector('[name="shopPhone"]').value,
                openHours: form.querySelector('[name="shopHours"]').value
            };
            
            const result = saveShopLocation(locationData);
            
            if (result.success) {
                showToast(result.message, 'success');
                renderShopLocationForm(containerId);
            } else {
                showToast(result.message, 'error');
            }
        });
    }
}

// ============================================
// REPORTS & ANALYTICS
// ============================================

/**
 * Get daily report
 * @param {Date} date - Date for report
 * @returns {object} Daily report data
 */
function getDailyReport(date = new Date()) {
    const orders = getAllOrders();
    const dateStr = date.toDateString();
    
    const dayOrders = orders.filter(o => 
        new Date(o.createdAt).toDateString() === dateStr
    );
    
    const completedOrders = dayOrders.filter(o => o.status === ORDER_STATUS.COMPLETED);
    
    // Calculate popular items
    const itemCounts = {};
    completedOrders.forEach(order => {
        order.items.forEach(item => {
            if (itemCounts[item.name]) {
                itemCounts[item.name] += item.quantity;
            } else {
                itemCounts[item.name] = item.quantity;
            }
        });
    });
    
    const popularItems = Object.entries(itemCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    
    return {
        date: dateStr,
        totalOrders: dayOrders.length,
        completedOrders: completedOrders.length,
        cancelledOrders: dayOrders.filter(o => o.status === ORDER_STATUS.CANCELLED).length,
        revenue: completedOrders.reduce((sum, o) => sum + o.total, 0),
        averageOrderValue: completedOrders.length > 0 
            ? completedOrders.reduce((sum, o) => sum + o.total, 0) / completedOrders.length 
            : 0,
        popularItems
    };
}

/**
 * Render daily report
 * @param {string} containerId - Container element ID
 */
function renderDailyReport(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const report = getDailyReport();
    
    container.innerHTML = `
        <div class="card">
            <h3>📊 Daily Report - ${formatDateShort(new Date())}</h3>
            
            <div class="dashboard-stats mt-lg">
                <div class="stat-card admin">
                    <div class="stat-number">${report.totalOrders}</div>
                    <div class="stat-label">Total Orders</div>
                </div>
                <div class="stat-card admin">
                    <div class="stat-number">${report.completedOrders}</div>
                    <div class="stat-label">Completed</div>
                </div>
                <div class="stat-card admin">
                    <div class="stat-number">${formatCurrency(report.revenue)}</div>
                    <div class="stat-label">Revenue</div>
                </div>
                <div class="stat-card admin">
                    <div class="stat-number">${formatCurrency(report.averageOrderValue)}</div>
                    <div class="stat-label">Avg Order Value</div>
                </div>
            </div>
            
            ${report.popularItems.length > 0 ? `
                <div class="mt-lg">
                    <h4>🔥 Popular Items Today</h4>
                    <ul style="margin-top: 0.5rem;">
                        ${report.popularItems.map((item, index) => `
                            <li style="padding: 0.5rem 0; border-bottom: 1px solid #eee;">
                                <strong>${index + 1}.</strong> ${item.name} 
                                <span style="color: var(--admin-primary);">(${item.count} sold)</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `;
}

// ============================================
// INITIALIZATION
// ============================================

// Auto-setup on page load
document.addEventListener('DOMContentLoaded', () => {
    setupAddStaffForm();
    setupModalHandlers();
});
