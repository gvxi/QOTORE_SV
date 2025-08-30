// Global Variables
let items = [];
let filteredItems = [];
let currentPage = 1;
let itemsPerPage = 10;
let currentEditingId = null;
let deleteItemId = null;
let currentSearchTerm = '';
let currentFilter = 'all';

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 Items Management initialized');
    
    // Set up event listeners
    setupEventListeners();
    setupFormValidation();
    setupModalEventListeners();
    
    // Load items
    loadItems();
});

// Event Listeners Setup
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchItems');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            currentSearchTerm = e.target.value;
            currentPage = 1; // Reset to first page
            applyFiltersAndPagination();
        });
    }
    
    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active to clicked button
            this.classList.add('active');
            
            currentFilter = this.dataset.filter;
            currentPage = 1; // Reset to first page
            applyFiltersAndPagination();
        });
    });
    
    // Pagination controls
    const prevBtn = document.querySelector('.pagination-prev');
    const nextBtn = document.querySelector('.pagination-next');
    
    if (prevBtn) prevBtn.addEventListener('click', previousItemsPage);
    if (nextBtn) nextBtn.addEventListener('click', nextItemsPage);
    
    // Items per page selector
    const itemsPerPageSelect = document.getElementById('itemsPerPageSelect');
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', function() {
            itemsPerPage = parseInt(this.value);
            currentPage = 1; // Reset to first page
            applyFiltersAndPagination();
        });
    }
    
    // Form submission
    const itemForm = document.getElementById('itemForm');
    if (itemForm) {
        itemForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Delete confirmation
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', confirmDeleteItem);
    }
}

// Form Validation Setup
function setupFormValidation() {
    // Name field auto-generate slug
    const nameInput = document.getElementById('itemName');
    const slugPreview = document.getElementById('slugPreview');
    const imageNamePreview = document.getElementById('imageNamePreview');
    
    if (nameInput && slugPreview) {
        nameInput.addEventListener('input', function() {
            const slug = generateSlug(this.value);
            slugPreview.textContent = slug || 'item-name';
            if (imageNamePreview) {
                imageNamePreview.textContent = (slug || 'item-name') + '.png';
            }
        });
    }
    
    // Image preview
    const imageInput = document.getElementById('itemImage');
    if (imageInput) {
        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (!file.type.includes('png')) {
                    showToast('Only PNG files are allowed', 'error');
                    this.value = '';
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
        });
    }
    
    // **FIXED: Variant checkbox logic**
    const variantCheckboxes = [
        { checkbox: 'enable5ml', price: 'price5ml' },
        { checkbox: 'enable10ml', price: 'price10ml' },
        { checkbox: 'enable30ml', price: 'price30ml' }
    ];
    
    variantCheckboxes.forEach(variant => {
        const checkbox = document.getElementById(variant.checkbox);
        const priceInput = document.getElementById(variant.price);
        
        if (checkbox && priceInput) {
            checkbox.addEventListener('change', function() {
                priceInput.disabled = !this.checked;
                if (!this.checked) {
                    priceInput.value = '';
                }
            });
        }
    });
}

// Generate slug from name
function generateSlug(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and hyphens with single hyphen
        .replace(/^-+|-+$/g, ''); // Remove leading and trailing hyphens
}

// Remove image preview
function removeImagePreview() {
    const imagePreview = document.getElementById('imagePreview');
    const imageInput = document.getElementById('itemImage');
    
    if (imagePreview) imagePreview.style.display = 'none';
    if (imageInput) {
        imageInput.value = '';
        imageInput.required = currentEditingId ? false : true;
    }
}

// Modal Functions Setup
function setupModalEventListeners() {
    // Close modals when clicking overlay
    const itemModalOverlay = document.getElementById('itemModalOverlay');
    if (itemModalOverlay) {
        itemModalOverlay.addEventListener('click', function(e) {
            if (e.target === itemModalOverlay) {
                closeItemModal();
            }
        });
    }
    
    const deleteModalOverlay = document.getElementById('deleteModalOverlay');
    if (deleteModalOverlay) {
        deleteModalOverlay.addEventListener('click', function(e) {
            if (e.target === deleteModalOverlay) {
                hideModal('deleteModalOverlay');
            }
        });
    }
}

