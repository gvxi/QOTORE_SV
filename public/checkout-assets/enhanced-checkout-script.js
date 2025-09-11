// Enhanced Checkout Script with User Authentication
// Global variables
let currentUser = null;
let currentProfile = null;
let supabase = null;
let cart = [];
let customerInfo = null;
let currentOrder = null;
let currentLanguage = 'en';
let translations = {};
let countdownInterval = null;

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    // Show loading screen
    document.getElementById('loadingSplash').style.display = 'flex';
    
    try {
        // Initialize Supabase
        await initializeSupabase();
        
        // Load translations
        await loadTranslations();
        
        // Load language preference
        loadLanguagePreference();
        
        // Check authentication and profile
        await checkAuthenticationAndProfile();
        
        // Load cart if authenticated
        if (currentUser && currentProfile?.profile_completed) {
            loadCartFromStorage();
            await checkForActiveOrder();
        }
        
        // Render appropriate view
        renderView();
        
    } catch (error) {
        console.error('Initialization error:', error);
        showAuthRequired();
    } finally {
        // Hide loading screen
        setTimeout(() => {
            document.getElementById('loadingSplash').style.display = 'none';
        }, 500);
    }
});

// Initialize Supabase
async function initializeSupabase() {
    try {
        const configResponse = await fetch('/api/config');
        if (configResponse.ok) {
            const config = await configResponse.json();
            if (typeof window.supabase !== 'undefined') {
                const { createClient } = window.supabase;
                supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
                console.log('Supabase client initialized for checkout');
            }
        }
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        throw error;
    }
}

// Load translations
async function loadTranslations() {
    try {
        const response = await fetch('/checkout-assets/checkout-translations.json');
        translations = await response.json();
    } catch (error) {
        console.error('Failed to load translations:', error);
        translations = { en: {}, ar: {} };
    }
}

// Translation function
function t(key) {
    return translations[currentLanguage]?.[key] || key;
}

// Update all translations
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

// Load language preference
function loadLanguagePreference() {
    currentLanguage = localStorage.getItem('qotore_language') || 'en';
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    updateTranslations();
}

// Check authentication and profile
async function checkAuthenticationAndProfile() {
    if (!supabase) {
        throw new Error('Supabase not initialized');
    }

    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session?.user) {
            currentUser = null;
            currentProfile = null;
            return;
        }

        currentUser = session.user;
        
        // Get user profile
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle();

        if (profileError) {
            console.error('Profile fetch error:', profileError);
            currentProfile = null;
            return;
        }

        currentProfile = profile;
        console.log('User authenticated:', currentUser.email, 'Profile complete:', profile?.profile_completed);
        
    } catch (error) {
        console.error('Authentication check error:', error);
        currentUser = null;
        currentProfile = null;
    }
}

