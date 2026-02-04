/**
 * Smart Digital Canteen System - Orders Module
 * 
 * This file handles order-related functionality:
 * - Creating orders with unique tokens
 * - Order status tracking
 * - Order history
 * - Token-based pickup system
 */

// ============================================
// ORDER FUNCTIONS
// ============================================

/**
 * Create a new order from cart
 * @returns {object} Result object with order details
 */
function createOrder() {
    const cart = getCart();
    const currentUser = getCurrentUser();
    
    if (cart.length === 0) {
        return { success: false, message: 'Cart is empty' };
    }
    
    if (!currentUser) {
        return { success: false, message: 'Please login to place order' };
    }
    
    const totals = getCartTotals();
    const token = generateToken();
    
    const order = {
        id: generateId(),
        token: token,
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            subtotal: item.price * item.quantity
        })),
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        status: ORDER_STATUS.PENDING,
        statusHistory: [
            {
                status: ORDER_STATUS.PENDING,
                timestamp: new Date().toISOString(),
                note: 'Order placed'
            }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Save order
    const orders = getFromStorage(STORAGE_KEYS.ORDERS) || [];
    orders.push(order);
    saveToStorage(STORAGE_KEYS.ORDERS, orders);
    
    // Clear cart after successful order
    clearCart();
    
    return { success: true, message: 'Order placed successfully!', order };
}

/**
 * Get all orders
 * @returns {Array} Array of all orders
 */
function getAllOrders() {
    return getFromStorage(STORAGE_KEYS.ORDERS) || [];
}

/**
 * Get orders by user ID
 * @param {string} userId - User ID
 * @returns {Array} User's orders
 */
