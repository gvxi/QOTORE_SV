// Items Management Script - Updated for New Design
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
    
    // Setup variant checkbox event listeners
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
    
    // Real-time slug preview
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
                
                // Update variant option styling
                const variantOption = priceFieldEl.closest('.variant-option');
                if (variantOption) {
                    if (this.checked) {
                        variantOption.classList.add('selected');
                    } else {
                        variantOption.classList.remove('selected');
                    }
                }
                
                console.log(`${checkbox} ${this.checked ? 'enabled' : 'disabled'} ${priceField}`);
            });
        }
    });
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
            updateStats();
            applyFiltersAndPagination();
        } else {
            console.warn('Invalid response structure:', data);
            items = [];
            renderItems([]);
        }
        
    } catch (error) {
        console.error('Failed to load items:', error);
        showToast('Failed to load items. Please check your connection and try again.', 'error');
        renderItems([]);
    } finally {
        if (loadingSpinner) loadingSpinner.style.display = 'none';
    }
}

// Update dashboard stats
function updateStats() {
    const totalItems = items.length;
    const visibleItems = items.filter(item => !item.hidden).length;
    const hiddenItems = items.filter(item => item.hidden).length;
    
    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('visibleItems').textContent = visibleItems;
    document.getElementById('hiddenItems').textContent = hiddenItems;
}

// Apply filters and pagination
function applyFiltersAndPagination() {
    // Filter items
    filteredItems = items.filter(item => {
        // Search filter
        if (currentSearchTerm) {
            const searchLower = currentSearchTerm.toLowerCase();
            const matchesSearch = (item.name || '').toLowerCase().includes(searchLower) ||
                                 (item.brand || '').toLowerCase().includes(searchLower) ||
                                 (item.description || '').toLowerCase().includes(searchLower);
            if (!matchesSearch) return false;
        }
        
        // Status filter
        if (currentFilter === 'visible') return !item.hidden;
        if (currentFilter === 'hidden') return item.hidden;
        
        return true; // 'all' filter
    });
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = filteredItems.slice(startIndex, endIndex);
    
    // Render
    renderItems(pageItems);
    renderPagination(totalPages);
}