// Check for active order
async function checkForActiveOrder() {
    if (!supabase || !currentUser) return;

    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    *
                )
            `)
            .eq('user_id', currentUser.id)
            .in('status', ['pending', 'reviewed'])
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Error checking for active order:', error);
            return;
        }

        if (orders && orders.length > 0) {
            currentOrder = orders[0];
            console.log('Active order found:', currentOrder.order_number);
        } else {
            currentOrder = null;
        }
    } catch (error) {
        console.error('Error checking for active order:', error);
    }
}

// Render appropriate view
function renderView() {
    const authSection = document.getElementById('authRequiredSection');
    const profileSection = document.getElementById('profileIncompleteSection');
    const currentOrderSection = document.getElementById('currentOrderSection');
    const checkoutSection = document.getElementById('checkoutSection');

    // Hide all sections first
    authSection.style.display = 'none';
    profileSection.style.display = 'none';
    currentOrderSection.style.display = 'none';
    checkoutSection.style.display = 'none';

    if (!currentUser) {
        // Show authentication required
        authSection.style.display = 'block';
    } else if (!currentProfile?.profile_completed) {
        // Show profile incomplete
        profileSection.style.display = 'block';
    } else if (currentOrder) {
        // Show current order
        renderCurrentOrder();
        currentOrderSection.style.display = 'block';
    } else {
        // Show normal checkout
        renderCheckout();
        checkoutSection.style.display = 'block';
    }
}

// Render current order
function renderCurrentOrder() {
    const detailsContainer = document.getElementById('currentOrderDetails');
    const orderDate = new Date(currentOrder.created_at).toLocaleDateString();
    const total = (currentOrder.total_amount / 1000).toFixed(3);

    detailsContainer.innerHTML = `
        <div class="order-summary">
            <div class="order-detail">
                <strong>${t('order_number')}:</strong> ${currentOrder.order_number}
            </div>
            <div class="order-detail">
                <strong>${t('order_date')}:</strong> ${orderDate}
            </div>
            <div class="order-detail">
                <strong>${t('status')}:</strong> <span class="status-${currentOrder.status}">${t(currentOrder.status)}</span>
            </div>
            <div class="order-detail">
                <strong>${t('total_amount')}:</strong> ${total} ${t('omr')}
            </div>
            <div class="order-detail">
                <strong>${t('items')}:</strong> ${currentOrder.order_items?.length || 0} ${currentOrder.order_items?.length === 1 ? t('item') : t('items')}
            </div>
        </div>
    `;

    // Setup cancel countdown if order is recent
    setupCancelCountdown();
}

// Setup cancel countdown
function setupCancelCountdown() {
    const orderTime = new Date(currentOrder.created_at).getTime();
    const currentTime = Date.now();
    const oneHour = 60 * 60 * 1000;
    const timeRemaining = oneHour - (currentTime - orderTime);

    const countdownElement = document.getElementById('cancelCountdown');
    const cancelBtn = document.getElementById('cancelOrderBtn');

    if (timeRemaining > 0 && currentOrder.status === 'pending') {
        // Show countdown timer
        countdownElement.style.display = 'block';
        cancelBtn.disabled = false;
        
        function updateCountdown() {
            const now = Date.now();
            const remaining = oneHour - (now - orderTime);
            
            if (remaining > 0) {
                const minutes = Math.floor(remaining / (1000 * 60));
                const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
                countdownElement.textContent = `${t('cancel_within_hour')} - ${minutes}:${seconds.toString().padStart(2, '0')} ${t('remaining')}`;
            } else {
                countdownElement.textContent = t('cancellation_period_expired');
                countdownElement.classList.add('expired');
                cancelBtn.disabled = true;
                cancelBtn.textContent = '⏰ ' + t('cancellation_expired');
                clearInterval(countdownInterval);
            }
        }

        updateCountdown();
        countdownInterval = setInterval(updateCountdown, 1000);
    } else {
        // Order is too old or already reviewed
        countdownElement.style.display = 'block';
        countdownElement.classList.add('expired');
        
        if (currentOrder.status === 'reviewed') {
            countdownElement.textContent = t('order_under_review_contact_admin');
            cancelBtn.disabled = true;
            cancelBtn.textContent = '📞 ' + t('contact_admin_to_cancel');
        } else {
            countdownElement.textContent = t('cancellation_period_expired');
            cancelBtn.disabled = true;
            cancelBtn.textContent = '⏰ ' + t('cancellation_expired');
        }
    }
}

// Load cart from storage
function loadCartFromStorage() {
    try {
        const savedCart = localStorage.getItem('qotore_cart');
        cart = savedCart ? JSON.parse(savedCart) : [];
        console.log('Cart loaded:', cart.length, 'items');
    } catch (error) {
        console.error('Error loading cart:', error);
        cart = [];
    }
}

// Render checkout
function renderCheckout() {
    if (cart.length === 0) {
        renderEmptyCart();
    } else {
        renderCartItems();
        renderCheckoutForm();
    }
}

// Render empty cart
function renderEmptyCart() {
    const checkoutSection = document.getElementById('checkoutSection');
    checkoutSection.innerHTML = `
        <div class="empty-cart-message">
            <div class="empty-cart-content">
                <h2>${t('cart_empty')}</h2>
                <p>${t('add_fragrances_to_cart')}</p>
                <a href="/" class="btn btn-primary">${t('browse_fragrances')}</a>
            </div>
        </div>
    `;
}

// Render cart items
function renderCartItems() {
    const cartItemsContainer = document.getElementById('cartItems');
    let itemsHTML = '';

    cart.forEach((item, index) => {
        const price = (item.variant.price_cents / 1000).toFixed(3);
        const totalPrice = ((item.variant.price_cents / 1000) * item.quantity).toFixed(3);

        itemsHTML += `
            <div class="cart-item">
                <div class="cart-item-content">
                    <div class="cart-item-details">
                        <h3 class="cart-item-name">${item.name}</h3>
                        <p class="cart-item-brand">${item.brand}</p>
                        <p class="cart-item-size">${item.variant.size}</p>
                    </div>
                    <div class="cart-item-price">
                        <div class="item-price">${price} ${t('omr')}</div>
                        <div class="item-quantity">
                            <button onclick="updateQuantity(${index}, -1)" class="quantity-btn">-</button>
                            <span class="quantity">${item.quantity}</span>
                            <button onclick="updateQuantity(${index}, 1)" class="quantity-btn">+</button>
                        </div>
                        <div class="item-total">${totalPrice} ${t('omr')}</div>
                    </div>
                </div>
                <button onclick="removeFromCart(${index})" class="remove-btn" title="${t('remove')}">×</button>
            </div>
        `;
    });

    const total = cart.reduce((sum, item) => sum + (item.variant.price_cents / 1000) * item.quantity, 0);

    cartItemsContainer.innerHTML = `
        ${itemsHTML}
        <div class="cart-summary">
            <div class="cart-total">
                <strong>${t('total')}: ${total.toFixed(3)} ${t('omr')}</strong>
            </div>
        </div>
    `;
}

// Render checkout form
function renderCheckoutForm() {
    const sidebarContent = document.getElementById('sidebarContent');
    const total = cart.reduce((sum, item) => sum + (item.variant.price_cents / 1000) * item.quantity, 0);
    
    if (customerInfo) {
        // Show customer info with place order button
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
                    ${customerInfo.email ? `
                    <div class="customer-detail">
                        <span class="customer-detail-label">${t('email')}:</span>
                        <span class="customer-detail-value">${customerInfo.email}</span>
                    </div>
                    ` : ''}
                    <div class="customer-detail">
                        <span class="customer-detail-label">${t('location')}:</span>
                        <span class="customer-detail-value">${customerInfo.city}, ${customerInfo.wilayat}</span>
                    </div>
                    <div class="customer-detail">
                        <span class="customer-detail-label">${t('delivery')}:</span>
                        <span class="customer-detail-value">${customerInfo.deliveryType === 'home' ? '🏠 ' + t('home_delivery') : '🚛 ' + t('pickup_delivery')}</span>
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

// Update quantity
function updateQuantity(index, change) {
    if (index >= 0 && index < cart.length) {
        cart[index].quantity = Math.max(1, cart[index].quantity + change);
        saveCartToStorage();
        renderCartItems();
        renderCheckoutForm();
    }
}

// Remove from cart
function removeFromCart(index) {
    if (index >= 0 && index < cart.length) {
        cart.splice(index, 1);
        saveCartToStorage();
        
        if (cart.length === 0) {
            renderEmptyCart();
        } else {
            renderCartItems();
            renderCheckoutForm();
        }
    }
}

// Save cart to storage
function saveCartToStorage() {
    try {
        localStorage.setItem('qotore_cart', JSON.stringify(cart));
    } catch (error) {
        console.error('Error saving cart:', error);
    }
}

// Clear cart
function clearCart() {
    if (confirm(t('confirm_clear_cart'))) {
        cart = [];
        saveCartToStorage();
        renderEmptyCart();
    }
}

// Show customer info modal
function showCustomerInfoModal() {
    const modal = document.getElementById('customerInfoModal');
    modal.style.display = 'flex';
    
    // Pre-fill with user profile data if available
    if (currentProfile) {
        document.getElementById('firstName').value = currentProfile.first_name || '';
        document.getElementById('lastName').value = currentProfile.last_name || '';
        document.getElementById('phoneNumber').value = currentProfile.phone_number || '';
        document.getElementById('emailAddress').value = currentUser.email || '';
        document.getElementById('wilayat').value = currentProfile.wilayat || '';
        document.getElementById('city').value = currentProfile.city_area || '';
    }
    
    // Setup form submission
    const form = document.getElementById('customerInfoForm');
    form.onsubmit = saveCustomerInfo;
}

// Close customer info modal
function closeCustomerInfoModal() {
    document.getElementById('customerInfoModal').style.display = 'none';
}

// Save customer info
function saveCustomerInfo(e) {
    e.preventDefault();
    
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const phone = document.getElementById('phoneNumber').value.trim();
    const email = document.getElementById('emailAddress').value.trim();
    const wilayat = document.getElementById('wilayat').value;
    const city = document.getElementById('city').value.trim();
    const deliveryType = document.querySelector('input[name="deliveryType"]:checked').value;
    const notes = document.getElementById('notes').value.trim();
    
    // Basic validation
    if (!firstName || !lastName || !phone || !wilayat || !city) {
        alert(t('fill_required_fields'));
        return;
    }
    
    // Validate Omani phone number
    const phoneRegex = /^(\+968|968)?\s?[2-9]\d{7}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
        alert(t('invalid_phone_number'));
        return;
    }
    
    customerInfo = {
        firstName,
        lastName,
        phone,
        email: email || null,
        wilayat,
        city,
        deliveryType,
        notes: notes || null
    };
    
    closeCustomerInfoModal();
    renderCheckoutForm();
    
    // Show success message
    showToast(t('info_saved'), 'success');
}

// Edit customer info
function editCustomerInfo() {
    showCustomerInfoModal();
}

// Place order
async function placeOrder() {
    if (!customerInfo || !cart || cart.length === 0) {
        alert(t('missing_required_info'));
        return;
    }
    
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    placeOrderBtn.disabled = true;
    placeOrderBtn.innerHTML = `⏳ ${t('processing_order')}`;
    
    try {
        // Prepare order data
        const orderData = {
            user_id: currentUser.id,
            customer_email: currentUser.email,
            customer_first_name: customerInfo.firstName,
            customer_last_name: customerInfo.lastName,
            customer_phone: customerInfo.phone,
            delivery_city: customerInfo.city,
            delivery_region: customerInfo.wilayat,
            delivery_type: customerInfo.deliveryType,
            delivery_notes: customerInfo.notes,
            total_amount: Math.round(cart.reduce((sum, item) => sum + (item.variant.price_cents) * item.quantity, 0)),
            status: 'pending',
            items: cart.map(item => ({
                fragrance_id: item.fragranceId,
                variant_id: item.variant.id,
                fragrance_name: item.name,
                fragrance_brand: item.brand,
                variant_size: item.variant.size,
                variant_price_cents: item.variant.price_cents,
                quantity: item.quantity,
                unit_price_cents: item.variant.price_cents,
                total_price_cents: item.variant.price_cents * item.quantity,
                is_whole_bottle: item.variant.is_whole_bottle || false
            }))
        };
        
        console.log('Placing order:', orderData);
        
        // Send order to API
        const response = await fetch('/functions/api/place-order-auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabase.auth.session()?.access_token}`
            },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Clear cart
            cart = [];
            saveCartToStorage();
            customerInfo = null;
            
            // Show success message
            showToast(t('order_success'), 'success');
            
            // Reload to show the new order status
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            
        } else {
            throw new Error(result.error || 'Order placement failed');
        }
        
    } catch (error) {
        console.error('Error placing order:', error);
        showToast(t('order_error'), 'error');
        
        placeOrderBtn.disabled = false;
        placeOrderBtn.innerHTML = `🛒 ${t('place_order')}`;
    }
}

