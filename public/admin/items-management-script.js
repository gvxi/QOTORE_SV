// Global variables
let items = [];
let filteredItems = [];
let currentPage = 1;
let itemsPerPage = 10;
let deleteItemId = null;
let currentEditingId = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Items management page loaded');
    loadItems();
    
    // Set up event listeners
    const imageInput = document.getElementById('itemImage');
    if (imageInput) {
        imageInput.addEventListener('change', handleImagePreview);
    }
    
    const itemForm = document.getElementById('itemForm');
    if (itemForm) {
        itemForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Setup filter and search
    const searchInput = document.getElementById('itemSearch');
    const statusFilter = document.getElementById('statusFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', applyFiltersAndPagination);
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', applyFiltersAndPagination);
    }
});

// Load items from server
async function loadItems() {
    try {
        showLoading();
        console.log('Loading items from admin API...');
        
        const response = await fetch('/admin/fragrances', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('Items API response:', data);
        
        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }
        
        if (data.success && data.data) {
            items = data.data;
            console.log(`Loaded ${items.length} items`, items);
            applyFiltersAndPagination();
        } else {
            throw new Error('Invalid response format');
        }
        
    } catch (error) {
        console.error('Error loading items:', error);
        showError();
        showToast(`Failed to load items: ${error.message}`, 'error');
    }
}

// Apply filters and pagination
function applyFiltersAndPagination() {
    const searchTerm = document.getElementById('itemSearch')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    
    // Filter items
    filteredItems = items.filter(item => {
        const matchesSearch = searchTerm === '' || 
            item.name.toLowerCase().includes(searchTerm) ||
            (item.brand && item.brand.toLowerCase().includes(searchTerm)) ||
            (item.description && item.description.toLowerCase().includes(searchTerm));
            
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'visible' && !item.hidden) ||
            (statusFilter === 'hidden' && item.hidden);
            
        return matchesSearch && matchesStatus;
    });
    
    console.log(`Filtered ${filteredItems.length} items from ${items.length} total`);
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, filteredItems.length);
    const paginatedItems = filteredItems.slice(start, end);
    
    // Update pagination info
    updatePaginationInfo(start + 1, end, filteredItems.length, totalPages);
    
    // Render items
    if (filteredItems.length === 0) {
        if (items.length === 0) {
            showEmptyState();
        } else {
            showNoResultsState();
        }
    } else {
        showItemsContent();
        renderDesktopTable(paginatedItems);
        renderMobileCards(paginatedItems);
    }
}

function renderDesktopTable(items) {
    const tbody = document.getElementById('itemsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    items.forEach(item => {
        const row = createDesktopRow(item);
        tbody.appendChild(row);
    });
}

