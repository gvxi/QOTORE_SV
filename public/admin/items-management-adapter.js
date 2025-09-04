// Fixed Items Management Adapter - Enhanced variant handling
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔌 Items management adapter loaded');
    
    // Initialize enhanced features
    initializeEnhancedFeatures();
    
    // Override existing functions for better variant handling
    overrideFunctionsForVariantHandling();
});

function initializeEnhancedFeatures() {
    // Enhanced variant checkbox handling
    setupEnhancedVariantListeners();
    
    // Enhanced form validation
    setupFormValidation();
    
    // Enhanced modal handling
    setupEnhancedModalHandling();
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts();
}

function setupEnhancedVariantListeners() {
    const variants = [
        { id: 'enable5ml', priceId: 'price5ml', variant: '5ml' },
        { id: 'enable10ml', priceId: 'price10ml', variant: '10ml' },
        { id: 'enable30ml', priceId: 'price30ml', variant: '30ml' },
        { id: 'enableFullBottle', priceId: null, variant: 'fullBottle' }
    ];
    
    variants.forEach(({ id, priceId, variant }) => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            // Remove existing listeners to prevent duplicates
            checkbox.removeEventListener('change', checkbox._enhancedListener);
            
            // Add enhanced listener
            const listener = function() {
                console.log(`Variant ${variant} toggled:`, this.checked);
                
                // Update price input
                if (priceId) {
                    const priceInput = document.getElementById(priceId);
                    if (priceInput) {
                        priceInput.disabled = !this.checked;
                        priceInput.required = this.checked;
                        
                        if (this.checked) {
                            priceInput.focus();
                            // Add subtle animation
                            priceInput.style.transition = 'all 0.3s ease';
                            priceInput.style.borderColor = '#8B4513';
                        } else {
                            priceInput.value = '';
                            priceInput.style.borderColor = '#e9ecef';
                        }
                    }
                }
                
                // Update variant card styling
                const variantCard = this.closest('.variant-card');
                if (variantCard) {
                    variantCard.classList.toggle('active', this.checked);
                    
                    if (this.checked) {
                        variantCard.style.borderColor = '#8B4513';
                        variantCard.style.backgroundColor = '#f8f9fa';
                        variantCard.style.transform = 'scale(1.02)';
                    } else {
                        variantCard.style.borderColor = '#e9ecef';
                        variantCard.style.backgroundColor = 'white';
                        variantCard.style.transform = 'scale(1)';
                    }
                }
                
                // Show validation feedback
                updateVariantValidation();
            };
            
            checkbox.addEventListener('change', listener);
            checkbox._enhancedListener = listener; // Store reference for removal
        }
    });
}

function updateVariantValidation() {
    const variants = ['enable5ml', 'enable10ml', 'enable30ml', 'enableFullBottle'];
    const hasSelectedVariant = variants.some(id => {
        const checkbox = document.getElementById(id);
        return checkbox && checkbox.checked;
    });
    
    // Show/hide validation message
    let validationMsg = document.getElementById('variantValidationMsg');
    if (!validationMsg) {
        validationMsg = document.createElement('div');
        validationMsg.id = 'variantValidationMsg';
        validationMsg.className = 'validation-message';
        
        const variantsSection = document.querySelector('.variants-section');
        if (variantsSection) {
            variantsSection.appendChild(validationMsg);
        }
    }
    
    if (!hasSelectedVariant) {
        validationMsg.textContent = '⚠️ Please select at least one variant';
        validationMsg.style.color = '#dc3545';
        validationMsg.style.display = 'block';
    } else {
        validationMsg.style.display = 'none';
    }
    
    return hasSelectedVariant;
}

function setupFormValidation() {
    const form = document.getElementById('itemForm');
    if (!form) return;
    
    // Enhanced form validation before submission
    form.addEventListener('submit', function(e) {
        console.log('Form submission intercepted for validation');
        
        // Check if at least one variant is selected
        if (!updateVariantValidation()) {
            e.preventDefault();
            showToast('Please select at least one variant (5ml, 10ml, 30ml, or Full Bottle)', 'error');
            return false;
        }
        
        // Validate selected variants have prices
        const selectedVariants = [
            { id: 'enable5ml', priceId: 'price5ml', name: '5ml' },
            { id: 'enable10ml', priceId: 'price10ml', name: '10ml' },
            { id: 'enable30ml', priceId: 'price30ml', name: '30ml' }
        ];
        
        for (const variant of selectedVariants) {
            const checkbox = document.getElementById(variant.id);
            const priceInput = document.getElementById(variant.priceId);
            
            if (checkbox && checkbox.checked && priceInput) {
                const price = parseFloat(priceInput.value);
                if (isNaN(price) || price <= 0) {
                    e.preventDefault();
                    priceInput.focus();
                    showToast(`Please enter a valid price for ${variant.name} variant`, 'error');
                    return false;
                }
            }
        }
        
        console.log('Form validation passed');
    });
}

