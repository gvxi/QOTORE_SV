// TRANSLATION SUPPORT ADDED - START
let currentLanguage = 'en';
let translations = {};

async function loadTranslations() {
    try {
        const response = await fetch('/checkout-assets/checkout-translations.json');
        translations = await response.json();
        console.log('✅ Checkout translations loaded');
    } catch (error) {
        console.error('❌ Failed to load checkout translations:', error);
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
// TRANSLATION SUPPORT ADDED - END

// Checkout Script - Mobile-friendly, Supabase integration
let cart = [];
let customerInfo = null;
let activeOrder = null;
let previousOrders = [];
let customerIP = null;

// Initialize the checkout page
document.addEventListener('DOMContentLoaded', async function() {
    // ADDED FOR TRANSLATION SUPPORT
    await loadTranslations();
    loadLanguagePreference();
    
    try {
        await getCustomerIP();
        await loadCustomerInfo();
        await loadCart();
        await checkActiveOrder();
        await loadPreviousOrders();
        renderPage();
    } catch (error) {
        console.error('Error initializing checkout:', error);
        showToast('Error loading checkout page', 'error');
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
            // console.log('Loaded customer info:', customerInfo);
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
        // console.log('Saved customer info:', info);
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
            // console.log('Loaded cart:', cart);
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
        const response = await fetch(`/api/check-active-order?ip=${customerIP}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const result = await response.json();
            
            if (result.success && result.data && result.data.has_order) {
                activeOrder = result.data;
                console.log('Active order found:', activeOrder.order_number);
            } else {
                activeOrder = null;
            }
        }
    } catch (error) {
        console.error('Error checking for active order:', error);
        activeOrder = null;
    }
}

// Load previous orders
async function loadPreviousOrders() {
    if (!customerIP) return;

    try {
        const response = await fetch(`/api/get-orders?ip=${customerIP}&status=completed,cancelled&limit=5`);
        
        if (response.ok) {
            const result = await response.json();
            previousOrders = result.success ? result.data : [];
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
                <p class="empty-cart-message">${t('cart_empty_subtitle')}</p>
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
                                ${item.quantity <= 1 ? '🗑️' : '-'}
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
                <p class="order-status-message">${t('cart_empty_subtitle')}</p>
                <a href="/" class="btn btn-primary btn-full">${t('continue_shopping')}</a>
            </div>
        `;
    }
    
    // Always show previous orders if available
    if (previousOrders.length > 0) {
        const existingContent = sidebarContent.innerHTML;
        sidebarContent.innerHTML = existingContent + renderPreviousOrders();
    }
}

// Render active order status
function renderOrderStatus() {
    const sidebarContent = document.getElementById('sidebarContent');
    
    const statusIcons = {
        'pending': '⏳',
        'reviewed': '👨‍💼',
        'completed': '✅',
        'cancelled': '❌'
    };
    
    const statusMessages = {
        'pending': 'Your order is waiting for admin review',
        'reviewed': 'Your order is being prepared',
        'completed': 'Your order has been completed',
        'cancelled': 'Your order has been cancelled'
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
    const itemsCount = activeOrder.items ? activeOrder.items.length : (activeOrder.items_count || 0);
    const itemsText = activeOrder.items && activeOrder.items.length > 0 
        ? activeOrder.items.map(item => `${item.fragrance_name} (${item.variant_size})`).join(', ')
        : `${itemsCount} item(s)`;
    
    sidebarContent.innerHTML = `
        <div class="order-status-section">
            <div class="order-status-icon">${statusIcons[activeOrder.status] || '📋'}</div>
            <h2 class="order-status-title">${t('order')} ${activeOrder.order_number}</h2>
            <p class="order-status-message">${statusMessages[activeOrder.status] || t(activeOrder.status)}</p>
            
            <div class="order-details-summary">
                <div class="order-detail-row">
                    <span class="order-detail-label">${t('order_date')}:</span>
                    <span class="order-detail-value">${orderDate}</span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">${t('status')}:</span>
                    <span class="order-detail-value">${t(activeOrder.status)}</span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">${t('order_items')}:</span>
                    <span class="order-detail-value">${itemsText}</span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">${t('total')}:</span>
                    <span class="order-detail-value">${((activeOrder.total_amount || 0) / 1000).toFixed(3)} ${t('omr')}</span>
                </div>
            </div>
            
            <div class="order-actions">
                <button class="btn btn-secondary btn-full" onclick="refreshOrderStatus()">${t('refresh')}</button>
                ${canCancel ? `<button class="btn btn-danger btn-full" onclick="cancelOrder()">${t('cancel_order')}</button>` : ''}
            </div>
        </div>
        ${renderPreviousOrders()}
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
                        <span class="customer-detail-value">${customerInfo.deliveryOption === 'home' ? t('deliver_to_home') : t('use_delivery_service')}</span>
                    </div>
                    ${customerInfo.notes ? `
                    <div class="customer-detail">
                        <span class="customer-detail-label">${t('additional_notes')}:</span>
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
                    By placing your order, you agree to our terms and conditions
                </p>
            </div>
        `;
    } else {
        // Show button to add customer info
        sidebarContent.innerHTML = `
            <div class="checkout-form">
                <h2 class="checkout-title">${t('checkout_form_title')}</h2>
                
                <div class="order-summary-section">
                    <div class="order-detail-row">
                        <span class="order-detail-label">${t('total')}:</span>
                        <span class="order-detail-value" style="font-size: 1.2rem; font-weight: 700; color: #28a745;">${total.toFixed(3)} ${t('omr')}</span>
                    </div>
                </div>
                
                <button class="btn btn-primary btn-full" onclick="showCustomerInfoModal()">
                    📝 ${t('customer_information')}
                </button>
                
                <p style="font-size: 0.9rem; color: #6c757d; text-align: center; margin-top: 1rem; line-height: 1.5;">
                    We need your contact information and delivery details to process your order
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
            : `${order.items_count || 0} item(s)`;
        
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
    if (confirm(t('clear_cart') + '?')) {
        cart = [];
        saveCart();
        renderPage();
        showToast(t('clear_cart') + ' successfully');
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
        showToast('Please enter a valid Oman phone number', 'error');
        return;
    }
    
    saveCustomerInfo(info);
    closeCustomerModal();
    renderSidebar();
    showToast('Information saved successfully');
});

// Order functions
async function placeOrder() {
    if (!customerInfo || cart.length === 0) {
        showToast('Missing required information', 'error');
        return;
    }
    
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    placeOrderBtn.disabled = true;
    placeOrderBtn.classList.add('loading');
    
    try {
        const total = window.calculateCartTotal ? window.calculateCartTotal() : cart.reduce((sum, item) => sum + (item.variant.price_cents / 1000) * item.quantity, 0);
        
        const orderData = {
            customer_ip: customerIP,
            customer_first_name: customerInfo.name.split(' ')[0] || customerInfo.name,
            customer_last_name: customerInfo.name.split(' ').slice(1).join(' ') || '',
            customer_phone: customerInfo.phone,
            customer_email: customerInfo.email || null,
            delivery_address: `${customerInfo.deliveryOption === 'home' ? 'Home delivery' : 'Use delivery service'}`,
            delivery_city: customerInfo.city,
            delivery_region: customerInfo.wilaya,
            notes: customerInfo.notes || null,
            total_amount: Math.round(total * 1000),
            items: cart.map(item => ({
                fragrance_id: item.fragranceId,
                variant_id: item.variant.id,
                fragrance_name: item.fragranceName,
                fragrance_brand: item.fragranceBrand || '',
                variant_size: item.variant.size,
                variant_price_cents: item.variant.price_cents,
                quantity: item.quantity,
                unit_price_cents: item.variant.price_cents,
                total_price_cents: item.variant.price_cents * item.quantity,
                is_whole_bottle: item.variant.is_whole_bottle || false
            }))
        };

        const response = await fetch('/api/place-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();
        
        if (result.success) {
            // Clear cart and refresh page
            cart = [];
            saveCart();
            await checkActiveOrder();
            await loadPreviousOrders();
            renderPage();
            showToast(t('order_success') + ' 🎉');
        } else {
            console.error('Order placement failed:', result);
            throw new Error(result.error || 'Failed to place order');
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
    if (!activeOrder || !confirm('Are you sure you want to cancel your order?')) {
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
            showToast('Order cancelled successfully');
        } else {
            throw new Error(result.error || 'Failed to cancel order');
        }
        
    } catch (error) {
        console.error('Error cancelling order:', error);
        showToast(error.message || 'Failed to cancel order', 'error');
    }
}

async function refreshOrderStatus() {
    try {
        await checkActiveOrder();
        renderSidebar();
        showToast('Status refreshed');
    } catch (error) {
        console.error('Error refreshing status:', error);
        showToast('Failed to refresh status', 'error');
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
        font-weight: 600 !important;
        animation: slideUpToast 0.3s ease !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
    `;
    
    document.body.appendChild(toast);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (toast && toast.parentNode) {
            toast.style.animation = 'slideDownToast 0.3s ease forwards';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }
    }, 5000);
}

// Add CSS animations for toasts
if (!document.querySelector('#toastStyles')) {
    const style = document.createElement('style');
    style.id = 'toastStyles';
    style.textContent = `
        @keyframes slideUpToast {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }
        
        @keyframes slideDownToast {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(20px);
            }
        }
    `;
    document.head.appendChild(style);
}