// Global Variables
let fragrances = [];
let cart = [];
let currentLanguage = 'en';
let selectedVariant = null;
let currentFragrance = null;

// Language Translations
const translations = {
    en: {
        "hero.title": "Premium Fragrances",
        "hero.subtitle": "Discover luxury scents from around the world",
        "hero.cta": "Explore Collection",
        "products.title": "Our Collection",
        "loading.text": "Loading fragrances...",
        "empty.title": "Coming Soon",
        "empty.subtitle": "New fragrances are being added",
        "modal.choose_size": "Choose Size:",
        "modal.add_to_cart": "Add to Cart",
        "cart.title": "Shopping Cart",
        "cart.total": "Total:",
        "cart.clear": "Clear",
        "cart.checkout": "Checkout",
        "footer.description": "Premium fragrances for discerning tastes",
        "footer.contact": "Contact Us"
    },
    ar: {
        "hero.title": "عطور فاخرة",
        "hero.subtitle": "اكتشف العطور الفاخرة من جميع أنحاء العالم",
        "hero.cta": "استكشف المجموعة",
        "products.title": "مجموعتنا",
        "loading.text": "جار تحميل العطور...",
        "empty.title": "قريباً",
        "empty.subtitle": "يتم إضافة عطور جديدة",
        "modal.choose_size": "اختر الحجم:",
        "modal.add_to_cart": "أضف إلى السلة",
        "cart.title": "سلة التسوق",
        "cart.total": "المجموع:",
        "cart.clear": "مسح",
        "cart.checkout": "الدفع",
        "footer.description": "عطور فاخرة للأذواق المميزة",
        "footer.contact": "اتصل بنا"
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    loadLanguage(); // Load language first
    loadCart();
    loadFragrances();
    updateCartCount();
    initializeEventListeners();
});

function initializeEventListeners() {
    // Set up cart button click handler
    const cartButton = document.getElementById('cartButton');
    if (cartButton) {
        cartButton.addEventListener('click', function(e) {
            e.preventDefault();
            openCart();
        });
    }
    
    // Set up other navigation buttons
    const languageButton = document.getElementById('languageButton');
    if (languageButton) {
        languageButton.addEventListener('click', function(e) {
            e.preventDefault();
            toggleLanguage();
        });
    }
    
    const productsButton = document.getElementById('productsButton');
    if (productsButton) {
        productsButton.addEventListener('click', function(e) {
            e.preventDefault();
            scrollToSection('products');
        });
    }
    
    // Set up CTA button
    const ctaButton = document.getElementById('ctaButton');
    if (ctaButton) {
        ctaButton.addEventListener('click', function(e) {
            e.preventDefault();
            scrollToSection('products');
        });
    }

    // Set up add to cart button
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', addToCart);
    }

    // Set up modal event listeners
    const productModal = document.getElementById('productModal');
    if (productModal) {
        productModal.addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });
    }

    const cartModal = document.getElementById('cartModal');
    if (cartModal) {
        cartModal.addEventListener('click', function(e) {
            if (e.target === this) closeCartModal();
        });
    }

    // ESC key to close modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
            closeCartModal();
            closeCustomModal();
        }
    });
}

// Language Functions
function toggleLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'ar' : 'en';
    
    // Save language preference
    localStorage.setItem('qotore_language', currentLanguage);
    
    // Update HTML attributes
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    
    updateLanguage();
}

function updateLanguage() {
    const elements = document.querySelectorAll('[data-key]');
    elements.forEach(element => {
        const key = element.getAttribute('data-key');
        if (translations[currentLanguage] && translations[currentLanguage][key]) {
            element.textContent = translations[currentLanguage][key];
        }
    });
}

function loadLanguage() {
    // Load saved language preference, default to Arabic
    const savedLanguage = localStorage.getItem('qotore_language') || 'ar';
    currentLanguage = savedLanguage;
    
    // Update HTML attributes
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    
    updateLanguage();
}

// API Functions
async function loadFragrances() {
    try {
        showLoading();
        const response = await fetch('/api/fragrances');
        const data = await response.json();
        
        console.log('Fragrances API response:', data);
        
        if (data.success && data.data) {
            fragrances = data.data;
            displayFragrances();
        } else {
            console.error('Failed to load fragrances:', data);
            showEmptyState();
        }
    } catch (error) {
        console.error('Error loading fragrances:', error);
        showEmptyState();
    }
}

