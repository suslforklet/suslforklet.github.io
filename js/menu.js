/**
 * Smart Digital Canteen System - Menu Module
 * 
 * This file handles menu-related functionality:
 * - Loading and displaying menu items
 * - Category filtering
 * - Search functionality
 * - Menu item management (for staff)
 */

// ============================================
// MENU DISPLAY FUNCTIONS
// ============================================

/**
 * Get all menu items
 * @param {boolean} onlyAvailable - If true, return only available items
 * @returns {Array} Array of menu items
 */
function getMenuItems(onlyAvailable = false) {
    const items = getFromStorage(STORAGE_KEYS.MENU_ITEMS) || [];
    if (onlyAvailable) {
        return items.filter(item => item.available);
    }
    return items;
}

/**
 * Get menu item by ID
 * @param {string} itemId - Item ID
 * @returns {object|null} Menu item or null
 */
function getMenuItem(itemId) {
    const items = getMenuItems();
    return items.find(item => item.id === itemId) || null;
}

/**
 * Get unique categories from menu items
 * @returns {Array} Array of category names
 */
function getCategories() {
    const items = getMenuItems();
    const categories = [...new Set(items.map(item => item.category))];
    return categories.sort();
}

/**
 * Filter menu items by category
 * @param {string} category - Category name (or 'all' for all items)
 * @returns {Array} Filtered menu items
 */
function filterByCategory(category) {
    const items = getMenuItems(true);
    if (category === 'all') return items;
    return items.filter(item => item.category === category);
}

/**
 * Search menu items
 * @param {string} query - Search query
 * @returns {Array} Matching menu items
 */
function searchMenuItems(query) {
    const items = getMenuItems(true);
    const searchTerm = query.toLowerCase().trim();
    
    if (!searchTerm) return items;
    
    return items.filter(item => 
        item.name.toLowerCase().includes(searchTerm) ||
        item.description.toLowerCase().includes(searchTerm) ||
        item.category.toLowerCase().includes(searchTerm)
    );
}

/**
 * Render menu item card HTML
 * @param {object} item - Menu item object
 * @returns {string} HTML string
 */
function renderMenuItemCard(item) {
    return `
        <div class="food-card" data-item-id="${item.id}">
            <img src="${item.image}" alt="${item.name}" class="food-image" 
                 onerror="this.src='https://via.placeholder.com/400x200?text=No+Image'">
            <div class="food-content">
                <span class="food-category">${item.category}</span>
                <h3 class="food-name">${item.name}</h3>
                <p class="food-description">${item.description}</p>
                <div class="food-footer">
                    <span class="food-price">${formatCurrency(item.price)}</span>
                    <button class="btn btn-customer-primary btn-sm add-to-cart-btn" 
                            data-item-id="${item.id}"
                            ${!item.available ? 'disabled' : ''}>
                        ${item.available ? '🛒 Add to Cart' : 'Not Available'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render menu grid
 * @param {string} containerId - Container element ID
 * @param {Array} items - Array of menu items (optional, defaults to all available)
 */
function renderMenuGrid(containerId, items = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const menuItems = items || getMenuItems(true);
    
    if (menuItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🍽️</div>
                <h3 class="empty-state-title">No items found</h3>
                <p class="empty-state-text">Try a different category or search term</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = menuItems.map(item => renderMenuItemCard(item)).join('');
}

/**
 * Render category filter buttons
 * @param {string} containerId - Container element ID
 * @param {string} activeCategory - Currently active category
 */
function renderCategoryFilters(containerId, activeCategory = 'all') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const categories = getCategories();
    
    let html = `
        <button class="category-btn ${activeCategory === 'all' ? 'active' : ''}" 
                data-category="all">
            All Items
        </button>
    `;
    
    categories.forEach(category => {
        html += `
            <button class="category-btn ${activeCategory === category ? 'active' : ''}" 
                    data-category="${category}">
                ${category}
            </button>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * Setup category filter click handlers
 * @param {string} filterContainerId - Filter container ID
 * @param {string} menuContainerId - Menu grid container ID
 */
function setupCategoryFilters(filterContainerId, menuContainerId) {
    const filterContainer = document.getElementById(filterContainerId);
    if (!filterContainer) return;
    
    filterContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.category-btn');
        if (!btn) return;
        
        const category = btn.dataset.category;
        
        // Update active state
        filterContainer.querySelectorAll('.category-btn').forEach(b => {
            b.classList.remove('active');
        });
        btn.classList.add('active');
        
        // Filter and render items
        const filteredItems = filterByCategory(category);
        renderMenuGrid(menuContainerId, filteredItems);
        
        // Re-attach cart handlers
        setupAddToCartButtons();
    });
}

/**
 * Setup search functionality
 * @param {string} searchInputId - Search input ID
 * @param {string} menuContainerId - Menu grid container ID
 */
function setupMenuSearch(searchInputId, menuContainerId) {
    const searchInput = document.getElementById(searchInputId);
    if (!searchInput) return;
    
    let debounceTimer;
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const query = e.target.value;
            const results = searchMenuItems(query);
            renderMenuGrid(menuContainerId, results);
            
            // Re-attach cart handlers
            setupAddToCartButtons();
        }, 300);
    });
}

// ============================================
// MENU MANAGEMENT (STAFF/ADMIN)
// ============================================

