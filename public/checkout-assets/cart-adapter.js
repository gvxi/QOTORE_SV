// Cart Adapter - Fixes price calculations and API paths for checkout
(function() {
    'use strict';

    // Adapter to normalize cart data structure
    function normalizeCartItem(item) {
        // Ensure variant has price_cents field for calculations
        if (item.variant && typeof item.variant.price_cents === 'undefined') {
            // Convert price to price_cents if needed
            if (typeof item.variant.price === 'number') {
                item.variant.price_cents = Math.round(item.variant.price * 1000);
            } else if (typeof item.price === 'number') {
                item.variant.price_cents = Math.round(item.price * 1000);
            } else {
                console.warn('Cart item missing price information:', item);
                item.variant.price_cents = 0;
            }
        }

        // Ensure price_display exists
        if (item.variant && !item.variant.price_display) {
            if (item.variant.is_whole_bottle) {
                item.variant.price_display = 'Contact for pricing';
            } else {
                const priceInOMR = (item.variant.price_cents || 0) / 1000;
                item.variant.price_display = `${priceInOMR.toFixed(3)} OMR`;
            }
        }

        // Ensure all required fields exist
        if (!item.id) {
            item.id = `${item.fragranceId}-${item.variant.id}`;
        }

        return item;
    }

    // Override localStorage cart loading to normalize data
    const originalSetItem = Storage.prototype.setItem;
    const originalGetItem = Storage.prototype.getItem;

    Storage.prototype.setItem = function(key, value) {
        if (key === 'qotore_cart') {
            try {
                const cart = JSON.parse(value);
                const normalizedCart = cart.map(normalizeCartItem);
                value = JSON.stringify(normalizedCart);
            } catch (error) {
                console.warn('Cart normalization failed during save:', error);
            }
        }
        return originalSetItem.call(this, key, value);
    };

    Storage.prototype.getItem = function(key) {
        const value = originalGetItem.call(this, key);
        if (key === 'qotore_cart' && value) {
            try {
                const cart = JSON.parse(value);
                const normalizedCart = cart.map(normalizeCartItem);
                return JSON.stringify(normalizedCart);
            } catch (error) {
                console.warn('Cart normalization failed during load:', error);
            }
        }
        return value;
    };

    // Fix API paths - replace /functions/api/ with /api/
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        if (typeof url === 'string') {
            // Fix API paths
            url = url.replace('/functions/api/', '/api/');
            
            // Log API calls for debugging
            if (url.includes('/api/')) {
                console.log('API call:', url, options?.method || 'GET');
            }
        }
        return originalFetch(url, options);
    };

    // Price calculation helper functions
    window.calculateItemTotal = function(item) {
        const priceInFils = item.variant?.price_cents || 0;
        const quantity = item.quantity || 1;
        return (priceInFils * quantity) / 1000; // Convert fils to OMR
    };

    window.calculateCartTotal = function(cart) {
        return cart.reduce((total, item) => {
            return total + window.calculateItemTotal(item);
        }, 0);
    };

    // Currency formatting helper
    window.formatPrice = function(amountInOMR) {
        return `${amountInOMR.toFixed(3)} OMR`;
    };

    window.formatPriceFromFils = function(amountInFils) {
        return window.formatPrice((amountInFils || 0) / 1000);
    };

    // Cart validation helper
    window.validateCartItem = function(item) {
        const required = ['id', 'fragranceId', 'fragranceName', 'quantity'];
        const missing = required.filter(field => !item[field]);
        
        if (missing.length > 0) {
            console.warn('Cart item missing required fields:', missing, item);
            return false;
        }

        if (!item.variant || typeof item.variant.id !== 'number') {
            console.warn('Cart item missing valid variant:', item);
            return false;
        }

        if (typeof item.quantity !== 'number' || item.quantity < 1) {
            console.warn('Cart item has invalid quantity:', item);
            return false;
        }

        return true;
    };

    // Enhanced cart cleaning function
    window.cleanCart = function(cart) {
        return cart
            .map(normalizeCartItem)
            .filter(window.validateCartItem);
    };

    // Debug helpers
    window.debugCart = function() {
        const cart = JSON.parse(localStorage.getItem('qotore_cart') || '[]');
        console.log('Current cart:', cart);
        console.log('Cart total:', window.formatPrice(window.calculateCartTotal(cart)));
        cart.forEach((item, index) => {
            console.log(`Item ${index}:`, {
                name: item.fragranceName,
                variant: item.variant.size,
                quantity: item.quantity,
                price_cents: item.variant.price_cents,
                total: window.formatPrice(window.calculateItemTotal(item))
            });
        });
    };

    // Update existing cart on page load
    document.addEventListener('DOMContentLoaded', function() {
        try {
            const savedCart = localStorage.getItem('qotore_cart');
            if (savedCart) {
                const cart = JSON.parse(savedCart);
                const cleanedCart = window.cleanCart(cart);
                
                // Only save back if changes were made
                if (JSON.stringify(cart) !== JSON.stringify(cleanedCart)) {
                    localStorage.setItem('qotore_cart', JSON.stringify(cleanedCart));
                    console.log('Cart updated and cleaned on load');
                }
            }
        } catch (error) {
            console.error('Error cleaning cart on load:', error);
            // Clear corrupted cart
            localStorage.removeItem('qotore_cart');
        }
    });

    console.log('Cart adapter loaded successfully');
})();