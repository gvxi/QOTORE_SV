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
                console.log(`${checkbox} ${this.checked ? 'enabled' : 'disabled'}`);
            });
        }
    });
    
    // Full bottle checkbox (no price field)
    const fullBottleCheckbox = document.getElementById('enableFullBottle');
    if (fullBottleCheckbox) {
        fullBottleCheckbox.addEventListener('change', function() {
            console.log(`Full bottle ${this.checked ? 'enabled' : 'disabled'}`);
        });
    }
}

// MISSING FUNCTION ADDED: Reset all variant fields
function resetVariantFields() {
    console.log('🔄 Resetting variant fields...');
    
    // Reset 5ml variant
    const enable5ml = document.getElementById('enable5ml');
    const price5ml = document.getElementById('price5ml');
    if (enable5ml) {
        enable5ml.checked = false;
    }
    if (price5ml) {
        price5ml.disabled = true;
        price5ml.value = '';
    }
    
    // Reset 10ml variant
    const enable10ml = document.getElementById('enable10ml');
    const price10ml = document.getElementById('price10ml');
    if (enable10ml) {
        enable10ml.checked = false;
    }
    if (price10ml) {
        price10ml.disabled = true;
        price10ml.value = '';
    }
    
    // Reset 30ml variant
    const enable30ml = document.getElementById('enable30ml');
    const price30ml = document.getElementById('price30ml');
    if (enable30ml) {
        enable30ml.checked = false;
    }
    if (price30ml) {
        price30ml.disabled = true;
        price30ml.value = '';
    }
    
    // Reset full bottle variant
    const enableFullBottle = document.getElementById('enableFullBottle');
    if (enableFullBottle) {
        enableFullBottle.checked = false;
    }
    
    console.log('✅ Variant fields reset complete');
}

// Data loading and processing
async function loadItems() {
    console.log('📦 Loading items...');
    const loadingEl = document.getElementById('loadingState');
    const contentEl = document.getElementById('contentContainer');
    
    if (loadingEl) loadingEl.style.display = 'block';
    if (contentEl) contentEl.style.display = 'none';
    
    try {
        const response = await fetch('/api/admin/items');
        
        if (!response.ok) {
            if (response.status === 401) {
                showToast('Authentication failed. Please log in again.', 'error');
                window.location.href = '/admin/login.html';
                return;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success && Array.isArray(result.data)) {
            items = result.data;
            console.log(`✅ Loaded ${items.length} items`);
            
            updateStats();
            applyFiltersAndPagination();
        } else {
            throw new Error(result.error || 'Invalid response format');
        }
        
    } catch (error) {
        console.error('💥 Load items error:', error);
        showToast('Failed to load items: ' + error.message, 'error');
        items = [];
    } finally {
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) contentEl.style.display = 'block';
    }
}

function updateStats() {
    const totalItems = items.length;
    const visibleItems = items.filter(item => !item.hidden).length;
    const hiddenItems = items.filter(item => item.hidden).length;
    
    // Update stat displays
    const totalStat = document.getElementById('totalItems');
    const visibleStat = document.getElementById('visibleItems');
    const hiddenStat = document.getElementById('hiddenItems');
    
    if (totalStat) totalStat.textContent = totalItems;
    if (visibleStat) visibleStat.textContent = visibleItems;
    if (hiddenStat) hiddenStat.textContent = hiddenItems;
}

