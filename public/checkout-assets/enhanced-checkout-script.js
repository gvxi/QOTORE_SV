// Enhanced Checkout Script
let currentLanguage = 'en';
let translations = {};
let supabase = null;
let currentUser = null;
let userProfile = null;
let cart = [];
let activeOrder = null;
let customerInfo = null;
let selectedDeliveryOption = 'home';

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Checkout page loaded');
    
    try {
        // Load translations first
        await loadTranslations();
        loadLanguagePreference();
        
        // Initialize Supabase
        await initializeSupabase();
        
        // Check authentication
        await checkAuthentication();
        
        // Load cart from localStorage
        loadCart();
        
        // Check for active orders
        await checkActiveOrder();
        
        // Render the page
        await renderPage();
        
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Error loading checkout page', 'error');
    } finally {
        hideLoadingSplash();
    }
});

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
}

function loadLanguagePreference() {
    const savedLanguage = localStorage.getItem('qotore_language') || 'en';
    currentLanguage = savedLanguage;
    document.documentElement.setAttribute('dir', currentLanguage === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', currentLanguage);
    updateTranslations();
}

// Supabase Initialization
async function initializeSupabase() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        
        if (config.SUPABASE_URL && config.SUPABASE_ANON_KEY) {
            supabase = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
            console.log('Supabase client initialized');
        } else {
            throw new Error('Supabase configuration not found');
        }
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        throw error;
    }
}

// Authentication Functions
async function checkAuthentication() {
    if (!supabase) return false;
    
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Session check error:', error);
            return false;
        }
        
        if (session && session.user) {
            currentUser = session.user;
            await loadUserProfile();
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Authentication check error:', error);
        return false;
    }
}

