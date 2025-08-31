// Items Management Script Adapter - Updates existing functions for new design
// This script works alongside the existing items-management-script.js

// Update the existing functions to work with new HTML structure
document.addEventListener('DOMContentLoaded', function() {
    // Override the renderItems function to work with new structure
    const originalRenderItems = window.renderItems;
    if (originalRenderItems) {
        window.renderItems = function(pageItems) {
            const itemsContent = document.getElementById('itemsContent');
            const emptyState = document.getElementById('emptyState');
            const loadingSpinner = document.getElementById('loadingSpinner');
            
            // Hide loading
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            
            if (!pageItems || pageItems.length === 0) {
                if (itemsContent) itemsContent.style.display = 'none';
                if (emptyState) emptyState.style.display = 'block';
                return;
            }
            
            if (emptyState) emptyState.style.display = 'none';
            if (itemsContent) itemsContent.style.display = 'block';
            
            const isMobile = window.innerWidth <= 768;
            
            if (isMobile) {
                renderMobileItems(pageItems);
            } else {
                renderDesktopItems(pageItems);
            }
            
            updatePagination();
        };
    }
    
    // Update stats display to work with new structure
    const originalUpdateStats = window.updateStats;
    if (originalUpdateStats) {
        window.updateStats = function() {
            if (!items || items.length === 0) return;
            
            const totalItems = items.length;
            const visibleItems = items.filter(item => !item.hidden).length;
            const hiddenItems = items.filter(item => item.hidden).length;
            
            // Update stats using new class structure
            const statCards = document.querySelectorAll('.stat-card');
            if (statCards.length >= 3) {
                const totalStat = statCards[0].querySelector('.stat-number');
                const visibleStat = statCards[1].querySelector('.stat-number');
                const hiddenStat = statCards[2].querySelector('.stat-number');
                
                if (totalStat) totalStat.textContent = totalItems;
                if (visibleStat) visibleStat.textContent = visibleItems;
                if (hiddenStat) hiddenStat.textContent = hiddenItems;
            }
        };
    }
    
    // Add refresh functionality
    window.refreshData = async function() {
        const refreshBtn = document.getElementById('refreshBtn');
        const loadingSpinner = document.getElementById('loadingSpinner');
        
        if (refreshBtn) {
            refreshBtn.classList.add('refreshing');
            refreshBtn.disabled = true;
        }
        
        if (loadingSpinner) loadingSpinner.style.display = 'flex';
        
        try {
            await loadItems();
            showToast('Data refreshed successfully', 'success');
        } catch (error) {
            showToast('Failed to refresh data', 'error');
        } finally {
            if (refreshBtn) {
                refreshBtn.classList.remove('refreshing');
                refreshBtn.disabled = false;
            }
        }
    };
    
    // Add pagination functions for new structure
    window.previousItemsPage = function() {
        if (currentPage > 1) {
            currentPage--;
            applyFiltersAndPagination();
        }
    };
    
    window.nextItemsPage = function() {
        const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            applyFiltersAndPagination();
        }
    };
    
    function updatePagination() {
        const pagination = document.getElementById('itemsPagination');
        const pageInfo = document.getElementById('itemsPageInfo');
        const totalCount = document.getElementById('itemsTotalCount');
        const prevBtn = document.getElementById('itemsPrevBtn');
        const nextBtn = document.getElementById('itemsNextBtn');
        
        if (!filteredItems || filteredItems.length === 0) {
            if (pagination) pagination.style.display = 'none';
            return;
        }
        
        const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
        
        if (totalPages <= 1) {
            if (pagination) pagination.style.display = 'none';
            return;
        }
        
        if (pagination) pagination.style.display = 'flex';
        if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        if (totalCount) totalCount.textContent = filteredItems.length;
        
        if (prevBtn) {
            prevBtn.disabled = currentPage === 1;
        }
        
        if (nextBtn) {
            nextBtn.disabled = currentPage === totalPages;
        }
    }
    
    function renderDesktopItems(pageItems) {
        const itemsTableBody = document.getElementById('itemsTableBody');
        if (!itemsTableBody) return;
        
        const cacheBuster = Date.now();
        
        itemsTableBody.innerHTML = pageItems.map(item => `
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
                        ${getVariantsDisplay(item.variants)}
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
                                onclick="toggleItemVisibility('${item.id}', ${!item.hidden})">
                            ${item.hidden ? 'Show' : 'Hide'}
                        </button>
                        <button class="btn-small btn-delete" onclick="deleteItem('${item.id}')">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    function renderMobileItems(pageItems) {
        const itemCards = document.getElementById('itemCards');
        if (!itemCards) return;
        
        const cacheBuster = Date.now();
        
        itemCards.innerHTML = pageItems.map(item => `
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
                        ${getVariantsDisplay(item.variants)}
                    </div>
                    <span class="status-badge ${item.hidden ? 'status-hidden' : 'status-visible'}">
                        ${item.hidden ? 'Hidden' : 'Visible'}
                    </span>
                </div>
                <div class="card-actions">
                    <button class="btn-small btn-edit" onclick="editItem('${item.id}')">Edit</button>
                    <button class="btn-small ${item.hidden ? 'btn-show' : 'btn-hide'}" 
                            onclick="toggleItemVisibility('${item.id}', ${!item.hidden})">
                        ${item.hidden ? 'Show' : 'Hide'}
                    </button>
                    <button class="btn-small btn-delete" onclick="deleteItem('${item.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }
    
    function getVariantsDisplay(variants) {
        if (!variants || variants.length === 0) {
            return '<span class="variant-badge">No variants</span>';
        }
        
        return variants.map(variant => {
            if (variant.is_whole_bottle) {
                return '<span class="variant-badge">Full Bottle</span>';
            } else {
                const price = variant.price_cents ? (variant.price_cents / 1000).toFixed(3) : '0.000';
                return `<span class="variant-badge">${variant.size_ml}ml - ${price} OMR</span>`;
            }
        }).join('');
    }
    
    // Enhanced toast function
    window.showToast = function(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : '⚠';
        toast.innerHTML = `
            <span style="font-size: 1.2rem; font-weight: bold;">${icon}</span>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'toastSlideOut 0.3s ease forwards';
            setTimeout(() => {
                if (container.contains(toast)) {
                    container.removeChild(toast);
                }
            }, 300);
        }, 3000);
    };
    
    // Add CSS for toast slide out animation
    if (!document.querySelector('style[data-toast-styles]')) {
        const style = document.createElement('style');
        style.setAttribute('data-toast-styles', 'true');
        style.textContent = `
            @keyframes toastSlideOut {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(100px);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Handle window resize for responsive table/cards
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            if (filteredItems && filteredItems.length > 0) {
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const pageItems = filteredItems.slice(startIndex, endIndex);
                
                const isMobile = window.innerWidth <= 768;
                
                if (isMobile) {
                    renderMobileItems(pageItems);
                } else {
                    renderDesktopItems(pageItems);
                }
            }
        }, 250);
    });
    
    // Initialize with existing data if available
    if (window.items && window.items.length > 0) {
        window.updateStats();
        window.applyFiltersAndPagination();
    }
});

// Global variables that might be referenced by existing script
if (typeof window.currentPage === 'undefined') {
    window.currentPage = 1;
}

if (typeof window.itemsPerPage === 'undefined') {
    window.itemsPerPage = 10;
}

if (typeof window.filteredItems === 'undefined') {
    window.filteredItems = [];
}