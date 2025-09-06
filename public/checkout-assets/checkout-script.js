// Checkout Page Script - Enhanced with all requested functionality

// Global variables
let cart = [];
let customerInfo = null;
let activeOrder = null;
let previousOrders = [];
let customerIP = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Checkout page loading...');
    
    try {
        // Get customer IP
        await getCustomerIP();
        
        // Load cart from localStorage
        loadCart();
        
        // Load customer info from localStorage
        loadCustomerInfo();
        
        // Check for active order
        await checkActiveOrder();
        
        // Load previous orders
        await loadPreviousOrders();
        
        // Render the page
        renderPage();
        
        console.log('Checkout page loaded successfully');
    } catch (error) {
        console.error('Error initializing checkout page:', error);
        showError('Failed to load checkout page. Please refresh and try again.');
    }
});

// Get customer IP address
async function getCustomerIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        customerIP = data.ip;
        console.log('Customer IP:', customerIP);
    } catch (error) {
        console.error('Error getting IP:', error);
        customerIP = 'unknown';
    }
}

// Load cart from localStorage
function loadCart() {
    try {
        const savedCart = localStorage.getItem('qotore_cart');
        cart = savedCart ? JSON.parse(savedCart) : [];
        
        // Validate cart items
        cart = cart.filter(item => {
            const isValid = (
                item.id &&
                item.fragranceId &&
                item.variant &&
                typeof item.variant.id === 'number' &&
                item.variant.size &&
                typeof item.quantity === 'number' &&
                item.quantity > 0
            );
            if (!isValid) {
                console.warn('Removing invalid cart item:', item);
            }
            return isValid;
        });
        
        // Save cleaned cart
        saveCart();
        console.log('Cart loaded:', cart);
    } catch (error) {
        console.error('Error loading cart:', error);
        cart = [];
        localStorage.removeItem('qotore_cart');
    }
}

// Save cart to localStorage
function saveCart() {
    try {
        localStorage.setItem('qotore_cart', JSON.stringify(cart));
        console.log('Cart saved');
    } catch (error) {
        console.error('Error saving cart:', error);
    }
}

// Load customer info from localStorage
function loadCustomerInfo() {
    try {
        const savedInfo = localStorage.getItem('qotore_customer_info');
        customerInfo = savedInfo ? JSON.parse(savedInfo) : null;
        console.log('Customer info loaded:', customerInfo);
    } catch (error) {
        console.error('Error loading customer info:', error);
        customerInfo = null;
    }
}

// Save customer info to localStorage
function saveCustomerInfo(info) {
    try {
        customerInfo = info;
        localStorage.setItem('qotore_customer_info', JSON.stringify(info));
        console.log('Customer info saved');
    } catch (error) {
        console.error('Error saving customer info:', error);
    }
}

