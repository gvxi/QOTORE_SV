// Modal Functions
function openAddItemModal() {
    try {
        console.log('🔧 Opening add item modal...');
        
        currentEditingId = null;
        
        const titleEl = document.getElementById('itemModalTitle');
        const buttonTextEl = document.getElementById('saveButtonText');
        
        if (titleEl) {
            titleEl.textContent = 'Add New Item';
            console.log('✓ Modal title set');
        } else {
            console.warn('⚠️ Modal title element not found');
        }
        
        if (buttonTextEl) {
            buttonTextEl.textContent = 'Save Item';
            console.log('✓ Button text set');
        } else {
            console.warn('⚠️ Button text element not found');
        }
        
        resetForm();
        showModal('itemModalOverlay');
        
        console.log('✅ Add item modal opened');
        
    } catch (error) {
        console.error('❌ Error opening add item modal:', error);
        showToast('Error opening form', 'error');
    }
}

// Test function to verify modal functionality
window.testModal = function() {
    console.log('🧪 Testing modal...');
    
    const modal = document.getElementById('itemModalOverlay');
    if (modal) {
        console.log('✓ Modal element found');
        modal.style.display = 'flex';
        modal.classList.add('show');
        console.log('✓ Modal should be visible now');
    } else {
        console.error('❌ Modal element not found');
    }
}

// Also make openAddItemModal globally available for testing
window.openAddItemModal = openAddItemModal;

function editItem(itemId) {
    try {
        console.log('✏️ Editing item:', itemId);
        
        const item = fragranceItems.find(i => i.id == itemId);
        if (!item) {
            console.error('❌ Item not found:', itemId);
            showToast('Item not found', 'error');
            return;
        }
        
        console.log('✓ Item found:', item.name);
        
        currentEditingId = itemId;
        const titleEl = document.getElementById('itemModalTitle');
        const buttonTextEl = document.getElementById('saveButtonText');
        
        if (titleEl) titleEl.textContent = 'Edit Item';
        if (buttonTextEl) buttonTextEl.textContent = 'Update Item';
        
        // Populate form with item data
        populateForm(item);
        showModal('itemModalOverlay');
        
        console.log('✅ Edit modal opened for:', item.name);
        
    } catch (error) {
        console.error('❌ Error editing item:', error);
        showToast('Error opening edit form', 'error');
    }
}TextEl = document.getElementById('saveButtonText');
    
    if (titleEl) titleEl.textContent = 'Add New Item';
    if (buttonTextEl) buttonTextEl.textContent = 'Save Item';
    
    resetForm();
    showModal('itemModalOverlay');

function editItem(itemId) {
    const item = fragranceItems.find(i => i.id == itemId);
    if (!item) {
        showToast('Item not found', 'error');
        return;
    }
    
    currentEditingId = itemId;
    const titleEl = document.getElementById('itemModalTitle');
    const buttonTextEl = document.getElementById('saveButtonText');
    
    if (titleEl) titleEl.textContent = 'Edit Item';
    if (buttonTextEl) buttonTextEl.textContent = 'Update Item';
    
    // Populate form with item data
    populateForm(item);
    showModal('itemModalOverlay');
}

