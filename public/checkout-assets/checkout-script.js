let currentCart = [];
let customerInfo = null;
let activeOrder = null;
let orderHistory = [];
let isProcessingOrder = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Checkout page initializing...');
    
    loadCartFromStorage();
    loadCustomerInfo();
    checkForActiveOrder();
    loadOrderHistory();
    
    setupEventListeners();
    
    updateCartDisplay();
    updateCheckoutVisibility();
    
    console.log('✅ Checkout page initialized');
});

function setupEventListeners() {
    document.getElementById('clearCartBtn')?.addEventListener('click', clearCart);
    document.getElementById('placeOrderBtn')?.addEventListener('click', handlePlaceOrder);
    
    const form = document.getElementById('checkoutForm');
    if (form) {
        form.addEventListener('input', validateForm);
        form.addEventListener('change', validateForm);
    }
    
    document.getElementById('editInfoBtn')?.addEventListener('click', editCustomerInfo);
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
}

function loadCartFromStorage() {
    try {
        const savedCart = localStorage.getItem('qotore_cart');
        currentCart = savedCart ? JSON.parse(savedCart) : [];
        console.log('📦 Cart loaded:', currentCart.length, 'items');
    } catch (error) {
        console.error('❌ Error loading cart:', error);
        currentCart = [];
    }
}

function saveCartToStorage() {
    try {
        localStorage.setItem('qotore_cart', JSON.stringify(currentCart));
        console.log('💾 Cart saved to storage');
    } catch (error) {
        console.error('❌ Error saving cart:', error);
    }
}

function updateCartDisplay() {
    const cartItems = document.getElementById('cartItems');
    const cartEmpty = document.getElementById('cartEmpty');
    const clearCartBtn = document.getElementById('clearCartBtn');
    const checkoutSection = document.getElementById('checkoutSection');
    
    if (currentCart.length === 0) {
        cartItems.style.display = 'none';
        cartEmpty.style.display = 'block';
        clearCartBtn.style.display = 'none';
        checkoutSection.style.display = 'none';
    } else {
        cartItems.style.display = 'block';
        cartEmpty.style.display = 'none';
        clearCartBtn.style.display = 'flex';
        checkoutSection.style.display = 'block';
        
        renderCartItems();
        updateOrderSummary();
    }
}