// Check for active order
async function checkActiveOrder() {
    if (!customerIP) return;
    
    try {
        const url = `/functions/api/check-active-order?ip=${encodeURIComponent(customerIP)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success && data.has_active_order) {
            activeOrder = data.order;
            console.log('Active order found:', activeOrder);
        } else {
            activeOrder = null;
            console.log('No active order found');
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
        const url = `/functions/api/customer-orders?ip=${encodeURIComponent(customerIP)}`;
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            previousOrders = data.orders || [];
            console.log('Previous orders loaded:', previousOrders.length);
        } else {
            previousOrders = [];
        }
    } catch (error) {
        console.error('Error loading previous orders:', error);
        previousOrders = [];
    }
}

// Render the entire page
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
                <h3 class="empty-cart-title">Your cart is empty</h3>
                <p class="empty-cart-subtitle">Add some fragrances to get started!</p>
                <a href="/" class="btn btn-primary">Continue Shopping</a>
            </div>
        `;
        cartSummary.style.display = 'none';
        clearCartBtn.style.display = 'none';
        return;
    }
    
    clearCartBtn.style.display = 'block';
    cartSummary.style.display = 'block';
    
    let cartHTML = '';
    let total = 0;
    
    cart.forEach((item, index) => {
        const itemTotal = (item.variant.price_cents / 1000) * item.quantity;
        total += itemTotal;
        
        cartHTML += `
            <div class="cart-item">
                <div class="cart-item-image">
                    ${item.image_path ? 
                        `<img src="${item.image_path}" alt="${item.fragranceName}" onerror="this.parentElement.innerHTML='<div class=\\'no-image\\'>No Image</div>'">`
                        : '<div class="no-image">No Image</div>'
                    }
                </div>
                
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.fragranceName}</div>
                    ${item.fragranceBrand ? `<div class="cart-item-brand">${item.fragranceBrand}</div>` : ''}
                    <div class="cart-item-variant">${item.variant.size} ${item.variant.is_whole_bottle ? '' : `- ${(item.variant.price_cents / 1000).toFixed(3)} OMR each`}</div>
                    
                    <div class="cart-item-controls">
                        <div class="cart-qty-controls">
                            <button class="cart-qty-btn" onclick="updateQuantity(${index}, ${item.quantity - 1})" ${item.quantity <= 1 ? 'disabled' : ''}>
                                ${item.quantity <= 1 ? '🗑️' : '-'}
                            </button>
                            <input type="number" class="cart-qty-input" value="${item.quantity}" min="1" max="50" 
                                   onchange="updateQuantity(${index}, parseInt(this.value) || 1)" readonly>
                            <button class="cart-qty-btn" onclick="updateQuantity(${index}, ${item.quantity + 1})" ${item.quantity >= 50 ? 'disabled' : ''}>+</button>
                        </div>
                        <button class="cart-remove-btn" onclick="removeFromCart(${index})" title="Remove item">🗑️</button>
                    </div>
                </div>
                
                <div class="cart-item-price">
                    ${item.variant.is_whole_bottle ? 'Contact for Price' : `${itemTotal.toFixed(3)} OMR`}
                </div>
            </div>
        `;
    });
    
    cartContent.innerHTML = cartHTML;
    
    // Update summary
    document.getElementById('subtotalAmount').textContent = `${total.toFixed(3)} OMR`;
    document.getElementById('totalAmount').textContent = `${total.toFixed(3)} OMR`;
}

// Update item quantity
function updateQuantity(index, newQuantity) {
    if (index < 0 || index >= cart.length) return;
    
    newQuantity = Math.max(1, Math.min(50, newQuantity));
    
    if (newQuantity === 1 && cart[index].quantity === 1) {
        // Remove item if trying to decrease below 1
        removeFromCart(index);
        return;
    }
    
    cart[index].quantity = newQuantity;
    saveCart();
    renderCart();
}

// Remove item from cart
function removeFromCart(index) {
    if (index < 0 || index >= cart.length) return;
    
    cart.splice(index, 1);
    saveCart();
    renderPage();
}

// Clear entire cart
function clearCart() {
    if (cart.length === 0) return;
    
    if (confirm('Are you sure you want to clear your cart? This action cannot be undone.')) {
        cart = [];
        saveCart();
        renderPage();
        showToast('Cart cleared successfully', 'success');
    }
}

// Render sidebar content
function renderSidebar() {
    const sidebarContent = document.getElementById('sidebarContent');
    
    if (activeOrder) {
        // Show active order status
        sidebarContent.innerHTML = renderActiveOrderStatus();
    } else if (cart.length > 0) {
        // Show checkout form
        sidebarContent.innerHTML = renderCheckoutForm();
    } else {
        // Show empty state
        sidebarContent.innerHTML = `
            <div class="order-status-card">
                <div class="status-header">
                    <h2 class="status-title">🌸 Welcome to Qotore</h2>
                    <p class="status-subtitle">Add fragrances to your cart to checkout</p>
                </div>
            </div>
        `;
    }
    
    // Always show previous orders if any
    if (previousOrders.length > 0) {
        sidebarContent.innerHTML += renderPreviousOrders();
    }
}