function populateForm(item) {
    console.log('Populating form with item:', item);
    
    // Basic fields
    const nameEl = document.getElementById('itemName');
    const brandEl = document.getElementById('itemBrand');
    const descEl = document.getElementById('itemDescription');
    const hiddenEl = document.getElementById('itemHidden');
    
    if (nameEl) nameEl.value = item.name || '';
    if (brandEl) brandEl.value = item.brand || '';
    if (descEl) descEl.value = item.description || '';
    if (hiddenEl) hiddenEl.checked = item.hidden || false;
    
    // Reset all variant checkboxes and price fields first
    const enable5ml = document.getElementById('enable5ml');
    const enable10ml = document.getElementById('enable10ml');
    const enable30ml = document.getElementById('enable30ml');
    const enableFullBottle = document.getElementById('enableFullBottle');
    
    const price5ml = document.getElementById('price5ml');
    const price10ml = document.getElementById('price10ml');
    const price30ml = document.getElementById('price30ml');
    
    if (enable5ml) enable5ml.checked = false;
    if (enable10ml) enable10ml.checked = false;
    if (enable30ml) enable30ml.checked = false;
    if (enableFullBottle) enableFullBottle.checked = false;
    
    if (price5ml) {
        price5ml.value = '';
        price5ml.disabled = true;
    }
    if (price10ml) {
        price10ml.value = '';
        price10ml.disabled = true;
    }
    if (price30ml) {
        price30ml.value = '';
        price30ml.disabled = true;
    }
    
    // Populate variant prices - FIXED LOGIC
    const variants = item.variants || [];
    console.log('Processing variants:', variants);
    
    variants.forEach(variant => {
        console.log('Processing variant:', variant);
        
        if (variant.is_whole_bottle) {
            if (enableFullBottle) enableFullBottle.checked = true;
        } else {
            // Use size_ml field directly from database
            let size_ml = null;
            
            if (variant.size_ml) {
                // Direct size_ml field from database
                size_ml = parseInt(variant.size_ml);
            } else if (variant.size) {
                // Extract size_ml from size string (e.g., "5ml" -> 5)
                const sizeMatch = variant.size.match(/(\d+)ml/);
                size_ml = sizeMatch ? parseInt(sizeMatch[1]) : null;
            }
            
            if (size_ml && variant.price !== undefined) {
                const priceOMR = variant.price; // Already in OMR from backend
                console.log(`Setting ${size_ml}ml - checkbox enabled and price to ${priceOMR} OMR`);
                
                switch(size_ml) {
                    case 5:
                        if (enable5ml && price5ml) {
                            enable5ml.checked = true;
                            price5ml.disabled = false;
                            price5ml.value = priceOMR.toFixed(3);
                        }
                        break;
                    case 10:
                        if (enable10ml && price10ml) {
                            enable10ml.checked = true;
                            price10ml.disabled = false;
                            price10ml.value = priceOMR.toFixed(3);
                        }
                        break;
                    case 30:
                        if (enable30ml && price30ml) {
                            enable30ml.checked = true;
                            price30ml.disabled = false;
                            price30ml.value = priceOMR.toFixed(3);
                        }
                        break;
                }
            }
        }
    });
    
    // Update slug preview
    updateSlugPreview();
    
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

function resetForm() {// Items Management Script - FIXED VERSION with Enhanced Error Handling
let fragranceItems = []; // Changed from 'items' to avoid conflicts
let currentEditingId = null;
let deleteItemId = null;
let currentPage = 1;
const itemsPerPage = 10;
let currentFilter = 'all'; // all, visible, hidden
let currentSearch = '';

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Items management initialized');
    
    // Add small delay to ensure DOM is fully ready
    setTimeout(() => {
        checkAuth();
        loadItems();
        initializeVariantToggles();
        setupEventListeners();
    }, 100);
});

// Enhanced event listeners setup with error handling
function setupEventListeners() {
    try {
        console.log('🔧 Setting up event listeners...');
        
        // Search functionality with clear button
        const searchInput = document.getElementById('itemsSearch');
        if (searchInput) {
            console.log('✓ Search input found');
            searchInput.addEventListener('input', (e) => {
                currentSearch = e.target.value;
                currentPage = 1;
                displayItems();
                updateSearchClearButton();
            });
        } else {
            console.warn('⚠️ Search input not found');
        }
        
        // Form submission
        const itemForm = document.getElementById('itemForm');
        if (itemForm) {
            console.log('✓ Item form found');
            itemForm.addEventListener('submit', handleFormSubmit);
        } else {
            console.warn('⚠️ Item form not found');
        }
        
        // Image preview
        const imageInput = document.getElementById('itemImage');
        if (imageInput) {
            console.log('✓ Image input found');
            imageInput.addEventListener('change', handleImagePreview);
        } else {
            console.warn('⚠️ Image input not found');
        }
        
        // Name to slug preview
        const nameInput = document.getElementById('itemName');
        if (nameInput) {
            console.log('✓ Name input found');
            nameInput.addEventListener('input', updateSlugPreview);
        } else {
            console.warn('⚠️ Name input not found');
        }
        
        // Modal close on overlay click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                if (e.target.id === 'itemModalOverlay') {
                    closeItemModal();
                } else if (e.target.id === 'deleteModalOverlay') {
                    closeDeleteModal();
                }
            }
        });
        
        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeItemModal();
                closeDeleteModal();
            }
        });
        
        console.log('✅ Event listeners setup complete');
        
    } catch (error) {
        console.error('❌ Error setting up event listeners:', error);
    }
}

