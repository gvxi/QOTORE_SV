// Items Management Adapter - PAGINATION FOCUSED
// Handles pagination and UI elements that the main script misses

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔌 Items management adapter (pagination focused) loaded');
    
    // Small delay to ensure main script is loaded
    setTimeout(() => {
        initializePaginationAdapter();
    }, 500);
});

function initializePaginationAdapter() {
    console.log('🔧 Initializing pagination adapter...');
    
    // Override pagination functions to match HTML structure
    overridePaginationFunctions();
    
    // Add missing utility functions
    addMissingUtilityFunctions();
    
    // Enhanced features
    addEnhancedFeatures();
    
    console.log('✅ Pagination adapter initialization complete');
}

function overridePaginationFunctions() {
    
    // Override renderPagination to work with the HTML structure
    window.renderPagination = function(totalPages) {
        const paginationContainer = document.getElementById('paginationContainer');
        if (!paginationContainer) {
            console.warn('❌ paginationContainer not found');
            return;
        }
        
        // Update pagination info first
        updatePaginationInfo();
        
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
        console.log(`📄 Pagination rendered: Page ${currentPage} of ${totalPages}`);
    };
    
    // Override changePage to add validation and better UX
    window.changePage = function(page) {
        if (!filteredItems || filteredItems.length === 0) {
            console.warn('❌ No filtered items available for pagination');
            return;
        }
        
        const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
        
        if (page < 1 || page > totalPages) {
            console.warn(`❌ Invalid page: ${page}. Valid range: 1-${totalPages}`);
            return;
        }
        
        currentPage = page;
        console.log(`📄 Changed to page ${page}`);
        
        if (typeof applyFiltersAndPagination === 'function') {
            applyFiltersAndPagination();
        }
        
        // Smooth scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    console.log('✅ Pagination functions overridden');
}

function addMissingUtilityFunctions() {
    
    // Update pagination info display
    window.updatePaginationInfo = function() {
        if (!filteredItems || filteredItems.length === 0) {
            updatePaginationDisplay(0, 0, 0);
            return;
        }
        
        const startIndex = (currentPage - 1) * itemsPerPage + 1;
        const endIndex = Math.min(currentPage * itemsPerPage, filteredItems.length);
        const totalCount = filteredItems.length;
        
        updatePaginationDisplay(startIndex, endIndex, totalCount);
    };
    
    function updatePaginationDisplay(start, end, total) {
        const startElement = document.getElementById('startIndex');
        const endElement = document.getElementById('endIndex');
        const totalElement = document.getElementById('totalCount');
        
        if (startElement) startElement.textContent = start;
        if (endElement) endElement.textContent = end;
        if (totalElement) totalElement.textContent = total;
        
        console.log(`📊 Pagination info: ${start}-${end} of ${total} items`);
    }
    
    // Add missing resetVariantFields if it doesn't exist
    if (typeof window.resetVariantFields !== 'function') {
        window.resetVariantFields = function() {
            const variants = [
                { checkbox: 'enable5ml', priceField: 'price5ml' },
                { checkbox: 'enable10ml', priceField: 'price10ml' },
                { checkbox: 'enable30ml', priceField: 'price30ml' },
                { checkbox: 'enableFullBottle', priceField: null }
            ];
            
            variants.forEach(({ checkbox, priceField }) => {
                const checkboxEl = document.getElementById(checkbox);
                const priceFieldEl = priceField ? document.getElementById(priceField) : null;
                
                if (checkboxEl) checkboxEl.checked = false;
                if (priceFieldEl) {
                    priceFieldEl.value = '';
                    priceFieldEl.disabled = true;
                }
            });
        };
        console.log('✅ Added resetVariantFields function');
    }
    
    // Add missing removeImagePreview if it doesn't exist
    if (typeof window.removeImagePreview !== 'function') {
        window.removeImagePreview = function() {
            const imagePreview = document.getElementById('imagePreview');
            const imageInput = document.getElementById('itemImage');
            
            if (imagePreview) imagePreview.style.display = 'none';
            if (imageInput) imageInput.value = '';
        };
        console.log('✅ Added removeImagePreview function');
    }
    
    // Add missing toggleVariantPrice if it doesn't exist
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
    
    // Add missing modal functions if they don't exist
    if (typeof window.showModal !== 'function') {
        window.showModal = function(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
                
                setTimeout(() => {
                    const firstInput = modal.querySelector('input[type="text"], textarea, select');
                    if (firstInput && !firstInput.disabled) firstInput.focus();
                }, 100);
            }
        };
        console.log('✅ Added showModal function');
    }
    
    if (typeof window.hideModal !== 'function') {
        window.hideModal = function(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        };
        console.log('✅ Added hideModal function');
    }
}

