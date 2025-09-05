// Items Management Adapter - Bridge Script for New Design
// This adapter connects the new UI design with existing functionality

// Override and extend existing functions to work with new design
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔌 Items management adapter loaded');
    
    // Initialize new design specific features
    initializeNewDesignFeatures();
    
    // Override existing functions for new design compatibility
    overrideFunctionsForNewDesign();
});

function initializeNewDesignFeatures() {
    // Items per page selector
    const itemsPerPageSelect = document.getElementById('itemsPerPageSelect');
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', (e) => {
            const newItemsPerPage = parseInt(e.target.value);
            if (newItemsPerPage !== itemsPerPage) {
                // Update the global variable from items-management-script.js
                window.itemsPerPage = newItemsPerPage;
                currentPage = 1;
                applyFiltersAndPagination();
            }
        });
    }
    
    // Enhanced search with loading state
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentSearchTerm = e.target.value;
                currentPage = 1;
                applyFiltersAndPagination();
            }, 300);
        });
    }
}

// MISSING FUNCTION ADDED: Override functions for new design compatibility
function overrideFunctionsForNewDesign() {
    console.log('🔧 Overriding functions for new design...');
    
    // Override the original loadItems function to use correct API endpoint
    window.originalLoadItems = window.loadItems;
    window.loadItems = async function() {
        console.log('📦 Loading items...');
        const loadingEl = document.getElementById('loadingState');
        const contentEl = document.getElementById('contentContainer');
        
        if (loadingEl) loadingEl.style.display = 'block';
        if (contentEl) contentEl.style.display = 'none';
        
        try {
            // Use the correct admin API endpoint
            const response = await fetch('/api/admin/items', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    showToast('Authentication failed. Please log in again.', 'error');
                    window.location.href = '/admin/login.html';
                    return;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success && Array.isArray(result.data)) {
                items = result.data;
                console.log(`✅ Loaded ${items.length} items`);
                
                updateStats();
                applyFiltersAndPagination();
            } else {
                throw new Error(result.error || 'Invalid response format');
            }
            
        } catch (error) {
            console.error('💥 Load items error:', error);
            showToast('Failed to load items: ' + error.message, 'error');
            items = [];
            applyFiltersAndPagination();
        } finally {
            if (loadingEl) loadingEl.style.display = 'none';
            if (contentEl) contentEl.style.display = 'block';
        }
    };

    // Override the problematic updatePreviews function
    window.originalUpdatePreviews = window.updatePreviews;
    window.updatePreviews = function() {
        const itemNameInput = document.getElementById('itemName');
        if (!itemNameInput) return;
        
        const itemName = itemNameInput.value || 'creed-aventus';
        const slug = generateSlug(itemName);
        
        // Check if preview elements exist (from old HTML structure)
        const slugPreview = document.getElementById('slugPreview');
        const imageNamePreview = document.getElementById('imageNamePreview');
        
        if (slugPreview) {
            slugPreview.textContent = slug;
        } else {
            console.log('📝 Slug preview element not found (this is normal with new design)');
        }
        
        if (imageNamePreview) {
            imageNamePreview.textContent = `${slug}.png`;
        } else {
            console.log('🖼️ Image name preview element not found (this is normal with new design)');
        }
        
        // For the new design, we could show the slug in the form title or elsewhere
        // but it's not critical functionality
        console.log('Generated slug:', slug);
    };

    // Override generateSlug to make sure it exists
    window.generateSlug = function(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    };
    
    // Override updateStats function to work with new design
    window.originalUpdateStats = window.updateStats;
    window.updateStats = function() {
        if (!items || !Array.isArray(items)) return;
        
        const totalItems = items.length;
        const visibleItems = items.filter(item => !item.hidden).length;
        const hiddenItems = items.filter(item => item.hidden).length;
        
        // Update stats in new design
        updateStatCard('totalItems', totalItems);
        updateStatCard('visibleItems', visibleItems);
        updateStatCard('hiddenItems', hiddenItems);
        
        console.log('📊 Stats updated:', { totalItems, visibleItems, hiddenItems });
    };
    
    // Override renderItems function for new table design
    window.originalRenderItems = window.renderItems;
    window.renderItems = function(pageItems) {
        if (window.innerWidth <= 768) {
            renderMobileItems(pageItems);
        } else {
            renderTableItems(pageItems);
        }
    };
    
    // Override renderPagination function for enhanced pagination
    window.originalRenderPagination = window.renderPagination;
    window.renderPagination = function(totalPages) {
        const paginationContainer = document.getElementById('paginationContainer');
        if (!paginationContainer || totalPages <= 1) {
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }
        
        let paginationHTML = '<div class="pagination">';
        
        // Previous button
        const prevDisabled = currentPage <= 1 ? 'disabled' : '';
        paginationHTML += `
            <button class="pagination-btn ${prevDisabled}" onclick="changePage(${currentPage - 1})" ${prevDisabled}>
                Previous
            </button>
        `;
        
        // First page + ellipsis
        if (currentPage > 3) {
            paginationHTML += `<button class="pagination-btn" onclick="changePage(1)">1</button>`;
            if (currentPage > 4) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
        }
        
        // Page numbers around current page
        const startPage = Math.max(1, currentPage - 1);
        const endPage = Math.min(totalPages, currentPage + 1);
        
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            paginationHTML += `
                <button class="pagination-btn ${activeClass}" onclick="changePage(${i})">
                    ${i}
                </button>
            `;
        }
        
        // Last page + ellipsis
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
            paginationHTML += `<button class="pagination-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
        }
        
        // Next button
        const nextDisabled = currentPage >= totalPages ? 'disabled' : '';
        paginationHTML += `
            <button class="pagination-btn ${nextDisabled}" onclick="changePage(${currentPage + 1})" ${nextDisabled}>
                Next
            </button>
        `;
        
        paginationContainer.innerHTML = paginationHTML;
    };
    
    // Override showModal and hideModal functions for new design
    window.showModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // Add focus trap
            setTimeout(() => {
                const firstInput = modal.querySelector('input[type="text"], textarea, select');
                if (firstInput) firstInput.focus();
            }, 100);
        } else {
            console.error('Modal not found:', modalId);
        }
    };
    
    window.hideModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        } else {
            console.error('Modal not found:', modalId);
        }
    };
    
    // Enhanced openAddItemModal with debugging
    window.openAddItemModal = function() {
        console.log('🔧 Opening add item modal...');
        
        // Debug modal elements
        const elements = debugModalElements();
        
        if (!elements.modalOverlay) {
            console.error('❌ Modal overlay not found! Make sure the HTML has id="itemModalOverlay"');
            showToast('Modal error: Overlay not found', 'error');
            return;
        }
        
        currentEditingId = null;
        
        // Update modal title and button text
        if (elements.modalTitle) elements.modalTitle.textContent = 'Add New Item';
        if (elements.saveButtonText) elements.saveButtonText.textContent = 'Save Item';
        
        // Reset form
        if (typeof resetForm === 'function') {
            resetForm();
        } else {
            console.warn('⚠️ resetForm function not found');
        }
        
        // Show modal with extra debugging
        console.log('📱 Showing modal...');
        elements.modalOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Verify modal is visible
        setTimeout(() => {
            const isVisible = elements.modalOverlay.style.display === 'flex';
            console.log('👁️ Modal visibility check:', isVisible ? 'VISIBLE' : 'HIDDEN');
            
            if (!isVisible) {
                console.error('❌ Modal failed to show!');
                showToast('Modal failed to open', 'error');
            } else {
                // Focus first input
                const firstInput = elements.modalOverlay.querySelector('input[type="text"], textarea, select');
                if (firstInput) {
                    firstInput.focus();
                    console.log('🎯 Focused first input');
                }
            }
        }, 100);
    };
        
    // Override closeItemModal function
    window.closeItemModal = function() {
        hideModal('itemModalOverlay');
        resetForm();
        currentEditingId = null;
    };
    
    // Override closeDeleteModal function  
    window.closeDeleteModal = function() {
        hideModal('deleteModalOverlay');
        window.deleteItemId = null;
    };
}

// Debug function to check modal elements
function debugModalElements() {
    const modalOverlay = document.getElementById('itemModalOverlay');
    const modalTitle = document.getElementById('itemModalTitle');
    const saveButtonText = document.getElementById('saveButtonText');
    const itemForm = document.getElementById('itemForm');
    
    console.log('🔍 Modal Debug:', {
        modalOverlay: modalOverlay ? 'Found' : 'NOT FOUND',
        modalTitle: modalTitle ? 'Found' : 'NOT FOUND',
        saveButtonText: saveButtonText ? 'Found' : 'NOT FOUND',
        itemForm: itemForm ? 'Found' : 'NOT FOUND',
        modalOverlayDisplay: modalOverlay ? modalOverlay.style.display : 'N/A'
    });
    
    return {
        modalOverlay,
        modalTitle,
        saveButtonText,
        itemForm
    };
}

// New design specific functions
function createItemRow(item) {
    const imageUrl = item.image_path ? `/api/image/${item.image_path}?v=${Date.now()}` : null;
    const statusClass = item.hidden ? 'status-hidden' : 'status-visible';
    const statusText = item.hidden ? 'Hidden' : 'Visible';
    
    return `
        <tr class="${item.hidden ? 'hidden-item' : ''}">
            <td>
                <div class="item-image">
                    ${imageUrl ? 
                        `<img src="${imageUrl}" alt="${item.name}" loading="lazy">` :
                        '<div class="no-image">No Image</div>'
                    }
                </div>
            </td>
            <td>
                <div class="item-details">
                    <h4 class="item-name">${item.name || 'Unnamed Item'}</h4>
                    <p class="item-brand">${item.brand || 'No brand'}</p>
                    <p class="item-description">${(item.description || 'No description').substring(0, 100)}${item.description && item.description.length > 100 ? '...' : ''}</p>
                </div>
            </td>
            <td>
                <div class="variants-info">
                    ${getVariantsDisplayHTML(item.variants)}
                </div>
            </td>
            <td>
                <span class="status-badge ${statusClass}">
                    ${statusText}
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
    `;
}

function getVariantsDisplayHTML(variants) {
    if (!variants || variants.length === 0) {
        return '<span style="color: #999;">No variants</span>';
    }
    
    return variants.map(variant => {
        const size = variant.size_ml ? `${variant.size_ml}ml` : (variant.size || 'Unknown size');
        const price = variant.price_cents ? 
            `${(variant.price_cents / 1000).toFixed(3)} OMR` : 
            (variant.price ? `${variant.price.toFixed(3)} OMR` : 'No price');
        return `<div class="variant-item">${size} - ${price}</div>`;
    }).join('');
}

function updateStatCard(cardId, value) {
    const statElement = document.getElementById(cardId);
    if (statElement) {
        statElement.textContent = value;
        
        // Add animation effect
        statElement.style.transform = 'scale(1.1)';
        setTimeout(() => {
            statElement.style.transform = 'scale(1)';
        }, 200);
    }
}

function updatePaginationInfo(start, end, total) {
    const startElement = document.getElementById('startIndex');
    const endElement = document.getElementById('endIndex');
    const totalElement = document.getElementById('totalCount');
    
    if (startElement) startElement.textContent = start;
    if (endElement) endElement.textContent = end;
    if (totalElement) totalElement.textContent = total;
}

// Enhanced refresh function with loading animation
function refreshData() {
    const refreshBtn = document.getElementById('refreshBtn');
    const originalContent = refreshBtn.innerHTML;
    
    // Add refreshing state
    refreshBtn.classList.add('refreshing');
    refreshBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6 0-3.31 2.69-6 6-6 1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
        </svg>
        <span>Refreshing...</span>
    `;
    
    // Call original loadItems function
    loadItems().then(() => {
        // Remove refreshing state after a short delay
        setTimeout(() => {
            refreshBtn.classList.remove('refreshing');
            refreshBtn.innerHTML = originalContent;
            showToast('Items refreshed successfully', 'success');
        }, 1000);
    }).catch((error) => {
        console.error('Refresh failed:', error);
        refreshBtn.classList.remove('refreshing');
        refreshBtn.innerHTML = originalContent;
        showToast('Failed to refresh items', 'error');
    });
}

