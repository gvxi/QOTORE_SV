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
        
        const response = await fetch('/functions/admin/fragrances', {
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
                                    `<img src="/storage/fragrance-images/${item.image_path}" alt="${item.name}" loading="lazy">` :
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
    
    itemsList.innerHTML = pageItems.map(item => createMobileCard(item)).join('');
}

function createMobileCard(item) {
    const card = document.createElement('div');
    card.className = `mobile-item-card ${item.hidden ? 'hidden-item' : ''}`;
    
    const imageUrl = item.image_path ? `/storage/fragrance-images/${item.image_path}` : null;
    
    card.innerHTML = `
        <div class="mobile-card-header">
            <div class="mobile-card-main">
                <h4>${item.name || 'Unnamed Item'}</h4>
                <p class="brand">${item.brand || 'No brand'}</p>
                <p class="description">${(item.description || 'No description').substring(0, 80)}${(item.description && item.description.length > 80) ? '...' : ''}</p>
                <span class="status-badge ${item.hidden ? 'status-hidden' : 'status-visible'}">
                    ${item.hidden ? 'Hidden' : 'Visible'}
                </span>
            </div>
            ${imageUrl ? `
            <div>
                <strong>Image</strong>
                <img src="${imageUrl}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd;">
            </div>
            ` : ''}
        </div>
        <div class="mobile-card-variants">
            <strong>Variants:</strong>
            ${getVariantsDisplay(item.variants)}
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
        const response = await fetch('/functions/admin/toggle-visibility', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                id: itemId,
                hidden: !newVisibility
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Update local data
            const itemIndex = items.findIndex(item => item.id == itemId);
            if (itemIndex !== -1) {
                items[itemIndex].hidden = !newVisibility;
            }
            
            showToast(`Item ${newVisibility ? 'shown' : 'hidden'} successfully`, 'success');
            applyFiltersAndPagination();
        } else {
            throw new Error(result.error || 'Failed to update visibility');
        }
        
    } catch (error) {
        console.error('Toggle visibility error:', error);
        showToast('Failed to update item visibility', 'error');
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
    
    // FIXED: Process variants correctly
    const variants = item.variants || [];
    console.log('Processing variants:', variants);
    
    variants.forEach(variant => {
        console.log('Processing variant:', variant);
        
        if (variant.is_whole_bottle) {
            document.getElementById('enableFullBottle').checked = true;
        } else {
            // FIXED: Handle both size_ml (from database) and size (processed) fields
            let size_ml = null;
            
            if (variant.size_ml && typeof variant.size_ml === 'number') {
                // Direct from database
                size_ml = variant.size_ml;
            } else if (variant.size && typeof variant.size === 'string') {
                // From processed data (e.g., "5ml" -> 5)
                const sizeMatch = variant.size.match(/(\d+)ml/);
                size_ml = sizeMatch ? parseInt(sizeMatch[1]) : null;
            }
            
            if (size_ml && variant.price && typeof variant.price === 'number') {
                console.log(`Found ${size_ml}ml variant with price ${variant.price} OMR`);
                
                switch(size_ml) {
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
    const imageUrl = item.image_path ? `/storage/fragrance-images/${item.image_path}` : null;
    
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
        const response = await fetch('/functions/admin/delete-fragrance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ id: deleteItemId })
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

// Form handling functions
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const saveButton = document.getElementById('saveItemBtn') || e.target.querySelector('button[type="submit"]');
    const saveButtonText = document.getElementById('saveButtonText') || saveButton.querySelector('span') || saveButton;
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
        
        // FIXED: Variant handling based on checkboxes
        const variants = [];
        
        // Check each variant checkbox and add if enabled with valid price
        if (document.getElementById('enable5ml').checked) {
            const price5ml = parseFloat(document.getElementById('price5ml').value);
            if (!isNaN(price5ml) && price5ml > 0) {
                variants.push({
                    size_ml: 5,
                    price_cents: Math.round(price5ml * 1000), // Convert OMR to fils
                    is_whole_bottle: false
                });
            }
        }
        
        if (document.getElementById('enable10ml').checked) {
            const price10ml = parseFloat(document.getElementById('price10ml').value);
            if (!isNaN(price10ml) && price10ml > 0) {
                variants.push({
                    size_ml: 10,
                    price_cents: Math.round(price10ml * 1000), // Convert OMR to fils
                    is_whole_bottle: false
                });
            }
        }
        
        if (document.getElementById('enable30ml').checked) {
            const price30ml = parseFloat(document.getElementById('price30ml').value);
            if (!isNaN(price30ml) && price30ml > 0) {
                variants.push({
                    size_ml: 30,
                    price_cents: Math.round(price30ml * 1000), // Convert OMR to fils
                    is_whole_bottle: false
                });
            }
        }
        
        if (document.getElementById('enableFullBottle').checked) {
            variants.push({
                size_ml: null,
                price_cents: null,
                is_whole_bottle: true
            });
        }
        
        if (variants.length === 0) {
            throw new Error('At least one variant must be enabled');
        }
        
        formData.append('variants', JSON.stringify(variants));
        
        // Add ID for updates
        if (currentEditingId) {
            formData.append('id', currentEditingId);
        }
        
        const url = currentEditingId ? 
            '/functions/admin/update-fragrance' : 
            '/functions/admin/add-fragrance';
            
        const response = await fetch(url, {
            method: 'POST',
            credentials: 'include',
            body: formData
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
        saveButton.disabled = false;
        saveButtonText.textContent = originalText;
    }
}

async function saveItem() {
    const form = document.getElementById('itemForm');
    if (form) {
        const event = new Event('submit');
        form.dispatchEvent(event);
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
        const firstInput = modal.querySelector('input, textarea, select');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Toast notification system
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
    
    // Animate in
    setTimeout(() => toast.classList.add('show'), 10);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
    `;
    document.body.appendChild(container);
    return container;
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // ESC to close modals
    if (e.key === 'Escape') {
        const visibleModal = document.querySelector('.modal-overlay[style*="flex"]');
        if (visibleModal) {
            if (visibleModal.id === 'itemModalOverlay') {
                closeItemModal();
            } else if (visibleModal.id === 'deleteModalOverlay') {
                closeDeleteModal();
            }
        }
    }
    
    // Ctrl/Cmd + N for new item
    if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        openAddItemModal();
    }
});

// Window resize handler for responsive layout
let resizeTimeout;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        applyFiltersAndPagination();
    }, 250);
});

// Online/offline status handling
window.addEventListener('online', function() {
    showToast('Connection restored', 'success');
    loadItems();
});

window.addEventListener('offline', function() {
    showToast('You are offline. Some features may not work.', 'warning');
});

// Visibility change handling (for PWA)
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && items.length === 0) {
        loadItems();
    }
});

// Export for debugging
window.itemsManagement = {
    loadItems,
    items,
    filteredItems,
    currentPage,
    toggleItemVisibility,
    populateForm,
    resetForm
};

console.log('✅ Items Management Script loaded successfully');