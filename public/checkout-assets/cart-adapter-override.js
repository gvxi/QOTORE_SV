// Cart Adapter Override for Checkout Page
// This prevents cart-adapter.js from throwing errors on the checkout page

console.log('🛒 Cart adapter override loaded for checkout page');

// Override problematic functions from cart-adapter.js
if (window.updateCartButton) {
    window.updateCartButton = function() {
        // Do nothing on checkout page - no cart button to update
        console.log('Cart button update skipped on checkout page');
    };
}

// Provide safe fallbacks for cart adapter functions
window.getCartFromStorage = window.getCartFromStorage || function() {
    try {
        const savedCart = localStorage.getItem('qotore_cart');
        return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
        console.error('Error loading cart from storage:', error);
        return [];
    }
};

window.checkForActiveOrder = window.checkForActiveOrder || async function() {
    return false; // Fallback
};

window.getCustomerIP = window.getCustomerIP || function() {
    return null; // Will be set by checkout script
};

// Prevent showCustomAlert from causing issues
window.showCustomAlert = window.showCustomAlert || function(message) {
    console.log('Alert:', message);
    // Use checkout page's toast system if available
    if (window.showToast) {
        window.showToast(message, 'info');
    } else {
        alert(message);
    }
};

console.log('✅ Cart adapter override ready');