function createDesktopRow(item) {
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

// FIXED: This function now correctly handles both data structures
function getVariantsDisplay(variants) {
    if (!variants || variants.length === 0) {
        return '<span style="color: #999;">No variants</span>';
    }
    
    const variantTexts = variants.map(variant => {
        if (variant.is_whole_bottle) {
            return 'Full Bottle (Contact)';
        }
        
        // Handle both data structures:
        // 1. From database (size_ml, price_cents) - raw Supabase data
        // 2. From API (size, price, price_display) - processed API data
        let size, price;
        
        if (variant.size_ml !== undefined) {
            // Raw database structure
            size = `${variant.size_ml}ml`;
            price = variant.price_cents ? (variant.price_cents / 1000).toFixed(3) : 'N/A';
        } else {
            // Processed API structure
            size = variant.size || 'Unknown';
            price = variant.price ? variant.price.toFixed(3) : 'N/A';
        }
        
        return `${size} - ${price} OMR`;
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

// FIXED: This function now correctly handles the admin API data structure
function populateForm(item) {
    document.getElementById('itemName').value = item.name || '';
    document.getElementById('itemBrand').value = item.brand || '';
    document.getElementById('itemDescription').value = item.description || '';
    document.getElementById('itemHidden').checked = item.hidden || false;
    
    // Clear all variant prices first
    document.getElementById('price5ml').value = '';
    document.getElementById('price10ml').value = '';
    document.getElementById('price30ml').value = '';
    document.getElementById('enableFullBottle').checked = false;
    
    // Populate variant prices
    const variants = item.variants || [];
    console.log('Populating form with variants:', variants);
    
    variants.forEach(variant => {
        if (variant.is_whole_bottle) {
            document.getElementById('enableFullBottle').checked = true;
        } else {
            // Handle both data structures:
            // 1. From database (size_ml, price_cents) - raw Supabase data  
            // 2. From API (size, price) - processed API data
            let sizeML, priceOMR;
            
            if (variant.size_ml !== undefined) {
                // Raw database structure
                sizeML = variant.size_ml;
                priceOMR = variant.price_cents ? (variant.price_cents / 1000) : 0;
            } else if (variant.size) {
                // Processed API structure - extract size_ml from size string
                const sizeMatch = variant.size.match(/(\d+)ml/);
                sizeML = sizeMatch ? parseInt(sizeMatch[1]) : null;
                priceOMR = variant.price || 0;
            }
            
            // Set the appropriate input field
            switch(sizeML) {
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

async function handleFormSubmit(event) {
    event.preventDefault();
    
    const saveBtn = document.getElementById('saveItemBtn');
    const originalText = saveBtn.textContent;
    
    try {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';
        
        console.log('Form submission started');
        
        const formData = new FormData();
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
            showToast(`Item ${action} successfully!`, 'success');
            closeItemModal();
            
            // Reload items to get the latest data
            await loadItems();
        } else {
            throw new Error(result.error || 'Operation failed');
        }
        
    } catch (error) {
        console.error('Form submission error:', error);
        showToast(`Failed to save item: ${error.message}`, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

// Toggle item visibility
async function toggleItemVisibility(itemId, newVisibilityStatus) {
    try {
        const item = items.find(i => i.id == itemId);
        if (!item) {
            showToast('Item not found', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('id', itemId);
        formData.append('name', item.name);
        formData.append('brand', item.brand || '');
        formData.append('description', item.description || '');
        formData.append('hidden', newVisibilityStatus ? 'false' : 'true'); // opposite of newVisibilityStatus
        
        // Include existing variants
        if (item.variants && item.variants.length > 0) {
            const variants = item.variants.map(variant => {
                if (variant.is_whole_bottle) {
                    return {
                        size_ml: null,
                        price_cents: null,
                        is_whole_bottle: true
                    };
                } else {
                    // Handle both data structures
                    let sizeML, priceInCents;
                    
                    if (variant.size_ml !== undefined) {
                        sizeML = variant.size_ml;
                        priceInCents = variant.price_cents;
                    } else if (variant.size) {
                        const sizeMatch = variant.size.match(/(\d+)ml/);
                        sizeML = sizeMatch ? parseInt(sizeMatch[1]) : null;
                        priceInCents = variant.price ? Math.round(variant.price * 1000) : null;
                    }
                    
                    return {
                        size_ml: sizeML,
                        price_cents: priceInCents,
                        is_whole_bottle: false
                    };
                }
            });
            formData.append('variants', JSON.stringify(variants));
        }
        
        const response = await fetch('/admin/update-fragrance', {
            method: 'PUT',
            credentials: 'include',
            body: formData
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }
        
        if (result.success) {
            const action = newVisibilityStatus ? 'shown' : 'hidden';
            showToast(`Item ${action} successfully!`, 'success');
            
            // Update local data
            item.hidden = !newVisibilityStatus;
            applyFiltersAndPagination();
        } else {
            throw new Error(result.error || 'Update failed');
        }
        
    } catch (error) {
        console.error('Toggle visibility error:', error);
        showToast(`Failed to update visibility: ${error.message}`, 'error');
    }
}

// Delete item
async function confirmDeleteItem() {
    if (!deleteItemId) {
        showToast('No item selected for deletion', 'error');
        return;
    }
    
    const deleteBtn = document.getElementById('confirmDeleteBtn');
    const originalText = deleteBtn.textContent;
    
    try {
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<span class="loading-spinner"></span> Deleting...';
        
        const response = await fetch(`/admin/delete-fragrance?id=${deleteItemId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }
        
        if (result.success) {
            showToast('Item deleted successfully!', 'success');
            closeDeleteModal();
            
            // Remove from local data
            items = items.filter(item => item.id != deleteItemId);
            applyFiltersAndPagination();
        } else {
            throw new Error(result.error || 'Delete failed');
        }
        
    } catch (error) {
        console.error('Delete error:', error);
        showToast(`Failed to delete item: ${error.message}`, 'error');
    } finally {
        deleteBtn.disabled = false;
        deleteBtn.textContent = originalText;
    }
}

// Utility functions
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return 'Invalid Date';
    }
}

function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Add to page
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
}