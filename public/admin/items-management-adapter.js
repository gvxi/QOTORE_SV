// Items Management Adapter - MINIMAL FIX VERSION
// This provides only the essential missing functions without conflicts

let isAdapterInitialized = false;

// Wait for DOM and other scripts to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔌 Items management adapter loaded');
    
    // Small delay to ensure other scripts are loaded first
    setTimeout(() => {
        initializeAdapter();
    }, 500);
});

function initializeAdapter() {
    if (isAdapterInitialized) return;
    isAdapterInitialized = true;
    
    console.log('🔧 Initializing adapter fixes...');
    
    // Add missing functions
    addMissingFunctions();
    
    // Fix modal functions if needed
    fixModalFunctions();
    
    // Add event listeners for new features
    addEnhancedFeatures();
    
    console.log('✅ Adapter initialization complete');
}

// Add missing functions that cause errors
function addMissingFunctions() {
    
    // CRITICAL: Add missing resetVariantFields function
    if (typeof window.resetVariantFields !== 'function') {
        window.resetVariantFields = function() {
            console.log('🔄 Resetting variant fields...');
            
            const variants = [
                { checkbox: 'enable5ml', priceField: 'price5ml' },
                { checkbox: 'enable10ml', priceField: 'price10ml' },
                { checkbox: 'enable30ml', priceField: 'price30ml' },
                { checkbox: 'enableFullBottle', priceField: null }
            ];
            
            variants.forEach(({ checkbox, priceField }) => {
                const checkboxEl = document.getElementById(checkbox);
                const priceFieldEl = priceField ? document.getElementById(priceField) : null;
                
                if (checkboxEl) {
                    checkboxEl.checked = false;
                }
                
                if (priceFieldEl) {
                    priceFieldEl.value = '';
                    priceFieldEl.disabled = true;
                }
            });
        };
    }
    
    // CRITICAL: Add missing removeImagePreview function  
    if (typeof window.removeImagePreview !== 'function') {
        window.removeImagePreview = function() {
            const imagePreview = document.getElementById('imagePreview');
            const imageInput = document.getElementById('itemImage');
            
            if (imagePreview) imagePreview.style.display = 'none';
            if (imageInput) imageInput.value = '';
        };
    }
    
    // CRITICAL: Add missing getVariantsDisplay function
    if (typeof window.getVariantsDisplay !== 'function') {
        window.getVariantsDisplay = function(variants) {
            if (!variants || variants.length === 0) {
                return '<span class="no-variants">No variants</span>';
            }
            
            return variants.map(variant => {
                if (variant.is_whole_bottle) {
                    return '<span class="variant-tag whole-bottle">Full Bottle</span>';
                } else {
                    const size = variant.size_ml ? `${variant.size_ml}ml` : (variant.size || 'Unknown');
                    const price = variant.price_cents ? 
                        `${(variant.price_cents / 1000).toFixed(3)} OMR` : 
                        (variant.price ? `${variant.price.toFixed(3)} OMR` : 'Contact');
                    return `<span class="variant-tag">${size} - ${price}</span>`;
                }
            }).join(' ');
        };
    }
    
    // CRITICAL: Add missing toggleVariantPrice function
    if (typeof window.toggleVariantPrice !== 'function') {
        window.toggleVariantPrice = function(variant) {
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
                    priceId = null;
                    break;
                default:
                    console.error('Unknown variant:', variant);
                    return;
            }
            
            const checkbox = document.getElementById(checkboxId);
            const priceInput = priceId ? document.getElementById(priceId) : null;
            
            if (checkbox && priceInput) {
                priceInput.disabled = !checkbox.checked;
                if (!checkbox.checked) {
                    priceInput.value = '';
                }
            }
        };
    }
    
    // Add missing showModal/hideModal if they don't exist
    if (typeof window.showModal !== 'function') {
        window.showModal = function(modalId) {
            console.log(`🔧 showModal called for: ${modalId}`);
            
            const modal = document.getElementById(modalId);
            if (!modal) {
                console.error(`❌ Modal not found: ${modalId}`);
                return false;
            }
            
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // Focus management
            setTimeout(() => {
                const firstInput = modal.querySelector('input[type="text"], input[type="email"], textarea, select');
                if (firstInput && !firstInput.disabled) {
                    firstInput.focus();
                }
            }, 100);
            
            return true;
        };
    }
    
    if (typeof window.hideModal !== 'function') {
        window.hideModal = function(modalId) {
            console.log(`🔧 hideModal called for: ${modalId}`);
            
            const modal = document.getElementById(modalId);
            if (!modal) {
                console.error(`❌ Modal not found: ${modalId}`);
                return false;
            }
            
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            
            return true;
        };
    }
}

