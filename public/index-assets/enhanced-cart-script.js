// Enhanced Cart System with IP tracking and order management
let cart = [];
let userOrders = [];
let userIP = null;
let sessionId = null;

// Initialize enhanced cart system
document.addEventListener('DOMContentLoaded', function() {
    console.log('🛒 Enhanced cart system loading...');
    
    // Initialize session
    initializeSession();
    
    // Load cart and orders
    loadCartFromStorage();
    loadUserOrders();
    
    // Display cart contents
    displayCart();
    
    // Load recent orders
    displayRecentOrders();
    
    console.log('✅ Enhanced cart system ready');
});

// Session Management
function initializeSession() {
    // Get or generate session ID
    sessionId = localStorage.getItem('qotore_session_id');
    if (!sessionId) {
        sessionId = generateSessionId();
        localStorage.setItem('qotore_session_id', sessionId);
    }
    
    // Get user IP
    getUserIP();
    
    console.log('📱 Session initialized:', sessionId);
}

function generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function getUserIP() {
    try {
        // Try multiple IP services for reliability
        const ipServices = [
            'https://api.ipify.org?format=json',
            'https://httpbin.org/ip',
            'https://api.myip.com'
        ];
        
        for (const service of ipServices) {
            try {
                const response = await fetch(service);
                const data = await response.json();
                userIP = data.ip || data.origin || data.ip_address;
                if (userIP) {
                    console.log('🌐 User IP detected:', userIP);
                    break;
                }
            } catch (error) {
                console.warn('Failed to get IP from service:', service);
                continue;
            }
        }
        
        if (!userIP) {
            // Fallback to a placeholder
            userIP = 'unknown';
            console.warn('⚠️ Could not detect user IP, using fallback');
        }
    } catch (error) {
        console.error('Error getting user IP:', error);
        userIP = 'unknown';
    }
}

// Cart Management
function loadCartFromStorage() {
    try {
        const savedCart = localStorage.getItem('qotore_cart');
        cart = savedCart ? JSON.parse(savedCart) : [];
        
        // Validate cart items
        cart = cart.filter(item => {
            return item.id && item.fragranceId && item.variant && item.quantity > 0;
        });
        
        console.log('📦 Cart loaded:', cart.length, 'items');
    } catch (error) {
        console.error('Error loading cart:', error);
        cart = [];
    }
}

function saveCart() {
    try {
        localStorage.setItem('qotore_cart', JSON.stringify(cart));
        console.log('💾 Cart saved');
    } catch (error) {
        console.error('Error saving cart:', error);
    }
}

function displayCart() {
    const cartItemsList = document.getElementById('cartItemsList');
    const emptyCart = document.getElementById('emptyCart');
    const cartItemCount = document.getElementById('cartItemCount');
    const cartCount = document.getElementById('cartCount');
    
    // Update cart count in header
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCount) cartCount.textContent = totalItems;
    if (cartItemCount) cartItemCount.textContent = `${totalItems} item${totalItems !== 1 ? 's' : ''}`;
    
    // Show/hide empty state
    if (cart.length === 0) {
        if (emptyCart) emptyCart.style.display = 'block';
        if (cartItemsList) cartItemsList.style.display = 'none';
        updateOrderSummary();
        return;
    }
    
    if (emptyCart) emptyCart.style.display = 'none';
    if (cartItemsList) cartItemsList.style.display = 'block';
    
    // Render cart items
    if (cartItemsList) {
        cartItemsList.innerHTML = cart.map((item, index) => createCartItemHTML(item, index)).join('');
    }
    
    // Update order summary
    updateOrderSummary();
}

function createCartItemHTML(item, index) {
    const itemTotal = (item.price * item.quantity);
    const imageUrl = item.image ? `/api/image/${item.image}?v=${Date.now()}` : null;
    
    return `
        <div class="cart-item" data-item-id="${item.id}">
            <div class="cart-item-image">
                ${imageUrl ? 
                    `<img src="${imageUrl}" alt="${item.name}" loading="lazy" onerror="this.parentElement.innerHTML='<span class=\\'fallback-icon\\'>🌸</span>'">`
                    : '<span class="fallback-icon">🌸</span>'
                }
            </div>
            <div class="cart-item-details">
                <div class="cart-item-name">${escapeHtml(item.name)}</div>
                ${item.brand ? `<div class="cart-item-brand">${escapeHtml(item.brand)}</div>` : ''}
                <div class="cart-item-variant">${escapeHtml(item.variant.size)} • ${item.variant.price_display}</div>
                <div class="cart-item-price">${itemTotal.toFixed(3)} OMR</div>
            </div>
            <div class="cart-item-controls">
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="changeItemQuantity(${index}, -1)" ${item.quantity <= 1 ? 'disabled' : ''}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 13H5v-2h14v2z"/>
                        </svg>
                    </button>
                    <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="50" 
                           onchange="updateItemQuantity(${index}, this.value)" readonly>
                    <button class="quantity-btn" onclick="changeItemQuantity(${index}, 1)" ${item.quantity >= 50 ? 'disabled' : ''}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                        </svg>
                    </button>
                </div>
                <button class="remove-item-btn" onclick="removeFromCart(${index})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                    Remove
                </button>
            </div>
        </div>
    `;
}

