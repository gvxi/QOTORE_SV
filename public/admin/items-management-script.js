// Fixed form submission handler to prevent variant duplication
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
    
    // Disable button and show loading
    saveButton.disabled = true;
    saveButtonText.innerHTML = '<div class="loading-spinner"></div> Saving...';
    
    try {
        // Validate required fields
        const name = document.getElementById('itemName').value.trim();
        const brand = document.getElementById('itemBrand').value.trim();
        
        if (!name) {
            throw new Error('Item name is required');
        }
        
        if (!brand) {
            throw new Error('Brand is required');
        }
        
        // FIXED: Build complete variants array based on checkboxes
        const variants = [];
        
        // Check each variant checkbox and build variants array
        if (document.getElementById('enable5ml').checked) {
            const price5ml = parseFloat(document.getElementById('price5ml').value);
            if (!isNaN(price5ml) && price5ml > 0) {
                variants.push({
                    size_ml: 5,
                    price_cents: Math.round(price5ml * 1000),
                    is_whole_bottle: false,
                    max_quantity: 50,
                    in_stock: true
                });
            } else {
                throw new Error('Please enter a valid price for 5ml variant');
            }
        }
        
        if (document.getElementById('enable10ml').checked) {
            const price10ml = parseFloat(document.getElementById('price10ml').value);
            if (!isNaN(price10ml) && price10ml > 0) {
                variants.push({
                    size_ml: 10,
                    price_cents: Math.round(price10ml * 1000),
                    is_whole_bottle: false,
                    max_quantity: 50,
                    in_stock: true
                });
            } else {
                throw new Error('Please enter a valid price for 10ml variant');
            }
        }
        
        if (document.getElementById('enable30ml').checked) {
            const price30ml = parseFloat(document.getElementById('price30ml').value);
            if (!isNaN(price30ml) && price30ml > 0) {
                variants.push({
                    size_ml: 30,
                    price_cents: Math.round(price30ml * 1000),
                    is_whole_bottle: false,
                    max_quantity: 50,
                    in_stock: true
                });
            } else {
                throw new Error('Please enter a valid price for 30ml variant');
            }
        }
        
        if (document.getElementById('enableFullBottle').checked) {
            variants.push({
                size_ml: null,
                price_cents: null,
                is_whole_bottle: true,
                max_quantity: 1,
                in_stock: true
            });
        }
        
        // Ensure at least one variant is selected
        if (variants.length === 0) {
            throw new Error('Please select at least one variant (5ml, 10ml, 30ml, or Full Bottle)');
        }
        
        // Create the payload
        const payload = {
            name: name,
            brand: brand,
            description: document.getElementById('itemDescription').value.trim(),
            hidden: document.getElementById('itemHidden').checked,
            variants: variants // FIXED: Send complete variants array
        };
        
        // Add ID and slug for updates
        if (currentEditingId) {
            payload.id = parseInt(currentEditingId);
            payload.slug = generateSlug(name);
        }
        
        console.log('Submitting payload:', payload);
        
        // Handle image upload if present
        const imageFile = document.getElementById('itemImage').files[0];
        let imageUploaded = false;
        
        if (imageFile) {
            console.log('Uploading image...');
            const imageFormData = new FormData();
            imageFormData.append('image', imageFile);
            if (currentEditingId) {
                imageFormData.append('itemId', currentEditingId);
            }
            
            const imageResponse = await fetch('/admin/upload-image', {
                method: 'POST',
                credentials: 'include',
                body: imageFormData
            });
            
            if (imageResponse.ok) {
                const imageResult = await imageResponse.json();
                if (imageResult.success) {
                    payload.image_path = imageResult.imagePath;
                    imageUploaded = true;
                    console.log('Image uploaded successfully:', imageResult.imagePath);
                } else {
                    console.warn('Image upload failed:', imageResult.error);
                }
            } else {
                console.warn('Image upload request failed:', imageResponse.status);
            }
        }
        
        // Submit the form data
        const endpoint = currentEditingId ? '/admin/update-fragrance' : '/admin/add-fragrance';
        const method = 'POST';
        
        console.log(`Submitting to ${endpoint} with method ${method}`);
        
        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Server response:', result);
        
        if (result.success) {
            const action = currentEditingId ? 'updated' : 'created';
            showToast(`Item ${action} successfully${imageUploaded ? ' with image' : ''}`, 'success');
            
            // Close modal and refresh data
            closeItemModal();
            await loadItems(); // Refresh the items list
            
        } else {
            throw new Error(result.error || `Failed to ${currentEditingId ? 'update' : 'create'} item`);
        }
        
    } catch (error) {
        console.error('Form submission error:', error);
        showToast(error.message, 'error');
    } finally {
        // Re-enable button
        saveButton.disabled = false;
        saveButtonText.textContent = originalText;
    }
}

