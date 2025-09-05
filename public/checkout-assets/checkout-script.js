// Qotore Checkout JavaScript
let cart = [];
let customerInfo = null;
let currentOrder = null;
let hasActiveOrder = false;
let customerIP = '';

// Initialize checkout page
document.addEventListener('DOMContentLoaded', function() {
    initializeCheckout();
});

async function initializeCheckout() {
    try {
        // Get customer IP
        customerIP = await getCustomerIP();
        
        // Load cart from storage
        loadCartFromStorage();
        
        // Load saved customer info
        loadCustomerInfo();
        
        // Check for active orders
        await checkForActiveOrder();
        
        // Display cart contents
        displayCartItems();
        
        // Show appropriate sidebar content
        showSidebarContent();
        
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Failed to initialize checkout page', 'error');
    }
}

// Get customer IP address
async function getCustomerIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.warn('Could not get IP address:', error);
        return 'unknown';
    }
}

// Load cart from localStorage
function loadCartFromStorage() {
    try {
        const savedCart = localStorage.getItem('qotore_cart');
        cart = savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
        console.error('Error loading cart:', error);
        cart = [];
    }
}

// Save cart to localStorage
function saveCartToStorage() {
    try {
        localStorage.setItem('qotore_cart', JSON.stringify(cart));
    } catch (error) {
        console.error('Error saving cart:', error);
    }
}

// Load customer info from localStorage
function loadCustomerInfo() {
    try {
        const savedInfo = localStorage.getItem('qotore_customer_info');
        customerInfo = savedInfo ? JSON.parse(savedInfo) : null;
    } catch (error) {
        console.error('Error loading customer info:', error);
        customerInfo = null;
    }
}

// Save customer info to localStorage
function saveCustomerInfo(info) {
    try {
        localStorage.setItem('qotore_customer_info', JSON.stringify(info));
        customerInfo = info;
    } catch (error) {
        console.error('Error saving customer info:', error);
    }
}

// Check for active orders
async function checkForActiveOrder() {
    try {
        const response = await fetch('/api/check-order-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ customer_ip: customerIP })
        });

        if (response.ok) {
            const result = await response.json();
            if (result.has_active_order) {
                hasActiveOrder = true;
                currentOrder = result.order_data;
            }
        }
    } catch (error) {
        console.warn('Could not check order status:', error);
    }
}