function getUserOrders(userId) {
    const orders = getAllOrders();
    return orders.filter(order => order.userId === userId)
                 .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Get order by token
 * @param {string} token - Order token
 * @returns {object|null} Order or null
 */
function getOrderByToken(token) {
    const orders = getAllOrders();
    return orders.find(order => order.token === token) || null;
}

/**
 * Get order by ID
 * @param {string} orderId - Order ID
 * @returns {object|null} Order or null
 */
function getOrderById(orderId) {
    const orders = getAllOrders();
    return orders.find(order => order.id === orderId) || null;
}

/**
 * Get orders by status
 * @param {string} status - Order status
 * @returns {Array} Filtered orders
 */
function getOrdersByStatus(status) {
    const orders = getAllOrders();
    return orders.filter(order => order.status === status)
                 .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

/**
 * Get active orders (pending, preparing, ready)
 * @returns {Array} Active orders
 */
function getActiveOrders() {
    const orders = getAllOrders();
    const activeStatuses = [ORDER_STATUS.PENDING, ORDER_STATUS.PREPARING, ORDER_STATUS.READY];
    return orders.filter(order => activeStatuses.includes(order.status))
                 .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

/**
 * Update order status
 * @param {string} orderId - Order ID
 * @param {string} newStatus - New status
 * @param {string} note - Optional note
 * @returns {object} Result object
 */
function updateOrderStatus(orderId, newStatus, note = '') {
    const orders = getAllOrders();
    const orderIndex = orders.findIndex(o => o.id === orderId);
    
    if (orderIndex === -1) {
        return { success: false, message: 'Order not found' };
    }
    
    const order = orders[orderIndex];
    
    // Add to status history
    order.statusHistory.push({
        status: newStatus,
        timestamp: new Date().toISOString(),
        note: note || `Status changed to ${newStatus}`
    });
    
    order.status = newStatus;
    order.updatedAt = new Date().toISOString();
    
    // If completed, add completion time
    if (newStatus === ORDER_STATUS.COMPLETED) {
        order.completedAt = new Date().toISOString();
    }
    
    saveToStorage(STORAGE_KEYS.ORDERS, orders);
    
    return { success: true, message: `Order status updated to ${newStatus}`, order };
}

/**
 * Get status display info
 * @param {string} status - Order status
 * @returns {object} Status display info
 */
function getStatusInfo(status) {
    const statusMap = {
        [ORDER_STATUS.PENDING]: {
            label: 'Pending',
            icon: '⏳',
            color: 'warning',
            badge: 'badge-pending'
        },
        [ORDER_STATUS.PREPARING]: {
            label: 'Preparing',
            icon: '👨‍🍳',
            color: 'info',
            badge: 'badge-preparing'
        },
        [ORDER_STATUS.READY]: {
            label: 'Ready',
            icon: '✅',
            color: 'success',
            badge: 'badge-ready'
        },
        [ORDER_STATUS.COMPLETED]: {
            label: 'Completed',
            icon: '🎉',
            color: 'gray',
            badge: 'badge-completed'
        },
        [ORDER_STATUS.CANCELLED]: {
            label: 'Cancelled',
            icon: '❌',
            color: 'danger',
            badge: 'badge-cancelled'
        }
    };
    
    return statusMap[status] || statusMap[ORDER_STATUS.PENDING];
}

// ============================================
// ORDER RENDERING - CUSTOMER
// ============================================

/**
 * Render order status page
 * @param {string} token - Order token
 */
function renderOrderStatus(token) {
    const order = getOrderByToken(token);
    const container = document.getElementById('orderStatusContainer');
    
    if (!container) return;
    
    if (!order) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❓</div>
                <h3 class="empty-state-title">Order not found</h3>
                <p class="empty-state-text">We couldn't find an order with token: ${token}</p>
                <a href="menu.html" class="btn btn-customer-primary">Browse Menu</a>
            </div>
        `;
        return;
    }
    
    const statusInfo = getStatusInfo(order.status);
    const shopLocation = getFromStorage(STORAGE_KEYS.SHOP_LOCATION);
    
    container.innerHTML = `
        <div class="token-display">
            <p class="token-label">Your Order Token</p>
            <h1 class="token-number">${order.token}</h1>
            <p>Show this token when collecting your order</p>
        </div>
        
        <div class="order-status mt-lg">
            <div class="status-step ${order.status === ORDER_STATUS.PENDING || order.statusHistory.some(h => h.status === ORDER_STATUS.PENDING) ? 'completed' : ''}">
                <div class="status-icon">📝</div>
                <span class="status-label">Order Placed</span>
            </div>
            <div class="status-line ${order.status !== ORDER_STATUS.PENDING ? 'active' : ''}"></div>
            <div class="status-step ${order.status === ORDER_STATUS.PREPARING ? 'active' : ''} ${order.statusHistory.some(h => h.status === ORDER_STATUS.PREPARING) && order.status !== ORDER_STATUS.PREPARING ? 'completed' : ''}">
                <div class="status-icon">👨‍🍳</div>
                <span class="status-label">Preparing</span>
            </div>
            <div class="status-line ${order.status === ORDER_STATUS.READY || order.status === ORDER_STATUS.COMPLETED ? 'active' : ''}"></div>
            <div class="status-step ${order.status === ORDER_STATUS.READY ? 'active' : ''} ${order.status === ORDER_STATUS.COMPLETED ? 'completed' : ''}">
                <div class="status-icon">✅</div>
                <span class="status-label">Ready</span>
            </div>
            <div class="status-line ${order.status === ORDER_STATUS.COMPLETED ? 'active' : ''}"></div>
            <div class="status-step ${order.status === ORDER_STATUS.COMPLETED ? 'completed' : ''}">
                <div class="status-icon">🎉</div>
                <span class="status-label">Collected</span>
            </div>
        </div>
        
        <div class="card mt-lg">
            <div class="card-header">
                <h3 class="card-title">Order Details</h3>
            </div>
            <div class="order-items">
                ${order.items.map(item => `
                    <div class="order-item-row">
                        <span>${item.quantity}x ${item.name}</span>
                        <span>${formatCurrency(item.subtotal)}</span>
                    </div>
                `).join('')}
            </div>
            <div class="cart-summary-row total">
                <span>Total</span>
                <span>${formatCurrency(order.total)}</span>
            </div>
            <p class="mt-md" style="color: var(--gray-dark); font-size: 0.875rem;">
                📅 Ordered: ${formatDate(order.createdAt)}
            </p>
        </div>
        
        ${shopLocation ? `
            <div class="card mt-lg">
                <div class="card-header">
                    <h3 class="card-title">📍 Pickup Location</h3>
                </div>
                <p><strong>${shopLocation.name}</strong></p>
                <p>${shopLocation.address}</p>
                <p>📞 ${shopLocation.phone}</p>
                <p>🕐 ${shopLocation.openHours}</p>
                <div class="map-container mt-md" id="orderMap">
                    <div class="map-placeholder">
                        <span class="icon">🗺️</span>
                        <p>Map View</p>
                        <a href="https://www.google.com/maps?q=${shopLocation.lat},${shopLocation.lng}" 
                           target="_blank" class="btn btn-customer-outline btn-sm mt-sm">
                            Open in Google Maps
                        </a>
                    </div>
                </div>
            </div>
        ` : ''}
        
        <div class="text-center mt-lg">
            <a href="order-history.html" class="btn btn-customer-outline">View Order History</a>
            <a href="menu.html" class="btn btn-customer-primary">Order Again</a>
        </div>
    `;
}

/**
 * Render order history
 * @param {string} containerId - Container element ID
 */
function renderOrderHistory(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const currentUser = getCurrentUser();
    if (!currentUser) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔒</div>
                <h3 class="empty-state-title">Please login</h3>
                <p class="empty-state-text">Login to view your order history</p>
                <a href="login.html" class="btn btn-customer-primary">Login</a>
            </div>
        `;
        return;
    }
    
    const orders = getUserOrders(currentUser.id);
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3 class="empty-state-title">No orders yet</h3>
                <p class="empty-state-text">You haven't placed any orders yet</p>
                <a href="menu.html" class="btn btn-customer-primary">Start Ordering</a>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    orders.forEach(order => {
        const statusInfo = getStatusInfo(order.status);
        
        html += `
            <div class="history-item">
                <div class="history-header">
                    <div>
                        <span class="history-token">${order.token}</span>
                        <span class="order-badge ${statusInfo.badge}">${statusInfo.icon} ${statusInfo.label}</span>
                    </div>
                    <span class="history-date">${formatDate(order.createdAt)}</span>
                </div>
                <div class="history-items">
                    ${order.items.map(item => `
                        <div class="order-item-row">
                            <span>${item.quantity}x ${item.name}</span>
                            <span>${formatCurrency(item.subtotal)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="history-total">
                    Total: ${formatCurrency(order.total)}
                </div>
                ${order.status !== ORDER_STATUS.COMPLETED && order.status !== ORDER_STATUS.CANCELLED ? `
                    <div class="mt-md">
                        <a href="order-status.html?token=${order.token}" class="btn btn-customer-outline btn-sm">
                            Track Order
                        </a>
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// ORDER RENDERING - STAFF
// ============================================

/**
 * Render orders for staff dashboard
 * @param {string} containerId - Container element ID
 * @param {string} filterStatus - Filter by status (optional)
 */
function renderStaffOrders(containerId, filterStatus = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let orders;
    if (filterStatus) {
        orders = getOrdersByStatus(filterStatus);
    } else {
        orders = getActiveOrders();
    }
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3 class="empty-state-title">No orders</h3>
                <p class="empty-state-text">No ${filterStatus || 'active'} orders at the moment</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    orders.forEach(order => {
        const statusInfo = getStatusInfo(order.status);
        
        html += `
            <div class="order-card ${order.status}" data-order-id="${order.id}">
                <div class="order-header">
                    <span class="order-token">${order.token}</span>
                    <span class="order-badge ${statusInfo.badge}">${statusInfo.icon} ${statusInfo.label}</span>
                </div>
                <div class="order-meta" style="color: var(--gray-dark); font-size: 0.875rem; margin-bottom: 0.5rem;">
                    <span>👤 ${order.userName}</span>
                    <span style="margin-left: 1rem;">🕐 ${getRelativeTime(order.createdAt)}</span>
                </div>
                <div class="order-items">
                    ${order.items.map(item => `
                        <div class="order-item-row">
                            <span><strong>${item.quantity}x</strong> ${item.name}</span>
                            <span>${formatCurrency(item.subtotal)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="cart-summary-row total" style="border-top: 1px solid #E0E0E0; padding-top: 0.5rem; margin-top: 0.5rem;">
                    <span>Total</span>
                    <span>${formatCurrency(order.total)}</span>
                </div>
                <div class="order-actions mt-md">
                    ${getOrderActionButtons(order)}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * Get action buttons based on order status
 * @param {object} order - Order object
 * @returns {string} HTML string for buttons
 */
function getOrderActionButtons(order) {
    switch (order.status) {
        case ORDER_STATUS.PENDING:
            return `
                <button class="btn btn-staff-primary btn-sm start-preparing-btn" data-order-id="${order.id}">
                    👨‍🍳 Start Preparing
                </button>
                <button class="btn btn-danger btn-sm cancel-order-btn" data-order-id="${order.id}">
                    ❌ Cancel
                </button>
            `;
        case ORDER_STATUS.PREPARING:
            return `
                <button class="btn btn-success btn-sm mark-ready-btn" data-order-id="${order.id}">
                    ✅ Mark Ready
                </button>
            `;
        case ORDER_STATUS.READY:
            return `
                <button class="btn btn-staff-primary btn-sm complete-order-btn" data-order-id="${order.id}">
                    🎉 Complete (Collected)
                </button>
            `;
        default:
            return '';
    }
}

/**
 * Setup staff order action handlers
 * @param {string} containerId - Container element ID
 */
function setupStaffOrderHandlers(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.addEventListener('click', (e) => {
        const orderId = e.target.dataset.orderId;
        if (!orderId) return;
        
        // Start Preparing
        if (e.target.classList.contains('start-preparing-btn')) {
            const result = updateOrderStatus(orderId, ORDER_STATUS.PREPARING, 'Started preparing');
            if (result.success) {
                showToast('Order is now being prepared', 'success');
                renderStaffOrders(containerId);
                updateDashboardStats();
            }
        }
        
        // Mark Ready
        if (e.target.classList.contains('mark-ready-btn')) {
            const result = updateOrderStatus(orderId, ORDER_STATUS.READY, 'Food is ready for pickup');
            if (result.success) {
                showToast('Order marked as ready!', 'success');
                renderStaffOrders(containerId);
                updateDashboardStats();
            }
        }
        
        // Complete Order
        if (e.target.classList.contains('complete-order-btn')) {
            const result = updateOrderStatus(orderId, ORDER_STATUS.COMPLETED, 'Order collected by customer');
            if (result.success) {
                showToast('Order completed!', 'success');
                renderStaffOrders(containerId);
                updateDashboardStats();
                
                // Update staff performance
                updateStaffPerformance();
            }
        }
        
        // Cancel Order
        if (e.target.classList.contains('cancel-order-btn')) {
            if (confirm('Are you sure you want to cancel this order?')) {
                const result = updateOrderStatus(orderId, ORDER_STATUS.CANCELLED, 'Order cancelled');
                if (result.success) {
                    showToast('Order cancelled', 'warning');
                    renderStaffOrders(containerId);
                    updateDashboardStats();
                }
            }
        }
    });
}

/**
 * Update dashboard statistics
 */
function updateDashboardStats() {
    const pendingCount = document.getElementById('pendingCount');
    const preparingCount = document.getElementById('preparingCount');
    const readyCount = document.getElementById('readyCount');
    const completedCount = document.getElementById('completedCount');
    
    const orders = getAllOrders();
    const today = new Date().toDateString();
    
    const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
    
    if (pendingCount) {
        pendingCount.textContent = todayOrders.filter(o => o.status === ORDER_STATUS.PENDING).length;
    }
    if (preparingCount) {
        preparingCount.textContent = todayOrders.filter(o => o.status === ORDER_STATUS.PREPARING).length;
    }
    if (readyCount) {
        readyCount.textContent = todayOrders.filter(o => o.status === ORDER_STATUS.READY).length;
    }
    if (completedCount) {
        completedCount.textContent = todayOrders.filter(o => o.status === ORDER_STATUS.COMPLETED).length;
    }
}

/**
 * Update staff performance (orders completed)
 */
function updateStaffPerformance() {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== USER_ROLES.STAFF) return;
    
    const staffMembers = getFromStorage(STORAGE_KEYS.STAFF_MEMBERS) || [];
    const staffIndex = staffMembers.findIndex(s => s.id === currentUser.id);
    
    if (staffIndex !== -1) {
        staffMembers[staffIndex].ordersCompleted = (staffMembers[staffIndex].ordersCompleted || 0) + 1;
        saveToStorage(STORAGE_KEYS.STAFF_MEMBERS, staffMembers);
    }
}

// ============================================
// AUTO-REFRESH FOR REAL-TIME UPDATES
// ============================================

let orderRefreshInterval = null;

/**
 * Start auto-refreshing orders
 * @param {string} containerId - Container to refresh
 * @param {number} intervalMs - Refresh interval in milliseconds
 */
function startOrderRefresh(containerId, intervalMs = 10000) {
    // Clear existing interval
    if (orderRefreshInterval) {
        clearInterval(orderRefreshInterval);
    }
    
    orderRefreshInterval = setInterval(() => {
        renderStaffOrders(containerId);
        updateDashboardStats();
    }, intervalMs);
}

/**
 * Stop auto-refreshing orders
 */
function stopOrderRefresh() {
    if (orderRefreshInterval) {
        clearInterval(orderRefreshInterval);
        orderRefreshInterval = null;
    }
}
