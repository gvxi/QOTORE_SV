// Admin Items Management JavaScript

// Global variables
let fragrances = [];
let filteredFragrances = [];
let currentFilter = 'all';
let currentPage = 1;
let fragrancesPerPage = 10;
let searchTerm = '';
let currentEditingId = null;
let variantCounter = 0;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Admin Items Management Loading...');
    initializeApp();
});

async function initializeApp() {
    try {
        // Check authentication first
        if (!isAuthenticated()) {
            redirectToLogin();
            return;
        }
        
        // Load initial data
        await loadFragrances();
        
        // Set up event listeners
        setupEventListeners();
        
        console.log('✅ Admin Items Management Ready');
        showToast('Items management loaded successfully', 'success');
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        showToast('Failed to initialize items management', 'error');
    }
}

function isAuthenticated() {
    const cookies = document.cookie.split(';');
    return cookies.some(cookie => cookie.trim().startsWith('admin_session='));
}

function redirectToLogin() {
    showToast('Session expired. Redirecting to login...', 'warning');
    setTimeout(() => {
        window.location.href = '/login.html';
    }, 2000);
}

// Event Listeners
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('fragrancesSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
        searchInput.addEventListener('input', function() {
            const clearBtn = document.getElementById('fragrancesClearSearch');
            if (clearBtn) {
                clearBtn.style.display = this.value.length > 0 ? 'block' : 'none';
            }
        });
    }
    
    // Clear search button
    const clearSearchBtn = document.getElementById('fragrancesClearSearch');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearFragrancesSearch);
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => refreshData());
    }
    
    // Items per page dropdown
    const itemsPerPageSelect = document.getElementById('fragrancesPerPage');
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', function() {
            fragrancesPerPage = parseInt(this.value);
            currentPage = 1;
            applyFiltersAndPagination();
        });
    }
    
    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;
            if (filter !== currentFilter) {
                // Update active state
                filterButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Apply filter
                currentFilter = filter;
                currentPage = 1;
                applyFiltersAndPagination();
            }
        });
    });
    
    // Form submission
    const fragranceForm = document.getElementById('fragranceForm');
    if (fragranceForm) {
        fragranceForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Modal close on background click
    const modal = document.getElementById('fragranceModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeFragranceModal();
            }
        });
    }
}

function handleSearch(event) {
    searchTerm = event.target.value.toLowerCase().trim();
    console.log('🔍 Searching:', searchTerm);
    currentPage = 1;
    applyFiltersAndPagination();
}

function clearFragrancesSearch() {
    const searchInput = document.getElementById('fragrancesSearch');
    const clearBtn = document.getElementById('fragrancesClearSearch');
    
    if (searchInput) {
        searchInput.value = '';
        searchTerm = '';
        clearBtn.style.display = 'none';
        currentPage = 1;
        applyFiltersAndPagination();
    }
}

// Data Loading Functions
async function loadFragrances() {
    console.log('📊 Loading fragrances...');
    showLoadingState();
    
    try {
        const response = await fetch('/admin/fragrances', {
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                redirectToLogin();
                return;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
            fragrances = result.data;
            console.log(`✅ Loaded ${fragrances.length} fragrances`);
            
            updateStats(result.stats);
            applyFiltersAndPagination();
            showFragrancesContent();
        } else {
            throw new Error(result.error || 'Failed to load fragrances');
        }
        
    } catch (error) {
        console.error('❌ Failed to load fragrances:', error);
        showErrorState();
        showToast('Failed to load fragrances: ' + error.message, 'error');
    }
}

async function refreshData() {
    console.log('🔄 Refreshing fragrances data...');
    
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.classList.add('refreshing');
    }
    
    try {
        await loadFragrances();
        showToast('Fragrances data refreshed successfully', 'success');
    } catch (error) {
        showToast('Failed to refresh fragrances data', 'error');
    } finally {
        if (refreshBtn) {
            refreshBtn.classList.remove('refreshing');
        }
    }
}