function updateSlugPreview() {
    try {
        const nameInput = document.getElementById('itemName');
        const name = nameInput ? nameInput.value : '';
        
        const slug = name.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim()
            .replace(/^-|-$/g, '');
        
        const preview = document.getElementById('slugPreview');
        const imageNamePreview = document.getElementById('imageNamePreview');
        
        if (preview) preview.textContent = slug || 'product-name';
        if (imageNamePreview) imageNamePreview.textContent = (slug || 'product-name') + '.png';
    } catch (error) {
        console.error('Error updating slug preview:', error);
    }
}

function initializeVariantToggles() {
    try {
        console.log('🔧 Initializing variant toggles...');
        
        // Initialize checkbox change handlers for enabling/disabling price inputs
        const enable5ml = document.getElementById('enable5ml');
        if (enable5ml) {
            enable5ml.addEventListener('change', function() {
                const priceInput = document.getElementById('price5ml');
                if (priceInput) {
                    priceInput.disabled = !this.checked;
                    if (!this.checked) {
                        priceInput.value = '';
                    } else {
                        priceInput.focus();
                    }
                }
            });
            console.log('✓ 5ml toggle initialized');
        }
        
        const enable10ml = document.getElementById('enable10ml');
        if (enable10ml) {
            enable10ml.addEventListener('change', function() {
                const priceInput = document.getElementById('price10ml');
                if (priceInput) {
                    priceInput.disabled = !this.checked;
                    if (!this.checked) {
                        priceInput.value = '';
                    } else {
                        priceInput.focus();
                    }
                }
            });
            console.log('✓ 10ml toggle initialized');
        }
        
        const enable30ml = document.getElementById('enable30ml');
        if (enable30ml) {
            enable30ml.addEventListener('change', function() {
                const priceInput = document.getElementById('price30ml');
                if (priceInput) {
                    priceInput.disabled = !this.checked;
                    if (!this.checked) {
                        priceInput.value = '';
                    } else {
                        priceInput.focus();
                    }
                }
            });
            console.log('✓ 30ml toggle initialized');
        }
        
        console.log('✅ Variant toggles initialized');
        
    } catch (error) {
        console.error('❌ Error initializing variant toggles:', error);
    }
}

async function checkAuth() {
    try {
        console.log('🔐 Checking authentication...');
        
        const response = await fetch('/admin/check-auth', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            console.warn('❌ Auth check failed, redirecting to login');
            window.location.href = '/admin/login.html';
            return;
        }
        
        console.log('✅ Authentication verified');
        
    } catch (error) {
        console.error('❌ Auth check error:', error);
        window.location.href = '/admin/login.html';
    }
}

