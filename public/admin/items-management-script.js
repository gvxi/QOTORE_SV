// Global variables
let items = [];
let currentEditingId = null;
let deleteItemId = null;

// Initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('Items Management loaded');
    loadItems();
    setupFormEvents();
    setupVariantToggling();
});

// Setup variant toggling functionality
function setupVariantToggling() {
    const variants = ['5ml', '10ml', '30ml'];
    
    variants.forEach(variant => {
        const checkbox = document.getElementById(`enable${variant}`);
        const priceInput = document.getElementById(`price${variant}`);
        
        if (checkbox && priceInput) {
            // Enable/disable price input based on checkbox
            checkbox.addEventListener('change', function() {
                priceInput.disabled = !this.checked;
                if (!this.checked) {
                    priceInput.value = '';
                }
            });
        }
    });
}

// Setup form events
function setupFormEvents() {
    const form = document.getElementById('itemForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // Setup file preview
    const imageInput = document.getElementById('itemImage');
    if (imageInput) {
        imageInput.addEventListener('change', handleImagePreview);
    }
    
    // Setup slug preview
    const nameInput = document.getElementById('itemName');
    if (nameInput) {
        nameInput.addEventListener('input', updateSlugPreview);
    }
}

// Image preview handling
function handleImagePreview(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            showImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);
    }
}

function showImagePreview(src) {
    const preview = document.getElementById('imagePreview');
    const img = document.getElementById('previewImg');
    if (preview && img) {
        img.src = src;
        preview.style.display = 'block';
    }
}

function removeImagePreview() {
    const preview = document.getElementById('imagePreview');
    const imageInput = document.getElementById('itemImage');
    if (preview) {
        preview.style.display = 'none';
    }
    if (imageInput) {
        imageInput.value = '';
        imageInput.required = currentEditingId ? false : true;
    }
}

// Slug preview
function updateSlugPreview() {
    const nameInput = document.getElementById('itemName');
    const slugPreview = document.getElementById('slugPreview');
    const imageNamePreview = document.getElementById('imageNamePreview');
    
    if (nameInput && slugPreview && imageNamePreview) {
        const slug = nameInput.value.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        
        slugPreview.textContent = slug || 'creed-aventus';
        imageNamePreview.textContent = (slug || 'creed-aventus') + '.png';
    }
}

// Load items from server
async function loadItems() {
    try {
        showLoading(true);
        const response = await fetch('/admin/fragrances');
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            items = result.data || [];
            console.log('Loaded items:', items.length);
            displayItems();
        } else {
            throw new Error(result.error || 'Failed to load items');
        }
        
    } catch (error) {
        console.error('Error loading items:', error);
        showToast('Failed to load items: ' + error.message, 'error');
        items = [];
        displayItems();
    } finally {
        showLoading(false);
    }
}