// UI State Management
function showLoadingState() {
    document.getElementById('fragrancesLoading').style.display = 'block';
    document.getElementById('fragrancesContent').style.display = 'none';
    document.getElementById('fragrancesEmpty').style.display = 'none';
    document.getElementById('fragrancesNoResults').style.display = 'none';
    document.getElementById('fragrancesError').style.display = 'none';
    document.getElementById('fragrancesControls').style.display = 'none';
}

function showFragrancesContent() {
    document.getElementById('fragrancesLoading').style.display = 'none';
    document.getElementById('fragrancesContent').style.display = 'block';
    document.getElementById('fragrancesEmpty').style.display = 'none';
    document.getElementById('fragrancesNoResults').style.display = 'none';
    document.getElementById('fragrancesError').style.display = 'none';
    document.getElementById('fragrancesControls').style.display = 'flex';
}

function showEmptyState() {
    document.getElementById('fragrancesLoading').style.display = 'none';
    document.getElementById('fragrancesContent').style.display = 'none';
    document.getElementById('fragrancesEmpty').style.display = 'block';
    document.getElementById('fragrancesNoResults').style.display = 'none';
    document.getElementById('fragrancesError').style.display = 'none';
    document.getElementById('fragrancesControls').style.display = 'none';
}

function showNoResultsState() {
    document.getElementById('fragrancesLoading').style.display = 'none';
    document.getElementById('fragrancesContent').style.display = 'none';
    document.getElementById('fragrancesEmpty').style.display = 'none';
    document.getElementById('fragrancesNoResults').style.display = 'block';
    document.getElementById('fragrancesError').style.display = 'none';
    document.getElementById('fragrancesControls').style.display = 'flex';
}

function showErrorState() {
    document.getElementById('fragrancesLoading').style.display = 'none';
    document.getElementById('fragrancesContent').style.display = 'none';
    document.getElementById('fragrancesEmpty').style.display = 'none';
    document.getElementById('fragrancesNoResults').style.display = 'none';
    document.getElementById('fragrancesError').style.display = 'block';
    document.getElementById('fragrancesControls').style.display = 'none';
}

function updateStats(stats) {
    if (stats) {
        document.getElementById('totalFragrances').textContent = stats.total || fragrances.length;
        document.getElementById('visibleFragrances').textContent = stats.visible || fragrances.filter(f => !f.hidden).length;
        document.getElementById('hiddenFragrances').textContent = stats.hidden || fragrances.filter(f => f.hidden).length;
        document.getElementById('featuredFragrances').textContent = stats.featured || fragrances.filter(f => f.featured).length;
    } else {
        // Calculate from fragrances data
        const visible = fragrances.filter(f => !f.hidden).length;
        const hidden = fragrances.filter(f => f.hidden).length;
        const featured = fragrances.filter(f => f.featured).length;
        
        document.getElementById('totalFragrances').textContent = fragrances.length;
        document.getElementById('visibleFragrances').textContent = visible;
        document.getElementById('hiddenFragrances').textContent = hidden;
        document.getElementById('featuredFragrances').textContent = featured;
    }
}

// Filtering and Pagination
function applyFiltersAndPagination() {
    console.log(`🔧 Applying filters: ${currentFilter}, search: "${searchTerm}"`);
    
    // Start with all fragrances
    filteredFragrances = [...fragrances];
    
    // Apply search filter
    if (searchTerm) {
        filteredFragrances = filteredFragrances.filter(fragrance => {
            const searchFields = [
                fragrance.name,
                fragrance.brand,
                fragrance.description
            ].filter(field => field).join(' ').toLowerCase();
            
            return searchFields.includes(searchTerm);
        });
    }
    
    // Apply status filter
    if (currentFilter !== 'all') {
        filteredFragrances = filteredFragrances.filter(fragrance => {
            switch (currentFilter) {
                case 'visible': return !fragrance.hidden;
                case 'hidden': return fragrance.hidden;
                default: return true;
            }
        });
    }
    
    console.log(`📋 Filtered to ${filteredFragrances.length} fragrances`);
    
    // Handle empty results
    if (filteredFragrances.length === 0) {
        if (fragrances.length === 0) {
            showEmptyState();
        } else {
            showNoResultsState();
        }
        return;
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredFragrances.length / fragrancesPerPage);
    const startIndex = (currentPage - 1) * fragrancesPerPage;
    const endIndex = Math.min(startIndex + fragrancesPerPage, filteredFragrances.length);
    
    // Get current page fragrances
    const currentPageFragrances = filteredFragrances.slice(startIndex, endIndex);
    
    // Update UI
    renderFragrancesTable(currentPageFragrances);
    updatePaginationInfo(startIndex + 1, endIndex, filteredFragrances.length, totalPages);
    generatePaginationControls(totalPages);
    
    showFragrancesContent();
}