// Enhanced variant toggle function for new form design
function toggleVariantPrice(variant) {
    let checkboxId, priceId;
    
    switch(variant) {
        case '5ml':
            checkboxId = 'enable5ml';
            priceId = 'price5ml';
            break;
        case '10ml':
            checkboxId = 'enable10ml';
            priceId = 'price10ml';
            break;
        case '30ml':
            checkboxId = 'enable30ml';
            priceId = 'price30ml';
            break;
        case 'full':
            checkboxId = 'enableFullBottle';
            priceId = null; // Full bottle doesn't have price input
            break;
        default:
            console.error('Unknown variant:', variant);
            return;
    }
    
    const checkbox = document.getElementById(checkboxId);
    const priceInput = priceId ? document.getElementById(priceId) : null;
    
    if (!checkbox) {
        console.error('Checkbox not found:', checkboxId);
        return;
    }
    
    // Update price input state
    if (priceInput) {
        priceInput.disabled = !checkbox.checked;
        if (checkbox.checked) {
            priceInput.focus();
        } else {
            priceInput.value = '';
        }
    }
    
    // Visual feedback for variant card
    const variantCard = checkbox.closest('.variant-card');
    if (variantCard) {
        if (checkbox.checked) {
            variantCard.style.borderColor = '#8B4513';
            variantCard.style.backgroundColor = '#f8f9fa';
        } else {
            variantCard.style.borderColor = '#e9ecef';
            variantCard.style.backgroundColor = 'white';
        }
    }
    
    console.log(`Variant ${variant} ${checkbox.checked ? 'enabled' : 'disabled'}`);
}

