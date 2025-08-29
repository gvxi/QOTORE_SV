// ==========================================
// QOTORE - Item Management JavaScript
// Fixed variant handling and form population
// ==========================================

let items = [];
let filteredItems = [];
let currentPage = 1;
let itemsPerPage = 10;
let currentFilter = 'all';
let currentSearch = '';
let currentEditingId = null;
let deleteItemId = null;

// Supabase configuration
const SUPABASE_URL = 'https://nufrrxqhxcwxnvjncfgg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51ZnJyeHFoeGN3eG52am5jZmdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NjUyMzUsImV4cCI6MjA1MTE0MTIzNX0.YeKRKnkcEhOK5PGkOxzMEsOFSNZsWGKr-MsXzAz5Bb8';

// DOM Elements and Initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Item Management initialized');
    initializeEventListeners();
    loadItems();
});

function initializeEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    // Filter functionality
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', handleFilterChange);
    });

    // Item form submission
    const itemForm = document.getElementById('itemForm');
    if (itemForm) {
        itemForm.addEventListener('submit', handleItemSubmit);
    }

    // Image preview functionality
    const imageInput = document.getElementById('itemImage');
    if (imageInput) {
        imageInput.addEventListener('change', handleImagePreview);
    }

    // Name input for slug preview
    const nameInput = document.getElementById('itemName');
    if (nameInput) {
        nameInput.addEventListener('input', updateSlugPreview);
    }

    // Variant toggles
    setupVariantToggleListeners();

    // Modal close on outside click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                overlay.style.display = 'none';
            }
        });
    });
}

function setupVariantToggleListeners() {
    // Enable/disable price inputs based on checkboxes
    const variantPairs = [
        { checkbox: 'enable5ml', input: 'price5ml' },
        { checkbox: 'enable10ml', input: 'price10ml' },
        { checkbox: 'enable30ml', input: 'price30ml' }
    ];

    variantPairs.forEach(pair => {
        const checkbox = document.getElementById(pair.checkbox);
        const input = document.getElementById(pair.input);
        
        if (checkbox && input) {
            checkbox.addEventListener('change', function() {
                input.disabled = !checkbox.checked;
                if (checkbox.checked) {
                    input.focus();
                } else {
                    input.value = '';
                }
            });
        }
    });
}

// ==========================================
// API Functions
// ==========================================

async function loadItems() {
    console.log('📦 Loading items...');
    showLoadingState();

    try {
        const response = await fetch('/api/admin/fragrances');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('API Response:', result);
        
        if (result.success && Array.isArray(result.data)) {
            items = result.data;
            console.log(`✅ Loaded ${items.length} items successfully`);
            updateStats();
            renderItems();
        } else {
            throw new Error(result.error || 'Invalid response format');
        }
    } catch (error) {
        console.error('❌ Error loading items:', error);
        showErrorState(error.message);
    }
}

