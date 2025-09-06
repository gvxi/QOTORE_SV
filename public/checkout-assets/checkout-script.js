// Checkout Page JavaScript - Integration with Supabase Database
console.log('🛒 Checkout script loaded');

// Global variables
let cart = [];
let customerInfo = null;
let activeOrder = null;
let customerIP = null;
let orderHistory = [];

// Supabase configuration - will be loaded from environment
const SUPABASE_CONFIG = {
    url: null,
    anonKey: null
};

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Initializing checkout page...');
    
    try {
        // Get customer IP first
        await getCustomerIP();
        
        // Load cart from localStorage
        loadCartFromStorage();
        
        // Check for existing customer info
        loadCustomerInfo();
        
        // Check for active orders
        await checkActiveOrder();
        
        // Load order history
        await loadOrderHistory();
        
        // Display cart
        displayCart();
        
        // Setup event listeners
        setupEventListeners();
        
        console.log('✅ Checkout page initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize checkout page:', error);
        showToast('Failed to load page data', 'error');
    }
});

// Get customer IP address
async function getCustomerIP() {
    try {
        // Try multiple IP services
        const ipServices = [
            'https://api.ipify.org?format=json',
            'https://ipapi.co/json/',
            'https://httpbin.org/ip'
        ];
        
        for (const service of ipServices) {
            try {
                const response = await fetch(service);
                const data = await response.json();
                customerIP = data.ip || data.origin;
                if (customerIP) {
                    console.log('📍 Customer IP detected:', customerIP);
                    return customerIP;
                }
            } catch (e) {
                console.warn('IP service failed:', service, e);
                continue;
            }
        }
        
        // Fallback: generate a session-based identifier
        customerIP = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        console.log('📍 Using session ID as customer identifier:', customerIP);
        
    } catch (error) {
        console.error('Failed to get customer IP:', error);
        customerIP = 'unknown_' + Date.now();
    }
}

// Load cart from localStorage
function loadCartFromStorage() {
    try {
        const savedCart = localStorage.getItem('qotore_cart');
        cart = savedCart ? JSON.parse(savedCart) : [];
        console.log('🛒 Cart loaded:', cart.length, 'items');
    } catch (error) {
        console.error('Failed to load cart:', error);
        cart = [];
    }
}

// Save cart to localStorage
function saveCartToStorage() {
    try {
        localStorage.setItem('qotore_cart', JSON.stringify(cart));
        console.log('💾 Cart saved to storage');
    } catch (error) {
        console.error('Failed to save cart:', error);
    }
}

// Load customer info from localStorage
function loadCustomerInfo() {
    try {
        const savedInfo = localStorage.getItem('qotore_customer_info');
        if (savedInfo) {
            customerInfo = JSON.parse(savedInfo);
            console.log('👤 Customer info loaded for:', customerInfo.name);
        }
    } catch (error) {
        console.error('Failed to load customer info:', error);
        customerInfo = null;
    }
}

// Save customer info to localStorage
function saveCustomerInfo(info) {
    try {
        customerInfo = info;
        localStorage.setItem('qotore_customer_info', JSON.stringify(info));
        console.log('💾 Customer info saved');
    } catch (error) {
        console.error('Failed to save customer info:', error);
    }
}

// Check for active orders
async function checkActiveOrder() {
    if (!customerIP) return;
    
    try {
        console.log('🔍 Checking for active orders...');
        
        const response = await fetch(`/api/check-active-order?ip=${encodeURIComponent(customerIP)}`);
        const result = await response.json();
        
        if (result.success && result.has_active_order) {
            activeOrder = result.order;
            console.log('📋 Active order found:', activeOrder.order_number);
            showActiveOrderSection();
        } else {
            console.log('✅ No active orders');
            hideActiveOrderSection();
        }
    } catch (error) {
        console.error('Failed to check active orders:', error);
        hideActiveOrderSection();
    }
}