function renderFragrancesTable(fragrances) {
    const tbody = document.querySelector('#fragrancesTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    fragrances.forEach(fragrance => {
        const row = createFragranceRow(fragrance);
        tbody.appendChild(row);
    });
}

function createFragranceRow(fragrance) {
    const row = document.createElement('tr');
    row.className = 'fragrance-row';
    
    const variants = (fragrance.variants || []).map(v => 
        `${v.size} ($${parseFloat(v.price).toFixed(2)})`
    ).join(', ') || 'No variants';
    
    row.innerHTML = `
        <td class="fragrance-name">
            <div class="item-info">
                ${fragrance.image ? `<img src="${fragrance.image}" alt="${fragrance.name}" class="item-thumbnail">` : '<div class="no-image">No Image</div>'}
                <div>
                    <div class="name">${fragrance.name}</div>
                    ${fragrance.brand ? `<div class="brand">${fragrance.brand}</div>` : ''}
                </div>
            </div>
        </td>
        <td class="fragrance-brand">${fragrance.brand || '-'}</td>
        <td class="fragrance-description">
            <div class="description-text">${fragrance.description || 'No description'}</div>
        </td>
        <td class="fragrance-variants">
            <div class="variants-list">${variants}</div>
        </td>
        <td class="fragrance-status">
            <span class="status-badge status-${fragrance.hidden ? 'hidden' : 'visible'}">
                ${fragrance.hidden ? 'Hidden' : 'Visible'}
            </span>
        </td>
        <td class="fragrance-date">${formatDate(fragrance.created_at)}</td>
        <td class="fragrance-actions">
            <div class="action-buttons">
                <button class="btn btn-sm btn-outline" onclick="editFragrance('${fragrance.id}')" title="Edit">
                    <i class="icon-edit"></i>
                </button>
                <button class="btn btn-sm btn-${fragrance.hidden ? 'success' : 'warning'}" 
                        onclick="toggleFragranceVisibility('${fragrance.id}', ${!fragrance.hidden})" 
                        title="${fragrance.hidden ? 'Show' : 'Hide'}">
                    <i class="icon-${fragrance.hidden ? 'eye' : 'eye-off'}"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteFragrance('${fragrance.id}')" title="Delete">
                    <i class="icon-trash"></i>
                </button>
            </div>
        </td>
    `;
    
    return row;
}

function updatePaginationInfo(start, end, total, totalPages) {
    const infoEl = document.getElementById('fragrancesInfo');
    if (infoEl) {
        infoEl.textContent = `Showing ${start}-${end} of ${total} items (Page ${currentPage} of ${totalPages})`;
    }
}

function generatePaginationControls(totalPages) {
    const container = document.getElementById('fragrancesPagination');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = `btn btn-outline ${currentPage === 1 ? 'disabled' : ''}`;
    prevBtn.innerHTML = '<i class="icon-chevron-left"></i> Previous';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => goToPage(currentPage - 1);
    container.appendChild(prevBtn);
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        const firstBtn = createPageButton(1);
        container.appendChild(firstBtn);
        
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            container.appendChild(ellipsis);
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = createPageButton(i, i === currentPage);
        container.appendChild(pageBtn);
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            container.appendChild(ellipsis);
        }
        
        const lastBtn = createPageButton(totalPages);
        container.appendChild(lastBtn);
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = `btn btn-outline ${currentPage === totalPages ? 'disabled' : ''}`;
    nextBtn.innerHTML = 'Next <i class="icon-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => goToPage(currentPage + 1);
    container.appendChild(nextBtn);
}

