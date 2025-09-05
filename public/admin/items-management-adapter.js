// Items Management Adapter - FIXED VERSION
// This adapter connects the new UI design with existing functionality

// Global variables
let isAdapterLoaded = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔌 Items management adapter loaded');
    
    // Wait for other scripts to load
    setTimeout(() => {
        initializeAdapter();
    }, 100);
});

function initializeAdapter() {
    if (isAdapterLoaded) return;
    isAdapterLoaded = true;
    
    console.log('🚀 Initializing adapter...');
    
    // Initialize new design specific features
    initializeNewDesignFeatures();
    
    // Override existing functions for new design compatibility
    overrideFunctionsForNewDesign();
    
    // Verify modal elements
    verifyModalElements();
}

function verifyModalElements() {
    const modalOverlay = document.getElementById('itemModalOverlay');
    const deleteModalOverlay = document.getElementById('deleteModalOverlay');
    
    console.log('🔍 Modal verification:', {
        itemModal: modalOverlay ? '✅ Found' : '❌ Missing',
        deleteModal: deleteModalOverlay ? '✅ Found' : '❌ Missing'
    });
    
    if (!modalOverlay) {
        console.error('❌ Critical: itemModalOverlay not found in DOM!');
    }
}

function initializeNewDesignFeatures() {
    // Items per page selector
    const itemsPerPageSelect = document.getElementById('itemsPerPageSelect');
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', (e) => {
            const newItemsPerPage = parseInt(e.target.value);
            if (typeof window.itemsPerPage !== 'undefined' && newItemsPerPage !== window.itemsPerPage) {
                window.itemsPerPage = newItemsPerPage;
                if (typeof window.currentPage !== 'undefined') {
                    window.currentPage = 1;
                }
                if (typeof applyFiltersAndPagination === 'function') {
                    applyFiltersAndPagination();
                }
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
                if (typeof window.currentSearchTerm !== 'undefined') {
                    window.currentSearchTerm = e.target.value;
                    window.currentPage = 1;
                    if (typeof applyFiltersAndPagination === 'function') {
                        applyFiltersAndPagination();
                    }
                }
            }, 300);
        });
    }
}

