/**
 * Smart Digital Canteen System - Cart Module
 * 
 * This file handles shopping cart functionality:
 * - Adding items to cart
 * - Removing items from cart
 * - Updating quantities
 * - Cart total calculation
 * - Cart persistence in localStorage
 */

// ============================================
// CART FUNCTIONS
// ============================================

/**
 * Get current cart items
 * @returns {Array} Array of cart items
 */
function getCart() {
    return getFromStorage(STORAGE_KEYS.CART) || [];
}

/**
 * Save cart to storage
 * @param {Array} cart - Cart array to save
 */
function saveCart(cart) {
    saveToStorage(STORAGE_KEYS.CART, cart);
    updateCartBadge();
}

/**
 * Add item to cart
 * @param {string} itemId - Menu item ID
 * @param {number} quantity - Quantity to add (default: 1)
 * @returns {object} Result object
 */
function addToCart(itemId, quantity = 1) {
    const menuItem = getMenuItem(itemId);
    
    if (!menuItem) {
        return { success: false, message: 'Item not found' };
    }
    
    if (!menuItem.available) {
        return { success: false, message: 'Item is not available' };
    }
    
    const cart = getCart();
    const existingItem = cart.find(item => item.id === itemId);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            image: menuItem.image,
            quantity: quantity
        });
    }
    
    saveCart(cart);
    
    return { 
        success: true, 
        message: `${menuItem.name} added to cart!`,
        cartCount: getCartItemCount()
    };
}

/**
 * Remove item from cart
 * @param {string} itemId - Item ID to remove
 * @returns {object} Result object
 */
function removeFromCart(itemId) {
    const cart = getCart();
    const filteredCart = cart.filter(item => item.id !== itemId);
    
    if (filteredCart.length === cart.length) {
        return { success: false, message: 'Item not in cart' };
    }
    
    saveCart(filteredCart);
    
    return { success: true, message: 'Item removed from cart' };
}

/**
 * Update item quantity in cart
 * @param {string} itemId - Item ID
 * @param {number} quantity - New quantity
 * @returns {object} Result object
 */
function updateCartQuantity(itemId, quantity) {
    if (quantity < 1) {
        return removeFromCart(itemId);
    }
    
    const cart = getCart();
    const item = cart.find(i => i.id === itemId);
    
    if (!item) {
        return { success: false, message: 'Item not in cart' };
    }
    
    item.quantity = quantity;
    saveCart(cart);
    
    return { success: true, message: 'Cart updated' };
}

/**
 * Increase item quantity by 1
 * @param {string} itemId - Item ID
 */
function increaseQuantity(itemId) {
    const cart = getCart();
    const item = cart.find(i => i.id === itemId);
    
    if (item) {
        item.quantity++;
        saveCart(cart);
    }
}

/**
 * Decrease item quantity by 1
 * @param {string} itemId - Item ID
 */
function decreaseQuantity(itemId) {
    const cart = getCart();
    const item = cart.find(i => i.id === itemId);
    
    if (item) {
        if (item.quantity > 1) {
            item.quantity--;
            saveCart(cart);
        } else {
            removeFromCart(itemId);
        }
    }
}

/**
 * Clear entire cart
 */
function clearCart() {
    saveCart([]);
}

/**
 * Get total number of items in cart
 * @returns {number} Total item count
 */
function getCartItemCount() {
    const cart = getCart();
    return cart.reduce((total, item) => total + item.quantity, 0);
}

/**
 * Calculate cart subtotal
 * @returns {number} Subtotal amount
 */
