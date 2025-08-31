// Items Management Script - Updated to match Orders Design
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
    console.log('🚀 Items management loaded with new design');
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
    
    // Variant checkbox event listeners
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
    
    // ESC key to close modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeItemModal();
            closeDeleteModal();
        }
    });
}

function setupVariantCheckboxListeners() {
    const variantCheckboxes = ['enable5ml', 'enable10ml', 'enable30ml', 'enableFullBottle'];
    const priceInputs = ['price5ml', 'price10ml', 'price30ml'];
    
    variantCheckboxes.forEach((checkboxId, index) => {
        const checkbox = document.getElementById(checkboxId);
        if (checkbox) {
            checkbox.addEventListener('change', function() {
                if (index < priceInputs.length) {
                    const priceInput = document.getElementById(priceInputs[index]);
                    if (priceInput) {
                        priceInput.disabled = !this.checked;
                        if (!this.checked) {
                            priceInput.value = '';
                        }
                    }
                }
            });
        }
    });
}

// Refresh function for the header button
function refreshItems() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.classList.add('refreshing');
        refreshBtn.querySelector('svg').style.animation = 'spin 1s linear infinite';
    }
    
    loadItems().finally(() => {
        if (refreshBtn) {
            refreshBtn.classList.remove('refreshing');
            refreshBtn.querySelector('svg').style.animation = '';
        }
    });
}

// Data loading functions
async function loadItems() {
    showLoadingState();
    
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
            showItemsContent();
        } else {
            console.warn('Invalid response structure:', data);
            items = [];
            showEmptyState();
        }
        
    } catch (error) {
        console.error('Failed to load items:', error);
        showToast('Failed to load items. Please check your connection and try again.', 'error');
        showErrorState();
    }
}

// State management functions
function showLoadingState() {
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('itemsContent').style.display = 'none';
}

function showEmptyState() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('itemsContent').style.display = 'none';
}

function showErrorState() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('itemsContent').style.display = 'none';
}

function showItemsContent() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('itemsContent').style.display = 'block';
}

// Stats update function
function updateStats() {
    const totalItems = items.length;
    const visibleItems = items.filter(item => !item.hidden).length;
    const hiddenItems = items.filter(item => item.hidden).length;
    const brands = new Set(items.map(item => item.brand).filter(Boolean)).size;
    
    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('visibleItems').textContent = visibleItems;
    document.getElementById('hiddenItems').textContent = hiddenItems;
    document.getElementById('totalBrands').textContent = brands;
}

// Filter and pagination functions
function applyFiltersAndPagination() {
    // Apply filters
    filteredItems = items.filter(item => {
        const matchesSearch = !currentSearchTerm || 
            item.name.toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
            (item.brand && item.brand.toLowerCase().includes(currentSearchTerm.toLowerCase()));
        
        const matchesFilter = currentFilter === 'all' ||
            (currentFilter === 'visible' && !item.hidden) ||
            (currentFilter === 'hidden' && item.hidden);
        
        return matchesSearch && matchesFilter;
    });
    
    // Apply pagination
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = filteredItems.slice(startIndex, endIndex);
    
    // Render items
    renderItems(paginatedItems);
    renderPagination(totalPages);
    
    // Show appropriate state
    if (filteredItems.length === 0) {
        if (items.length === 0) {
            showEmptyState();
        } else {
            // No results from filter/search
            showItemsContent();
        }
    } else {
        showItemsContent();
    }
}

