let supabase = null;
let currentUser = null;
let userProfile = null;
let cart = [];
let activeOrder = null;
let isProcessing = false;

document.addEventListener('DOMContentLoaded', async function() {
    showLoadingSplash();
    
    try {
        await initializeSupabase();
        await checkUserAuthentication();
        loadCartFromStorage();
        await checkForActiveOrder();
        
        renderPage();
        setupEventListeners();
        
    } catch (error) {
        console.error('Initialization error:', error);
        showToast(t('network_error'), 'error');
    } finally {
        hideLoadingSplash();
    }
});

async function initializeSupabase() {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error('Config not available');
        
        const config = await response.json();
        
        if (typeof window.supabase !== 'undefined') {
            const { createClient } = window.supabase;
            supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
            console.log('Supabase initialized for checkout');
        } else {
            throw new Error('Supabase library not loaded');
        }
    } catch (error) {
        console.error('Supabase initialization failed:', error);
        throw error;
    }
}

async function checkUserAuthentication() {
    if (!supabase) return;
    
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Session check error:', error);
            return;
        }
        
        if (session?.user) {
            currentUser = session.user;
            
            const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();
                
            if (profileError) {
                console.error('Profile fetch error:', profileError);
            } else {
                userProfile = profile;
            }
        }
    } catch (error) {
        console.error('Authentication check failed:', error);
    }
}