// Load items from API
async function loadItems() {
    console.log('📥 Loading items...');
    showItemsLoading();
    
    try {
        const response = await fetch('/admin/fragrances', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Unknown error occurred');
        }
        
        items = result.data || [];
        console.log(`✅ Loaded ${items.length} items with variants:`, items);
        
        applyFiltersAndPagination();
        
    } catch (error) {
        console.error('❌ Error loading items:', error);
        showItemsError(error.message);
    }
}

// Apply filters and pagination
function applyFiltersAndPagination() {
    console.log(`🔍 Applying filters: search="${currentSearchTerm}", filter="${currentFilter}"`);
    
    // Apply search filter
    filteredItems = items.filter(item => {
        if (!currentSearchTerm) return true;
        
        const searchTerm = currentSearchTerm.toLowerCase();
        return item.name.toLowerCase().includes(searchTerm) ||
               (item.brand && item.brand.toLowerCase().includes(searchTerm)) ||
               (item.description && item.description.toLowerCase().includes(searchTerm));
    });
    
    // Apply status filter
    filteredItems = filteredItems.filter(item => {
        switch(currentFilter) {
            case 'visible':
                return !item.hidden;
            case 'hidden':
                return item.hidden;
            case 'all':
            default:
                return true;
        }
    });
    
    console.log(`📊 Filtered results: ${filteredItems.length} items`);
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredItems.length);
    const currentPageItems = filteredItems.slice(startIndex, endIndex);
    
    // Update display
    displayItems(currentPageItems);
    updatePaginationInfo(startIndex + 1, endIndex, filteredItems.length, totalPages);
    generatePaginationControls(totalPages);
    
    // Show/hide empty state
    if (filteredItems.length === 0) {
        showEmptyState();
    } else {
        document.getElementById('itemsLoading').style.display = 'none';
        document.getElementById('itemsError').style.display = 'none';
        document.getElementById('itemsEmpty').style.display = 'none';
        document.getElementById('itemsContent').style.display = 'none';
}

function showEmptyState() {
    const emptyState = document.getElementById('itemsEmpty');
    emptyState.querySelector('h3').textContent = 'No items yet';
    emptyState.querySelector('p').textContent = 'Start by adding your first fragrance item.';
    
    document.getElementById('itemsLoading').style.display = 'none';
    document.getElementById('itemsError').style.display = 'none';
    document.getElementById('itemsEmpty').style.display = 'block';
    document.getElementById('itemsContent').style.display = 'none';
}

// Modal utility functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// Toast notification system
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    const container = document.getElementById('toastContainer') || document.body;
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// HTML escape function
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return (text || '').replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Debug function to check data structure
function debugItemData(item) {
    console.log('=== DEBUG ITEM DATA ===');
    console.log('Item:', item);
    console.log('Variants:', item.variants);
    
    if (item.variants) {
        item.variants.forEach((variant, index) => {
            console.log(`Variant ${index}:`, {
                id: variant.id,
                size_ml: variant.size_ml,
                price_cents: variant.price_cents,
                size: variant.size,
                price: variant.price,
                is_whole_bottle: variant.is_whole_bottle
            });
        });
    }
    console.log('======================');
} 'block';
    }

// Display items in table and mobile cards
function displayItems(itemsToShow) {
    console.log('📺 Displaying items:', itemsToShow.length);
    
    // Update table
    const tableBody = document.querySelector('.items-table tbody');
    if (tableBody) {
        tableBody.innerHTML = '';
        
        itemsToShow.forEach(item => {
            const row = createTableRow(item);
            tableBody.appendChild(row);
        });
    }
    
    // Update mobile cards
    const mobileCards = document.getElementById('mobileItemCards');
    if (mobileCards) {
        mobileCards.innerHTML = '';
        
        itemsToShow.forEach(item => {
            const card = createMobileCard(item);
            mobileCards.appendChild(card);
        });
    }
}

