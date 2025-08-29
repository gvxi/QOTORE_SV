// Global Variables
let items = [];
let filteredItems = [];
let currentPage = 1;
let itemsPerPage = 10;
let currentEditingId = null;
let deleteItemId = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Items Management initialized');
    loadItems();
    
    // Check authentication periodically
    setInterval(checkAuth, 5 * 60 * 1000); // Every 5 minutes
});

// Authentication Functions
function checkAuth() {
    fetch('/admin/check-auth', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            redirectToLogin();
        }
    })
    .catch(() => redirectToLogin());
}

function redirectToLogin() {
    window.location.href = '/admin/login';
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
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

function generateSlug(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Toast Notification Functions
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.className = `toast toast-${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
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
            console.log('Sample item with variants:', items[0]); // Debug log
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

// Dashboard Stats
function updateDashboardStats() {
    const totalItems = items.length;
    const visibleItems = items.filter(item => !item.hidden).length;
    const hiddenItems = items.filter(item => item.hidden).length;
    const totalVariants = items.reduce((sum, item) => sum + (item.variants?.length || 0), 0);
    
    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('visibleItems').textContent = visibleItems;
    document.getElementById('hiddenItems').textContent = hiddenItems;
    document.getElementById('totalVariants').textContent = totalVariants;
}

// Filtering and Pagination Functions
function applyFiltersAndPagination() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const sortBy = document.getElementById('sortBy').value;
    
    // Apply filters
    filteredItems = items.filter(item => {
        const matchesSearch = !searchTerm || 
            item.name.toLowerCase().includes(searchTerm) ||
            (item.brand && item.brand.toLowerCase().includes(searchTerm)) ||
            item.description.toLowerCase().includes(searchTerm);
        
        const matchesStatus = !statusFilter ||
            (statusFilter === 'visible' && !item.hidden) ||
            (statusFilter === 'hidden' && item.hidden);
        
        return matchesSearch && matchesStatus;
    });
    
    // Apply sorting
    filteredItems.sort((a, b) => {
        switch (sortBy) {
            case 'name_asc':
                return a.name.localeCompare(b.name);
            case 'name_desc':
                return b.name.localeCompare(a.name);
            case 'created_desc':
                return new Date(b.created_at) - new Date(a.created_at);
            case 'created_asc':
                return new Date(a.created_at) - new Date(b.created_at);
            default:
                return 0;
        }
    });
    
    // Reset to first page
    currentPage = 1;
    
    // Render results
    renderItems();
    updatePagination();
}

function renderItems() {
    if (filteredItems.length === 0) {
        showEmptyState();
        return;
    }
    
    showItemsContent();
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = filteredItems.slice(startIndex, endIndex);
    
    // Render desktop table
    renderDesktopTable(paginatedItems);
    
    // Render mobile cards
    renderMobileCards(paginatedItems);
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
        
        // Handle different ways the variant might be structured
        let price = 'N/A';
        let size = 'Unknown';
        
        // Check for price_cents (from database)
        if (variant.price_cents && variant.price_cents > 0) {
            price = `${(variant.price_cents / 1000).toFixed(3)} OMR`;
        } 
        // Check for price (already converted)
        else if (variant.price && variant.price > 0) {
            price = `${variant.price.toFixed(3)} OMR`;
        }
        
        // Check for size_ml (from database)
        if (variant.size_ml) {
            size = `${variant.size_ml}ml`;
        } 
        // Check for size (processed)
        else if (variant.size) {
            size = variant.size;
        }
        
        return `${size}: ${price}`;
    });
    
    return variantTexts.join('<br>');
}

function updatePagination() {
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredItems.length);
    
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('itemsInfo').textContent = `${startItem}-${endItem} of ${filteredItems.length} items`;
    
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
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
    const emptyState = document.getElementById('itemsEmpty');
    
    // Update empty state message based on filters
    const searchTerm = document.getElementById('searchInput').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    if (searchTerm || statusFilter) {
        emptyState.querySelector('h3').textContent = 'No items match your filters';
        emptyState.querySelector('p').textContent = 'Try adjusting your filters.';
        emptyState.querySelector('button').style.display = 'none';
        emptyState.style.display = 'block';
    } else {
        emptyState.querySelector('h3').textContent = 'No items found';
        emptyState.querySelector('p').textContent = 'You haven\'t added any items yet.';
        emptyState.querySelector('button').style.display = 'inline-block';
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
    console.log('🔧 Populating form with item:', item);
    console.log('📋 Item variants:', item.variants);
    
    // Populate basic fields
    document.getElementById('itemName').value = item.name || '';
    document.getElementById('itemBrand').value = item.brand || '';
    document.getElementById('itemDescription').value = item.description || '';
    document.getElementById('itemHidden').checked = item.hidden || false;
    
    // Clear all variant prices first
    document.getElementById('price5ml').value = '';
    document.getElementById('price10ml').value = '';
    document.getElementById('price30ml').value = '';
    document.getElementById('enableFullBottle').checked = false;
    
    // Process variants if they exist
    const variants = item.variants || [];
    console.log(`📦 Processing ${variants.length} variants:`);
    
    variants.forEach((variant, index) => {
        console.log(`  Variant ${index + 1}:`, {
            id: variant.id,
            size_ml: variant.size_ml,
            price_cents: variant.price_cents,
            is_whole_bottle: variant.is_whole_bottle,
            size: variant.size,
            price: variant.price
        });
        
        if (variant.is_whole_bottle) {
            document.getElementById('enableFullBottle').checked = true;
            console.log('  ✓ Set full bottle checkbox to true');
        } else {
            // Try to get the size from either size_ml or size field
            let sizeInMl = null;
            
            if (variant.size_ml) {
                sizeInMl = variant.size_ml;
            } else if (variant.size) {
                // Extract number from size string like "5ml", "10ml", etc.
                const match = variant.size.match(/(\d+)ml/);
                if (match) {
                    sizeInMl = parseInt(match[1]);
                }
            }
            
            if (sizeInMl) {
                // Try to get price from either price_cents or price field
                let priceOMR = 0;
                
                if (variant.price_cents && variant.price_cents > 0) {
                    priceOMR = variant.price_cents / 1000;
                } else if (variant.price && variant.price > 0) {
                    priceOMR = variant.price;
                }
                
                console.log(`  📏 Size: ${sizeInMl}ml, Price: ${priceOMR} OMR`);
                
                // Set the appropriate price field
                switch(sizeInMl) {
                    case 5:
                        if (priceOMR > 0) {
                            document.getElementById('price5ml').value = priceOMR.toFixed(3);
                            console.log('  ✓ Set 5ml price to:', priceOMR.toFixed(3));
                        }
                        break;
                    case 10:
                        if (priceOMR > 0) {
                            document.getElementById('price10ml').value = priceOMR.toFixed(3);
                            console.log('  ✓ Set 10ml price to:', priceOMR.toFixed(3));
                        }
                        break;
                    case 30:
                        if (priceOMR > 0) {
                            document.getElementById('price30ml').value = priceOMR.toFixed(3);
                            console.log('  ✓ Set 30ml price to:', priceOMR.toFixed(3));
                        }
                        break;
                    default:
                        console.log(`  ⚠️  Unknown variant size: ${sizeInMl}ml`);
                }
            } else {
                console.log('  ⚠️  Could not determine size for variant:', variant);
            }
        }
    });
    
    // Show current image if exists
    if (item.image_path) {
        const imagePreview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');
        const imageInput = document.getElementById('itemImage');
        
        if (imagePreview && previewImg) {
            const imageUrl = `/storage/fragrance-images/${item.image_path}`;
            console.log('🖼️  Setting image preview:', imageUrl);
            previewImg.src = imageUrl;
            imagePreview.style.display = 'block';
            imageInput.required = false; // Don't require new image for edit
        }
    }
    
    console.log('✅ Form population completed');
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
    
    // If editing, don't require image
    if (currentEditingId) {
        imageInput.required = false;
    } else {
        imageInput.required = true;
    }
}

// CRUD Operations
async function saveItem(event) {
    event.preventDefault();
    
    const saveButton = document.querySelector('#itemForm button[type="submit"]');
    const originalText = saveButton.innerHTML;
    
    try {
        saveButton.disabled = true;
        saveButton.innerHTML = '⏳ Saving...';
        
        const formData = new FormData();
        
        // Basic fields
        formData.append('name', document.getElementById('itemName').value.trim());
        formData.append('brand', document.getElementById('itemBrand').value.trim());
        formData.append('description', document.getElementById('itemDescription').value.trim());
        formData.append('slug', generateSlug(document.getElementById('itemName').value.trim()));
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
            await loadItems(); // Reload to get fresh data
        } else {
            throw new Error(result.error || 'Unknown error occurred');
        }
        
    } catch (error) {
        console.error('Save error:', error);
        showToast('Failed to save item: ' + error.message, 'error');
    } finally {
        saveButton.disabled = false;
        saveButton.innerHTML = originalText;
    }
}

async function toggleItemVisibility(itemId, makeVisible) {
    try {
        const response = await fetch('/admin/toggle-fragrance-visibility', {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: itemId,
                hidden: !makeVisible
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }
        
        if (result.success) {
            const action = makeVisible ? 'shown' : 'hidden';
            showToast(`Item ${action} successfully!`, 'success');
            await loadItems(); // Reload to get fresh data
        } else {
            throw new Error(result.error || 'Failed to update visibility');
        }
        
    } catch (error) {
        console.error('Toggle visibility error:', error);
        showToast('Failed to update item visibility: ' + error.message, 'error');
    }
}

async function confirmDelete() {
    if (!deleteItemId) return;
    
    const deleteButton = document.querySelector('#deleteModalOverlay .btn-danger');
    const originalText = deleteButton.textContent;
    
    try {
        deleteButton.disabled = true;
        deleteButton.textContent = '⏳ Deleting...';
        
        const response = await fetch('/admin/delete-fragrance', {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: deleteItemId
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }
        
        if (result.success) {
            showToast('Item deleted successfully!', 'success');
            closeDeleteModal();
            await loadItems(); // Reload to get fresh data
        } else {
            throw new Error(result.error || 'Failed to delete item');
        }
        
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Failed to delete item: ' + error.message, 'error');
    } finally {
        deleteButton.disabled = false;
        deleteButton.textContent = originalText;
    }
}