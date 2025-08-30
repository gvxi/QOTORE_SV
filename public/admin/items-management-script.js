// Items Management Script
let items = [];
let currentEditingId = null;
let deleteItemId = null;
let currentPage = 1;
const itemsPerPage = 10;
let currentFilter = 'all'; // all, visible, hidden
let currentSearch = '';

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadItems();
    initializeVariantToggles();
    setupEventListeners();
});

// Event listeners setup
function setupEventListeners() {
    // Search functionality
    document.getElementById('itemsSearch').addEventListener('input', (e) => {
        currentSearch = e.target.value;
        currentPage = 1;
        displayItems();
    });
    
    // Filter functionality
    document.getElementById('itemsFilter').addEventListener('change', (e) => {
        currentFilter = e.target.value;
        currentPage = 1;
        displayItems();
    });
    
    // Form submission
    document.getElementById('itemForm').addEventListener('submit', handleFormSubmit);
    
    // Image preview
    document.getElementById('itemImage').addEventListener('change', handleImagePreview);
    
    // Name to slug preview
    document.getElementById('itemName').addEventListener('input', updateSlugPreview);
}

function updateSlugPreview() {
    const name = document.getElementById('itemName').value;
    const slug = name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
        .replace(/^-|-$/g, '');
    
    const preview = document.getElementById('slugPreview');
    const imageNamePreview = document.getElementById('imageNamePreview');
    
    if (preview) preview.textContent = slug || 'product-name';
    if (imageNamePreview) imageNamePreview.textContent = (slug || 'product-name') + '.png';
}

function initializeVariantToggles() {
    // Initialize checkbox change handlers for enabling/disabling price inputs
    document.getElementById('enable5ml').addEventListener('change', function() {
        const priceInput = document.getElementById('price5ml');
        priceInput.disabled = !this.checked;
        if (!this.checked) {
            priceInput.value = '';
        } else {
            priceInput.focus();
        }
    });
    
    document.getElementById('enable10ml').addEventListener('change', function() {
        const priceInput = document.getElementById('price10ml');
        priceInput.disabled = !this.checked;
        if (!this.checked) {
            priceInput.value = '';
        } else {
            priceInput.focus();
        }
    });
    
    document.getElementById('enable30ml').addEventListener('change', function() {
        const priceInput = document.getElementById('price30ml');
        priceInput.disabled = !this.checked;
        if (!this.checked) {
            priceInput.value = '';
        } else {
            priceInput.focus();
        }
    });
}

async function checkAuth() {
    try {
        const response = await fetch('/admin/check-auth', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            window.location.href = '/admin/login.html';
            return;
        }
        
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/admin/login.html';
    }
}

async function loadItems() {
    showLoadingState();
    
    try {
        const response = await fetch('/admin/fragrances', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
            items = result.data;
            console.log(`📦 Loaded ${items.length} items for admin`);
            updateStats();
            displayItems();
        } else {
            throw new Error(result.error || 'Failed to load items');
        }
        
    } catch (error) {
        console.error('❌ Load items error:', error);
        showErrorState(error.message);
    }
}

function updateStats() {
    const totalItems = items.length;
    const visibleItems = items.filter(item => !item.hidden).length;
    const hiddenItems = items.filter(item => item.hidden).length;
    const uniqueBrands = [...new Set(items.map(item => item.brand).filter(Boolean))].length;
    
    document.getElementById('totalItemsCount').textContent = totalItems;
    document.getElementById('visibleItemsCount').textContent = visibleItems;
    document.getElementById('hiddenItemsCount').textContent = hiddenItems;
    document.getElementById('totalBrandsCount').textContent = uniqueBrands;
}