function createPageButton(pageNumber, isActive = false) {
    const btn = document.createElement('button');
    btn.className = `btn ${isActive ? 'btn-primary' : 'btn-outline'}`;
    btn.textContent = pageNumber;
    btn.onclick = () => goToPage(pageNumber);
    return btn;
}

function goToPage(page) {
    const totalPages = Math.ceil(filteredFragrances.length / fragrancesPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        applyFiltersAndPagination();
    }
}

// Modal Functions
function openAddFragranceModal() {
    currentEditingId = null;
    document.getElementById('fragranceModalTitle').textContent = 'Add New Fragrance';
    document.getElementById('saveFragranceBtn').innerHTML = '<i class="icon-save"></i> Save Fragrance';
    resetForm();
    document.getElementById('fragranceModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function editFragrance(id) {
    const fragrance = fragrances.find(f => f.id === id);
    if (!fragrance) return;
    
    currentEditingId = id;
    document.getElementById('fragranceModalTitle').textContent = 'Edit Fragrance';
    document.getElementById('saveFragranceBtn').innerHTML = '<i class="icon-save"></i> Update Fragrance';
    
    // Populate form
    document.getElementById('fragranceName').value = fragrance.name || '';
    document.getElementById('fragranceBrand').value = fragrance.brand || '';
    document.getElementById('fragranceDescription').value = fragrance.description || '';
    document.getElementById('fragranceImage').value = fragrance.image || '';
    
    // Set visibility radio
    const visibilityRadio = document.querySelector(`input[name="visible"][value="${!fragrance.hidden}"]`);
    if (visibilityRadio) {
        visibilityRadio.checked = true;
    }
    
    // Populate variants
    populateVariants(fragrance.variants || []);
    
    document.getElementById('fragranceModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeFragranceModal() {
    document.getElementById('fragranceModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    resetForm();
}

function resetForm() {
    document.getElementById('fragranceForm').reset();
    // Reset variants to single empty variant
    const variantsSection = document.getElementById('variantsSection');
    variantsSection.innerHTML = `
        <div class="variant-item" data-variant-id="0">
            <div class="variant-inputs">
                <input type="text" class="variant-size" placeholder="Size (e.g., 5ml, 10ml)" required>
                <input type="number" class="variant-price" placeholder="Price" step="0.01" min="0" required>
                <button type="button" class="btn btn-danger btn-sm" onclick="removeVariant(0)">
                    <i class="icon-trash"></i>
                </button>
            </div>
        </div>
    `;
    variantCounter = 0;
}

function populateVariants(variants) {
    const variantsSection = document.getElementById('variantsSection');
    variantsSection.innerHTML = '';
    
    if (variants.length === 0) {
        variants = [{ size: '', price: '' }]; // Add empty variant
    }
    
    variants.forEach((variant, index) => {
        const variantDiv = document.createElement('div');
        variantDiv.className = 'variant-item';
        variantDiv.setAttribute('data-variant-id', index);
        variantDiv.innerHTML = `
            <div class="variant-inputs">
                <input type="text" class="variant-size" placeholder="Size (e.g., 5ml, 10ml)" value="${variant.size || ''}" required>
                <input type="number" class="variant-price" placeholder="Price" step="0.01" min="0" value="${variant.price || ''}" required>
                <button type="button" class="btn btn-danger btn-sm" onclick="removeVariant(${index})">
                    <i class="icon-trash"></i>
                </button>
            </div>
        `;
        variantsSection.appendChild(variantDiv);
    });
    
    variantCounter = variants.length - 1;
}

function addVariant() {
    variantCounter++;
    const variantsSection = document.getElementById('variantsSection');
    const variantDiv = document.createElement('div');
    variantDiv.className = 'variant-item';
    variantDiv.setAttribute('data-variant-id', variantCounter);
    variantDiv.innerHTML = `
        <div class="variant-inputs">
            <input type="text" class="variant-size" placeholder="Size (e.g., 5ml, 10ml)" required>
            <input type="number" class="variant-price" placeholder="Price" step="0.01" min="0" required>
            <button type="button" class="btn btn-danger btn-sm" onclick="removeVariant(${variantCounter})">
                <i class="icon-trash"></i>
            </button>
        </div>
    `;
    variantsSection.appendChild(variantDiv);
}

function removeVariant(variantId) {
    const variantsSection = document.getElementById('variantsSection');
    const variantItems = variantsSection.querySelectorAll('.variant-item');
    
    // Don't allow removing if only one variant remains
    if (variantItems.length <= 1) {
        showToast('At least one variant is required', 'warning');
        return;
    }
    
    const variantToRemove = document.querySelector(`[data-variant-id="${variantId}"]`);
    if (variantToRemove) {
        variantToRemove.remove();
    }
}

// Form Handling
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('saveFragranceBtn');
    const originalText = submitBtn.innerHTML;
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="icon-loader"></i> Saving...';
        
        const formData = collectFormData();
        
        if (currentEditingId) {
            await updateFragrance(currentEditingId, formData);
        } else {
            await createFragrance(formData);
        }
        
        closeFragranceModal();
        await refreshData();
        
    } catch (error) {
        console.error('❌ Form submission failed:', error);
        showToast('Failed to save fragrance: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

function collectFormData() {
    const form = document.getElementById('fragranceForm');
    const formData = new FormData(form);
    
    // Collect variants
    const variants = [];
    const variantItems = document.querySelectorAll('.variant-item');
    
    variantItems.forEach(item => {
        const size = item.querySelector('.variant-size').value.trim();
        const price = parseFloat(item.querySelector('.variant-price').value);
        
        if (size && price > 0) {
            variants.push({ size, price });
        }
    });
    
    return {
        name: formData.get('name').trim(),
        brand: formData.get('brand')?.trim() || null,
        description: formData.get('description')?.trim() || null,
        image: formData.get('image')?.trim() || null,
        visible: formData.get('visible') === 'true',
        variants: variants
    };
}

async function createFragrance(data) {
    const response = await fetch('/admin/fragrances', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(data)
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
        throw new Error(result.error || 'Failed to create fragrance');
    }
    
    showToast('Fragrance created successfully', 'success');
}

async function updateFragrance(id, data) {
    const response = await fetch(`/admin/fragrances/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(data)
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
        throw new Error(result.error || 'Failed to update fragrance');
    }
    
    showToast('Fragrance updated successfully', 'success');
}

// Fragrance Management Functions
async function toggleFragranceVisibility(id, hidden) {
    try {
        const response = await fetch(`/admin/fragrances/${id}/visibility`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ hidden })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`Fragrance ${hidden ? 'hidden' : 'shown'} successfully`, 'success');
            await refreshData();
        } else {
            throw new Error(result.error || 'Failed to toggle visibility');
        }
        
    } catch (error) {
        console.error('❌ Failed to toggle visibility:', error);
        showToast('Failed to update visibility: ' + error.message, 'error');
    }
}

async function deleteFragrance(id) {
    if (!confirm('Are you sure you want to delete this fragrance? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/admin/fragrances/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Fragrance deleted successfully', 'success');
            await refreshData();
        } else {
            throw new Error(result.error || 'Failed to delete fragrance');
        }
        
    } catch (error) {
        console.error('❌ Failed to delete fragrance:', error);
        showToast('Failed to delete fragrance: ' + error.message, 'error');
    }
}

// Utility Functions
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

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showToast(message, type = 'info') {
    // Create toast if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="toast-icon icon-${getToastIcon(type)}"></i>
            <span class="toast-message">${message}</span>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="icon-x"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

function getToastIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'x-circle',
        warning: 'alert-triangle',
        info: 'info'
    };
    return icons[type] || 'info';
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear session
        document.cookie = 'admin_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        
        // Redirect to login
        window.location.href = '/login.html';
    }
}

// Export functions for global access
window.openAddFragranceModal = openAddFragranceModal;
window.editFragrance = editFragrance;
window.closeFragranceModal = closeFragranceModal;
window.addVariant = addVariant;
window.removeVariant = removeVariant;
window.toggleFragranceVisibility = toggleFragranceVisibility;
window.deleteFragrance = deleteFragrance;
window.clearFragrancesSearch = clearFragrancesSearch;
window.goToPage = goToPage;
window.refreshData = refreshData;
window.logout = logout;