// Display Functions
function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('productsGrid').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
}

function showEmptyState() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('productsGrid').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
}

function displayFragrances() {
    const grid = document.getElementById('productsGrid');
    const loading = document.getElementById('loading');
    const emptyState = document.getElementById('emptyState');
    
    if (fragrances.length === 0) {
        showEmptyState();
        return;
    }
    
    loading.style.display = 'none';
    emptyState.style.display = 'none';
    grid.style.display = 'grid';
    
    grid.innerHTML = '';
    
    fragrances.forEach(fragrance => {
        const card = createProductCard(fragrance);
        grid.appendChild(card);
    });
}

function createProductCard(fragrance) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.onclick = () => openProductModal(fragrance);
    
    // Get price range
    const sampleVariants = fragrance.variants.filter(v => !v.is_whole_bottle);
    let priceDisplay = 'Contact for pricing';
    
    if (sampleVariants.length > 0) {
        const prices = sampleVariants.map(v => v.price).filter(p => p > 0);
        if (prices.length > 0) {
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            priceDisplay = minPrice === maxPrice 
                ? `${minPrice.toFixed(3)} OMR`
                : `${minPrice.toFixed(3)} - ${maxPrice.toFixed(3)} OMR`;
        }
    }
    
    card.innerHTML = `
        <div class="product-image">
            ${fragrance.image_path ? 
                `<img src="/api/image/${fragrance.image_path.replace('fragrance-images/', '')}" alt="${fragrance.name}" onerror="this.style.display='none'">` :
                '🌸'
            }
        </div>
        <div class="product-info">
            ${fragrance.brand ? `<div class="product-brand">${fragrance.brand}</div>` : ''}
            <h3 class="product-name">${fragrance.name}</h3>
            <p class="product-description">${fragrance.description || ''}</p>
            <div class="product-price">${priceDisplay}</div>
        </div>
    `;
    
    return card;
}

