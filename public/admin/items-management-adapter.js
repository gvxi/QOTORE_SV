// Pagination Only Adapter - ONLY handles pagination, nothing else
// All other functionality is handled by the main script

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Pagination-only adapter loaded');
    
    // Wait for main script to load
    setTimeout(() => {
        initializePaginationOnly();
    }, 1000);
});

function initializePaginationOnly() {
    console.log('🔧 Initializing pagination-only adapter...');
    
    // ONLY override pagination functions
    overridePaginationOnly();
    
    console.log('✅ Pagination-only adapter complete');
}

function overridePaginationOnly() {
    
    // Override ONLY renderPagination function
    window.renderPagination = function(totalPages) {
        console.log(`📄 Pagination adapter: renderPagination called with ${totalPages} pages`);
        
        const paginationContainer = document.getElementById('paginationContainer');
        if (!paginationContainer) {
            console.warn('❌ paginationContainer not found');
            return;
        }
        
        // Update pagination info display
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
    
    // Override ONLY changePage function  
    window.changePage = function(page) {
        console.log(`📄 Pagination adapter: changePage called with page ${page}`);
        
        // Validation
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
        console.log(`📄 Changed to page ${page} of ${totalPages}`);
        
        // Call main script's pagination function
        if (typeof applyFiltersAndPagination === 'function') {
            applyFiltersAndPagination();
        }
        
        // Smooth scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    // Add ONLY the pagination info update function
    window.updatePaginationInfo = function() {
        console.log('📊 Updating pagination info...');
        
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
        
        console.log(`📊 Pagination info: Showing ${start} to ${end} of ${total} items`);
    }
    
    console.log('✅ Pagination functions overridden');
}

// Debug function for pagination only
function debugPagination() {
    const state = {
        currentPage: typeof currentPage !== 'undefined' ? currentPage : 'undefined',
        itemsPerPage: typeof itemsPerPage !== 'undefined' ? itemsPerPage : 'undefined',
        filteredItems: typeof filteredItems !== 'undefined' ? filteredItems.length : 'undefined',
        totalPages: typeof filteredItems !== 'undefined' && typeof itemsPerPage !== 'undefined' ? 
                   Math.ceil(filteredItems.length / itemsPerPage) : 'cannot calculate',
        paginationContainer: !!document.getElementById('paginationContainer'),
        paginationInfo: {
            startIndex: !!document.getElementById('startIndex'),
            endIndex: !!document.getElementById('endIndex'),
            totalCount: !!document.getElementById('totalCount')
        }
    };
    
    console.log('🔍 Pagination Debug:', state);
    return state;
}

// Make debug available globally
window.debugPagination = debugPagination;

// Auto-debug after initialization
setTimeout(() => {
    debugPagination();
}, 3000);

console.log('✅ Pagination-only adapter loaded successfully');