function displayItems() {
    let filteredItems = [...items];
    
    // Apply search filter
    if (currentSearch.trim()) {
        const searchLower = currentSearch.toLowerCase();
        filteredItems = filteredItems.filter(item => 
            item.name.toLowerCase().includes(searchLower) ||
            (item.brand && item.brand.toLowerCase().includes(searchLower)) ||
            item.description.toLowerCase().includes(searchLower)
        );
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
    updatePaginationInfo(startIndex + 1, endIndex, filteredItems.length, totalPages);
    generatePaginationControls(totalPages);
    
    showItemsContent();
}

function renderItemsTable(items) {
    const tbody = document.querySelector('#itemsTable tbody');
    const mobileContainer = document.getElementById('itemCards');
    
    if (tbody) {
        tbody.innerHTML = '';
        items.forEach(item => {
            const row = createTableRow(item);
            tbody.appendChild(row);
        });
    }
    
    if (mobileContainer) {
        renderMobileCards(items);
    }
}

function createTableRow(item) {
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
                <button class="btn-small btn-edit" onclick="editItem('${item.id}')">Edit</button>
                <button class="btn-small ${item.hidden ? 'btn-success' : 'btn-warning'}" 
                        onclick="toggleItemVisibility('${item.id}')">
                    ${item.hidden ? 'Show' : 'Hide'}
                </button>
                <button class="btn-small btn-delete" onclick="deleteItem('${item.id}')">Delete</button>
            </div>
        </td>
    `;
    
    return row;
}

function renderMobileCards(items) {
    const container = document.getElementById('itemCards');
    container.innerHTML = '';
    
    items.forEach(item => {
        const card = createMobileCard(item);
        container.appendChild(card);
    });
}

function createMobileCard(item) {
    const card = document.createElement('div');
    card.className = 'item-card';
    
    const variants = getVariantsDisplay(item.variants);
    const imageUrl = item.image_path ? `/storage/fragrance-images/${item.image_path}` : null;
    
    card.innerHTML = `
        <div class="item-card-header">
            ${imageUrl ? 
                `<img src="${imageUrl}" alt="${item.name}" class="item-card-image" onerror="this.style.display='none';">` :
                `<div class="no-image-card">No Image</div>`
            }
            <div class="item-card-info">
                <div class="item-card-name">${escapeHtml(item.name)}</div>
                <div class="item-card-brand">${escapeHtml(item.brand || 'No Brand')}</div>
                <div class="item-card-status">
                    <span class="status-badge ${item.hidden ? 'status-hidden' : 'status-visible'}">
                        ${item.hidden ? 'Hidden' : 'Visible'}
                    </span>
                </div>
            </div>
        </div>
        <div class="item-card-body">
            <div class="item-card-description">${escapeHtml(item.description)}</div>
            <div class="item-card-variants">
                <strong>Variants:</strong><br>
                ${variants}
            </div>
            <div class="item-card-date">Created: ${formatDate(item.created_at)}</div>
        </div>
        <div class="item-card-actions">
            <button class="btn-small btn-edit" onclick="editItem('${item.id}')">Edit</button>
            <button class="btn-small ${item.hidden ? 'btn-success' : 'btn-warning'}" 
                    onclick="toggleItemVisibility('${item.id}')">
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
        const price = variant.price ? `${variant.price.toFixed(3)} OMR` : 'No price';
        return `${variant.size} - ${price}`;
    });
    
    return variantTexts.join('<br>');
}

// Form handling functions
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const saveButton = document.getElementById('saveItemBtn');
    const saveButtonText = document.getElementById('saveButtonText');
    const originalText = saveButtonText.textContent;
    
    // Disable button and show loading
    saveButton.disabled = true;
    saveButtonText.innerHTML = '<div class="loading-spinner"></div> Saving...';
    
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
        
        // Variant prices (convert OMR to fils) - FIXED LOGIC
        const variants = [];
        
        const price5ml = parseFloat(document.getElementById('price5ml').value);
        if (!isNaN(price5ml) && price5ml > 0) {
            variants.push({
                size_ml: 5,
                price_cents: Math.round(price5ml * 1000), // Convert OMR to fils
                is_whole_bottle: false
            });
        }
        
        const price10ml = parseFloat(document.getElementById('price10ml').value);
        if (!isNaN(price10ml) && price10ml > 0) {
            variants.push({
                size_ml: 10,
                price_cents: Math.round(price10ml * 1000), // Convert OMR to fils
                is_whole_bottle: false
            });
        }
        
        const price30ml = parseFloat(document.getElementById('price30ml').value);
        if (!isNaN(price30ml) && price30ml > 0) {
            variants.push({
                size_ml: 30,
                price_cents: Math.round(price30ml * 1000), // Convert OMR to fils
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
            loadItems(); // Reload the items list
        } else {
            throw new Error(result.error || 'Operation failed');
        }
        
    } catch (error) {
        console.error('Form submission error:', error);
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        saveButton.disabled = false;
        saveButtonText.textContent = originalText;
    }
}