function renderItems(itemsToRender) {
    const tableBody = document.getElementById('itemsTableBody');
    const mobileCards = document.getElementById('itemCards');
    
    if (!tableBody || !mobileCards) return;
    
    // Clear existing content
    tableBody.innerHTML = '';
    mobileCards.innerHTML = '';
    
    if (itemsToRender.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center" style="padding: 3rem; color: #666;">
                    ${filteredItems.length === 0 && items.length > 0 ? 'No items match your search criteria' : 'No items found'}
                </td>
            </tr>
        `;
        return;
    }
    
    itemsToRender.forEach(item => {
        // Desktop table row
        const tableRow = createItemTableRow(item);
        tableBody.appendChild(tableRow);
        
        // Mobile card
        const mobileCard = createItemMobileCard(item);
        mobileCards.appendChild(mobileCard);
    });
}

function createItemTableRow(item) {
    const row = document.createElement('tr');
    
    // Image and info column
    const imageUrl = item.image_path ? `/storage/fragrance-images/${item.image_path}` : '/icons/icon-192x192.png';
    
    row.innerHTML = `
        <td>
            <div class="item-info">
                <img src="${imageUrl}" alt="${item.name}" class="item-image" 
                     onerror="this.src='/icons/icon-192x192.png'">
                <div class="item-details">
                    <h4>${escapeHtml(item.name)}</h4>
                    <p>${escapeHtml(item.description || 'No description')}</p>
                </div>
            </div>
        </td>
        <td>${escapeHtml(item.brand || 'No brand')}</td>
        <td>${getVariantsDisplay(item.variants || [])}</td>
        <td>${getStatusBadge(item.hidden)}</td>
        <td>${formatDate(item.created_at)}</td>
        <td>
            <div class="action-buttons">
                <button class="btn-small btn-edit" onclick="editItem(${item.id})" title="Edit Item">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-small ${item.hidden ? 'btn-show' : 'btn-hide'}" 
                        onclick="toggleItemVisibility(${item.id})" 
                        title="${item.hidden ? 'Show Item' : 'Hide Item'}">
                    <i class="fas fa-${item.hidden ? 'eye' : 'eye-slash'}"></i>
                </button>
                <button class="btn-small btn-delete" onclick="confirmDelete(${item.id})" title="Delete Item">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </td>
    `;
    
    return row;
}

function createItemMobileCard(item) {
    const card = document.createElement('div');
    card.className = 'item-card';
    
    const imageUrl = item.image_path ? `/storage/fragrance-images/${item.image_path}` : '/icons/icon-192x192.png';
    
    card.innerHTML = `
        <div class="item-card-header">
            <div class="item-card-info">
                <h4>${escapeHtml(item.name)}</h4>
                <p>${escapeHtml(item.brand || 'No brand')}</p>
            </div>
            ${getStatusBadge(item.hidden)}
        </div>
        <div class="item-card-meta">
            <div>
                <strong>Variants:</strong> ${getVariantsDisplay(item.variants || [])}
            </div>
            <div>
                <strong>Created:</strong> ${formatDate(item.created_at)}
            </div>
        </div>
        <div class="item-card-actions">
            <button class="btn-small btn-edit" onclick="editItem(${item.id})">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn-small ${item.hidden ? 'btn-show' : 'btn-hide'}" 
                    onclick="toggleItemVisibility(${item.id})">
                <i class="fas fa-${item.hidden ? 'eye' : 'eye-slash'}"></i> 
                ${item.hidden ? 'Show' : 'Hide'}
            </button>
            <button class="btn-small btn-delete" onclick="confirmDelete(${item.id})">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;
    
    return card;
}

function getVariantsDisplay(variants) {
    if (!variants || variants.length === 0) {
        return '<span class="variant-chip">No variants</span>';
    }
    
    const variantChips = variants.map(variant => {
        const isWholeBottle = variant.is_whole_bottle || variant.size === 'Whole Bottle';
        const size = isWholeBottle ? 'Full Bottle' : `${variant.size_ml || variant.size}ml`;
        const chipClass = isWholeBottle ? 'variant-chip whole-bottle' : 'variant-chip';
        return `<span class="${chipClass}">${size}</span>`;
    });
    
    return `<div class="variants-display">${variantChips.join('')}</div>`;
}

function getStatusBadge(isHidden) {
    if (isHidden) {
        return '<span class="status-badge status-hidden">Hidden</span>';
    } else {
        return '<span class="status-badge status-visible">Visible</span>';
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return 'Invalid date';
    }
}

function renderPagination(totalPages) {
    const paginationContainer = document.getElementById('itemsPagination');
    if (!paginationContainer) return;
    
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    
    // Update pagination info
    document.getElementById('itemsPageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('itemsTotalCount').textContent = filteredItems.length;
    
    // Update navigation buttons
    const prevBtn = document.getElementById('itemsPrevBtn');
    const nextBtn = document.getElementById('itemsNextBtn');
    
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = () => {
            if (currentPage > 1) {
                currentPage--;
                applyFiltersAndPagination();
            }
        };
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.onclick = () => {
            if (currentPage < totalPages) {
                currentPage++;
                applyFiltersAndPagination();
            }
        };
    }
}

// Item management functions
async function toggleItemVisibility(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) {
        showToast('Item not found', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/admin/fragrances/${itemId}/visibility`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ hidden: !item.hidden })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Update local data
            item.hidden = !item.hidden;
            
            const actionPerformed = item.hidden ? 'hidden' : 'shown';
            showToast(`Item ${actionPerformed} successfully`, 'success');
            
            // Update stats and re-render
            updateStats();
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

function populateForm(item) {
    console.log('Populating form with item:', item);
    
    // Basic fields
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
    document.getElementById('price10ml').value = '';
    document.getElementById('price30ml').value = '';
    
    // Enable/disable price fields based on checkbox state
    document.getElementById('price5ml').disabled = true;
    document.getElementById('price10ml').disabled = true;
    document.getElementById('price30ml').disabled = true;
    
    // Populate variants if they exist
    if (item.variants && Array.isArray(item.variants)) {
        item.variants.forEach(variant => {
            const isWholeBottle = variant.is_whole_bottle || variant.size === 'Whole Bottle';
            
            if (isWholeBottle) {
                document.getElementById('enableFullBottle').checked = true;
            } else {
                const sizeValue = variant.size_ml || parseInt(variant.size);
                
                if (sizeValue === 5) {
                    document.getElementById('enable5ml').checked = true;
                    document.getElementById('price5ml').disabled = false;
                    document.getElementById('price5ml').value = variant.price || '';
                } else if (sizeValue === 10) {
                    document.getElementById('enable10ml').checked = true;
                    document.getElementById('price10ml').disabled = false;
                    document.getElementById('price10ml').value = variant.price || '';
                } else if (sizeValue === 30) {
                    document.getElementById('enable30ml').checked = true;
                    document.getElementById('price30ml').disabled = false;
                    document.getElementById('price30ml').value = variant.price || '';
                }
            }
        });
    }
}

function confirmDelete(itemId) {
    deleteItemId = itemId;
    showModal('deleteModalOverlay');
}

async function confirmDeleteItem() {
    if (!deleteItemId) return;
    
    try {
        const response = await fetch(`/admin/fragrances/${deleteItemId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Remove from local data
            items = items.filter(item => item.id !== deleteItemId);
            
            showToast('Item deleted successfully', 'success');
            closeDeleteModal();
            updateStats();
            applyFiltersAndPagination();
        } else {
            throw new Error(result.error || 'Failed to delete item');
        }
        
    } catch (error) {
        console.error('Delete item error:', error);
        showToast('Failed to delete item: ' + error.message, 'error');
    }
    
    deleteItemId = null;
}

// Form handling
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const saveBtn = document.getElementById('saveItemBtn');
    const originalText = saveBtn.innerHTML;
    
    try {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        const formData = new FormData();
        
        // Basic fields
        formData.append('name', document.getElementById('itemName').value);
        formData.append('brand', document.getElementById('itemBrand').value);
        formData.append('description', document.getElementById('itemDescription').value);
        formData.append('hidden', document.getElementById('itemHidden').checked);
        
        // Image
        const imageFile = document.getElementById('itemImage').files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }
        
        // Variants
        const variants = [];
        
        // Check each variant
        if (document.getElementById('enable5ml').checked) {
            const price = parseFloat(document.getElementById('price5ml').value);
            if (!isNaN(price) && price > 0) {
                variants.push({ size_ml: 5, price_cents: Math.round(price * 1000) });
            }
        }
        
        if (document.getElementById('enable10ml').checked) {
            const price = parseFloat(document.getElementById('price10ml').value);
            if (!isNaN(price) && price > 0) {
                variants.push({ size_ml: 10, price_cents: Math.round(price * 1000) });
            }
        }
        
        if (document.getElementById('enable30ml').checked) {
            const price = parseFloat(document.getElementById('price30ml').value);
            if (!isNaN(price) && price > 0) {
                variants.push({ size_ml: 30, price_cents: Math.round(price * 1000) });
            }
        }
        
        if (document.getElementById('enableFullBottle').checked) {
            variants.push({ is_whole_bottle: true });
        }
        
        formData.append('variants', JSON.stringify(variants));
        
        // Submit form
        const url = currentEditingId ? `/admin/fragrances/${currentEditingId}` : '/admin/fragrances';
        const method = currentEditingId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            credentials: 'include',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            const action = currentEditingId ? 'updated' : 'created';
            showToast(`Item ${action} successfully`, 'success');
            closeItemModal();
            await loadItems(); // Reload to get fresh data
        } else {
            throw new Error(result.error || `Failed to ${currentEditingId ? 'update' : 'create'} item`);
        }
        
    } catch (error) {
        console.error('Form submission error:', error);
        showToast('Failed to save item: ' + error.message, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

function handleImagePreview(e) {
    const file = e.target.files[0];
    const uploadPreview = document.getElementById('uploadPreview');
    const uploadPlaceholder = document.querySelector('.upload-placeholder');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('previewImg').src = e.target.result;
            uploadPreview.style.display = 'block';
            uploadPlaceholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

function removeImage() {
    document.getElementById('itemImage').value = '';
    document.getElementById('uploadPreview').style.display = 'none';
    document.querySelector('.upload-placeholder').style.display = 'block';
}

function resetForm() {
    document.getElementById('itemForm').reset();
    document.getElementById('uploadPreview').style.display = 'none';
    document.querySelector('.upload-placeholder').style.display = 'block';
    
    // Reset variant states
    document.getElementById('price5ml').disabled = true;
    document.getElementById('price10ml').disabled = true;
    document.getElementById('price30ml').disabled = true;
}

// Modal utilities
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeItemModal() {
    document.getElementById('itemModalOverlay').style.display = 'none';
    document.body.style.overflow = '';
    currentEditingId = null;
}

function closeDeleteModal() {
    document.getElementById('deleteModalOverlay').style.display = 'none';
    document.body.style.overflow = '';
    deleteItemId = null;
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

// Toast notifications
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-${getToastIcon(type)}"></i>
            <span>${escapeHtml(message)}</span>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
    
    // Click to dismiss
    toast.addEventListener('click', () => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    });
}

function getToastIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

// Logout function (if needed)
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = '../login';
    }
}

// Pagination navigation functions (for external calls)
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