// Load order history
async function loadOrderHistory() {
    if (!customerIP) return;
    
    try {
        console.log('📚 Loading order history...');
        
        const response = await fetch(`/api/customer-orders?ip=${encodeURIComponent(customerIP)}`);
        const result = await response.json();
        
        if (result.success && result.orders) {
            orderHistory = result.orders.filter(order => 
                !activeOrder || order.id !== activeOrder.id
            );
            console.log('📋 Order history loaded:', orderHistory.length, 'orders');
            displayOrderHistory();
        }
    } catch (error) {
        console.error('Failed to load order history:', error);
        orderHistory = [];
        displayOrderHistory();
    }
}

// Display cart items
function displayCart() {
    const cartContent = document.getElementById('cartContent');
    const cartSummary = document.getElementById('cartSummary');
    const clearCartBtn = document.getElementById('clearCartBtn');
    
    if (!cart || cart.length === 0) {
        cartContent.innerHTML = `
            <div class="cart-empty">
                <div class="cart-empty-icon">🛒</div>
                <h3>Your cart is empty</h3>
                <p>Add some beautiful fragrances to get started!</p>
                <a href="/" class="btn btn-primary">
                    <span>🌸</span>
                    <span>Browse Fragrances</span>
                </a>
            </div>
        `;
        cartSummary.style.display = 'none';
        clearCartBtn.style.display = 'none';
        return;
    }
    
    // Display cart items
    let cartHTML = '';
    let totalAmount = 0;
    
    cart.forEach((item, index) => {
        const itemTotal = (item.variant.price_cents / 1000) * item.quantity;
        totalAmount += itemTotal;
        
        cartHTML += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.fragranceBrand ? item.fragranceBrand + ' ' : ''}${item.fragranceName}</div>
                    <div class="cart-item-details">${item.variant.size} - ${(item.variant.price_cents / 1000).toFixed(3)} OMR each</div>
                </div>
                <div class="cart-item-controls">
                    <div class="cart-item-price">${itemTotal.toFixed(3)} OMR</div>
                    <div class="cart-qty-controls">
                        <button class="cart-qty-btn ${item.quantity === 1 ? 'trash-btn' : ''}" 
                                onclick="updateCartQuantity(${index}, ${item.quantity - 1})">
                            ${item.quantity === 1 ? '🗑️' : '−'}
                        </button>
                        <input type="number" class="cart-qty-input" value="${item.quantity}" 
                               min="1" max="50" 
                               onchange="updateCartQuantity(${index}, parseInt(this.value))">
                        <button class="cart-qty-btn" onclick="updateCartQuantity(${index}, ${item.quantity + 1})">+</button>
                    </div>
                    <button class="cart-remove-btn" onclick="removeFromCart(${index})">Remove</button>
                </div>
            </div>
        `;
    });
    
    cartContent.innerHTML = cartHTML;
    
    // Update summary
    document.getElementById('subtotalAmount').textContent = `${totalAmount.toFixed(3)} OMR`;
    document.getElementById('totalAmount').textContent = `${totalAmount.toFixed(3)} OMR`;
    
    cartSummary.style.display = 'block';
    clearCartBtn.style.display = 'inline-flex';
}

// Update cart item quantity
function updateCartQuantity(index, newQuantity) {
    if (newQuantity < 1) {
        removeFromCart(index);
        return;
    }
    
    if (newQuantity > 50) {
        showToast('Maximum quantity is 50 per item', 'warning');
        return;
    }
    
    cart[index].quantity = newQuantity;
    saveCartToStorage();
    displayCart();
    showToast('Quantity updated', 'success');
}

// Remove item from cart
function removeFromCart(index) {
    const item = cart[index];
    cart.splice(index, 1);
    saveCartToStorage();
    displayCart();
    showToast(`${item.fragranceName} removed from cart`, 'success');
}

// Clear entire cart
function clearCart() {
    if (cart.length === 0) return;
    
    if (confirm('Are you sure you want to clear your entire cart?')) {
        cart = [];
        saveCartToStorage();
        displayCart();
        showToast('Cart cleared', 'success');
    }
}

// Proceed to checkout
function proceedToCheckout() {
    if (!cart || cart.length === 0) {
        showToast('Your cart is empty', 'warning');
        return;
    }
    
    if (activeOrder) {
        showToast('You already have an active order. Please complete or cancel it first.', 'warning');
        return;
    }
    
    // Check if customer info exists, if not show modal
    if (!customerInfo) {
        showCustomerModal();
    } else {
        showOrderConfirmModal();
    }
}

// Show customer information modal
function showCustomerModal() {
    const modal = document.getElementById('customerInfoModal');
    const form = document.getElementById('customerInfoForm');
    
    // Pre-fill form if customer info exists
    if (customerInfo) {
        document.getElementById('customerName').value = customerInfo.name || '';
        document.getElementById('customerPhone').value = customerInfo.phone || '';
        document.getElementById('customerEmail').value = customerInfo.email || '';
        document.getElementById('customerWilaya').value = customerInfo.wilaya || '';
        document.getElementById('customerCity').value = customerInfo.city || '';
        document.getElementById('customerNotes').value = customerInfo.notes || '';
        
        const deliveryMethod = customerInfo.deliveryMethod || 'home';
        document.querySelector(`input[name="deliveryMethod"][value="${deliveryMethod}"]`).checked = true;
    }
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Close customer modal
function closeCustomerModal() {
    const modal = document.getElementById('customerInfoModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Show order confirmation modal
function showOrderConfirmModal() {
    const modal = document.getElementById('orderConfirmModal');
    const orderSummary = document.getElementById('orderSummary');
    
    let totalAmount = 0;
    let itemsHTML = '';
    
    cart.forEach(item => {
        const itemTotal = (item.variant.price_cents / 1000) * item.quantity;
        totalAmount += itemTotal;
        
        itemsHTML += `
            <div class="order-item">
                <div class="order-item-info">
                    <div class="order-item-name">${item.fragranceBrand ? item.fragranceBrand + ' ' : ''}${item.fragranceName}</div>
                    <div class="order-item-details">${item.variant.size} × ${item.quantity}</div>
                </div>
                <div class="order-item-price">${itemTotal.toFixed(3)} OMR</div>
            </div>
        `;
    });
    
    orderSummary.innerHTML = `
        <div class="order-confirmation-details">
            <h3>📋 Order Summary</h3>
            <div class="order-items">
                ${itemsHTML}
            </div>
            <div class="order-total">
                <strong>Total: ${totalAmount.toFixed(3)} OMR</strong>
            </div>
            
            <h3>👤 Customer Information</h3>
            <div class="customer-summary">
                <p><strong>Name:</strong> ${customerInfo.name}</p>
                <p><strong>Phone:</strong> ${customerInfo.phone}</p>
                ${customerInfo.email ? `<p><strong>Email:</strong> ${customerInfo.email}</p>` : ''}
                <p><strong>Location:</strong> ${customerInfo.wilaya}, ${customerInfo.city}</p>
                <p><strong>Delivery:</strong> ${customerInfo.deliveryMethod === 'home' ? '🏠 Home Delivery' : '📦 Delivery Service'}</p>
                ${customerInfo.notes ? `<p><strong>Notes:</strong> ${customerInfo.notes}</p>` : ''}
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Close order confirmation modal
function closeOrderModal() {
    const modal = document.getElementById('orderConfirmModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Confirm and place order
async function confirmOrder() {
    if (!customerInfo || !cart || cart.length === 0) {
        showToast('Missing order information', 'error');
        return;
    }
    
    // Show loading
    showLoading('Placing your order...');
    
    try {
        // Calculate total amount in fils (1 OMR = 1000 fils)
        const totalAmount = cart.reduce((sum, item) => {
            return sum + (item.variant.price_cents * item.quantity);
        }, 0);
        
        // Prepare order data
        const orderData = {
            customer: {
                firstName: customerInfo.name.split(' ')[0],
                lastName: customerInfo.name.split(' ').slice(1).join(' ') || '',
                phone: customerInfo.phone,
                email: customerInfo.email || null,
                ip: customerIP
            },
            delivery: {
                address: customerInfo.deliveryMethod === 'home' ? 'Home Delivery' : 'Delivery Service',
                city: customerInfo.city,
                region: customerInfo.wilaya,
                notes: customerInfo.notes || null
            },
            items: cart.map(item => ({
                fragranceId: item.fragranceId,
                variantId: item.variant.id,
                fragranceName: item.fragranceName,
                fragranceBrand: item.fragranceBrand || null,
                variantSize: item.variant.size,
                variantPriceCents: item.variant.price_cents,
                quantity: item.quantity,
                isWholeBottle: item.variant.is_whole_bottle || false,
                totalPriceCents: item.variant.price_cents * item.quantity
            })),
            total: totalAmount
        };
        
        console.log('📦 Placing order:', orderData);
        
        // Submit order to backend
        const response = await fetch('/admin/add-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Order placed successfully:', result.order_number);
            
            // Clear cart
            cart = [];
            saveCartToStorage();
            
            // Close modals
            closeOrderModal();
            hideLoading();
            
            // Show success message
            showToast(`Order ${result.order_number} placed successfully! 🎉`, 'success');
            
            // Refresh page to show new order status
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            
        } else {
            throw new Error(result.error || 'Failed to place order');
        }
        
    } catch (error) {
        console.error('❌ Failed to place order:', error);
        hideLoading();
        showToast('Failed to place order: ' + error.message, 'error');
    }
}

// Show active order section
function showActiveOrderSection() {
    if (!activeOrder) return;
    
    const section = document.getElementById('activeOrderSection');
    const cartSection = document.getElementById('cartSection');
    const badge = document.getElementById('orderStatusBadge');
    const details = document.getElementById('orderStatusDetails');
    const cancelBtn = document.getElementById('cancelOrderBtn');
    
    // Update status badge
    badge.className = `status-badge status-${activeOrder.status}`;
    badge.textContent = getStatusText(activeOrder.status);
    
    // Calculate time remaining for cancellation
    const now = new Date();
    const reviewDeadline = activeOrder.review_deadline ? new Date(activeOrder.review_deadline) : null;
    const canCancel = activeOrder.status === 'pending' && !activeOrder.reviewed && reviewDeadline && now < reviewDeadline;
    
    // Update details
    details.innerHTML = `
        <div class="order-info-grid">
            <div class="order-info-item">
                <span class="order-info-label">Order Number</span>
                <span class="order-info-value">${activeOrder.order_number}</span>
            </div>
            <div class="order-info-item">
                <span class="order-info-label">Order Date</span>
                <span class="order-info-value">${formatDate(activeOrder.created_at)}</span>
            </div>
            <div class="order-info-item">
                <span class="order-info-label">Total Amount</span>
                <span class="order-info-value">${(activeOrder.total_amount / 1000).toFixed(3)} OMR</span>
            </div>
            <div class="order-info-item">
                <span class="order-info-label">Items</span>
                <span class="order-info-value">${activeOrder.items ? activeOrder.items.length : 0} item(s)</span>
            </div>
            ${canCancel ? `
                <div class="order-info-item">
                    <span class="order-info-label">Cancellation Deadline</span>
                    <span class="order-info-value">${formatDate(reviewDeadline)}</span>
                </div>
            ` : ''}
        </div>
    `;
    
    // Show/hide cancel button
    if (canCancel) {
        cancelBtn.style.display = 'inline-flex';
        cancelBtn.onclick = () => cancelActiveOrder();
    } else {
        cancelBtn.style.display = 'none';
    }
    
    section.style.display = 'block';
    
    // Hide cart section when there's an active order
    cartSection.style.display = 'none';
}

// Hide active order section
function hideActiveOrderSection() {
    const section = document.getElementById('activeOrderSection');
    const cartSection = document.getElementById('cartSection');
    
    section.style.display = 'none';
    cartSection.style.display = 'block';
}

// Cancel active order
async function cancelActiveOrder() {
    if (!activeOrder || !confirm('Are you sure you want to cancel this order?')) {
        return;
    }
    
    showLoading('Cancelling your order...');
    
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
            console.log('✅ Order cancelled successfully');
            showToast('Order cancelled successfully', 'success');
            
            // Refresh page to update status
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            
        } else {
            throw new Error(result.error || 'Failed to cancel order');
        }
        
    } catch (error) {
        console.error('❌ Failed to cancel order:', error);
        showToast('Failed to cancel order: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Display order history
function displayOrderHistory() {
    const section = document.getElementById('orderHistorySection');
    const content = document.getElementById('orderHistoryContent');
    
    if (!orderHistory || orderHistory.length === 0) {
        content.innerHTML = `
            <div class="order-history-empty">
                <div class="empty-icon">📋</div>
                <h3>No Previous Orders</h3>
                <p>Your order history will appear here after you make your first purchase.</p>
            </div>
        `;
        return;
    }
    
    let historyHTML = '';
    
    orderHistory.forEach(order => {
        const itemCount = order.items ? order.items.length : 0;
        const totalItems = order.items ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
        
        historyHTML += `
            <div class="order-history-item" onclick="showOrderDetails(${order.id})">
                <div class="order-history-header">
                    <div class="order-number">${order.order_number}</div>
                    <div class="status-badge status-${order.status}">${getStatusText(order.status)}</div>
                </div>
                <div class="order-summary-info">
                    <div class="order-info-item">
                        <div class="order-info-label">Date</div>
                        <div class="order-info-value">${formatDate(order.created_at)}</div>
                    </div>
                    <div class="order-info-item">
                        <div class="order-info-label">Items</div>
                        <div class="order-info-value">${totalItems} item(s)</div>
                    </div>
                    <div class="order-info-item">
                        <div class="order-info-label">Total</div>
                        <div class="order-info-value">${(order.total_amount / 1000).toFixed(3)} OMR</div>
                    </div>
                    <div class="order-info-item">
                        <div class="order-info-label">Status</div>
                        <div class="order-info-value">${getStatusText(order.status)}</div>
                    </div>
                </div>
            </div>
        `;
    });
    
    content.innerHTML = historyHTML;
}

// Show order details modal
async function showOrderDetails(orderId) {
    const modal = document.getElementById('orderDetailsModal');
    const content = document.getElementById('orderDetailsContent');
    
    // Find order in history or use active order
    let order = orderHistory.find(o => o.id === orderId);
    if (!order && activeOrder && activeOrder.id === orderId) {
        order = activeOrder;
    }
    
    if (!order) {
        showToast('Order not found', 'error');
        return;
    }
    
    // Build order details HTML
    const itemsHTML = order.items ? order.items.map(item => `
        <div class="order-item-detail">
            <div class="item-info">
                <div class="item-name">${item.fragrance_brand ? item.fragrance_brand + ' ' : ''}${item.fragrance_name}</div>
                <div class="item-variant">${item.variant_size}</div>
            </div>
            <div class="item-quantity">Qty: ${item.quantity}</div>
            <div class="item-price">${(item.total_price_cents / 1000).toFixed(3)} OMR</div>
        </div>
    `).join('') : '<p>No items found</p>';
    
    content.innerHTML = `
        <div class="order-details-content">
            <div class="order-header">
                <h3>Order ${order.order_number}</h3>
                <div class="status-badge status-${order.status}">${getStatusText(order.status)}</div>
            </div>
            
            <div class="order-section">
                <h4>📋 Order Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Order Date:</span>
                        <span class="detail-value">${formatDate(order.created_at)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Total Amount:</span>
                        <span class="detail-value">${(order.total_amount / 1000).toFixed(3)} OMR</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value">${getStatusText(order.status)}</span>
                    </div>
                </div>
            </div>
            
            <div class="order-section">
                <h4>👤 Customer Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${order.customer_first_name} ${order.customer_last_name || ''}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Phone:</span>
                        <span class="detail-value">${order.customer_phone}</span>
                    </div>
                    ${order.customer_email ? `
                        <div class="detail-item">
                            <span class="detail-label">Email:</span>
                            <span class="detail-value">${order.customer_email}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="order-section">
                <h4>🚚 Delivery Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Method:</span>
                        <span class="detail-value">${order.delivery_address}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Location:</span>
                        <span class="detail-value">${order.delivery_region}, ${order.delivery_city}</span>
                    </div>
                    ${order.notes ? `
                        <div class="detail-item">
                            <span class="detail-label">Notes:</span>
                            <span class="detail-value">${order.notes}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="order-section">
                <h4>🌸 Order Items</h4>
                <div class="order-items-detail">
                    ${itemsHTML}
                </div>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Close order details modal
function closeOrderDetailsModal() {
    const modal = document.getElementById('orderDetailsModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Setup event listeners
function setupEventListeners() {
    // Customer info form submission
    const customerForm = document.getElementById('customerInfoForm');
    customerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const info = {
            name: formData.get('customerName'),
            phone: formData.get('customerPhone'),
            email: formData.get('customerEmail'),
            wilaya: formData.get('customerWilaya'),
            city: formData.get('customerCity'),
            deliveryMethod: formData.get('deliveryMethod'),
            notes: formData.get('customerNotes')
        };
        
        // Validate required fields
        if (!info.name || !info.phone || !info.wilaya || !info.city) {
            showToast('Please fill in all required fields', 'warning');
            return;
        }
        
        // Save customer info
        saveCustomerInfo(info);
        
        // Close modal and show order confirmation
        closeCustomerModal();
        showOrderConfirmModal();
    });
    
    // Close modals when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            const modal = e.target;
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
    
    // View order details button for active order
    const viewOrderBtn = document.getElementById('viewOrderBtn');
    if (viewOrderBtn) {
        viewOrderBtn.addEventListener('click', function() {
            if (activeOrder) {
                showOrderDetails(activeOrder.id);
            }
        });
    }
}

// Utility function to get status text with icon
function getStatusText(status) {
    const statusMap = {
        pending: '⏳ Pending',
        reviewed: '👀 Reviewed',
        completed: '✅ Completed',
        cancelled: '❌ Cancelled'
    };
    return statusMap[status] || '❓ Unknown';
}

// Utility function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Show loading overlay
function showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    const text = overlay.querySelector('p');
    if (text) text.textContent = message;
    overlay.style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = 'none';
}

// Show toast notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-header">
            <span class="toast-title">${icons[type]} ${type.charAt(0).toUpperCase() + type.slice(1)}</span>
            <button class="toast-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
        </div>
        <div class="toast-message">${message}</div>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }
    }, 5000);
    
    // Make toast clickable to dismiss
    toast.addEventListener('click', function() {
        this.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => {
            if (this.parentNode) {
                this.remove();
            }
        }, 300);
    });
}

// Global functions for HTML onclick events
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.proceedToCheckout = proceedToCheckout;
window.showCustomerModal = showCustomerModal;
window.closeCustomerModal = closeCustomerModal;
window.showOrderConfirmModal = showOrderConfirmModal;
window.closeOrderModal = closeOrderModal;
window.confirmOrder = confirmOrder;
window.showOrderDetails = showOrderDetails;
window.closeOrderDetailsModal = closeOrderDetailsModal;

console.log('✅ Checkout script fully loaded and ready');