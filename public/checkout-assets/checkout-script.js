let currentLanguage = 'ar';
let translations = {};

// Translation Functions
async function loadTranslations() {
    try {
        const response = await fetch('/checkout-assets/checkout-translations.json');
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

    const titleElement = document.querySelector('title');
    if (titleElement) {
        const titleKey = titleElement.getAttribute('data-translate');
        if (titleKey) {
            const translation = t(titleKey);
            if (translation !== titleKey) {
                titleElement.textContent = translation;
            }
        }
    }
}

function loadLanguagePreference() {
    const mainPageLanguage = localStorage.getItem('qotore_language');
    const savedLanguage = mainPageLanguage || 'en';
    
    currentLanguage = savedLanguage;
    document.documentElement.setAttribute('dir', currentLanguage === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', currentLanguage);
    
    updateTranslations();
}

//==============================================================
function toggleLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'ar' : 'en';
    localStorage.setItem('qotore_language', currentLanguage);
    document.documentElement.setAttribute('dir', currentLanguage === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', currentLanguage);
    
    updateLanguageButton();
    updateTranslations();
    renderPage(); // Re-render dynamic content
}

function updateLanguageButton() {
    const currentLangSpan = document.getElementById('currentLang');
    const otherLangSpan = document.getElementById('otherLang');
    
    if (currentLangSpan && otherLangSpan) {
        if (currentLanguage === 'en') {
            currentLangSpan.textContent = 'EN';
            otherLangSpan.textContent = 'AR';
        } else {
            currentLangSpan.textContent = 'AR';
            otherLangSpan.textContent = 'EN';
        }
    }
}
//==============================================================
// Checkout Script - Mobile-friendly, Supabase integration
let cart = [];
let customerInfo = null;
let activeOrder = null;
let previousOrders = [];
let customerIP = null;

// Initialize the checkout page
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await loadTranslations();
        loadLanguagePreference();
        await getCustomerIP();
        await loadCustomerInfo();
        await loadCart();
        await checkActiveOrder();
        await loadPreviousOrders();
        renderPage();
    } catch (error) {
        console.error('Error initializing checkout:', error);
        showToast(t('error_loading_checkout'), 'error');
    }
});

// Get customer IP for tracking
async function getCustomerIP() {
    try {
        // Try multiple IP services for reliability
        const ipServices = [
            'https://api.ipify.org?format=json',
            'https://httpbin.org/ip',
            'https://api.ip.sb/ip'
        ];
        
        for (const service of ipServices) {
            try {
                const response = await fetch(service);
                const data = await response.json();
                customerIP = data.ip || data.origin || data;
                if (customerIP) break;
            } catch (error) {
                console.warn('IP service failed:', service, error);
            }
        }
        
        // Fallback to a simple timestamp-based identifier
        if (!customerIP) {
            customerIP = 'guest_' + Date.now();
        }
    } catch (error) {
        console.error('Error getting IP:', error);
        customerIP = 'guest_' + Date.now();
    }
}