// Display cart items
function displayCartItems() {
    const cartContent = document.getElementById('cartContent');
    const cartSummary = document.getElementById('cartSummary');
    const clearCartBtn = document.getElementById('clearCartBtn');

    if (cart.length === 0) {
        cartContent.innerHTML = `
            <div class="empty-cart">
                <div class="empty-icon">🛒</div>
                <h3 class="empty-title">Your cart is empty</h3>
                <p class="empty-subtitle">Add some fragrances to get started!</p>
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

    clearCartBtn.style.display = 'flex';
    
    let subtotal = 0;
    let itemsHtml = '<div class="cart-items">';

    cart.forEach((item, index) => {
        const itemTotal = item.variant.price * item.quantity;
        subtotal += itemTotal;

        const canDecrease = item.quantity > 1;
        const isLastItem = item.quantity === 1;

        itemsHtml += `
            <div class="cart-item">
                <div class="item-header">
                    <div class="item-info">
                        <h4>${escapeHtml(item.fragranceName)}</h4>
                        ${item.fragranceBrand ? `<div class="item-brand">${escapeHtml(item.fragranceBrand)}</div>` : ''}
                        <div class="item-variant">${escapeHtml(item.variant.size)}</div>
                    </div>
                    <div class="item-price">${itemTotal.toFixed(3)} OMR</div>
                </div>
                <div class="item-controls">
                    <div class="quantity-controls">
                        <button class="qty-btn ${isLastItem ? 'danger' : ''}" 
                                onclick="updateQuantity(${index}, -1)"
                                title="${isLastItem ? 'Remove item' : 'Decrease quantity'}">
                            ${isLastItem ? '🗑️' : '−'}
                        </button>
                        <input type="number" class="qty-input" value="${item.quantity}" 
                               min="1" max="50" readonly>
                        <button class="qty-btn" onclick="updateQuantity(${index}, 1)" 
                                ${item.quantity >= 50 ? 'disabled' : ''}
                                title="Increase quantity">
                            +
                        </button>
                    </div>
                    <button class="remove-btn" onclick="removeFromCart(${index})" title="Remove from cart">
                        Remove
                    </button>
                </div>
            </div>
        `;
    });

    itemsHtml += '</div>';
    cartContent.innerHTML = itemsHtml;

    // Update summary
    document.getElementById('subtotalAmount').textContent = `${subtotal.toFixed(3)} OMR`;
    document.getElementById('totalAmount').textContent = `${subtotal.toFixed(3)} OMR`;
    cartSummary.style.display = 'block';
}

// Update item quantity
function updateQuantity(index, delta) {
    if (index < 0 || index >= cart.length) return;

    const newQuantity = cart[index].quantity + delta;
    
    if (newQuantity <= 0) {
        removeFromCart(index);
        return;
    }
    
    if (newQuantity > 50) {
        showToast('Maximum quantity is 50', 'warning');
        return;
    }

    cart[index].quantity = newQuantity;
    saveCartToStorage();
    displayCartItems();
    showSidebarContent();
}

// Remove item from cart
function removeFromCart(index) {
    if (index < 0 || index >= cart.length) return;

    const item = cart[index];
    const confirmation = confirm(`Remove ${item.fragranceName} from cart?`);
    
    if (confirmation) {
        cart.splice(index, 1);
        saveCartToStorage();
        displayCartItems();
        showSidebarContent();
        showToast('Item removed from cart', 'success');
    }
}

// Clear entire cart
function clearCart() {
    if (cart.length === 0) return;

    const confirmation = confirm('Are you sure you want to clear your entire cart?');
    
    if (confirmation) {
        cart = [];
        saveCartToStorage();
        displayCartItems();
        showSidebarContent();
        showToast('Cart cleared', 'success');
    }
}

// Show appropriate sidebar content
function showSidebarContent() {
    const sidebar = document.getElementById('sidebarContent');

    if (hasActiveOrder) {
        showOrderStatus(sidebar);
    } else if (cart.length === 0) {
        sidebar.innerHTML = `
            <div class="checkout-form">
                <div class="form-header">
                    <h2 class="form-title">🛒 Ready to Order?</h2>
                    <p>Add some fragrances to your cart first!</p>
                </div>
            </div>
        `;
    } else {
        showCheckoutSection(sidebar);
    }
}

// Show checkout section
function showCheckoutSection(sidebar) {
    let content = `
        <div class="checkout-form">
            <div class="form-header">
                <h2 class="form-title">📝 Ready to Checkout</h2>
            </div>
    `;

    if (customerInfo) {
        content += `
            <div class="customer-info-summary">
                <h3>
                    Your Information
                    <button class="edit-btn" onclick="showCustomerInfoModal()">Edit</button>
                </h3>
                <div class="info-item">
                    <span>Name:</span>
                    <strong>${escapeHtml(customerInfo.name)}</strong>
                </div>
                <div class="info-item">
                    <span>Phone:</span>
                    <strong>${escapeHtml(customerInfo.phone)}</strong>
                </div>
                ${customerInfo.email ? `
                <div class="info-item">
                    <span>Email:</span>
                    <strong>${escapeHtml(customerInfo.email)}</strong>
                </div>
                ` : ''}
                <div class="info-item">
                    <span>Location:</span>
                    <strong>${escapeHtml(customerInfo.wilaya)}${customerInfo.city ? `, ${customerInfo.city}` : ''}</strong>
                </div>
                <div class="info-item">
                    <span>Delivery:</span>
                    <strong>${customerInfo.deliveryMethod === 'home' ? '🏠 Home Delivery' : '📦 Delivery Service'}</strong>
                </div>
            </div>
        `;
    }

    content += `
            <div class="checkout-actions">
                <button class="btn btn-primary btn-full" onclick="proceedToOrder()">
                    <span>🛒</span>
                    <span>${customerInfo ? 'Place Order' : 'Proceed to Checkout'}</span>
                </button>
            </div>
        </div>
    `;

    sidebar.innerHTML = content;
}

// Show order status
function showOrderStatus(sidebar) {
    sidebar.innerHTML = `
        <div class="checkout-form">
            <div class="form-header">
                <h2 class="form-title">📋 Order Status</h2>
                <p>Order #${currentOrder.order_number}</p>
            </div>
            <div class="customer-info-summary">
                <h3>Current Order</h3>
                <div class="info-item">
                    <span>Status:</span>
                    <strong style="color: var(--warning);">${currentOrder.order_status}</strong>
                </div>
                <div class="info-item">
                    <span>Total:</span>
                    <strong>${(currentOrder.total_amount / 1000).toFixed(3)} OMR</strong>
                </div>
                <div class="info-item">
                    <span>Items:</span>
                    <strong>${currentOrder.order_items?.length || 0}</strong>
                </div>
            </div>
            <div class="checkout-actions">
                <a href="/admin/orders-management.html" class="btn btn-primary btn-full">
                    <span>📋</span>
                    <span>View Order Details</span>
                </a>
            </div>
        </div>
    `;
}

// Proceed to order (show customer info modal or order confirmation)
function proceedToOrder() {
    if (!customerInfo) {
        showCustomerInfoModal();
    } else {
        showOrderConfirmationModal();
    }
}

// Show customer info modal
function showCustomerInfoModal() {
    const modal = document.getElementById('customerInfoModal');
    
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
    
    // Focus on first input
    setTimeout(() => {
        document.getElementById('customerName').focus();
    }, 100);
}

// Close customer info modal
function closeCustomerModal() {
    document.getElementById('customerInfoModal').style.display = 'none';
}

// Handle customer info form submission
document.getElementById('customerInfoForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const info = {
        name: formData.get('customerName').trim(),
        phone: formData.get('customerPhone').trim(),
        email: formData.get('customerEmail').trim(),
        wilaya: formData.get('customerWilaya').trim(),
        city: formData.get('customerCity').trim(),
        deliveryMethod: formData.get('deliveryMethod'),
        notes: formData.get('customerNotes').trim()
    };
    
    // Validation
    if (!info.name) {
        showToast('Please enter your full name', 'error');
        return;
    }
    
    if (!info.phone) {
        showToast('Please enter your phone number', 'error');
        return;
    }
    
    // Phone validation (Oman format)
    const phoneRegex = /^(\+968|968|00968)?[0-9]{8}$/;
    if (!phoneRegex.test(info.phone.replace(/\s/g, ''))) {
        showToast('Please enter a valid Oman phone number', 'error');
        return;
    }
    
    // Email validation (if provided)
    if (info.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(info.email)) {
            showToast('Please enter a valid email address', 'error');
            return;
        }
    }
    
    // Save customer info
    saveCustomerInfo(info);
    closeCustomerModal();
    showSidebarContent();
    showToast('Information saved successfully', 'success');
});

// Show order confirmation modal
function showOrderConfirmationModal() {
    const modal = document.getElementById('orderConfirmModal');
    const summaryDiv = document.getElementById('orderSummary');
    
    let total = 0;
    let itemsHtml = '<div style="margin-bottom: 1.5rem;"><h4>Order Summary</h4></div>';
    
    cart.forEach(item => {
        const itemTotal = item.variant.price * item.quantity;
        total += itemTotal;
        
        itemsHtml += `
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border);">
                <div>
                    <strong>${escapeHtml(item.fragranceName)}</strong><br>
                    <small>${escapeHtml(item.variant.size)} × ${item.quantity}</small>
                </div>
                <div style="font-weight: 600;">${itemTotal.toFixed(3)} OMR</div>
            </div>
        `;
    });
    
    itemsHtml += `
        <div style="display: flex; justify-content: space-between; margin-top: 1rem; padding-top: 1rem; border-top: 2px solid var(--primary); font-size: 1.2rem; font-weight: 700; color: var(--primary);">
            <span>Total:</span>
            <span>${total.toFixed(3)} OMR</span>
        </div>
    `;
    
    itemsHtml += `
        <div style="margin-top: 1.5rem; padding: 1rem; background: var(--light); border-radius: 8px;">
            <h5 style="margin-bottom: 0.5rem;">Delivery Information:</h5>
            <p style="margin: 0.25rem 0;"><strong>Name:</strong> ${escapeHtml(customerInfo.name)}</p>
            <p style="margin: 0.25rem 0;"><strong>Phone:</strong> ${escapeHtml(customerInfo.phone)}</p>
            ${customerInfo.email ? `<p style="margin: 0.25rem 0;"><strong>Email:</strong> ${escapeHtml(customerInfo.email)}</p>` : ''}
            <p style="margin: 0.25rem 0;"><strong>Location:</strong> ${escapeHtml(customerInfo.wilaya)}${customerInfo.city ? `, ${customerInfo.city}` : ''}</p>
            <p style="margin: 0.25rem 0;"><strong>Method:</strong> ${customerInfo.deliveryMethod === 'home' ? '🏠 Home Delivery' : '📦 Delivery Service'}</p>
            ${customerInfo.notes ? `<p style="margin: 0.25rem 0;"><strong>Notes:</strong> ${escapeHtml(customerInfo.notes)}</p>` : ''}
        </div>
    `;
    
    summaryDiv.innerHTML = itemsHtml;
    modal.style.display = 'flex';
}

// Close order confirmation modal
function closeOrderModal() {
    document.getElementById('orderConfirmModal').style.display = 'none';
}

// Confirm and place order
async function confirmOrder() {
    if (cart.length === 0 || !customerInfo) {
        showToast('Cannot place order: missing information', 'error');
        return;
    }
    
    closeOrderModal();
    showLoading();
    
    const orderData = {
        customer_ip: customerIP,
        customer_first_name: customerInfo.name,
        customer_last_name: '',
        customer_phone: customerInfo.phone,
        customer_email: customerInfo.email || '',
        delivery_address: customerInfo.deliveryMethod === 'home' ? 'Home Delivery' : 'Delivery Service',
        delivery_city: customerInfo.city || 'Not specified',
        delivery_region: customerInfo.wilaya || 'Not specified',
        notes: customerInfo.notes || '',
        items: cart.map(item => ({
            fragrance_id: item.fragranceId,
            variant_id: item.variant.id,
            quantity: item.quantity
        }))
    };
    
    try {
        const response = await fetch('/api/place-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Send admin notification
            sendAdminNotification(result.data, orderData).catch(error => {
                console.warn('Failed to send admin notification:', error);
            });
            
            // Clear cart and update UI
            cart = [];
            saveCartToStorage();
            hasActiveOrder = true;
            currentOrder = result.data;
            
            displayCartItems();
            showSidebarContent();
            
            showToast('Order placed successfully! 🎉', 'success');
            
            // Redirect to thank you or refresh
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            
        } else {
            throw new Error(result.error || 'Failed to place order');
        }
        
    } catch (error) {
        console.error('Order placement failed:', error);
        showToast(`Failed to place order: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// Send admin notification
async function sendAdminNotification(orderResult, originalOrderData) {
    try {
        const notificationData = {
            order_number: orderResult.order_number,
            total_amount_omr: orderResult.total_amount_omr,
            created_at: orderResult.created_at,
            customer: {
                first_name: originalOrderData.customer_first_name,
                last_name: originalOrderData.customer_last_name,
                phone: originalOrderData.customer_phone,
                email: originalOrderData.customer_email
            },
            delivery: {
                address: originalOrderData.delivery_address,
                city: originalOrderData.delivery_city,
                region: originalOrderData.delivery_region,
                notes: originalOrderData.notes
            },
            items: cart.map(item => ({
                fragrance_name: item.fragranceName,
                fragrance_brand: item.fragranceBrand,
                variant_size: item.variant.size,
                quantity: item.quantity,
                total_price_cents: Math.round(item.variant.price * item.quantity * 1000)
            }))
        };

        await fetch('/api/send-admin-notification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(notificationData)
        });
        
    } catch (error) {
        console.warn('Failed to send admin notification:', error);
    }
}

// Utility functions
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Close modals when clicking outside
document.addEventListener('click', function(e) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
});

// Handle escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const visibleModals = document.querySelectorAll('.modal[style*="flex"]');
        visibleModals.forEach(modal => {
            modal.style.display = 'none';
        });
    }
});