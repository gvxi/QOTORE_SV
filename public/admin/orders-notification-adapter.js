// ===================================
// FIXED ADMIN ORDERS NOTIFICATION ADAPTER
// Works with existing notification toggle - NO duplicate UI elements
// ===================================

// Global variables for notification management
let notificationEnabled = false;
let lastKnownOrderCount = 0;
let notificationCheckInterval = null;
let isPageVisible = true;

// Initialize notification system when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📬 Initializing notification system (no duplicate UI)');
    
    // Wait for page to fully load and connect to existing toggle
    setTimeout(() => {
        // Initialize PWA service worker
        initializeServiceWorker();
        
        // Set up page visibility tracking
        setupPageVisibilityTracking();
        
        // Connect to existing notification toggle (don't create new one)
        connectToExistingToggle();
        
        // Load notification preferences
        loadNotificationPreferences();
        
        console.log('✅ Notification adapter initialized (using existing toggle)');
    }, 2000);
});

// ===================================
// PWA SERVICE WORKER INITIALIZATION
// ===================================

async function initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/admin/sw.js');
            console.log('📱 Service Worker registered');
            await requestNotificationPermission();
        } catch (error) {
            console.warn('Service Worker registration failed:', error);
        }
    }
}

async function requestNotificationPermission() {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        console.log('🔔 Notification permission:', permission);
        return permission === 'granted';
    }
    return false;
}

// ===================================
// CONNECT TO EXISTING TOGGLE (NO NEW UI)
// ===================================

function connectToExistingToggle() {
    // Find the existing notification toggle in the page
    const existingToggle = document.getElementById('notificationToggle');
    if (!existingToggle) {
        console.warn('⚠️ Existing notification toggle not found');
        return;
    }
    
    console.log('🔌 Connected to existing notification toggle');
    
    // Add event listener to existing toggle
    existingToggle.addEventListener('change', function(e) {
        const enabled = e.target.checked;
        toggleNotifications(enabled);
    });
    
    // Update the status display function to work with existing UI
    updateNotificationStatusDisplay();
}

// ===================================
// NOTIFICATION MANAGEMENT
// ===================================

function toggleNotifications(enabled) {
    notificationEnabled = enabled;
    localStorage.setItem('admin_notifications_enabled', enabled.toString());
    
    // Update existing status display
    updateNotificationStatusDisplay();
    
    if (enabled) {
        requestNotificationPermission();
        startPeriodicOrderChecking();
        console.log('🔔 Order notifications enabled');
        showSimpleToast('Order notifications enabled', 'success');
    } else {
        stopPeriodicOrderChecking();
        console.log('🔕 Order notifications disabled');
        showSimpleToast('Order notifications disabled', 'info');
    }
}

function updateNotificationStatusDisplay() {
    // Update the existing notification status section
    const statusSection = document.getElementById('notificationStatus');
    const toggle = document.getElementById('notificationToggle');
    
    if (statusSection && toggle) {
        if (toggle.checked && notificationEnabled) {
            statusSection.style.display = 'flex';
            statusSection.innerHTML = `
                <div class="status-icon">✅</div>
                <div class="status-text">Notifications are active</div>
            `;
        } else {
            statusSection.style.display = 'none';
        }
    }
}

function loadNotificationPreferences() {
    const saved = localStorage.getItem('admin_notifications_enabled');
    const enabled = saved === 'true';
    
    const toggle = document.getElementById('notificationToggle');
    if (toggle) {
        toggle.checked = enabled;
        toggleNotifications(enabled);
    }
}

// ===================================
// PAGE VISIBILITY TRACKING
// ===================================

function setupPageVisibilityTracking() {
    document.addEventListener('visibilitychange', function() {
        isPageVisible = !document.hidden;
        console.log('👁️ Page visibility changed:', isPageVisible ? 'visible' : 'hidden');
        
        if (isPageVisible && notificationEnabled) {
            // Check for new orders when page becomes visible
            setTimeout(checkForNewOrders, 1000);
        }
    });
}