function changeItemQuantity(index, delta) {
    if (index < 0 || index >= cart.length) return;
    
    const newQuantity = cart[index].quantity + delta;
    
    if (newQuantity >= 1 && newQuantity <= 50) {
        cart[index].quantity = newQuantity;
        saveCart();
        displayCart();
        showToast(`Quantity updated to ${newQuantity}`, 'info');
    }
}

function updateItemQuantity(index, newQuantity) {
    const quantity = parseInt(newQuantity);
    
    if (isNaN(quantity) || quantity < 1) return;
    if (quantity > 50) {
        showToast('Maximum quantity is 50 per item', 'warning');
        return;
    }
    
    cart[index].quantity = quantity;
    saveCart();
    displayCart();
}

function removeFromCart(index) {
    if (index < 0 || index >= cart.length) return;
    
    const item = cart[index];
    const itemName = item.name;
    
    // Show confirmation
    showConfirmDialog(
        `Remove ${itemName} from cart?`,
        'This item will be removed from your shopping cart.',
        () => {
            cart.splice(index, 1);
            saveCart();
            displayCart();
            showToast(`${itemName} removed from cart`, 'success');
        }
    );
}

function clearCart() {
    if (cart.length === 0) return;
    
    showConfirmDialog(
        'Clear entire cart?',
        'This will remove all items from your cart. This action cannot be undone.',
        () => {
            cart = [];
            saveCart();
            displayCart();
            showToast('Cart cleared', 'success');
        }
    );
}

function updateOrderSummary() {
    const summaryItemCount = document.getElementById('summaryItemCount');
    const subtotalAmount = document.getElementById('subtotalAmount');
    const totalAmount = document.getElementById('totalAmount');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (summaryItemCount) summaryItemCount.textContent = itemCount;
    if (subtotalAmount) subtotalAmount.textContent = `${subtotal.toFixed(3)} OMR`;
    if (totalAmount) totalAmount.textContent = `${subtotal.toFixed(3)} OMR`;
    
    // Enable/disable checkout button
    if (checkoutBtn) {
        checkoutBtn.disabled = cart.length === 0;
        if (cart.length === 0) {
            checkoutBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                Cart is Empty
            `;
        } else {
            checkoutBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                </svg>
                Proceed to Checkout
            `;
        }
    }
}

