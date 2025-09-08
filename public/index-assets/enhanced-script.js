// Enhanced Main Page Script with Search, Pagination, and Cart
let fragrances = [];
let filteredFragrances = [];
let cart = [];
let currentLanguage = 'en';
let selectedVariant = null;
let currentFragrance = null;
let currentPage = 1;
let itemsPerPage = 24;
let searchTerm = '';
let sortBy = 'name';
let translations = {};

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        showLoadingSplash();
        await loadTranslations();
        loadLanguagePreference();
        loadCart();
        await loadFragrances();
        initializeEventListeners();
        setupScrollEffects();
        updateCartDisplay();
        hideLoadingSplash();
    } catch (error) {
        console.error('Error initializing app:', error);
        hideLoadingSplash();
    }
}

// Translation Management
async function loadTranslations() {
    try {
        const response = await fetch('/translations.json');
        translations = await response.json();
    } catch (error) {
        console.error('Failed to load translations:', error);
        translations = { en: {}, ar: {} };
    }
}

function t(key) {
    return translations[currentLanguage]?.[key] || key;
}

function updateTranslations() {
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        const translation = t(key);
        if (translation !== key) {
            element.textContent = translation;
        }
    });
    
    document.querySelectorAll('[data-translate-placeholder]').forEach(element => {
        const key = element.getAttribute('data-translate-placeholder');
        const translation = t(key);
        if (translation !== key) {
            element.placeholder = translation;
        }
    });

    document.querySelectorAll('[data-translate-title]').forEach(element => {
        const key = element.getAttribute('data-translate-title');
        const translation = t(key);
        if (translation !== key) {
            element.title = translation;
        }
    });
}

function loadLanguagePreference() {
    const savedLanguage = localStorage.getItem('qotore_language') || 'en';
    currentLanguage = savedLanguage;
    
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    
    const langButton = document.getElementById('currentLang');
    if (langButton) {
        langButton.textContent = currentLanguage.toUpperCase();
    }
    
    updateTranslations();
}

function toggleLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'ar' : 'en';
    
    localStorage.setItem('qotore_language', currentLanguage);
    
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    
    const langButton = document.getElementById('currentLang');
    if (langButton) {
        langButton.textContent = currentLanguage.toUpperCase();
    }
    
    updateTranslations();
}

// Loading Management
function showLoadingSplash() {
    const splash = document.getElementById('loadingSplash');
    if (splash) {
        splash.classList.remove('hidden');
    }
}

function hideLoadingSplash() {
    const splash = document.getElementById('loadingSplash');
    if (splash) {
        setTimeout(() => {
            splash.classList.add('hidden');
        }, 500);
    }
}

// API Functions
async function loadFragrances() {
    try {
        showLoading();
        const response = await fetch('/api/fragrances');
        const data = await response.json();
        
        if (data.success && data.data) {
            fragrances = data.data;
            applyFiltersAndSort();
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
    document.getElementById('paginationContainer').style.display = 'none';
}

function showEmptyState() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('productsGrid').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('paginationContainer').style.display = 'none';
}

function applyFiltersAndSort() {
    // Filter by search term
    filteredFragrances = fragrances.filter(fragrance => {
        if (!searchTerm) return true;
        
        const searchLower = searchTerm.toLowerCase();
        return (
            fragrance.name.toLowerCase().includes(searchLower) ||
            (fragrance.brand && fragrance.brand.toLowerCase().includes(searchLower)) ||
            (fragrance.description && fragrance.description.toLowerCase().includes(searchLower))
        );
    });
    
    // Sort
    filteredFragrances.sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'brand':
                return (a.brand || '').localeCompare(b.brand || '');
            case 'price_low':
                return getMinPrice(a) - getMinPrice(b);
            case 'price_high':
                return getMinPrice(b) - getMinPrice(a);
            default:
                return 0;
        }
    });
    
    displayFragrances();
    updateSearchUI();
}

function getMinPrice(fragrance) {
    const sampleVariants = fragrance.variants.filter(v => !v.is_whole_bottle && v.price > 0);
    if (sampleVariants.length === 0) return 0;
    return Math.min(...sampleVariants.map(v => v.price));
}

