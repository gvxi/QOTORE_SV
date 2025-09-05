// Items Management Adapter - MINIMAL VERSION
// Only essential missing functions, no conflicts with main script

let isAdapterInitialized = false;

// Wait for DOM and other scripts to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔌 Minimal items management adapter loaded');
    
    // Small delay to ensure other scripts are loaded first
    setTimeout(() => {
        initializeMinimalAdapter();
    }, 500);
});

function initializeMinimalAdapter() {
    if (isAdapterInitialized) return;
    isAdapterInitialized = true;
    
    console.log('🔧 Initializing minimal adapter...');
    
    // Only add missing functions, DO NOT override existing ones
    addMissingFunctionsOnly();
    
    // Add enhanced features without conflicts
    addEnhancedFeaturesOnly();
    
    console.log('✅ Minimal adapter initialization complete');
}

// Add only missing functions that cause errors
function addMissingFunctionsOnly() {
    
    // Add missing resetVariantFields function if it doesn't exist
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
                    // Remove any error styling
                    priceFieldEl.style.borderColor = '#e9ecef';
                    priceFieldEl.style.boxShadow = 'none';
                }
            });
        };
        console.log('✅ Added resetVariantFields function');
    }
    
    // Add missing removeImagePreview function if it doesn't exist
    if (typeof window.removeImagePreview !== 'function') {
        window.removeImagePreview = function() {
            const imagePreview = document.getElementById('imagePreview');
            const imageInput = document.getElementById('itemImage');
            
            if (imagePreview) imagePreview.style.display = 'none';
            if (imageInput) imageInput.value = '';
        };
        console.log('✅ Added removeImagePreview function');
    }
    
    // Add missing toggleVariantPrice function if it doesn't exist
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
        console.log('✅ Added toggleVariantPrice function');
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
        console.log('✅ Added showModal function');
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
        console.log('✅ Added hideModal function');
    }
}

// Add enhanced features without conflicting with main script
function addEnhancedFeaturesOnly() {
    
    // Items per page selector (if it exists and main script doesn't handle it)
    const itemsPerPageSelect = document.getElementById('itemsPerPageSelect');
    if (itemsPerPageSelect && typeof applyFiltersAndPagination === 'function') {
        // Check if it already has event listeners
        if (!itemsPerPageSelect.hasAttribute('data-adapter-initialized')) {
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
            itemsPerPageSelect.setAttribute('data-adapter-initialized', 'true');
            console.log('✅ Items per page selector enhanced');
        }
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
    
    console.log('✅ Enhanced features added without conflicts');
}

// Debug function to check what's working
function debugCurrentState() {
    const diagnostics = {
        // Check if critical functions exist
        functions: {
            loadItems: typeof loadItems,
            renderItems: typeof renderItems,
            renderTableRows: typeof renderTableRows,
            openAddItemModal: typeof openAddItemModal,
            editItem: typeof editItem,
            resetVariantFields: typeof resetVariantFields,
            showModal: typeof showModal,
            hideModal: typeof hideModal,
            refreshData: typeof refreshData,
            changePage: typeof changePage
        },
        
        // Check if critical elements exist
        elements: {
            itemsList: !!document.getElementById('itemsList'),
            itemModalOverlay: !!document.getElementById('itemModalOverlay'),
            itemForm: !!document.getElementById('itemForm'),
            loadingSpinner: !!document.getElementById('loadingSpinner'),
            itemsTable: !!document.getElementById('itemsTable'),
            paginationContainer: !!document.getElementById('paginationContainer'),
            refreshBtn: !!document.getElementById('refreshBtn')
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
    
    if (diagnostics.functions.changePage !== 'function') {
        issues.push('❌ changePage function not available');
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

console.log('✅ Minimal items management adapter loaded successfully');