// ===================================
// NEW ORDER DETECTION
// ===================================

function startPeriodicOrderChecking() {
    if (notificationCheckInterval) {
        clearInterval(notificationCheckInterval);
    }
    
    // Check every 30 seconds
    notificationCheckInterval = setInterval(async () => {
        if (notificationEnabled) {
            await checkForNewOrders();
        }
    }, 30000);
    
    console.log('⏰ Started periodic order checking (every 30 seconds)');
}

function stopPeriodicOrderChecking() {
    if (notificationCheckInterval) {
        clearInterval(notificationCheckInterval);
        notificationCheckInterval = null;
    }
    console.log('⏰ Stopped periodic order checking');
}

async function checkForNewOrders() {
    if (!notificationEnabled) return;
    
    try {
        const response = await fetch('/admin/orders', {
            method: 'GET',
            credentials: 'include',
            headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                notificationEnabled = false;
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
            const orders = result.data;
            const currentOrderCount = orders.length;
            
            // Initialize on first run
            if (lastKnownOrderCount === 0) {
                lastKnownOrderCount = currentOrderCount;
                return;
            }
            
            // Check for new orders
            if (currentOrderCount > lastKnownOrderCount) {
                const newOrdersCount = currentOrderCount - lastKnownOrderCount;
                console.log(`🆕 Found ${newOrdersCount} new order(s)!`);
                
                // Get newest orders
                const newestOrders = orders
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, newOrdersCount);
                
                // Send notifications for each new order
                for (const order of newestOrders) {
                    await sendNewOrderNotification(order);
                }
                
                // Refresh the main orders data if function exists
                if (typeof window.loadOrders === 'function') {
                    setTimeout(() => window.loadOrders(), 1000);
                }
                
                lastKnownOrderCount = currentOrderCount;
            }
        }
        
    } catch (error) {
        console.warn('Failed to check for new orders:', error);
    }
}

async function sendNewOrderNotification(order) {
    const orderTotal = (order.total_amount / 1000).toFixed(3);
    const customerName = `${order.customer_first_name} ${order.customer_last_name || ''}`.trim();
    const orderNumber = order.order_number || `ORD-${String(order.id).padStart(5, '0')}`;
    
    const title = '🛒 New Order Received!';
    const message = `Order ${orderNumber} from ${customerName} - ${orderTotal} OMR`;
    
    console.log('📬 Sending notification:', { title, message });
    
    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            const notification = new Notification(title, {
                body: message,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-32x32.png',
                tag: `order-${order.id}`,
                requireInteraction: true,
                data: {
                    orderId: order.id,
                    orderNumber: orderNumber,
                    customerName: customerName,
                    total: orderTotal
                }
            });
            
            // Auto-close after 10 seconds
            setTimeout(() => notification.close(), 10000);
            
            // Handle notification click
            notification.onclick = function() {
                window.focus();
                if (typeof window.viewOrder === 'function') {
                    window.viewOrder(order.id);
                }
                notification.close();
            };
            
        } catch (error) {
            console.warn('Failed to show browser notification:', error);
        }
    }
    
    // Always show toast notification as fallback
    showSimpleToast(message, 'success');
    
    // Play notification sound
    playNotificationSound();
}

function playNotificationSound() {
    try {
        // Create a simple notification beep
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.15);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
    } catch (error) {
        console.warn('Could not play notification sound:', error);
    }
}

// ===================================
// TOAST NOTIFICATIONS
// ===================================

function showSimpleToast(message, type) {
    // Use existing toast function if available
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
        return;
    }
    
    // Simple fallback toast
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        z-index: 2000;
        font-weight: 600;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
        word-wrap: break-word;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// Add required CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// ===================================
// GLOBAL FUNCTIONS
// ===================================

// Export toggle function for potential external use
window.toggleNotifications = toggleNotifications;

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopPeriodicOrderChecking();
    console.log('🧹 Notification adapter cleaned up');
});

console.log('📬 Notification adapter loaded');