// Create table row for item
function createTableRow(item) {
    const row = document.createElement('tr');
    const imageUrl = item.image_path ? `/storage/fragrance-images/${item.image_path}` : null;
    
    row.innerHTML = `
        <td class="image-cell">
            ${imageUrl ? 
                `<img src="${imageUrl}" alt="${item.name}" class="table-image" onerror="this.style.display='none'">` :
                '<div class="no-image">🌸</div>'
            }
        </td>
        <td>
            <div class="item-name">${escapeHtml(item.name)}</div>
            <div class="item-brand">${escapeHtml(item.brand || 'No Brand')}</div>
        </td>
        <td class="variants-cell">${getVariantsDisplay(item.variants)}</td>
        <td>
            <span class="status-badge ${item.hidden ? 'status-hidden' : 'status-visible'}">
                ${item.hidden ? 'Hidden' : 'Visible'}
            </span>
        </td>
        <td class="actions-cell">
            <button class="btn-small btn-edit" onclick="editItem('${item.id}')">Edit</button>
            <button class="btn-small ${item.hidden ? 'btn-show' : 'btn-hide'}" 
                    onclick="toggleItemVisibility('${item.id}', ${!item.hidden})">
                ${item.hidden ? 'Show' : 'Hide'}
            </button>
            <button class="btn-small btn-delete" onclick="deleteItem('${item.id}')">Delete</button>
        </td>
    `;
    
    return row;
}

// Create mobile card for item
function createMobileCard(item) {
    const card = document.createElement('div');
    card.className = 'mobile-card';
    const imageUrl = item.image_path ? `/storage/fragrance-images/${item.image_path}` : null;
    
    card.innerHTML = `
        <div class="mobile-card-header">
            <div class="mobile-card-image">
                ${imageUrl ? 
                    `<img src="${imageUrl}" alt="${item.name}" onerror="this.style.display='none'">` :
                    '<div class="no-image">🌸</div>'
                }
            </div>
            <div class="mobile-card-title">
                <div class="item-name">${escapeHtml(item.name)}</div>
                <div class="item-brand">${escapeHtml(item.brand || 'No Brand')}</div>
            </div>
            <span class="status-badge ${item.hidden ? 'status-hidden' : 'status-visible'}">
                ${item.hidden ? 'Hidden' : 'Visible'}
            </span>
        </div>
        <div class="mobile-card-body">
            <div>
                <strong>Variants</strong>
                ${getVariantsDisplay(item.variants)}
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
        const price = variant.price ? `${variant.price.toFixed(3)} OMR` : 'No price';
        return `${variant.size} - ${price}`;
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
    
    // **FIXED: Reset all variant fields first**
    document.getElementById('enable5ml').checked = false;
    document.getElementById('enable10ml').checked = false;
    document.getElementById('enable30ml').checked = false;
    document.getElementById('enableFullBottle').checked = false;
    
    document.getElementById('price5ml').value = '';
    document.getElementById('price10ml').value = '';
    document.getElementById('price30ml').value = '';
    
    // Disable all price inputs initially
    document.getElementById('price5ml').disabled = true;
    document.getElementById('price10ml').disabled = true;
    document.getElementById('price30ml').disabled = true;
    
    // **FIXED: Process variants with correct data structure**
    const variants = item.variants || [];
    console.log('Processing variants for form:', variants);
    
    variants.forEach(variant => {
        console.log('Processing variant:', variant);
        
        if (variant.is_whole_bottle) {
            document.getElementById('enableFullBottle').checked = true;
        } else {
            // Use size_ml field directly (raw database field)
            const size_ml = variant.size_ml;
            const priceInOMR = variant.price; // Already converted to OMR by backend
            
            console.log(`Variant: ${size_ml}ml = ${priceInOMR} OMR`);
            
            if (size_ml && priceInOMR && priceInOMR > 0) {
                switch(size_ml) {
                    case 5:
                        document.getElementById('enable5ml').checked = true;
                        document.getElementById('price5ml').disabled = false;
                        document.getElementById('price5ml').value = priceInOMR.toFixed(3);
                        break;
                    case 10:
                        document.getElementById('enable10ml').checked = true;
                        document.getElementById('price10ml').disabled = false;
                        document.getElementById('price10ml').value = priceInOMR.toFixed(3);
                        break;
                    case 30:
                        document.getElementById('enable30ml').checked = true;
                        document.getElementById('price30ml').disabled = false;
                        document.getElementById('price30ml').value = priceInOMR.toFixed(3);
                        break;
                    default:
                        console.warn(`Unsupported variant size: ${size_ml}ml`);
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
            '<div class="no-image-placeholder">No Image</div>'
        }
        <div class="item-preview-info">
            <div class="item-name">${escapeHtml(item.name)}</div>
            <div class="item-brand">${escapeHtml(item.brand || 'No Brand')}</div>
            <div class="item-variants">${getVariantsDisplay(item.variants)}</div>
        </div>
    `;
    
    showModal('deleteModalOverlay');
}

