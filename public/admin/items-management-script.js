// Items Management Script - FIXED VERSION
let items = [];
let filteredItems = [];
let currentPage = 1;
const itemsPerPage = 10;
let currentSearchTerm = '';
let currentFilter = 'all';
let currentEditingId = null;
let deleteItemId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Items management loaded');
    loadItems();
    setupEventListeners();
});

function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            currentSearchTerm = e.target.value;
            currentPage = 1;
            applyFiltersAndPagination();
        }, 300));
    }
    
    // Filter functionality
    const filterSelect = document.getElementById('statusFilter');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            currentFilter = e.target.value;
            currentPage = 1;
            applyFiltersAndPagination();
        });
    }
    
    // Form submission
    const itemForm = document.getElementById('itemForm');
    if (itemForm) {
        itemForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Image preview
    const imageInput = document.getElementById('itemImage');
    if (imageInput) {
        imageInput.addEventListener('change', handleImagePreview);
    }
    
    // FIXED: Add variant checkbox event listeners
    setupVariantCheckboxListeners();
    
    // Modal close handlers
    const modalOverlay = document.getElementById('itemModalOverlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === modalOverlay) {
                closeItemModal();
            }
        });
    }
    
    const deleteModalOverlay = document.getElementById('deleteModalOverlay');
    if (deleteModalOverlay) {
        deleteModalOverlay.addEventListener('click', function(e) {
            if (e.target === deleteModalOverlay) {
                closeDeleteModal();
            }
        });
    }
    
    // Real-time slug and filename preview
    const itemNameInput = document.getElementById('itemName');
    if (itemNameInput) {
        itemNameInput.addEventListener('input', updatePreviews);
    }
    
    updatePreviews(); // Initial preview
}

// FIXED: Setup variant checkbox listeners
function setupVariantCheckboxListeners() {
    const variantCheckboxes = [
        { checkbox: 'enable5ml', priceField: 'price5ml' },
        { checkbox: 'enable10ml', priceField: 'price10ml' },
        { checkbox: 'enable30ml', priceField: 'price30ml' }
    ];
    
    variantCheckboxes.forEach(({ checkbox, priceField }) => {
        const checkboxEl = document.getElementById(checkbox);
        const priceFieldEl = document.getElementById(priceField);
        
        if (checkboxEl && priceFieldEl) {
            checkboxEl.addEventListener('change', function() {
                priceFieldEl.disabled = !this.checked;
                if (!this.checked) {
                    priceFieldEl.value = '';
                }
                console.log(`${checkbox} ${this.checked ? 'enabled' : 'disabled'} ${priceField}`);
            });
        }
    });
}

// Utility functions
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

function updatePreviews() {
    const itemName = document.getElementById('itemName').value || 'creed-aventus';
    const slug = generateSlug(itemName);
    
    document.getElementById('slugPreview').textContent = slug;
    document.getElementById('imageNamePreview').textContent = `${slug}.png`;
}