async function loadUserProfile() {
    if (!supabase || !currentUser) return;
    
    try {
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle();
        
        if (error) {
            console.error('Profile load error:', error);
            return;
        }
        
        userProfile = profile;
        
        // Check if profile is complete for checkout
        if (profile && profile.profile_completed && profile.first_name && profile.phone) {
            customerInfo = {
                firstName: profile.first_name,
                lastName: profile.last_name || '',
                email: currentUser.email,
                phone: profile.phone,
                wilaya: profile.wilayat || '',
                city: profile.city || '',
                address: profile.full_address || '',
                deliveryOption: 'home',
                notes: ''
            };
        }
        
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

// Cart Functions
function loadCart() {
    try {
        const rawCart = localStorage.getItem('qotore_cart');
        if (!rawCart) {
            cart = [];
            return;
        }

        const parsed = JSON.parse(rawCart);

        cart = parsed
            .map(item => {
                // Already normalized (Option A)
                if (item.fragrance && item.variant && typeof item.quantity === 'number') {
                    return item;
                }

                // Flat format (Option B) → transform
                if (item.fragranceId && item.variant) {
                    return {
                        fragrance: {
                            id: item.fragranceId,
                            name: item.fragranceName,
                            brand: item.fragranceBrand,
                            image_path: item.image_path || null
                        },
                        variant: {
                            ...item.variant,
                            id: item.variantId || item.variant.id
                        },
                        quantity: item.quantity || 1
                    };
                }

                return null;
            })
            .filter(Boolean); // remove invalid

        console.log("Cart successfully loaded:", cart);

    } catch (err) {
        console.error("Error loading cart:", err);
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

function updateCartItemQuantity(index, quantity) {
    if (index >= 0 && index < cart.length) {
        if (quantity <= 0) {
            cart.splice(index, 1);
        } else {
            cart[index].quantity = parseInt(quantity);
        }
        saveCart();
        renderCartItems();
    }
}

function removeCartItem(index) {
    if (index >= 0 && index < cart.length) {
        cart.splice(index, 1);
        saveCart();
        renderCartItems();
    }
}

function clearCart() {
    if (confirm(t('confirm_clear_cart'))) {
        cart = [];
        saveCart();
        renderCartItems();
        showToast(t('cart_cleared'), 'success');
    }
}

// Active Order Functions
async function checkActiveOrder() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`/api/get-user-orders?user_id=${currentUser.id}&email=${encodeURIComponent(currentUser.email)}&status=active`);
        const data = await response.json();
        
        if (data.success && data.orders && data.orders.length > 0) {
            activeOrder = data.orders[0];
            console.log('Found active order:', activeOrder);
        } else {
            activeOrder = null;
        }
    } catch (error) {
        console.error('Error checking active order:', error);
        activeOrder = null;
    }
}

// Render Functions
async function renderPage() {
    if (!currentUser) {
        showAuthRequired();
        return;
    }
    
    if (!userProfile || !userProfile.profile_completed || !customerInfo) {
        showProfileIncomplete();
        return;
    }
    
    if (activeOrder) {
        renderActiveOrder();
    } else if (cart.length === 0) {
        renderEmptyCart();
    } else {
        renderCheckout();
    }
    
    updateTranslations();
}

function showAuthRequired() {
    document.getElementById('authRequired').style.display = 'block';
    document.getElementById('profileIncomplete').style.display = 'none';
    document.getElementById('cartSection').style.display = 'none';
    document.querySelector('.sidebar').style.display = 'none';
    updateTranslations();
}

function showProfileIncomplete() {
    document.getElementById('authRequired').style.display = 'none';
    document.getElementById('profileIncomplete').style.display = 'block';
    document.getElementById('cartSection').style.display = 'none';
    document.querySelector('.sidebar').style.display = 'none';
    updateTranslations();
}

function renderEmptyCart() {
    document.getElementById('cartItems').innerHTML = `
        <div class="empty-cart">
            <div class="empty-cart-icon">🛒</div>
            <h3>${t('cart_empty')}</h3>
            <p>${t('add_fragrances_to_cart')}</p>
            <a href="/" class="shop-now-btn">${t('browse_fragrances')}</a>
        </div>
    `;
    
    document.querySelector('.cart-summary').innerHTML = '';
    document.getElementById('sidebarContent').innerHTML = `
        <div class="checkout-form">
            <h2 class="checkout-title">${t('cart_empty')}</h2>
            <p style="text-align: center; color: #6c757d; margin-bottom: 2rem;">${t('add_fragrances')}</p>
            <a href="/" class="shop-now-btn" style="display: block; text-align: center;">${t('start_shopping')}</a>
        </div>
    `;
}

function renderCheckout() {
    renderCartItems();
    renderCheckoutForm();
}

function renderCartItems() {
    const cartItemsContainer = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    
    if (cart.length === 0) {
        renderEmptyCart();
        return;
    }
    
    let total = 0;
    let itemsHTML = '';
    
    cart.forEach((item, index) => {
        const itemTotal = (item.variant.price_cents / 100) * item.quantity;
        total += itemTotal;
        
        itemsHTML += `
            <div class="cart-item">
                <div class="cart-item-image">
                    🌸
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.fragrance.name}</div>
                    <div class="cart-item-brand">${item.fragrance.brand || 'Premium Collection'}</div>
                    <div class="cart-item-variant">${item.variant.size}</div>
                    <div class="cart-item-quantity">
                        <button class="cart-qty-btn" onclick="updateCartItemQuantity(${index}, ${item.quantity - 1})">−</button>
                        <input type="number" class="cart-qty-input" value="${item.quantity}" 
                               onchange="updateCartItemQuantity(${index}, this.value)" min="1" max="10">
                        <button class="cart-qty-btn" onclick="updateCartItemQuantity(${index}, ${item.quantity + 1})">+</button>
                    </div>
                </div>
                <div class="cart-item-actions">
                    <div class="cart-item-price">${itemTotal.toFixed(3)} <span>${t('omr')}</span></div>
                    <button class="remove-item-btn" onclick="removeCartItem(${index})">${t('remove')}</button>
                </div>
            </div>
        `;
    });
    
    cartItemsContainer.innerHTML = itemsHTML;
    cartTotal.textContent = `${total.toFixed(3)} ${t('omr')}`;
}

function renderCheckoutForm() {
    const sidebarContent = document.getElementById('sidebarContent');
    
    if (customerInfo) {
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
                        <span class="customer-detail-value">${customerInfo.firstName} ${customerInfo.lastName}</span>
                    </div>
                    <div class="customer-detail">
                        <span class="customer-detail-label">${t('phone')}:</span>
                        <span class="customer-detail-value">${customerInfo.phone}</span>
                    </div>
                    <div class="customer-detail">
                        <span class="customer-detail-label">${t('email')}:</span>
                        <span class="customer-detail-value">${customerInfo.email}</span>
                    </div>
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
                
                <button class="place-order-btn" onclick="placeOrder()" id="placeOrderBtn">
                    <span>🛍️</span>
                    <span>${t('place_order')}</span>
                </button>
                
                <div style="text-align: center; margin-top: 1rem; font-size: 0.85rem; color: #6c757d;">
                    <p>${t('terms_agreement')}</p>
                </div>
            </div>
        `;
    } else {
        sidebarContent.innerHTML = `
            <div class="checkout-form">
                <h2 class="checkout-title">${t('complete_order')}</h2>
                <p style="text-align: center; color: #6c757d; margin-bottom: 2rem;">${t('contact_info_needed')}</p>
                <button class="place-order-btn" onclick="openCustomerModal()">
                    <span>📋</span>
                    <span>${t('add_your_information')}</span>
                </button>
            </div>
        `;
    }
}

function renderActiveOrder() {
    const cartSection = document.getElementById('cartSection');
    const sidebarContent = document.getElementById('sidebarContent');
    
    // Hide cart section and show order status
    cartSection.style.display = 'none';
    document.querySelector('.main-content').style.gridTemplateColumns = '1fr';
    
    const orderDate = new Date(activeOrder.created_at).toLocaleDateString();
    const canCancel = canCancelOrder(activeOrder.created_at);
    const timeLeft = getCancellationTimeLeft(activeOrder.created_at);
    
    sidebarContent.innerHTML = `
        <div class="checkout-form">
            <h2 class="checkout-title">${t('order_in_progress')}</h2>
            
            <div class="order-status-card">
                <div class="order-status-header">
                    <div class="order-status-title">${t('order_status')}</div>
                    <div class="order-status-badge status-${activeOrder.status}">
                        ${t(activeOrder.status)}
                    </div>
                </div>
                
                <div class="order-info">
                    <div class="order-detail">
                        <span class="order-detail-label">${t('order_number')}</span>
                        <span class="order-detail-value">${activeOrder.order_number || `ORD-${String(activeOrder.id).padStart(5, '0')}`}</span>
                    </div>
                    <div class="order-detail">
                        <span class="order-detail-label">${t('order_date')}</span>
                        <span class="order-detail-value">${orderDate}</span>
                    </div>
                    <div class="order-detail">
                        <span class="order-detail-label">${t('items')}</span>
                        <span class="order-detail-value">${activeOrder.order_items?.length || 0} ${t('items_count')}</span>
                    </div>
                    <div class="order-detail">
                        <span class="order-detail-label">${t('total_amount')}</span>
                        <span class="order-detail-value">${((activeOrder.total_amount || 0) / 1000).toFixed(3)} ${t('omr')}</span>
                    </div>
                </div>
                
                <div class="order-actions">
                    ${canCancel ? `
                        <button class="order-action-btn cancel-order-btn" onclick="cancelOrder()">
                            <span>❌</span>
                            <span>${t('cancel_order')}</span>
                        </button>
                        <div class="cancel-timer">
                            <strong>${t('cancel_within_hour')}</strong><br>
                            <span>⏰ ${timeLeft}</span>
                        </div>
                    ` : `
                        <div class="cancel-timer timer-expired">
                            <strong>${t('cancel_window_expired')}</strong><br>
                            <span>${t('contact_admin_to_cancel')}</span>
                            <a href="https://wa.me/${config.WHATSAPP_NUMBER || '96890000000'}?text=Hello! Regarding Order ${orderNumber}" class="whatsapp-contact" target="_blank">
                                <span>📱</span>
                                <span>${t('contact_whatsapp')}</span>
                            </a>
                        </div>
                    `}
                    
                    <button class="order-action-btn refresh-status-btn" onclick="refreshOrderStatus()">
                        <span>🔄</span>
                        <span>${t('refresh_status')}</span>
                    </button>
                    
                    <button class="order-action-btn view-invoice-btn" onclick="viewInvoice()">
                        <span>📄</span>
                        <span>${t('view_invoice')}</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Start timer to update cancellation status
    if (canCancel) {
        setTimeout(() => {
            renderActiveOrder(); // Re-render to update timer
        }, 60000); // Update every minute
    }
}

// Customer Info Modal Functions
function openCustomerModal() {
    const modal = document.getElementById('customerInfoModal');
    const form = document.getElementById('customerForm');
    
    // Pre-fill form with existing data
    if (customerInfo) {
        form.firstName.value = customerInfo.firstName || '';
        form.lastName.value = customerInfo.lastName || '';
        form.phone.value = customerInfo.phone || '';
        form.email.value = customerInfo.email || '';
        form.wilaya.value = customerInfo.wilaya || '';
        form.city.value = customerInfo.city || '';
        form.address.value = customerInfo.address || '';
        form.notes.value = customerInfo.notes || '';
        
        // Set delivery option
        selectedDeliveryOption = customerInfo.deliveryOption || 'home';
        updateDeliveryOptionUI();
    } else if (userProfile) {
        // Pre-fill from user profile
        form.firstName.value = userProfile.first_name || '';
        form.lastName.value = userProfile.last_name || '';
        form.phone.value = userProfile.phone || '';
        form.email.value = currentUser.email || '';
        form.wilaya.value = userProfile.wilayat || '';
        form.city.value = userProfile.city || '';
        form.address.value = userProfile.full_address || '';
    }
    
    modal.style.display = 'flex';
    updateTranslations();
}

function closeCustomerModal() {
    document.getElementById('customerInfoModal').style.display = 'none';
}

function editCustomerInfo() {
    openCustomerModal();
}

function selectDeliveryOption(option) {
    selectedDeliveryOption = option;
    updateDeliveryOptionUI();
}

function updateDeliveryOptionUI() {
    document.querySelectorAll('.delivery-option').forEach(el => {
        el.classList.remove('selected');
    });
    
    const selectedOption = document.querySelector(`[data-value="${selectedDeliveryOption}"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
}

// Form submission
document.getElementById('customerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    saveCustomerInfo();
});

function saveCustomerInfo() {
    const form = document.getElementById('customerForm');
    const formData = new FormData(form);
    
    // Validate required fields
    const required = ['firstName', 'phone', 'wilaya', 'city', 'address'];
    const missing = required.filter(field => !formData.get(field)?.trim());
    
    if (missing.length > 0) {
        showToast(t('missing_required_info'), 'error');
        return;
    }
    
    // Validate phone number (Oman format)
    const phone = formData.get('phone').trim();
    if (!phone.match(/^968\d{8}$/) && !phone.match(/^\d{8}$/)) {
        showToast(t('invalid_phone_number'), 'error');
        return;
    }
    
    // Save customer info
    customerInfo = {
        firstName: formData.get('firstName').trim(),
        lastName: formData.get('lastName').trim(),
        email: currentUser.email,
        phone: phone.startsWith('968') ? phone : '968' + phone,
        wilaya: formData.get('wilaya'),
        city: formData.get('city').trim(),
        address: formData.get('address').trim(),
        deliveryOption: selectedDeliveryOption,
        notes: formData.get('notes').trim()
    };
    
    closeCustomerModal();
    renderCheckoutForm();
    showToast(t('info_saved'), 'success');
}

// Order placement
async function placeOrder() {
    if (!currentUser || !customerInfo || cart.length === 0) {
        showToast(t('missing_required_info'), 'error');
        return;
    }
    
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    placeOrderBtn.disabled = true;
    placeOrderBtn.innerHTML = `
        <div class="loading-spinner"></div>
        <span>${t('processing_order')}</span>
    `;
    
    try {
        // Calculate total in cents
        const totalCents = cart.reduce((sum, item) => {
            const priceInCents = item.variant.price_cents || (item.variant.price * 1000) || 0;
            return sum + (priceInCents * item.quantity);
        }, 0);
        
        // Prepare order data
        const orderData = {
            user_id: currentUser.id,
            customer_email: currentUser.email,
            customer_first_name: customerInfo.firstName,
            customer_last_name: customerInfo.lastName,
            customer_phone: customerInfo.phone,
            delivery_city: customerInfo.city,
            delivery_region: customerInfo.wilaya,
            delivery_address: customerInfo.address,
            delivery_type: customerInfo.deliveryOption,
            order_notes: customerInfo.notes,
            total_amount: totalCents,
            items: cart.map(item => ({
                fragrance_id: item.fragrance.id,
                fragrance_name: item.fragrance.name,
                fragrance_brand: item.fragrance.brand || 'Premium Collection',
                variant_id: item.variant.id,
                variant_size: item.variant.size,
                quantity: item.quantity,
                unit_price_cents: item.variant.price_cents || (item.variant.price * 1000) || 0,
                total_price_cents: (item.variant.price_cents || (item.variant.price * 1000) || 0) * item.quantity,
                is_whole_bottle: item.variant.is_whole_bottle || false
            }))
        };
        
        console.log('Placing order with data:', orderData);
        
        // Place order
        const response = await fetch('/api/place-order-auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Failed to place order');
        }
        
        // Order placed successfully
        activeOrder = result.order;
        cart = [];
        saveCart();
        
        showToast(t('order_success'), 'success');
        
        // Render active order
        setTimeout(() => {
            renderActiveOrder();
        }, 1000);
        
    } catch (error) {
        console.error('Order placement error:', error);
        showToast(error.message || t('order_error'), 'error');
        
        // Reset button
        placeOrderBtn.disabled = false;
        placeOrderBtn.innerHTML = `
            <span>🛍️</span>
            <span>${t('place_order')}</span>
        `;
    }
}

// Order management functions
function canCancelOrder(createdAt) {
    const orderTime = new Date(createdAt);
    const now = new Date();
    const hoursPassed = (now - orderTime) / (1000 * 60 * 60);
    return hoursPassed < 1 && activeOrder?.status === 'pending';
}

function getCancellationTimeLeft(createdAt) {
    const orderTime = new Date(createdAt);
    const now = new Date();
    const timeLeft = 60 * 60 * 1000 - (now - orderTime); // 1 hour in ms
    
    if (timeLeft <= 0) return t('expired');
    
    const minutes = Math.floor(timeLeft / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')} ${t('remaining')}`;
}

async function cancelOrder() {
    if (!activeOrder || !canCancelOrder(activeOrder.created_at)) {
        showToast(t('cannot_cancel_order'), 'error');
        return;
    }
    
    if (!confirm(t('confirm_cancel_order'))) return;
    
    try {
        const response = await fetch('/api/cancel-order-auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                order_id: activeOrder.id,
                user_id: currentUser.id
            })
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Failed to cancel order');
        }
        
        activeOrder = null;
        showToast(t('order_cancelled'), 'success');
        
        // Redirect back to main page or refresh
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
        
    } catch (error) {
        console.error('Cancel order error:', error);
        showToast(error.message || t('cancel_order_error'), 'error');
    }
}

async function refreshOrderStatus() {
    if (!activeOrder) return;
    
    try {
        await checkActiveOrder();
        renderActiveOrder();
        showToast(t('status_refreshed'), 'success');
    } catch (error) {
        console.error('Refresh status error:', error);
        showToast(t('refresh_status_error'), 'error');
    }
}

// Invoice functions
function viewInvoice() {
    if (!activeOrder) return;
    
    const modal = document.getElementById('invoiceModal');
    const content = document.getElementById('invoiceContent');
    
    const orderDate = new Date(activeOrder.created_at).toLocaleDateString();
    const orderNumber = activeOrder.order_number || `ORD-${String(activeOrder.id).padStart(5, '0')}`;
    
    content.innerHTML = `
        <div class="invoice-header">
            <div class="invoice-logo">Qotore</div>
            <div class="invoice-title">${t('order_invoice')}</div>
            <p>${t('premium_fragrances')}</p>
        </div>
        
        <div class="invoice-details">
            <div class="invoice-section">
                <h4>${t('order_information')}</h4>
                <p><strong>${t('order_number')}:</strong> ${orderNumber}</p>
                <p><strong>${t('order_date')}:</strong> ${orderDate}</p>
                <p><strong>${t('status')}:</strong> ${t(activeOrder.status)}</p>
            </div>
            
            <div class="invoice-section">
                <h4>${t('customer_information')}</h4>
                <p><strong>${t('name')}:</strong> ${activeOrder.customer_first_name} ${activeOrder.customer_last_name || ''}</p>
                <p><strong>${t('phone')}:</strong> ${activeOrder.customer_phone}</p>
                <p><strong>${t('email')}:</strong> ${activeOrder.customer_email}</p>
                <p><strong>${t('address')}:</strong> ${activeOrder.delivery_address}</p>
                <p><strong>${t('city')}:</strong> ${activeOrder.delivery_city}, ${activeOrder.delivery_region}</p>
            </div>
        </div>
        
        <div class="invoice-items">
            <h4>${t('order_items')}</h4>
            <table class="invoice-table">
                <thead>
                    <tr>
                        <th>${t('item')}</th>
                        <th>${t('size')}</th>
                        <th class="text-right">${t('qty')}</th>
                        <th class="text-right">${t('unit_price')}</th>
                        <th class="text-right">${t('total')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${(activeOrder.order_items || []).map(item => `
                        <tr>
                            <td>
                                <strong>${item.fragrance_name}</strong><br>
                                <small>${item.fragrance_brand}</small>
                            </td>
                            <td>${item.variant_size}</td>
                            <td class="text-right">${item.quantity}</td>
                            <td class="text-right">${((item.unit_price_cents || 0) / 1000).toFixed(3)} ${t('omr')}</td>
                            <td class="text-right">${((item.total_price_cents || 0) / 1000).toFixed(3)} ${t('omr')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="invoice-total">
            <div class="invoice-total-amount">
                ${t('total_amount')}: ${((activeOrder.total_amount || 0) / 1000).toFixed(3)} ${t('omr')}
            </div>
        </div>
        
        ${activeOrder.order_notes ? `
        <div class="invoice-section" style="margin-top: 2rem;">
            <h4>${t('notes')}</h4>
            <p>${activeOrder.order_notes}</p>
        </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 0.9rem;">
            <p>${t('footer_description')}</p>
            <p>📧 support@qotore.uk | 📱 +968 9000 0000</p>
            <p>${t('copyright')}</p>
        </div>
    `;
    
    modal.style.display = 'flex';
    updateTranslations();
}

function closeInvoiceModal() {
    document.getElementById('invoiceModal').style.display = 'none';
}

function printInvoice() {
    window.print();
}

// Utility Functions
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function hideLoadingSplash() {
    const splash = document.getElementById('loadingSplash');
    if (splash) {
        splash.classList.add('hidden');
        setTimeout(() => splash.remove(), 500);
    }
}

// Modal event listeners
document.addEventListener('click', function(e) {
    const customerModal = document.getElementById('customerInfoModal');
    const invoiceModal = document.getElementById('invoiceModal');
    
    if (e.target === customerModal) {
        closeCustomerModal();
    }
    
    if (e.target === invoiceModal) {
        closeInvoiceModal();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeCustomerModal();
        closeInvoiceModal();
    }
});

// Debug function - you can call this in browser console
window.debugCart = function() {
    console.log('=== CART DEBUG INFO ===');
    console.log('Raw localStorage cart:', localStorage.getItem('qotore_cart'));
    console.log('Parsed cart:', JSON.parse(localStorage.getItem('qotore_cart') || '[]'));
    console.log('Processed cart variable:', cart);
    console.log('Cart length:', cart.length);
    console.log('Current user:', currentUser);
    console.log('User profile:', userProfile);
    console.log('Customer info:', customerInfo);
    console.log('Active order:', activeOrder);
    console.log('Translations loaded:', Object.keys(translations).length > 0);
    console.log('Current language:', currentLanguage);
    
    // Test cart transformation manually
    const rawCart = JSON.parse(localStorage.getItem('qotore_cart') || '[]');
    if (rawCart.length > 0) {
        console.log('Manual transformation test:');
        rawCart.forEach((item, index) => {
            const fragrance = {
                id: item.fragranceId,
                name: item.fragranceName,
                brand: item.fragranceBrand,
                image_path: item.image_path
            };
            
            const variant = {
                id: item.variant.id,
                size: item.variant.size,
                price_cents: item.variant.price * 1000,
                price: item.variant.price,
                is_whole_bottle: item.variant.is_whole_bottle
            };
            
            const transformed = {
                fragrance,
                variant,
                quantity: item.quantity
            };
            
            console.log(`Item ${index} transformation:`, {
                original: item,
                transformed: transformed,
                valid: !!(transformed.fragrance && transformed.variant && transformed.quantity > 0)
            });
        });
    }
    
    console.log('=== END DEBUG INFO ===');
    
    // Force re-render
    console.log('Forcing cart reload and re-render...');
    loadCart();
    renderCartItems();
};
window.updateCartItemQuantity = updateCartItemQuantity;
window.removeCartItem = removeCartItem;
window.clearCart = clearCart;
window.openCustomerModal = openCustomerModal;
window.closeCustomerModal = closeCustomerModal;
window.editCustomerInfo = editCustomerInfo;
window.selectDeliveryOption = selectDeliveryOption;
window.placeOrder = placeOrder;
window.cancelOrder = cancelOrder;
window.refreshOrderStatus = refreshOrderStatus;
window.viewInvoice = viewInvoice;
window.closeInvoiceModal = closeInvoiceModal;
window.printInvoice = printInvoice;