function loadCartFromStorage() {
    try {
        const savedCart = localStorage.getItem('qotore_cart');
        if (savedCart) {
            cart = JSON.parse(savedCart);
            cart = cart.filter(item => 
                item.fragranceId && 
                item.variant && 
                typeof item.variant.price === 'number' && 
                typeof item.quantity === 'number'
            );
        } else {
            cart = [];
        }
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

async function checkForActiveOrder() {
    if (!currentUser) return;
    
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    id,
                    fragrance_id,
                    variant_id,
                    fragrance_name,
                    fragrance_brand,
                    variant_size,
                    quantity,
                    unit_price_cents,
                    total_price_cents,
                    is_whole_bottle,
                    fragrances (name, brand, image_path)
                )
            `)
            .eq('user_id', currentUser.id)
            .in('status', ['pending', 'reviewed'])
            .order('created_at', { ascending: false })
            .limit(1);
            
        if (error) {
            console.error('Active order check error:', error);
            return;
        }
        
        if (orders && orders.length > 0) {
            activeOrder = orders[0];
            const orderTime = new Date(activeOrder.created_at);
            const now = new Date();
            const hoursSinceOrder = (now - orderTime) / (1000 * 60 * 60);
            
            activeOrder.can_cancel = hoursSinceOrder < 1 && activeOrder.status === 'pending';
        }
    } catch (error) {
        console.error('Error checking active order:', error);
    }
}

function renderPage() {
    const container = document.getElementById('checkoutContainer');
    
    hideAllSections();
    renderUserSection();
    
    if (!currentUser) {
        document.getElementById('notSignedInMessage').style.display = 'block';
    } else if (!userProfile || !isProfileComplete(userProfile)) {
        document.getElementById('profileIncompleteMessage').style.display = 'block';
    } else if (activeOrder) {
        renderActiveOrder();
        document.getElementById('activeOrderDisplay').style.display = 'block';
    } else if (cart.length === 0) {
        document.getElementById('emptyCartDisplay').style.display = 'block';
    } else {
        renderCheckoutForm();
        document.getElementById('checkoutForm').style.display = 'block';
    }
}

function hideAllSections() {
    document.getElementById('notSignedInMessage').style.display = 'none';
    document.getElementById('profileIncompleteMessage').style.display = 'none';
    document.getElementById('activeOrderDisplay').style.display = 'none';
    document.getElementById('emptyCartDisplay').style.display = 'none';
    document.getElementById('checkoutForm').style.display = 'none';
}

function isProfileComplete(profile) {
    return profile && 
           profile.first_name && 
           profile.last_name && 
           profile.phone && 
           profile.profile_completed;
}

function renderUserSection() {
    const userSection = document.getElementById('userSection');
    
    if (currentUser) {
        const displayName = userProfile?.first_name || currentUser.email.split('@')[0];
        const avatar = userProfile?.google_picture || currentUser.user_metadata?.avatar_url;
        
        userSection.innerHTML = `
            <div class="user-info">
                <div class="user-avatar">
                    ${avatar ? 
                        `<img src="${avatar}" alt="${displayName}">` : 
                        displayName.charAt(0).toUpperCase()
                    }
                </div>
                <span class="user-name">${displayName}</span>
            </div>
            <button class="nav-btn" onclick="signOut()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16,17 21,12 16,7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                <span>Sign Out</span>
            </button>
        `;
    } else {
        userSection.innerHTML = `
            <button class="nav-btn" onclick="window.location.href='/user/login.html'">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10,17 15,12 10,7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                <span>${t('sign_in')}</span>
            </button>
        `;
    }
}

function renderActiveOrder() {
    const container = document.getElementById('activeOrderDisplay');
    
    if (!activeOrder) return;
    
    const orderDate = new Date(activeOrder.created_at).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const totalAmount = (activeOrder.total_amount / 1000).toFixed(3);
    
    container.innerHTML = `
        <div class="order-header">
            <div class="order-info">
                <h3>${t('order_number')} #${activeOrder.order_number}</h3>
                <div class="order-date">${t('order_date')} ${orderDate}</div>
            </div>
            <div class="order-status status-${activeOrder.status}">
                ${getStatusIcon(activeOrder.status)}
                <span>${t('status_' + activeOrder.status)}</span>
            </div>
            <div class="order-actions-header">
                ${activeOrder.can_cancel ? `
                    <button class="btn cancel-btn" onclick="cancelOrder('${activeOrder.id}')">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="15" y1="9" x2="9" y2="15"/>
                            <line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                        <span>${t('cancel_order')}</span>
                    </button>
                ` : `
                    <button class="btn btn-secondary" disabled title="${t('cancel_expired')}">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <circle cx="12" cy="16" r="1"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        <span>${t('cannot_cancel')}</span>
                    </button>
                `}
            </div>
        </div>
        
        <div class="order-content">
            <div class="order-items">
                ${activeOrder.order_items.map(item => `
                    <div class="order-item">
                        <div class="order-item-image">
                            ${item.fragrances?.image_path ? 
                                `<img src="/api/image/${item.fragrances.image_path.replace('fragrance-images/', '')}" alt="${item.fragrance_name}">` :
                                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6"/></svg>'
                            }
                        </div>
                        <div class="order-item-details">
                            <div class="order-item-name">${item.fragrance_brand ? item.fragrance_brand + ' ' : ''}${item.fragrance_name}</div>
                            <div class="order-item-variant">${item.variant_size}</div>
                        </div>
                        <div class="order-item-quantity">×${item.quantity}</div>
                        <div class="order-item-price">${(item.total_price_cents / 1000).toFixed(3)} ${t('omr')}</div>
                    </div>
                `).join('')}
            </div>
            
            <div class="order-total-section">
                <div class="order-total">
                    <span>${t('total')}:</span>
                    <span>${totalAmount} ${t('omr')}</span>
                </div>
            </div>
            
            <div class="order-actions-section">
                <button class="btn view-invoice-btn" onclick="showInvoice('${activeOrder.id}')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10,9 9,9 8,9"/>
                    </svg>
                    <span>${t('view_invoice')}</span>
                </button>
            </div>
        </div>
    `;
}

function getStatusIcon(status) {
    const icons = {
        pending: '⏳',
        reviewed: '👨‍💼',
        completed: '✅',
        cancelled: '❌'
    };
    return icons[status] || '📋';
}

function renderCheckoutForm() {
    renderCartItems();
    calculateCartTotal();
}

function renderCartItems() {
    const container = document.getElementById('cartItems');
    
    if (cart.length === 0) {
        container.innerHTML = '<p>No items in cart</p>';
        return;
    }
    
    container.innerHTML = cart.map((item, index) => {
        const itemTotal = (item.variant.price * item.quantity);
        const bustParam = `cb=${Math.floor(Date.now() / 60000)}`;
        
        return `
            <div class="cart-item">
                <div class="cart-item-image">
                    ${item.image_path ? 
                        `<img src="/api/image/${item.image_path.replace('fragrance-images/', '')}?${bustParam}" alt="${item.fragranceName}">` :
                        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6"/></svg>'
                    }
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.fragranceBrand ? item.fragranceBrand + ' ' : ''}${item.fragranceName}</div>
                    <div class="cart-item-variant">${item.variant.size}</div>
                    <div class="cart-item-controls">
                        <div class="qty-controls">
                            <button class="qty-btn" onclick="updateQuantity(${index}, -1)" ${item.quantity <= 1 ? 'disabled' : ''}>
                                ${item.quantity <= 1 ? '×' : '−'}
                            </button>
                            <input type="number" class="qty-input" value="${item.quantity}" 
                                   min="1" max="10" onchange="setQuantity(${index}, this.value)">
                            <button class="qty-btn" onclick="updateQuantity(${index}, 1)" ${item.quantity >= 10 ? 'disabled' : ''}>+</button>
                        </div>
                        <button class="remove-btn" onclick="removeFromCart(${index})" title="${t('remove')}">×</button>
                    </div>
                </div>
                <div class="cart-item-price">
                    <div class="item-price">${itemTotal.toFixed(3)} ${t('omr')}</div>
                    <div class="item-unit-price">${item.variant.price.toFixed(3)} ${t('omr')} each</div>
                </div>
            </div>
        `;
    }).join('');
}

function calculateCartTotal() {
    const total = cart.reduce((sum, item) => {
        return sum + (item.variant.price * item.quantity);
    }, 0);
    
    document.getElementById('subtotalAmount').textContent = `${total.toFixed(3)} ${t('omr')}`;
    document.getElementById('totalAmount').textContent = `${total.toFixed(3)} ${t('omr')}`;
}

function updateQuantity(index, change) {
    if (index < 0 || index >= cart.length) return;
    
    const newQuantity = cart[index].quantity + change;
    
    if (newQuantity <= 0) {
        removeFromCart(index);
    } else if (newQuantity <= 10) {
        cart[index].quantity = newQuantity;
        saveCart();
        renderCartItems();
        calculateCartTotal();
        showToast(t('cart_updated'), 'success');
    }
}

function setQuantity(index, value) {
    if (index < 0 || index >= cart.length) return;
    
    const quantity = parseInt(value);
    if (isNaN(quantity) || quantity < 1 || quantity > 10) return;
    
    cart[index].quantity = quantity;
    saveCart();
    renderCartItems();
    calculateCartTotal();
    showToast(t('cart_updated'), 'success');
}

function removeFromCart(index) {
    if (index < 0 || index >= cart.length) return;
    
    if (confirm(t('confirm_remove_item'))) {
        cart.splice(index, 1);
        saveCart();
        
        if (cart.length === 0) {
            renderPage();
        } else {
            renderCartItems();
            calculateCartTotal();
        }
        
        showToast(t('item_removed'), 'success');
    }
}

async function placeOrder() {
    if (isProcessing) return;
    
    try {
        const formData = validateAndCollectFormData();
        if (!formData) return;
        
        isProcessing = true;
        updatePlaceOrderButton(true);
        
        const orderData = {
            user_id: currentUser.id,
            customer_first_name: userProfile.first_name,
            customer_last_name: userProfile.last_name,
            customer_email: currentUser.email,
            customer_phone: userProfile.phone,
            delivery_address: formData.delivery_type === 'home' ? 'Home Delivery' : 'Delivery Service',
            delivery_city: formData.city,
            delivery_region: formData.wilayat,
            notes: formData.notes || null,
            items: cart.map(item => ({
                fragrance_id: item.fragranceId,
                variant_id: item.variantId,
                fragrance_name: item.fragranceName,
                fragrance_brand: item.fragranceBrand || null,
                variant_size: item.variant.size,
                variant_price_cents: item.variant.price * 1000,
                quantity: item.quantity,
                unit_price_cents: item.variant.price * 1000,
                total_price_cents: (item.variant.price * 1000) * item.quantity,
                is_whole_bottle: item.variant.is_whole_bottle || false
            })),
            total_amount: cart.reduce((sum, item) => 
                sum + ((item.variant.price * 1000) * item.quantity), 0
            )
        };
        
        console.log('Placing order:', orderData);
        
        const response = await fetch('/api/place-order-auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            cart = [];
            localStorage.removeItem('qotore_cart');
            
            showSuccessModal();
            
            setTimeout(() => {
                window.location.reload();
            }, 3000);
            
        } else {
            throw new Error(result.message || 'Failed to place order');
        }
        
    } catch (error) {
        console.error('Order placement error:', error);
        showToast(t('order_error'), 'error');
    } finally {
        isProcessing = false;
        updatePlaceOrderButton(false);
    }
}

function validateAndCollectFormData() {
    const wilayat = document.getElementById('wilayat').value;
    const city = document.getElementById('city').value;
    const deliveryType = document.querySelector('input[name="delivery_type"]:checked')?.value;
    const notes = document.getElementById('notes').value;
    
    if (!wilayat) {
        showToast(t('validation_wilayat'), 'error');
        document.getElementById('wilayat').focus();
        return null;
    }
    
    if (!city.trim()) {
        showToast(t('validation_city'), 'error');
        document.getElementById('city').focus();
        return null;
    }
    
    if (!deliveryType) {
        showToast(t('validation_required'), 'error');
        return null;
    }
    
    return {
        wilayat,
        city: city.trim(),
        delivery_type: deliveryType,
        notes: notes.trim()
    };
}

function updatePlaceOrderButton(processing) {
    const button = document.getElementById('placeOrderBtn');
    if (processing) {
        button.disabled = true;
        button.innerHTML = `
            <div class="loading-spinner" style="width: 20px; height: 20px; margin-right: 8px;"></div>
            <span>${t('processing_order')}</span>
        `;
    } else {
        button.disabled = false;
        button.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4"/>
                <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3"/>
                <path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3"/>
            </svg>
            <span>${t('place_order')}</span>
        `;
    }
}