// Render active order status
function renderActiveOrderStatus() {
    const order = activeOrder;
    const canCancel = order.can_cancel && order.status === 'pending' && !order.reviewed;
    const timeLeft = order.review_deadline ? getTimeLeft(order.review_deadline) : null;
    
    return `
        <div class="order-status-card">
            <div class="status-header">
                <h2 class="status-title">📋 Current Order</h2>
                <p class="status-subtitle">Order ${order.order_number}</p>
            </div>
            
            <div class="status-content">
                <div class="status-badge status-${order.status.toLowerCase()}">
                    ${getStatusIcon(order.status_display)} ${order.status_display}
                </div>
                
                <div class="order-details">
                    <h4>Order Information</h4>
                    <div class="detail-row">
                        <span class="detail-label">Order Number:</span>
                        <span class="detail-value">${order.order_number}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Total Amount:</span>
                        <span class="detail-value">${(order.total_amount / 1000).toFixed(3)} OMR</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Order Date:</span>
                        <span class="detail-value">${formatDate(order.created_at)}</span>
                    </div>
                    ${timeLeft && canCancel ? `
                        <div class="detail-row">
                            <span class="detail-label">Cancel Deadline:</span>
                            <span class="detail-value" style="color: #dc3545; font-weight: 600;">${timeLeft}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="order-actions">
                    ${canCancel ? `
                        <button class="action-btn btn-cancel-order" onclick="cancelOrder()">
                            <span>❌</span>
                            <span>Cancel Order</span>
                        </button>
                    ` : ''}
                    
                    <a href="https://wa.me/96800000000?text=Hello! I have a question about my order ${order.order_number}" 
                       target="_blank" class="action-btn btn-contact-admin">
                        <span>💬</span>
                        <span>Contact Admin</span>
                    </a>
                </div>
            </div>
        </div>
    `;
}

// Render checkout form
function renderCheckoutForm() {
    const hasWholeBottle = cart.some(item => item.variant.is_whole_bottle);
    const total = cart.reduce((sum, item) => {
        return sum + (item.variant.is_whole_bottle ? 0 : (item.variant.price_cents / 1000) * item.quantity);
    }, 0);
    
    return `
        <div class="checkout-form">
            <div class="form-header">
                <h2 class="form-title">📝 Checkout</h2>
                <p class="form-subtitle">${hasWholeBottle ? 'Contact us for whole bottle pricing' : 'Complete your order'}</p>
            </div>
            
            <div class="form-content">
                ${customerInfo ? renderCustomerInfoDisplay() : ''}
                
                ${hasWholeBottle ? `
                    <div class="order-actions">
                        <a href="https://wa.me/96800000000?text=Hello! I'm interested in ordering whole bottles from my cart" 
                           target="_blank" class="action-btn btn-contact-admin">
                            <span>💬</span>
                            <span>Contact for Whole Bottle Pricing</span>
                        </a>
                    </div>
                ` : `
                    <div class="order-actions">
                        <button class="action-btn btn-place-order" onclick="proceedToCheckout()">
                            <span>🛒</span>
                            <span>Place Order (${total.toFixed(3)} OMR)</span>
                        </button>
                    </div>
                `}
            </div>
        </div>
    `;
}

// Render customer info display
function renderCustomerInfoDisplay() {
    return `
        <div class="customer-info-display">
            <div class="customer-info-row">
                <span class="info-label">Name:</span>
                <span class="info-value">${customerInfo.name}</span>
            </div>
            <div class="customer-info-row">
                <span class="info-label">Phone:</span>
                <span class="info-value">${customerInfo.phone}</span>
            </div>
            ${customerInfo.email ? `
                <div class="customer-info-row">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${customerInfo.email}</span>
                </div>
            ` : ''}
            <div class="customer-info-row">
                <span class="info-label">Location:</span>
                <span class="info-value">${customerInfo.city}, ${customerInfo.wilaya}</span>
            </div>
            <div class="customer-info-row">
                <span class="info-label">Delivery:</span>
                <span class="info-value">${customerInfo.deliveryOption === 'home' ? '🏠 Deliver to Home' : '📦 Use Delivery Service'}</span>
            </div>
            ${customerInfo.notes ? `
                <div class="customer-info-row">
                    <span class="info-label">Notes:</span>
                    <span class="info-value">${customerInfo.notes}</span>
                </div>
            ` : ''}
        </div>
        
        <button class="edit-info-btn" onclick="editCustomerInfo()">
            ✏️ Edit Information
        </button>
    `;
}

// Render previous orders
function renderPreviousOrders() {
    return `
        <div class="previous-orders">
            <div class="previous-orders-header">
                <h3 class="previous-orders-title">📋 Previous Orders</h3>
            </div>
            
            <div class="previous-orders-content">
                ${previousOrders.map(order => `
                    <div class="previous-order">
                        <div class="previous-order-header">
                            <span class="previous-order-number">${order.order_number}</span>
                            <span class="previous-order-date">${formatDate(order.created_at)}</span>
                        </div>
                        <div class="previous-order-footer">
                            <span class="previous-order-total">${(order.total_amount / 1000).toFixed(3)} OMR</span>
                            <span class="previous-order-status status-${order.status.toLowerCase()}">${order.status_display}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Proceed to checkout
function proceedToCheckout() {
    if (cart.length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }
    
    // Check for whole bottles
    const hasWholeBottle = cart.some(item => item.variant.is_whole_bottle);
    if (hasWholeBottle) {
        showToast('Please contact admin for whole bottle pricing', 'info');
        return;
    }
    
    if (!customerInfo) {
        // Show customer info modal
        showCustomerInfoModal();
    } else {
        // Place order directly
        placeOrder();
    }
}

// Show customer info modal
function showCustomerInfoModal() {
    const modal = document.getElementById('customerInfoModal');
    const form = document.getElementById('customerInfoForm');
    
    // Pre-fill form if editing
    if (customerInfo) {
        document.getElementById('customerName').value = customerInfo.name || '';
        document.getElementById('customerPhone').value = customerInfo.phone || '';
        document.getElementById('customerEmail').value = customerInfo.email || '';
        document.getElementById('customerWilaya').value = customerInfo.wilaya || '';
        document.getElementById('customerCity').value = customerInfo.city || '';
        document.getElementById('customerNotes').value = customerInfo.notes || '';
        
        const deliveryOption = document.querySelector(`input[name="deliveryOption"][value="${customerInfo.deliveryOption}"]`);
        if (deliveryOption) deliveryOption.checked = true;
    } else {
        form.reset();
    }
    
    modal.style.display = 'flex';
    
    // Handle form submission
    form.onsubmit = function(e) {
        e.preventDefault();
        saveCustomerInfoFromForm();
    };
}

// Close customer info modal
function closeCustomerModal() {
    document.getElementById('customerInfoModal').style.display = 'none';
}

// Edit customer info
function editCustomerInfo() {
    showCustomerInfoModal();
}

// Save customer info from form
function saveCustomerInfoFromForm() {
    const form = document.getElementById('customerInfoForm');
    const formData = new FormData(form);
    
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
    if (!info.name || !info.phone || !info.wilaya || !info.city || !info.deliveryOption) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    // Validate phone number
    if (!info.phone.match(/^968\d{8}$/)) {
        showToast('Phone number must start with 968 and have 11 digits total', 'error');
        return;
    }
    
    saveCustomerInfo(info);
    closeCustomerModal();
    renderSidebar();
    showToast('Customer information saved successfully', 'success');
}

// Place order
async function placeOrder() {
    if (!customerInfo) {
        showToast('Please fill in your information first', 'error');
        return;
    }
    
    if (cart.length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        // Prepare order data
        const orderData = {
            customer_ip: customerIP,
            customer_first_name: customerInfo.name.split(' ')[0],
            customer_last_name: customerInfo.name.split(' ').slice(1).join(' ') || '',
            customer_phone: customerInfo.phone,
            customer_email: customerInfo.email || null,
            delivery_address: customerInfo.deliveryOption === 'home' ? 'Home Delivery' : 'Delivery Service',
            delivery_city: customerInfo.city,
            delivery_region: customerInfo.wilaya,
            notes: customerInfo.notes || null,
            items: cart.map(item => ({
                fragrance_id: item.fragranceId,
                variant_id: item.variant.id,
                quantity: item.quantity,
                fragrance_name: item.fragranceName,
                fragrance_brand: item.fragranceBrand || null,
                variant_size: item.variant.size,
                variant_price_cents: item.variant.price_cents,
                is_whole_bottle: item.variant.is_whole_bottle || false
            }))
        };
        
        console.log('Placing order:', orderData);
        
        const response = await fetch('/functions/api/place-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Clear cart
            cart = [];
            saveCart();
            
            // Show success message
            showToast('Order placed successfully! You will receive a confirmation shortly.', 'success');
            
            // Refresh page data
            await checkActiveOrder();
            await loadPreviousOrders();
            renderPage();
            
        } else {
            throw new Error(result.error || 'Failed to place order');
        }
        
    } catch (error) {
        console.error('Error placing order:', error);
        showToast(`Failed to place order: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// Cancel order
async function cancelOrder() {
    if (!activeOrder || !activeOrder.can_cancel) {
        showToast('This order cannot be cancelled', 'error');
        return;
    }
    
    if (!confirm(`Are you sure you want to cancel order ${activeOrder.order_number}? This action cannot be undone.`)) {
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch('/functions/api/cancel-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                order_id: activeOrder.id,
                customer_ip: customerIP
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Order cancelled successfully', 'success');
            
            // Refresh page data
            await checkActiveOrder();
            await loadPreviousOrders();
            renderPage();
            
        } else {
            throw new Error(result.error || 'Failed to cancel order');
        }
        
    } catch (error) {
        console.error('Error cancelling order:', error);
        showToast(`Failed to cancel order: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// Utility functions
function getStatusIcon(status) {
    const icons = {
        'Waiting for review': '⏳',
        'Under preparation': '👨‍🍳',
        'Order completed': '✅',
        'Order cancelled': '❌'
    };
    return icons[status] || '📋';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getTimeLeft(deadline) {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate - now;
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
}

function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        animation: slideInRight 0.3s ease;
        max-width: 400px;
        word-wrap: break-word;
    `;
    
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Add animation styles if not already added
    if (!document.querySelector('#toastStyles')) {
        const style = document.createElement('style');
        style.id = 'toastStyles';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
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
}

function showError(message) {
    showToast(message, 'error');
}

// Handle clicks outside modal to close
document.addEventListener('click', function(e) {
    const modal = document.getElementById('customerInfoModal');
    if (e.target === modal) {
        closeCustomerModal();
    }
});

// Handle escape key to close modal
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeCustomerModal();
    }
});

// Auto-refresh order status every 30 seconds
setInterval(async () => {
    if (activeOrder) {
        const oldStatus = activeOrder.status;
        await checkActiveOrder();
        
        if (!activeOrder || (activeOrder && activeOrder.status !== oldStatus)) {
            renderSidebar();
            if (!activeOrder) {
                showToast('Your order status has been updated', 'info');
            }
        }
    }
}, 30000);

// Export functions for debugging
window.checkoutDebug = {
    cart,
    customerInfo,
    activeOrder,
    previousOrders,
    customerIP,
    renderPage,
    checkActiveOrder,
    loadPreviousOrders
};