// View current order invoice
function viewCurrentOrderInvoice() {
    if (!currentOrder) return;
    
    const modal = document.getElementById('invoiceModal');
    const content = document.getElementById('invoiceContent');
    
    const orderDate = new Date(currentOrder.created_at).toLocaleDateString();
    const total = (currentOrder.total_amount / 1000).toFixed(3);
    
    let itemsHTML = '';
    if (currentOrder.order_items && currentOrder.order_items.length > 0) {
        currentOrder.order_items.forEach(item => {
            const itemPrice = (item.unit_price_cents / 1000).toFixed(3);
            const itemTotal = (item.total_price_cents / 1000).toFixed(3);
            
            itemsHTML += `
                <div class="invoice-item">
                    <div>
                        <strong>${item.fragrance_name}</strong><br>
                        <small>${item.fragrance_brand} - ${item.variant_size}</small>
                    </div>
                    <div style="text-align: right;">
                        ${item.quantity} × ${itemPrice} = ${itemTotal} ${t('omr')}
                    </div>
                </div>
            `;
        });
    }
    
    content.innerHTML = `
        <div class="invoice-section">
            <h3>${t('order_information')}</h3>
            <div class="invoice-detail">
                <strong>${t('order_number')}:</strong>
                <span>${currentOrder.order_number}</span>
            </div>
            <div class="invoice-detail">
                <strong>${t('order_date')}:</strong>
                <span>${orderDate}</span>
            </div>
            <div class="invoice-detail">
                <strong>${t('status')}:</strong>
                <span class="status-${currentOrder.status}">${t(currentOrder.status)}</span>
            </div>
        </div>
        
        <div class="invoice-section">
            <h3>${t('customer_information')}</h3>
            <div class="invoice-detail">
                <strong>${t('name')}:</strong>
                <span>${currentOrder.customer_first_name} ${currentOrder.customer_last_name || ''}</span>
            </div>
            <div class="invoice-detail">
                <strong>${t('phone')}:</strong>
                <span>${currentOrder.customer_phone}</span>
            </div>
            ${currentOrder.customer_email ? `
            <div class="invoice-detail">
                <strong>${t('email')}:</strong>
                <span>${currentOrder.customer_email}</span>
            </div>
            ` : ''}
            <div class="invoice-detail">
                <strong>${t('location')}:</strong>
                <span>${currentOrder.delivery_city}, ${currentOrder.delivery_region}</span>
            </div>
            <div class="invoice-detail">
                <strong>${t('delivery')}:</strong>
                <span>${currentOrder.delivery_type === 'home' ? t('home_delivery') : t('pickup_delivery')}</span>
            </div>
            ${currentOrder.delivery_notes ? `
            <div class="invoice-detail">
                <strong>${t('notes')}:</strong>
                <span>${currentOrder.delivery_notes}</span>
            </div>
            ` : ''}
        </div>
        
        <div class="invoice-section">
            <h3>${t('order_items')}</h3>
            ${itemsHTML}
        </div>
        
        <div class="invoice-section">
            <div class="invoice-detail" style="font-size: 1.2rem; font-weight: 700; border-top: 2px solid #8B4513; padding-top: 1rem;">
                <strong>${t('total_amount')}:</strong>
                <span>${total} ${t('omr')}</span>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
}

// Print current order invoice
function printCurrentOrderInvoice() {
    viewCurrentOrderInvoice();
    setTimeout(() => {
        window.print();
    }, 500);
}

// Close invoice modal
function closeInvoiceModal() {
    document.getElementById('invoiceModal').style.display = 'none';
}

// Print invoice
function printInvoice() {
    window.print();
}

// Cancel current order
async function cancelCurrentOrder() {
    if (!currentOrder) return;
    
    if (!confirm(t('confirm_cancel_order'))) return;
    
    try {
        const response = await fetch('/functions/api/cancel-order-auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabase.auth.session()?.access_token}`
            },
            body: JSON.stringify({
                order_id: currentOrder.id,
                user_id: currentUser.id
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(t('order_cancelled_successfully'), 'success');
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            throw new Error(result.error || 'Failed to cancel order');
        }
        
    } catch (error) {
        console.error('Error cancelling order:', error);
        showToast(t('cancel_order_error'), 'error');
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
        border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
        border-radius: 8px;
        padding: 1rem 1.5rem;
        max-width: 350px;
        z-index: 10000;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 4 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// Setup delivery option selection
document.addEventListener('change', function(e) {
    if (e.target.name === 'deliveryType') {
        // Update UI for selected delivery option
        document.querySelectorAll('.delivery-option').forEach(option => {
            option.classList.remove('selected');
        });
        e.target.closest('.delivery-option').classList.add('selected');
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
});