function handleImagePreview(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('imagePreview');
            const img = document.getElementById('previewImg');
            img.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function removeImagePreview() {
    const preview = document.getElementById('imagePreview');
    const img = document.getElementById('previewImg');
    const input = document.getElementById('itemImage');
    
    preview.style.display = 'none';
    img.src = '';
    input.value = '';
    input.required = currentEditingId ? false : true;
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
    console.log('Populating form with item:', item);
    
    document.getElementById('itemName').value = item.name || '';
    document.getElementById('itemBrand').value = item.brand || '';
    document.getElementById('itemDescription').value = item.description || '';
    document.getElementById('itemHidden').checked = item.hidden || false;
    
    // Reset all variant checkboxes and price fields first
    document.getElementById('enable5ml').checked = false;
    document.getElementById('enable10ml').checked = false;
    document.getElementById('enable30ml').checked = false;
    document.getElementById('enableFullBottle').checked = false;
    
    document.getElementById('price5ml').value = '';
    document.getElementById('price5ml').disabled = true;
    document.getElementById('price10ml').value = '';
    document.getElementById('price10ml').disabled = true;
    document.getElementById('price30ml').value = '';
    document.getElementById('price30ml').disabled = true;
    
    // Populate variant prices - FIXED LOGIC
    const variants = item.variants || [];
    console.log('Processing variants:', variants);
    
    variants.forEach(variant => {
        console.log('Processing variant:', variant);
        
        if (variant.is_whole_bottle) {
            document.getElementById('enableFullBottle').checked = true;
        } else {
            // Use size_ml field directly from database
            let size_ml = null;
            
            if (variant.size_ml) {
                // Direct size_ml field from database
                size_ml = parseInt(variant.size_ml);
            } else if (variant.size) {
                // Extract size_ml from size string (e.g., "5ml" -> 5)
                const sizeMatch = variant.size.match(/(\d+)ml/);
                size_ml = sizeMatch ? parseInt(sizeMatch[1]) : null;
            }
            
            if (size_ml && variant.price !== undefined) {
                const priceOMR = variant.price; // Already in OMR from backend
                console.log(`Setting ${size_ml}ml - checkbox enabled and price to ${priceOMR} OMR`);
                
                switch(size_ml) {
                    case 5:
                        document.getElementById('enable5ml').checked = true;
                        document.getElementById('price5ml').disabled = false;
                        document.getElementById('price5ml').value = priceOMR.toFixed(3);
                        break;
                    case 10:
                        document.getElementById('enable10ml').checked = true;
                        document.getElementById('price10ml').disabled = false;
                        document.getElementById('price10ml').value = priceOMR.toFixed(3);
                        break;
                    case 30:
                        document.getElementById('enable30ml').checked = true;
                        document.getElementById('price30ml').disabled = false;
                        document.getElementById('price30ml').value = priceOMR.toFixed(3);
                        break;
                }
            }
        }
    });
    
    // Update slug preview
    updateSlugPreview();
    
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
    
    // Reset variant checkboxes and disable price inputs
    document.getElementById('enable5ml').checked = false;
    document.getElementById('enable10ml').checked = false;
    document.getElementById('enable30ml').checked = false;
    document.getElementById('enableFullBottle').checked = false;
    
    document.getElementById('price5ml').disabled = true;
    document.getElementById('price10ml').disabled = true;
    document.getElementById('price30ml').disabled = true;
    
    removeImagePreview();
    updateSlugPreview();
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
            '<div class="no-image-small">No Image</div>'
        }
        <div class="item-preview-info">
            <div class="item-preview-name">${escapeHtml(item.name)}</div>
            <div class="item-preview-brand">${escapeHtml(item.brand || 'No Brand')}</div>
        </div>
    `;
    
    showModal('deleteModalOverlay');
}

async function confirmDelete() {
    if (!deleteItemId) return;
    
    const deleteButton = document.getElementById('confirmDeleteBtn');
    const originalText = deleteButton.textContent;
    
    deleteButton.disabled = true;
    deleteButton.innerHTML = '<div class="loading-spinner"></div> Deleting...';
    
    try {
        const response = await fetch(`/admin/delete-fragrance/${deleteItemId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }
        
        if (result.success) {
            showToast('Item deleted successfully!', 'success');
            closeDeleteModal();
            loadItems(); // Reload the items list
        } else {
            throw new Error(result.error || 'Delete failed');
        }
        
    } catch (error) {
        console.error('Delete error:', error);
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        deleteButton.disabled = false;
        deleteButton.textContent = originalText;
    }
}