function proceedToCheckout() {
    if (cart.length === 0) {
        showToast('Your cart is empty', 'warning');
        return;
    }
    
    // Save cart data with session info before checkout
    const checkoutData = {
        cart: cart,
        sessionId: sessionId,
        userIP: userIP,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('qotore_checkout_data', JSON.stringify(checkoutData));
    
    // Redirect to checkout
    window.location.href = 'checkout.html';
}

// Order Management
function loadUserOrders() {
    try {
        const savedOrders = localStorage.getItem('qotore_user_orders');
        userOrders = savedOrders ? JSON.parse(savedOrders) : [];
        
        // Filter orders by session/IP for this user
        userOrders = userOrders.filter(order => 
            order.sessionId === sessionId || order.userIP === userIP
        );
        
        console.log('📋 User orders loaded:', userOrders.length);
    } catch (error) {
        console.error('Error loading user orders:', error);
        userOrders = [];
    }
}

function saveUserOrders() {
    try {
        localStorage.setItem('qotore_user_orders', JSON.stringify(userOrders));
        console.log('💾 User orders saved');
    } catch (error) {
        console.error('Error saving user orders:', error);
    }
}

function addOrderToUserHistory(orderData) {
    const orderRecord = {
        ...orderData,
        sessionId: sessionId,
        userIP: userIP,
        localTimestamp: new Date().toISOString(),
        canCancel: true // Will be updated based on admin review status
    };
    
    userOrders.unshift(orderRecord); // Add to beginning
    
    // Keep only last 10 orders
    if (userOrders.length > 10) {
        userOrders = userOrders.slice(0, 10);
    }
    
    saveUserOrders();
    displayRecentOrders();
    
    console.log('📝 Order added to user history:', orderRecord.orderNumber);
}

function displayRecentOrders() {
    const recentOrdersSection = document.getElementById('recentOrdersSection');
    const recentOrdersList = document.getElementById('recentOrdersList');
    
    if (!recentOrdersList || userOrders.length === 0) {
        if (recentOrdersSection) recentOrdersSection.style.display = 'none';
        return;
    }
    
    recentOrdersSection.style.display = 'block';
    recentOrdersList.innerHTML = userOrders.map(order => createRecentOrderHTML(order)).join('');
}

function createRecentOrderHTML(order) {
    const orderDate = new Date(order.orderDate || order.localTimestamp);
    const isRecent = (Date.now() - orderDate.getTime()) < (60 * 60 * 1000); // Within 1 hour
    const canCancel = order.canCancel && order.status === 'pending' && isRecent;
    
    return `
        <div class="recent-order-item" data-order-id="${order.id}">
            <div class="recent-order-info">
                <h4>Order #${order.orderNumber}</h4>
                <div class="recent-order-details">
                    <div>Total: ${order.total.toFixed(3)} OMR • ${order.itemCount} items</div>
                    <div>Placed: ${orderDate.toLocaleDateString()} ${orderDate.toLocaleTimeString()}</div>
                </div>
            </div>
            <div class="recent-order-status">
                <span class="order-status-badge status-${order.status}">
                    ${order.status.toUpperCase()}
                </span>
                ${canCancel ? `
                    <button class="cancel-order-btn" onclick="showCancelOrderModal('${order.id}', '${order.orderNumber}')" title="Cancel this order">
                        Cancel
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

// Order Cancellation
function showCancelOrderModal(orderId, orderNumber) {
    const order = userOrders.find(o => o.id === orderId);
    if (!order) {
        showToast('Order not found', 'error');
        return;
    }
    
    const modal = document.getElementById('cancelOrderModal');
    const orderNumberSpan = document.getElementById('cancelOrderNumber');
    const orderDetailsDiv = document.getElementById('cancelOrderDetails');
    
    if (orderNumberSpan) orderNumberSpan.textContent = orderNumber;
    
    if (orderDetailsDiv) {
        orderDetailsDiv.innerHTML = `
            <div><strong>Items:</strong> ${order.itemCount}</div>
            <div><strong>Total:</strong> ${order.total.toFixed(3)} OMR</div>
            <div><strong>Status:</strong> ${order.status.toUpperCase()}</div>
            <div><strong>Placed:</strong> ${new Date(order.orderDate || order.localTimestamp).toLocaleString()}</div>
        `;
    }
    
    // Store current order ID for cancellation
    modal.dataset.orderId = orderId;
    modal.style.display = 'flex';
}

function closeCancelOrderModal() {
    const modal = document.getElementById('cancelOrderModal');
    modal.style.display = 'none';
    delete modal.dataset.orderId;
}

async function confirmCancelOrder() {
    const modal = document.getElementById('cancelOrderModal');
    const orderId = modal.dataset.orderId;
    
    if (!orderId) return;
    
    const order = userOrders.find(o => o.id === orderId);
    if (!order) {
        showToast('Order not found', 'error');
        closeCancelOrderModal();
        return;
    }
    
    // Check if order can still be cancelled
    const orderDate = new Date(order.orderDate || order.localTimestamp);
    const isWithinCancelWindow = (Date.now() - orderDate.getTime()) < (60 * 60 * 1000); // 1 hour
    
    if (!isWithinCancelWindow) {
        showToast('Orders can only be cancelled within 1 hour of placement', 'error');
        closeCancelOrderModal();
        return;
    }
    
    if (order.status !== 'pending') {
        showToast('Only pending orders can be cancelled', 'error');
        closeCancelOrderModal();
        return;
    }
    
    try {
        showToast('Cancelling order...', 'info');
        
        // Attempt to cancel via API
        const response = await fetch('/admin/cancel-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                orderId: parseInt(orderId),
                sessionId: sessionId,
                userIP: userIP,
                reason: 'Customer requested cancellation'
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            if (result.success) {
                // Update local order status
                order.status = 'cancelled';
                order.canCancel = false;
                order.cancelledAt = new Date().toISOString();
                saveUserOrders();
                displayRecentOrders();
                
                showToast(`Order #${order.orderNumber} cancelled successfully`, 'success');
                closeCancelOrderModal();
            } else {
                throw new Error(result.error || 'Cancellation failed');
            }
        } else {
            // If API fails, still update locally (fallback)
            console.warn('API cancellation failed, updating locally');
            order.status = 'cancelled';
            order.canCancel = false;
            order.cancelledAt = new Date().toISOString();
            saveUserOrders();
            displayRecentOrders();
            
            showToast('Order cancelled (pending server confirmation)', 'warning');
            closeCancelOrderModal();
        }
        
    } catch (error) {
        console.error('Order cancellation error:', error);
        showToast(`Failed to cancel order: ${error.message}`, 'error');
    }
}

// Enhanced checkout function (called from checkout.html)
window.enhancedPlaceOrder = async function(orderData) {
    try {
        // Add session and IP tracking to order
        const enhancedOrderData = {
            ...orderData,
            sessionId: sessionId,
            userIP: userIP,
            browserInfo: {
                userAgent: navigator.userAgent,
                language: navigator.language,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            timestamp: new Date().toISOString()
        };
        
        console.log('🚀 Placing enhanced order:', enhancedOrderData);
        
        const response = await fetch('/admin/add-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(enhancedOrderData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }
        
        if (result.success) {
            // Add to user order history
            addOrderToUserHistory({
                id: result.data.id,
                orderNumber: result.data.orderNumber,
                total: result.data.total,
                itemCount: enhancedOrderData.items.length,
                status: 'pending',
                orderDate: result.data.created_at,
                customerName: `${enhancedOrderData.customer.firstName} ${enhancedOrderData.customer.lastName}`.trim()
            });
            
            // Clear cart
            cart = [];
            saveCart();
            localStorage.removeItem('qotore_checkout_data');
            
            return result;
        } else {
            throw new Error(result.error || 'Failed to place order');
        }
        
    } catch (error) {
        console.error('Enhanced order placement error:', error);
        throw error;
    }
};

// Utility Functions
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.log('Toast:', message);
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-message">${escapeHtml(message)}</div>
    `;
    
    container.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        if (toast && toast.parentElement) {
            toast.style.animation = 'slideInBottom 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
    
    // Click to dismiss
    toast.addEventListener('click', () => {
        toast.style.animation = 'slideInBottom 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    });
}

function showConfirmDialog(title, message, onConfirm, onCancel = null) {
    const confirmed = confirm(`${title}\n\n${message}`);
    if (confirmed && onConfirm) {
        onConfirm();
    } else if (!confirmed && onCancel) {
        onCancel();
    }
}

// Periodic order status sync (every 5 minutes)
function startOrderStatusSync() {
    setInterval(async () => {
        if (userOrders.length === 0) return;
        
        try {
            // Check for order status updates
            const pendingOrders = userOrders.filter(order => 
                order.status === 'pending' && order.id
            );
            
            if (pendingOrders.length === 0) return;
            
            for (const order of pendingOrders) {
                try {
                    const response = await fetch(`/admin/order-status/${order.id}`);
                    if (response.ok) {
                        const result = await response.json();
                        if (result.success && result.data.status !== order.status) {
                            // Update local order status
                            order.status = result.data.status;
                            order.updated_at = result.data.updated_at;
                            
                            // Update cancellation eligibility
                            if (order.status !== 'pending') {
                                order.canCancel = false;
                            }
                            
                            console.log(`📋 Order ${order.orderNumber} status updated to ${order.status}`);
                        }
                    }
                } catch (error) {
                    console.warn('Failed to sync order status:', order.orderNumber);
                }
            }
            
            saveUserOrders();
            displayRecentOrders();
            
        } catch (error) {
            console.warn('Order sync error:', error);
        }
    }, 5 * 60 * 1000); // Every 5 minutes
}

// Auto-disable cancellation after 1 hour
function startCancellationTimer() {
    setInterval(() => {
        let hasUpdates = false;
        
        userOrders.forEach(order => {
            if (order.canCancel && order.status === 'pending') {
                const orderDate = new Date(order.orderDate || order.localTimestamp);
                const isExpired = (Date.now() - orderDate.getTime()) >= (60 * 60 * 1000); // 1 hour
                
                if (isExpired) {
                    order.canCancel = false;
                    hasUpdates = true;
                    console.log(`⏰ Cancellation window expired for order ${order.orderNumber}`);
                }
            }
        });
        
        if (hasUpdates) {
            saveUserOrders();
            displayRecentOrders();
        }
    }, 60 * 1000); // Check every minute
}

// Initialize timers when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Start order status synchronization
    setTimeout(startOrderStatusSync, 10000); // Start after 10 seconds
    
    // Start cancellation timer
    setTimeout(startCancellationTimer, 1000); // Start after 1 second
});

// Export functions for global access
window.cart = cart;
window.changeItemQuantity = changeItemQuantity;
window.updateItemQuantity = updateItemQuantity;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.proceedToCheckout = proceedToCheckout;
window.showCancelOrderModal = showCancelOrderModal;
window.closeCancelOrderModal = closeCancelOrderModal;
window.confirmCancelOrder = confirmCancelOrder;