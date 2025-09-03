// ===================================
// SIMPLIFIED ADMIN ORDERS NOTIFICATION ADAPTER
// No function overrides to avoid conflicts
// ===================================

// Global variables for notification management
let notificationEnabled = false;
let lastKnownOrderCount = 0;
let notificationCheckInterval = null;
let isPageVisible = true;

// Initialize notification system when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📬 Initializing simplified notification system');
    
    // Wait for page to fully load
    setTimeout(() => {
        // Initialize PWA service worker
        initializeServiceWorker();
        
        // Set up page visibility tracking
        setupPageVisibilityTracking();
        
        // Initialize notification UI
        setupNotificationUI();
        
        // Load notification preferences
        loadNotificationPreferences();
        
        // Set up periodic order checking (every 30 seconds)
        if (notificationEnabled) {
            startPeriodicOrderChecking();
        }
        
        console.log('✅ Simplified notification adapter initialized');
    }, 2000);
});

// ===================================
// PWA SERVICE WORKER INITIALIZATION
// ===================================

async function initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
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
// NOTIFICATION UI SETUP
// ===================================

function setupNotificationUI() {
    // Find a good place to add the toggle
    const header = document.querySelector('.header-content') || document.querySelector('.section-header');
    if (!header) return;
    
    // Create notification toggle
    const toggleHTML = `
        <div class="notification-toggle" style="
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            margin-left: auto;
        ">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; color: white;">
                <input type="checkbox" id="notificationToggle" onchange="toggleNotifications(this.checked)"
                       style="transform: scale(1.2);">
                <span>🔔 Notifications</span>
            </label>
            <span id="notificationStatus" style="font-size: 0.75rem; opacity: 0.8; color: white;">Off</span>
        </div>
    `;
    
    header.insertAdjacentHTML('beforeend', toggleHTML);
}

// ===================================
// NOTIFICATION MANAGEMENT
// ===================================

function toggleNotifications(enabled) {
    notificationEnabled = enabled;
    localStorage.setItem('admin_notifications_enabled', enabled.toString());
    
    const status = document.getElementById('notificationStatus');
    if (status) {
        status.textContent = enabled ? 'On' : 'Off';
        status.style.color = enabled ? '#28a745' : 'white';
    }
    
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
        if (isPageVisible && notificationEnabled) {
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
                
                // Send notifications
                for (const order of newestOrders) {
                    await sendNewOrderNotification(order);
                }
                
                // Refresh the page data if main function exists
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
    const title = '🛒 New Order!';
    const body = `${order.order_number} from ${order.customer_name} (${orderTotal} OMR)`;
    
    // Browser notification
    if (Notification.permission === 'granted' && !isPageVisible) {
        const notification = new Notification(title, {
            body: body,
            icon: '/icons/icon-192x192.png',
            tag: `order-${order.id}`
        });
        
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
        
        setTimeout(() => notification.close(), 8000);
    }
    
    // In-page notification
    showNewOrderAlert(order);
    
    // Simple notification sound
    playSimpleSound();
}

function showNewOrderAlert(order) {
    const orderTotal = (order.total_amount / 1000).toFixed(3);
    
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #28a745, #20c997);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(40, 167, 69, 0.3);
        z-index: 2000;
        animation: slideInRight 0.5s ease;
        cursor: pointer;
        max-width: 300px;
    `;
    
    notification.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 0.5rem;">🛒 New Order!</div>
        <div style="font-size: 0.9rem; opacity: 0.9;">
            ${order.order_number}<br>
            ${order.customer_name}<br>
            ${orderTotal} OMR
        </div>
    `;
    
    // Add click handler
    notification.onclick = () => notification.remove();
    
    document.body.appendChild(notification);
    
    // Auto-remove
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

function playSimpleSound() {
    try {
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
        console.warn('Could not play notification sound');
    }
}

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
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#28a745' : '#17a2b8'};
        color: white;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        z-index: 2000;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Add required CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);

// Make functions globally available
window.toggleNotifications = toggleNotifications;

// Cleanup on unload
window.addEventListener('beforeunload', () => {
    stopPeriodicOrderChecking();
});

console.log('📬 Simplified notification adapter loaded');