// Fix modal functions only if they're broken
function fixModalFunctions() {
    
    // Only override openAddItemModal if it doesn't exist or is broken
    if (typeof window.openAddItemModal !== 'function') {
        window.openAddItemModal = function() {
            console.log('🔧 Opening add item modal...');
            
            // Reset editing state
            if (typeof currentEditingId !== 'undefined') {
                currentEditingId = null;
            }
            
            // Update modal content
            const modalTitle = document.getElementById('itemModalTitle');
            const saveButtonText = document.getElementById('saveButtonText');
            
            if (modalTitle) modalTitle.textContent = 'Add New Item';
            if (saveButtonText) saveButtonText.textContent = 'Save Item';
            
            // Reset form
            if (typeof resetForm === 'function') {
                resetForm();
            } else {
                console.warn('⚠️ resetForm function not available');
                const form = document.getElementById('itemForm');
                if (form) form.reset();
                if (typeof resetVariantFields === 'function') {
                    resetVariantFields();
                }
            }
            
            // Show modal
            showModal('itemModalOverlay');
        };
    }
    
    // Enhanced closeItemModal
    const originalCloseItemModal = window.closeItemModal;
    window.closeItemModal = function() {
        console.log('🔧 Closing item modal...');
        
        hideModal('itemModalOverlay');
        
        if (typeof resetForm === 'function') {
            resetForm();
        } else if (typeof resetVariantFields === 'function') {
            resetVariantFields();
        }
        
        if (typeof currentEditingId !== 'undefined') {
            currentEditingId = null;
        }
    };
    
    // Enhanced closeDeleteModal
    const originalCloseDeleteModal = window.closeDeleteModal;
    window.closeDeleteModal = function() {
        console.log('🔧 Closing delete modal...');
        
        hideModal('deleteModalOverlay');
        
        if (typeof deleteItemId !== 'undefined') {
            deleteItemId = null;
        }
    };
}

// Add enhanced features without breaking existing functionality
function addEnhancedFeatures() {
    
    // Items per page selector
    const itemsPerPageSelect = document.getElementById('itemsPerPageSelect');
    if (itemsPerPageSelect && typeof applyFiltersAndPagination === 'function') {
        itemsPerPageSelect.addEventListener('change', (e) => {
            const newItemsPerPage = parseInt(e.target.value);
            if (typeof itemsPerPage !== 'undefined' && newItemsPerPage !== itemsPerPage) {
                window.itemsPerPage = newItemsPerPage;
                if (typeof currentPage !== 'undefined') {
                    currentPage = 1;
                }
                applyFiltersAndPagination();
            }
        });
        console.log('✅ Items per page selector enhanced');
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
    
    console.log('✅ Enhanced features added');
}

// Debug function to check what's working
function debugCurrentState() {
    const diagnostics = {
        // Check if critical functions exist
        functions: {
            loadItems: typeof loadItems,
            renderItems: typeof renderItems,
            openAddItemModal: typeof openAddItemModal,
            editItem: typeof editItem,
            resetVariantFields: typeof resetVariantFields,
            showModal: typeof showModal,
            hideModal: typeof hideModal,
            getVariantsDisplay: typeof getVariantsDisplay
        },
        
        // Check if critical elements exist
        elements: {
            itemsList: !!document.getElementById('itemsList'),
            itemModalOverlay: !!document.getElementById('itemModalOverlay'),
            itemForm: !!document.getElementById('itemForm'),
            loadingSpinner: !!document.getElementById('loadingSpinner'),
            itemsTable: !!document.getElementById('itemsTable')
        },
        
        // Check global variables
        variables: {
            items: typeof items !== 'undefined' ? (Array.isArray(items) ? items.length : typeof items) : 'undefined',
            currentPage: typeof currentPage !== 'undefined' ? currentPage : 'undefined',
            currentEditingId: typeof currentEditingId !== 'undefined' ? currentEditingId : 'undefined'
        }
    };
    
    console.log('🔍 Current State Diagnostics:', diagnostics);
    
    // Check for common issues
    const issues = [];
    
    if (!diagnostics.elements.itemsList) {
        issues.push('❌ itemsList element not found');
    }
    
    if (!diagnostics.elements.itemModalOverlay) {
        issues.push('❌ itemModalOverlay element not found');
    }
    
    if (diagnostics.functions.renderItems !== 'function') {
        issues.push('❌ renderItems function not available');
    }
    
    if (diagnostics.functions.openAddItemModal !== 'function') {
        issues.push('❌ openAddItemModal function not available');
    }
    
    if (issues.length > 0) {
        console.error('🚨 Critical Issues Found:', issues);
    } else {
        console.log('✅ All critical components are available');
    }
    
    return diagnostics;
}

// Auto-debug after initialization
setTimeout(() => {
    debugCurrentState();
}, 3000);

// Make debug function available globally
window.debugItemsManagement = debugCurrentState;

console.log('✅ Items management adapter loaded (minimal fix version)');