async function cancelOrder(orderId) {
    if (!confirm(t('confirm_cancel_order'))) return;
    
    try {
        const response = await fetch(`/api/cancel-order-auth`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                order_id: orderId,
                user_id: currentUser.id
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(t('cancel_success'), 'success');
            activeOrder = null;
            renderPage();
        } else {
            throw new Error(result.message || result.error || 'Failed to cancel order');
        }
    } catch (error) {
        console.error('Cancel order error:', error);
        showToast(t('cancel_error'), 'error');
    }
}

async function showInvoice(orderId) {
    try {
        showToast(t('loading_order'), 'info');
        
        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    id,
                    fragrance_id,
                    variant_id,
                    fragrance_name,
                    fragrance_brand,
                    variant_size,
                    quantity,
                    unit_price_cents,
                    total_price_cents,
                    is_whole_bottle,
                    fragrances (name, brand, image_path)
                )
            `)
            .eq('id', orderId)
            .single();
            
        if (error) throw error;
        
        renderInvoice(order);
        document.getElementById('invoiceModal').classList.add('show');
        
    } catch (error) {
        console.error('Error loading invoice:', error);
        showToast(t('network_error'), 'error');
    }
}

function renderInvoice(order) {
    const container = document.getElementById('invoiceContent');
    const orderDate = new Date(order.created_at).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const totalAmount = (order.total_amount / 1000).toFixed(3);
    
    container.innerHTML = `
        <div class="invoice-header">
            <h1>${t('invoice_title')}</h1>
            <p>${t('invoice_subtitle')}</p>
        </div>
        
        <div class="invoice-details">
            <div class="invoice-section">
                <h3>${t('order_information')}</h3>
                <p><strong>${t('order_number')}:</strong> #${order.order_number}</p>
                <p><strong>${t('order_date')}:</strong> ${orderDate}</p>
                <p><strong>${t('delivery_method')}:</strong> ${order.delivery_address}</p>
            </div>
            
            <div class="invoice-section">
                <h3>${t('customer_information')}</h3>
                <p><strong>Name:</strong> ${order.customer_first_name} ${order.customer_last_name || ''}</p>
                <p><strong>Email:</strong> ${order.customer_email || 'N/A'}</p>
                <p><strong>Phone:</strong> ${order.customer_phone}</p>
                <p><strong>${t('wilayat')}:</strong> ${order.delivery_region || 'N/A'}</p>
                <p><strong>${t('city')}:</strong> ${order.delivery_city}</p>
                ${order.notes ? `<p><strong>${t('order_notes')}:</strong> ${order.notes}</p>` : ''}
            </div>
        </div>
        
        <div class="invoice-items">
            <h3>${t('order_items')}</h3>
            <table class="invoice-table">
                <thead>
                    <tr>
                        <th>${t('item')}</th>
                        <th>${t('size')}</th>
                        <th class="text-center">${t('quantity')}</th>
                        <th class="text-right">${t('unit_price')}</th>
                        <th class="text-right">${t('total_price')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.order_items.map(item => `
                        <tr>
                            <td>${item.fragrance_brand ? item.fragrance_brand + ' ' : ''}${item.fragrance_name}</td>
                            <td>${item.variant_size}</td>
                            <td class="text-center">${item.quantity}</td>
                            <td class="text-right">${(item.unit_price_cents / 1000).toFixed(3)} ${t('omr')}</td>
                            <td class="text-right">${(item.total_price_cents / 1000).toFixed(3)} ${t('omr')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="invoice-total">
            <strong>${t('grand_total')}: ${totalAmount} ${t('omr')}</strong>
        </div>
        
        <div style="text-align: center; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e9ecef; color: #64748b;">
            <p><strong>${t('contact_whatsapp')}:</strong> +968 9222 5949</p>
            <p><strong>${t('contact_email')}:</strong> orders@qotore.uk</p>
            <p style="margin-top: 1rem; font-style: italic;">Thank you for choosing Qotore!</p>
        </div>
    `;
}

function closeInvoiceModal() {
    document.getElementById('invoiceModal').classList.remove('show');
}

function printInvoice() {
    window.print();
}

function showSuccessModal() {
    document.getElementById('successModal').classList.add('show');
}

async function signOut() {
    try {
        if (supabase) {
            await supabase.auth.signOut();
        }
        window.location.href = '/';
    } catch (error) {
        console.error('Sign out error:', error);
        window.location.href = '/';
    }
}

function setupEventListeners() {
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', placeOrder);
    }
    
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.show').forEach(modal => {
                modal.classList.remove('show');
            });
        }
    });
    
    const deliveryForm = document.getElementById('deliveryForm');
    if (deliveryForm) {
        deliveryForm.addEventListener('input', validateForm);
        deliveryForm.addEventListener('change', validateForm);
    }
}