function displayFragrances() {
    const grid = document.getElementById('productsGrid');
    const loading = document.getElementById('loading');
    const emptyState = document.getElementById('emptyState');
    const paginationContainer = document.getElementById('paginationContainer');
    
    if (filteredFragrances.length === 0) {
        showEmptyState();
        return;
    }
    
    loading.style.display = 'none';
    emptyState.style.display = 'none';
    grid.style.display = 'grid';
    
    // Pagination
    const totalPages = Math.ceil(filteredFragrances.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPageItems = filteredFragrances.slice(startIndex, endIndex);
    
    // Clear and populate grid
    grid.innerHTML = '';
    currentPageItems.forEach(fragrance => {
        const card = createProductCard(fragrance);
        grid.appendChild(card);
    });
    
    // Show pagination if needed
    if (totalPages > 1) {
        renderPagination(totalPages);
        paginationContainer.style.display = 'flex';
    } else {
        paginationContainer.style.display = 'none';
    }
    
    // Add animation
    grid.classList.add('fade-in');
}

function createProductCard(fragrance) {
    const card = document.createElement('div');
    card.className = 'product-card slide-up';
    card.onclick = () => openProductModal(fragrance);
    
    // Get price range
    const sampleVariants = fragrance.variants.filter(v => !v.is_whole_bottle);
    let priceDisplay = t('contact_pricing') || 'Contact for pricing';
    
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
    
    const bustParam = `cb=${Math.floor(Date.now() / 60000)}`;

       card.innerHTML = `
        <div class="product-image">
            ${fragrance.image_path ? 
                `<img src="/api/image/${fragrance.image_path.replace('fragrance-images/', '')}?${bustParam}" alt="${fragrance.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='<img src=\'/icons/icon-32x32-dark.png\' alt=\'Qotore Logo\' class=\'fallback-logo\'>';">` :
                '<img src="/icons/icon-32x32-dark.png" alt="Qotore Logo" class="cart-empty-logo">'
            }
        </div>
        <div class="product-info">
            ${fragrance.brand ? `<div class="product-brand">${fragrance.brand}</div>` : ''}
            <h3 class="product-name">${fragrance.name}</h3>
            ${fragrance.description ? `<p class="product-description">${fragrance.description}</p>` : ''}
            <div class="product-price">${priceDisplay}</div>
        </div>
    `;
    
    return card;
}

function renderPagination(totalPages) {
    const container = document.getElementById('paginationContainer');
    container.innerHTML = '';
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // Previous button
    if (currentPage > 1) {
        const prevBtn = createPaginationButton(currentPage - 1, 'Previous', 'prev');
        container.appendChild(prevBtn);
    }
    
    // First page + ellipsis
    if (startPage > 1) {
        container.appendChild(createPaginationButton(1, '1'));
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            container.appendChild(ellipsis);
        }
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        const btn = createPaginationButton(i, i.toString());
        if (i === currentPage) {
            btn.classList.add('active');
        }
        container.appendChild(btn);
    }
    
    // Last page + ellipsis
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            container.appendChild(ellipsis);
        }
        container.appendChild(createPaginationButton(totalPages, totalPages.toString()));
    }
    
    // Next button
    if (currentPage < totalPages) {
        const nextBtn = createPaginationButton(currentPage + 1, 'Next', 'next');
        container.appendChild(nextBtn);
    }
}

function createPaginationButton(page, text, type = 'page') {
    const btn = document.createElement('button');
    btn.className = 'pagination-btn';
    btn.textContent = text;
    btn.onclick = () => changePage(page);
    
    if (type === 'prev' || type === 'next') {
        btn.classList.add(`pagination-${type}`);
    }
    
    return btn;
}

function changePage(page) {
    currentPage = page;
    displayFragrances();
    scrollToSection('products');
}

