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
        console.log(`✅ Loaded ${items.length} items`);
        
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
    
    // Reset all variant price fields first
    document.getElementById('price5ml').value = '';
    document.getElementById('price10ml').value = '';
    document.getElementById('price30ml').value = '';
    document.getElementById('enableFullBottle').checked = false;
    
    // Populate variant prices - FIXED LOGIC
    const variants = item.variants || [];
    console.log('Processing variants:', variants);
    
    variants.forEach(variant => {
        console.log('Processing variant:', variant);
        
        if (variant.is_whole_bottle) {
            document.getElementById('enableFullBottle').checked = true;
        } else if (variant.size) {
            // Extract size_ml from size string (e.g., "5ml" -> 5)
            const sizeMatch = variant.size.match(/(\d+)ml/);
            const size_ml = sizeMatch ? parseInt(sizeMatch[1]) : null;
            
            if (size_ml && variant.price) {
                const priceOMR = variant.price; // Already in OMR from backend
                console.log(`Setting ${size_ml}ml price to ${priceOMR} OMR`);
                
                switch(size_ml) {
                    case 5:
                        document.getElementById('price5ml').value = priceOMR.toFixed(3);
                        break;
                    case 10:
                        document.getElementById('price10ml').value = priceOMR.toFixed(3);
                        break;
                    case 30:
                        document.getElementById('price30ml').value = priceOMR.toFixed(3);
                        break;
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

function showEmptyState() {
    const emptyState = document.getElementById('itemsEmpty');
    emptyState.querySelector('h3').textContent = 'No items yet';
    emptyState.querySelector('p').textContent = 'Start by adding your first fragrance item.';
    emptyState.querySelector('button').style.display = 'inline-block';
    emptyState.style.display = 'block';
    
    document.getElementById('itemsLoading').style.display = 'none';
    document.getElementById('itemsError').style.display = 'none';
    document.getElementById('itemsContent').style.display = 'none';
}

function showNoResultsState() {
    const emptyState = document.getElementById('itemsEmpty');
    emptyState.querySelector('h3').textContent = 'No items found';
    emptyState.querySelector('p').textContent = 'Try adjusting your filters.';
    emptyState.querySelector('button').style.display = 'none';
    emptyState.style.display = 'block';
    
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

// Helper functions
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

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
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
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    const style = document.createElement('style');
    if (!document.querySelector('#toast-styles')) {
        style.id = 'toast-styles';
        style.textContent = `
            .toast {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 6px;
                color: white;
                font-weight: 500;
                z-index: 10000;
                animation: slideIn 0.3s ease;
            }
            .toast-success { background-color: #28a745; }
            .toast-error { background-color: #dc3545; }
            .toast-info { background-color: #17a2b8; }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}