async function saveItem(formData) {
    try {
        const url = currentEditingId ? `/api/admin/fragrances/${currentEditingId}` : '/api/admin/fragrances';
        const method = currentEditingId ? 'PUT' : 'POST';

        console.log(`💾 Saving item via ${method} to ${url}`);
        
        const response = await fetch(url, {
            method: method,
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }

        if (result.success) {
            const action = currentEditingId ? 'updated' : 'created';
            showToast(`Item ${action} successfully!`, 'success');
            closeItemModal();
            loadItems(); // Refresh the items list
        } else {
            throw new Error(result.error || 'Save failed');
        }
    } catch (error) {
        console.error('❌ Error saving item:', error);
        showToast(error.message || 'Failed to save item', 'error');
    }
}

async function deleteItemConfirm() {
    if (!deleteItemId) return;

    try {
        console.log(`🗑️ Deleting item ${deleteItemId}`);
        
        const response = await fetch(`/api/admin/fragrances/${deleteItemId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }

        if (result.success) {
            showToast('Item deleted successfully!', 'success');
            hideModal('deleteModalOverlay');
            loadItems(); // Refresh the items list
        } else {
            throw new Error(result.error || 'Delete failed');
        }
    } catch (error) {
        console.error('❌ Error deleting item:', error);
        showToast(error.message || 'Failed to delete item', 'error');
    }
    
    deleteItemId = null;
}

// ==========================================
// Form Handling
// ==========================================

function handleItemSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    // Process variant data - FIXED LOGIC
    const variantData = {
        enable5ml: document.getElementById('enable5ml')?.checked || false,
        price5ml: parseFloat(document.getElementById('price5ml')?.value) || null,
        enable10ml: document.getElementById('enable10ml')?.checked || false,
        price10ml: parseFloat(document.getElementById('price10ml')?.value) || null,
        enable30ml: document.getElementById('enable30ml')?.checked || false,
        price30ml: parseFloat(document.getElementById('price30ml')?.value) || null,
        enableFullBottle: document.getElementById('enableFullBottle')?.checked || false
    };
    
    // Add variant data to form
    formData.append('variantData', JSON.stringify(variantData));
    
    console.log('📤 Submitting form with variant data:', variantData);
    saveItem(formData);
}

function handleImagePreview(e) {
    const file = e.target.files[0];
    if (file) {
        if (file.type !== 'image/png') {
            showToast('Only PNG files are allowed', 'error');
            e.target.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('imagePreview');
            const img = document.getElementById('previewImg');
            
            if (preview && img) {
                img.src = e.target.result;
                preview.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    }
}

function removeImagePreview() {
    const preview = document.getElementById('imagePreview');
    const input = document.getElementById('itemImage');
    const img = document.getElementById('previewImg');
    
    if (preview) preview.style.display = 'none';
    if (input) {
        input.value = '';
        input.required = currentEditingId ? false : true;
    }
    if (img) img.src = '';
}

function updateSlugPreview() {
    const nameInput = document.getElementById('itemName');
    const slugPreview = document.getElementById('slugPreview');
    const imageNamePreview = document.getElementById('imageNamePreview');
    
    if (nameInput && slugPreview) {
        const slug = generateSlug(nameInput.value);
        slugPreview.textContent = slug || 'item-name';
    }
    
    if (nameInput && imageNamePreview) {
        const slug = generateSlug(nameInput.value);
        imageNamePreview.textContent = (slug || 'item-name') + '.png';
    }
}

function generateSlug(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// ==========================================
// Search and Filter Functions
// ==========================================

function handleSearch(e) {
    currentSearch = e.target.value.toLowerCase().trim();
    currentPage = 1;
    renderItems();
}

function handleFilterChange(e) {
    // Remove active class from all filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    e.target.classList.add('active');
    
    currentFilter = e.target.dataset.filter;
    currentPage = 1;
    renderItems();
}

// ==========================================
// UI State Management
// ==========================================

function showLoadingState() {
    hideAllStates();
    const loadingEl = document.getElementById('itemsLoading');
    if (loadingEl) loadingEl.style.display = 'block';
}

function showErrorState(message = 'An error occurred') {
    hideAllStates();
    const errorEl = document.getElementById('itemsError');
    if (errorEl) {
        const messageEl = errorEl.querySelector('p');
        if (messageEl) {
            messageEl.textContent = message;
        }
        errorEl.style.display = 'block';
    }
}

function showEmptyState() {
    hideAllStates();
    const emptyEl = document.getElementById('itemsEmpty');
    if (emptyEl) emptyEl.style.display = 'block';
}

function showNoResultsState() {
    hideAllStates();
    const emptyEl = document.getElementById('itemsEmpty');
    if (emptyEl) {
        const title = emptyEl.querySelector('h3');
        const description = emptyEl.querySelector('p');
        const button = emptyEl.querySelector('button');
        
        if (title) title.textContent = 'No Results Found';
        if (description) description.textContent = 'No items match your search or filter criteria.';
        if (button) button.textContent = 'Clear Filters';
        if (button) button.onclick = clearFilters;
        
        emptyEl.style.display = 'block';
    }
}

function showItemsContent() {
    hideAllStates();
    const contentEl = document.getElementById('itemsContent');
    if (contentEl) contentEl.style.display = 'block';
}

function hideAllStates() {
    const states = ['itemsLoading', 'itemsError', 'itemsEmpty', 'itemsContent'];
    states.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

function clearFilters() {
    // Reset search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    currentSearch = '';
    
    // Reset filter
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === 'all') {
            btn.classList.add('active');
        }
    });
    currentFilter = 'all';
    
    // Reset page
    currentPage = 1;
    
    // Re-render
    renderItems();
}

// ==========================================
// Rendering Functions
// ==========================================

function updateStats() {
    const totalItems = items.length;
    const visibleItems = items.filter(item => !item.hidden).length;
    const hiddenItems = items.filter(item => item.hidden).length;
    const brands = new Set(items.map(item => item.brand?.toLowerCase()).filter(Boolean)).size;
    
    updateStatElement('totalItemsCount', totalItems);
    updateStatElement('visibleItemsCount', visibleItems);
    updateStatElement('hiddenItemsCount', hiddenItems);
    updateStatElement('totalBrandsCount', brands);
}

function updateStatElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value.toLocaleString();
    }
}

function renderItems() {
    console.log(`🔄 Rendering items. Search: "${currentSearch}", Filter: "${currentFilter}"`);
    
    // Apply search and filters
    filteredItems = [...items];
    
    // Apply search filter
    if (currentSearch) {
        filteredItems = filteredItems.filter(item => 
            item.name?.toLowerCase().includes(currentSearch) ||
            item.brand?.toLowerCase().includes(currentSearch) ||
            item.description?.toLowerCase().includes(currentSearch)
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
                ${item.hidden ? '🚫 Hidden' : '👁️ Visible'}
            </span>
        </td>
        <td class="date-cell">
            ${formatDate(item.created_at)}
        </td>
        <td class="actions-cell">
            <div class="action-buttons">
                <button class="btn-icon btn-edit" onclick="editItem(${item.id})" title="Edit Item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="m18.5 2.5 3 3L12 15l-4 1 1-4z"></path>
                    </svg>
                </button>
                <button class="btn-icon btn-delete" onclick="deleteItem(${item.id})" title="Delete Item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="m3 6 3 0 0-2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2l3 0"></path>
                        <line x1="8" y1="11" x2="8" y2="21"></line>
                        <line x1="12" y1="11" x2="12" y2="21"></line>
                        <line x1="16" y1="11" x2="16" y2="21"></line>
                        <path d="m7 6 0 14c0 1.1.9 2 2 2h6c0 1.1.9 2 2 2v-16"></path>
                    </svg>
                </button>
            </div>
        </td>
    `;
    
    return row;
}

function getVariantsDisplay(variants) {
    if (!variants || variants.length === 0) {
        return '<div class="variant-badge no-variants">No variants</div>';
    }
    
    // FIXED: Proper variant display logic
    const variantBadges = variants.map(variant => {
        let display, priceText;
        
        if (variant.is_whole_bottle) {
            display = 'Whole Bottle';
            priceText = 'Contact';
        } else {
            // Use size_ml directly from database
            display = `${variant.size_ml}ml`;
            const priceOMR = variant.price_cents ? (variant.price_cents / 1000).toFixed(3) : '0.000';
            priceText = `${priceOMR} OMR`;
        }
        
        return `<div class="variant-badge" title="${display} - ${priceText}">${display}<br><small>${priceText}</small></div>`;
    }).join('');
    
    return `<div class="variants-list">${variantBadges}</div>`;
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
            <div class="action-buttons">
                <button class="btn-icon btn-edit" onclick="editItem(${item.id})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="m18.5 2.5 3 3L12 15l-4 1 1-4z"></path>
                    </svg>
                </button>
                <button class="btn-icon btn-delete" onclick="deleteItem(${item.id})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="m3 6 3 0 0-2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2l3 0"></path>
                        <line x1="8" y1="11" x2="8" y2="21"></line>
                        <line x1="12" y1="11" x2="12" y2="21"></line>
                        <line x1="16" y1="11" x2="16" y2="21"></line>
                        <path d="m7 6 0 14c0 1.1.9 2 2 2h6c0 1.1.9 2 2 2v-16"></path>
                    </svg>
                </button>
            </div>
        </div>
        
        <div class="mobile-card-content">
            <div class="card-section">
                <div class="section-label">Description</div>
                <div class="section-content">${escapeHtml(item.description)}</div>
            </div>
            
            <div class="card-section">
                <div class="section-label">Variants</div>
                <div class="section-content">${variants}</div>
            </div>
            
            <div class="card-section">
                <div class="section-label">Status</div>
                <div class="section-content">
                    <span class="status-badge ${item.hidden ? 'status-hidden' : 'status-visible'}">
                        ${item.hidden ? '🚫 Hidden' : '👁️ Visible'}
                    </span>
                </div>
            </div>
            
            <div class="card-section">
                <div class="section-label">Created</div>
                <div class="section-content">${formatDate(item.created_at)}</div>
            </div>
        </div>
    `;
    
    return card;
}

// ==========================================
// Pagination Functions
// ==========================================

function updatePaginationInfo(start, end, total, totalPages) {
    const pageInfo = document.getElementById('itemsPageInfo');
    const totalCount = document.getElementById('itemsTotalCount');
    
    if (pageInfo) {
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }
    
    if (totalCount) {
        totalCount.textContent = total;
    }
}

function generatePaginationControls(totalPages) {
    const prevBtn = document.getElementById('itemsPrevBtn');
    const nextBtn = document.getElementById('itemsNextBtn');
    const pagination = document.getElementById('itemsPagination');
    
    if (pagination) {
        pagination.style.display = totalPages > 1 ? 'flex' : 'none';
    }
    
    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
    }
}

function previousItemsPage() {
    if (currentPage > 1) {
        currentPage--;
        renderItems();
    }
}

function nextItemsPage() {
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderItems();
    }
}

// ==========================================
// Modal Functions
// ==========================================

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
    
    // Reset all variant fields first
    document.getElementById('enable5ml').checked = false;
    document.getElementById('enable10ml').checked = false;
    document.getElementById('enable30ml').checked = false;
    document.getElementById('enableFullBottle').checked = false;
    
    document.getElementById('price5ml').value = '';
    document.getElementById('price10ml').value = '';
    document.getElementById('price30ml').value = '';
    
    document.getElementById('price5ml').disabled = true;
    document.getElementById('price10ml').disabled = true;
    document.getElementById('price30ml').disabled = true;
    
    // FIXED: Populate variant prices using size_ml directly
    const variants = item.variants || [];
    console.log('Processing variants:', variants);
    
    variants.forEach(variant => {
        console.log('Processing variant:', variant);
        
        if (variant.is_whole_bottle) {
            document.getElementById('enableFullBottle').checked = true;
        } else if (variant.size_ml && variant.price_cents) {
            // Use size_ml directly from database
            const size_ml = variant.size_ml;
            const priceOMR = variant.price_cents / 1000; // Convert fils to OMR
            
            console.log(`Setting ${size_ml}ml price to ${priceOMR} OMR`);
            
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
    });
    
    // Update slug and image name previews
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
    
    // Reset variant checkboxes and inputs
    document.getElementById('enable5ml').checked = false;
    document.getElementById('enable10ml').checked = false;
    document.getElementById('enable30ml').checked = false;
    document.getElementById('enableFullBottle').checked = false;
    
    document.getElementById('price5ml').value = '';
    document.getElementById('price10ml').value = '';
    document.getElementById('price30ml').value = '';
    
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
            `<img src="${imageUrl}" alt="${item.name}" class="item-image">` : 
            `<div class="no-image">No Image</div>`
        }
        <div class="item-details">
            <div class="item-name">${escapeHtml(item.name)}</div>
            <div class="item-brand">${escapeHtml(item.brand || 'No Brand')}</div>
            <div class="item-description">${escapeHtml(item.description)}</div>
        </div>
    `;
    
    showModal('deleteModalOverlay');
}

function cancelDelete() {
    hideModal('deleteModalOverlay');
    deleteItemId = null;
}

// ==========================================
// Utility Functions
// ==========================================

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        // Focus first input if available
        const firstInput = modal.querySelector('input, textarea, button');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function showToast(message, type = 'info', duration = 3000) {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span class="toast-message">${escapeHtml(message)}</span>
            <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;

    // Add to document
    document.body.appendChild(toast);

    // Auto-remove after duration
    setTimeout(() => {
        if (toast && toast.parentNode) {
            toast.remove();
        }
    }, duration);
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
    return text.toString().replace(/[&<>"']/g, function(m) { return map[m]; });
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        console.warn('Invalid date:', dateString);
        return 'Invalid Date';
    }
}

function isValidPrice(value) {
    const price = parseFloat(value);
    return !isNaN(price) && price > 0 && price <= 1000; // Max 1000 OMR seems reasonable
}

function formatPrice(priceInFils) {
    if (!priceInFils || priceInFils === 0) return '0.000';
    return (priceInFils / 1000).toFixed(3);
}

// ==========================================
// Export functions for global access
// ==========================================

// Make functions available globally for onclick handlers
window.editItem = editItem;
window.deleteItem = deleteItem;
window.deleteItemConfirm = deleteItemConfirm;
window.cancelDelete = cancelDelete;
window.openAddItemModal = openAddItemModal;
window.closeItemModal = closeItemModal;
window.removeImagePreview = removeImagePreview;
window.previousItemsPage = previousItemsPage;
window.nextItemsPage = nextItemsPage;
window.loadItems = loadItems;