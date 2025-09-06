// Checkout Script - Mobile-friendly, Supabase integration
let cart = [];
let customerInfo = null;
let activeOrder = null;
let previousOrders = [];
let customerIP = null;

// Initialize the checkout page
document.addEventListener('DOMContentLoaded', async function() {
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
        
        console.log('Customer IP:', customerIP);
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
            console.log('Loaded customer info:', customerInfo);
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
        console.log('Saved customer info:', info);
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
            console.log('Loaded cart:', cart);
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
        console.log('Saved cart:', cart);
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
                <h2 class="empty-cart-title">Your cart is empty</h2>
                <p class="empty-cart-message">Add some fragrances to get started</p>
                <a href="/" class="btn btn-primary">Continue Shopping</a>
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
                        ${item.variant.size} - ${item.variant.price_display || (item.variant.price_cents / 1000).toFixed(3) + ' OMR'}
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
                        <button class="cart-remove-btn" onclick="removeFromCart(${index})">Remove</button>
                    </div>
                </div>
                <div class="cart-item-price-section">
                    <div class="cart-item-price">${itemTotal.toFixed(3)} OMR</div>
                    <div class="cart-item-unit-price">${(item.variant.price_cents / 1000).toFixed(3)} OMR each</div>
                </div>
            </div>
        `;
    });
    
    cartContent.innerHTML = cartHTML;
    
    // Update summary
    document.getElementById('subtotalAmount').textContent = `${total.toFixed(3)} OMR`;
    document.getElementById('totalAmount').textContent = `${total.toFixed(3)} OMR`;
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
                <h2 class="order-status-title">Start Shopping</h2>
                <p class="order-status-message">Add items to your cart to proceed with checkout</p>
                <a href="/" class="btn btn-primary btn-full">Browse Fragrances</a>
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
    const itemsCount = activeOrder.items ? activeOrder.items.length : 0;
    const totalItems = activeOrder.items ? activeOrder.items.reduce((sum, item) => sum + (item.quantity || 1), 0) : 0;
    
    let actionButtons = '';
    if (canCancel) {
        actionButtons = `
            <button class="btn btn-danger btn-full" onclick="cancelOrder()">
                ❌ Cancel Order
            </button>
            <p style="font-size: 0.8rem; color: #6c757d; text-align: center; margin-top: 0.5rem;">
                You can cancel within 1 hour of placing the order
            </p>
        `;
    }
    
    sidebarContent.innerHTML = `
        <div class="order-status-section">
            <div class="order-status-icon">${statusIcons[activeOrder.status] || '📦'}</div>
            <h2 class="order-status-title">${activeOrder.status_display || 'Order Status'}</h2>
            <p class="order-status-message">${statusMessages[activeOrder.status] || 'Order in progress'}</p>
            
            <div class="order-details-card">
                <div class="order-detail-row">
                    <span class="order-detail-label">Order Number:</span>
                    <span class="order-detail-value order-number">${activeOrder.order_number}</span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">Status:</span>
                    <span class="order-detail-value">
                        <span class="status-badge status-${activeOrder.status}">${activeOrder.status_display}</span>
                    </span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">Total:</span>
                    <span class="order-detail-value">${((activeOrder.total_amount || 0) / 1000).toFixed(3)} OMR</span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">Items:</span>
                    <span class="order-detail-value">${totalItems} item(s) - ${itemsCount} type(s)</span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">Order Date:</span>
                    <span class="order-detail-value">${orderDate}</span>
                </div>
            </div>
            
            ${actionButtons}
            
            <button class="btn btn-outline btn-full" onclick="refreshOrderStatus()">
                🔄 Refresh Status
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
                <h2 class="checkout-title">Place Order</h2>
                
                <div class="customer-info-display">
                    <div class="customer-info-title">
                        <span>📋 Your Information</span>
                        <button class="edit-info-btn" onclick="editCustomerInfo()">Edit</button>
                    </div>
                    <div class="customer-detail">
                        <span class="customer-detail-label">Name:</span>
                        <span class="customer-detail-value">${customerInfo.name}</span>
                    </div>
                    <div class="customer-detail">
                        <span class="customer-detail-label">Phone:</span>
                        <span class="customer-detail-value">${customerInfo.phone}</span>
                    </div>
                    ${customerInfo.email ? `
                    <div class="customer-detail">
                        <span class="customer-detail-label">Email:</span>
                        <span class="customer-detail-value">${customerInfo.email}</span>
                    </div>
                    ` : ''}
                    <div class="customer-detail">
                        <span class="customer-detail-label">Location:</span>
                        <span class="customer-detail-value">${customerInfo.city}, ${customerInfo.wilaya}</span>
                    </div>
                    <div class="customer-detail">
                        <span class="customer-detail-label">Delivery:</span>
                        <span class="customer-detail-value">${customerInfo.deliveryOption === 'home' ? '🏠 Deliver to Home' : '🚛 Use Delivery Service'}</span>
                    </div>
                    ${customerInfo.notes ? `
                    <div class="customer-detail">
                        <span class="customer-detail-label">Notes:</span>
                        <span class="customer-detail-value">${customerInfo.notes}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="order-summary-section">
                    <div class="order-detail-row">
                        <span class="order-detail-label">Total:</span>
                        <span class="order-detail-value" style="font-size: 1.2rem; font-weight: 700; color: #28a745;">${total.toFixed(3)} OMR</span>
                    </div>
                </div>
                
                <button class="btn btn-success btn-full" onclick="placeOrder()" id="placeOrderBtn">
                    🛒 Place Order
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
                <h2 class="checkout-title">Complete Your Order</h2>
                
                <div class="order-summary-section">
                    <div class="order-detail-row">
                        <span class="order-detail-label">Total:</span>
                        <span class="order-detail-value" style="font-size: 1.2rem; font-weight: 700; color: #28a745;">${total.toFixed(3)} OMR</span>
                    </div>
                </div>
                
                <button class="btn btn-primary btn-full" onclick="showCustomerInfoModal()">
                    📝 Add Your Information
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
                <h3 class="previous-orders-title">📚 Previous Orders</h3>
                <div class="no-previous-orders">No previous orders found</div>
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
                <div class="previous-order-total">${((order.total_amount || 0) / 1000).toFixed(3)} OMR</div>
            </div>
        `;
    });
    
    return `
        <div class="previous-orders-section">
            <h3 class="previous-orders-title">📚 Previous Orders</h3>
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
    if (confirm('Are you sure you want to clear your cart?')) {
        cart = [];
        saveCart();
        renderPage();
        showToast('Cart cleared successfully');
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
        showToast('Please fill in all required fields', 'error');
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
        const total = window.calculateCartTotal ? window.calculateCartTotal(cart) : 
                      cart.reduce((sum, item) => sum + ((item.variant.price_cents || 0) / 1000) * item.quantity, 0);
        
        const orderData = {
            customer_ip: customerIP,
            customer_first_name: customerInfo.name.split(' ')[0],
            customer_last_name: customerInfo.name.split(' ').slice(1).join(' '),
            customer_phone: customerInfo.phone,
            customer_email: customerInfo.email || null,
            delivery_address: customerInfo.deliveryOption === 'home' ? 'Deliver to home address' : 'Use delivery service',
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
            
            showToast('Order placed successfully! 🎉');
        } else {
            console.error('Order placement failed:', result);
            throw new Error(result.error || 'Failed to place order');
        }
        
    } catch (error) {
        console.error('Error placing order:', error);
        showToast(error.message || 'Failed to place order', 'error');
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
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 4000);
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('customerInfoModal');
    if (e.target === modal) {
        closeCustomerModal();
    }
});

// Handle escape key for modal
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeCustomerModal();
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
            renderSidebar();
        } catch (error) {
            console.error('Auto-refresh failed:', error);
        }
    }
}, 30000);