// FIXED: Enhanced populateForm function to properly handle existing variants
function populateForm(item) {
    console.log('Populating form with item:', item);
    
    // Reset all fields first
    resetForm();
    
    // Basic fields
    document.getElementById('itemName').value = item.name || '';
    document.getElementById('itemBrand').value = item.brand || '';
    document.getElementById('itemDescription').value = item.description || '';
    document.getElementById('itemHidden').checked = item.hidden || false;
    
    // FIXED: Handle variants properly
    if (item.variants && Array.isArray(item.variants)) {
        console.log('Processing variants:', item.variants);
        
        item.variants.forEach(variant => {
            if (variant.is_whole_bottle) {
                // Enable full bottle
                const fullBottleCheckbox = document.getElementById('enableFullBottle');
                if (fullBottleCheckbox) {
                    fullBottleCheckbox.checked = true;
                    toggleVariantFields('fullBottle');
                }
            } else if (variant.size_ml) {
                // Handle sized variants
                const size = variant.size_ml;
                const checkboxId = `enable${size}ml`;
                const priceId = `price${size}ml`;
                
                const checkbox = document.getElementById(checkboxId);
                const priceInput = document.getElementById(priceId);
                
                if (checkbox && priceInput) {
                    checkbox.checked = true;
                    // Convert price from fils to OMR
                    priceInput.value = (variant.price_cents / 1000).toFixed(3);
                    toggleVariantFields(`${size}ml`);
                }
            }
        });
    }
    
    // Handle existing image
    if (item.image_path) {
        const imagePreview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');
        
        if (imagePreview && previewImg) {
            previewImg.src = `/api/image/${item.image_path}?v=${Date.now()}`;
            imagePreview.style.display = 'block';
        }
    }
    
    console.log('Form populated successfully');
}

// FIXED: Reset form function to clear all variant states
function resetForm() {
    // Reset basic form fields
    const form = document.getElementById('itemForm');
    if (form) {
        form.reset();
    }
    
    // FIXED: Reset all variant checkboxes and disable price inputs
    const variants = ['5ml', '10ml', '30ml', 'fullBottle'];
    variants.forEach(variant => {
        const checkboxId = variant === 'fullBottle' ? 'enableFullBottle' : `enable${variant}`;
        const priceId = variant === 'fullBottle' ? null : `price${variant}`;
        
        const checkbox = document.getElementById(checkboxId);
        if (checkbox) {
            checkbox.checked = false;
        }
        
        if (priceId) {
            const priceInput = document.getElementById(priceId);
            if (priceInput) {
                priceInput.value = '';
                priceInput.disabled = true;
            }
        }
        
        // Reset variant card styling
        toggleVariantFields(variant);
    });
    
    // Reset image preview
    const imagePreview = document.getElementById('imagePreview');
    if (imagePreview) {
        imagePreview.style.display = 'none';
    }
    
    const imageInput = document.getElementById('itemImage');
    if (imageInput) {
        imageInput.value = '';
    }
    
    console.log('Form reset completed');
}

// FIXED: Enhanced toggle function for better UX
function toggleVariantFields(variant) {
    const checkboxId = variant === 'fullBottle' ? 'enableFullBottle' : `enable${variant}`;
    const priceId = variant === 'fullBottle' ? null : `price${variant}`;
    
    const checkbox = document.getElementById(checkboxId);
    const priceInput = priceId ? document.getElementById(priceId) : null;
    
    if (!checkbox) {
        console.error('Checkbox not found:', checkboxId);
        return;
    }
    
    // Update price input state
    if (priceInput) {
        priceInput.disabled = !checkbox.checked;
        priceInput.required = checkbox.checked;
        
        if (checkbox.checked) {
            priceInput.focus();
        } else {
            priceInput.value = '';
        }
    }
    
    // Visual feedback for variant card
    const variantCard = checkbox.closest('.variant-card');
    if (variantCard) {
        if (checkbox.checked) {
            variantCard.style.borderColor = '#8B4513';
            variantCard.style.backgroundColor = '#f8f9fa';
            variantCard.classList.add('active');
        } else {
            variantCard.style.borderColor = '#e9ecef';
            variantCard.style.backgroundColor = 'white';
            variantCard.classList.remove('active');
        }
    }
    
    console.log(`Variant ${variant} ${checkbox.checked ? 'enabled' : 'disabled'}`);
}

// Utility function to generate slug from name
function generateSlug(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// Enhanced variant checkbox listeners setup
function setupVariantCheckboxListeners() {
    const variants = [
        { id: 'enable5ml', variant: '5ml' },
        { id: 'enable10ml', variant: '10ml' },
        { id: 'enable30ml', variant: '30ml' },
        { id: 'enableFullBottle', variant: 'fullBottle' }
    ];
    
    variants.forEach(({ id, variant }) => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                toggleVariantFields(variant);
            });
        }
    });
    
    console.log('Variant checkbox listeners set up');
}

// Make functions available globally
window.handleFormSubmit = handleFormSubmit;
window.populateForm = populateForm;
window.resetForm = resetForm;
window.toggleVariantFields = toggleVariantFields;
window.setupVariantCheckboxListeners = setupVariantCheckboxListeners;
window.generateSlug = generateSlug;