function overrideFunctionsForNewDesign() {
    
    // Enhanced pagination with new design
    window.updatePagination = function(totalItems, currentPage, itemsPerPage) {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const paginationContainer = document.getElementById('paginationContainer');
        
        if (!paginationContainer) {
            console.warn('Pagination container not found');
            return;
        }
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
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
        
        // Page numbers logic
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
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
    
    // FIXED: Robust modal functions
    window.showModal = function(modalId) {
        console.log(`🔧 showModal called for: ${modalId}`);
        
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`❌ Modal not found: ${modalId}`);
            if (typeof showToast === 'function') {
                showToast('Modal not found', 'error');
            }
            return false;
        }
        
        console.log(`📱 Showing modal: ${modalId}`);
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Add focus management
        setTimeout(() => {
            const firstInput = modal.querySelector('input[type="text"], input[type="email"], textarea, select');
            if (firstInput && !firstInput.disabled) {
                firstInput.focus();
                console.log('🎯 Focused first input');
            }
        }, 100);
        
        return true;
    };
    
    window.hideModal = function(modalId) {
        console.log(`🔧 hideModal called for: ${modalId}`);
        
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`❌ Modal not found: ${modalId}`);
            return false;
        }
        
        console.log(`📱 Hiding modal: ${modalId}`);
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        return true;
    };
    
    // FIXED: Enhanced openAddItemModal with better error handling
    window.openAddItemModal = function() {
        console.log('🔧 Opening add item modal...');
        
        // Check for required elements
        const modalOverlay = document.getElementById('itemModalOverlay');
        const modalTitle = document.getElementById('itemModalTitle');
        const saveButtonText = document.getElementById('saveButtonText');
        const itemForm = document.getElementById('itemForm');
        
        console.log('🔍 Modal elements check:', {
            modalOverlay: modalOverlay ? '✅' : '❌',
            modalTitle: modalTitle ? '✅' : '❌',
            saveButtonText: saveButtonText ? '✅' : '❌',
            itemForm: itemForm ? '✅' : '❌'
        });
        
        if (!modalOverlay) {
            console.error('❌ Critical: Modal overlay not found!');
            if (typeof showToast === 'function') {
                showToast('Modal error: Elements not found', 'error');
            }
            return;
        }
        
        // Reset editing state
        if (typeof window.currentEditingId !== 'undefined') {
            window.currentEditingId = null;
        }
        
        // Update modal content
        if (modalTitle) modalTitle.textContent = 'Add New Item';
        if (saveButtonText) saveButtonText.textContent = 'Save Item';
        
        // Reset form
        if (typeof resetForm === 'function') {
            resetForm();
        } else {
            console.warn('⚠️ resetForm function not available');
            // Basic form reset
            if (itemForm) {
                itemForm.reset();
                // Reset file preview
                const imagePreview = document.getElementById('imagePreview');
                if (imagePreview) imagePreview.style.display = 'none';
            }
        }
        
        // Show modal
        const success = showModal('itemModalOverlay');
        
        if (success) {
            console.log('✅ Modal opened successfully');
        } else {
            console.error('❌ Failed to open modal');
            if (typeof showToast === 'function') {
                showToast('Failed to open modal', 'error');
            }
        }
    };
    
    // FIXED: editItem function
    window.editItem = function(itemId) {
        console.log(`🔧 Editing item: ${itemId}`);
        
        const item = window.items ? window.items.find(i => i.id == itemId) : null;
        if (!item) {
            console.error('❌ Item not found:', itemId);
            if (typeof showToast === 'function') {
                showToast('Item not found', 'error');
            }
            return;
        }
        
        const modalTitle = document.getElementById('itemModalTitle');
        const saveButtonText = document.getElementById('saveButtonText');
        
        if (typeof window.currentEditingId !== 'undefined') {
            window.currentEditingId = itemId;
        }
        
        if (modalTitle) modalTitle.textContent = 'Edit Item';
        if (saveButtonText) saveButtonText.textContent = 'Update Item';
        
        // Populate form
        if (typeof populateForm === 'function') {
            populateForm(item);
        } else {
            console.warn('⚠️ populateForm function not available');
        }
        
        showModal('itemModalOverlay');
    };
    
    // Override closeItemModal function
    window.closeItemModal = function() {
        console.log('🔧 Closing item modal...');
        
        hideModal('itemModalOverlay');
        
        if (typeof resetForm === 'function') {
            resetForm();
        }
        
        if (typeof window.currentEditingId !== 'undefined') {
            window.currentEditingId = null;
        }
    };
    
    // Override closeDeleteModal function  
    window.closeDeleteModal = function() {
        console.log('🔧 Closing delete modal...');
        
        hideModal('deleteModalOverlay');
        
        if (typeof window.deleteItemId !== 'undefined') {
            window.deleteItemId = null;
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
                        `<img src="${imageUrl}" alt="${item.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                         <div class="no-image" style="display: none;">No Image</div>` :
                        `<div class="no-image">No Image</div>`
                    }
                </div>
            </td>
            <td>
                <div class="item-details">
                    <h4>${item.name}</h4>
                    <div class="item-brand">${item.brand || 'No Brand'}</div>
                    <div class="item-description">${item.description ? (item.description.length > 80 ? item.description.substring(0, 80) + '...' : item.description) : 'No description'}</div>
                </div>
            </td>
            <td>
                <div class="variants-display">
                    ${item.variants && item.variants.length > 0 ? 
                        item.variants.map(v => {
                            if (v.is_whole_bottle) {
                                return '<span class="variant-tag whole-bottle">Whole Bottle</span>';
                            } else {
                                const price = v.price_cents ? (v.price_cents / 1000).toFixed(3) + ' OMR' : 'N/A';
                                return `<span class="variant-tag">${v.size_ml}ml - ${price}</span>`;
                            }
                        }).join('') : 
                        '<span class="no-variants">No variants</span>'
                    }
                </div>
            </td>
            <td>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-small btn-outline" onclick="editItem(${item.id})">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                        Edit
                    </button>
                    <button class="btn btn-small ${item.hidden ? 'btn-success' : 'btn-warning'}" onclick="toggleVisibility(${item.id}, ${item.hidden})">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            ${item.hidden ? 
                                '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>' :
                                '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>'
                            }
                        </svg>
                        ${item.hidden ? 'Show' : 'Hide'}
                    </button>
                    <button class="btn btn-small btn-danger" onclick="deleteItem(${item.id})">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// Enhanced image handling
function handleImagePreview(e) {
    const file = e.target.files[0];
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    
    if (!file) {
        if (imagePreview) imagePreview.style.display = 'none';
        return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        if (typeof showToast === 'function') {
            showToast('Please select a valid image file.', 'error');
        }
        e.target.value = '';
        return;
    }
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
        if (typeof showToast === 'function') {
            showToast('Please choose an image under 5MB.', 'error');
        }
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

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + N: Add new item
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (typeof openAddItemModal === 'function') {
            openAddItemModal();
        }
    }
    
    // Escape: Close modals
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal-overlay[style*="flex"]');
        modals.forEach(modal => {
            if (modal.id === 'itemModalOverlay' && typeof closeItemModal === 'function') {
                closeItemModal();
            } else if (modal.id === 'deleteModalOverlay' && typeof closeDeleteModal === 'function') {
                closeDeleteModal();
            }
        });
    }
});

// Debug function to check function overrides
function debugFunctionOverrides() {
    console.log('🔍 Function Override Debug:', {
        showModal: typeof window.showModal,
        hideModal: typeof window.hideModal,
        openAddItemModal: typeof window.openAddItemModal,
        editItem: typeof window.editItem,
        closeItemModal: typeof window.closeItemModal,
        items: window.items ? window.items.length : 'Not loaded'
    });
}

// Export functions for global access
if (typeof window !== 'undefined') {
    window.createItemRow = createItemRow;
    window.handleImagePreview = handleImagePreview;
    window.removeImagePreview = removeImagePreview;
    window.debugFunctionOverrides = debugFunctionOverrides;
}

console.log('✅ Items management adapter script loaded');

// Auto-debug after a short delay
setTimeout(() => {
    debugFunctionOverrides();
}, 2000);