function setupEnhancedModalHandling() {
    // Enhanced modal open function
    window.openAddItemModal = function() {
        console.log('🔧 Opening add item modal (enhanced)...');
        
        currentEditingId = null;
        
        // Update modal title and button
        const modalTitle = document.getElementById('itemModalTitle');
        const saveButtonText = document.getElementById('saveButtonText');
        
        if (modalTitle) modalTitle.textContent = 'Add New Item';
        if (saveButtonText) saveButtonText.textContent = 'Save Item';
        
        // Reset form with enhanced reset
        resetFormEnhanced();
        
        // Show modal with animation
        showModalEnhanced('itemModalOverlay');
    };
    
    // Enhanced edit function
    window.editItem = function(itemId) {
        console.log('🔧 Editing item (enhanced):', itemId);
        
        const item = items.find(i => i.id == itemId);
        if (!item) {
            showToast('Item not found', 'error');
            return;
        }
        
        currentEditingId = itemId;
        
        // Update modal title and button
        const modalTitle = document.getElementById('itemModalTitle');
        const saveButtonText = document.getElementById('saveButtonText');
        
        if (modalTitle) modalTitle.textContent = 'Edit Item';
        if (saveButtonText) saveButtonText.textContent = 'Update Item';
        
        // Populate form with enhanced population
        populateFormEnhanced(item);
        
        // Show modal
        showModalEnhanced('itemModalOverlay');
    };
}

function resetFormEnhanced() {
    console.log('🧹 Enhanced form reset');
    
    // Reset basic form
    const form = document.getElementById('itemForm');
    if (form) {
        form.reset();
    }
    
    // Reset all variants with animation
    const variants = [
        { id: 'enable5ml', priceId: 'price5ml' },
        { id: 'enable10ml', priceId: 'price10ml' },
        { id: 'enable30ml', priceId: 'price30ml' },
        { id: 'enableFullBottle', priceId: null }
    ];
    
    variants.forEach(({ id, priceId }) => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.checked = false;
            
            // Trigger change event to update styling
            checkbox.dispatchEvent(new Event('change'));
        }
        
        if (priceId) {
            const priceInput = document.getElementById(priceId);
            if (priceInput) {
                priceInput.value = '';
                priceInput.disabled = true;
            }
        }
    });
    
    // Reset image preview
    const imagePreview = document.getElementById('imagePreview');
    if (imagePreview) {
        imagePreview.style.display = 'none';
    }
    
    // Clear validation messages
    const validationMsg = document.getElementById('variantValidationMsg');
    if (validationMsg) {
        validationMsg.style.display = 'none';
    }
}

