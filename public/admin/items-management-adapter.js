setTimeout(() => {
    if (typeof filteredItems !== 'undefined' && Array.isArray(filteredItems)) {
        const currentPageItems = getCurrentPageItems();
        if (currentPageItems) {
            renderItemsAdapter(currentPageItems);
        }
    }
}, 300);


// Helper function to get current page items
function getCurrentPageItems() {
    if (typeof filteredItems === 'undefined' || !Array.isArray(filteredItems)) {
        return null;
    }
    
    const itemsPerPageValue = typeof itemsPerPage !== 'undefined' ? itemsPerPage : 10;
    const currentPageValue = typeof currentPage !== 'undefined' ? currentPage : 1;
    
    const startIndex = (currentPageValue - 1) * itemsPerPageValue;
    const endIndex = startIndex + itemsPerPageValue;
    
    return filteredItems.slice(startIndex, endIndex);
}

function renderDesktopItemsAdapter(pageItems) {
    const itemsList = document.getElementById('itemsList');
    const cacheBuster = Date.now();
    
    itemsList.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th style="width: 80px;">Image</th>
                    <th style="width: 35%;">Item Details</th>
                    <th style="width: 25%;">Variants</th>
                    <th style="width: 10%;">Status</th>
                    <th style="width: 30%;">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${pageItems.map(item => `
                    <tr class="item-row ${item.hidden ? 'hidden-item' : ''}">
                        <td>
                            <div class="item-image">
                                ${item.image_path ? 
                                    `<img src="/api/image/${item.image_path}?v=${cacheBuster}" alt="${item.name}" loading="lazy">` :
                                    '<div class="no-image">No Image</div>'
                                }
                            </div>
                        </td>
                        <td>
                            <div class="item-details">
                                <h4 class="item-name">${escapeHtml(item.name || 'Unnamed Item')}</h4>
                                <p class="item-brand">${escapeHtml(item.brand || 'No brand')}</p>
                                <p class="item-description">${escapeHtml((item.description || 'No description').substring(0, 100))}${(item.description && item.description.length > 100) ? '...' : ''}</p>
                            </div>
                        </td>
                        <td>
                            <div class="variants-info">
                                ${getVariantsDisplayAdapter(item.variants)}
                            </div>
                        </td>
                        <td>
                            <span class="status-badge ${item.hidden ? 'status-hidden' : 'status-visible'}">
                                ${item.hidden ? 'Hidden' : 'Visible'}
                            </span>
                        </td>
                        <td>
                            <div class="table-actions">
                                <button class="btn-small btn-edit" onclick="editItem('${item.id}')" title="Edit Item">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                    </svg>
                                    Edit
                                </button>
                                <button class="btn-small ${item.hidden ? 'btn-show' : 'btn-hide'}" 
                                        onclick="toggleItemVisibility('${item.id}', ${item.hidden})"
                                        title="${item.hidden ? 'Show Item' : 'Hide Item'}">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        ${item.hidden ? 
                                            '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>' :
                                            '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>'
                                        }
                                    </svg>
                                    ${item.hidden ? 'Show' : 'Hide'}
                                </button>
                                <button class="btn-small btn-delete" onclick="deleteItem('${item.id}')" title="Delete Item">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                    </svg>
                                    Delete
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderMobileItemsAdapter(pageItems) {
    const itemsList = document.getElementById('itemsList');
    const cacheBuster = Date.now();
    
    const cards = pageItems.map(item => createItemCardAdapter(item, cacheBuster)).join('');
    itemsList.innerHTML = `<div class="items-grid mobile">${cards}</div>`;
}

function createItemCardAdapter(item, cacheBuster = Date.now()) {
    return `
        <div class="item-card ${item.hidden ? 'hidden-item' : ''}" data-item-id="${item.id}">
            <div class="item-image">
                ${item.image_path ? 
                    `<img src="/api/image/${item.image_path}?v=${cacheBuster}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.parentNode.innerHTML='<div class=\\"no-image\\">Image Error</div>'">` :
                    '<div class="no-image">No Image</div>'
                }
            </div>
            <div class="item-details">
                <h4 class="item-name">${escapeHtml(item.name || 'Unnamed Item')}</h4>
                <p class="item-brand">${escapeHtml(item.brand || 'No brand')}</p>
                ${item.description ? `<p class="item-description">${escapeHtml(item.description.substring(0, 120))}${item.description.length > 120 ? '...' : ''}</p>` : ''}
                <div class="variants-info">
                    ${getVariantsDisplayAdapter(item.variants)}
                </div>
                <span class="status-badge ${item.hidden ? 'status-hidden' : 'status-visible'}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px;">
                        ${item.hidden ? 
                            '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>' :
                            '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>'
                        }
                    </svg>
                    ${item.hidden ? 'Hidden' : 'Visible'}
                </span>
            </div>
            <div class="card-actions">
                <button class="btn-small btn-edit" onclick="editItem('${item.id}')" title="Edit Item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                    Edit
                </button>
                <button class="btn-small ${item.hidden ? 'btn-show' : 'btn-hide'}" 
                        onclick="toggleItemVisibility('${item.id}', ${item.hidden})"
                        title="${item.hidden ? 'Show Item' : 'Hide Item'}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        ${item.hidden ? 
                            '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>' :
                            '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>'
                        }
                    </svg>
                    ${item.hidden ? 'Show' : 'Hide'}
                </button>
                <button class="btn-small btn-delete" onclick="deleteItem('${item.id}')" title="Delete Item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                    Delete
                </button>
            </div>
        </div>
    `;
}

// Adapter for variants display to ensure compatibility
function getVariantsDisplayAdapter(variants) {
    if (!variants || !Array.isArray(variants) || variants.length === 0) {
        return '<span class="variant-badge" style="background: #f8d7da; color: #721c24;">No variants</span>';
    }
    
    return variants.map(variant => {
        if (variant.is_whole_bottle) {
            return '<span class="variant-badge whole-bottle">Full Bottle</span>';
        } else {
            const size = variant.size_ml || variant.size || 'Unknown';
            const price = variant.price_display || 
                         (variant.price_cents ? `${(variant.price_cents / 1000).toFixed(3)} OMR` : '') ||
                         (variant.price ? `${variant.price} OMR` : '');
            return `<span class="variant-badge">${size}ml${price ? ` - ${price}` : ''}</span>`;
        }
    }).join('');
}

// Utility function to escape HTML
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// Enhanced mobile scroll behavior
function setupMobileScrollBehavior() {
    if (window.innerWidth <= 768) {
        const itemCards = document.querySelectorAll('.item-card');
        
        // Add smooth scroll on card focus for better mobile UX
        itemCards.forEach((card, index) => {
            card.addEventListener('click', function(e) {
                // Only scroll if clicking on the card itself, not buttons
                if (!e.target.closest('.btn-small')) {
                    const cardRect = card.getBoundingClientRect();
                    const windowHeight = window.innerHeight;
                    
                    if (cardRect.top < 100 || cardRect.bottom > windowHeight - 100) {
                        card.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center' 
                        });
                    }
                }
            });
        });
    }
}

// Override the original renderItems function if it exists and setup mobile behavior
document.addEventListener('DOMContentLoaded', function() {
    // Wait for original script to load
    setTimeout(() => {
        if (typeof window.renderItems === 'function') {
            window.originalRenderItems = window.renderItems;
        }
        window.renderItems = renderItemsAdapter;
        
        // Also update stats when items change
        const originalApplyFiltersAndPagination = window.applyFiltersAndPagination;
        if (typeof originalApplyFiltersAndPagination === 'function') {
            window.applyFiltersAndPagination = function() {
                originalApplyFiltersAndPagination.apply(this, arguments);
                updateStatsDisplay();
                // Setup mobile behavior after rendering
                setTimeout(setupMobileScrollBehavior, 100);
            };
        }
        
        console.log('✅ Adapter functions installed successfully');
    }, 1000);
});

console.log('🚀 Items Management Adapter initialized with mobile enhancements');// Items Management Adapter - Routes new design functions to existing script
// This adapter bridges the new orders-style design with the existing items-management-script.js functionality

// Global variables for adapter state management
let refreshTimeout = null;

// Initialize adapter when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Items Management Adapter loaded');
    initializeAdapter();
    setupNewDesignElements();
});

function initializeAdapter() {
    // Wait for the original script to initialize
    setTimeout(() => {
        // Update stats display when items are loaded
        if (typeof items !== 'undefined') {
            updateStatsDisplay();
        }
    }, 500);
}

function setupNewDesignElements() {
    // Setup refresh button functionality
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', handleRefresh);
    }
    
    // Setup search input if not already handled by original script
    const searchInput = document.getElementById('searchInput');
    if (searchInput && !searchInput._listenerAdded) {
        searchInput.addEventListener('input', debounce((e) => {
            if (typeof currentSearchTerm !== 'undefined') {
                currentSearchTerm = e.target.value;
                currentPage = 1;
                if (typeof applyFiltersAndPagination === 'function') {
                    applyFiltersAndPagination();
                }
            }
        }, 300));
        searchInput._listenerAdded = true;
    }
}

// Refresh functionality for new design
async function refreshData() {
    const refreshBtn = document.getElementById('refreshBtn');
    const refreshIcon = refreshBtn ? refreshBtn.querySelector('svg') : null;
    
    if (refreshBtn) {
        refreshBtn.classList.add('refreshing');
        refreshBtn.disabled = true;
    }
    
    try {
        console.log('🔄 Refreshing items data...');
        
        // Call the original loadItems function
        if (typeof loadItems === 'function') {
            await loadItems();
            updateStatsDisplay();
            showToast('Items refreshed successfully!', 'success');
        } else {
            console.error('loadItems function not found');
            showToast('Failed to refresh items', 'error');
        }
    } catch (error) {
        console.error('Refresh failed:', error);
        showToast('Failed to refresh items: ' + error.message, 'error');
    } finally {
        if (refreshBtn) {
            refreshBtn.classList.remove('refreshing');
            refreshBtn.disabled = false;
        }
    }
}

// Handle refresh button click with debouncing
function handleRefresh() {
    if (refreshTimeout) {
        clearTimeout(refreshTimeout);
    }
    
    refreshTimeout = setTimeout(() => {
        refreshData();
        refreshTimeout = null;
    }, 300);
}

// Update the stats display in the new design
function updateStatsDisplay() {
    if (typeof items === 'undefined' || !Array.isArray(items)) {
        console.warn('Items array not available for stats update');
        return;
    }
    
    const totalItems = items.length;
    const visibleItems = items.filter(item => !item.hidden).length;
    const hiddenItems = items.filter(item => item.hidden).length;
    
    // Calculate total variants
    const totalVariants = items.reduce((total, item) => {
        if (item.variants && Array.isArray(item.variants)) {
            return total + item.variants.length;
        }
        return total;
    }, 0);
    
    // Update DOM elements
    const totalItemsEl = document.getElementById('totalItems');
    const visibleItemsEl = document.getElementById('visibleItems');
    const hiddenItemsEl = document.getElementById('hiddenItems');
    const totalVariantsEl = document.getElementById('totalVariants');
    
    if (totalItemsEl) {
        animateNumber(totalItemsEl, totalItems);
    }
    if (visibleItemsEl) {
        animateNumber(visibleItemsEl, visibleItems);
    }
    if (hiddenItemsEl) {
        animateNumber(hiddenItemsEl, hiddenItems);
    }
    if (totalVariantsEl) {
        animateNumber(totalVariantsEl, totalVariants);
    }
    
    console.log('📊 Stats updated:', { totalItems, visibleItems, hiddenItems, totalVariants });
}

// Animate number changes in stats
function animateNumber(element, targetNumber) {
    if (!element) return;
    
    const currentNumber = parseInt(element.textContent) || 0;
    const difference = targetNumber - currentNumber;
    const duration = 300;
    const steps = 20;
    const increment = difference / steps;
    let current = currentNumber;
    let step = 0;
    
    const timer = setInterval(() => {
        step++;
        current += increment;
        
        if (step >= steps) {
            current = targetNumber;
            clearInterval(timer);
        }
        
        element.textContent = Math.round(current);
    }, duration / steps);
}

// Enhanced toast notification system for new design
function showToast(message, type = 'success') {
    // Remove any existing toast
    const existingToast = document.getElementById('toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create new toast
    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = `toast ${type === 'error' ? 'error' : ''}`;
    
    const toastContent = document.createElement('div');
    toastContent.className = 'toast-content';
    
    const toastMessage = document.createElement('span');
    toastMessage.id = 'toastMessage';
    toastMessage.textContent = message;
    
    toastContent.appendChild(toastMessage);
    toast.appendChild(toastContent);
    document.body.appendChild(toast);
    
    // Show toast with animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Override the original renderItems function to work with new design
function renderItemsAdapter(pageItems) {
    const itemsList = document.getElementById('itemsList');
    if (!itemsList) {
        console.error('Items list container not found');
        return;
    }
    
    // Check if we have items to render
    if (!pageItems || pageItems.length === 0) {
        const currentSearchTerm = document.getElementById('searchInput')?.value || '';
        itemsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📦</div>
                <div class="empty-message">No items found</div>
                <div class="empty-description">
                    ${currentSearchTerm ? 'Try different search terms' : 'Add your first fragrance to get started'}
                </div>
                ${!currentSearchTerm ? '<button class="btn-primary" onclick="openAddItemModal()">Add First Item</button>' : ''}
            </div>
        `;
        return;
    }
    
    // Check if mobile view
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        renderMobileItemsAdapter(pageItems);
    } else {
        renderDesktopItemsAdapter(pageItems);
    }
    
    // Setup mobile scroll behavior after rendering
    setTimeout(setupMobileScrollBehavior, 100);
}