// Render items
function renderItems(pageItems) {
    const itemsList = document.getElementById('itemsList');
    
    if (!pageItems || pageItems.length === 0) {
        itemsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-spray-can"></i>
                </div>
                <div class="empty-title">
                    ${currentSearchTerm ? 'No items found' : 'No items yet'}
                </div>
                <div class="empty-subtitle">
                    ${currentSearchTerm ? 
                        'Try different search terms' : 'Add your first fragrance to get started'}
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
    
    // Add cache buster timestamp for images
    const cacheBuster = Date.now();
    
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
    const cacheBuster = Date.now();
    
    itemsList.innerHTML = `
        <div class="items-cards">
            ${pageItems.map(item => createMobileCard(item, cacheBuster)).join('')}
        </div>
    `;
}

function createMobileCard(item, cacheBuster) {
    return `
        <div class="item-card ${item.hidden ? 'hidden-item' : ''}">
            <div class="card-header">
                <div class="card-image">
                    ${item.image_path ? 
                        `<img src="/api/image/${item.image_path}?v=${cacheBuster}" alt="${item.name}" loading="lazy">` :
                        '<div class="no-image">No Image</div>'
                    }
                </div>
                <div class="card-content">
                    <h4 class="card-title">${item.name || 'Unnamed Item'}</h4>
                    <p class="card-brand">${item.brand || 'No brand'}</p>
                </div>
            </div>
            <div class="card-description">
                ${(item.description || 'No description').substring(0, 150)}${(item.description && item.description.length > 150) ? '...' : ''}
            </div>
            <div class="card-variants">
                ${getVariantsDisplay(item.variants)}
            </div>
            <div class="card-status">
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
        return `${variant.size}ml - ${price}`;
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

// Refresh data function
async function refreshData() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.classList.add('refreshing');
    }
    
    try {
        await loadItems();
        showToast('Data refreshed successfully', 'success');
    } catch (error) {
        console.error('Failed to refresh data:', error);
        showToast('Failed to refresh data', 'error');
    } finally {
        if (refreshBtn) {
            refreshBtn.classList.remove('refreshing');
        }
    }
}

// Toggle item visibility
async function toggleItemVisibility(itemId, currentlyHidden) {
    try {
        console.log('🔄 Toggle item visibility called:', { 
            itemId, 
            currentlyHidden, 
            willBeHidden: !currentlyHidden,
            action: currentlyHidden ? 'show' : 'hide'
        });
        
        const response = await fetch(`/admin/fragrances/${itemId}/toggle-visibility`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ hidden: !currentlyHidden })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/admin/login';
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Visibility toggle result:', result);
        
        if (result.success) {
            // Update local data
            const itemIndex = items.findIndex(item => item.id == itemId);
            if (itemIndex !== -1) {
                items[itemIndex].hidden = !currentlyHidden;
                console.log(`Item ${itemId} updated locally: hidden = ${items[itemIndex].hidden}`);
            }
            
            const actionPerformed = currentlyHidden ? 'shown' : 'hidden';
            showToast(`Item ${actionPerformed} successfully`, 'success');
            
            // Update stats and re-render
            updateStats();
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
    document.getElementById('submitText').textContent = 'Add Item';
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
    document.getElementById('submitText').textContent = 'Update Item';
    
    // Populate form with item data
    populateForm(item);
    showModal('itemModalOverlay');
}

function populateForm(item) {
    console.log('Populating form with item:', item);
    
    // Basic fields
    document.getElementById('itemName').value = item.name || '';
    document.getElementById('itemBrand').value = item.brand || '';
    document.getElementById('itemDescription').value = item.description || '';
    
    // Reset all variant checkboxes and price fields first
    document.getElementById('enable5ml').checked = false;
    document.getElementById('enable10ml').checked = false;
    document.getElementById('enable30ml').checked = false;
    document.getElementById('enableFull').checked = false;
    
    document.getElementById('price5ml').value = '';
    document.getElementById('price10ml').value = '';
    document.getElementById('price30ml').value = '';
    
    document.getElementById('price5ml').disabled = true;
    document.getElementById('price10ml').disabled = true;
    document.getElementById('price30ml').disabled = true;
    
    // Reset variant option styling
    document.querySelectorAll('.variant-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Populate variants if they exist
    if (item.variants && Array.isArray(item.variants)) {
        item.variants.forEach(variant => {
            if (variant.is_whole_bottle) {
                const fullCheckbox = document.getElementById('enableFull');
                if (fullCheckbox) {
                    fullCheckbox.checked = true;
                    const variantOption = fullCheckbox.closest('.variant-option');
                    if (variantOption) variantOption.classList.add('selected');
                }
            } else {
                const size = variant.size_ml || variant.size;
                const price = variant.price || (variant.price_cents ? variant.price_cents / 1000 : 0);
                
                if (size == 5) {
                    const checkbox = document.getElementById('enable5ml');
                    const priceInput = document.getElementById('price5ml');
                    if (checkbox && priceInput) {
                        checkbox.checked = true;
                        priceInput.disabled = false;
                        priceInput.value = price.toFixed(3);
                        const variantOption = checkbox.closest('.variant-option');
                        if (variantOption) variantOption.classList.add('selected');
                    }
                } else if (size == 10) {
                    const checkbox = document.getElementById('enable10ml');
                    const priceInput = document.getElementById('price10ml');
                    if (checkbox && priceInput) {
                        checkbox.checked = true;
                        priceInput.disabled = false;
                        priceInput.value = price.toFixed(3);
                        const variantOption = checkbox.closest('.variant-option');
                        if (variantOption) variantOption.classList.add('selected');
                    }
                } else if (size == 30) {
                    const checkbox = document.getElementById('enable30ml');
                    const priceInput = document.getElementById('price30ml');
                    if (checkbox && priceInput) {
                        checkbox.checked = true;
                        priceInput.disabled = false;
                        priceInput.value = price.toFixed(3);
                        const variantOption = checkbox.closest('.variant-option');
                        if (variantOption) variantOption.classList.add('selected');
                    }
                }
            }
        });
    }
    
    updatePreviews();
}

// Form handling functions
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn') || e.target.querySelector('button[type="submit"]');
    const submitText = document.getElementById('submitText') || submitBtn?.querySelector('span') || submitBtn;
    
    if (!submitBtn || !submitText) {
        console.error('Could not find submit button or text element');
        showToast('Internal error: Could not find submit button', 'error');
        return;
    }
    
    const originalText = submitText.textContent;
    
    // Disable button and show loading
    submitBtn.disabled = true;
    submitText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    try {
        // Create JSON payload
        const formData = {
            name: document.getElementById('itemName').value.trim(),
            brand: document.getElementById('itemBrand').value.trim(),
            description: document.getElementById('itemDescription').value.trim(),
            variants: []
        };
        
        // Add current editing ID if updating
        if (currentEditingId) {
            formData.id = parseInt(currentEditingId);
            formData.slug = generateSlug(formData.name);
        }
        
        // Handle variants based on checkboxes
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
        
        if (document.getElementById('enableFull').checked) {
            formData.variants.push({
                size_ml: null,
                price_cents: null,
                is_whole_bottle: true
            });
        }
        
        // Validate form
        if (!formData.name) {
            throw new Error('Item name is required');
        }
        
        if (formData.variants.length === 0) {
            throw new Error('At least one variant must be selected');
        }
        
        console.log('Submitting form data:', formData);
        
        // Handle image upload if present
        const imageFile = document.getElementById('itemImage').files[0];
        let imageUploadResult = null;
        
        if (imageFile) {
            console.log('Uploading image:', imageFile.name);
            const imageFormData = new FormData();
            imageFormData.append('image', imageFile);
            imageFormData.append('slug', generateSlug(formData.name));
            
            const imageResponse = await fetch('/admin/upload-image', {
                method: 'POST',
                credentials: 'include',
                body: imageFormData
            });
            
            if (!imageResponse.ok) {
                throw new Error('Failed to upload image');
            }
            
            imageUploadResult = await imageResponse.json();
            console.log('Image upload result:', imageUploadResult);
            
            if (imageUploadResult.success) {
                formData.image_path = imageUploadResult.filename;
            }
        }
        
        // Submit form data
        const url = currentEditingId 
            ? `/admin/fragrances/${currentEditingId}` 
            : '/admin/fragrances';
        const method = currentEditingId ? 'PUT' : 'POST';
        
        console.log(`Submitting to ${method} ${url}`);
        
        const response = await fetch(url, {
            method: method,
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/admin/login';
                return;
            }
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Form submission result:', result);
        
        if (result.success) {
            const action = currentEditingId ? 'updated' : 'added';
            showToast(`Item ${action} successfully`, 'success');
            closeItemModal();
            await loadItems(); // Reload items to get updated data
        } else {
            throw new Error(result.error || 'Unknown error occurred');
        }
        
    } catch (error) {
        console.error('Form submission error:', error);
        showToast('Error: ' + error.message, 'error');
    } finally {
        // Re-enable button and restore text
        submitBtn.disabled = false;
        submitText.textContent = originalText;
    }
}

// Image preview handling
function handleImagePreview(event) {
    const file = event.target.files[0];
    const previewDiv = document.getElementById('imagePreview');
    
    if (!previewDiv) return;
    
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewDiv.innerHTML = `
                <img src="${e.target.result}" alt="Preview" class="preview-image">
                <p style="margin-top: 0.5rem; font-size: 0.8rem; color: #6c757d;">Preview: ${file.name}</p>
            `;
        };
        reader.readAsDataURL(file);
    } else {
        previewDiv.innerHTML = '';
    }
}

// Delete item functions
function deleteItem(itemId) {
    deleteItemId = itemId;
    showModal('deleteModalOverlay');
}

async function confirmDelete() {
    if (!deleteItemId) return;
    
    try {
        const response = await fetch(`/admin/fragrances/${deleteItemId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/admin/login';
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Item deleted successfully', 'success');
            closeDeleteModal();
            await loadItems(); // Reload items
        } else {
            throw new Error(result.error || 'Failed to delete item');
        }
        
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Failed to delete item: ' + error.message, 'error');
    }
}

// Modal utility functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeItemModal() {
    const modal = document.getElementById('itemModalOverlay');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
    resetForm();
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteModalOverlay');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
    deleteItemId = null;
}

function resetForm() {
    const form = document.getElementById('itemForm');
    if (form) {
        form.reset();
    }
    
    // Reset checkboxes and disable price fields
    ['enable5ml', 'enable10ml', 'enable30ml', 'enableFull'].forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) checkbox.checked = false;
    });
    
    ['price5ml', 'price10ml', 'price30ml'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.disabled = true;
            input.value = '';
        }
    });
    
    // Reset variant option styling
    document.querySelectorAll('.variant-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Clear image preview
    const previewDiv = document.getElementById('imagePreview');
    if (previewDiv) {
        previewDiv.innerHTML = '';
    }
    
    updatePreviews();
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
    const itemName = document.getElementById('itemName').value || 'new-item';
    const slug = generateSlug(itemName);
    
    const slugPreview = document.getElementById('slugPreview');
    if (slugPreview) {
        slugPreview.textContent = slug;
    }
}

function generateSlug(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

// Toast notification function
function showToast(message, type = 'success') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'exclamation-triangle' : 
                 'info-circle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 3000);
}