// Load customer information from localStorage
function loadCustomerInfo() {
    try {
        const saved = localStorage.getItem('qotore_customer_info');
        if (saved) {
            customerInfo = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Error loading customer info:', error);
        customerInfo = null;
    }
}

// Save customer information to localStorage
function saveCustomerInfo(info) {
    try {
        customerInfo = info;
        localStorage.setItem('qotore_customer_info', JSON.stringify(info));
    } catch (error) {
        console.error('Error saving customer info:', error);
    }
}

// Load cart from localStorage
function loadCart() {
    try {
        const saved = localStorage.getItem('qotore_cart');
        if (saved) {
            const parsedCart = JSON.parse(saved);
            // Validate cart items
            cart = parsedCart.filter(item => {
                return item.id && item.fragranceId && item.variant && 
                       typeof item.variant.id === 'number' && 
                       item.variant.size && typeof item.quantity === 'number';
            });
        }
    } catch (error) {
        console.error('Error loading cart:', error);
        cart = [];
    }
}

// Save cart to localStorage
function saveCart() {
    try {
        localStorage.setItem('qotore_cart', JSON.stringify(cart));
    } catch (error) {
        console.error('Error saving cart:', error);
    }
}

// Check for active order
async function checkActiveOrder() {
    if (!customerIP) return;
    
    try {
        const params = new URLSearchParams({
            ip: customerIP
        });
        
        if (customerInfo?.phone) {
            params.append('phone', customerInfo.phone);
        }
        
        const response = await fetch(`/functions/api/check-active-order?${params}`);
        const data = await response.json();
        
        if (data.success && data.order) {
            activeOrder = data.order;
            console.log('Found active order:', activeOrder);
        } else {
            activeOrder = null;
        }
    } catch (error) {
        console.error('Error checking active order:', error);
        activeOrder = null;
    }
}

// Load previous orders
async function loadPreviousOrders() {
    if (!customerIP) return;
    
    try {
        const params = new URLSearchParams({
            ip: customerIP,
            completed_only: 'true'
        });
        
        if (customerInfo?.phone) {
            params.append('phone', customerInfo.phone);
        }
        
        const response = await fetch(`/functions/api/get-customer-orders?${params}`);
        const data = await response.json();
        
        if (data.success && data.orders) {
            previousOrders = data.orders.slice(0, 5); // Show last 5 orders
            console.log('Loaded previous orders:', previousOrders);
        }
    } catch (error) {
        console.error('Error loading previous orders:', error);
        previousOrders = [];
    }
}

// Render the page based on current state
function renderPage() {
    renderCart();
    renderSidebar();
}

// Render cart section
function renderCart() {
    const cartContent = document.getElementById('cartContent');
    const cartSummary = document.getElementById('cartSummary');
    const clearCartBtn = document.getElementById('clearCartBtn');
    
    if (cart.length === 0) {
        cartContent.innerHTML = `
            <div class="empty-cart">
                <div class="empty-cart-icon">🛒</div>
                <h2 class="empty-cart-title">${t('cart_empty')}</h2>
                <p class="empty-cart-message">${t('add_fragrances')}</p>
                <a href="/" class="btn btn-primary">${t('continue_shopping')}</a>
            </div>
        `;
        cartSummary.style.display = 'none';
        clearCartBtn.style.display = 'none';
        return;
    }
    
    clearCartBtn.style.display = 'flex';
    
    let cartHTML = '';
    let total = 0;
    
    cart.forEach((item, index) => {
        const itemTotal = (item.variant.price_cents / 1000) * item.quantity;
        total += itemTotal;
        
        cartHTML += `
            <div class="cart-item" data-index="${index}">
                <div class="cart-item-info">
                    <div class="cart-item-name">
                        ${item.fragranceBrand ? item.fragranceBrand + ' ' : ''}${item.fragranceName}
                    </div>
                    <div class="cart-item-details">
                        ${item.variant.size} - ${item.variant.price_display || (item.variant.price_cents / 1000).toFixed(3) + ' ' + t('omr')}
                    </div>
                    <div class="cart-item-controls">
                        <div class="cart-qty-controls">
                            <button class="cart-qty-btn" onclick="updateQuantity(${index}, -1)" ${item.quantity <= 1 ? 'disabled' : ''}>
                                ${item.quantity <= 1 ? '✖' : '-'}
                            </button>
                            <input type="number" class="cart-qty-input" value="${item.quantity}" 
                                   min="1" max="10" onchange="setQuantity(${index}, this.value)">
                            <button class="cart-qty-btn" onclick="updateQuantity(${index}, 1)" ${item.quantity >= 10 ? 'disabled' : ''}>+</button>
                        </div>
                        <button class="cart-remove-btn" onclick="removeFromCart(${index})">${t('remove')}</button>
                    </div>
                </div>
                <div class="cart-item-price-section">
                    <div class="cart-item-price">${itemTotal.toFixed(3)} ${t('omr')}</div>
                    <div class="cart-item-unit-price">${(item.variant.price_cents / 1000).toFixed(3)} ${t('omr')} ${t('each')}</div>
                </div>
            </div>
        `;
    });
    
    cartContent.innerHTML = cartHTML;
    
    // Update summary
    document.getElementById('subtotalAmount').textContent = `${total.toFixed(3)} ${t('omr')}`;
    document.getElementById('totalAmount').textContent = `${total.toFixed(3)} ${t('omr')}`;
    cartSummary.style.display = 'block';
}

// Render sidebar based on order status
function renderSidebar() {
    const sidebarContent = document.getElementById('sidebarContent');
    
    if (activeOrder) {
        renderOrderStatus();
    } else if (cart.length > 0) {
        renderCheckoutForm();
    } else {
        sidebarContent.innerHTML = `
            <div class="order-status-section">
                <div class="order-status-icon">🛍️</div>
                <h2 class="order-status-title">${t('start_shopping')}</h2>
                <p class="order-status-message">${t('add_fragrances_to_cart')}</p>
                <a href="/" class="btn btn-primary btn-full">${t('browse_fragrances')}</a>
            </div>
        `;
    }
    
    // Always show previous orders if available
    if (previousOrders.length > 0) {
        const existingContent = sidebarContent.innerHTML;
        sidebarContent.innerHTML = existingContent + renderPreviousOrders();
    }
}

function getStatusMessages() {
    return {
        'pending': t('status_pending_message'),
        'reviewed': t('status_reviewed_message'), 
        'completed': t('status_completed_message'),
        'cancelled': t('status_cancelled_message')
    };
}

// Render active order status
function renderOrderStatus() {
    const sidebarContent = document.getElementById('sidebarContent');
    const statusMessages = getStatusMessages();

    const statusIcons = {
        'pending': '⏳',
        'reviewed': '👨‍💼',
        'completed': '✅',
        'cancelled': '❌'
    };
    
    const canCancel = activeOrder.can_cancel && activeOrder.status === 'pending' && !activeOrder.reviewed;
    const orderDate = new Date(activeOrder.created_at).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Calculate items summary
    const itemsCount = activeOrder.items ? activeOrder.items.length : 0;
    const totalItems = activeOrder.items ? activeOrder.items.reduce((sum, item) => sum + (item.quantity || 1), 0) : 0;
    
    let actionButtons = '';
    if (canCancel) {
        actionButtons = `
            <button class="btn btn-danger btn-full" onclick="cancelOrder()">
                ❌ ${t('cancel_order')}
            </button>
            <p style="font-size: 0.8rem; color: #6c757d; text-align: center; margin-top: 0.5rem;">
                ${t('cancel_within_hour')}
            </p>
        `;
    }
    
    sidebarContent.innerHTML = `
        <div class="order-status-section">
            <div class="order-status-icon">${statusIcons[activeOrder.status] || '📦'}</div>
            <h2 class="order-status-title">${activeOrder.status_display || t('order_status')}</h2>
            <p class="order-status-message">${statusMessages[activeOrder.status] || t('order_in_progress')}</p>
            
            <div class="order-details-card">
                <div class="order-detail-row">
                    <span class="order-detail-label">${t('order_number')}:</span>
                    <span class="order-detail-value order-number">${activeOrder.order_number}</span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">${t('status')}:</span>
                    <span class="order-detail-value">
                        <span class="status-badge status-${activeOrder.status}">${activeOrder.status_display}</span>
                    </span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">${t('total')}:</span>
                    <span class="order-detail-value">${((activeOrder.total_amount || 0) / 1000).toFixed(3)} ${t('omr')}</span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">${t('items')}:</span>
                    <span class="order-detail-value">${totalItems} ${t('items_count')} - ${itemsCount} ${t('types_count')}</span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">${t('order_date')}:</span>
                    <span class="order-detail-value">${orderDate}</span>
                </div>
            </div>
            
            ${actionButtons}
            
            <button class="btn btn-outline btn-full" onclick="refreshOrderStatus()">
                🔄 ${t('refresh_status')}
            </button>
            
            ${previousOrders.length > 0 ? renderPreviousOrders() : ''}
        </div>
    `;
}

// Render checkout form
function renderCheckoutForm() {
    const sidebarContent = document.getElementById('sidebarContent');
    
    const total = cart.reduce((sum, item) => sum + (item.variant.price_cents / 1000) * item.quantity, 0);
    
    if (customerInfo) {
        // Show customer info with edit option
        sidebarContent.innerHTML = `
            <div class="checkout-form">
                <h2 class="checkout-title">${t('place_order')}</h2>
                
                <div class="customer-info-display">
                    <div class="customer-info-title">
                        <span>📋 ${t('your_information')}</span>
                        <button class="edit-info-btn" onclick="editCustomerInfo()">${t('edit')}</button>
                    </div>
                    <div class="customer-detail">
                        <span class="customer-detail-label">${t('name')}:</span>
                        <span class="customer-detail-value">${customerInfo.name}</span>
                    </div>
                    <div class="customer-detail">
                        <span class="customer-detail-label">${t('phone')}:</span>
                        <span class="customer-detail-value">${customerInfo.phone}</span>
                    </div>
                    ${customerInfo.email ? `
                    <div class="customer-detail">
                        <span class="customer-detail-label">${t('email')}:</span>
                        <span class="customer-detail-value">${customerInfo.email}</span>
                    </div>
                    ` : ''}
                    <div class="customer-detail">
                        <span class="customer-detail-label">${t('location')}:</span>
                        <span class="customer-detail-value">${customerInfo.city}, ${customerInfo.wilaya}</span>
                    </div>
                    <div class="customer-detail">
                        <span class="customer-detail-label">${t('delivery')}:</span>
                        <span class="customer-detail-value">${customerInfo.deliveryOption === 'home' ? '🏠 ' + t('deliver_to_home') : '🚛 ' + t('use_delivery_service')}</span>
                    </div>
                    ${customerInfo.notes ? `
                    <div class="customer-detail">
                        <span class="customer-detail-label">${t('notes')}:</span>
                        <span class="customer-detail-value">${customerInfo.notes}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="order-summary-section">
                    <div class="order-detail-row">
                        <span class="order-detail-label">${t('total')}:</span>
                        <span class="order-detail-value" style="font-size: 1.2rem; font-weight: 700; color: #28a745;">${total.toFixed(3)} ${t('omr')}</span>
                    </div>
                </div>
                
                <button class="btn btn-success btn-full" onclick="placeOrder()" id="placeOrderBtn">
                    🛒 ${t('place_order')}
                </button>
                
                <p style="font-size: 0.8rem; color: #6c757d; text-align: center; margin-top: 1rem;">
                    ${t('terms_agreement')}
                </p>
            </div>
        `;
    } else {
        // Show button to add customer info
        sidebarContent.innerHTML = `
            <div class="checkout-form">
                <h2 class="checkout-title">${t('complete_order')}</h2>
                
                <div class="order-summary-section">
                    <div class="order-detail-row">
                        <span class="order-detail-label">${t('total')}:</span>
                        <span class="order-detail-value" style="font-size: 1.2rem; font-weight: 700; color: #28a745;">${total.toFixed(3)} ${t('omr')}</span>
                    </div>
                </div>
                
                <button class="btn btn-primary btn-full" onclick="showCustomerInfoModal()">
                    📝 ${t('add_your_information')}
                </button>
                
                <p style="font-size: 0.9rem; color: #6c757d; text-align: center; margin-top: 1rem; line-height: 1.5;">
                    ${t('contact_info_needed')}
                </p>
            </div>
        `;
    }
}

// Render previous orders section
function renderPreviousOrders() {
    if (previousOrders.length === 0) {
        return `
            <div class="previous-orders-section">
                <h3 class="previous-orders-title">📚 ${t('previous_orders')}</h3>
                <div class="no-previous-orders">${t('no_previous_orders')}</div>
            </div>
        `;
    }
    
    let ordersHTML = '';
    previousOrders.forEach(order => {
        const orderDate = new Date(order.created_at).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        const itemsText = order.items && order.items.length > 0 
            ? order.items.map(item => `${item.fragrance_name} (${item.variant_size})`).join(', ')
            : `${order.items_count || 0} ${t('items_lower')}`;
        
        ordersHTML += `
            <div class="previous-order">
                <div class="previous-order-header">
                    <span class="previous-order-number">${order.order_number}</span>
                    <span class="previous-order-date">${orderDate}</span>
                </div>
                <div class="previous-order-items">${itemsText}</div>
                <div class="previous-order-total">${((order.total_amount || 0) / 1000).toFixed(3)} ${t('omr')}</div>
            </div>
        `;
    });
    
    return `
        <div class="previous-orders-section">
            <h3 class="previous-orders-title">📚 ${t('previous_orders')}</h3>
            ${ordersHTML}
        </div>
    `;
}

// Cart manipulation functions
function updateQuantity(index, delta) {
    if (index < 0 || index >= cart.length) return;
    
    const newQuantity = cart[index].quantity + delta;
    
    if (newQuantity <= 0) {
        removeFromCart(index);
    } else if (newQuantity <= 10) {
        cart[index].quantity = newQuantity;
        saveCart();
        renderCart();
    }
}

function setQuantity(index, value) {
    if (index < 0 || index >= cart.length) return;
    
    const quantity = parseInt(value);
    if (isNaN(quantity) || quantity < 1) {
        cart[index].quantity = 1;
    } else if (quantity > 10) {
        cart[index].quantity = 10;
    } else {
        cart[index].quantity = quantity;
    }
    
    saveCart();
    renderCart();
}

function removeFromCart(index) {
    if (index >= 0 && index < cart.length) {
        cart.splice(index, 1);
        saveCart();
        renderPage();
    }
}

function clearCart() {
    if (confirm(t('confirm_clear_cart'))) {
        cart = [];
        saveCart();
        renderPage();
        showToast(t('cart_cleared'));
    }
}

// Customer information functions
function showCustomerInfoModal() {
    const modal = document.getElementById('customerInfoModal');
    const form = document.getElementById('customerInfoForm');
    
    // Pre-fill form with existing data if available
    if (customerInfo) {
        form.customerName.value = customerInfo.name || '';
        form.customerPhone.value = customerInfo.phone || '';
        form.customerEmail.value = customerInfo.email || '';
        form.customerWilaya.value = customerInfo.wilaya || '';
        form.customerCity.value = customerInfo.city || '';
        form.customerNotes.value = customerInfo.notes || '';
        
        const deliveryOption = form.querySelector(`input[name="deliveryOption"][value="${customerInfo.deliveryOption || 'home'}"]`);
        if (deliveryOption) deliveryOption.checked = true;
    }
    
    modal.style.display = 'flex';
}

function closeCustomerModal() {
    document.getElementById('customerInfoModal').style.display = 'none';
}

function editCustomerInfo() {
    showCustomerInfoModal();
}

// Handle customer info form submission
document.getElementById('customerInfoForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const info = {
        name: formData.get('customerName').trim(),
        phone: formData.get('customerPhone').trim(),
        email: formData.get('customerEmail').trim(),
        wilaya: formData.get('customerWilaya'),
        city: formData.get('customerCity').trim(),
        deliveryOption: formData.get('deliveryOption'),
        notes: formData.get('customerNotes').trim()
    };
    
    // Validate required fields
    if (!info.name || !info.phone || !info.wilaya || !info.city) {
        showToast(t('fill_required_fields'), 'error');
        return;
    }
    
    // Validate phone number (basic Oman format)
    const phoneRegex = /^(968)?[79]\d{7}$/;
    if (!phoneRegex.test(info.phone.replace(/\s+/g, ''))) {
        showToast(t('invalid_phone_number'), 'error');
        return;
    }
    
    saveCustomerInfo(info);
    closeCustomerModal();
    renderSidebar();
    showToast(t('info_saved'));
});

// Order functions
async function placeOrder() {
    if (!customerInfo || cart.length === 0) {
        showToast(t('missing_required_info'), 'error');
        return;
    }
    
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    placeOrderBtn.disabled = true;
    placeOrderBtn.classList.add('loading');
    
    try {
        const total = window.calculateCartTotal ? window.calculateCartTotal(cart) : 
                      cart.reduce((sum, item) => sum + ((item.variant.price_cents || 0) / 1000) * item.quantity, 0);
        
        const orderData = {
            customer_ip: customerIP,
            customer_first_name: customerInfo.name.split(' ')[0],
            customer_last_name: customerInfo.name.split(' ').slice(1).join(' '),
            customer_phone: customerInfo.phone,
            customer_email: customerInfo.email || null,
            delivery_address: customerInfo.deliveryOption === 'home' ? t('deliver_to_home_address') : t('use_delivery_service_text'),
            delivery_city: customerInfo.city,
            delivery_region: customerInfo.wilaya,
            notes: customerInfo.notes || null,
            total_amount: Math.round(total * 1000), // Convert to fils
            items: cart.map(item => ({
                fragrance_id: item.fragranceId,
                variant_id: item.variant.id,
                fragrance_name: item.fragranceName,
                fragrance_brand: item.fragranceBrand || null,
                variant_size: item.variant.size,
                variant_price_cents: item.variant.price_cents || 0,
                quantity: item.quantity,
                unit_price_cents: item.variant.price_cents || 0,
                total_price_cents: (item.variant.price_cents || 0) * item.quantity,
                is_whole_bottle: item.variant.is_whole_bottle || false
            }))
        };
        
        console.log('Placing order:', orderData);
        
        const response = await fetch('/api/place-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        console.log('Place order response status:', response.status);
        const result = await response.json();
        console.log('Place order result:', result);
        
        if (result.success) {
            console.log('Order placed successfully:', result.order);
            
            // Clear cart and reload page state
            cart = [];
            saveCart();
            await checkActiveOrder();
            await loadPreviousOrders();
            renderPage();
            
            showToast(t('order_success'));
        } else {
            console.error('Order placement failed:', result);
            throw new Error(result.error || t('order_error'));
        }
        
    } catch (error) {
        console.error('Error placing order:', error);
        showToast(error.message || t('order_error'), 'error');
    } finally {
        placeOrderBtn.disabled = false;
        placeOrderBtn.classList.remove('loading');
    }
}

async function cancelOrder() {
    if (!activeOrder || !confirm(t('confirm_cancel_order'))) {
        return;
    }
    
    try {
        const response = await fetch('/api/cancel-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                order_id: activeOrder.id,
                customer_ip: customerIP
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            await checkActiveOrder();
            await loadPreviousOrders();
            renderPage();
            showToast(t('order_cancelled'));
        } else {
            throw new Error(result.error || t('cancel_order_error'));
        }
        
    } catch (error) {
        console.error('Error cancelling order:', error);
        showToast(error.message || t('cancel_order_error'), 'error');
    }
}

async function refreshOrderStatus() {
    try {
        await checkActiveOrder();
        renderSidebar();
        showToast(t('status_refreshed'));
    } catch (error) {
        console.error('Error refreshing status:', error);
        showToast(t('refresh_status_error'), 'error');
    }
}

// Utility functions
function showToast(message, type = 'success') {
    console.log(`🔔 Toast: ${message} (${type})`);
    
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // Force bottom center positioning with inline styles
    toast.style.cssText = `
        position: fixed !important;
        bottom: 2rem !important;
        left: 50% !important;
        right: auto !important;
        top: auto !important;
        transform: translateX(-50%) !important;
        background: white !important;
        color: #333 !important;
        padding: 1rem 1.5rem !important;
        border-radius: 12px !important;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15) !important;
        z-index: 9999 !important;
        border-left: 4px solid ${type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#28a745'} !important;
        max-width: 350px !important;
        word-wrap: break-word !important;
        text-align: center !important;
        font-weight: 600 !important;
        animation: slideInUp 0.3s ease !important;
    `;
    
    document.body.appendChild(toast);
    console.log('✅ Toast displayed at bottom center');
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 4000);
}

// Invoice Modal Functions
function showInvoiceModal() {
    if (!activeOrder) {
        showToast(t('no_active_order'), 'error');
        return;
    }
    
    console.log('📄 Showing invoice modal for order:', activeOrder.order_number);
    
    const modal = document.createElement('div');
    modal.className = 'invoice-modal';
    modal.innerHTML = generateInvoiceHTML();
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Close on background click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeInvoiceModal();
        }
    });
}

function closeInvoiceModal() {
    const modal = document.querySelector('.invoice-modal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
}

function printInvoice() {
    console.log('🖨️ Printing invoice...');
    window.print();
}

function generateInvoiceHTML() {
    const orderDate = new Date(activeOrder.created_at).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const totalItems = activeOrder.items ? activeOrder.items.reduce((sum, item) => sum + (item.quantity || 1), 0) : 0;
    const totalAmount = (activeOrder.total_amount || 0) / 1000;
    
    let itemsHTML = '';
    if (activeOrder.items && activeOrder.items.length > 0) {
        activeOrder.items.forEach(item => {
            const unitPrice = item.unit_price || 0;
            const total = item.total || 0;
            
            itemsHTML += `
                <tr>
                    <td>
                        <div class="item-name">${item.fragrance_name}</div>
                        ${item.fragrance_brand ? `<div class="item-brand">${item.fragrance_brand}</div>` : ''}
                    </td>
                    <td>${item.variant_size}</td>
                    <td class="quantity-cell">${item.quantity}</td>
                    <td class="price-cell">${unitPrice.toFixed(3)} ${t('omr')}</td>
                    <td class="price-cell">${total.toFixed(3)} ${t('omr')}</td>
                </tr>
            `;
        });
    }
    
    return `
        <div class="invoice-content">
            <div class="invoice-header">
                <h2>📄 ${t('order_invoice')}</h2>
                <div class="invoice-actions">
                    <button class="print-btn" onclick="printInvoice()">
                        🖨️ ${t('print')}
                    </button>
                    <button class="invoice-close" onclick="closeInvoiceModal()">&times;</button>
                </div>
            </div>
            
            <div class="invoice-body">
                <div class="invoice-info">
                    <div class="invoice-section">
                        <h3>${t('order_information')}</h3>
                        <div class="invoice-detail">
                            <span class="invoice-label">${t('order_number')}:</span>
                            <span class="invoice-value order-number-large">${activeOrder.order_number}</span>
                        </div>
                        <div class="invoice-detail">
                            <span class="invoice-label">${t('order_date')}:</span>
                            <span class="invoice-value">${orderDate}</span>
                        </div>
                        <div class="invoice-detail">
                            <span class="invoice-label">${t('status')}:</span>
                            <span class="invoice-value">
                                <span class="status-badge status-${activeOrder.status}">${activeOrder.status_display}</span>
                            </span>
                        </div>
                        <div class="invoice-detail">
                            <span class="invoice-label">${t('total_items')}:</span>
                            <span class="invoice-value">${totalItems} ${t('items_lower')}</span>
                        </div>
                    </div>
                    
                    <div class="invoice-section">
                        <h3>${t('company_information')}</h3>
                        <div class="invoice-detail">
                            <span class="invoice-label">${t('company')}:</span>
                            <span class="invoice-value">Qotore</span>
                        </div>
                        <div class="invoice-detail">
                            <span class="invoice-label">${t('business')}:</span>
                            <span class="invoice-value">${t('premium_fragrances')}</span>
                        </div>
                        <div class="invoice-detail">
                            <span class="invoice-label">${t('location')}:</span>
                            <span class="invoice-value">${t('muscat_oman')}</span>
                        </div>
                        <div class="invoice-detail">
                            <span class="invoice-label">${t('contact')}:</span>
                            <span class="invoice-value">${t('whatsapp')}: +968 1234 5678</span>
                        </div>
                    </div>
                </div>
                
                <div class="invoice-items">
                    <h3>${t('order_items')}</h3>
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th>${t('item')}</th>
                                <th>${t('size')}</th>
                                <th>${t('qty')}</th>
                                <th>${t('unit_price')}</th>
                                <th>${t('total')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHTML}
                        </tbody>
                    </table>
                </div>
                
                <div class="invoice-total">
                    <div class="total-row">
                        <span class="total-label">${t('subtotal')}:</span>
                        <span class="total-value">${totalAmount.toFixed(3)} ${t('omr')}</span>
                    </div>
                    <div class="total-row">
                        <span class="total-label">${t('total_amount')}:</span>
                        <span class="total-value">${totalAmount.toFixed(3)} ${t('omr')}</span>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 2rem; padding-top: 2rem; border-top: 2px solid #e9ecef; color: #6c757d; font-size: 0.9rem;">
                    <p>${t('thank_you_qotore')}</p>
                    <p>${t('support_contact')}</p>
                </div>
            </div>
        </div>
    `;
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('customerInfoModal');
    if (e.target === modal) {
        closeCustomerModal();
    }
});

// Handle escape key for modals
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeCustomerModal();
        closeInvoiceModal();
    }
});

// Prevent form submission on enter in quantity inputs
document.addEventListener('keydown', function(e) {
    if (e.target.classList.contains('cart-qty-input') && e.key === 'Enter') {
        e.preventDefault();
        e.target.blur();
    }
});

// Auto-refresh order status every 30 seconds if there's an active order
setInterval(async () => {
    if (activeOrder && activeOrder.status === 'pending') {
        try {
            await checkActiveOrder();
            renderPage();
        } catch (error) {
            console.error('Auto-refresh failed:', error);
        }
    }
}, 30000);