function getCartSubtotal() {
    const cart = getCart();
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

/**
 * Calculate cart total with any taxes/fees
 * @returns {object} Object with subtotal, tax, and total
 */
function getCartTotals() {
    const subtotal = getCartSubtotal();
    const tax = 0; // No tax for now, can be added later
    const serviceFee = 0; // Can add service fee if needed
    const total = subtotal + tax + serviceFee;
    
    return {
        subtotal,
        tax,
        serviceFee,
        total
    };
}

// ============================================
// CART RENDERING
// ============================================

/**
 * Render cart items
 * @param {string} containerId - Container element ID
 */
function renderCartItems(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const cart = getCart();
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🛒</div>
                <h3 class="empty-state-title">Your cart is empty</h3>
                <p class="empty-state-text">Add some delicious items from our menu!</p>
                <a href="menu.html" class="btn btn-customer-primary">Browse Menu</a>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    cart.forEach(item => {
        html += `
            <div class="cart-item" data-item-id="${item.id}">
                <img src="${item.image}" alt="${item.name}" class="cart-item-image"
                     onerror="this.src='https://via.placeholder.com/80x80?text=No+Image'">
                <div class="cart-item-info">
                    <h4 class="cart-item-name">${item.name}</h4>
                    <p class="cart-item-price">${formatCurrency(item.price)} each</p>
                </div>
                <div class="cart-quantity">
                    <button class="quantity-btn decrease-qty" data-item-id="${item.id}">−</button>
                    <span class="quantity-value">${item.quantity}</span>
                    <button class="quantity-btn increase-qty" data-item-id="${item.id}">+</button>
                </div>
                <div class="cart-item-total">
                    <strong>${formatCurrency(item.price * item.quantity)}</strong>
                </div>
                <button class="cart-item-remove" data-item-id="${item.id}" title="Remove item">
                    🗑️
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * Render cart summary
 * @param {string} containerId - Container element ID
 */
function renderCartSummary(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const totals = getCartTotals();
    const cart = getCart();
    
    if (cart.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = `
        <div class="cart-summary">
            <h3>Order Summary</h3>
            <div class="cart-summary-row">
                <span>Subtotal (${getCartItemCount()} items)</span>
                <span>${formatCurrency(totals.subtotal)}</span>
            </div>
            ${totals.tax > 0 ? `
                <div class="cart-summary-row">
                    <span>Tax</span>
                    <span>${formatCurrency(totals.tax)}</span>
                </div>
            ` : ''}
            ${totals.serviceFee > 0 ? `
                <div class="cart-summary-row">
                    <span>Service Fee</span>
                    <span>${formatCurrency(totals.serviceFee)}</span>
                </div>
            ` : ''}
            <div class="cart-summary-row total">
                <span>Total</span>
                <span>${formatCurrency(totals.total)}</span>
            </div>
            <button class="btn btn-customer-primary btn-block btn-lg mt-md" id="placeOrderBtn">
                🍽️ Place Order
            </button>
            <a href="menu.html" class="btn btn-customer-outline btn-block mt-sm">
                Continue Shopping
            </a>
        </div>
    `;
    
    // Setup place order button
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', handlePlaceOrder);
    }
}

/**
 * Setup cart item event handlers
 * @param {string} containerId - Cart container ID
 */
function setupCartHandlers(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.addEventListener('click', (e) => {
        // Increase quantity
        const increaseBtn = e.target.closest('.increase-qty');
        if (increaseBtn) {
            const itemId = increaseBtn.dataset.itemId;
            increaseQuantity(itemId);
            renderCartItems(containerId);
            renderCartSummary('cartSummary');
            return;
        }
        
        // Decrease quantity
        const decreaseBtn = e.target.closest('.decrease-qty');
        if (decreaseBtn) {
            const itemId = decreaseBtn.dataset.itemId;
            decreaseQuantity(itemId);
            renderCartItems(containerId);
            renderCartSummary('cartSummary');
            return;
        }
        
        // Remove item
        const removeBtn = e.target.closest('.cart-item-remove');
        if (removeBtn) {
            const itemId = removeBtn.dataset.itemId;
            removeFromCart(itemId);
            renderCartItems(containerId);
            renderCartSummary('cartSummary');
            showToast('Item removed from cart', 'info');
            return;
        }
    });
}

/**
 * Setup add to cart buttons on menu page
 */
function setupAddToCartButtons() {
    const buttons = document.querySelectorAll('.add-to-cart-btn');
    
    buttons.forEach(btn => {
        // Remove existing listeners to prevent duplicates
        btn.replaceWith(btn.cloneNode(true));
    });
    
    // Re-query after replacing
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const itemId = btn.dataset.itemId;
            const result = addToCart(itemId);
            
            if (result.success) {
                showToast(result.message, 'success');
                
                // Add animation to button
                btn.textContent = '✓ Added!';
                btn.disabled = true;
                setTimeout(() => {
                    btn.textContent = '🛒 Add to Cart';
                    btn.disabled = false;
                }, 1500);
            } else {
                showToast(result.message, 'error');
            }
        });
    });
}

/**
 * Handle place order action
 */
function handlePlaceOrder() {
    const cart = getCart();
    
    if (cart.length === 0) {
        showToast('Your cart is empty', 'warning');
        return;
    }
    
    const currentUser = getCurrentUser();
    
    if (!currentUser) {
        showToast('Please login to place an order', 'warning');
        setTimeout(() => {
            navigateTo('login.html');
        }, 1500);
        return;
    }
    
    // Create order
    const result = createOrder();
    
    if (result.success) {
        showToast('Order placed successfully!', 'success');
        setTimeout(() => {
            navigateTo(`order-status.html?token=${result.order.token}`);
        }, 1000);
    } else {
        showToast(result.message, 'error');
    }
}

// ============================================
// INITIALIZE CART PAGE
// ============================================

/**
 * Initialize cart page
 */
function initCartPage() {
    renderCartItems('cartItems');
    renderCartSummary('cartSummary');
    setupCartHandlers('cartItems');
}