function generateSlug(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

// Data loading functions
async function loadItems() {
    const itemsList = document.getElementById('itemsList');
    const loadingSpinner = document.getElementById('loadingSpinner');
    
    if (loadingSpinner) loadingSpinner.style.display = 'flex';
    
    try {
        console.log('Loading items from admin API...');
        
        const response = await fetch('/admin/fragrances', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/admin/login';
                return;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Items loaded successfully:', data);
        
        if (data.success && Array.isArray(data.data)) {
            items = data.data;
            console.log(`Loaded ${items.length} items for admin management`);
            applyFiltersAndPagination();
        } else {
            console.warn('Invalid response structure:', data);
            items = [];
            renderItems([]);
        }
        
    } catch (error) {
        console.error('Failed to load items:', error);
        showToast('Failed to load items. Please check your connection and try again.', 'error');
        items = [];
        renderItems([]);
    } finally {
        if (loadingSpinner) loadingSpinner.style.display = 'none';
    }
}

function applyFiltersAndPagination() {
    let filtered = [...items];
    
    // Apply search filter
    if (currentSearchTerm) {
        const searchLower = currentSearchTerm.toLowerCase();
        filtered = filtered.filter(item => 
            (item.name && item.name.toLowerCase().includes(searchLower)) ||
            (item.brand && item.brand.toLowerCase().includes(searchLower)) ||
            (item.description && item.description.toLowerCase().includes(searchLower))
        );
    }
    
    // Apply status filter
    if (currentFilter !== 'all') {
        filtered = filtered.filter(item => {
            if (currentFilter === 'visible') return !item.hidden;
            if (currentFilter === 'hidden') return item.hidden;
            return true;
        });
    }
    
    filteredItems = filtered;
    
    // Update pagination info
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startItem = (currentPage - 1) * itemsPerPage;
    const endItem = startItem + itemsPerPage;
    const pageItems = filteredItems.slice(startItem, endItem);
    
    renderItems(pageItems);
    renderPagination(totalPages);
}

function renderItems(pageItems) {
    const itemsList = document.getElementById('itemsList');
    const statsContainer = document.getElementById('statsContainer');
    
    if (!itemsList) return;
    
    // Update stats
    if (statsContainer) {
        const visibleCount = items.filter(item => !item.hidden).length;
        const hiddenCount = items.filter(item => item.hidden).length;
        
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${items.length}</div>
                <div class="stat-label">Total Items</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${visibleCount}</div>
                <div class="stat-label">Visible</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${hiddenCount}</div>
                <div class="stat-label">Hidden</div>
            </div>
        `;
    }
    
    if (pageItems.length === 0) {
        itemsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📦</div>
                <div class="empty-title">No items found</div>
                <div class="empty-subtitle">
                    ${currentSearchTerm ? 'Try different search terms' : 'Add your first fragrance to get started'}
                </div>
                ${!currentSearchTerm ? '<button class="btn-primary" onclick="openAddItemModal()">Add First Item</button>' : ''}
            </div>
        `;
        return;
    }
    
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        renderMobileItems(pageItems);
    } else {
        renderDesktopItems(pageItems);
    }
}

function renderDesktopItems(pageItems) {
    const itemsList = document.getElementById('itemsList');
    
    itemsList.innerHTML = `
        <table class="items-table">
            <thead>
                <tr>
                    <th>Image</th>
                    <th>Item Details</th>
                    <th>Variants</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${pageItems.map(item => `
                    <tr class="item-row ${item.hidden ? 'hidden-item' : ''}">
                        <td>
                            <div class="item-image">
                                ${item.image_path ? 
                                    `<img src="/api/image/${item.image_path}" alt="${item.name}" loading="lazy">` :
                                    '<div class="no-image">No Image</div>'
                                }
                            </div>
                        </td>
                        <td>
                            <div class="item-details">
                                <h4 class="item-name">${item.name || 'Unnamed Item'}</h4>
                                <p class="item-brand">${item.brand || 'No brand'}</p>
                                <p class="item-description">${(item.description || 'No description').substring(0, 100)}${(item.description && item.description.length > 100) ? '...' : ''}</p>
                            </div>
                        </td>
                        <td>
                            <div class="variants-info">
                                ${getVariantsDisplay(item.variants)}
                            </div>
                        </td>
                        <td>
                            <span class="status-badge ${item.hidden ? 'status-hidden' : 'status-visible'}">
                                ${item.hidden ? 'Hidden' : 'Visible'}
                            </span>
                        </td>
                        <td>
                            <div class="table-actions">
                                <button class="btn-small btn-edit" onclick="editItem('${item.id}')">Edit</button>
                                <button class="btn-small ${item.hidden ? 'btn-show' : 'btn-hide'}" 
                                        onclick="toggleItemVisibility('${item.id}', ${!item.hidden})">
                                    ${item.hidden ? 'Show' : 'Hide'}
                                </button>
                                <button class="btn-small btn-delete" onclick="deleteItem('${item.id}')">Delete</button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderMobileItems(pageItems) {
    const itemsList = document.getElementById('itemsList');
    
    const cards = pageItems.map(item => createItemCard(item)).join('');
    itemsList.innerHTML = `<div class="items-grid mobile">${cards}</div>`;
}

function createItemCard(item) {
    const card = `
        <div class="item-card ${item.hidden ? 'hidden-item' : ''}">
            <div class="item-image">
                ${item.image_path ? 
                    `<img src="/api/image/${item.image_path}" alt="${item.name}" loading="lazy">` :
                    '<div class="no-image">No Image</div>'
                }
            </div>
            <div class="item-details">
                <h4 class="item-name">${item.name || 'Unnamed Item'}</h4>
                <p class="item-brand">${item.brand || 'No brand'}</p>
                <div class="variants-info">
                    ${getVariantsDisplay(item.variants)}
                </div>
                <span class="status-badge ${item.hidden ? 'status-hidden' : 'status-visible'}">
                    ${item.hidden ? 'Hidden' : 'Visible'}
                </span>
            </div>
            <div class="card-actions">
                <button class="btn-small btn-edit" onclick="editItem('${item.id}')">Edit</button>
                <button class="btn-small ${item.hidden ? 'btn-show' : 'btn-hide'}" 
                        onclick="toggleItemVisibility('${item.id}', ${!item.hidden})">
                    ${item.hidden ? 'Show' : 'Hide'}
                </button>
                <button class="btn-small btn-delete" onclick="deleteItem('${item.id}')">Delete</button>
            </div>
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

function renderPagination(totalPages) {
    const paginationContainer = document.getElementById('paginationContainer');
    if (!paginationContainer || totalPages <= 1) {
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = '<div class="pagination">';
    
    // Previous button
    if (currentPage > 1) {
        paginationHTML += `<button class="pagination-btn" onclick="changePage(${currentPage - 1})">Previous</button>`;
    }
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'active' : '';
        paginationHTML += `<button class="pagination-btn ${activeClass}" onclick="changePage(${i})">${i}</button>`;
    }
    
    // Next button
    if (currentPage < totalPages) {
        paginationHTML += `<button class="pagination-btn" onclick="changePage(${currentPage + 1})">Next</button>`;
    }
    
    paginationHTML += '</div>';
    paginationContainer.innerHTML = paginationHTML;
}

function changePage(page) {
    currentPage = page;
    applyFiltersAndPagination();
    window.scrollTo(0, 0);
}

async function toggleItemVisibility(itemId, newVisibility) {
    try {
        console.log('Toggle item visibility:', { itemId, newVisibility, shouldHide: !newVisibility });
        
        const response = await fetch('/admin/toggle-fragrance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                id: parseInt(itemId),
                hidden: !newVisibility // if newVisibility is true (show), hidden should be false
            })
        });
        
        console.log('Toggle response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Toggle response error:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Toggle response data:', result);
        
        if (result.success) {
            // Update local data
            const itemIndex = items.findIndex(item => item.id == itemId);
            if (itemIndex !== -1) {
                items[itemIndex].hidden = !newVisibility;
                console.log('Updated local item hidden status to:', items[itemIndex].hidden);
            }
            
            showToast(`Item ${newVisibility ? 'shown' : 'hidden'} successfully`, 'success');
            applyFiltersAndPagination();
        } else {
            throw new Error(result.error || 'Failed to update visibility');
        }
        
    } catch (error) {
        console.error('Toggle visibility error:', error);
        showToast('Failed to update item visibility: ' + error.message, 'error');
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

// FIXED: Completely rewritten populateForm function
function populateForm(item) {
    console.log('Populating form with item:', item);
    
    // Basic fields
    document.getElementById('itemName').value = item.name || '';
    document.getElementById('itemBrand').value = item.brand || '';
    document.getElementById('itemDescription').value = item.description || '';
    document.getElementById('itemHidden').checked = item.hidden || false;
    
    // FIXED: Reset all variant checkboxes and price fields first
    document.getElementById('enable5ml').checked = false;
    document.getElementById('enable10ml').checked = false;
    document.getElementById('enable30ml').checked = false;
    document.getElementById('enableFullBottle').checked = false;
    
    document.getElementById('price5ml').value = '';
    document.getElementById('price10ml').value = '';
    document.getElementById('price30ml').value = '';
    
    // FIXED: Disable all price fields initially
    document.getElementById('price5ml').disabled = true;
    document.getElementById('price10ml').disabled = true;
    document.getElementById('price30ml').disabled = true;
    
    // FIXED: Populate variants from database
    if (item.variants && item.variants.length > 0) {
        item.variants.forEach(variant => {
            if (variant.is_whole_bottle) {
                document.getElementById('enableFullBottle').checked = true;
            } else if (variant.size_ml) {
                const size_ml = parseInt(variant.size_ml);
                switch (size_ml) {
                    case 5:
                        document.getElementById('enable5ml').checked = true;
                        document.getElementById('price5ml').disabled = false;
                        document.getElementById('price5ml').value = variant.price.toFixed(3);
                        break;
                    case 10:
                        document.getElementById('enable10ml').checked = true;
                        document.getElementById('price10ml').disabled = false;
                        document.getElementById('price10ml').value = variant.price.toFixed(3);
                        break;
                    case 30:
                        document.getElementById('enable30ml').checked = true;
                        document.getElementById('price30ml').disabled = false;
                        document.getElementById('price30ml').value = variant.price.toFixed(3);
                        break;
                    default:
                        console.warn(`Unknown variant size: ${size_ml}ml`);
                }
            } else {
                console.warn('Variant missing size_ml or price:', variant);
            }
        });
    }
    
    // Show current image if exists
    if (item.image_path) {
        const imagePreview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');
        const imageInput = document.getElementById('itemImage');
        
        if (imagePreview && previewImg) {
            previewImg.src = `/api/image/${item.image_path}`;
            imagePreview.style.display = 'block';
            if (imageInput) imageInput.required = false; // Don't require new image for edit
        }
    }
    
    // Update previews
    updatePreviews();
    
    console.log('Form populated successfully');
}

function resetForm() {
    const form = document.getElementById('itemForm');
    if (form) form.reset();
    
    // FIXED: Reset all checkboxes and disable price fields
    document.getElementById('enable5ml').checked = false;
    document.getElementById('enable10ml').checked = false;
    document.getElementById('enable30ml').checked = false;
    document.getElementById('enableFullBottle').checked = false;
    
    document.getElementById('price5ml').disabled = true;
    document.getElementById('price10ml').disabled = true;
    document.getElementById('price30ml').disabled = true;
    
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
    const imageUrl = item.image_path ? `/api/image/${item.image_path}` : null;
    
    preview.innerHTML = `
        <div class="item-info">
            <strong>${item.name || 'Unnamed Item'}</strong>
            <p>${item.brand || 'No brand'}</p>
            <p>${getVariantsDisplay(item.variants)}</p>
        </div>
        ${imageUrl ? `
        <div class="item-image-preview">
            <img src="${imageUrl}" alt="${item.name}">
        </div>
        ` : ''}
    `;
    
    showModal('deleteModalOverlay');
}

async function confirmDelete() {
    if (!deleteItemId) return;
    
    const deleteButton = document.querySelector('#deleteModalOverlay .btn-delete');
    const originalText = deleteButton.textContent;
    
    deleteButton.disabled = true;
    deleteButton.innerHTML = '<div class="loading-spinner"></div> Deleting...';
    
    try {
        const response = await fetch('/admin/delete-fragrance', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ id: parseInt(deleteItemId) })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Remove from local data
            items = items.filter(item => item.id != deleteItemId);
            
            showToast('Item deleted successfully', 'success');
            closeDeleteModal();
            applyFiltersAndPagination();
        } else {
            throw new Error(result.error || 'Failed to delete item');
        }
        
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Failed to delete item', 'error');
    } finally {
        deleteButton.disabled = false;
        deleteButton.textContent = originalText;
    }
}

function closeDeleteModal() {
    hideModal('deleteModalOverlay');
    deleteItemId = null;
}

// FIXED: Form handling functions
async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Find the save button more reliably
    let saveButton = document.getElementById('saveItemBtn');
    if (!saveButton) {
        saveButton = document.querySelector('[onclick="saveItem()"]');
    }
    if (!saveButton) {
        saveButton = e.target.querySelector('button[type="submit"]');
    }
    if (!saveButton) {
        saveButton = document.querySelector('.btn-primary');
    }
    
    let saveButtonText = document.getElementById('saveButtonText');
    if (!saveButtonText && saveButton) {
        saveButtonText = saveButton.querySelector('span') || saveButton;
    }
    
    if (!saveButton || !saveButtonText) {
        console.error('Could not find save button or save button text element');
        showToast('Internal error: Could not find save button', 'error');
        return;
    }
    
    const originalText = saveButtonText.textContent;
    
    // Disable button and show loading
    saveButton.disabled = true;
    saveButtonText.innerHTML = '<div class="loading-spinner"></div> Saving...';
    
    try {
        // FIXED: Create JSON payload instead of FormData
        const formData = {
            name: document.getElementById('itemName').value.trim(),
            brand: document.getElementById('itemBrand').value.trim(),
            description: document.getElementById('itemDescription').value.trim(),
            hidden: document.getElementById('itemHidden').checked,
            variants: []
        };
        
        // Add current editing ID if updating
        if (currentEditingId) {
            formData.id = parseInt(currentEditingId);
            formData.slug = generateSlug(formData.name);
        }
        
        // FIXED: Handle variants based on checkboxes
        if (document.getElementById('enable5ml').checked) {
            const price5ml = parseFloat(document.getElementById('price5ml').value);
            if (!isNaN(price5ml) && price5ml > 0) {
                formData.variants.push({
                    size_ml: 5,
                    price_cents: Math.round(price5ml * 1000), // Convert OMR to fils
                    is_whole_bottle: false
                });
            }
        }
        
        if (document.getElementById('enable10ml').checked) {
            const price10ml = parseFloat(document.getElementById('price10ml').value);
            if (!isNaN(price10ml) && price10ml > 0) {
                formData.variants.push({
                    size_ml: 10,
                    price_cents: Math.round(price10ml * 1000),
                    is_whole_bottle: false
                });
            }
        }
        
        if (document.getElementById('enable30ml').checked) {
            const price30ml = parseFloat(document.getElementById('price30ml').value);
            if (!isNaN(price30ml) && price30ml > 0) {
                formData.variants.push({
                    size_ml: 30,
                    price_cents: Math.round(price30ml * 1000),
                    is_whole_bottle: false
                });
            }
        }
        
        if (document.getElementById('enableFullBottle').checked) {
            formData.variants.push({
                size_ml: null,
                price_cents: null,
                is_whole_bottle: true
            });
        }
        
        // Validation
        if (!formData.name) {
            throw new Error('Item name is required');
        }
        
        if (formData.variants.length === 0) {
            throw new Error('At least one variant must be selected');
        }
        
        // Handle image upload separately if provided
        let imagePath = null;
        const imageInput = document.getElementById('itemImage');
        
        if (imageInput.files.length > 0) {
            // For updates: Delete old image first if it exists
            if (currentEditingId) {
                const item = items.find(i => i.id == currentEditingId);
                if (item && item.image_path) {
                    try {
                        console.log('Deleting old image:', item.image_path);
                        const deleteResponse = await fetch('/admin/delete-image', {
                            method: 'DELETE',
                            credentials: 'include',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ imagePath: item.image_path })
                        });
                        
                        const deleteResult = await deleteResponse.json();
                        if (deleteResult.success) {
                            console.log('Old image deleted successfully');
                        } else {
                            console.warn('Failed to delete old image (non-critical):', deleteResult.error);
                        }
                    } catch (deleteError) {
                        console.warn('Error deleting old image (non-critical):', deleteError);
                    }
                }
            }
            
            // Upload new image using your dedicated endpoint
            const imageFormData = new FormData();
            imageFormData.append('image', imageInput.files[0]);
            imageFormData.append('slug', generateSlug(formData.name));
            
            console.log('Uploading new image...');
            
            const imageResponse = await fetch('/admin/upload-image', {
                method: 'POST',
                credentials: 'include',
                body: imageFormData
            });
            
            if (!imageResponse.ok) {
                const imageError = await imageResponse.json().catch(() => null);
                throw new Error(imageError?.error || 'Failed to upload image');
            }
            
            const imageResult = await imageResponse.json();
            if (imageResult.success) {
                // Use the filename (slug.png) as the image path
                imagePath = imageResult.data.filename;
                console.log('New image uploaded successfully:', imagePath);
            } else {
                throw new Error(imageResult.error || 'Image upload failed');
            }
        }
        
        // Add image path to form data if we have one
        if (imagePath) {
            formData.image_path = imagePath;
        }
        
        console.log('Submitting form data:', formData);
        
        const url = currentEditingId ? 
            '/admin/update-fragrance' : 
            '/admin/add-fragrance';
            
        const response = await fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`Item ${currentEditingId ? 'updated' : 'created'} successfully`, 'success');
            closeItemModal();
            loadItems(); // Reload items to reflect changes
        } else {
            throw new Error(result.error || 'Failed to save item');
        }
        
    } catch (error) {
        console.error('Form submission error:', error);
        showToast(error.message || 'Failed to save item', 'error');
    } finally {
        if (saveButton) saveButton.disabled = false;
        if (saveButtonText) saveButtonText.textContent = originalText;
    }
}

async function saveItem() {
    const form = document.getElementById('itemForm');
    if (form) {
        // Create a mock event object
        const mockEvent = {
            preventDefault: () => {},
            target: form
        };
        
        // Call handleFormSubmit directly
        await handleFormSubmit(mockEvent);
    } else {
        console.error('Form not found');
        showToast('Internal error: Form not found', 'error');
    }
}

// Image handling functions
function handleImagePreview(e) {
    const file = e.target.files[0];
    if (file) {
        if (!file.type.includes('png')) {
            showToast('Only PNG images are allowed', 'error');
            e.target.value = '';
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image too large. Maximum size is 5MB', 'error');
            e.target.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const imagePreview = document.getElementById('imagePreview');
            const previewImg = document.getElementById('previewImg');
            
            if (imagePreview && previewImg) {
                previewImg.src = e.target.result;
                imagePreview.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    } else {
        removeImagePreview();
    }
}

function removeImagePreview() {
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const imageInput = document.getElementById('itemImage');
    
    if (imagePreview) imagePreview.style.display = 'none';
    if (previewImg) previewImg.src = '';
    if (imageInput && currentEditingId === null) {
        imageInput.required = true; // Require image for new items
    }
}

// Modal utility functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Focus on first input in modal
        setTimeout(() => {
            const firstInput = modal.querySelector('input[type="text"], textarea');
            if (firstInput) firstInput.focus();
        }, 100);
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Toast notifications
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer') || document.body;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
            <span class="toast-message">${message}</span>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 5000);
}