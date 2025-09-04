// Items Management Adapter - FIXED VERSION - No Variant Duplication
// This adapter fixes the variant duplication issue during updates

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
    console.log('🚀 Items management loaded (FIXED VERSION)');
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
    
    // Form submission - FIXED VERSION
    const itemForm = document.getElementById('itemForm');
    if (itemForm) {
        itemForm.addEventListener('submit', handleFormSubmitFixed);
    }
    
    // Image preview
    const imageInput = document.getElementById('itemImage');
    if (imageInput) {
        imageInput.addEventListener('change', handleImagePreview);
    }
    
    // FIXED: Setup variant checkbox listeners
    setupVariantCheckboxListeners();
    
    // Modal close handlers
    setupModalCloseHandlers();
}

// FIXED: Proper variant checkbox setup
function setupVariantCheckboxListeners() {
    const variantCheckboxes = ['enable5ml', 'enable10ml', 'enable30ml', 'enableFullBottle'];
    
    variantCheckboxes.forEach(checkboxId => {
        const checkbox = document.getElementById(checkboxId);
        if (checkbox) {
            checkbox.addEventListener('change', function() {
                const size = checkboxId.replace('enable', '').replace('FullBottle', 'full');
                toggleVariantPrice(size);
            });
        }
    });
}

function toggleVariantPrice(size) {
    const sizeMap = {
        '5ml': 'price5ml',
        '10ml': 'price10ml', 
        '30ml': 'price30ml',
        'full': null
    };
    
    const priceInputId = sizeMap[size];
    if (!priceInputId) return; // Full bottle has no price input
    
    const checkbox = document.getElementById(`enable${size}`);
    const priceInput = document.getElementById(priceInputId);
    
    if (checkbox && priceInput) {
        priceInput.disabled = !checkbox.checked;
        if (!checkbox.checked) {
            priceInput.value = '';
        }
    }
}

