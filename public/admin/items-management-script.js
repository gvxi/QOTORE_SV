// Admin Items Management JavaScript

// Global variables
let items = [];
let filteredItems = [];
let currentFilter = 'all';
let currentPage = 1;
let itemsPerPage = 10;
let searchTerm = '';
let currentEditingId = null;
let deleteItemId = null;

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
        await loadItems();
        
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
    const searchInput = document.getElementById('itemsSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
        searchInput.addEventListener('input', function() {
            const clearBtn = document.getElementById('itemsClearSearch');
            if (clearBtn) {
                clearBtn.style.display = this.value.length > 0 ? 'block' : 'none';
            }
        });
    }

    // Image preview
    const imageInput = document.getElementById('itemImage');
    if (imageInput) {
        imageInput.addEventListener('change', handleImagePreview);
    }

    // Form validation
    const form = document.getElementById('itemForm');
    if (form) {
        form.addEventListener('input', validateForm);
    }

    // Modal overlay clicks
    document.getElementById('itemModalOverlay')?.addEventListener('click', function(e) {
        if (e.target === this) closeItemModal();
    });

    document.getElementById('deleteModalOverlay')?.addEventListener('click', function(e) {
        if (e.target === this) closeDeleteModal();
    });

    // Escape key to close modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeItemModal();
            closeDeleteModal();
        }
    });
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
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function formatPrice(price) {
    return typeof price === 'number' ? `${price.toFixed(3)} OMR` : 'N/A';
}

// Data Loading Functions
async function loadItems() {
    console.log('📦 Loading items...');
    showLoading();
    
    try {
        const response = await fetch('/admin/fragrances', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 401) {
                redirectToLogin();
                return;
            }
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && Array.isArray(data.data)) {
            items = data.data.map(item => ({
                id: item.id,
                name: item.name,
                slug: item.slug,
                description: item.description,
                image_path: item.image_path,
                brand: item.brand,
                hidden: item.hidden,
                created_at: item.created_at,
                updated_at: item.updated_at,
                variants: item.variants || []
            }));
            
            console.log(`✅ Loaded ${items.length} items`);
            updateDashboardStats();
            applyFiltersAndPagination();
        } else {
            throw new Error('Invalid data format received');
        }
        
    } catch (error) {
        console.error('❌ Failed to load items:', error);
        showError();
        showToast('Failed to load items: ' + error.message, 'error');
    }
}

async function refreshData() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.classList.add('refreshing');
    }
    
    try {
        await loadItems();
        showToast('Items refreshed successfully', 'success');
    } catch (error) {
        showToast('Failed to refresh items', 'error');
    } finally {
        if (refreshBtn) {
            refreshBtn.classList.remove('refreshing');
        }
    }
}

// Stats Functions
function updateDashboardStats() {
    const totalItems = items.length;
    const visibleItems = items.filter(item => !item.hidden).length;
    const hiddenItems = items.filter(item => item.hidden).length;
    const totalBrands = new Set(items.map(item => item.brand).filter(brand => brand)).size;
    
    document.getElementById('totalItemsCount').textContent = totalItems;
    document.getElementById('visibleItemsCount').textContent = visibleItems;
    document.getElementById('hiddenItemsCount').textContent = hiddenItems;
    document.getElementById('totalBrandsCount').textContent = totalBrands;
}

// Search and Filter Functions
function handleSearch() {
    const searchInput = document.getElementById('itemsSearch');
    searchTerm = searchInput?.value?.trim().toLowerCase() || '';
    
    const clearBtn = document.getElementById('itemsClearSearch');
    if (clearBtn) {
        clearBtn.style.display = searchTerm.length > 0 ? 'block' : 'none';
    }
    
    currentPage = 1;
    applyFiltersAndPagination();
}

function clearSearch() {
    const searchInput = document.getElementById('itemsSearch');
    if (searchInput) {
        searchInput.value = '';
        searchTerm = '';
    }
    
    const clearBtn = document.getElementById('itemsClearSearch');
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    
    currentPage = 1;
    applyFiltersAndPagination();
}