function renderDesktopItemsAdapter(pageItems) {
    const itemsList = document.getElementById('itemsList');
    const cacheBuster = Date.now();
    
    itemsList.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th style="width: 80px;">Image</th>
                    <th style="width: 35%;">Item Details</th>
                    <th style="width: 25%;">Variants</th>
                    <th style="width: 10%;">Status</th>
                    <th style="width: 30%;">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${pageItems.map(item => `
                    <tr class="item-row ${item.hidden ? 'hidden-item' : ''}">
                        <td>
                            <div class="item-image">
                                ${item.image_path ? 
                                    `<img src="/api/image/${item.image_path}?v=${cacheBuster}" alt="${item.name}" loading="lazy">` :
                                    '<div class="no-image">No Image</div>'
                                }
                            </div>
                        </td>
                        <td>
                            <div class="item-details">
                                <h4 class="item-name">${escapeHtml(item.name || 'Unnamed Item')}</h4>
                                <p class="item-brand">${escapeHtml(item.brand || 'No brand')}</p>
                                <p class="item-description">${escapeHtml((item.description || 'No description').substring(0, 100))}${(item.description && item.description.length > 100) ? '...' : ''}</p>
                            </div>
                        </td>
                        <td>
                            <div class="variants-info">
                                ${getVariantsDisplayAdapter(item.variants)}
                            </div>
                        </td>
                        <td>
                            <span class="status-badge ${item.hidden ? 'status-hidden' : 'status-visible'}">
                                ${item.hidden ? 'Hidden' : 'Visible'}
                            </span>
                        </td>
                        <td>
                            <div class="table-actions">
                                <button class="btn-small btn-edit" onclick="editItem('${item.id}')" title="Edit Item">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                    </svg>
                                    Edit
                                </button>
                                <button class="btn-small ${item.hidden ? 'btn-show' : 'btn-hide'}" 
                                        onclick="toggleItemVisibility('${item.id}', ${item.hidden})"
                                        title="${item.hidden ? 'Show Item' : 'Hide Item'}">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        ${item.hidden ? 
                                            '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>' :
                                            '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>'
                                        }
                                    </svg>
                                    ${item.hidden ? 'Show' : 'Hide'}
                                </button>
                                <button class="btn-small btn-delete" onclick="deleteItem('${item.id}')" title="Delete Item">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                    </svg>
                                    Delete
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderMobileItemsAdapter(pageItems) {
    const itemsList = document.getElementById('itemsList');
    const cacheBuster = Date.now();
    
    const cards = pageItems.map(item => createItemCardAdapter(item, cacheBuster)).join('');
    itemsList.innerHTML = `<div class="items-grid mobile">${cards}</div>`;
}

function createItemCardAdapter(item, cacheBuster = Date.now()) {
    return `
        <div class="item-card ${item.hidden ? 'hidden-item' : ''}" data-item-id="${item.id}">
            <div class="item-image">
                ${item.image_path ? 
                    `<img src="/api/image/${item.image_path}?v=${cacheBuster}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.parentNode.innerHTML='<div class=\\"no-image\\">Image Error</div>'">` :
                    '<div class="no-image">No Image</div>'
                }
            </div>
            <div class="item-details">
                <h4 class="item-name">${escapeHtml(item.name || 'Unnamed Item')}</h4>
                <p class="item-brand">${escapeHtml(item.brand || 'No brand')}</p>
                ${item.description ? `<p class="item-description">${escapeHtml(item.description.substring(0, 120))}${item.description.length > 120 ? '...' : ''}</p>` : ''}
                <div class="variants-info">
                    ${getVariantsDisplayAdapter(item.variants)}
                </div>
                <span class="status-badge ${item.hidden ? 'status-hidden' : 'status-visible'}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px;">
                        ${item.hidden ? 
                            '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>' :
                            '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>'
                        }
                    </svg>
                    ${item.hidden ? 'Hidden' : 'Visible'}
                </span>
            </div>
            <div class="card-actions">
                <button class="btn-small btn-edit" onclick="editItem('${item.id}')" title="Edit Item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                    Edit
                </button>
                <button class="btn-small ${item.hidden ? 'btn-show' : 'btn-hide'}" 
                        onclick="toggleItemVisibility('${item.id}', ${item.hidden})"
                        title="${item.hidden ? 'Show Item' : 'Hide Item'}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        ${item.hidden ? 
                            '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>' :
                            '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>'
                        }
                    </svg>
                    ${item.hidden ? 'Show' : 'Hide'}
                </button>
                <button class="btn-small btn-delete" onclick="deleteItem('${item.id}')" title="Delete Item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                    Delete
                </button>
            </div>
        </div>
    `;
}

// Adapter for variants display to ensure compatibility
function getVariantsDisplayAdapter(variants) {
    if (!variants || !Array.isArray(variants) || variants.length === 0) {
        return '<span class="variant-badge" style="background: #f8d7da; color: #721c24;">No variants</span>';
    }
    
    return variants.map(variant => {
        if (variant.is_whole_bottle) {
            return '<span class="variant-badge whole-bottle">Full Bottle</span>';
        } else {
            const size = variant.size_ml || variant.size || 'Unknown';
            const price = variant.price_display || 
                         (variant.price_cents ? `${(variant.price_cents / 1000).toFixed(3)} OMR` : '') ||
                         (variant.price ? `${variant.price} OMR` : '');
            return `<span class="variant-badge">${size}ml${price ? ` - ${price}` : ''}</span>`;
        }
    }).join('');
}

// Utility function to escape HTML
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// Enhanced mobile scroll behavior
function setupMobileScrollBehavior() {
    if (window.innerWidth <= 768) {
        const itemCards = document.querySelectorAll('.item-card');
        
        // Add smooth scroll on card focus for better mobile UX
        itemCards.forEach((card, index) => {
            card.addEventListener('click', function(e) {
                // Only scroll if clicking on the card itself, not buttons
                if (!e.target.closest('.btn-small')) {
                    const cardRect = card.getBoundingClientRect();
                    const windowHeight = window.innerHeight;
                    
                    if (cardRect.top < 100 || cardRect.bottom > windowHeight - 100) {
                        card.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center' 
                        });
                    }
                }
            });
        });
    }
}

// Override the original renderItems function if it exists and setup mobile behavior
document.addEventListener('DOMContentLoaded', function() {
    // Wait for original script to load
    setTimeout(() => {
        if (typeof window.renderItems === 'function') {
            window.originalRenderItems = window.renderItems;
        }
        window.renderItems = renderItemsAdapter;
        
        // Also update stats when items change
        const originalApplyFiltersAndPagination = window.applyFiltersAndPagination;
        if (typeof originalApplyFiltersAndPagination === 'function') {
            window.applyFiltersAndPagination = function() {
                originalApplyFiltersAndPagination.apply(this, arguments);
                updateStatsDisplay();
                // Setup mobile behavior after rendering
                setTimeout(setupMobileScrollBehavior, 100);
            };
        }
        
        console.log('✅ Adapter functions installed successfully');
    }, 1000);
});

// Utility function for debouncing (if not available in original script)
if (typeof window.debounce !== 'function') {
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    window.debounce = debounce;
}

// Monitor for items array changes and update stats
let itemsWatcher = null;

function startItemsWatcher() {
    if (itemsWatcher) {
        clearInterval(itemsWatcher);
    }
    
    itemsWatcher = setInterval(() => {
        if (typeof items !== 'undefined' && Array.isArray(items)) {
            updateStatsDisplay();
        }
    }, 2000);
}

// Start watching for items changes
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(startItemsWatcher, 1500);
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (itemsWatcher) {
        clearInterval(itemsWatcher);
    }
    if (refreshTimeout) {
        clearTimeout(refreshTimeout);
    }
});

console.log('🚀 Items Management Adapter initialized with mobile enhancements');VariantsEl = document.getElementById('totalVariants');
    
    if (totalItemsEl) {
        animateNumber(totalItemsEl, totalItems);
    }
    if (visibleItemsEl) {
        animateNumber(visibleItemsEl, visibleItems);
    }
    if (hiddenItemsEl) {
        animateNumber(hiddenItemsEl, hiddenItems);
    }
    if (totalVariantsEl) {
        animateNumber(totalVariantsEl, totalVariants);
    }
    
    console.log('📊 Stats updated:', { totalItems, visibleItems, hiddenItems, totalVariants });

// Animate number changes in stats
function animateNumber(element, targetNumber) {
    if (!element) return;
    
    const currentNumber = parseInt(element.textContent) || 0;
    const difference = targetNumber - currentNumber;
    const duration = 300;
    const steps = 20;
    const increment = difference / steps;
    let current = currentNumber;
    let step = 0;
    
    const timer = setInterval(() => {
        step++;
        current += increment;
        
        if (step >= steps) {
            current = targetNumber;
            clearInterval(timer);
        }
        
        element.textContent = Math.round(current);
    }, duration / steps);
}

// Enhanced toast notification system for new design
function showToast(message, type = 'success') {
    // Remove any existing toast
    const existingToast = document.getElementById('toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create new toast
    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = `toast ${type === 'error' ? 'error' : ''}`;
    
    const toastContent = document.createElement('div');
    toastContent.className = 'toast-content';
    
    const toastMessage = document.createElement('span');
    toastMessage.id = 'toastMessage';
    toastMessage.textContent = message;
    
    toastContent.appendChild(toastMessage);
    toast.appendChild(toastContent);
    document.body.appendChild(toast);
    
    // Show toast with animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Override the original renderItems function to work with new design
function renderItemsAdapter(pageItems) {
    const itemsList = document.getElementById('itemsList');
    if (!itemsList) {
        console.error('Items list container not found');
        return;
    }
    
    // Check if we have items to render
    if (!pageItems || pageItems.length === 0) {
        const currentSearchTerm = document.getElementById('searchInput')?.value || '';
        itemsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📦</div>
                <div class="empty-message">No items found</div>
                <div class="empty-description">
                    ${currentSearchTerm ? 'Try different search terms' : 'Add your first fragrance to get started'}
                </div>
                ${!currentSearchTerm ? '<button class="btn-primary" onclick="openAddItemModal()">Add First Item</button>' : ''}
            </div>
        `;
        return;
    }
    
    // Check if mobile view
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        renderMobileItemsAdapter(pageItems);
    } else {
        renderDesktopItemsAdapter(pageItems);
    }
}