function populateFormEnhanced(item) {
    console.log('📝 Enhanced form population with item:', item);
    
    // Reset first
    resetFormEnhanced();
    
    // Basic fields
    const fields = [
        { id: 'itemName', value: item.name },
        { id: 'itemBrand', value: item.brand },
        { id: 'itemDescription', value: item.description }
    ];
    
    fields.forEach(({ id, value }) => {
        const input = document.getElementById(id);
        if (input) {
            input.value = value || '';
        }
    });
    
    // Hidden checkbox
    const hiddenCheckbox = document.getElementById('itemHidden');
    if (hiddenCheckbox) {
        hiddenCheckbox.checked = item.hidden || false;
    }
    
    // FIXED: Enhanced variant handling
    if (item.variants && Array.isArray(item.variants)) {
        console.log('Processing variants:', item.variants);
        
        // Process each variant with delay for smooth animation
        item.variants.forEach((variant, index) => {
            setTimeout(() => {
                if (variant.is_whole_bottle) {
                    const checkbox = document.getElementById('enableFullBottle');
                    if (checkbox) {
                        checkbox.checked = true;
                        checkbox.dispatchEvent(new Event('change'));
                    }
                } else if (variant.size_ml) {
                    const size = variant.size_ml;
                    const checkboxId = `enable${size}ml`;
                    const priceId = `price${size}ml`;
                    
                    const checkbox = document.getElementById(checkboxId);
                    const priceInput = document.getElementById(priceId);
                    
                    if (checkbox && priceInput) {
                        checkbox.checked = true;
                        checkbox.dispatchEvent(new Event('change'));
                        
                        // Set price with animation
                        setTimeout(() => {
                            priceInput.value = (variant.price_cents / 1000).toFixed(3);
                            priceInput.style.transition = 'all 0.3s ease';
                            priceInput.style.backgroundColor = '#e8f5e8';
                            
                            setTimeout(() => {
                                priceInput.style.backgroundColor = 'white';
                            }, 500);
                        }, 100);
                    }
                }
            }, index * 100); // Stagger animations
        });
    }
    
    // Handle existing image
    if (item.image_path) {
        setTimeout(() => {
            const imagePreview = document.getElementById('imagePreview');
            const previewImg = document.getElementById('previewImg');
            
            if (imagePreview && previewImg) {
                previewImg.src = `/api/image/${item.image_path}?v=${Date.now()}`;
                imagePreview.style.display = 'block';
                
                // Add loading animation
                previewImg.style.opacity = '0';
                previewImg.onload = function() {
                    this.style.transition = 'opacity 0.3s ease';
                    this.style.opacity = '1';
                };
            }
        }, 300);
    }
}

function showModalEnhanced(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.style.display = 'flex';
    modal.style.opacity = '0';
    document.body.style.overflow = 'hidden';
    
    // Animate in
    requestAnimationFrame(() => {
        modal.style.transition = 'opacity 0.3s ease';
        modal.style.opacity = '1';
    });
    
    // Focus first input with delay
    setTimeout(() => {
        const firstInput = modal.querySelector('input[type="text"]:not([disabled])');
        if (firstInput) {
            firstInput.focus();
            firstInput.select();
        }
    }, 300);
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + N: Add new item
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            if (typeof openAddItemModal === 'function') {
                openAddItemModal();
            }
        }
        
        // Escape: Close modals
        if (e.key === 'Escape') {
            const modal = document.querySelector('.modal-overlay[style*="flex"]');
            if (modal && modal.id === 'itemModalOverlay') {
                closeItemModal();
            }
        }
    });
}

function overrideFunctionsForVariantHandling() {
    // Store original functions
    window.originalResetForm = window.resetForm;
    window.originalPopulateForm = window.populateForm;
    
    // Override with enhanced versions
    window.resetForm = resetFormEnhanced;
    window.populateForm = populateFormEnhanced;
    
    console.log('✅ Functions overridden for enhanced variant handling');
}

// Enhanced toast notification
function showToast(message, type = 'info', duration = 4000) {
    console.log('📢 Toast:', type, message);
    
    // Remove existing toasts of the same type
    const existingToasts = document.querySelectorAll(`.toast.${type}`);
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getToastColor(type)};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        z-index: 2000;
        font-weight: 600;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        animation: slideInRight 0.3s ease-out;
        max-width: 400px;
        word-wrap: break-word;
    `;
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span>${getToastIcon(type)}</span>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }
    }, duration);
    
    // Click to dismiss
    toast.addEventListener('click', () => {
        toast.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    });
}

function getToastColor(type) {
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    return colors[type] || colors.info;
}

function getToastIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    return icons[type] || icons.info;
}

// Add required CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .variant-card {
        transition: all 0.3s ease;
        border: 2px solid #e9ecef;
        border-radius: 12px;
        padding: 1rem;
        background: white;
    }
    
    .variant-card.active {
        border-color: #8B4513 !important;
        background-color: #f8f9fa !important;
        transform: scale(1.02);
        box-shadow: 0 4px 12px rgba(139, 69, 19, 0.1);
    }
    
    .validation-message {
        margin-top: 1rem;
        padding: 0.75rem;
        border-radius: 8px;
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        font-weight: 600;
    }
    
    .toast {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
`;
document.head.appendChild(style);

console.log('🔌 Enhanced items management adapter loaded successfully');

// Export enhanced functions
window.showToast = showToast;
window.updateVariantValidation = updateVariantValidation;
window.setupEnhancedVariantListeners = setupEnhancedVariantListeners;