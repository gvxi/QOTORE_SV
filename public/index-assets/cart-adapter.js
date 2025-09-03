// Global variables for order checking
let customerIP = null;
let hasActiveOrder = false;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeCartAdapter();
});

async function initializeCartAdapter() {
    try {
        // Get customer IP first
        await getCustomerIP();
        
        // Check for existing orders
        await checkForActiveOrder();
        
        // Update cart button behavior
        updateCartButton();
        
        console.log('🛒 Cart adapter initialized');
    } catch (error) {
        console.warn('Cart adapter initialization failed:', error);
        // Continue with normal cart behavior if adapter fails
    }
}

async function getCustomerIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        customerIP = data.ip;
        console.log('Customer IP detected:', customerIP);
    } catch (error) {
        console.warn('Could not detect IP address:', error);
        customerIP = 'unknown';
    }
}

async function checkForActiveOrder() {
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
                hasActiveOrder = true;
                console.log('Active order found:', result.data.order_number);
                
                // Show notification about existing order
                showExistingOrderNotification(result.data);
            } else {
                hasActiveOrder = false;
                console.log('No active order found');
            }
        }
    } catch (error) {
        console.warn('Error checking for active order:', error);
        hasActiveOrder = false;
    }
}

function updateCartButton() {
    const cartButton = document.querySelector('button[onclick*="openCart"]') || 
                      document.querySelector('.nav-btn[onclick*="openCart"]');
    
    if (!cartButton) {
        console.warn('Cart button not found');
        return;
    }

    if (hasActiveOrder) {
        // Update button to show "View Order" instead of cart
        cartButton.innerHTML = `
            <span>📋</span>
            <span>View Order</span>
        `;
        cartButton.title = 'View your current order';
        
        // Replace onclick with redirect to checkout
        cartButton.onclick = function(e) {
            e.preventDefault();
            window.location.href = '/checkout.html';
        };
        
        // Add visual indicator
        cartButton.style.background = 'linear-gradient(135deg, #17a2b8 0%, #1a73e8 100%)';
        cartButton.style.color = 'white';
        
    } else {
        // Keep normal cart behavior but redirect to checkout
        const originalOnClick = cartButton.onclick;
        
        cartButton.onclick = function(e) {
            e.preventDefault();
            
            // Check if cart has items
            const cart = getCartFromStorage();
            
            if (cart.length === 0) {
                // Show empty cart message
                showCustomAlert('Your cart is empty. Add some fragrances first! 🌸');
                return;
            } else {
                // Redirect to checkout page instead of opening modal
                window.location.href = '/checkout.html';
            }
        };
    }
}

function showExistingOrderNotification(orderData) {
    // Create a subtle notification banner
    const notification = document.createElement('div');
    notification.id = 'existingOrderNotification';
    notification.style.cssText = `
        position: fixed;
        top: 70px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #17a2b8 0%, #1a73e8 100%);
        color: white;
        padding: 1rem 2rem;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        font-weight: 600;
        text-align: center;
        animation: slideDown 0.3s ease;
        cursor: pointer;
        max-width: 90%;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
            <span>📋</span>
            <span>You have an active order: ${orderData.order_number}</span>
            <span style="font-size: 0.875rem; opacity: 0.8;">• Click to view</span>
        </div>
    `;
    
    // Add click handler to redirect to checkout
    notification.addEventListener('click', () => {
        window.location.href = '/checkout.html';
    });
    
    // Add CSS animation
    if (!document.querySelector('#orderNotificationStyles')) {
        const style = document.createElement('style');
        style.id = 'orderNotificationStyles';
        style.textContent = `
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        if (notification && notification.parentNode) {
            notification.style.animation = 'slideUp 0.3s ease forwards';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }, 10000);
}

function getCartFromStorage() {
    try {
        const savedCart = localStorage.getItem('qotore_cart');
        return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
        console.error('Error loading cart from storage:', error);
        return [];
    }
}

// Override the original openCart function if it exists
function openCart() {
    if (hasActiveOrder) {
        window.location.href = '/checkout.html';
        return;
    }
    
    const cart = getCartFromStorage();
    if (cart.length === 0) {
        showCustomAlert('Your cart is empty. Add some fragrances first! 🌸');
        return;
    }
    
    // Redirect to checkout instead of opening modal
    window.location.href = '/checkout.html';
}

// Override the original proceedToCheckout function if it exists
function proceedToCheckout() {
    window.location.href = '/checkout.html';
}

// Modify the addToCart function to check for active orders
const originalAddToCart = window.addToCart;
if (originalAddToCart) {
    window.addToCart = async function() {
        // Check if user has active order before adding to cart
        if (hasActiveOrder) {
            showCustomAlert('You already have an active order. Please complete or cancel it before placing a new order.');
            return;
        }
        
        // Call original function
        return originalAddToCart.apply(this, arguments);
    };
}

// Periodically check for order status updates (every 30 seconds)
setInterval(async () => {
    if (hasActiveOrder) {
        await checkForActiveOrder();
        // If order is no longer active, refresh the page to update UI
        if (!hasActiveOrder) {
            console.log('Order status changed, refreshing page...');
            window.location.reload();
        }
    }
}, 30000);

// Export functions for use by other scripts
window.checkForActiveOrder = checkForActiveOrder;
window.hasActiveOrder = () => hasActiveOrder;
window.getCustomerIP = () => customerIP;