// Modal Functions
function openProductModal(fragrance) {
    currentFragrance = fragrance;
    selectedVariant = null;
    
    const modal = document.getElementById('productModal');
    const modalImage = document.getElementById('modalImage');
    const modalTitle = document.getElementById('modalTitle');
    const modalBrand = document.getElementById('modalBrand');
    const modalDescription = document.getElementById('modalDescription');
    const variantButtons = document.getElementById('variantButtons');
    const addToCartBtn = document.getElementById('addToCartBtn');
    const quantitySection = document.getElementById('quantitySection');
    
    // Set basic info
    modalTitle.textContent = fragrance.name;
    modalBrand.textContent = fragrance.brand || '';
    modalDescription.textContent = fragrance.description || '';
    
    // Set image
    if (fragrance.image_path) {
        const bustParam = `cb=${Math.floor(Date.now() / 60000)}`;
        modalImage.src = `/api/image/${fragrance.image_path.replace('fragrance-images/', '')}?${bustParam}`;
        modalImage.alt = fragrance.name;
        modalImage.style.display = 'block';
        modalImage.onerror = () => {
            modalImage.style.display = 'none';
        };
    } else {
        modalImage.style.display = 'none';
    }
    
    // Create variant buttons
    variantButtons.innerHTML = '';
    fragrance.variants.forEach(variant => {
        const btn = document.createElement('button');
        btn.className = 'variant-btn';
        
        if (variant.is_whole_bottle) {
            btn.classList.add('whole-bottle');
            btn.innerHTML = `<div>${t('full_bottle') || 'Full Bottle'}</div><div>${t('contact_pricing') || 'Contact for pricing'}</div>`;
            btn.onclick = () => {
                // For whole bottles, just redirect to WhatsApp
                window.open('https://wa.me/96812345678', '_blank');
            };
        } else {
            btn.innerHTML = `<div>${variant.size}</div><div>${variant.price_display}</div>`;
            btn.onclick = () => selectVariant(variant, btn);
        }
        
        variantButtons.appendChild(btn);
    });
    
    // Reset modal state
    quantitySection.style.display = 'none';
    addToCartBtn.disabled = true;
    addToCartBtn.textContent = t('modal_choose_size') || 'Choose Size';
    addToCartBtn.onclick = null;
    
    // Reset quantity input
    const quantityInput = document.getElementById('quantityInput');
    if (quantityInput) {
        quantityInput.value = 1;
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function selectVariant(variant, buttonElement) {
    // Remove previous selection
    document.querySelectorAll('.variant-btn.selected').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Select new variant
    buttonElement.classList.add('selected');
    selectedVariant = variant;
    
    // Update add to cart button
    const addToCartBtn = document.getElementById('addToCartBtn');
    addToCartBtn.disabled = false;
    addToCartBtn.textContent = t('modal_add_to_cart') || 'Add to Cart';
}

function closeModal() {
    const modal = document.getElementById('productModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentFragrance = null;
    selectedVariant = null;
}

// Cart Management
function loadCart() {
    try {
        const savedCart = localStorage.getItem('qotore_cart');
        cart = savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
        console.error('Error loading cart:', error);
        cart = [];
    }
}

function saveCart() {
    try {
        localStorage.setItem('qotore_cart', JSON.stringify(cart));
    } catch (error) {
        console.error('Error saving cart:', error);
    }
}

function addToCart() {
    if (!currentFragrance || !selectedVariant) {
        showCustomAlert(t('please_select_variant') || 'Please select a size first');
        return;
    }
    
    // Check if item already exists in cart
    const existingItemIndex = cart.findIndex(item => 
        item.fragranceId === currentFragrance.id && 
        item.variantId === selectedVariant.id
    );
    
    if (existingItemIndex > -1) {
        // Increase quantity
        cart[existingItemIndex].quantity += 1;
    } else {
        // Add new item
        cart.push({
            fragranceId: currentFragrance.id,
            variantId: selectedVariant.id,
            fragranceName: currentFragrance.name,
            fragranceBrand: currentFragrance.brand,
            variant: selectedVariant,
            quantity: 1,
            image_path: currentFragrance.image_path
        });
    }
    
    saveCart();
    updateCartDisplay();
    closeModal();
    showCustomAlert(t('added_to_cart') || 'Added to cart!');
}

function updateCartDisplay() {
    const cartCount = document.getElementById('cartCount');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    if (totalItems > 0) {
        cartCount.textContent = totalItems;
        cartCount.style.display = 'flex';
    } else {
        cartCount.style.display = 'none';
    }
}

function removeFromCart(index) {
    if (index >= 0 && index < cart.length) {
        const removedItem = cart[index];
        cart.splice(index, 1);
        saveCart();
        updateCartDisplay();
        renderCartSidebar();
        
        // Show confirmation message
        const productName = `${removedItem.fragranceBrand ? removedItem.fragranceBrand + ' ' : ''}${removedItem.fragranceName}`;
        showCustomAlert(`🗑️ ${t('item_removed') || 'Removed'} ${productName} ${t('from_cart') || 'from cart'}`);
    }
}

function updateCartQuantity(index, change) {
    if (cart[index]) {
        const newQuantity = cart[index].quantity + change;
        
        if (newQuantity <= 0) {
            // Remove item if quantity becomes 0 or less
            removeFromCart(index);
        } else if (newQuantity <= 10) {
            // Update quantity if within limits
            cart[index].quantity = newQuantity;
            saveCart();
            updateCartDisplay();
            renderCartSidebar();
        } else {
            // Show limit message if trying to exceed maximum
            showCustomAlert(t('quantity_limit') || 'Maximum 10 items per fragrance variant');
        }
    }
}

function setCartQuantity(index, quantity) {
    const qty = parseInt(quantity);
    if (cart[index] && qty >= 1 && qty <= 10) {
        cart[index].quantity = qty;
        saveCart();
        updateCartDisplay();
        renderCartSidebar();
    } else if (qty < 1) {
        // Remove item if quantity is set to 0
        removeFromCart(index);
    } else if (qty > 10) {
        // Reset to maximum and show message
        cart[index].quantity = 10;
        document.querySelector(`#cartSidebarContent .qty-input[onchange*="${index}"]`).value = 10;
        saveCart();
        renderCartSidebar();
        showCustomAlert(t('quantity_limit') || 'Maximum 10 items per fragrance variant');
    }
}

function clearCart() {
    cart = [];
    saveCart();
    updateCartDisplay();
    renderCartSidebar();
}

// Cart Sidebar
function openCartSidebar() {
    const sidebar = document.getElementById('cartSidebar');
    sidebar.classList.add('open');
    renderCartSidebar();
    document.body.style.overflow = 'hidden';
}

function closeCartSidebar() {
    const sidebar = document.getElementById('cartSidebar');
    sidebar.classList.remove('open');
    document.body.style.overflow = 'auto';
}

function renderCartSidebar() {
    const content = document.getElementById('cartSidebarContent');
    const footer = document.getElementById('cartSidebarFooter');
    const totalElement = document.getElementById('sidebarTotal');
    
    if (cart.length === 0) {
        content.innerHTML = `
            <div class="cart-empty">
                <div class="cart-empty-icon">🛒</div>
                <h3>${t('cart_empty') || 'Your cart is empty'}</h3>
                <p>${t('add_fragrances') || 'Add some fragrances to get started'}</p>
            </div>
        `;
        footer.style.display = 'none';
        return;
    }
    
    footer.style.display = 'block';
    
    let total = 0;
    content.innerHTML = cart.map((item, index) => {
        const itemTotal = (item.variant.price) * item.quantity;
        total += itemTotal;
        
        const bustParam = `cb=${Math.floor(Date.now() / 60000)}`;

        return `
    <div class="cart-item">
        <div class="cart-item-image">
            ${item.image_path ? 
                `<img src="/api/image/${item.image_path.replace('fragrance-images/', '')}?${bustParam}" alt="${item.fragranceName}">` :
                '<img src="/icons/icon-32x32-dark.png" alt="Qotore Logo" class="product-fallback-logo">'
            }
        </div>
        <div class="cart-item-details">
            <div class="cart-item-header">
                <div class="cart-item-name">
                    ${item.fragranceBrand ? item.fragranceBrand + ' ' : ''}${item.fragranceName}
                </div>
                <button class="remove-item-btn" onclick="removeFromCart(${index})">✕</button>
            </div>
            <div class="cart-item-variant">${item.variant.size}</div>
            <div class="cart-item-controls">
                <button class="qty-btn" onclick="updateCartQuantity(${index}, -1)" ${item.quantity <= 1 ? 'disabled' : ''}>
                    ${item.quantity <= 1 ? '×' : '−'}
                </button>
                <input type="number" class="qty-input" value="${item.quantity}" 
                       min="1" max="10" onchange="setCartQuantity(${index}, this.value)">
                <button class="qty-btn" onclick="updateCartQuantity(${index}, 1)" ${item.quantity >= 10 ? 'disabled' : ''}>+</button>
            </div>
        </div>
        <div class="cart-item-price">${itemTotal.toFixed(3)} OMR</div>
    </div>
`;

    }).join('');
    
    totalElement.textContent = `${total.toFixed(3)} OMR`;
}

// Event Listeners
function initializeEventListeners() {
    
    // Search with clear button
    const searchInput = document.getElementById('searchInput');
    const searchClearBtn = document.getElementById('searchClearBtn');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            searchTerm = e.target.value;
            currentPage = 1;
            applyFiltersAndSort();
            updateSearchUI();
        }, 300));
    }
    
    if (searchClearBtn) {
        searchClearBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchTerm = '';
            currentPage = 1;
            applyFiltersAndSort();
            updateSearchUI();
            searchInput.focus();
        });
    }
    
    // Sort
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortBy = e.target.value;
            currentPage = 1;
            applyFiltersAndSort();
        });
    }
    
    // Items per page
    const itemsSelect = document.getElementById('itemsPerPageSelect');
    if (itemsSelect) {
        itemsSelect.addEventListener('change', (e) => {
            itemsPerPage = parseInt(e.target.value);
            currentPage = 1;
            applyFiltersAndSort();
        });
    }
    
    // Language toggle
    const languageButton = document.getElementById('languageButton');
    if (languageButton) {
        languageButton.addEventListener('click', toggleLanguage);
    }
    
    // Cart button
    const cartButton = document.getElementById('cartButton');
    if (cartButton) {
        cartButton.addEventListener('click', openCartSidebar);
    }
    
    // Cart sidebar
    const closeSidebar = document.getElementById('closeSidebar');
    if (closeSidebar) {
        closeSidebar.addEventListener('click', closeCartSidebar);
    }
    
    const clearCartSidebar = document.getElementById('clearCartSidebar');
    if (clearCartSidebar) {
        clearCartSidebar.addEventListener('click', () => {
            if (confirm(t('confirm_clear_cart') || 'Are you sure you want to clear your cart?')) {
                clearCart();
            }
        });
    }
    
    const checkoutSidebar = document.getElementById('checkoutSidebar');
    if (checkoutSidebar) {
        checkoutSidebar.addEventListener('click', () => {
            window.location.href = '/checkout.html';
        });
    }
    
    // Quantity input change handler
    const quantityInput = document.getElementById('quantityInput');
    if (quantityInput) {
        quantityInput.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (value < 1) e.target.value = 1;
            if (value > 10) e.target.value = 10;
            
            // Update button states
            const decreaseBtn = e.target.previousElementSibling;
            const increaseBtn = e.target.nextElementSibling;
            
            if (decreaseBtn) {
                decreaseBtn.disabled = parseInt(e.target.value) <= 1;
            }
            
            if (increaseBtn) {
                increaseBtn.disabled = parseInt(e.target.value) >= 10;
            }
        });
    }
    
    // Add to cart button
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', addToCart);
    }
    
    // CTA button
    const ctaButton = document.getElementById('ctaButton');
    if (ctaButton) {
        ctaButton.addEventListener('click', () => scrollToSection('products'));
    }
    
    // Modal close
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }
    
    const cartSidebar = document.getElementById('cartSidebar');
    if (cartSidebar) {
        cartSidebar.addEventListener('click', (e) => {
            if (e.target === cartSidebar) closeCartSidebar();
        });
    }
    
    // ESC key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeCartSidebar();
        }
    });
}

