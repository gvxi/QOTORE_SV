// Pagination Only Adapter - FULLY handles pagination
// Main script only handles data loading and rendering

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Pagination-only adapter loaded');
    
    // Wait for main script to load
    setTimeout(() => {
        initializePaginationOnly();
    }, 500);
});

function initializePaginationOnly() {
    console.log('🔧 Initializing pagination-only adapter...');
    
    // Override pagination functions
    overridePaginationOnly();
    
    // Set up event listeners for pagination controls
    setupPaginationControls();
    
    console.log('✅ Pagination-only adapter complete');
}

function overridePaginationOnly() {
    
    // Override renderPagination function
    window.renderPagination = function(totalPages) {
        console.log(`📄 Adapter: renderPagination called with ${totalPages} pages`);
        console.log(`📄 Current state: page ${currentPage}, ${filteredItems ? filteredItems.length : 0} filtered items`);
        
        const paginationContainer = document.getElementById('paginationContainer');
        if (!paginationContainer) {
            console.warn('❌ paginationContainer not found');
            return;
        }
        
        // Update pagination info display FIRST
        updatePaginationInfo();
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        // Previous button
        const prevDisabled = currentPage <= 1;
        paginationHTML += `
            <button class="pagination-btn ${prevDisabled ? 'disabled' : ''}" 
                    onclick="changePage(${currentPage - 1})" 
                    ${prevDisabled ? 'disabled' : ''}>
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
        const nextDisabled = currentPage >= totalPages;
        paginationHTML += `
            <button class="pagination-btn ${nextDisabled ? 'disabled' : ''}" 
                    onclick="changePage(${currentPage + 1})" 
                    ${nextDisabled ? 'disabled' : ''}>
                Next
            </button>
        `;
        
        paginationContainer.innerHTML = paginationHTML;
        console.log(`✅ Pagination rendered: Page ${currentPage} of ${totalPages}`);
    };
    
    // Override changePage function  
    window.changePage = function(page) {
        console.log(`📄 Adapter: changePage called with page ${page}`);
        
        // Validation
        if (!filteredItems || filteredItems.length === 0) {
            console.warn('❌ No filtered items available for pagination');
            updatePaginationInfo(); // Update to show 0 items
            return;
        }
        
        const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
        
        if (page < 1 || page > totalPages) {
            console.warn(`❌ Invalid page: ${page}. Valid range: 1-${totalPages}`);
            return;
        }
        
        // Update current page
        currentPage = page;
        console.log(`📄 Changed to page ${page} of ${totalPages}`);
        
        // Call main script's pagination function
        if (typeof applyFiltersAndPagination === 'function') {
            applyFiltersAndPagination();
        }
        
        // Smooth scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    // Add the pagination info update function
    window.updatePaginationInfo = function() {
        console.log('📊 Adapter: Updating pagination info...');
        
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
        
        console.log(`📊 Pagination info updated: Showing ${start} to ${end} of ${total} items`);
    }
    
    console.log('✅ Pagination functions overridden');
}

function setupPaginationControls() {
    
    // Items per page selector
    const itemsPerPageSelect = document.getElementById('itemsPerPageSelect');
    if (itemsPerPageSelect && !itemsPerPageSelect.hasAttribute('data-pagination-enhanced')) {
        itemsPerPageSelect.addEventListener('change', (e) => {
            const newItemsPerPage = parseInt(e.target.value);
            if (typeof itemsPerPage !== 'undefined' && newItemsPerPage !== itemsPerPage) {
                window.itemsPerPage = newItemsPerPage;
                currentPage = 1; // Reset to first page
                
                console.log(`📄 Items per page changed to: ${newItemsPerPage}`);
                
                if (typeof applyFiltersAndPagination === 'function') {
                    applyFiltersAndPagination();
                }
            }
        });
        itemsPerPageSelect.setAttribute('data-pagination-enhanced', 'true');
        console.log('✅ Items per page selector connected');
    }
    
    // Enhanced search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput && !searchInput.hasAttribute('data-pagination-enhanced')) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (typeof currentSearchTerm !== 'undefined') {
                    currentSearchTerm = e.target.value;
                    currentPage = 1; // Reset to first page on search
                    
                    console.log(`🔍 Search changed, resetting to page 1`);
                    
                    if (typeof applyFiltersAndPagination === 'function') {
                        applyFiltersAndPagination();
                    }
                }
            }, 300);
        });
        searchInput.setAttribute('data-pagination-enhanced', 'true');
        console.log('✅ Search input connected');
    }
    
    // Enhanced filter functionality
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter && !statusFilter.hasAttribute('data-pagination-enhanced')) {
        statusFilter.addEventListener('change', (e) => {
            if (typeof currentFilter !== 'undefined') {
                currentFilter = e.target.value;
                currentPage = 1; // Reset to first page on filter change
                
                console.log(`🎯 Filter changed, resetting to page 1`);
                
                if (typeof applyFiltersAndPagination === 'function') {
                    applyFiltersAndPagination();
                }
            }
        });
        statusFilter.setAttribute('data-pagination-enhanced', 'true');
        console.log('✅ Status filter connected');
    }
    
    // Keyboard shortcuts for pagination
    document.addEventListener('keydown', function(e) {
        // Ctrl + Arrow keys for pagination
        if (e.ctrlKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            e.preventDefault();
            
            if (!filteredItems || filteredItems.length === 0) return;
            
            const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
            
            if (e.key === 'ArrowLeft' && currentPage > 1) {
                changePage(currentPage - 1);
            } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
                changePage(currentPage + 1);
            }
        }
    });
    
    console.log('✅ Pagination controls and shortcuts connected');
}

// Debug function for pagination only
function debugPagination() {
    const state = {
        variables: {
            currentPage: typeof currentPage !== 'undefined' ? currentPage : 'undefined',
            itemsPerPage: typeof itemsPerPage !== 'undefined' ? itemsPerPage : 'undefined',
            items: typeof items !== 'undefined' ? items.length : 'undefined',
            filteredItems: typeof filteredItems !== 'undefined' ? filteredItems.length : 'undefined',
            currentSearchTerm: typeof currentSearchTerm !== 'undefined' ? currentSearchTerm : 'undefined',
            currentFilter: typeof currentFilter !== 'undefined' ? currentFilter : 'undefined'
        },
        calculated: {
            totalPages: typeof filteredItems !== 'undefined' && typeof itemsPerPage !== 'undefined' ? 
                       Math.ceil(filteredItems.length / itemsPerPage) : 'cannot calculate',
            startIndex: typeof currentPage !== 'undefined' && typeof itemsPerPage !== 'undefined' ?
                       (currentPage - 1) * itemsPerPage + 1 : 'cannot calculate',
            endIndex: typeof currentPage !== 'undefined' && typeof itemsPerPage !== 'undefined' && typeof filteredItems !== 'undefined' ?
                     Math.min(currentPage * itemsPerPage, filteredItems.length) : 'cannot calculate'
        },
        elements: {
            paginationContainer: !!document.getElementById('paginationContainer'),
            startIndex: !!document.getElementById('startIndex'),
            endIndex: !!document.getElementById('endIndex'),
            totalCount: !!document.getElementById('totalCount'),
            itemsPerPageSelect: !!document.getElementById('itemsPerPageSelect'),
            searchInput: !!document.getElementById('searchInput'),
            statusFilter: !!document.getElementById('statusFilter')
        },
        functions: {
            applyFiltersAndPagination: typeof applyFiltersAndPagination,
            renderPagination: typeof renderPagination,
            changePage: typeof changePage,
            updatePaginationInfo: typeof updatePaginationInfo
        }
    };
    
    console.log('🔍 Pagination Debug:', state);
    return state;
}

// Make debug available globally
window.debugPagination = debugPagination;

// Force update pagination on initial load
setTimeout(() => {
    console.log('🔄 Adapter: Forcing initial pagination update...');
    if (typeof updatePaginationInfo === 'function') {
        updatePaginationInfo();
    }
    debugPagination();
}, 2000);

console.log('✅ Pagination-only adapter loaded successfully');