async function loadItems() {
    console.log('📦 Loading items...');
    showLoadingState();
    
    try {
        const response = await fetch('/admin/fragrances', {
            credentials: 'include'
        });
        
        console.log('📡 API Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('📊 API Response data:', result);
        
        if (result.success && result.data) {
            fragranceItems = result.data;
            console.log(`✅ Loaded ${fragranceItems.length} items for admin`);
            console.log('📋 Items data:', fragranceItems);
            
            updateStats();
            displayItems();
        } else {
            throw new Error(result.error || 'Failed to load items');
        }
        
    } catch (error) {
        console.error('❌ Load items error:', error);
        showErrorState(error.message);
    }
}

function updateStats() {
    try {
        console.log('📊 Updating stats...');
        
        const totalItems = fragranceItems.length;
        const visibleItems = fragranceItems.filter(item => !item.hidden).length;
        const hiddenItems = fragranceItems.filter(item => item.hidden).length;
        const uniqueBrands = [...new Set(fragranceItems.map(item => item.brand).filter(Boolean))].length;
        
        console.log(`📈 Stats: Total: ${totalItems}, Visible: ${visibleItems}, Hidden: ${hiddenItems}, Brands: ${uniqueBrands}`);
        
        const totalEl = document.getElementById('totalItemsCount');
        const visibleEl = document.getElementById('visibleItemsCount');
        const hiddenEl = document.getElementById('hiddenItemsCount');
        const brandsEl = document.getElementById('totalBrandsCount');
        
        if (totalEl) {
            totalEl.textContent = totalItems;
            console.log('✓ Total count updated');
        }
        if (visibleEl) {
            visibleEl.textContent = visibleItems;
            console.log('✓ Visible count updated');
        }
        if (hiddenEl) {
            hiddenEl.textContent = hiddenItems;
            console.log('✓ Hidden count updated');
        }
        if (brandsEl) {
            brandsEl.textContent = uniqueBrands;
            console.log('✓ Brands count updated');
        }
        
        console.log('✅ Stats updated successfully');
        
    } catch (error) {
        console.error('❌ Error updating stats:', error);
    }
}

function displayItems() {
    try {
        console.log('📋 Displaying items...');
        
        let filteredItems = [...fragranceItems];
        
        console.log(`📋 Starting with ${filteredItems.length} items`);
        
        // Apply search filter
        if (currentSearch.trim()) {
            const searchLower = currentSearch.toLowerCase();
            filteredItems = filteredItems.filter(item => 
                item.name.toLowerCase().includes(searchLower) ||
                (item.brand && item.brand.toLowerCase().includes(searchLower)) ||
                item.description.toLowerCase().includes(searchLower)
            );
            console.log(`📋 After search: ${filteredItems.length} items`);
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
            console.log(`📋 After filter: ${filteredItems.length} items`);
        }
        
        console.log(`📋 Final filtered count: ${filteredItems.length} items`);
        
        // Handle empty results
        if (filteredItems.length === 0) {
            if (fragranceItems.length === 0) {
                console.log('📋 Showing empty state');
                showEmptyState();
            } else {
                console.log('📋 Showing no results state');
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
        console.log(`📋 Displaying items ${startIndex + 1}-${endIndex} of ${filteredItems.length}`);
        
        // Update UI
        renderItemsTable(currentPageItems);
        updatePaginationInfo(startIndex + 1, endIndex, filteredItems.length, totalPages);
        
        showItemsContent();
        
        console.log('✅ Items display complete');
        
    } catch (error) {
        console.error('❌ Error displaying items:', error);
        showErrorState('Error displaying items: ' + error.message);
    }
}

function renderItemsTable(items) {
    try {
        console.log(`📋 Rendering ${items.length} items in table`);
        
        const tbody = document.getElementById('itemsTableBody');
        
        if (!tbody) {
            console.error('❌ Table body not found');
            return;
        }
        
        console.log('✓ Table body found, clearing and populating');
        
        tbody.innerHTML = '';
        
        items.forEach((item, index) => {
            console.log(`📋 Rendering item ${index + 1}:`, item.name);
            const row = createTableRow(item);
            tbody.appendChild(row);
        });
        
        console.log('✅ Table rendered successfully');
        
    } catch (error) {
        console.error('❌ Error rendering table:', error);
    }
}

function createTableRow(item) {
    try {
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
                    <button class="btn-small btn-edit" onclick="editItem('${item.id}')">Edit</button>
                    <button class="btn-small ${item.hidden ? 'btn-success' : 'btn-warning'}" 
                            onclick="toggleItemVisibility('${item.id}')">
                        ${item.hidden ? 'Show' : 'Hide'}
                    </button>
                    <button class="btn-small btn-delete" onclick="deleteItem('${item.id}')">Delete</button>
                </div>
            </td>
        `;
        
        return row;
        
    } catch (error) {
        console.error('❌ Error creating table row for item:', item, error);
        return document.createElement('tr'); // Return empty row to prevent breaking
    }
}

function getVariantsDisplay(variants) {
    try {
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
    } catch (error) {
        console.error('❌ Error displaying variants:', error);
        return '<span style="color: #999;">Error displaying variants</span>';
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
    
    // Reset all variant checkboxes and price fields first
    document.getElementById('enable5ml').checked = false;
    document.getElementById('enable10ml').checked = false;
    document.getElementById('enable30ml').checked = false;
    document.getElementById('enableFullBottle').checked = false;
    
    document.getElementById('price5ml').value = '';
    document.getElementById('price5ml').disabled = true;
    document.getElementById('price10ml').value = '';
    document.getElementById('price10ml').disabled = true;
    document.getElementById('price30ml').value = '';
    document.getElementById('price30ml').disabled = true;
    
    // Populate variant prices - FIXED LOGIC
    const variants = item.variants || [];
    console.log('Processing variants:', variants);
    
    variants.forEach(variant => {
        console.log('Processing variant:', variant);
        
        if (variant.is_whole_bottle) {
            document.getElementById('enableFullBottle').checked = true;
        } else {
            // Use size_ml field directly from database
            let size_ml = null;
            
            if (variant.size_ml) {
                // Direct size_ml field from database
                size_ml = parseInt(variant.size_ml);
            } else if (variant.size) {
                // Extract size_ml from size string (e.g., "5ml" -> 5)
                const sizeMatch = variant.size.match(/(\d+)ml/);
                size_ml = sizeMatch ? parseInt(sizeMatch[1]) : null;
            }
            
            if (size_ml && variant.price !== undefined) {
                const priceOMR = variant.price; // Already in OMR from backend
                console.log(`Setting ${size_ml}ml - checkbox enabled and price to ${priceOMR} OMR`);
                
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
        }
    });
    
    // Update slug preview
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
    
    // Reset variant checkboxes and disable price inputs
    document.getElementById('enable5ml').checked = false;
    document.getElementById('enable10ml').checked = false;
    document.getElementById('enable30ml').checked = false;
    document.getElementById('enableFullBottle').checked = false;
    
    document.getElementById('price5ml').disabled = true;
    document.getElementById('price10ml').disabled = true;
    document.getElementById('price30ml').disabled = true;
    
    removeImagePreview();
    updateSlugPreview();
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
            '<div class="no-image-small">No Image</div>'
        }
        <div class="item-preview-info">
            <div class="item-preview-name">${escapeHtml(item.name)}</div>
            <div class="item-preview-brand">${escapeHtml(item.brand || 'No Brand')}</div>
        </div>
    `;
    
    showModal('deleteModalOverlay');
}

async function confirmDelete() {
    if (!deleteItemId) return;
    
    const deleteButton = document.getElementById('confirmDeleteBtn');
    const originalText = deleteButton.textContent;
    
    deleteButton.disabled = true;
    deleteButton.innerHTML = '<div class="loading-spinner"></div> Deleting...';
    
    try {
        const response = await fetch(`/admin/delete-fragrance/${deleteItemId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }
        
        if (result.success) {
            showToast('Item deleted successfully!', 'success');
            closeDeleteModal();
            loadItems(); // Reload the items list
        } else {
            throw new Error(result.error || 'Delete failed');
        }
        
    } catch (error) {
        console.error('Delete error:', error);
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        deleteButton.disabled = false;
        deleteButton.textContent = originalText;
    }
}

function closeDeleteModal() {
    hideModal('deleteModalOverlay');
    deleteItemId = null;
}

async function toggleItemVisibility(itemId) {
    const item = items.find(i => i.id == itemId);
    if (!item) {
        showToast('Item not found', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/admin/toggle-fragrance-visibility/${itemId}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                hidden: !item.hidden
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }
        
        if (result.success) {
            const action = item.hidden ? 'shown' : 'hidden';
            showToast(`Item ${action} successfully!`, 'success');
            loadItems(); // Reload the items list
        } else {
            throw new Error(result.error || 'Toggle failed');
        }
        
    } catch (error) {
        console.error('Toggle visibility error:', error);
        showToast(`Error: ${error.message}`, 'error');
    }
}

// Save item wrapper function called by modal button
function saveItem() {
    // Get the actual save button from the modal
    const saveButton = document.querySelector('#itemModalOverlay .btn-primary');
    if (!saveButton) {
        console.error('Save button not found');
        return;
    }
    
    // Trigger form submission
    const form = document.getElementById('itemForm');
    if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
}

// Delete Functions
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
    
    if (preview) {
        preview.innerHTML = `
            ${imageUrl ? 
                `<img src="${imageUrl}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">` : 
                '<div style="width: 60px; height: 60px; background: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; color: #999;">No Image</div>'
            }
            <div style="flex: 1; margin-left: 1rem;">
                <div style="font-weight: 600; color: #333; margin-bottom: 0.25rem;">${escapeHtml(item.name)}</div>
                <div style="color: #666; font-size: 0.9rem;">${escapeHtml(item.brand || 'No Brand')}</div>
                <div style="color: #999; font-size: 0.8rem; margin-top: 0.25rem;">${getVariantsDisplay(item.variants)}</div>
            </div>
        `;
    }
    
    showModal('deleteModalOverlay');
}

async function confirmDelete() {
    if (!deleteItemId) return;
    
    const deleteButton = document.getElementById('confirmDeleteBtn');
    if (!deleteButton) {
        console.error('Delete button not found');
        return;
    }
    
    const originalText = deleteButton.textContent;
    
    deleteButton.disabled = true;
    deleteButton.innerHTML = '<div style="display: inline-block; width: 12px; height: 12px; border: 2px solid #fff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div> Deleting...';
    
    try {
        const response = await fetch(`/admin/delete-fragrance`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: parseInt(deleteItemId) })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }
        
        if (result.success) {
            showToast('Item deleted successfully!', 'success');
            closeDeleteModal();
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
    }
}

function closeDeleteModal() {
    hideModal('deleteModalOverlay');
    deleteItemId = null;
}

// Toggle visibility function
async function toggleItemVisibility(itemId) {
    const item = items.find(i => i.id == itemId);
    if (!item) {
        showToast('Item not found', 'error');
        return;
    }
    
    const newHiddenStatus = !item.hidden;
    const action = newHiddenStatus ? 'hiding' : 'showing';
    
    try {
        const response = await fetch(`/admin/toggle-fragrance`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                id: parseInt(itemId), 
                hidden: newHiddenStatus 
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }
        
        if (result.success) {
            const actionPast = newHiddenStatus ? 'hidden' : 'shown';
            showToast(`Item ${actionPast} successfully!`, 'success');
            loadItems(); // Reload items
        } else {
            throw new Error(result.error || 'Visibility toggle failed');
        }
        
    } catch (error) {
        console.error('Toggle visibility error:', error);
        showToast(`Error ${action} item: ${error.message}`, 'error');
    }
}

// Pagination functions
function nextItemsPage() {
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (currentPage < totalPages) {
        currentPage++;
        displayItems();
    }
}

function previousItemsPage() {
    if (currentPage > 1) {
        currentPage--;
        displayItems();
    }
}

function updatePaginationInfo(start, end, total, totalPages) {
    const pageInfo = document.getElementById('itemsPageInfo');
    const totalCount = document.getElementById('itemsTotalCount');
    const prevBtn = document.getElementById('itemsPrevBtn');
    const nextBtn = document.getElementById('itemsNextBtn');
    
    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    if (totalCount) totalCount.textContent = total;
    
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    
    const pagination = document.getElementById('itemsPagination');
    if (pagination) {
        pagination.style.display = totalPages > 1 ? 'flex' : 'none';
    }
}

function generatePaginationControls(totalPages) {
    // Simple previous/next pagination for now
    updatePaginationInfo((currentPage - 1) * itemsPerPage + 1, 
                        Math.min(currentPage * itemsPerPage, items.length), 
                        items.length, totalPages);
}

// UI State Functions
function showLoadingState() {
    document.getElementById('itemsLoading').style.display = 'block';
    document.getElementById('itemsError').style.display = 'none';
    document.getElementById('itemsEmpty').style.display = 'none';
    document.getElementById('itemsContent').style.display = 'none';
}

function showErrorState(message) {
    document.getElementById('itemsLoading').style.display = 'none';
    document.getElementById('itemsError').style.display = 'block';
    document.getElementById('itemsEmpty').style.display = 'none';
    document.getElementById('itemsContent').style.display = 'none';
    
    const errorMessage = document.querySelector('#itemsError p');
    if (errorMessage) {
        errorMessage.textContent = message || 'Failed to load items. Please check your connection and try again.';
    }
}

function showEmptyState() {
    document.getElementById('itemsLoading').style.display = 'none';
    document.getElementById('itemsError').style.display = 'none';
    document.getElementById('itemsEmpty').style.display = 'block';
    document.getElementById('itemsContent').style.display = 'none';
}

function showNoResultsState() {
    document.getElementById('itemsLoading').style.display = 'none';
    document.getElementById('itemsError').style.display = 'none';
    document.getElementById('itemsEmpty').style.display = 'block';
    document.getElementById('itemsContent').style.display = 'none';
    
    const emptyTitle = document.querySelector('#itemsEmpty h3');
    const emptyDescription = document.querySelector('#itemsEmpty p');
    
    if (emptyTitle) emptyTitle.textContent = 'No Items Found';
    if (emptyDescription) emptyDescription.textContent = 'No fragrance items match your search criteria.';
}

function showItemsContent() {
    document.getElementById('itemsLoading').style.display = 'none';
    document.getElementById('itemsError').style.display = 'none';
    document.getElementById('itemsEmpty').style.display = 'none';
    document.getElementById('itemsContent').style.display = 'block';
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
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

// Modal utility functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
        document.body.style.overflow = 'auto';
    }
}

// Search and filter functions
function setFilter(filter) {
    currentFilter = filter;
    currentPage = 1;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    
    displayItems();
}

function clearSearch() {
    const searchInput = document.getElementById('itemsSearch');
    if (searchInput) {
        searchInput.value = '';
        currentSearch = '';
        currentPage = 1;
        displayItems();
        updateSearchClearButton();
    }
}

function updateSearchClearButton() {
    const searchInput = document.getElementById('itemsSearch');
    const clearButton = document.querySelector('.search-clear');
    
    if (searchInput && clearButton) {
        if (searchInput.value.trim()) {
            clearButton.style.display = 'block';
        } else {
            clearButton.style.display = 'none';
        }
    }
}

// Enhanced event listeners setup
function setupEventListeners() {
    // Search functionality with clear button
    const searchInput = document.getElementById('itemsSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value;
            currentPage = 1;
            displayItems();
            updateSearchClearButton();
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
    
    // Name to slug preview
    const nameInput = document.getElementById('itemName');
    if (nameInput) {
        nameInput.addEventListener('input', updateSlugPreview);
    }
    
    // Modal close on overlay click
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            if (e.target.id === 'itemModalOverlay') {
                closeItemModal();
            } else if (e.target.id === 'deleteModalOverlay') {
                closeDeleteModal();
            }
        }
    });
    
    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeItemModal();
            closeDeleteModal();
        }
    });
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear session cookie
        document.cookie = 'admin_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        // Redirect to login
        window.location.href = '/admin/login.html';
    }
}

// Toast notification function
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Apply styles
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '600',
        fontSize: '0.9rem',
        zIndex: '10000',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        maxWidth: '300px'
    });
    
    // Set background color based on type
    switch(type) {
        case 'success':
            toast.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
            break;
        case 'error':
            toast.style.background = 'linear-gradient(135deg, #dc3545 0%, #e74c3c 100%)';
            break;
        case 'warning':
            toast.style.background = 'linear-gradient(135deg, #ffc107 0%, #f39c12 100%)';
            toast.style.color = '#212529';
            break;
        default:
            toast.style.background = 'linear-gradient(135deg, #17a2b8 0%, #3498db 100%)';
    }
    
    // Add to document
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after delay
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}}