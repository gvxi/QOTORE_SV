// sw.js - Service Worker for iOS PWA-compatible push notifications
const CACHE_NAME = 'qotore-admin-v1';
const API_BASE = '/admin';
const CHECK_INTERVAL = 30000; // 30 seconds
const BACKGROUND_CHECK_INTERVAL = 60000; // 1 minute when in background

// Cache management
const urlsToCache = [
    '/admin/index.html',
    '/admin/index.js',
    '/favicon.ico'
];

// Install event
self.addEventListener('install', (event) => {
    console.log('[SW] Install event');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Opened cache');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                // Force activation of new service worker
                return self.skipWaiting();
            })
    );
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('[SW] Activate event');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Take control of all pages immediately
            return self.clients.claim();
        })
    );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // For admin API requests, always go to network first
    if (event.request.url.includes('/admin/')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    // If network fails, try cache
                    return caches.match(event.request);
                })
        );
        return;
    }

    // For other requests, use cache-first strategy
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
    );
});

// Global variables for order tracking
let lastOrderCheck = 0;
let knownOrderIds = new Set();
let checkInterval = null;
let isPageVisible = true;
let notificationsEnabled = false;

// Message handling from main thread
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);
    
    if (event.data.type === 'START_ORDER_MONITORING') {
        notificationsEnabled = event.data.enabled;
        startOrderMonitoring();
        event.ports[0].postMessage({ success: true });
    } else if (event.data.type === 'STOP_ORDER_MONITORING') {
        notificationsEnabled = false;
        stopOrderMonitoring();
        event.ports[0].postMessage({ success: true });
    } else if (event.data.type === 'PAGE_VISIBILITY') {
        isPageVisible = event.data.visible;
        adjustMonitoringFrequency();
    } else if (event.data.type === 'INIT_KNOWN_ORDERS') {
        // Initialize known orders to prevent false notifications on first load
        knownOrderIds = new Set(event.data.orderIds);
        lastOrderCheck = Date.now();
        console.log('[SW] Initialized with', knownOrderIds.size, 'known orders');
    }
});

// Start order monitoring
function startOrderMonitoring() {
    if (checkInterval) {
        clearInterval(checkInterval);
    }
    
    if (!notificationsEnabled) {
        console.log('[SW] Order monitoring not started - notifications disabled');
        return;
    }
    
    console.log('[SW] Starting order monitoring');
    
    // Check immediately, then set interval
    checkForNewOrders();
    
    const interval = isPageVisible ? CHECK_INTERVAL : BACKGROUND_CHECK_INTERVAL;
    checkInterval = setInterval(checkForNewOrders, interval);
}

// Stop order monitoring
function stopOrderMonitoring() {
    console.log('[SW] Stopping order monitoring');
    if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
    }
}

// Adjust monitoring frequency based on page visibility
function adjustMonitoringFrequency() {
    if (checkInterval && notificationsEnabled) {
        clearInterval(checkInterval);
        const interval = isPageVisible ? CHECK_INTERVAL : BACKGROUND_CHECK_INTERVAL;
        checkInterval = setInterval(checkForNewOrders, interval);
        console.log('[SW] Adjusted monitoring frequency to', interval / 1000, 'seconds');
    }
}