function validateForm() {
    const wilayat = document.getElementById('wilayat').value;
    const city = document.getElementById('city').value;
    const deliveryType = document.querySelector('input[name="delivery_type"]:checked');
    
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    if (placeOrderBtn && !isProcessing) {
        placeOrderBtn.disabled = !wilayat || !city.trim() || !deliveryType;
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    }[type] || 'ℹ️';
    
    toast.innerHTML = `
        <span>${icon}</span>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
}

function showLoadingSplash() {
    document.getElementById('loadingSplash').classList.remove('hidden');
}

function hideLoadingSplash() {
    setTimeout(() => {
        document.getElementById('loadingSplash').classList.add('hidden');
    }, 500);
}

function populateDeliveryForm() {
    if (userProfile) {
        const wilayatField = document.getElementById('wilayat');
        const cityField = document.getElementById('city');
        
        if (userProfile.wilayat && wilayatField) {
            wilayatField.value = userProfile.wilayat;
        }
        
        if (userProfile.city && cityField) {
            cityField.value = userProfile.city;
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (document.getElementById('deliveryForm')) {
            populateDeliveryForm();
            validateForm();
        }
    }, 1000);
});

window.addEventListener('popstate', function() {
    renderPage();
});

setInterval(async function() {
    if (activeOrder && currentUser) {
        await checkForActiveOrder();
        if (document.getElementById('activeOrderDisplay').style.display !== 'none') {
            renderActiveOrder();
        }
    }
}, 30000);

console.log('ECS');