function applyFiltersAndPagination() {
    // Apply search and filter
    filteredItems = items.filter(item => {
        const matchesSearch = !currentSearchTerm || 
            item.name.toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
            item.brand.toLowerCase().includes(currentSearchTerm.toLowerCase());
        
        const matchesFilter = currentFilter === 'all' ||
            (currentFilter === 'visible' && !item.hidden) ||
            (currentFilter === 'hidden' && item.hidden);
        
        return matchesSearch && matchesFilter;
    });
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredItems.length);
    const pageItems = filteredItems.slice(startIndex, endIndex);
    
    // Render content
    renderItems(pageItems);
    renderPagination(totalPages);
    
    // Update results info
    const resultsInfo = document.getElementById('resultsInfo');
    if (resultsInfo) {
        resultsInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${filteredItems.length} items`;
    }
}

function renderItems(pageItems) {
    if (window.innerWidth <= 768) {
        renderMobileItems(pageItems);
    } else {
        renderTableItems(pageItems);
    }
}

function renderTableItems(pageItems) {
    const itemsList = document.getElementById('itemsList');
    
    // Add cache buster timestamp for images
    const cacheBuster = Date.now();
    
    itemsList.innerHTML = `
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 80px;">Image</th>
                    <th>Details</th>
                    <th style="width: 200px;">Variants</th>
                    <th style="width: 100px;">Status</th>
                    <th style="width: 150px;">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${pageItems.map(item => `
                    <tr class="${item.hidden ? 'hidden-item' : ''}">
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
                                <p class="item-description">${(item.description || 'No description').substring(0, 100)}${item.description && item.description.length > 100 ? '...' : ''}</p>
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
                                        onclick="toggleItemVisibility('${item.id}', ${item.hidden})">
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
    
    // Add cache buster timestamp for images
    const cacheBuster = Date.now();
    
    const cards = pageItems.map(item => createItemCard(item, cacheBuster)).join('');
    itemsList.innerHTML = `<div class="items-grid mobile">${cards}</div>`;
}

function createItemCard(item, cacheBuster = Date.now()) {
    const card = `
        <div class="item-card ${item.hidden ? 'hidden-item' : ''}">
            <div class="item-image">
                ${item.image_path ? 
                    `<img src="/api/image/${item.image_path}?v=${cacheBuster}" alt="${item.name}" loading="lazy">` :
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
                        onclick="toggleItemVisibility('${item.id}', ${item.hidden})">
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
        console.log('🔄 Toggle item visibility called:', { 
            itemId, 
            newVisibility, 
            willBeHidden: !newVisibility,
            action: newVisibility ? 'show' : 'hide'
        });
        
        const response = await fetch('/api/admin/items/toggle-visibility', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: parseInt(itemId),
                hidden: !newVisibility // Toggle the value
            })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                showToast('Authentication failed. Please log in again.', 'error');
                window.location.href = '/admin/login.html';
                return;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Update local data
            const item = items.find(i => i.id == itemId);
            if (item) {
                item.hidden = !newVisibility;
            }
            
            updateStats();
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

// FIXED populateForm function - prevent variant duplication
function populateForm(item) {
    console.log('Populating form with item:', item);
    
    // Basic fields
    document.getElementById('itemName').value = item.name || '';
    document.getElementById('itemBrand').value = item.brand || '';
    document.getElementById('itemDescription').value = item.description || '';
    document.getElementById('itemHidden').checked = item.hidden || false;
    
    // FIXED: Reset ALL variant checkboxes and price fields first
    resetVariantFields();
    
    // FIXED: Populate variants from database using correct field names
    if (item.variants && item.variants.length > 0) {
        item.variants.forEach(variant => {
            if (variant.is_whole_bottle) {
                document.getElementById('enableFullBottle').checked = true;
            } else if (variant.size_ml || variant.size) {
                // Handle both size_ml (database) and size (processed) fields
                const sizeValue = variant.size_ml || parseInt(variant.size);
                
                switch (sizeValue) {
                    case 5:
                        document.getElementById('enable5ml').checked = true;
                        document.getElementById('price5ml').disabled = false;
                        // Use price_cents if available, otherwise use processed price
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

// FIXED: Updated resetForm function
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
        ${imageUrl ? `<img src="${imageUrl}" alt="${item.name}" style="max-width: 100px; height: auto; border-radius: 4px;">` : ''}
    `;
    
    showModal('deleteModalOverlay');
}

async function confirmDelete() {
    if (!deleteItemId) {
        showToast('No item selected for deletion', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/items/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: parseInt(deleteItemId)
            })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                showToast('Authentication failed. Please log in again.', 'error');
                window.location.href = '/admin/login.html';
                return;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            items = items.filter(item => item.id != deleteItemId);
            showToast('Item deleted successfully', 'success');
            updateStats();
            applyFiltersAndPagination();
            closeDeleteModal();
        } else {
            throw new Error(result.error || 'Failed to delete item');
        }
        
    } catch (error) {
        console.error('💥 Delete item error:', error);
        showToast('Failed to delete item: ' + error.message, 'error');
    }
}

function closeDeleteModal() {
    hideModal('deleteModalOverlay');
    deleteItemId = null;
}

// Form handling and validation
async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
    }
    
    // Find save button
    const saveButton = document.querySelector('#itemForm button[type="submit"]');
    const saveButtonText = document.getElementById('saveButtonText') || 
        (saveButton && saveButton.querySelector('span') ? saveButton.querySelector('span') : saveButton);
    
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
            variants: [] // FIXED: Always start with empty array
        };
        
        if (currentEditingId) {
            formData.id = parseInt(currentEditingId);
            formData.slug = generateSlug(formData.name);
        }
        
        // FIXED: Only add variants that are actually checked
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
        
        // Create FormData for file upload
        const submitData = new FormData();
        submitData.append('data', JSON.stringify(formData));
        
        // Add image if selected
        const imageInput = document.getElementById('itemImage');
        if (imageInput && imageInput.files.length > 0) {
            submitData.append('image', imageInput.files[0]);
        }
        
        const url = currentEditingId ? '/api/admin/items/update' : '/api/admin/items/create';
        const response = await fetch(url, {
            method: 'POST',
            body: submitData
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                showToast('Authentication failed. Please log in again.', 'error');
                window.location.href = '/admin/login.html';
                return;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`Item ${currentEditingId ? 'updated' : 'created'} successfully`, 'success');
            closeItemModal();
            await loadItems(); // Reload items to show changes
        } else {
            throw new Error(result.error || 'Failed to save item');
        }
        
    } catch (error) {
        console.error('💥 Form submission error:', error);
        showToast('Failed to save item: ' + error.message, 'error');
    } finally {
        // Restore button state
        saveButton.disabled = false;
        saveButtonText.textContent = originalText;
    }
}

function validateForm() {
    const errors = [];
    let isValid = true;
    
    // Required fields
    const itemName = document.getElementById('itemName');
    if (!itemName.value.trim()) {
        errors.push('Item name is required');
        if (itemName) addFieldError(itemName);
        isValid = false;
    } else {
        if (itemName) removeFieldError(itemName);
    }
    
    const itemBrand = document.getElementById('itemBrand');
    if (!itemBrand.value.trim()) {
        errors.push('Brand is required');
        if (itemBrand) addFieldError(itemBrand);
        isValid = false;
    } else {
        if (itemBrand) removeFieldError(itemBrand);
    }
    
    // Image validation (required for new items)
    const itemImage = document.getElementById('itemImage');
    if (!currentEditingId && (!itemImage || !itemImage.files || !itemImage.files.length)) {
        errors.push('Item image is required');
        if (itemImage) addFieldError(itemImage);
        isValid = false;
    } else {
        if (itemImage) removeFieldError(itemImage);
    }
    
    // Variants validation
    const hasVariants = document.getElementById('enable5ml').checked ||
                       document.getElementById('enable10ml').checked ||
                       document.getElementById('enable30ml').checked ||
                       document.getElementById('enableFullBottle').checked;
    
    if (!hasVariants) {
        errors.push('At least one variant must be selected');
        isValid = false;
    }
    
    // Price validation for enabled variants
    const variants = [
        { checkbox: 'enable5ml', price: 'price5ml', name: '5ml' },
        { checkbox: 'enable10ml', price: 'price10ml', name: '10ml' },
        { checkbox: 'enable30ml', price: 'price30ml', name: '30ml' }
    ];
    
    variants.forEach(variant => {
        const checkbox = document.getElementById(variant.checkbox);
        const priceInput = document.getElementById(variant.price);
        
        if (checkbox && checkbox.checked && priceInput) {
            const price = parseFloat(priceInput.value);
            if (!price || price <= 0) {
                errors.push(`${variant.name} price must be greater than 0`);
                addFieldError(priceInput);
                isValid = false;
            } else {
                removeFieldError(priceInput);
            }
        }
    });
    
    // Show errors if any
    if (errors.length > 0) {
        showToast(errors.join('. '), 'error', 6000);
    }
    
    return isValid;
}

function addFieldError(field) {
    field.style.borderColor = '#dc3545';
    field.style.boxShadow = '0 0 0 3px rgba(220, 53, 69, 0.1)';
}

function removeFieldError(field) {
    field.style.borderColor = '#e9ecef';
    field.style.boxShadow = 'none';
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

function generateSlug(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function updatePreviews() {
    const itemNameInput = document.getElementById('itemName');
    const slugPreview = document.getElementById('slugPreview');
    const filenamePreview = document.getElementById('filenamePreview');
    
    if (!itemNameInput) return;
    
    const name = itemNameInput.value.trim();
    
    if (name) {
        const slug = generateSlug(name);
        
        if (slugPreview) {
            slugPreview.textContent = slug || 'item-slug';
        }
        
        if (filenamePreview) {
            filenamePreview.textContent = `${slug || 'item-name'}.png`;
        }
    } else {
        if (slugPreview) slugPreview.textContent = 'item-slug';
        if (filenamePreview) filenamePreview.textContent = 'item-name.png';
    }
}

function handleImagePreview(e) {
    const file = e.target.files[0];
    
    if (!file) {
        removeImagePreview();
        return;
    }
    
    // Validation
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
function showToast(message, type = 'info', duration = 4000) {
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
    
    // Auto remove after duration
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}