function renderCartItems() {
    const cartItems = document.getElementById('cartItems');
    if (!cartItems) return;
    
    cartItems.innerHTML = currentCart.map((item, index) => `
        <div class="cart-item" data-index="${index}">
            <div class="cart-item-content">
                <div class="cart-item-info">
                    <h4>${escapeHtml(item.name)}</h4>
                    <div class="cart-item-brand">${escapeHtml(item.brand || '')}</div>
                    <span class="cart-item-size">${escapeHtml(item.size)}</span>
                </div>
                <div class="cart-item-controls">
                    <div class="cart-item-price">${formatPrice(item.price * item.quantity)}</div>
                    <div class="quantity-controls">
                        ${item.quantity === 1 ? 
                            `<button class="qty-btn remove-item-btn" onclick="removeFromCart(${index})" title="Remove item">🗑️</button>` :
                            `<button class="qty-btn" onclick="decreaseQuantity(${index})" title="Decrease quantity">−</button>`
                        }
                        <input type="number" class="qty-input" value="${item.quantity}" min="1" max="50" 
                               onchange="updateQuantity(${index}, this.value)" readonly>
                        <button class="qty-btn" onclick="increaseQuantity(${index})" 
                                ${item.quantity >= 50 ? 'disabled' : ''} title="Increase quantity">+</button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function updateQuantity(index, newQuantity) {
    const quantity = parseInt(newQuantity);
    if (quantity < 1 || quantity > 50) return;
    
    currentCart[index].quantity = quantity;
    saveCartToStorage();
    updateCartDisplay();
    showToast('Quantity updated', 'success');
}

function increaseQuantity(index) {
    if (currentCart[index].quantity < 50) {
        currentCart[index].quantity++;
        saveCartToStorage();
        updateCartDisplay();
        showToast('Quantity increased', 'success');
    }
}

function decreaseQuantity(index) {
    if (currentCart[index].quantity > 1) {
        currentCart[index].quantity--;
        saveCartToStorage();
        updateCartDisplay();
        showToast('Quantity decreased', 'success');
    }
}

function removeFromCart(index) {
    const item = currentCart[index];
    currentCart.splice(index, 1);
    saveCartToStorage();
    updateCartDisplay();
    showToast(`${item.name} removed from cart`, 'info');
}

function clearCart() {
    if (currentCart.length === 0) return;
    
    if (confirm('Are you sure you want to clear your cart?')) {
        currentCart = [];
        saveCartToStorage();
        updateCartDisplay();
        showToast('Cart cleared', 'info');
    }
}

function updateOrderSummary() {
    const summaryDetails = document.getElementById('orderSummary');
    const subtotalAmount = document.getElementById('subtotalAmount');
    const totalAmount = document.getElementById('totalAmount');
    
    if (!summaryDetails) return;
    
    const subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    summaryDetails.innerHTML = currentCart.map(item => `
        <div class="summary-item">
            <div class="summary-item-info">
                <div class="summary-item-name">${escapeHtml(item.name)}</div>
                <div class="summary-item-details">${escapeHtml(item.size)} × ${item.quantity}</div>
            </div>
            <div class="summary-item-price">${formatPrice(item.price * item.quantity)}</div>
        </div>
    `).join('');
    
    if (subtotalAmount) subtotalAmount.textContent = formatPrice(subtotal);
    if (totalAmount) totalAmount.textContent = formatPrice(subtotal);
}

function loadCustomerInfo() {
    try {
        const saved = localStorage.getItem('qotore_customer_info');
        if (saved) {
            customerInfo = JSON.parse(saved);
            console.log('👤 Customer info loaded');
            
            if (isReturningCustomer()) {
                showSavedInfoNotice();
            }
        }
    } catch (error) {
        console.error('❌ Error loading customer info:', error);
        customerInfo = null;
    }
}

function saveCustomerInfo(info) {
    try {
        customerInfo = { ...info, lastUsed: Date.now() };
        localStorage.setItem('qotore_customer_info', JSON.stringify(customerInfo));
        console.log('💾 Customer info saved');
    } catch (error) {
        console.error('❌ Error saving customer info:', error);
    }
}

function isReturningCustomer() {
    return customerInfo && customerInfo.name && customerInfo.phone;
}

function showSavedInfoNotice() {
    const notice = document.getElementById('savedInfoNotice');
    if (notice && isReturningCustomer()) {
        notice.style.display = 'block';
        fillFormWithSavedInfo();
    }
}

function fillFormWithSavedInfo() {
    if (!customerInfo) return;
    
    const form = document.getElementById('checkoutForm');
    if (!form) return;
    
    setFieldValue('customerName', customerInfo.name);
    setFieldValue('customerPhone', customerInfo.phone);
    setFieldValue('customerEmail', customerInfo.email);
    setFieldValue('wilaya', customerInfo.wilaya);
    setFieldValue('city', customerInfo.city);
    setFieldValue('address', customerInfo.address);
    setFieldValue('notes', customerInfo.notes);
    
    if (customerInfo.deliveryType) {
        const deliveryRadio = form.querySelector(`input[name="deliveryType"][value="${customerInfo.deliveryType}"]`);
        if (deliveryRadio) deliveryRadio.checked = true;
    }
    
    toggleFormEditing(false);
}

function setFieldValue(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (field && value) {
        field.value = value;
    }
}

function editCustomerInfo() {
    toggleFormEditing(true);
    document.getElementById('savedInfoNotice').style.display = 'none';
    showToast('You can now edit your information', 'info');
}

function toggleFormEditing(enabled) {
    const form = document.getElementById('checkoutForm');
    if (!form) return;
    
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.disabled = !enabled;
    });
}

async function checkForActiveOrder() {
    try {
        const customerIdentifier = getCustomerIdentifier();
        if (!customerIdentifier) return;
        
        const response = await fetch('/functions/admin/orders', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const orders = await response.json();
            
            const active = orders.find(order => 
                order.status === 'pending' && 
                (order.customer_phone === customerIdentifier)
            );
            
            if (active) {
                activeOrder = active;
                showActiveOrder();
            }
        }
    } catch (error) {
        console.error('❌ Error checking for active order:', error);
    }
}

function showActiveOrder() {
    if (!activeOrder) return;
    
    const section = document.getElementById('activeOrderSection');
    const content = document.getElementById('activeOrderContent');
    
    if (!section || !content) return;
    
    section.style.display = 'block';
    
    const orderDate = new Date(activeOrder.created_at);
    const canCancel = (Date.now() - orderDate.getTime()) < (60 * 60 * 1000);
    
    content.innerHTML = `
        <div class="active-order-details">
            <div class="order-info-grid">
                <div class="order-info-item">
                    <div class="order-info-label">Order Number</div>
                    <div class="order-info-value">${activeOrder.order_number || `ORD-${String(activeOrder.id).padStart(5, '0')}`}</div>
                </div>
                <div class="order-info-item">
                    <div class="order-info-label">Total Amount</div>
                    <div class="order-info-value">${formatPrice(activeOrder.total_amount / 1000)}</div>
                </div>
                <div class="order-info-item">
                    <div class="order-info-label">Order Date</div>
                    <div class="order-info-value">${orderDate.toLocaleDateString()} ${orderDate.toLocaleTimeString()}</div>
                </div>
                <div class="order-info-item">
                    <div class="order-info-label">Status</div>
                    <div class="order-info-value">${activeOrder.status}</div>
                </div>
            </div>
            ${canCancel ? `
                <button class="cancel-order-btn" onclick="cancelActiveOrder()">
                    Cancel Order (${Math.ceil((3600000 - (Date.now() - orderDate.getTime())) / 60000)} min left)
                </button>
            ` : `
                <p style="color: #dc3545; font-weight: 600; margin-top: 1rem;">
                    ⚠️ Cancellation period expired (1 hour limit)
                </p>
            `}
        </div>
    `;
    
    document.getElementById('cartSection').style.display = 'none';
    document.getElementById('checkoutSection').style.display = 'none';
}

async function cancelActiveOrder() {
    if (!activeOrder) return;
    
    if (!confirm('Are you sure you want to cancel this order?')) return;
    
    try {
        showLoading(true);
        
        const response = await fetch('/functions/admin/orders', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ orderId: activeOrder.id })
        });
        
        if (response.ok) {
            activeOrder = null;
            document.getElementById('activeOrderSection').style.display = 'none';
            document.getElementById('cartSection').style.display = 'block';
            updateCheckoutVisibility();
            showToast('Order cancelled successfully', 'success');
        } else {
            throw new Error('Failed to cancel order');
        }
    } catch (error) {
        console.error('❌ Error cancelling order:', error);
        showToast('Failed to cancel order. Please contact support.', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadOrderHistory() {
    try {
        const customerIdentifier = getCustomerIdentifier();
        if (!customerIdentifier) return;
        
        const response = await fetch('/functions/admin/orders', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const allOrders = await response.json();
            
            orderHistory = allOrders.filter(order => 
                (order.customer_phone === customerIdentifier) &&
                !(order.status === 'pending' && order.id === activeOrder?.id)
            ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            displayOrderHistory();
        }
    } catch (error) {
        console.error('❌ Error loading order history:', error);
    }
}

function displayOrderHistory() {
    const content = document.getElementById('orderHistoryContent');
    if (!content) return;
    
    if (orderHistory.length === 0) {
        content.innerHTML = `
            <div class="no-history">
                <div class="no-history-icon">📦</div>
                <p>No previous orders found</p>
            </div>
        `;
        return;
    }
    
    content.innerHTML = orderHistory.map(order => {
        const orderDate = new Date(order.created_at);
        const items = order.items || [];
        
        return `
            <div class="history-order">
                <div class="history-order-header">
                    <div class="history-order-info">
                        <h4>${order.order_number || `ORD-${String(order.id).padStart(5, '0')}`}</h4>
                        <div class="history-order-date">${orderDate.toLocaleDateString()} ${orderDate.toLocaleTimeString()}</div>
                    </div>
                    <div class="history-order-status status-${order.status}">${order.status}</div>
                    <div class="history-order-total">${formatPrice((order.total_amount || 0) / 1000)}</div>
                </div>
                <div class="history-order-items">
                    ${items.map(item => `
                        <div class="history-item">
                            <div class="history-item-name">${escapeHtml(item.fragrance_name || item.name || 'Unknown Item')}</div>
                            <div class="history-item-details">
                                ${escapeHtml(item.variant_size || item.size || 'Unknown Size')} × ${item.quantity || 1}
                                ${item.fragrance_brand || item.brand ? ` - ${escapeHtml(item.fragrance_brand || item.brand)}` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function validateForm() {
    const form = document.getElementById('checkoutForm');
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    
    if (!form || !placeOrderBtn) return;
    
    const requiredFields = [
        'customerName',
        'customerPhone', 
        'wilaya',
        'city',
        'address'
    ];
    
    const isValid = requiredFields.every(fieldId => {
        const field = document.getElementById(fieldId);
        return field && field.value.trim() !== '';
    });
    
    const deliveryType = form.querySelector('input[name="deliveryType"]:checked');
    const hasDeliveryType = !!deliveryType;
    
    placeOrderBtn.disabled = !isValid || !hasDeliveryType || currentCart.length === 0 || isProcessingOrder;
}

function updateCheckoutVisibility() {
    const checkoutSection = document.getElementById('checkoutSection');
    if (!checkoutSection) return;
    
    const shouldShow = currentCart.length > 0 && !activeOrder;
    checkoutSection.style.display = shouldShow ? 'block' : 'none';
    
    if (shouldShow) {
        validateForm();
    }
}

async function handlePlaceOrder() {
    if (isProcessingOrder || currentCart.length === 0) return;
    
    const form = document.getElementById('checkoutForm');
    if (!form) return;
    
    const formData = new FormData(form);
    const customerData = Object.fromEntries(formData.entries());
    
    const requiredFields = ['customerName', 'customerPhone', 'wilaya', 'city', 'address', 'deliveryType'];
    const missingFields = requiredFields.filter(field => !customerData[field] || customerData[field].trim() === '');
    
    if (missingFields.length > 0) {
        showToast(`Please fill in all required fields: ${missingFields.join(', ')}`, 'error');
        return;
    }
    
    await checkForActiveOrder();
    if (activeOrder) {
        showToast('You already have an active order. Please complete or cancel it first.', 'warning');
        return;
    }
    
    try {
        isProcessingOrder = true;
        showLoading(true);
        validateForm();
        
        const orderData = {
            customer: {
                firstName: customerData.customerName.trim(),
                lastName: '',
                phone: customerData.customerPhone.trim(),
                email: customerData.customerEmail?.trim() || ''
            },
            delivery: {
                address: customerData.address.trim(),
                city: customerData.city.trim(),
                region: customerData.wilaya,
                type: customerData.deliveryType
            },
            items: currentCart.map(item => ({
                fragrance_id: item.fragrance_id || null,
                variant_id: item.variant_id || null,
                name: item.name,
                brand: item.brand || '',
                size: item.size,
                price: item.price,
                quantity: item.quantity,
                is_whole_bottle: item.is_whole_bottle || false
            })),
            total: currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            notes: customerData.notes?.trim() || ''
        };
        
        console.log('📤 Submitting order:', orderData);
        
        const response = await fetch('/functions/admin/add-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            console.log('✅ Order placed successfully:', result);
            
            saveCustomerInfo({
                name: customerData.customerName,
                phone: customerData.customerPhone,
                email: customerData.customerEmail || '',
                wilaya: customerData.wilaya,
                city: customerData.city,
                address: customerData.address,
                deliveryType: customerData.deliveryType,
                notes: customerData.notes || ''
            });
            
            currentCart = [];
            saveCartToStorage();
            
            showToast('Order placed successfully! 🎉', 'success');
            
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            
        } else {
            throw new Error(result.error || 'Failed to place order');
        }
        
    } catch (error) {
        console.error('❌ Error placing order:', error);
        showToast('Failed to place order. Please try again.', 'error');
    } finally {
        isProcessingOrder = false;
        showLoading(false);
        validateForm();
    }
}

function showCustomerInfoModal() {
    if (!isReturningCustomer()) return;
    
    const modal = document.getElementById('customerInfoModal');
    const savedInfo = document.getElementById('savedCustomerInfo');
    
    if (!modal || !savedInfo) return;
    
    savedInfo.innerHTML = `
        <div class="customer-info-row">
            <span class="customer-info-label">Name:</span>
            <span class="customer-info-value">${escapeHtml(customerInfo.name)}</span>
        </div>
        <div class="customer-info-row">
            <span class="customer-info-label">Phone:</span>
            <span class="customer-info-value">${escapeHtml(customerInfo.phone)}</span>
        </div>
        ${customerInfo.email ? `
            <div class="customer-info-row">
                <span class="customer-info-label">Email:</span>
                <span class="customer-info-value">${escapeHtml(customerInfo.email)}</span>
            </div>
        ` : ''}
        <div class="customer-info-row">
            <span class="customer-info-label">Address:</span>
            <span class="customer-info-value">${escapeHtml(customerInfo.address || 'Not provided')}</span>
        </div>
    `;
    
    modal.style.display = 'block';
}

function closeCustomerInfoModal() {
    const modal = document.getElementById('customerInfoModal');
    if (modal) modal.style.display = 'none';
}

function useSavedInfo() {
    fillFormWithSavedInfo();
    showSavedInfoNotice();
    closeCustomerInfoModal();
    showToast('Using saved customer information', 'info');
}

function useNewInfo() {
    const form = document.getElementById('checkoutForm');
    if (form) form.reset();
    
    document.getElementById('savedInfoNotice').style.display = 'none';
    
    toggleFormEditing(true);
    
    closeCustomerInfoModal();
    showToast('Please enter your information', 'info');
}

function getCustomerIdentifier() {
    if (customerInfo && customerInfo.phone) {
        return customerInfo.phone;
    }
    
    const phoneField = document.getElementById('customerPhone');
    if (phoneField && phoneField.value.trim()) {
        return phoneField.value.trim();
    }
    
    return null;
}

function formatPrice(price) {
    return `${Number(price).toFixed(3)} OMR`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span>${getToastIcon(type)}</span>
            <span>${escapeHtml(message)}</span>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'toastSlideOut 0.3s ease forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }
    }, 5000);
}

function getToastIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    return icons[type] || icons.info;
}

function handleStorageChange(e) {
    if (e.key === 'qotore_cart') {
        loadCartFromStorage();
        updateCartDisplay();
    } else if (e.key === 'qotore_customer_info') {
        loadCustomerInfo();
    }
}

function handleBeforeUnload(e) {
    if (isProcessingOrder) {
        e.preventDefault();
        e.returnValue = 'Your order is being processed. Are you sure you want to leave?';
        return e.returnValue;
    }
}

window.updateQuantity = updateQuantity;
window.increaseQuantity = increaseQuantity;
window.decreaseQuantity = decreaseQuantity;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.handlePlaceOrder = handlePlaceOrder;
window.editCustomerInfo = editCustomerInfo;
window.cancelActiveOrder = cancelActiveOrder;
window.closeCustomerInfoModal = closeCustomerInfoModal;
window.useSavedInfo = useSavedInfo;
window.useNewInfo = useNewInfo;

const style = document.createElement('style');
style.textContent = `
    @keyframes toastSlideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);

console.log('🎉 Checkout script loaded successfully');