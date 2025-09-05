// Items Management Script - COMPLETELY FIXED VERSION
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
    
    // Setup variant checkbox listeners
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

// Setup variant checkbox listeners
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
    
    const slugPreview = document.getElementById('slugPreview');
    const imageNamePreview = document.getElementById('imageNamePreview');
    
    if (slugPreview) slugPreview.textContent = slug;
    if (imageNamePreview) imageNamePreview.textContent = `${slug}.png`;
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
            <tr>
                <td colspan="5" style="text-align: center; padding: 3rem;">
                    <div class="empty-state">
                        <div class="empty-icon">📦</div>
                        <div class="empty-title">No items found</div>
                        <div class="empty-subtitle">
                            ${currentSearchTerm ? 'Try different search terms' : 'Add your first fragrance to get started'}
                        </div>
                        ${!currentSearchTerm ? '<button class="btn-primary" onclick="openAddItemModal()">Add First Item</button>' : ''}
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // FIXED: Only render table rows, not complete table
    renderTableRows(pageItems);
}

// FIXED: Separate function to render only table rows
function renderTableRows(pageItems) {
    const itemsList = document.getElementById('itemsList');
    const cacheBuster = Date.now();
    
    itemsList.innerHTML = pageItems.map(item => `
        <tr class="item-row ${item.hidden ? 'hidden-item' : ''}">
            <td>
                <div class="item-image">
                    ${item.image_path ? 
                        `<img src="/api/image/${item.image_path}?v=${cacheBuster}" alt="${item.name}" loading="lazy">` :
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
                    <button class="btn-small btn-edit" onclick="editItem(${item.id})">Edit</button>
                    <button class="btn-small ${item.hidden ? 'btn-show' : 'btn-hide'}" 
                            onclick="toggleItemVisibility(${item.id}, ${!item.hidden})">
                        ${item.hidden ? 'Show' : 'Hide'}
                    </button>
                    <button class="btn-small btn-delete" onclick="deleteItem(${item.id})">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function getVariantsDisplay(variants) {
    if (!variants || variants.length === 0) {
        return '<span class="no-variants">No variants</span>';
    }
    
    return variants.map(variant => {
        if (variant.is_whole_bottle) {
            return '<span class="variant-tag whole-bottle">Full Bottle (Contact)</span>';
        } else {
            const size = variant.size_ml ? `${variant.size_ml}ml` : (variant.size || 'Unknown');
            const price = variant.price_cents ? 
                `${(variant.price_cents / 1000).toFixed(3)} OMR` : 
                (variant.price ? `${variant.price.toFixed(3)} OMR` : 'Contact');
            return `<span class="variant-tag">${size} - ${price}</span>`;
        }
    }).join(' ');
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
        console.log('🔄 Toggle item visibility called:', { 
            itemId, 
            newVisibility, 
            willBeHidden: !newVisibility,
            action: newVisibility ? 'hide' : 'show'
        });
        
        const response = await fetch('/admin/toggle-fragrance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ 
                id: parseInt(itemId),
                hidden: newVisibility
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Toggle response:', result);
        
        if (result.success) {
            // Update local data
            const itemIndex = items.findIndex(item => item.id == itemId);
            if (itemIndex !== -1) {
                items[itemIndex].hidden = newVisibility;
            }
            
            const actionPerformed = newVisibility ? 'hidden' : 'shown';
            showToast(`Item ${actionPerformed} successfully`, 'success');
            
            // Force re-render to update button states and styling
            applyFiltersAndPagination();
        } else {
            throw new Error(result.error || 'Failed to update visibility');
        }
        
    } catch (error) {
        console.error('💥 Toggle visibility error:', error);
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

// Populate form function
function populateForm(item) {
    console.log('Populating form with item:', item);
    
    // Basic fields
    document.getElementById('itemName').value = item.name || '';
    document.getElementById('itemBrand').value = item.brand || '';
    document.getElementById('itemDescription').value = item.description || '';
    document.getElementById('itemHidden').checked = item.hidden || false;
    
    // Reset ALL variant checkboxes and price fields first
    resetVariantFields();
    
    // Populate variants from database
    if (item.variants && item.variants.length > 0) {
        item.variants.forEach(variant => {
            if (variant.is_whole_bottle) {
                document.getElementById('enableFullBottle').checked = true;
            } else if (variant.size_ml || variant.size) {
                const sizeValue = variant.size_ml || parseInt(variant.size);
                
                switch (sizeValue) {
                    case 5:
                        document.getElementById('enable5ml').checked = true;
                        document.getElementById('price5ml').disabled = false;
                        const price5 = variant.price_cents ? (variant.price_cents / 1000) : variant.price;
                        document.getElementById('price5ml').value = price5.toFixed(3);
                        break;
                    case 10:
                        document.getElementById('enable10ml').checked = true;
                        document.getElementById('price10ml').disabled = false;
                        const price10 = variant.price_cents ? (variant.price_cents / 1000) : variant.price;
                        document.getElementById('price10ml').value = price10.toFixed(3);
                        break;
                    case 30:
                        document.getElementById('enable30ml').checked = true;
                        document.getElementById('price30ml').disabled = false;
                        const price30 = variant.price_cents ? (variant.price_cents / 1000) : variant.price;
                        document.getElementById('price30ml').value = price30.toFixed(3);
                        break;
                    default:
                        console.warn(`Unknown variant size: ${sizeValue}ml`);
                }
            }
        });
    }
    
    // Show current image if exists
    if (item.image_path) {
        const imagePreview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');
        const imageInput = document.getElementById('itemImage');
        
        if (imagePreview && previewImg) {
            previewImg.src = `/api/image/${item.image_path}?v=${Date.now()}`;
            imagePreview.style.display = 'block';
            if (imageInput) imageInput.required = false;
        }
    }
    
    updatePreviews();
    console.log('Form populated successfully');
}

// Reset variant fields function
function resetVariantFields() {
    const variants = [
        { checkbox: 'enable5ml', priceField: 'price5ml' },
        { checkbox: 'enable10ml', priceField: 'price10ml' },
        { checkbox: 'enable30ml', priceField: 'price30ml' },
        { checkbox: 'enableFullBottle', priceField: null }
    ];
    
    variants.forEach(({ checkbox, priceField }) => {
        const checkboxEl = document.getElementById(checkbox);
        const priceFieldEl = priceField ? document.getElementById(priceField) : null;
        
        if (checkboxEl) {
            checkboxEl.checked = false;
        }
        
        if (priceFieldEl) {
            priceFieldEl.value = '';
            priceFieldEl.disabled = true;
        }
    });
}

// Reset form function
function resetForm() {
    const form = document.getElementById('itemForm');
    if (form) form.reset();
    
    // Reset variant fields
    resetVariantFields();
    
    const imageInput = document.getElementById('itemImage');
    if (imageInput) imageInput.required = true;
    
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
    const imageUrl = item.image_path ? `/api/image/${item.image_path}?v=${Date.now()}` : null;
    
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
    
    const deleteButton = document.querySelector('#deleteModalOverlay .btn-danger');
    const originalText = deleteButton.textContent;
    
    deleteButton.disabled = true;
    deleteButton.innerHTML = '<div class="loading-spinner"></div> Deleting...';
    
    try {
        console.log('🗑️ Deleting item with ID:', deleteItemId);
        
        const response = await fetch('/admin/delete-fragrance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ id: parseInt(deleteItemId) })
        });
        
        console.log('🌐 Delete response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Delete response error:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('📨 Delete response data:', result);
        
        if (result.success) {
            // Remove from local data
            items = items.filter(item => item.id != deleteItemId);
            
            showToast('Item deleted successfully', 'success');
            closeDeleteModal();
            applyFiltersAndPagination();
            
            console.log('✅ Item removed from local data and UI updated');
        } else {
            throw new Error(result.error || 'Failed to delete item');
        }
        
    } catch (error) {
        console.error('💥 Delete error:', error);
        showToast('Failed to delete item: ' + error.message, 'error');
    } finally {
        deleteButton.disabled = false;
        deleteButton.textContent = originalText;
    }
}

function closeDeleteModal() {
    hideModal('deleteModalOverlay');
    deleteItemId = null;
}

// FIXED: Form submission with proper image upload
async function handleFormSubmit(e) {
    e.preventDefault();
    
    let saveButton = document.getElementById('saveItemBtn') || 
                    document.querySelector('[onclick="saveItem()"]') ||
                    e.target.querySelector('button[type="submit"]') ||
                    document.querySelector('.btn-primary');
    
    let saveButtonText = document.getElementById('saveButtonText') ||
                        (saveButton ? saveButton.querySelector('span') || saveButton : null);
    
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
        const formData = {
            name: document.getElementById('itemName').value.trim(),
            brand: document.getElementById('itemBrand').value.trim(),
            description: document.getElementById('itemDescription').value.trim(),
            hidden: document.getElementById('itemHidden').checked,
            variants: [] // Always start with empty array
        };
        
        if (currentEditingId) {
            formData.id = parseInt(currentEditingId);
            formData.slug = generateSlug(formData.name);
        }
        
        // FIXED: Handle image upload if file is selected
        const imageInput = document.getElementById('itemImage');
        if (imageInput && imageInput.files && imageInput.files.length > 0) {
            const imageFile = imageInput.files[0];
            
            // Validate image
            if (!imageFile.type.includes('png')) {
                throw new Error('Only PNG images are allowed');
            }
            
            if (imageFile.size > 5 * 1024 * 1024) {
                throw new Error('Image too large. Maximum size is 5MB.');
            }
            
            // Upload image first
            const slug = generateSlug(formData.name);
            const imageFormData = new FormData();
            imageFormData.append('image', imageFile);
            imageFormData.append('slug', slug);
            
            console.log('🖼️ Uploading image...');
            saveButtonText.innerHTML = '<div class="loading-spinner"></div> Uploading image...';
            
            const imageResponse = await fetch('/admin/upload-image', {
                method: 'POST',
                credentials: 'include',
                body: imageFormData
            });
            
            if (!imageResponse.ok) {
                const imageError = await imageResponse.json();
                throw new Error(`Image upload failed: ${imageError.error || 'Unknown error'}`);
            }
            
            const imageResult = await imageResponse.json();
            if (imageResult.success) {
                // FIXED: Use only the filename, not the full path
                formData.image_path = imageResult.data.filename; // Use filename instead of path
                console.log('✅ Image uploaded successfully, using filename:', imageResult.data.filename);
            } else {
                throw new Error('Image upload failed');
            }
        }
        
        // Only add variants that are actually checked
        if (document.getElementById('enable5ml').checked) {
            const price5ml = parseFloat(document.getElementById('price5ml').value);
            if (!isNaN(price5ml) && price5ml > 0) {
                formData.variants.push({
                    size_ml: 5,
                    price_cents: Math.round(price5ml * 1000),
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
        
        console.log('📤 Submitting form data:', formData);
        saveButtonText.innerHTML = '<div class="loading-spinner"></div> Saving item...';
        
        // Submit the form
        let endpoint, method;
        if (currentEditingId) {
            endpoint = '/admin/update-fragrance';
            method = 'POST';
        } else {
            endpoint = '/admin/add-fragrance';
            method = 'POST';
        }
        
        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showToast(currentEditingId ? 'Item updated successfully!' : 'Item added successfully!', 'success');
            closeItemModal();
            loadItems(); // Reload the items list
        } else {
            throw new Error(result.error || result.message || 'Failed to save item');
        }
        
    } catch (error) {
        console.error('💥 Form submission error:', error);
        showToast('Failed to save item: ' + error.message, 'error');
    } finally {
        // Re-enable button
        saveButton.disabled = false;
        saveButtonText.textContent = originalText;
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

// Toggle variant price function
function toggleVariantPrice(variant) {
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
            priceId = null; // Full bottle doesn't have price input
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
function showToast(message, type = 'info', duration = 5000) {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 1rem 1.5rem;
        margin-bottom: 0.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 100%;
        word-wrap: break-word;
    `;
    
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `
        <span>${icon}</span>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

    // Refresh function
async function refreshData() {
    console.log('🔄 Refreshing data...');
    
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        const originalContent = refreshBtn.innerHTML;
        
        // Add refreshing state with spinning animation
        refreshBtn.classList.add('refreshing');
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="animation: spin 1s linear infinite;">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6 0-3.31 2.69-6 6-6 1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
            <span>Refreshing...</span>
        `;
        
        // Add spin animation style if not exists
        if (!document.getElementById('spin-animation')) {
            const style = document.createElement('style');
            style.id = 'spin-animation';
            style.textContent = `
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        try {
            // Call loadItems to refresh the data and images
            await loadItems();
            showToast('Items refreshed successfully', 'success');
        } catch (error) {
            console.error('Refresh failed:', error);
            showToast('Failed to refresh items', 'error');
        } finally {
            // Remove refreshing state after a short delay
            setTimeout(() => {
                refreshBtn.classList.remove('refreshing');
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = originalContent;
            }, 1000);
        }
    } else {
        // If no refresh button found, just reload the data
        await loadItems();
        showToast('Data refreshed', 'success');
    }
}