// ===================================
// ADMIN ORDERS NOTIFICATION ADAPTER
// Handles new order notifications and PWA integration
// ===================================

// Global variables for notification management
let notificationEnabled = false;
let lastKnownOrderCount = 0;
let lastOrderCheck = null;
let notificationCheckInterval = null;
let serviceWorkerRegistration = null;
let isPageVisible = true;

// Initialize notification system when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📬 Initializing admin orders notification system');
    
    // Initialize PWA service worker
    initializeServiceWorker();
    
    // Set up page visibility tracking
    setupPageVisibilityTracking();
    
    // Initialize notification UI
    setupNotificationUI();
    
    // Load notification preferences
    loadNotificationPreferences();
    
    // Set up periodic order checking (every 30 seconds)
    startPeriodicOrderChecking();
    
    console.log('✅ Orders notification adapter initialized');
});

// ===================================
// PWA SERVICE WORKER INITIALIZATION
// ===================================

async function initializeServiceWorker() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
            serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
            console.log('📱 Service Worker registered:', serviceWorkerRegistration);
            
            // Request notification permission on first load
            await requestNotificationPermission();
        } catch (error) {
            console.warn('Service Worker registration failed:', error);
        }
    } else {
        console.warn('PWA features not supported in this browser');
    }
}

async function requestNotificationPermission() {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        console.log('🔔 Notification permission:', permission);
        
        if (permission === 'granted') {
            updateNotificationToggle(true);
        }
        
        return permission === 'granted';
    }
    return false;
}

// ===================================
// NOTIFICATION UI SETUP
// ===================================

function setupNotificationUI() {
    // Find the notification toggle in the orders header
    const ordersHeader = document.querySelector('.section-header');
    if (!ordersHeader) return;
    
    // Create notification toggle button
    const notificationToggle = document.createElement('div');
    notificationToggle.className = 'notification-toggle';
    notificationToggle.innerHTML = `
        <label class="toggle-switch" title="Enable new order notifications">
            <input type="checkbox" id="notificationToggle" onchange="toggleNotifications(this.checked)">
            <span class="toggle-slider">
                <span class="toggle-icon">🔔</span>
            </span>
            <span class="toggle-label">Notifications</span>
        </label>
        <div class="notification-status" id="notificationStatus">
            <span class="status-indicator" id="statusIndicator">●</span>
            <span class="status-text" id="statusText">Disabled</span>
        </div>
    `;
    
    // Add to header
    const existingControls = ordersHeader.querySelector('.section-title');
    if (existingControls) {
        ordersHeader.insertBefore(notificationToggle, existingControls.nextSibling);
    } else {
        ordersHeader.appendChild(notificationToggle);
    }
    
    // Add notification styles
    addNotificationStyles();
}

function addNotificationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Notification Toggle Styles */
        .notification-toggle {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 0.5rem 1rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            backdrop-filter: blur(10px);
        }
        
        .toggle-switch {
            position: relative;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
            user-select: none;
        }
        
        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        
        .toggle-slider {
            position: relative;
            width: 60px;
            height: 30px;
            background: #ccc;
            border-radius: 15px;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            padding: 3px;
        }
        
        .toggle-slider .toggle-icon {
            width: 24px;
            height: 24px;
            background: white;
            border-radius: 50%;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .toggle-switch input:checked + .toggle-slider {
            background: #28a745;
        }
        
        .toggle-switch input:checked + .toggle-slider .toggle-icon {
            transform: translateX(30px);
        }
        
        .toggle-label {
            font-weight: 600;
            color: white;
            font-size: 0.875rem;
        }
        
        .notification-status {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.75rem;
            color: white;
            opacity: 0.8;
        }
        
        .status-indicator {
            font-size: 0.5rem;
            transition: color 0.3s ease;
        }
        
        .status-indicator.active {
            color: #28a745;
            animation: pulse 2s infinite;
        }
        
        .status-indicator.inactive {
            color: #6c757d;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        /* New Order Badge Animation */
        .new-order-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(40, 167, 69, 0.3);
            z-index: 2000;
            animation: slideInRight 0.5s ease, fadeOutRight 0.5s ease 4.5s forwards;
            cursor: pointer;
            min-width: 250px;
        }
        
        .new-order-notification h4 {
            margin: 0 0 0.5rem 0;
            font-size: 1rem;
            font-weight: 700;
        }
        
        .new-order-notification p {
            margin: 0;
            font-size: 0.875rem;
            opacity: 0.9;
        }
        
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
        
        @keyframes fadeOutRight {
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        /* Mobile responsiveness */
        @media (max-width: 768px) {
            .notification-toggle {
                flex-direction: column;
                gap: 0.5rem;
                padding: 0.75rem;
            }
            
            .toggle-label {
                font-size: 0.75rem;
            }
            
            .new-order-notification {
                top: 10px;
                right: 10px;
                left: 10px;
                min-width: auto;
            }
        }
    `;
    document.head.appendChild(style);
}

// ===================================
// NOTIFICATION MANAGEMENT
// ===================================

function toggleNotifications(enabled) {
    notificationEnabled = enabled;
    
    // Save preference
    localStorage.setItem('admin_notifications_enabled', enabled.toString());
    
    // Update UI
    updateNotificationToggle(enabled);
    
    if (enabled) {
        // Request permission if not already granted
        requestNotificationPermission();
        console.log('🔔 Order notifications enabled');
        showToast('Order notifications enabled', 'success');
    } else {
        console.log('🔕 Order notifications disabled');
        showToast('Order notifications disabled', 'info');
    }
}

function updateNotificationToggle(enabled) {
    const toggle = document.getElementById('notificationToggle');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    
    if (toggle) {
        toggle.checked = enabled;
    }
    
    if (statusIndicator && statusText) {
        if (enabled && Notification.permission === 'granted') {
            statusIndicator.className = 'status-indicator active';
            statusText.textContent = 'Active';
        } else if (enabled && Notification.permission === 'denied') {
            statusIndicator.className = 'status-indicator inactive';
            statusText.textContent = 'Blocked';
        } else {
            statusIndicator.className = 'status-indicator inactive';
            statusText.textContent = 'Disabled';
        }
    }
}

function loadNotificationPreferences() {
    const saved = localStorage.getItem('admin_notifications_enabled');
    const enabled = saved === 'true';
    
    notificationEnabled = enabled;
    updateNotificationToggle(enabled);
}

// ===================================
// PAGE VISIBILITY TRACKING
// ===================================

function setupPageVisibilityTracking() {
    // Track when user switches tabs/minimizes window
    document.addEventListener('visibilitychange', function() {
        isPageVisible = !document.hidden;
        console.log('👀 Page visibility:', isPageVisible ? 'visible' : 'hidden');
        
        if (isPageVisible) {
            // Check for new orders when user returns to page
            setTimeout(checkForNewOrders, 1000);
        }
    });
    
    // Track window focus
    window.addEventListener('focus', function() {
        isPageVisible = true;
        setTimeout(checkForNewOrders, 1000);
    });
    
    window.addEventListener('blur', function() {
        isPageVisible = false;
    });
}

// ===================================
// NEW ORDER DETECTION
// ===================================

function startPeriodicOrderChecking() {
    // Clear any existing interval
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

async function checkForNewOrders() {
    if (!notificationEnabled) return;
    
    try {
        console.log('🔍 Checking for new orders...');
        
        const response = await fetch('/admin/orders', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                // Session expired, stop checking
                notificationEnabled = false;
                updateNotificationToggle(false);
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
            const orders = result.data;
            const currentOrderCount = orders.length;
            
            // Get new pending orders
            const pendingOrders = orders.filter(order => 
                order.status === 'pending' && !order.reviewed
            );
            
            // Check if we have new orders
            if (lastKnownOrderCount > 0 && currentOrderCount > lastKnownOrderCount) {
                const newOrdersCount = currentOrderCount - lastKnownOrderCount;
                console.log(`🆕 Found ${newOrdersCount} new order(s)!`);
                
                // Get the newest orders
                const newestOrders = orders
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, newOrdersCount);
                
                // Send notifications
                for (const order of newestOrders) {
                    await sendNewOrderNotification(order);
                }
                
                // Update UI
                if (typeof loadOrders === 'function') {
                    loadOrders(); // Refresh the orders table
                }
                
                // Show badge for new orders
                showNewOrderBadge(pendingOrders.length);
            }
            
            // Update last known count
            lastKnownOrderCount = currentOrderCount;
            lastOrderCheck = new Date();
        }
        
    } catch (error) {
        console.warn('Failed to check for new orders:', error);
    }
}

async function sendNewOrderNotification(order) {
    const orderTotal = (order.total_amount / 1000).toFixed(3);
    const title = '🛒 New Order Received!';
    const body = `Order ${order.order_number} from ${order.customer_first_name} (${orderTotal} OMR)`;
    
    // Browser notification (if page is hidden or user prefers)
    if (Notification.permission === 'granted' && (!isPageVisible || !document.hasFocus())) {
        const notification = new Notification(title, {
            body: body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            tag: `order-${order.id}`,
            requireInteraction: true,
            actions: [
                { action: 'view', title: '👀 View Order' },
                { action: 'dismiss', title: '✖ Dismiss' }
            ]
        });
        
        notification.onclick = function() {
            window.focus();
            // Optionally scroll to the order or open details
            notification.close();
        };
        
        // Auto-close after 10 seconds
        setTimeout(() => notification.close(), 10000);
    }
    
    // In-page notification (always show)
    showInPageNotification(order);
    
    // Play notification sound (optional)
    playNotificationSound();
}

function showInPageNotification(order) {
    const orderTotal = (order.total_amount / 1000).toFixed(3);
    
    const notification = document.createElement('div');
    notification.className = 'new-order-notification';
    notification.innerHTML = `
        <h4>🛒 New Order Received!</h4>
        <p><strong>${order.order_number}</strong> from ${order.customer_first_name}</p>
        <p>Total: ${orderTotal} OMR • ${order.items?.length || 0} items</p>
    `;
    
    notification.onclick = function() {
        // Focus on the new order in the table
        const orderRow = document.querySelector(`tr[data-order-id="${order.id}"]`);
        if (orderRow) {
            orderRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            orderRow.style.background = 'rgba(40, 167, 69, 0.1)';
            setTimeout(() => {
                orderRow.style.background = '';
            }, 3000);
        }
        notification.remove();
    };
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

function playNotificationSound() {
    // Create a subtle notification sound
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create a short, pleasant notification tone
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
        console.warn('Could not play notification sound:', error);
    }
}

function showNewOrderBadge(count) {
    const badge = document.getElementById('newOrderBadge');
    const countElement = document.getElementById('newOrderCount');
    
    if (badge && countElement && count > 0) {
        countElement.textContent = count;
        badge.style.display = 'flex';
        badge.style.animation = 'pulse 1s ease-in-out infinite';
        
        // Stop pulsing after 10 seconds
        setTimeout(() => {
            badge.style.animation = '';
        }, 10000);
    }
}

// ===================================
// GLOBAL FUNCTIONS
// ===================================

// Make functions available globally
window.toggleNotifications = toggleNotifications;
window.checkForNewOrders = checkForNewOrders;

// Override the original loadOrders to initialize count
const originalLoadOrders = window.loadOrders;
if (originalLoadOrders) {
    window.loadOrders = async function() {
        await originalLoadOrders.apply(this, arguments);
        
        // Initialize order count on first load
        if (lastKnownOrderCount === 0 && window.orders && window.orders.length > 0) {
            lastKnownOrderCount = window.orders.length;
            console.log('🔢 Initial order count set to:', lastKnownOrderCount);
        }
    };
}

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (notificationCheckInterval) {
        clearInterval(notificationCheckInterval);
    }
});

console.log('📬 AOD');