/**
 * Smart Digital Canteen System - Staff Module
 * 
 * This file handles staff-specific functionality:
 * - Order management
 * - Menu item management
 * - Staff dashboard features
 */

// ============================================
// STAFF DASHBOARD FUNCTIONS
// ============================================

/**
 * Initialize staff dashboard
 */
function initStaffDashboard() {
    // Check authentication
    if (!protectPage(USER_ROLES.STAFF)) return;
    
    // Render dashboard components
    updateDashboardStats();
    renderStaffOrders('ordersContainer');
    setupStaffOrderHandlers('ordersContainer');
    
    // Start auto-refresh for real-time updates
    startOrderRefresh('ordersContainer', 15000);
    
    // Update user name in navbar
    const currentUser = getCurrentUser();
    const userNameEl = document.querySelector('.user-name');
    if (userNameEl && currentUser) {
        userNameEl.textContent = currentUser.name;
    }
}

/**
 * Initialize menu management page
 */
function initMenuManagement() {
    // Check authentication
    if (!protectPage(USER_ROLES.STAFF)) return;
    
    // Render menu table
    renderMenuManagementTable('menuTableContainer');
    setupMenuManagementHandlers('menuTableContainer');
    
    // Setup add item form
    setupAddItemForm();
}

/**
 * Setup add menu item form
 */
function setupAddItemForm() {
    const form = document.getElementById('addItemForm');
    if (!form) return;
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = {
            name: form.querySelector('[name="itemName"]').value,
            description: form.querySelector('[name="itemDescription"]').value,
            price: form.querySelector('[name="itemPrice"]').value,
            category: form.querySelector('[name="itemCategory"]').value,
            image: form.querySelector('[name="itemImage"]').value,
            preparationTime: form.querySelector('[name="preparationTime"]').value
        };
        
        const result = addMenuItem(formData);
        
        if (result.success) {
            showToast(result.message, 'success');
            form.reset();
            renderMenuManagementTable('menuTableContainer');
            closeModal('addItemModal');
        } else {
            showToast(result.message, 'error');
        }
    });
}

/**
 * Open add item modal
 */
function openAddItemModal() {
    const modal = document.getElementById('addItemModal');
    if (modal) {
        modal.classList.add('active');
    }
}

/**
 * Open edit item modal
 * @param {object} item - Menu item to edit
 */
function openEditItemModal(item) {
    const modal = document.getElementById('editItemModal');
    if (!modal) return;
    
    // Populate form fields
    const form = modal.querySelector('form');
    if (form) {
        form.querySelector('[name="editItemId"]').value = item.id;
        form.querySelector('[name="editItemName"]').value = item.name;
        form.querySelector('[name="editItemDescription"]').value = item.description;
        form.querySelector('[name="editItemPrice"]').value = item.price;
        form.querySelector('[name="editItemCategory"]').value = item.category;
        form.querySelector('[name="editItemImage"]').value = item.image;
        form.querySelector('[name="editPreparationTime"]').value = item.preparationTime;
    }
    
    modal.classList.add('active');
}

/**
 * Setup edit item form
 */
function setupEditItemForm() {
    const form = document.getElementById('editItemForm');
    if (!form) return;
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const itemId = form.querySelector('[name="editItemId"]').value;
        const updateData = {
            name: form.querySelector('[name="editItemName"]').value,
            description: form.querySelector('[name="editItemDescription"]').value,
            price: parseFloat(form.querySelector('[name="editItemPrice"]').value),
            category: form.querySelector('[name="editItemCategory"]').value,
            image: form.querySelector('[name="editItemImage"]').value,
            preparationTime: parseInt(form.querySelector('[name="editPreparationTime"]').value)
        };
        
        const result = updateMenuItem(itemId, updateData);
        
        if (result.success) {
            showToast(result.message, 'success');
            renderMenuManagementTable('menuTableContainer');
            closeModal('editItemModal');
        } else {
            showToast(result.message, 'error');
        }
    });
}

/**
 * Close modal by ID
 * @param {string} modalId - Modal element ID
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Setup modal close handlers
 */
function setupModalHandlers() {
    // Close on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });
    
    // Close on close button click
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal-overlay').classList.remove('active');
        });
    });
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });
}

/**
 * Setup order filter tabs
 */
function setupOrderFilterTabs() {
    const tabs = document.querySelectorAll('.order-filter-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active state
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Filter orders
            const status = tab.dataset.status;
            if (status === 'all') {
                renderStaffOrders('ordersContainer');
            } else {
                renderStaffOrders('ordersContainer', status);
            }
            setupStaffOrderHandlers('ordersContainer');
        });
    });
}

/**
 * Get today's statistics
 * @returns {object} Statistics object
 */
function getTodayStats() {
    const orders = getAllOrders();
    const today = new Date().toDateString();
    
    const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
    
    return {
        total: todayOrders.length,
        pending: todayOrders.filter(o => o.status === ORDER_STATUS.PENDING).length,
        preparing: todayOrders.filter(o => o.status === ORDER_STATUS.PREPARING).length,
        ready: todayOrders.filter(o => o.status === ORDER_STATUS.READY).length,
        completed: todayOrders.filter(o => o.status === ORDER_STATUS.COMPLETED).length,
        cancelled: todayOrders.filter(o => o.status === ORDER_STATUS.CANCELLED).length,
        revenue: todayOrders
            .filter(o => o.status === ORDER_STATUS.COMPLETED)
            .reduce((sum, o) => sum + o.total, 0)
    };
}

/**
 * Render staff performance stats
 */
function renderStaffPerformance() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    const staffMembers = getFromStorage(STORAGE_KEYS.STAFF_MEMBERS) || [];
    const staffData = staffMembers.find(s => s.id === currentUser.id || s.email === currentUser.email);
    
    const performanceEl = document.getElementById('staffPerformance');
    if (performanceEl && staffData) {
        performanceEl.innerHTML = `
            <div class="stat-card staff">
                <div class="stat-number">${staffData.ordersCompleted || 0}</div>
                <div class="stat-label">Orders Completed</div>
            </div>
        `;
    }
}

// ============================================
// INITIALIZATION
// ============================================

// Auto-setup on page load
document.addEventListener('DOMContentLoaded', () => {
    setupModalHandlers();
    setupEditItemForm();
    setupOrderFilterTabs();
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        stopOrderRefresh();
    });
});