// Display items in grid
function displayItems() {
    const grid = document.getElementById('itemsGrid');
    if (!grid) return;
    
    if (items.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📦</div>
                <h3>No items found</h3>
                <p>Start by adding your first fragrance item.</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = '';
    items.forEach(item => {
        const card = createItemCard(item);
        grid.appendChild(card);
    });
}

// Create item card element
function createItemCard(item) {
    const card = document.createElement('div');
    card.className = 'item-card';
    
    const imageUrl = item.image_path ? `/storage/fragrance-images/${item.image_path}` : '/placeholder.png';
    const statusClass = item.hidden ? 'hidden' : 'visible';
    const statusText = item.hidden ? 'Hidden' : 'Visible';
    
    card.innerHTML = `
        <div class="item-image">
            <img src="${imageUrl}" alt="${item.name}" loading="lazy">
            <div class="item-status ${statusClass}">${statusText}</div>
        </div>
        <div class="item-info">
            <h3 class="item-name">${item.name}</h3>
            <p class="item-brand">${item.brand || 'Unknown Brand'}</p>
            <div class="item-variants">
                ${getVariantsDisplay(item.variants)}
            </div>
        </div>
        <div class="item-actions">
            <button class="btn-small btn-primary" onclick="editItem('${item.id}')">Edit</button>
            <button class="btn-small ${item.hidden ? 'btn-success' : 'btn-warning'}" onclick="toggleVisibility('${item.id}')">
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
        // Use both size_ml and size fields for compatibility
        const size = variant.size || `${variant.size_ml}ml`;
        const price = variant.price ? `${variant.price.toFixed(3)} OMR` : 'No price';
        return `${size} - ${price}`;
    });
    
    return variantTexts.join('<br>');
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
    ['5ml', '10ml', '30ml'].forEach(size => {
        const checkbox = document.getElementById(`enable${size}`);
        const priceInput = document.getElementById(`price${size}`);
        
        if (checkbox) checkbox.checked = false;
        if (priceInput) {
            priceInput.value = '';
            priceInput.disabled = true;
        }
    });
    
    document.getElementById('enableFullBottle').checked = false;
    
    // FIXED: Populate variant prices with correct logic
    const variants = item.variants || [];
    console.log('Processing variants:', variants);
    
    variants.forEach(variant => {
        console.log('Processing variant:', variant);
        
        if (variant.is_whole_bottle) {
            document.getElementById('enableFullBottle').checked = true;
        } else {
            // Use size_ml directly from database or extract from size string
            let size_ml = variant.size_ml;
            
            // Fallback: if size_ml is not available, try to extract from size string
            if (!size_ml && variant.size) {
                const sizeMatch = variant.size.match(/(\d+)ml/);
                size_ml = sizeMatch ? parseInt(sizeMatch[1]) : null;
            }
            
            if (size_ml && variant.price !== undefined && variant.price !== null) {
                const priceOMR = variant.price; // Already in OMR from backend
                console.log(`Setting ${size_ml}ml price to ${priceOMR} OMR`);
                
                const checkbox = document.getElementById(`enable${size_ml}ml`);
                const priceInput = document.getElementById(`price${size_ml}ml`);
                
                if (checkbox && priceInput) {
                    checkbox.checked = true;
                    priceInput.disabled = false;
                    priceInput.value = priceOMR.toFixed(3);
                }
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
            if (imageInput) imageInput.required = false; // Don't require new image for edit
        }
    }
}

function resetForm() {
    const form = document.getElementById('itemForm');
    if (form) form.reset();
    
    // Reset all variant checkboxes and inputs
    ['5ml', '10ml', '30ml'].forEach(size => {
        const checkbox = document.getElementById(`enable${size}`);
        const priceInput = document.getElementById(`price${size}`);
        
        if (checkbox) checkbox.checked = false;
        if (priceInput) {
            priceInput.value = '';
            priceInput.disabled = true;
        }
    });
    
    const imageInput = document.getElementById('itemImage');
    if (imageInput) imageInput.required = true; // Require image for new items
    
    removeImagePreview();
    updateSlugPreview();
}

function closeItemModal() {
    hideModal('itemModalOverlay');
    resetForm();
    currentEditingId = null;
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
        
        // FIXED: Variant prices - check checkboxes first, then get prices
        const variants = [];
        
        // Check each variant checkbox and add if enabled with valid price
        ['5ml', '10ml', '30ml'].forEach(size => {
            const sizeNum = parseInt(size);
            const checkbox = document.getElementById(`enable${size}`);
            const priceInput = document.getElementById(`price${size}`);
            
            if (checkbox && checkbox.checked && priceInput) {
                const price = parseFloat(priceInput.value);
                if (!isNaN(price) && price > 0) {
                    variants.push({
                        size_ml: sizeNum,
                        price_cents: Math.round(price * 1000), // Convert OMR to fils
                        is_whole_bottle: false
                    });
                }
            }
        });
        
        // Check full bottle
        if (document.getElementById('enableFullBottle').checked) {
            variants.push({
                size_ml: null,
                price_cents: null,
                is_whole_bottle: true
            });
        }
        
        console.log('Submitting variants:', variants);
        
        if (variants.length === 0) {
            throw new Error('At least one variant must be selected');
        }
        
        formData.append('variants', JSON.stringify(variants));
        
        // Add ID for updates
        if (currentEditingId) {
            formData.append('id', currentEditingId);
        }
        
        const url = currentEditingId ? '/admin/update-fragrance' : '/admin/add-fragrance';
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success || response.ok) {
            showToast(currentEditingId ? 'Item updated successfully!' : 'Item added successfully!', 'success');
            closeItemModal();
            await loadItems(); // Reload items
        } else {
            throw new Error(result.error || 'Failed to save item');
        }
        
    } catch (error) {
        console.error('Error saving item:', error);
        showToast('Error: ' + error.message, 'error');
    } finally {
        // Re-enable button
        saveButton.disabled = false;
        saveButtonText.textContent = originalText;
    }
}

// Save item function (called by button onclick)
function saveItem() {
    const form = document.getElementById('itemForm');
    if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
}

// Delete item functions
function deleteItem(itemId) {
    const item = items.find(i => i.id == itemId);
    if (!item) {
        showToast('Item not found', 'error');
        return;
    }
    
    deleteItemId = itemId;
    
    // Populate delete preview
    const preview = document.getElementById('deleteItemPreview');
    const imageUrl = item.image_path ? `/storage/fragrance-images/${item.image_path}` : '/placeholder.png';
    
    preview.innerHTML = `
        <div class="item-preview">
            <img src="${imageUrl}" alt="${item.name}">
            <div>
                <strong>${item.name}</strong>
                <br>
                <small>${item.brand || 'Unknown Brand'}</small>
            </div>
        </div>
    `;
    
    showModal('deleteModalOverlay');
}

async function confirmDelete() {
    if (!deleteItemId) return;
    
    try {
        const deleteButton = document.querySelector('#deleteModalOverlay .btn-delete');
        deleteButton.disabled = true;
        deleteButton.textContent = 'Deleting...';
        
        const formData = new FormData();
        formData.append('id', deleteItemId);
        
        const response = await fetch('/admin/delete-fragrance', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success || response.ok) {
            showToast('Item deleted successfully!', 'success');
            closeDeleteModal();
            await loadItems(); // Reload items
        } else {
            throw new Error(result.error || 'Failed to delete item');
        }
        
    } catch (error) {
        console.error('Error deleting item:', error);
        showToast('Error: ' + error.message, 'error');
    } finally {
        const deleteButton = document.querySelector('#deleteModalOverlay .btn-delete');
        if (deleteButton) {
            deleteButton.disabled = false;
            deleteButton.textContent = 'Yes, Delete';
        }
    }
}

function closeDeleteModal() {
    hideModal('deleteModalOverlay');
    deleteItemId = null;
}

// Toggle visibility
async function toggleVisibility(itemId) {
    const item = items.find(i => i.id == itemId);
    if (!item) {
        showToast('Item not found', 'error');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('id', itemId);
        formData.append('hidden', !item.hidden);
        
        const response = await fetch('/admin/update-fragrance', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success || response.ok) {
            showToast(`Item ${item.hidden ? 'shown' : 'hidden'} successfully!`, 'success');
            await loadItems(); // Reload items
        } else {
            throw new Error(result.error || 'Failed to update visibility');
        }
        
    } catch (error) {
        console.error('Error updating visibility:', error);
        showToast('Error: ' + error.message, 'error');
    }
}

// Utility functions
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

function showLoading(show) {
    const grid = document.getElementById('itemsGrid');
    if (!grid) return;
    
    if (show) {
        grid.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading items...</p>
            </div>
        `;
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
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Hide and remove toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
}

// Check authentication status
function isAuthenticated() {
    const cookies = document.cookie.split(';');
    const sessionCookie = cookies.find(c => c.trim().startsWith('admin_session='));
    return !!sessionCookie;
}