function renderDesktopItemsAdapter(pageItems) {
    const itemsList = document.getElementById('itemsList');
    const cacheBuster = Date.now();
    
    itemsList.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Image</th>
                    <th>Item Details</th>
                    <th>Variants</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${pageItems.map(item => `
                    <tr class="item-row ${item.hidden ? 'hidden-item' : ''}">
                        <td>
                            <div class="item-image">
                                ${item.image_path ? 
                                    `<img src="/api/image/${item.image_path}?v=${cacheBuster}" alt="${item.name}" loading="lazy">` :
                                    '<div class="no-image">No Image</div>'
                                }
                            </div>
                        </td>
                        <td>
                            <div class="item-details">
                                <h4 class="item-name">${item.name || 'Unnamed Item'}</h4>
                                <p class="item-brand">${item.brand || 'No brand'}</p>
                                <p class="item-description">${(item.description || 'No description').substring(0, 100)}${(item.description && item.description.length > 100) ? '...' : ''}</p>
                            </div>
                        </td>
                        <td>
                            <div class="variants-info">
                                ${getVariantsDisplayAdapter(item.variants)}
                            </div>
                        </td>
                        <td>
                            <span class="status-badge ${item.hidden ? 'status-hidden' : 'status-visible'}">
                                ${item.hidden ? 'Hidden' : 'Visible'}
                            </span>
                        </td>
                        <td>
                            <div class="table-actions">
                                <button class="btn-small btn-edit" onclick="editItem('${item.id}')">Edit</button>
                                <button class="btn-small ${item.hidden ? 'btn-show' : 'btn-hide'}" 
                                        onclick="toggleItemVisibility('${item.id}', ${item.hidden})">
                                    ${item.hidden ? 'Show' : 'Hide'}
                                </button>
                                <button class="btn-small btn-delete" onclick="deleteItem('${item.id}')">Delete</button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderMobileItemsAdapter(pageItems) {
    const itemsList = document.getElementById('itemsList');
    const cacheBuster = Date.now();
    
    const cards = pageItems.map(item => createItemCardAdapter(item, cacheBuster)).join('');
    itemsList.innerHTML = `<div class="items-grid mobile">${cards}</div>`;
}

function createItemCardAdapter(item, cacheBuster = Date.now()) {
    return `
        <div class="item-card ${item.hidden ? 'hidden-item' : ''}">
            <div class="item-image">
                ${item.image_path ? 
                    `<img src="/api/image/${item.image_path}?v=${cacheBuster}" alt="${item.name}" loading="lazy">` :
                    '<div class="no-image">No Image</div>'
                }
            </div>
            <div class="item-details">
                <h4 class="item-name">${item.name || 'Unnamed Item'}</h4>
                <p class="item-brand">${item.brand || 'No brand'}</p>
                <div class="variants-info">
                    ${getVariantsDisplayAdapter(item.variants)}
                </div>
                <span class="status-badge ${item.hidden ? 'status-hidden' : 'status-visible'}">
                    ${item.hidden ? 'Hidden' : 'Visible'}
                </span>
            </div>
            <div class="card-actions">
                <button class="btn-small btn-edit" onclick="editItem('${item.id}')">Edit</button>
                <button class="btn-small ${item.hidden ? 'btn-show' : 'btn-hide'}" 
                        onclick="toggleItemVisibility('${item.id}', ${item.hidden})">
                    ${item.hidden ? 'Show' : 'Hide'}
                </button>
                <button class="btn-small btn-delete" onclick="deleteItem('${item.id}')">Delete</button>
            </div>
        </div>
    `;
}

// Adapter for variants display to ensure compatibility
function getVariantsDisplayAdapter(variants) {
    if (!variants || !Array.isArray(variants) || variants.length === 0) {
        return '<span class="variant-badge">No variants</span>';
    }
    
    return variants.map(variant => {
        if (variant.is_whole_bottle) {
            return '<span class="variant-badge whole-bottle">Full Bottle</span>';
        } else {
            const size = variant.size_ml || variant.size || 'Unknown';
            const price = variant.price_display || 
                         (variant.price_cents ? `${(variant.price_cents / 1000).toFixed(3)} OMR` : '') ||
                         (variant.price ? `${variant.price} OMR` : '');
            return `<span class="variant-badge">${size}ml${price ? ` - ${price}` : ''}</span>`;
        }
    }).join('');
}

// Override the original renderItems function if it exists
document.addEventListener('DOMContentLoaded', function() {
    // Wait for original script to load
    setTimeout(() => {
        if (typeof window.renderItems === 'function') {
            window.originalRenderItems = window.renderItems;
        }
        window.renderItems = renderItemsAdapter;
        
        // Also update stats when items change
        const originalApplyFiltersAndPagination = window.applyFiltersAndPagination;
        if (typeof originalApplyFiltersAndPagination === 'function') {
            window.applyFiltersAndPagination = function() {
                originalApplyFiltersAndPagination.apply(this, arguments);
                updateStatsDisplay();
            };
        }
        
        console.log('✅ Adapter functions installed successfully');
    }, 1000);
});

// Utility function for debouncing (if not available in original script)
if (typeof window.debounce !== 'function') {
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    window.debounce = debounce;
}

function startItemsWatcher() {
    if (itemsWatcher) {
        clearInterval(itemsWatcher);
    }
    
    itemsWatcher = setInterval(() => {
        if (typeof items !== 'undefined' && Array.isArray(items)) {
            updateStatsDisplay();
        }
    }, 2000);
}

// Start watching for items changes
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(startItemsWatcher, 1500);
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (itemsWatcher) {
        clearInterval(itemsWatcher);
    }
    if (refreshTimeout) {
        clearTimeout(refreshTimeout);
    }
});

console.log('🚀 Items Management Adapter initialized');