function setFilter(filter) {
    currentFilter = filter;
    currentPage = 1;
    
    // Update filter button styles
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`)?.classList.add('active');
    
    applyFiltersAndPagination();
}

// Display Functions
function applyFiltersAndPagination() {
    console.log(`🔍 Applying filters and pagination...`);
    
    // Start with all items
    filteredItems = [...items];
    
    // Apply search filter
    if (searchTerm) {
        filteredItems = filteredItems.filter(item => {
            const searchableText = `${item.name} ${item.brand} ${item.description}`.toLowerCase();
            return searchableText.includes(searchTerm);
        });
    }
    
    // Apply status filter
    if (currentFilter !== 'all') {
        filteredItems = filteredItems.filter(item => {
            switch (currentFilter) {
                case 'visible': return !item.hidden;
                case 'hidden': return item.hidden;
                default: return true;
            }
        });
    }
    
    console.log(`📋 Filtered to ${filteredItems.length} items`);
    
    // Handle empty results
    if (filteredItems.length === 0) {
        if (items.length === 0) {
            showEmptyState();
        } else {
            showNoResultsState();
        }
        return;
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredItems.length);
    
    // Get current page items
    const currentPageItems = filteredItems.slice(startIndex, endIndex);
    
    // Update UI
    renderItemsTable(currentPageItems);
    renderMobileCards(currentPageItems);
    updatePaginationInfo(startIndex + 1, endIndex, filteredItems.length, totalPages);
    
    showItemsContent();
}

function renderItemsTable(items) {
    const tbody = document.querySelector('#itemsTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    items.forEach(item => {
        const row = createItemRow(item);
        tbody.appendChild(row);
    });
}

function createItemRow(item) {
    const row = document.createElement('tr');
    row.className = 'item-row';
    
    const variants = getVariantsDisplay(item.variants);
    const imageUrl = item.image_path ? `/storage/fragrance-images/${item.image_path}` : null;
    
    row.innerHTML = `
        <td class="item-info-cell">
            <div class="item-info">
                ${imageUrl ? 
                    `<img src="${imageUrl}" alt="${item.name}" class="item-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                     <div class="no-image" style="display: none;">No Image</div>` : 
                    `<div class="no-image">No Image</div>`
                }
                <div class="item-details">
                    <div class="item-name">${escapeHtml(item.name)}</div>
                    <div class="item-brand">${escapeHtml(item.brand || 'No Brand')}</div>
                </div>
            </div>
        </td>
        <td class="description-cell" title="${escapeHtml(item.description)}">
            ${escapeHtml(item.description)}
        </td>
        <td class="variants-cell">
            ${variants}
        </td>
        <td class="status-cell">
            <span class="status-badge ${item.hidden ? 'status-hidden' : 'status-visible'}">
                ${item.hidden ? 'Hidden' : 'Visible'}
            </span>
        </td>
        <td class="date-cell">
            ${formatDate(item.created_at)}
        </td>
        <td class="actions-cell">
            <div class="action-buttons">
                <button class="btn-small btn-edit" onclick="editItem('${item.id}')" title="Edit Item">
                    Edit
                </button>
                <button class="btn-small ${item.hidden ? 'btn-show' : 'btn-hide'}" 
                        onclick="toggleItemVisibility('${item.id}', ${!item.hidden})" 
                        title="${item.hidden ? 'Show Item' : 'Hide Item'}">
                    ${item.hidden ? 'Show' : 'Hide'}
                </button>
                <button class="btn-small btn-delete" onclick="deleteItem('${item.id}')" title="Delete Item">
                    Delete
                </button>
            </div>
        </td>
    `;
    
    return row;
}

function renderMobileCards(items) {
    const container = document.getElementById('itemCards');
    if (!container) return;
    
    container.innerHTML = '';
    
    items.forEach(item => {
        const card = createMobileCard(item);
        container.appendChild(card);
    });
}

function createMobileCard(item) {
    const card = document.createElement('div');
    card.className = 'mobile-card';
    
    const variants = getVariantsDisplay(item.variants);
    const imageUrl = item.image_path ? `/storage/fragrance-images/${item.image_path}` : null;
    
    card.innerHTML = `
        <div class="mobile-card-header">
            <div class="mobile-card-info">
                <h4 class="item-name">${escapeHtml(item.name)}</h4>
                <p class="item-brand">${escapeHtml(item.brand || 'No Brand')}</p>
            </div>
            <span class="status-badge ${item.hidden ? 'status-hidden' : 'status-visible'}">
                ${item.hidden ? 'Hidden' : 'Visible'}
            </span>
        </div>
        <div class="mobile-card-body">
            <div>
                <strong>Description</strong>
                ${escapeHtml(item.description)}
            </div>
            <div>
                <strong>Variants</strong>
                ${variants}
            </div>
            <div>
                <strong>Created</strong>
                ${formatDate(item.created_at)}
            </div>
            ${imageUrl ? `
            <div>
                <strong>Image</strong>
                <img src="${imageUrl}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd;">
            </div>
            ` : ''}
        </div>
        <div class="mobile-card-actions">
            <button class="btn-small btn-edit" onclick="editItem('${item.id}')">Edit</button>
            <button class="btn-small ${item.hidden ? 'btn-show' : 'btn-hide'}" 
                    onclick="toggleItemVisibility('${item.id}', ${!item.hidden})">
                ${item.hidden ? 'Show' : 'Hide'}
            </button>
            <button class="btn-small btn-delete" onclick="deleteItem('${item.id}')">Delete</button>
        </div>
    `;
    
    return card;
}

function getVariantsDisplay(variants) {
    if (!variants || variants.length === 0) {
        return '<span style="color: #999;">No variants</span>';
    }
    
    const variantTexts = variants.map(variant => {
        if (variant.is_whole_bottle) {
            return 'Full Bottle (Contact)';
        }
        const price = variant.price_cents ? (variant.price_cents / 1000).toFixed(3) : 'N/A';
        return `${variant.size_ml}ml - ${price} OMR`;
    });
    
    return `<div class="variants-list">${variantTexts.join('<br>')}</div>`;
}

function updatePaginationInfo(start, end, total, totalPages) {
    const infoEl = document.getElementById('itemsPageInfo');
    const totalEl = document.getElementById('itemsTotalCount');
    const prevBtn = document.getElementById('itemsPrevBtn');
    const nextBtn = document.getElementById('itemsNextBtn');
    const pagination = document.getElementById('itemsPagination');
    
    if (infoEl) infoEl.textContent = `Page ${currentPage} of ${totalPages}`;
    if (totalEl) totalEl.textContent = total;
    
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages;
    }
    
    if (pagination) {
        pagination.style.display = totalPages > 1 ? 'flex' : 'none';
    }
}

// State Management Functions
function showLoading() {
    document.getElementById('itemsLoading').style.display = 'block';
    document.getElementById('itemsError').style.display = 'none';
    document.getElementById('itemsEmpty').style.display = 'none';
    document.getElementById('itemsContent').style.display = 'none';
}

function showError() {
    document.getElementById('itemsLoading').style.display = 'none';
    document.getElementById('itemsError').style.display = 'block';
    document.getElementById('itemsEmpty').style.display = 'none';
    document.getElementById('itemsContent').style.display = 'none';
}

function showEmptyState() {
    document.getElementById('itemsLoading').style.display = 'none';
    document.getElementById('itemsError').style.display = 'none';
    document.getElementById('itemsEmpty').style.display = 'block';
    document.getElementById('itemsContent').style.display = 'none';
}

function showNoResultsState() {
    const emptyState = document.getElementById('itemsEmpty');
    if (emptyState) {
        emptyState.querySelector('h3').textContent = 'No Items Found';
        emptyState.querySelector('p').textContent = 'No items match your search criteria. Try adjusting your filters.';
        emptyState.querySelector('button').style.display = 'none';
        emptyState.style.display = 'block';
    }
    
    document.getElementById('itemsLoading').style.display = 'none';
    document.getElementById('itemsError').style.display = 'none';
    document.getElementById('itemsContent').style.display = 'none';
}

function showItemsContent() {
    document.getElementById('itemsLoading').style.display = 'none';
    document.getElementById('itemsError').style.display = 'none';
    document.getElementById('itemsEmpty').style.display = 'none';
    document.getElementById('itemsContent').style.display = 'block';
}

// Pagination Functions
function previousItemsPage() {
    if (currentPage > 1) {
        currentPage--;
        applyFiltersAndPagination();
    }
}

function nextItemsPage() {
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        applyFiltersAndPagination();
    }
}

// Modal Functions
function openAddItemModal() {
    currentEditingId = null;
    document.getElementById('itemModalTitle').textContent = 'Add New Item';
    document.getElementById('saveButtonText').textContent = 'Save Item';
    resetForm();
    showModal('itemModalOverlay');
}

function editItem(itemId) {
    const item = items.find(i => i.id == itemId);
    if (!item) {
        showToast('Item not found', 'error');
        return;
    }
    
    currentEditingId = itemId;
    document.getElementById('itemModalTitle').textContent = 'Edit Item';
    document.getElementById('saveButtonText').textContent = 'Update Item';
    
    // Populate form with item data
    populateForm(item);
    showModal('itemModalOverlay');
}

function populateForm(item) {
    document.getElementById('itemName').value = item.name || '';
    document.getElementById('itemBrand').value = item.brand || '';
    document.getElementById('itemDescription').value = item.description || '';
    document.getElementById('itemHidden').checked = item.hidden || false;
    
    // Populate variant prices
    const variants = item.variants || [];
    variants.forEach(variant => {
        if (variant.is_whole_bottle) {
            document.getElementById('enableFullBottle').checked = true;
        } else if (variant.size_ml) {
            const priceOMR = variant.price_cents ? (variant.price_cents / 1000) : 0;
            switch(variant.size_ml) {
                case 5:
                    document.getElementById('price5ml').value = priceOMR;
                    break;
                case 10:
                    document.getElementById('price10ml').value = priceOMR;
                    break;
                case 30:
                    document.getElementById('price30ml').value = priceOMR;
                    break;
            }
        }
    });
    
    // Show current image if exists
    if (item.image_path) {
        const imagePreview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');
        const imageInput = document.getElementById('itemImage');
        
        if (imagePreview && previewImg) {
            previewImg.src = `/storage/fragrance-images/${item.image_path}`;
            imagePreview.style.display = 'block';
            imageInput.required = false; // Don't require new image for edit
        }
    }
}

function resetForm() {
    const form = document.getElementById('itemForm');
    if (form) form.reset();
    
    const imageInput = document.getElementById('itemImage');
    if (imageInput) imageInput.required = true; // Require image for new items
    
    removeImagePreview();
}

function closeItemModal() {
    hideModal('itemModalOverlay');
    resetForm();
    currentEditingId = null;
}

function deleteItem(itemId) {
    const item = items.find(i => i.id == itemId);
    if (!item) {
        showToast('Item not found', 'error');
        return;
    }
    
    deleteItemId = itemId;
    
    // Populate delete preview
    const preview = document.getElementById('deleteItemPreview');
    const imageUrl = item.image_path ? `/storage/fragrance-images/${item.image_path}` : null;
    
    preview.innerHTML = `
        ${imageUrl ? 
            `<img src="${imageUrl}" alt="${item.name}">` : 
            `<div style="width: 50px; height: 50px; background: #f0f0f0; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; color: #999;">No Image</div>`
        }
        <div class="item-preview-info">
            <div class="item-name">${escapeHtml(item.name)}</div>
            <div class="item-brand">${escapeHtml(item.brand || 'No Brand')}</div>
        </div>
    `;
    
    showModal('deleteModalOverlay');
}

function closeDeleteModal() {
    hideModal('deleteModalOverlay');
    deleteItemId = null;
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    }
}

// Form Handling Functions
function handleImagePreview(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    
    if (file) {
        if (!file.type.match('image/png')) {
            showToast('Please select a PNG image file', 'error');
            event.target.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        removeImagePreview();
    }
}

function removeImagePreview() {
    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const imageInput = document.getElementById('itemImage');
    
    if (preview) preview.style.display = 'none';
    if (previewImg) previewImg.src = '';
    if (imageInput) imageInput.value = '';
}

function validateForm() {
    const name = document.getElementById('itemName').value.trim();
    const brand = document.getElementById('itemBrand').value.trim();
    const description = document.getElementById('itemDescription').value.trim();
    const imageInput = document.getElementById('itemImage');
    const hasImage = imageInput.files.length > 0 || (!imageInput.required);
    
    const isValid = name && brand && description && hasImage;
    
    const saveButton = document.querySelector('#itemModalOverlay .btn-primary');
    if (saveButton) {
        saveButton.disabled = !isValid;
    }
    
    return isValid;
}

// CRUD Operations
async function saveItem() {
    if (!validateForm()) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    const saveButton = document.querySelector('#itemModalOverlay .btn-primary');
    const originalText = saveButton.textContent;
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    
    try {
        const formData = new FormData();
        
        // Basic fields
        formData.append('name', document.getElementById('itemName').value.trim());
        formData.append('brand', document.getElementById('itemBrand').value.trim());
        formData.append('description', document.getElementById('itemDescription').value.trim());
        formData.append('hidden', document.getElementById('itemHidden').checked);
        
        // Image file
        const imageInput = document.getElementById('itemImage');
        if (imageInput.files.length > 0) {
            formData.append('image', imageInput.files[0]);
        }
        
        // Variant prices (convert OMR to fils)
        const variants = [];
        
        const price5ml = parseFloat(document.getElementById('price5ml').value);
        if (!isNaN(price5ml) && price5ml > 0) {
            variants.push({
                size_ml: 5,
                price_cents: Math.round(price5ml * 1000),
                is_whole_bottle: false
            });
        }
        
        const price10ml = parseFloat(document.getElementById('price10ml').value);
        if (!isNaN(price10ml) && price10ml > 0) {
            variants.push({
                size_ml: 10,
                price_cents: Math.round(price10ml * 1000),
                is_whole_bottle: false
            });
        }
        
        const price30ml = parseFloat(document.getElementById('price30ml').value);
        if (!isNaN(price30ml) && price30ml > 0) {
            variants.push({
                size_ml: 30,
                price_cents: Math.round(price30ml * 1000),
                is_whole_bottle: false
            });
        }
        
        if (document.getElementById('enableFullBottle').checked) {
            variants.push({
                size_ml: null,
                price_cents: null,
                is_whole_bottle: true
            });
        }
        
        formData.append('variants', JSON.stringify(variants));
        
        // Add ID for updates
        if (currentEditingId) {
            formData.append('id', currentEditingId);
        }
        
        const url = currentEditingId ? '/admin/update-fragrance' : '/admin/add-fragrance';
        const method = currentEditingId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            credentials: 'include',
            body: formData
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }
        
        if (result.success) {
            const action = currentEditingId ? 'updated' : 'added';
            showToast(`Item ${action} successfully`, 'success');
            closeItemModal();
            await refreshData();
        } else {
            throw new Error(result.error || 'Failed to save item');
        }
        
    } catch (error) {
        console.error('❌ Save item error:', error);
        showToast('Failed to save item: ' + error.message, 'error');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = originalText;
    }
}

async function confirmDelete() {
    if (!deleteItemId) return;
    
    const deleteButton = document.querySelector('#deleteModalOverlay .btn-delete');
    const originalText = deleteButton.textContent;
    deleteButton.disabled = true;
    deleteButton.textContent = 'Deleting...';
    
    try {
        const response = await fetch('/admin/delete-fragrance', {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: deleteItemId })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }
        
        if (result.success) {
            showToast('Item deleted successfully', 'success');
            closeDeleteModal();
            await refreshData();
        } else {
            throw new Error(result.error || 'Failed to delete item');
        }
        
    } catch (error) {
        console.error('❌ Delete item error:', error);
        showToast('Failed to delete item: ' + error.message, 'error');
    } finally {
        deleteButton.disabled = false;
        deleteButton.textContent = originalText;
    }
}

async function toggleItemVisibility(itemId, hidden) {
    try {
        const response = await fetch('/admin/toggle-fragrance-visibility', {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                id: itemId, 
                hidden: hidden 
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }
        
        if (result.success) {
            const action = hidden ? 'hidden' : 'made visible';
            showToast(`Item ${action} successfully`, 'success');
            await refreshData();
        } else {
            throw new Error(result.error || 'Failed to update item visibility');
        }
        
    } catch (error) {
        console.error('❌ Toggle visibility error:', error);
        showToast('Failed to update item visibility: ' + error.message, 'error');
    }
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        document.cookie = 'admin_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        window.location.href = '/login.html';
    }
}

// Toast Notification System
function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const titles = {
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Info'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">
            <div class="toast-title">${titles[type] || titles.info}</div>
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, duration);
    
    // Remove on click
    toast.addEventListener('click', () => toast.remove());
}