/**
 * Add new menu item
 * @param {object} itemData - Menu item data
 * @returns {object} Result object
 */
function addMenuItem(itemData) {
    const { name, description, price, category, image, preparationTime } = itemData;
    
    // Validate required fields
    if (!name || !price || !category) {
        return { success: false, message: 'Name, price, and category are required' };
    }
    
    const items = getMenuItems();
    
    const newItem = {
        id: generateId(),
        name: name.trim(),
        description: description?.trim() || '',
        price: parseFloat(price),
        category: category.trim(),
        image: image || 'https://via.placeholder.com/400x200?text=No+Image',
        available: true,
        preparationTime: parseInt(preparationTime) || 15,
        createdAt: new Date().toISOString()
    };
    
    items.push(newItem);
    saveToStorage(STORAGE_KEYS.MENU_ITEMS, items);
    
    return { success: true, message: 'Menu item added successfully!', item: newItem };
}

/**
 * Update menu item
 * @param {string} itemId - Item ID to update
 * @param {object} updateData - Data to update
 * @returns {object} Result object
 */
function updateMenuItem(itemId, updateData) {
    const items = getMenuItems();
    const index = items.findIndex(item => item.id === itemId);
    
    if (index === -1) {
        return { success: false, message: 'Item not found' };
    }
    
    // Update item properties
    items[index] = {
        ...items[index],
        ...updateData,
        updatedAt: new Date().toISOString()
    };
    
    saveToStorage(STORAGE_KEYS.MENU_ITEMS, items);
    
    return { success: true, message: 'Menu item updated successfully!', item: items[index] };
}

/**
 * Delete menu item
 * @param {string} itemId - Item ID to delete
 * @returns {object} Result object
 */
function deleteMenuItem(itemId) {
    const items = getMenuItems();
    const filteredItems = items.filter(item => item.id !== itemId);
    
    if (filteredItems.length === items.length) {
        return { success: false, message: 'Item not found' };
    }
    
    saveToStorage(STORAGE_KEYS.MENU_ITEMS, filteredItems);
    
    return { success: true, message: 'Menu item deleted successfully!' };
}

/**
 * Toggle item availability
 * @param {string} itemId - Item ID
 * @returns {object} Result object
 */
function toggleItemAvailability(itemId) {
    const items = getMenuItems();
    const item = items.find(i => i.id === itemId);
    
    if (!item) {
        return { success: false, message: 'Item not found' };
    }
    
    item.available = !item.available;
    saveToStorage(STORAGE_KEYS.MENU_ITEMS, items);
    
    return { 
        success: true, 
        message: `Item is now ${item.available ? 'available' : 'unavailable'}`,
        available: item.available
    };
}

/**
 * Render menu management table (for staff)
 * @param {string} containerId - Container element ID
 */
function renderMenuManagementTable(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const items = getMenuItems();
    
    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3 class="empty-state-title">No menu items</h3>
                <p class="empty-state-text">Add your first menu item to get started</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <table class="menu-table">
            <thead>
                <tr>
                    <th>Image</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Available</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    items.forEach(item => {
        html += `
            <tr data-item-id="${item.id}">
                <td>
                    <img src="${item.image}" alt="${item.name}" class="menu-item-image"
                         onerror="this.src='https://via.placeholder.com/60x60?text=No+Image'">
                </td>
                <td>
                    <strong>${item.name}</strong>
                    <br>
                    <small style="color: var(--gray-dark);">${item.description.substring(0, 50)}...</small>
                </td>
                <td>${item.category}</td>
                <td>${formatCurrency(item.price)}</td>
                <td>
                    <div class="availability-toggle ${item.available ? 'active' : ''}" 
                         data-item-id="${item.id}"
                         title="Click to toggle availability">
                    </div>
                </td>
                <td>
                    <button class="btn btn-sm btn-warning edit-item-btn" data-item-id="${item.id}">
                        ✏️ Edit
                    </button>
                    <button class="btn btn-sm btn-danger delete-item-btn" data-item-id="${item.id}">
                        🗑️ Delete
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

/**
 * Setup menu management event handlers
 * @param {string} containerId - Table container ID
 */
function setupMenuManagementHandlers(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Toggle availability
    container.addEventListener('click', (e) => {
        const toggle = e.target.closest('.availability-toggle');
        if (toggle) {
            const itemId = toggle.dataset.itemId;
            const result = toggleItemAvailability(itemId);
            
            if (result.success) {
                toggle.classList.toggle('active', result.available);
                showToast(result.message, 'success');
            }
        }
        
        // Delete item
        const deleteBtn = e.target.closest('.delete-item-btn');
        if (deleteBtn) {
            const itemId = deleteBtn.dataset.itemId;
            if (confirm('Are you sure you want to delete this item?')) {
                const result = deleteMenuItem(itemId);
                if (result.success) {
                    showToast(result.message, 'success');
                    renderMenuManagementTable(containerId);
                } else {
                    showToast(result.message, 'error');
                }
            }
        }
        
        // Edit item - trigger modal
        const editBtn = e.target.closest('.edit-item-btn');
        if (editBtn) {
            const itemId = editBtn.dataset.itemId;
            const item = getMenuItem(itemId);
            if (item && typeof openEditItemModal === 'function') {
                openEditItemModal(item);
            }
        }
    });
}