// Enhanced modal functions with improved animations
function openAddItemModal() {
    // Call original function
    if (window.openAddItemModal) {
        window.originalOpenAddItemModal();
    }
    
    currentEditingId = null;
    document.getElementById('itemModalTitle').textContent = 'Add New Item';
    const saveButtonText = document.getElementById('saveButtonText');
    if (saveButtonText) saveButtonText.textContent = 'Save Item';
    
    resetForm();
    showModal('itemModalOverlay');
}

// Enhanced toast notification system
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.error('Toast container not found');
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div style="flex-shrink: 0;">
                ${getToastIcon(type)}
            </div>
            <div style="flex: 1;">
                ${message}
            </div>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
        if (toast && toast.parentElement) {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }
    }, duration);
    
    // Click to dismiss
    toast.addEventListener('click', () => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 300);
    });
}

function getToastIcon(type) {
    switch(type) {
        case 'success': return '✅';
        case 'error': return '❌';
        case 'warning': return '⚠️';
        default: return 'ℹ️';
    }
}

// Enhanced delete preview with better styling
function createDeletePreview(item) {
    const preview = document.getElementById('deleteItemPreview');
    if (!preview) return;
    
    const imageUrl = item.image_path ? `/api/image/${item.image_path}?v=${Date.now()}` : null;
    
    preview.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: white; border-radius: 12px; border: 2px solid #dc3545;">
            <div class="item-image" style="flex-shrink: 0;">
                ${imageUrl ? 
                    `<img src="${imageUrl}" alt="${item.name}" style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover;">` :
                    '<div style="width: 60px; height: 60px; background: #f8f9fa; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #6c757d; font-size: 0.75rem;">No Image</div>'
                }
            </div>
            <div style="flex: 1;">
                <h5 style="margin: 0 0 0.5rem 0; font-weight: 700; color: #2d3748;">${item.name || 'Unnamed Item'}</h5>
                ${item.brand ? `<p style="margin: 0 0 0.5rem 0; color: #6c757d; font-size: 0.9rem;"><strong>Brand:</strong> ${item.brand}</p>` : ''}
                <div style="color: #6c757d; font-size: 0.85rem;">
                    <strong>Variants:</strong> ${getVariantsDisplayText(item.variants)}
                </div>
            </div>
        </div>
    `;
}

function getVariantsDisplayText(variants) {
    if (!variants || variants.length === 0) {
        return 'No variants';
    }
    
    return variants.map(variant => {
        if (variant.is_whole_bottle) {
            return 'Full Bottle';
        }
        const size = variant.size_ml ? `${variant.size_ml}ml` : (variant.size || 'Unknown');
        return size;
    }).join(', ');
}

// Enhanced loading states
function showLoadingState() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const itemsTable = document.getElementById('itemsTable');
    const emptyState = document.getElementById('emptyState');
    
    if (loadingSpinner) loadingSpinner.style.display = 'flex';
    if (itemsTable) itemsTable.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
}

function hideLoadingState() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) loadingSpinner.style.display = 'none';
}

// Performance optimization for large datasets
function optimizeTableRendering() {
    const table = document.getElementById('itemsTable');
    if (table && items.length > 100) {
        // Virtual scrolling could be implemented here for very large datasets
        console.log(`📊 Large dataset detected (${items.length} items). Consider implementing virtual scrolling for better performance.`);
    }
}