// Check for new orders
async function checkForNewOrders() {
    if (!notificationsEnabled) {
        return;
    }
    
    try {
        console.log('[SW] Checking for new orders...');
        
        const response = await fetch(`${API_BASE}/orders`, {
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            console.log('[SW] Failed to fetch orders:', response.status);
            return;
        }
        
        const result = await response.json();
        
        if (!result.success || !result.data) {
            console.log('[SW] Invalid response format');
            return;
        }
        
        const currentOrders = result.data;
        const newOrders = currentOrders.filter(order => !knownOrderIds.has(order.id));
        
        if (newOrders.length > 0) {
            console.log('[SW] Found', newOrders.length, 'new order(s)');
            
            // Process each new order
            for (const order of newOrders) {
                await showOrderNotification(order);
                knownOrderIds.add(order.id);
            }
            
            // Notify the main thread about new orders
            notifyMainThread('NEW_ORDERS', {
                count: newOrders.length,
                orders: newOrders
            });
        }
        
        lastOrderCheck = Date.now();
        
    } catch (error) {
        console.error('[SW] Error checking for new orders:', error);
    }
}

// Show order notification (iOS PWA compatible)
async function showOrderNotification(order) {
    try {
        const customerName = `${order.customer.firstName} ${order.customer.lastName}`;
        const totalQuantity = order.totalQuantity || order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        const orderNumber = order.orderNumber || `#${order.id}`;
        
        const notificationOptions = {
            body: `New order ${orderNumber} from ${customerName}\n💰 ${order.total.toFixed(3)} OMR | 📦 ${totalQuantity} items`,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `order-${order.id}`,
            data: {
                orderId: order.id,
                orderNumber: orderNumber,
                customerName: customerName,
                total: order.total,
                itemCount: order.itemCount || order.items?.length || 0,
                url: '/admin/index.html#orders'
            },
            requireInteraction: true,
            silent: false,
            timestamp: Date.now(),
            // iOS PWA specific options
            renotify: true,
            persistent: true,
            // Actions for supported browsers
            actions: [
                {
                    action: 'view',
                    title: '👀 View Orders',
                    icon: '/favicon.ico'
                },
                {
                    action: 'dismiss',
                    title: '✕ Dismiss',
                    icon: '/favicon.ico'
                }
            ]
        };
        
        console.log('[SW] Showing notification for order:', orderNumber);
        
        // For iOS PWA compatibility, we need to handle notifications differently
        if (self.registration && self.registration.showNotification) {
            // Standard service worker notification (works on iOS 16.4+)
            await self.registration.showNotification('🛍️ New Order Received!', notificationOptions);
        } else {
            // Fallback for older iOS versions - notify main thread
            notifyMainThread('SHOW_NOTIFICATION', {
                title: '🛍️ New Order Received!',
                options: notificationOptions
            });
        }
        
    } catch (error) {
        console.error('[SW] Error showing notification:', error);
    }
}

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.notification.tag, event.action);
    
    event.notification.close();
    
    const data = event.notification.data || {};
    
    // Handle action buttons
    if (event.action === 'dismiss') {
        return;
    }
    
    // Default action or "view" action - open admin panel
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Check if admin page is already open
                const adminClient = clientList.find(client => 
                    client.url.includes('/admin/') && client.visibilityState === 'visible'
                );
                
                if (adminClient) {
                    // Focus existing admin tab and notify about the click
                    adminClient.focus();
                    adminClient.postMessage({
                        type: 'NOTIFICATION_CLICKED',
                        data: data
                    });
                } else {
                    // Open new admin tab
                    const url = data.url || '/admin/index.html';
                    clients.openWindow(url).then(client => {
                        if (client) {
                            // Wait a bit for the page to load, then send the message
                            setTimeout(() => {
                                client.postMessage({
                                    type: 'NOTIFICATION_CLICKED',
                                    data: data
                                });
                            }, 1000);
                        }
                    });
                }
            })
    );
});

// Notification close handler
self.addEventListener('notificationclose', (event) => {
    console.log('[SW] Notification closed:', event.notification.tag);
    
    // Track notification dismissals if needed
    notifyMainThread('NOTIFICATION_CLOSED', {
        tag: event.notification.tag,
        data: event.notification.data
    });
});

// Push event handler (for future server-sent push notifications)
self.addEventListener('push', (event) => {
    console.log('[SW] Push event received');
    
    if (event.data) {
        try {
            const pushData = event.data.json();
            console.log('[SW] Push data:', pushData);
            
            if (pushData.type === 'new_order') {
                event.waitUntil(
                    showOrderNotification(pushData.order)
                );
            }
        } catch (error) {
            console.error('[SW] Error processing push data:', error);
        }
    }
});

// Background sync (for offline order checking)
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);
    
    if (event.tag === 'check-orders') {
        event.waitUntil(checkForNewOrders());
    }
});

// Periodic background sync (for modern browsers)
self.addEventListener('periodicsync', (event) => {
    console.log('[SW] Periodic background sync:', event.tag);
    
    if (event.tag === 'check-orders-periodic') {
        event.waitUntil(checkForNewOrders());
    }
});

// Notify main thread helper
function notifyMainThread(type, data) {
    self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: type,
                data: data,
                timestamp: Date.now()
            });
        });
    });
}

// Visibility change detection
self.addEventListener('visibilitychange', () => {
    isPageVisible = document.visibilityState === 'visible';
    adjustMonitoringFrequency();
});

// Error handling
self.addEventListener('error', (event) => {
    console.error('[SW] Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('[SW] Unhandled promise rejection:', event.reason);
});

console.log('[SW] Service Worker loaded and ready for iOS PWA notifications');