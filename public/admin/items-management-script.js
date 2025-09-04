// Fixed Items Management Script - Variant Handling
let items = [];
let filteredItems = [];
let currentPage = 1;
const itemsPerPage = 10;
let currentSearchTerm = '';
let currentFilter = 'all';
let currentEditingId = null;
let deleteItemId = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Items management loaded');
    loadItems();
    setupEventListeners();
});

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            currentSearchTerm = e.target.value;
            currentPage = 1;
            applyFiltersAndPagination();
        }, 300));
    }
    
    const filterSelect = document.getElementById('statusFilter');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            currentFilter = e.target.value;
            currentPage = 1;
            applyFiltersAndPagination();
        });
    }
    
    const itemForm = document.getElementById('itemForm');
    if (itemForm) {
        itemForm.addEventListener('submit', handleFormSubmit);
    }
    
    const imageInput = document.getElementById('itemImage');
    if (imageInput) {
        imageInput.addEventListener('change', handleImagePreview);
    }
    
    setupVariantCheckboxListeners();
    
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
    
    const itemNameInput = document.getElementById('itemName');
    if (itemNameInput) {
        itemNameInput.addEventListener('input', updatePreviews);
    }
    
    updatePreviews();
}

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
}

// FIXED: Handle form submission with proper variant handling
async function handleFormSubmit(e) {
    e.preventDefault();
    
    let saveButton = document.getElementById('saveItemBtn');
    if (!saveButton) {
        saveButton = document.querySelector('[onclick="saveItem()"]');
    }
    if (!saveButton) {
        saveButton = e.target.querySelector('button[type="submit"]');
    }
    if (!saveButton) {
        saveButton = document.querySelector('.btn-primary');
    }
    
    let saveButtonText = document.getElementById('saveButtonText');
    if (!saveButtonText && saveButton) {
        saveButtonText = saveButton.querySelector('span') || saveButton;
    }
    
    if (!saveButton || !saveButtonText) {
        console.error('Could not find save button or save button text element');
        showToast('Internal error: Could not find save button', 'error');
        return;
    }
    
    const originalText = saveButtonText.textContent;
    
    saveButton.disabled = true;
    saveButtonText.innerHTML = '<div class="loading-spinner"></div> Saving...';
    
    try {
        // FIXED: Only include variants that are actually checked
        const formData = {
            name: document.getElementById('itemName').value.trim(),
            brand: document.getElementById('itemBrand').value.trim(),
            description: document.getElementById('itemDescription').value.trim(),
            hidden: document.getElementById('itemHidden').checked,
            variants: []
        };
        
        if (currentEditingId) {
            formData.id = parseInt(currentEditingId);
            formData.slug = generateSlug(formData.name);
        }
        
        // FIXED: Only add variants that are checked and have valid prices
        if (document.getElementById('enable5ml').checked) {
            const price5ml = parseFloat(document.getElementById('price5ml').value);
            if (!isNaN(price5ml) && price5ml > 0) {
                formData.variants.push({
                    size_ml: 5,
                    price_cents: Math.round(price5ml * 1000),
                    is_whole_bottle: false,
                    sku: `${generateSlug(formData.name)}-5ml`,
                    max_quantity: 50
                });
            }
        }
        
        if (document.getElementById('enable10ml').checked) {
            const price10ml = parseFloat(document.getElementById('price10ml').value);
            if (!isNaN(price10ml) && price10ml > 0) {
                formData.variants.push({
                    size_ml: 10,
                    price_cents: Math.round(price10ml * 1000),
                    is_whole_bottle: false,
                    sku: `${generateSlug(formData.name)}-10ml`,
                    max_quantity: 50
                });
            }
        }
        
        if (document.getElementById('enable30ml').checked) {
            const price30ml = parseFloat(document.getElementById('price30ml').value);
            if (!isNaN(price30ml) && price30ml > 0) {
                formData.variants.push({
                    size_ml: 30,
                    price_cents: Math.round(price30ml * 1000),
                    is_whole_bottle: false,
                    sku: `${generateSlug(formData.name)}-30ml`,
                    max_quantity: 50
                });
            }
        }
        
        if (document.getElementById('enableFullBottle').checked) {
            formData.variants.push({
                size_ml: null,
                price_cents: null,
                is_whole_bottle: true,
                sku: `${generateSlug(formData.name)}-full`,
                max_quantity: 1
            });
        }
        
        console.log('Form data being submitted:', formData);
        
        if (formData.variants.length === 0) {
            throw new Error('At least one variant must be selected');
        }
        
        let imagePath = null;
        const imageInput = document.getElementById('itemImage');
        
        if (imageInput && imageInput.files && imageInput.files.length > 0) {
            console.log('📤 Uploading image...');
            const imageFormData = new FormData();
            imageFormData.append('image', imageInput.files[0]);
            imageFormData.append('filename', generateImageFilename(formData.name));
            
            const imageResponse = await fetch('/admin/upload-image', {
                method: 'POST',
                credentials: 'include',
                body: imageFormData
            });
            
            if (!imageResponse.ok) {
                throw new Error('Failed to upload image');
            }
            
            const imageResult = await imageResponse.json();
            if (imageResult.success) {
                imagePath = imageResult.data.filename;
                console.log('✅ Image uploaded:', imagePath);
            } else {
                throw new Error(imageResult.error || 'Image upload failed');
            }
        }
        
        if (imagePath) {
            formData.image_path = imagePath;
        }
        
        const endpoint = currentEditingId ? '/admin/update-fragrance' : '/admin/add-fragrance';
        console.log(`📡 Submitting to ${endpoint}:`, formData);
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ Server response:', result);
        
        if (result.success) {
            showToast(`Item ${currentEditingId ? 'updated' : 'created'} successfully`, 'success');
            closeItemModal();
            await loadItems();
            
            if (currentEditingId && imagePath) {
                console.log('🖼️ Forcing image cache refresh after update');
                setTimeout(() => {
                    document.querySelectorAll('img[src*="/api/image/"]').forEach(img => {
                        const originalSrc = img.src.split('?')[0];
                        img.src = `${originalSrc}?v=${Date.now()}`;
                    });
                }, 500);
            }
        } else {
            throw new Error(result.error || 'Failed to save item');
        }
        
    } catch (error) {
        console.error('Form submission error:', error);
        showToast(error.message || 'Failed to save item', 'error');
    } finally {
        if (saveButton) saveButton.disabled = false;
        if (saveButtonText) saveButtonText.textContent = originalText;
    }
}