function closeDeleteModal() {
    hideModal('deleteModalOverlay');
    deleteItemId = null;
}

async function toggleItemVisibility(itemId) {
    const item = items.find(i => i.id == itemId);
    if (!item) {
        showToast('Item not found', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/admin/toggle-fragrance-visibility/${itemId}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                hidden: !item.hidden
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }
        
        if (result.success) {
            const action = item.hidden ? 'shown' : 'hidden';
            showToast(`Item ${action} successfully!`, 'success');
            loadItems(); // Reload the items list
        } else {
            throw new Error(result.error || 'Toggle failed');
        }
        
    } catch (error) {
        console.error('Toggle visibility error:', error);
        showToast(`Error: ${error.message}`, 'error');
    }
}

// Save item wrapper function called by modal button
function saveItem() {
    // Get the actual save button from the modal
    const saveButton = document.querySelector('#itemModalOverlay .btn-primary');
    if (!saveButton) {
        console.error('Save button not found');
        return;
    }
    
    // Trigger form submission
    const form = document.getElementById('itemForm');
    if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
}

// Delete Functions
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
    
    if (preview) {
        preview.innerHTML = `
            ${imageUrl ? 
                `<img src="${imageUrl}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">` : 
                '<div style="width: 60px; height: 60px; background: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; color: #999;">No Image</div>'
            }
            <div style="flex: 1; margin-left: 1rem;">
                <div style="font-weight: 600; color: #333; margin-bottom: 0.25rem;">${escapeHtml(item.name)}</div>
                <div style="color: #666; font-size: 0.9rem;">${escapeHtml(item.brand || 'No Brand')}</div>
                <div style="color: #999; font-size: 0.8rem; margin-top: 0.25rem;">${getVariantsDisplay(item.variants)}</div>
            </div>
        `;
    }
    
    showModal('deleteModalOverlay');
}

async function confirmDelete() {
    if (!deleteItemId) return;
    
    const deleteButton = document.getElementById('confirmDeleteBtn');
    if (!deleteButton) {
        console.error('Delete button not found');
        return;
    }
    
    const originalText = deleteButton.textContent;
    
    deleteButton.disabled = true;
    deleteButton.innerHTML = '<div style="display: inline-block; width: 12px; height: 12px; border: 2px solid #fff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div> Deleting...';
    
    try {
        const response = await fetch(`/admin/delete-fragrance`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: parseInt(deleteItemId) })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }
        
        if (result.success) {
            showToast('Item deleted successfully!', 'success');
            closeDeleteModal();
            loadItems(); // Reload items
        } else {
            throw new Error(result.error || 'Delete failed');
        }
        
    } catch (error) {
        console.error('Delete error:', error);
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        deleteButton.disabled = false;
        deleteButton.textContent = originalText;
    }
}

