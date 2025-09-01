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

function overrideFunctionsForNewDesign() {
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
    window.renderItems = function(itemsToRender) {
        const itemsList = document.getElementById('itemsList');
        const emptyState = document.getElementById('emptyState');
        const table = document.getElementById('itemsTable');
        
        if (!itemsList) {
            console.error('Items list container not found');
            return;
        }
        
        // Show/hide empty state
        if (!itemsToRender || itemsToRender.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            if (table) table.style.display = 'none';
            itemsList.innerHTML = '';
            updatePaginationInfo(0, 0, 0);
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        if (table) table.style.display = 'table';
        
        // Generate table rows
        itemsList.innerHTML = itemsToRender.map(item => createItemRow(item)).join('');
        
        // Update pagination info
        const startIndex = (currentPage - 1) * itemsPerPage + 1;
        const endIndex = Math.min(startIndex + itemsToRender.length - 1, filteredItems.length);
        updatePaginationInfo(startIndex, endIndex, filteredItems.length);
        
        // Update stats
        updateStats();
        
        console.log(`📋 Rendered ${itemsToRender.length} items for page ${currentPage}`);
    };
    
    // Override pagination function for new design
    window.originalRenderPagination = window.renderPagination;
    window.renderPagination = function(totalPages) {
        const paginationContainer = document.getElementById('paginationContainer');
        if (!paginationContainer || totalPages <= 1) {
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        // Previous button
        const prevDisabled = currentPage <= 1 ? 'disabled' : '';
        paginationHTML += `
            <button class="pagination-btn ${prevDisabled}" onclick="changePage(${currentPage - 1})" ${prevDisabled}>
                Previous
            </button>
        `;
        
        // Page numbers with smart ellipsis
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        // Adjust start if we're near the end
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        // First page + ellipsis
        if (startPage > 1) {
            paginationHTML += `<button class="pagination-btn" onclick="changePage(1)">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
        }
        
        // Page numbers
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
        }
    };
    
    window.hideModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
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
                        `<img src="${imageUrl}" alt="${item.name || 'Item'}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'no-image\\'>No Image</div>'">` :
                        '<div class="no-image">No Image</div>'
                    }
                </div>
            </td>
            <td>
                <div class="item-details">
                    <h4>${item.name || 'Unnamed Item'}</h4>
                    ${item.brand ? `<div class="item-brand">${item.brand}</div>` : ''}
                    ${item.description ? `<div class="item-description" title="${item.description}">${item.description}</div>` : ''}
                </div>
            </td>
            <td>
                <div class="variants-info">
                    ${getVariantsDisplayForTable(item.variants)}
                </div>
            </td>
            <td>
                <span class="status-badge ${statusClass}">
                    ${statusText}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-small btn-edit" onclick="editItem('${item.id}')" title="Edit Item">
                        Edit
                    </button>
                    <button class="btn-small ${item.hidden ? 'btn-show' : 'btn-hide'}" 
                            onclick="toggleItemVisibility('${item.id}', ${item.hidden})"
                            title="${item.hidden ? 'Show Item' : 'Hide Item'}">
                        ${item.hidden ? 'Show' : 'Hide'}
                    </button>
                    <button class="btn-small btn-delete" onclick="deleteItem('${item.id}')" title="Delete Item">
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function getVariantsDisplayForTable(variants) {
    if (!variants || variants.length === 0) {
        return '<span style="color: #999; font-style: italic;">No variants</span>';
    }
    
    return variants.map(variant => {
        if (variant.is_whole_bottle) {
            return '<div class="variant-item">Full Bottle (Contact)</div>';
        }
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
            toast.remove();
        }, 300);
    });
}

function getToastIcon(type) {
    const icons = {
        success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#28a745"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>',
        error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#dc3545"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
        warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#ffc107"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
        info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#17a2b8"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>'
    };
    return icons[type] || icons.info;
}

// Enhanced form validation with visual feedback
function validateItemForm() {
    const form = document.getElementById('itemForm');
    if (!form) return false;
    
    let isValid = true;
    const errors = [];
    
    // Required fields validation
    const itemName = document.getElementById('itemName');
    const itemImage = document.getElementById('itemImage');
    
    if (!itemName || !itemName.value.trim()) {
        errors.push('Item name is required');
        if (itemName) addFieldError(itemName);
        isValid = false;
    } else {
        if (itemName) removeFieldError(itemName);
    }
    
    // Image validation for new items
    if (!currentEditingId && (!itemImage || !itemImage.files.length)) {
        errors.push('Item image is required');
        if (itemImage) addFieldError(itemImage);
        isValid = false;
    } else {
        if (itemImage) removeFieldError(itemImage);
    }
    
    // Variants validation
    const hasVariants = document.getElementById('enable5ml').checked ||
                       document.getElementById('enable10ml').checked ||
                       document.getElementById('enable30ml').checked ||
                       document.getElementById('enableFullBottle').checked;
    
    if (!hasVariants) {
        errors.push('At least one variant must be selected');
        isValid = false;
    }
    
    // Price validation for enabled variants
    const variants = [
        { checkbox: 'enable5ml', price: 'price5ml', name: '5ml' },
        { checkbox: 'enable10ml', price: 'price10ml', name: '10ml' },
        { checkbox: 'enable30ml', price: 'price30ml', name: '30ml' }
    ];
    
    variants.forEach(variant => {
        const checkbox = document.getElementById(variant.checkbox);
        const priceInput = document.getElementById(variant.price);
        
        if (checkbox && checkbox.checked && priceInput) {
            const price = parseFloat(priceInput.value);
            if (!price || price <= 0) {
                errors.push(`${variant.name} price must be greater than 0`);
                addFieldError(priceInput);
                isValid = false;
            } else {
                removeFieldError(priceInput);
            }
        }
    });
    
    // Show errors if any
    if (errors.length > 0) {
        showToast(errors.join('. '), 'error', 6000);
    }
    
    return isValid;
}

function addFieldError(field) {
    field.style.borderColor = '#dc3545';
    field.style.boxShadow = '0 0 0 3px rgba(220, 53, 69, 0.1)';
}

function removeFieldError(field) {
    field.style.borderColor = '#e9ecef';
    field.style.boxShadow = 'none';
}

// Enhanced image preview functionality
function handleImagePreview(e) {
    const file = e.target.files[0];
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    
    if (!file) {
        if (imagePreview) imagePreview.style.display = 'none';
        return;
    }
    
    // Validation
    if (!file.type.includes('png')) {
        showToast('Only PNG images are allowed', 'error');
        e.target.value = '';
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image too large. Please choose an image under 5MB.', 'error');
        e.target.value = '';
        return;
    }
    
    // Show preview
    if (imagePreview && previewImg) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            imagePreview.style.display = 'block';
            
            // Add loading animation
            previewImg.style.opacity = '0';
            previewImg.onload = function() {
                previewImg.style.transition = 'opacity 0.3s ease';
                previewImg.style.opacity = '1';
            };
        };
        reader.readAsDataURL(file);
    }
}

function removeImagePreview() {
    const imagePreview = document.getElementById('imagePreview');
    const imageInput = document.getElementById('itemImage');
    
    if (imagePreview) imagePreview.style.display = 'none';
    if (imageInput) imageInput.value = '';
}
// Enhanced search functionality with highlighting
function highlightSearchTerms(text, searchTerm) {
    if (!searchTerm) return text;

    // Escape regex special characters in the search term
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');

    return text.replace(regex, '<mark style="background: yellow; padding: 0 2px;">$1</mark>');
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + N: Add new item
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openAddItemModal();
    }
    
    // Ctrl/Cmd + R: Refresh
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refreshData();
    }
    
    // Escape: Close modals
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal-overlay[style*="flex"]');
        modals.forEach(modal => {
            if (modal.id === 'itemModalOverlay') {
                closeItemModal();
            } else if (modal.id === 'deleteModalOverlay') {
                closeDeleteModal();
            }
        });
    }
    
    // Enter: Submit forms
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.form) {
        const form = e.target.form;
        if (form.id === 'itemForm') {
            e.preventDefault();
            handleFormSubmit({ preventDefault: () => {}, target: form });
        }
    }
});

// Enhanced delete confirmation with item details
function deleteItem(itemId) {
    const item = items.find(i => i.id == itemId);
    if (!item) {
        showToast('Item not found', 'error');
        return;
    }
    
    deleteItemId = itemId;
    
    // Populate enhanced delete preview
    const preview = document.getElementById('deleteItemPreview');
    if (preview) {
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
    
    showModal('deleteModalOverlay');
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

// Auto-save draft functionality (for edit mode)
function setupAutoSave() {
    const form = document.getElementById('itemForm');
    if (!form) return;
    
    const inputs = form.querySelectorAll('input, textarea, select');
    let saveTimeout;
    
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                if (currentEditingId) {
                    saveDraft();
                }
            }, 2000); // Auto-save after 2 seconds of inactivity
        });
    });
}

function saveDraft() {
    const formData = {
        name: document.getElementById('itemName').value,
        brand: document.getElementById('itemBrand').value,
        description: document.getElementById('itemDescription').value,
        hidden: document.getElementById('itemHidden').checked,
        variants: {
            '5ml': {
                enabled: document.getElementById('enable5ml').checked,
                price: document.getElementById('price5ml').value
            },
            '10ml': {
                enabled: document.getElementById('enable10ml').checked,
                price: document.getElementById('price10ml').value
            },
            '30ml': {
                enabled: document.getElementById('enable30ml').checked,
                price: document.getElementById('price30ml').value
            },
            'full': {
                enabled: document.getElementById('enableFullBottle').checked
            }
        }
    };
    
    localStorage.setItem(`qotore_item_draft_${currentEditingId}`, JSON.stringify(formData));
    console.log('💾 Draft saved automatically');
}

function loadDraft(itemId) {
    const draftKey = `qotore_item_draft_${itemId}`;
    const draft = localStorage.getItem(draftKey);
    
    if (draft) {
        try {
            const formData = JSON.parse(draft);
            // Apply draft data to form
            // This would be implemented if auto-save is needed
            console.log('📄 Draft loaded for item', itemId);
        } catch (error) {
            console.error('Failed to load draft:', error);
            localStorage.removeItem(draftKey);
        }
    }
}

function clearDraft(itemId) {
    const draftKey = `qotore_item_draft_${itemId}`;
    localStorage.removeItem(draftKey);
}

// Initialize new features when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Set up auto-save for forms
    setTimeout(setupAutoSave, 1000);
    
    // Add smooth scrolling to pagination
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('pagination-btn') && !e.target.disabled) {
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
        }
    });
    
    // Add loading states to action buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-small')) {
            const originalText = e.target.textContent;
            e.target.style.opacity = '0.7';
            e.target.disabled = true;
            
            setTimeout(() => {
                e.target.style.opacity = '1';
                e.target.disabled = false;
            }, 1000);
        }
    });
});

// Export functions for global access
window.refreshData = refreshData;
window.toggleVariantPrice = toggleVariantPrice;
window.showToast = showToast;
window.validateItemForm = validateItemForm;
window.handleImagePreview = handleImagePreview;
window.removeImagePreview = removeImagePreview;