// Modal Functions
function openProductModal(fragrance) {
    currentFragrance = fragrance;
    selectedVariant = null;
    
    console.log('Opening modal for fragrance:', fragrance);
    
    document.getElementById('modalTitle').textContent = fragrance.name;
    document.getElementById('modalBrand').textContent = fragrance.brand || '';
    document.getElementById('modalDescription').textContent = fragrance.description || '';
    
    // Set image
    const modalImage = document.getElementById('modalImage');
    if (fragrance.image_path) {
        modalImage.src = `/api/image/${fragrance.image_path.replace('fragrance-images/', '')}`;
        modalImage.style.display = 'block';
        modalImage.onerror = () => {
            modalImage.style.display = 'none';
        };
    } else {
        modalImage.style.display = 'none';
    }
    
    // Display variants
    displayVariants(fragrance.variants);
    
    document.getElementById('productModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function displayVariants(variants) {
    const variantsList = document.getElementById('variantsList');
    variantsList.innerHTML = '';
    
    console.log('Displaying variants:', variants);
    
    variants.forEach((variant, index) => {
        const variantDiv = document.createElement('div');
        variantDiv.className = 'variant-item';
        variantDiv.onclick = () => selectVariant(variant, variantDiv);
        
        if (variant.is_whole_bottle) {
            variantDiv.classList.add('whole-bottle');
            variantDiv.innerHTML = `
                <span>🎁 Full Bottle</span>
                <span>Contact for pricing</span>
            `;
        } else {
            variantDiv.innerHTML = `
                <span>${variant.size}</span>
                <span>${variant.price_display}</span>
            `;
        }
        
        variantsList.appendChild(variantDiv);
    });
}

function selectVariant(variant, element) {
    console.log('Selected variant:', variant);
    
    // Remove previous selection
    document.querySelectorAll('.variant-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Select current variant
    element.classList.add('selected');
    selectedVariant = variant;
    
    // Show/hide quantity selector and update button
    const quantitySection = document.getElementById('quantitySection');
    const addToCartBtn = document.getElementById('addToCartBtn');
    
    if (variant.is_whole_bottle) {
        quantitySection.style.display = 'none';
        addToCartBtn.disabled = true;
        addToCartBtn.textContent = 'Contact for Full Bottle';
    } else {
        quantitySection.style.display = 'block';
        addToCartBtn.disabled = false;
        addToCartBtn.textContent = translations[currentLanguage]['modal.add_to_cart'] || 'Add to Cart';
        // Reset quantity to 1
        document.getElementById('quantityInput').value = 1;
    }
}

function closeModal() {
    document.getElementById('productModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    selectedVariant = null;
    currentFragrance = null;
}

// Cart Functions
function addToCart() {
    if (!selectedVariant || selectedVariant.is_whole_bottle) {
        console.warn('Cannot add to cart:', { selectedVariant, isWholeBottle: selectedVariant?.is_whole_bottle });
        return;
    }
    
    // Validate variant has required fields
    if (!selectedVariant.id || typeof selectedVariant.id !== 'number') {
        console.error('Invalid variant - missing or invalid ID:', selectedVariant);
        showCustomAlert('Error: Invalid product variant. Please refresh the page and try again.');
        return;
    }

    // Get quantity from input
    const quantityInput = document.getElementById('quantityInput');
    const requestedQuantity = parseInt(quantityInput.value) || 1;
    
    if (requestedQuantity < 1 || requestedQuantity > 10) {
        showCustomAlert('Please select a quantity between 1 and 10.');
        return;
    }
    
    console.log('Adding to cart:', { fragrance: currentFragrance, variant: selectedVariant, quantity: requestedQuantity });
    
    const cartItem = {
        id: `${currentFragrance.id}-${selectedVariant.id}`,
        fragranceId: currentFragrance.id,
        fragranceName: currentFragrance.name,
        fragranceBrand: currentFragrance.brand || '',
        variant: {
            id: selectedVariant.id,
            size: selectedVariant.size,
            price: selectedVariant.price,
            price_display: selectedVariant.price_display,
            is_whole_bottle: selectedVariant.is_whole_bottle || false
        },
        quantity: requestedQuantity,
        price: selectedVariant.price
    };
    
    console.log('Cart item created:', cartItem);
    
    // Check if item already exists
    const existingIndex = cart.findIndex(item => item.id === cartItem.id);
    
    if (existingIndex !== -1) {
        cart[existingIndex].quantity += requestedQuantity;
        console.log('Updated existing cart item quantity');
    } else {
        cart.push(cartItem);
        console.log('Added new cart item');
    }
    
    saveCart();
    updateCartCount();
    closeModal();
    
    // Show success message with delay to ensure modal is closed first
    setTimeout(() => {
        const productName = `${currentFragrance.brand ? currentFragrance.brand + ' ' : ''}${currentFragrance.name}`;
        showCustomAlert(`✅ Added ${requestedQuantity} × ${selectedVariant.size} ${productName} to cart!`);
    }, 100);
}

function openCart() {
    displayCartItems();
    document.getElementById('cartModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCartModal() {
    document.getElementById('cartModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function displayCartItems() {
    const cartItems = document.getElementById('cartItems');
    cartItems.innerHTML = '';
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">Your cart is empty</p>';
        document.getElementById('cartTotal').textContent = '0.000 OMR';
        return;
    }
    
    let total = 0;
    
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item';
        
        itemDiv.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-name">${item.fragranceBrand ? item.fragranceBrand + ' ' : ''}${item.fragranceName}</div>
                <div class="cart-item-details">${item.variant.size} - ${item.variant.price_display} × ${item.quantity}</div>
            </div>
            <div class="cart-item-price">${itemTotal.toFixed(3)} OMR</div>
            <button onclick="removeFromCart(${index})" style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Remove</button>
        `;
        
        cartItems.appendChild(itemDiv);
    });
    
    document.getElementById('cartTotal').textContent = `${total.toFixed(3)} OMR`;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartCount();
    displayCartItems();
}

function clearCart() {
    if (confirm('Clear all items from cart?')) {
        cart = [];
        saveCart();
        updateCartCount();
        displayCartItems();
    }
}

function proceedToCheckout() {
    if (cart.length === 0) {
        alert('Your cart is empty');
        return;
    }
    
    console.log('Proceeding to checkout with cart:', cart);
    window.location.href = 'checkout.html';
}

function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    document.getElementById('cartCount').textContent = count;
    document.getElementById('cartCount').style.display = count > 0 ? 'flex' : 'none';
}

function saveCart() {
    localStorage.setItem('qotore_cart', JSON.stringify(cart));
    console.log('Cart saved:', cart);
}

function loadCart() {
    const savedCart = localStorage.getItem('qotore_cart');
    if (savedCart) {
        try {
            const parsedCart = JSON.parse(savedCart);
            // Validate cart items have required fields
            cart = parsedCart.filter(item => {
                const isValid = (
                    item.id &&
                    item.fragranceId &&
                    item.variant &&
                    typeof item.variant.id === 'number' &&
                    item.variant.size &&
                    typeof item.quantity === 'number'
                );
                if (!isValid) {
                    console.warn('Removing invalid cart item:', item);
                }
                return isValid;
            });
            console.log('Cart loaded and validated:', cart);
            
            // Save cleaned cart back to localStorage
            if (cart.length !== parsedCart.length) {
                saveCart();
            }
        } catch (error) {
            console.error('Error loading cart:', error);
            cart = [];
            localStorage.removeItem('qotore_cart');
        }
    }
}

// Utility Functions
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Quantity control functions for modal
function changeQuantity(delta) {
    const input = document.getElementById('quantityInput');
    if (!input) return;
    
    const currentValue = parseInt(input.value) || 1;
    const newValue = Math.max(1, Math.min(10, currentValue + delta));
    input.value = newValue;
}

// Custom Modal Functions
function showCustomAlert(message) {
    createCustomModal({
        title: '🌸 Qotore',
        message: message,
        type: 'alert',
        buttons: [
            { text: 'OK', action: 'close', primary: true }
        ]
    });
}

function showCustomConfirm(message, onConfirm) {
    createCustomModal({
        title: '🌸 Confirm',
        message: message,
        type: 'confirm',
        buttons: [
            { text: 'Cancel', action: 'close', primary: false },
            { text: 'Confirm', action: onConfirm, primary: true }
        ]
    });
}

function createCustomModal(config) {
    // Remove existing custom modal if any
    const existingModal = document.getElementById('customModal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'customModal';
    modal.className = 'custom-modal';
    
    modal.innerHTML = `
        <div class="custom-modal-content">
            <div class="custom-modal-header">
                <h3>${config.title}</h3>
            </div>
            <div class="custom-modal-body">
                <p>${config.message}</p>
            </div>
            <div class="custom-modal-footer">
                ${config.buttons.map((button, index) => `
                    <button class="custom-modal-btn ${button.primary ? 'primary' : 'secondary'}" 
                            data-action-index="${index}">
                        ${button.text}
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    
    // Show modal with animation
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);

    // Add event listeners
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeCustomModal();
        }
    });

    modal.querySelectorAll('.custom-modal-btn').forEach((btn, index) => {
        btn.addEventListener('click', function() {
            const actionIndex = parseInt(this.getAttribute('data-action-index'));
            const button = config.buttons[actionIndex];
            
            closeCustomModal();
            
            if (button.action !== 'close' && typeof button.action === 'function') {
                button.action();
            }
        });
    });
}

function closeCustomModal() {
    const modal = document.getElementById('customModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

//=====================================================================


// Image cache management for main page
class ImageCacheManager {
    constructor() {
        this.cacheTimestamp = Date.now();
        this.imageLoadAttempts = new Map();
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
    }

    // Generate cache buster parameter
    generateCacheBuster(imagePath) {
        // Use timestamp + image path hash for uniqueness
        const pathHash = this.simpleHash(imagePath);
        return `${this.cacheTimestamp}_${pathHash}`;
    }

    // Simple hash function for image paths
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    // Get image URL with cache buster
    getImageUrl(imagePath, forceRefresh = false) {
        if (!imagePath) return null;
        
        // Clean the image path
        const cleanPath = imagePath.replace('fragrance-images/', '');
        
        // Generate cache buster
        const cacheBuster = forceRefresh ? Date.now() : this.generateCacheBuster(imagePath);
        
        return `/api/image/${cleanPath}?v=${cacheBuster}`;
    }

    // Load image with retry logic
    async loadImageWithRetry(imagePath, targetElement) {
        const imageUrl = this.getImageUrl(imagePath);
        const attempts = this.imageLoadAttempts.get(imagePath) || 0;

        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                // Success - update the target element
                if (targetElement) {
                    targetElement.src = imageUrl;
                    targetElement.style.display = 'block';
                }
                this.imageLoadAttempts.delete(imagePath); // Clear attempts on success
                resolve(imageUrl);
            };
            
            img.onerror = () => {
                console.warn(`Failed to load image: ${imageUrl} (attempt ${attempts + 1}/${this.maxRetries})`);
                
                if (attempts < this.maxRetries) {
                    // Retry with a delay
                    this.imageLoadAttempts.set(imagePath, attempts + 1);
                    setTimeout(() => {
                        // Try with force refresh
                        const refreshedUrl = this.getImageUrl(imagePath, true);
                        img.src = refreshedUrl;
                    }, this.retryDelay * (attempts + 1));
                } else {
                    // Max retries reached - show fallback
                    this.imageLoadAttempts.delete(imagePath);
                    if (targetElement) {
                        targetElement.style.display = 'none';
                        // Show fallback icon
                        const parent = targetElement.parentElement;
                        if (parent) {
                            parent.innerHTML = '<span class="fallback-icon">🌸</span>';
                        }
                    }
                    reject(new Error(`Failed to load image after ${this.maxRetries} attempts`));
                }
            };
            
            img.src = imageUrl;
        });
    }

    // Refresh all images on the page
    refreshAllImages() {
        console.log('🔄 Refreshing all product images...');
        this.cacheTimestamp = Date.now();
        
        // Find all product images
        const productImages = document.querySelectorAll('.product-image img, #modalImage');
        productImages.forEach(img => {
            const originalSrc = img.src;
            if (originalSrc && originalSrc.includes('/api/image/')) {
                // Extract image path from current src
                const pathMatch = originalSrc.match(/\/api\/image\/([^?]+)/);
                if (pathMatch) {
                    const imagePath = pathMatch[1];
                    const newUrl = this.getImageUrl(imagePath, true);
                    img.src = newUrl;
                    console.log(`🖼️ Refreshed: ${imagePath}`);
                }
            }
        });
    }

    // Preload images for better performance
    preloadImages(fragrances) {
        console.log('⬇️ Preloading product images...');
        fragrances.forEach(fragrance => {
            if (fragrance.image_path) {
                const img = new Image();
                img.src = this.getImageUrl(fragrance.image_path);
            }
        });
    }
}

// Global image cache manager instance
const imageCacheManager = new ImageCacheManager();

// Enhanced createProductCard function with cache busting
function createProductCard(fragrance) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.onclick = () => openProductModal(fragrance);
    
    // Get price range
    const sampleVariants = fragrance.variants.filter(v => !v.is_whole_bottle);
    let priceDisplay = 'Contact for pricing';
    
    if (sampleVariants.length > 0) {
        const prices = sampleVariants.map(v => v.price).filter(p => p > 0);
        if (prices.length > 0) {
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            priceDisplay = minPrice === maxPrice 
                ? `${minPrice.toFixed(3)} OMR`
                : `${minPrice.toFixed(3)} - ${maxPrice.toFixed(3)} OMR`;
        }
    }

    // Create image URL with cache buster
    const imageUrl = fragrance.image_path ? 
        imageCacheManager.getImageUrl(fragrance.image_path) : null;
    
    card.innerHTML = `
        <div class="product-image">
            ${imageUrl ? 
                `<img src="${imageUrl}" alt="${fragrance.name}" loading="lazy" onerror="handleImageError(this, '${fragrance.image_path}')">` :
                '<span class="fallback-icon">🌸</span>'
            }
        </div>
        <div class="product-info">
            ${fragrance.brand ? `<div class="product-brand">${fragrance.brand}</div>` : ''}
            <h3 class="product-name">${fragrance.name}</h3>
            <div class="product-price">${priceDisplay}</div>
        </div>
    `;
    
    return card;
}

// Enhanced openProductModal function with cache busting
function openProductModal(fragrance) {
    const modal = document.getElementById('productModal');
    const modalImage = document.getElementById('modalImage');
    const modalTitle = document.getElementById('modalTitle');
    const modalBrand = document.getElementById('modalBrand');
    const modalDescription = document.getElementById('modalDescription');
    const modalVariants = document.getElementById('modalVariants');

    // Set basic info
    modalTitle.textContent = fragrance.name;
    modalBrand.textContent = fragrance.brand || '';
    modalDescription.textContent = fragrance.description || 'No description available';

    // Set image with cache buster
    if (fragrance.image_path) {
        const imageUrl = imageCacheManager.getImageUrl(fragrance.image_path);
        modalImage.src = imageUrl;
        modalImage.alt = fragrance.name;
        modalImage.style.display = 'block';
        
        // Handle image load error
        modalImage.onerror = () => handleImageError(modalImage, fragrance.image_path);
    } else {
        modalImage.style.display = 'none';
    }

    // Set variants
    if (modalVariants && fragrance.variants) {
        modalVariants.innerHTML = fragrance.variants.map(variant => `
            <div class="variant-option" data-variant-id="${variant.id}">
                <label>
                    <input type="radio" name="variant" value="${variant.id}">
                    <span class="variant-info">
                        <span class="variant-size">${variant.size}</span>
                        <span class="variant-price">${variant.price_display}</span>
                    </span>
                </label>
            </div>
        `).join('');
    }

    modal.style.display = 'flex';
}

// Handle image loading errors with retry
function handleImageError(imgElement, imagePath) {
    console.warn('Image failed to load, attempting retry:', imagePath);
    
    if (imgElement && imagePath) {
        // Try to reload with cache manager
        imageCacheManager.loadImageWithRetry(imagePath, imgElement)
            .catch(error => {
                console.error('Failed to load image after retries:', error);
            });
    }
}

// Enhanced displayFragrances function
function displayFragrances() {
    const grid = document.getElementById('productsGrid');
    const loading = document.getElementById('loading');
    const emptyState = document.getElementById('emptyState');
    
    if (fragrances.length === 0) {
        showEmptyState();
        return;
    }
    
    loading.style.display = 'none';
    emptyState.style.display = 'none';
    grid.style.display = 'grid';
    
    grid.innerHTML = '';
    
    // Preload images for better performance
    imageCacheManager.preloadImages(fragrances);
    
    fragrances.forEach(fragrance => {
        const card = createProductCard(fragrance);
        grid.appendChild(card);
    });
    
    console.log(`✅ Displayed ${fragrances.length} products with cache-busted images`);
}

// Add refresh functionality to main page
function refreshProductImages() {
    imageCacheManager.refreshAllImages();
    
    // Also reload fragrances data
    loadFragrances();
}

// Auto-refresh images periodically (optional)
function startImageRefreshTimer(intervalMinutes = 10) {
    setInterval(() => {
        console.log('🔄 Auto-refreshing product images...');
        imageCacheManager.refreshAllImages();
    }, intervalMinutes * 60 * 1000);
}

// Add manual refresh button (optional)
function addRefreshButton() {
    // Check if refresh button already exists
    if (document.getElementById('refreshImagesBtn')) return;
    
    const heroSection = document.querySelector('.hero-content');
    if (heroSection) {
        const refreshBtn = document.createElement('button');
        refreshBtn.id = 'refreshImagesBtn';
        refreshBtn.className = 'refresh-images-btn';
        refreshBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6 0-3.31 2.69-6 6-6 1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
            Refresh Images
        `;
        refreshBtn.onclick = refreshProductImages;
        refreshBtn.style.cssText = `
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 0.5rem 1rem;
            border-radius: 8px;
            cursor: pointer;
            margin-top: 1rem;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.3s ease;
        `;
        refreshBtn.onmouseover = () => {
            refreshBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        };
        refreshBtn.onmouseout = () => {
            refreshBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        };
        
        heroSection.appendChild(refreshBtn);
    }
}

// Initialize enhanced image loading when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🖼️ Image cache manager initialized');
    
    // Add refresh button (optional)
    addRefreshButton();
    
    // Start auto-refresh timer (optional - every 10 minutes)
    // startImageRefreshTimer(10);
});

// Keyboard shortcut to refresh images (Ctrl+Shift+R)
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        refreshProductImages();
        console.log('🔄 Manual image refresh triggered');
    }
});

// Make functions globally available
window.imageCacheManager = imageCacheManager;
window.refreshProductImages = refreshProductImages;
window.handleImageError = handleImageError;