function closeDeleteModal() {
    hideModal('deleteModalOverlay');
    deleteItemId = null;
}

// Toggle visibility function
async function toggleItemVisibility(itemId) {
    const item = items.find(i => i.id == itemId);
    if (!item) {
        showToast('Item not found', 'error');
        return;
    }
    
    const newHiddenStatus = !item.hidden;
    const action = newHiddenStatus ? 'hiding' : 'showing';
    
    try {
        const response = await fetch(`/admin/toggle-fragrance`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                id: parseInt(itemId), 
                hidden: newHiddenStatus 
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }
        
        if (result.success) {
            const actionPast = newHiddenStatus ? 'hidden' : 'shown';
            showToast(`Item ${actionPast} successfully!`, 'success');
            loadItems(); // Reload items
        } else {
            throw new Error(result.error || 'Visibility toggle failed');
        }
        
    } catch (error) {
        console.error('Toggle visibility error:', error);
        showToast(`Error ${action} item: ${error.message}`, 'error');
    }
}

// Pagination functions
function nextItemsPage() {
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (currentPage < totalPages) {
        currentPage++;
        displayItems();
    }
}

function previousItemsPage() {
    if (currentPage > 1) {
        currentPage--;
        displayItems();
    }
}

function updatePaginationInfo(start, end, total, totalPages) {
    const pageInfo = document.getElementById('itemsPageInfo');
    const totalCount = document.getElementById('itemsTotalCount');
    const prevBtn = document.getElementById('itemsPrevBtn');
    const nextBtn = document.getElementById('itemsNextBtn');
    
    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    if (totalCount) totalCount.textContent = total;
    
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    
    const pagination = document.getElementById('itemsPagination');
    if (pagination) {
        pagination.style.display = totalPages > 1 ? 'flex' : 'none';
    }
}

function generatePaginationControls(totalPages) {
    // Simple previous/next pagination for now
    updatePaginationInfo((currentPage - 1) * itemsPerPage + 1, 
                        Math.min(currentPage * itemsPerPage, items.length), 
                        items.length, totalPages);
}

// UI State Functions
function showLoadingState() {
    document.getElementById('itemsLoading').style.display = 'block';
    document.getElementById('itemsError').style.display = 'none';
    document.getElementById('itemsEmpty').style.display = 'none';
    document.getElementById('itemsContent').style.display = 'none';
}

function showErrorState(message) {
    document.getElementById('itemsLoading').style.display = 'none';
    document.getElementById('itemsError').style.display = 'block';
    document.getElementById('itemsEmpty').style.display = 'none';
    document.getElementById('itemsContent').style.display = 'none';
    
    const errorMessage = document.querySelector('#itemsError p');
    if (errorMessage) {
        errorMessage.textContent = message || 'Failed to load items. Please check your connection and try again.';
    }
}

function showEmptyState() {
    document.getElementById('itemsLoading').style.display = 'none';
    document.getElementById('itemsError').style.display = 'none';
    document.getElementById('itemsEmpty').style.display = 'block';
    document.getElementById('itemsContent').style.display = 'none';
}

function showNoResultsState() {
    document.getElementById('itemsLoading').style.display = 'none';
    document.getElementById('itemsError').style.display = 'none';
    document.getElementById('itemsEmpty').style.display = 'block';
    document.getElementById('itemsContent').style.display = 'none';
    
    const emptyTitle = document.querySelector('#itemsEmpty h3');
    const emptyDescription = document.querySelector('#itemsEmpty p');
    
    if (emptyTitle) emptyTitle.textContent = 'No Items Found';
    if (emptyDescription) emptyDescription.textContent = 'No fragrance items match your search criteria.';
}

function showItemsContent() {
    document.getElementById('itemsLoading').style.display = 'none';
    document.getElementById('itemsError').style.display = 'none';
    document.getElementById('itemsEmpty').style.display = 'none';
    document.getElementById('itemsContent').style.display = 'block';
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Modal utility functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Toast notification function
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Add to document
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
}