// FIXED: Form submission handler that prevents variant duplication
async function handleFormSubmitFixed(e) {
    e.preventDefault();
    
    const saveButton = findSaveButton();
    const saveButtonText = findSaveButtonText(saveButton);
    
    if (!saveButton || !saveButtonText) {
        console.error('Could not find save button elements');
        showToast('Internal error: Could not find save button', 'error');
        return;
    }
    
    const originalText = saveButtonText.textContent;
    
    // Show loading state
    saveButton.disabled = true;
    saveButtonText.innerHTML = '<div class="loading-spinner"></div> Saving...';
    
    try {
        // FIXED: Build clean variant array from current form state only
        const variants = buildVariantsFromForm();
        
        // Basic form data
        const formData = {
            name: document.getElementById('itemName').value.trim(),
            brand: document.getElementById('itemBrand').value.trim(),
            description: document.getElementById('itemDescription').value.trim(),
            hidden: document.getElementById('itemHidden').checked,
            variants: variants
        };
        
        // Add ID and slug for updates
        if (currentEditingId) {
            formData.id = parseInt(currentEditingId);
            formData.slug = generateSlug(formData.name);
            console.log('🔄 Updating item with variants:', variants);
        } else {
            console.log('➕ Creating new item with variants:', variants);
        }
        
        // Validation
        validateFormData(formData);
        
        // Handle image upload if provided
        let imagePath = null;
        const imageInput = document.getElementById('itemImage');
        
        if (imageInput.files.length > 0) {
            imagePath = await handleImageUpload(imageInput.files[0]);
            if (imagePath) {
                formData.image_path = imagePath;
            }
        }
        
        // Submit to backend
        const endpoint = currentEditingId ? '/admin/update-fragrance' : '/admin/add-fragrance';
        console.log(`📡 Submitting to ${endpoint}:`, formData);
        
        const response = await fetch(endpoint, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        console.log('📥 Server response:', result);
        
        if (result.success) {
            const action = currentEditingId ? 'updated' : 'created';
            showToast(`Item ${action} successfully!`, 'success');
            
            closeItemModal();
            await loadItems(); // Reload to see changes
            
            // Clear draft if updating
            if (currentEditingId) {
                clearDraft(currentEditingId);
            }
        } else {
            throw new Error(result.error || `Failed to ${currentEditingId ? 'update' : 'create'} item`);
        }
        
    } catch (error) {
        console.error('❌ Form submission error:', error);
        showToast(error.message, 'error');
    } finally {
        // Restore button state
        saveButton.disabled = false;
        saveButtonText.textContent = originalText;
    }
}

// FIXED: Build variants array from current checkbox states only
function buildVariantsFromForm() {
    const variants = [];
    
    // 5ml variant
    if (document.getElementById('enable5ml').checked) {
        const price5ml = parseFloat(document.getElementById('price5ml').value);
        if (!isNaN(price5ml) && price5ml > 0) {
            variants.push({
                size_ml: 5,
                price_cents: Math.round(price5ml * 1000),
                is_whole_bottle: false,
                in_stock: true,
                max_quantity: 50
            });
        }
    }
    
    // 10ml variant
    if (document.getElementById('enable10ml').checked) {
        const price10ml = parseFloat(document.getElementById('price10ml').value);
        if (!isNaN(price10ml) && price10ml > 0) {
            variants.push({
                size_ml: 10,
                price_cents: Math.round(price10ml * 1000),
                is_whole_bottle: false,
                in_stock: true,
                max_quantity: 50
            });
        }
    }
    
    // 30ml variant
    if (document.getElementById('enable30ml').checked) {
        const price30ml = parseFloat(document.getElementById('price30ml').value);
        if (!isNaN(price30ml) && price30ml > 0) {
            variants.push({
                size_ml: 30,
                price_cents: Math.round(price30ml * 1000),
                is_whole_bottle: false,
                in_stock: true,
                max_quantity: 50
            });
        }
    }
    
    // Full bottle variant
    if (document.getElementById('enableFullBottle').checked) {
        variants.push({
            size_ml: null,
            price_cents: null,
            is_whole_bottle: true,
            in_stock: true,
            max_quantity: 1
        });
    }
    
    console.log('🔧 Built variants from form:', variants);
    return variants;
}

// FIXED: Proper form population for editing
function populateForm(item) {
    console.log('📝 Populating form for item:', item);
    
    // Basic fields
    document.getElementById('itemName').value = item.name || '';
    document.getElementById('itemBrand').value = item.brand || '';
    document.getElementById('itemDescription').value = item.description || '';
    document.getElementById('itemHidden').checked = item.hidden || false;
    
    // FIXED: Reset all variants first
    resetVariantCheckboxes();
    
    // FIXED: Populate variants from database
    if (item.variants && item.variants.length > 0) {
        console.log('🔧 Populating variants:', item.variants);
        
        item.variants.forEach(variant => {
            if (variant.is_whole_bottle) {
                document.getElementById('enableFullBottle').checked = true;
            } else if (variant.size_ml) {
                const size_ml = parseInt(variant.size_ml);
                const price = variant.price_cents ? (variant.price_cents / 1000) : variant.price;
                
                switch (size_ml) {
                    case 5:
                        document.getElementById('enable5ml').checked = true;
                        document.getElementById('price5ml').disabled = false;
                        document.getElementById('price5ml').value = price ? price.toFixed(3) : '';
                        break;
                    case 10:
                        document.getElementById('enable10ml').checked = true;
                        document.getElementById('price10ml').disabled = false;
                        document.getElementById('price10ml').value = price ? price.toFixed(3) : '';
                        break;
                    case 30:
                        document.getElementById('enable30ml').checked = true;
                        document.getElementById('price30ml').disabled = false;
                        document.getElementById('price30ml').value = price ? price.toFixed(3) : '';
                        break;
                    default:
                        console.warn(`Unknown variant size: ${size_ml}ml`);
                }
            }
        });
    }
    
    // Update previews
    updatePreviews();
    
    console.log('✅ Form populated successfully');
}

// FIXED: Reset all variant checkboxes and disable price fields
function resetVariantCheckboxes() {
    // Reset checkboxes
    document.getElementById('enable5ml').checked = false;
    document.getElementById('enable10ml').checked = false;
    document.getElementById('enable30ml').checked = false;
    document.getElementById('enableFullBottle').checked = false;
    
    // Reset and disable price fields
    document.getElementById('price5ml').value = '';
    document.getElementById('price5ml').disabled = true;
    
    document.getElementById('price10ml').value = '';
    document.getElementById('price10ml').disabled = true;
    
    document.getElementById('price30ml').value = '';
    document.getElementById('price30ml').disabled = true;
}

// FIXED: Reset form completely
function resetForm() {
    const form = document.getElementById('itemForm');
    if (form) {
        form.reset();
        
        // Reset variant checkboxes and price fields
        resetVariantCheckboxes();
        
        // Reset image preview
        const imagePreview = document.getElementById('imagePreview');
        if (imagePreview) {
            imagePreview.style.display = 'none';
        }
        
        // Reset previews
        updatePreviews();
        
        console.log('🧹 Form reset completely');
    }
}

// Helper functions
function findSaveButton() {
    return document.getElementById('saveItemBtn') || 
           document.querySelector('[onclick="saveItem()"]') || 
           document.querySelector('button[type="submit"]') || 
           document.querySelector('.btn-primary');
}

function findSaveButtonText(saveButton) {
    return document.getElementById('saveButtonText') || 
           (saveButton ? saveButton.querySelector('span') || saveButton : null);
}

function validateFormData(formData) {
    if (!formData.name) {
        throw new Error('Item name is required');
    }
    
    if (formData.variants.length === 0) {
        throw new Error('At least one variant must be selected');
    }
    
    // Validate variant prices
    for (const variant of formData.variants) {
        if (!variant.is_whole_bottle && (!variant.price_cents || variant.price_cents <= 0)) {
            throw new Error(`Price is required for ${variant.size_ml}ml variant`);
        }
    }
}

async function handleImageUpload(file) {
    // Handle image upload logic here
    // This should upload the image and return the path
    // Implementation depends on your upload endpoint
    console.log('📸 Uploading image:', file.name);
    return null; // Return actual image path after upload
}

function generateSlug(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function updatePreviews() {
    const name = document.getElementById('itemName').value || 'item-name';
    const slug = generateSlug(name);
    
    const slugPreview = document.getElementById('slugPreview');
    const imageNamePreview = document.getElementById('imageNamePreview');
    
    if (slugPreview) slugPreview.textContent = slug;
    if (imageNamePreview) imageNamePreview.textContent = `${slug}.png`;
}

function handleImagePreview(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    
    if (imagePreview && previewImg) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function setupModalCloseHandlers() {
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
}

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

function showToast(message, type = 'info') {
    // Create and show toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

function clearDraft(itemId) {
    localStorage.removeItem(`qotore_item_draft_${itemId}`);
}

// Global functions for HTML onclick handlers
window.openAddItemModal = function() {
    currentEditingId = null;
    const modalOverlay = document.getElementById('itemModalOverlay');
    const modalTitle = document.querySelector('#itemModalOverlay .modal-header h3');
    const saveButtonText = findSaveButtonText(findSaveButton());
    
    if (modalTitle) modalTitle.textContent = 'Add New Item';
    if (saveButtonText) saveButtonText.textContent = 'Save Item';
    
    resetForm();
    
    if (modalOverlay) {
        modalOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
};

window.editItem = function(itemId) {
    const item = items.find(i => i.id == itemId);
    if (!item) {
        showToast('Item not found', 'error');
        return;
    }
    
    currentEditingId = itemId;
    const modalOverlay = document.getElementById('itemModalOverlay');
    const modalTitle = document.querySelector('#itemModalOverlay .modal-header h3');
    const saveButtonText = findSaveButtonText(findSaveButton());
    
    if (modalTitle) modalTitle.textContent = 'Edit Item';
    if (saveButtonText) saveButtonText.textContent = 'Update Item';
    
    populateForm(item);
    
    if (modalOverlay) {
        modalOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
};

window.closeItemModal = function() {
    const modalOverlay = document.getElementById('itemModalOverlay');
    if (modalOverlay) {
        modalOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    resetForm();
    currentEditingId = null;
};

window.closeDeleteModal = function() {
    const modalOverlay = document.getElementById('deleteModalOverlay');
    if (modalOverlay) {
        modalOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    deleteItemId = null;
};

window.toggleVariantPrice = toggleVariantPrice;
window.updatePreviews = updatePreviews;

// Placeholder functions that should be implemented
async function loadItems() {
    // Load items from API
    console.log('📋 Loading items...');
}

function applyFiltersAndPagination() {
    // Apply filters and pagination
    console.log('🔍 Applying filters...');
}

console.log('✅ Items management adapter loaded (FIXED VERSION - No Variant Duplication)');