async function confirmDeleteItem() {
    if (!deleteItemId) return;
    
    const deleteButton = document.getElementById('confirmDeleteBtn');
    const originalText = deleteButton.textContent;
    
    deleteButton.disabled = true;
    deleteButton.innerHTML = '<div class="loading-spinner"></div> Deleting...';
    
    try {
        const response = await fetch(`/admin/delete-fragrance/${deleteItemId}`, {
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
            hideModal('deleteModalOverlay');
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
        deleteItemId = null;
    }
}

async function toggleItemVisibility(itemId, makeVisible) {
    const item = items.find(i => i.id == itemId);
    if (!item) {
        showToast('Item not found', 'error');
        return;
    }
    
    const action = makeVisible ? 'show' : 'hide';
    
    try {
        const response = await fetch(`/admin/toggle-fragrance-visibility/${itemId}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ hidden: !makeVisible })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }
        
        if (result.success) {
            showToast(`Item ${action === 'show' ? 'shown' : 'hidden'} successfully!`, 'success');
            loadItems(); // Reload items
        } else {
            throw new Error(result.error || 'Visibility toggle failed');
        }
        
    } catch (error) {
        console.error('Toggle visibility error:', error);
        showToast(`Error: ${error.message}`, 'error');
    }
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
        
        // **FIXED: Variant processing logic**
        const variants = [];
        
        // Check each variant size
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
        
        console.log('Submitting variants:', variants);
        formData.append('variants', JSON.stringify(variants));
        
        // Add ID for updates
        if (currentEditingId) {
            formData.append('id', currentEditingId);
        }
        
        const url = currentEditingId ? 
            `/admin/update-fragrance/${currentEditingId}` : 
            '/admin/add-fragrance';
        
        const response = await fetch(url, {
            method: 'POST',
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
            loadItems(); // Reload items
        } else {
            throw new Error(result.error || 'Save failed');
        }
        
    } catch (error) {
        console.error('Form submit error:', error);
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        saveButton.disabled = false;
        saveButtonText.textContent = originalText;
    }
}

// Utility functions
function updatePaginationInfo(start, end, total, totalPages) {
    const info = document.getElementById('paginationInfo');
    if (info) {
        if (total === 0) {
            info.textContent = 'No items to display';
        } else {
            info.textContent = `Showing ${start} to ${end} of ${total} items (Page ${currentPage} of ${totalPages})`;
        }
    }
}

function generatePaginationControls(totalPages) {
    const controls = document.getElementById('paginationControls');
    if (!controls) return;
    
    const prevBtn = controls.querySelector('.pagination-prev');
    const nextBtn = controls.querySelector('.pagination-next');
    
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

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

// State display functions
function showItemsLoading() {
    document.getElementById('itemsLoading').style.display = 'block';
    document.getElementById('itemsError').style.display = 'none';
    document.getElementById('itemsEmpty').style.display = 'none';
    document.getElementById('itemsContent').style.display = 'none';
}

function showItemsError(message) {
    const errorDiv = document.getElementById('itemsError');
    const messageDiv = errorDiv.querySelector('.error-message');
    
    if (messageDiv) messageDiv.textContent = message;
    
    document.getElementById('itemsLoading').style.display = 'none';
    document.getElementById('itemsError').style.display = 'block';
    document.getElementById('itemsEmpty').style.display = 'none';
    document.getElementById('itemsContent').style.display = 'none';
}