function addEnhancedFeatures() {
    
    // Items per page selector
    const itemsPerPageSelect = document.getElementById('itemsPerPageSelect');
    if (itemsPerPageSelect && !itemsPerPageSelect.hasAttribute('data-adapter-enhanced')) {
        itemsPerPageSelect.addEventListener('change', (e) => {
            const newItemsPerPage = parseInt(e.target.value);
            if (typeof itemsPerPage !== 'undefined' && newItemsPerPage !== itemsPerPage) {
                window.itemsPerPage = newItemsPerPage;
                currentPage = 1; // Reset to first page
                
                if (typeof applyFiltersAndPagination === 'function') {
                    applyFiltersAndPagination();
                }
                
                console.log(`📄 Items per page changed to: ${newItemsPerPage}`);
            }
        });
        itemsPerPageSelect.setAttribute('data-adapter-enhanced', 'true');
        console.log('✅ Items per page selector enhanced');
    }
    
    // Enhanced search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput && !searchInput.hasAttribute('data-adapter-enhanced')) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (typeof currentSearchTerm !== 'undefined') {
                    currentSearchTerm = e.target.value;
                    currentPage = 1; // Reset to first page on search
                    
                    if (typeof applyFiltersAndPagination === 'function') {
                        applyFiltersAndPagination();
                    }
                    
                    console.log(`🔍 Search term: "${e.target.value}"`);
                }
            }, 300);
        });
        searchInput.setAttribute('data-adapter-enhanced', 'true');
        console.log('✅ Search functionality enhanced');
    }
    
    // Enhanced filter functionality
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter && !statusFilter.hasAttribute('data-adapter-enhanced')) {
        statusFilter.addEventListener('change', (e) => {
            if (typeof currentFilter !== 'undefined') {
                currentFilter = e.target.value;
                currentPage = 1; // Reset to first page on filter change
                
                if (typeof applyFiltersAndPagination === 'function') {
                    applyFiltersAndPagination();
                }
                
                console.log(`🎯 Filter changed to: ${e.target.value}`);
            }
        });
        statusFilter.setAttribute('data-adapter-enhanced', 'true');
        console.log('✅ Filter functionality enhanced');
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
        
        // Arrow keys for pagination
        if (e.key === 'ArrowLeft' && e.ctrlKey) {
            e.preventDefault();
            const prevPage = currentPage - 1;
            if (prevPage >= 1) changePage(prevPage);
        }
        
        if (e.key === 'ArrowRight' && e.ctrlKey) {
            e.preventDefault();
            const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
            const nextPage = currentPage + 1;
            if (nextPage <= totalPages) changePage(nextPage);
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
    
    console.log('✅ Enhanced features added (keyboard shortcuts: Ctrl+N, Ctrl+←/→, Escape)');
}

// Debug function
function debugPaginationState() {
    const state = {
        variables: {
            items: typeof items !== 'undefined' ? items.length : 'undefined',
            filteredItems: typeof filteredItems !== 'undefined' ? filteredItems.length : 'undefined',
            currentPage: typeof currentPage !== 'undefined' ? currentPage : 'undefined',
            itemsPerPage: typeof itemsPerPage !== 'undefined' ? itemsPerPage : 'undefined'
        },
        elements: {
            paginationContainer: !!document.getElementById('paginationContainer'),
            startIndex: !!document.getElementById('startIndex'),
            endIndex: !!document.getElementById('endIndex'),
            totalCount: !!document.getElementById('totalCount'),
            itemsList: !!document.getElementById('itemsList')
        },
        functions: {
            applyFiltersAndPagination: typeof applyFiltersAndPagination,
            renderPagination: typeof renderPagination,
            changePage: typeof changePage,
            updatePaginationInfo: typeof updatePaginationInfo
        }
    };
    
    console.log('🔍 Pagination Debug State:', state);
    
    if (typeof filteredItems !== 'undefined' && filteredItems.length > 0) {
        const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
        console.log(`📄 Calculated total pages: ${totalPages}`);
    }
    
    return state;
}

// Make debug function available globally
window.debugPaginationState = debugPaginationState;

// Auto-debug after a delay
setTimeout(() => {
    debugPaginationState();
}, 2000);

console.log('✅ Items management adapter (pagination focused) loaded successfully');