// Scroll Effects
function setupScrollEffects() {
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            scrollTopBtn.style.display = 'flex';
        } else {
            scrollTopBtn.style.display = 'none';
        }
    });
    
    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// Utility Functions
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

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

function showCustomAlert(message) {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: #333;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        z-index: 10000;
        font-size: 0.9rem;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Hide toast
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Add this new function to update search UI
function updateSearchUI() {
    const searchInput = document.getElementById('searchInput');
    const searchClearBtn = document.getElementById('searchClearBtn');
    const searchResultsInfo = document.getElementById('searchResultsInfo');
    const resultsCount = document.getElementById('resultsCount');
    const searchTermDisplay = document.getElementById('searchTermDisplay');
    
    // Show/hide clear button
    if (searchInput && searchClearBtn) {
        if (searchInput.value.trim()) {
            searchClearBtn.style.display = 'flex';
        } else {
            searchClearBtn.style.display = 'none';
        }
    }
    
    // Show/hide search results info
    if (searchResultsInfo && resultsCount && searchTermDisplay) {
        if (searchTerm.trim()) {
            searchResultsInfo.style.display = 'block';
            resultsCount.textContent = filteredFragrances.length;
            searchTermDisplay.textContent = `for "${searchTerm}"`;
        } else {
            searchResultsInfo.style.display = 'none';
        }
    }
}

// Global functions for external access
window.openCartSidebar = openCartSidebar;
window.closeCartSidebar = closeCartSidebar;
window.updateCartQuantity = updateCartQuantity;
window.setCartQuantity = setCartQuantity;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.closeModal = closeModal;