// FIXED: Populate form function that properly handles existing variants
function populateForm(item) {
    console.log('Populating form with item:', item);
    
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
    
    document.getElementById('price5ml').disabled = true;
    document.getElementById('price10ml').disabled = true;
    document.getElementById('price30ml').disabled = true;
    
    // FIXED: Populate variants based on actual data
    if (item.variants && Array.isArray(item.variants)) {
        item.variants.forEach(variant => {
            if (variant.is_whole_bottle) {
                document.getElementById('enableFullBottle').checked = true;
            } else if (variant.size_ml === 5) {
                document.getElementById('enable5ml').checked = true;
                document.getElementById('price5ml').disabled = false;
                document.getElementById('price5ml').value = (variant.price_cents / 1000).toFixed(3);
            } else if (variant.size_ml === 10) {
                document.getElementById('enable10ml').checked = true;
                document.getElementById('price10ml').disabled = false;
                document.getElementById('price10ml').value = (variant.price_cents / 1000).toFixed(3);
            } else if (variant.size_ml === 30) {
                document.getElementById('enable30ml').checked = true;
                document.getElementById('price30ml').disabled = false;
                document.getElementById('price30ml').value = (variant.price_cents / 1000).toFixed(3);
            }
        });
    }
    
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

function resetForm() {
    const form = document.getElementById('itemForm');
    if (form) form.reset();
    
    document.getElementById('enable5ml').checked = false;
    document.getElementById('enable10ml').checked = false;
    document.getElementById('enable30ml').checked = false;
    document.getElementById('enableFullBottle').checked = false;
    
    document.getElementById('price5ml').disabled = true;
    document.getElementById('price10ml').disabled = true;
    document.getElementById('price30ml').disabled = true;
    
    const imageInput = document.getElementById('itemImage');
    if (imageInput) imageInput.required = true;
    
    removeImagePreview();
}

// Helper functions
function generateSlug(name) {
    return name.toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

function generateImageFilename(name) {
    const slug = generateSlug(name);
    return `${slug}.png`;
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

// Placeholder functions for other required functionality
async function loadItems() {
    // Implementation for loading items
    console.log('Loading items...');
}

function applyFiltersAndPagination() {
    // Implementation for filters and pagination
    console.log('Applying filters and pagination...');
}

function showToast(message, type) {
    console.log(`Toast: ${message} (${type})`);
}

function closeItemModal() {
    const modal = document.getElementById('itemModalOverlay');
    if (modal) {
        modal.style.display = 'none';
    }
    resetForm();
    currentEditingId = null;
}

function updatePreviews() {
    // Implementation for preview updates
    console.log('Updating previews...');
}

function handleImagePreview(e) {
    // Implementation for image preview
    console.log('Handling image preview...');
}

function removeImagePreview() {
    const imagePreview = document.getElementById('imagePreview');
    if (imagePreview) {
        imagePreview.style.display = 'none';
    }
}

// Export functions to global scope
window.handleFormSubmit = handleFormSubmit;
window.populateForm = populateForm;
window.resetForm = resetForm;
window.saveItem = handleFormSubmit;