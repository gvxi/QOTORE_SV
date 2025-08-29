// sw.js - Enhanced Service Worker for iOS PWA-compatible push notifications
const CACHE_NAME = 'qotore-admin-v2';
const API_BASE = '/admin';
const CHECK_INTERVAL = 30000; // 30 seconds
const BACKGROUND_CHECK_INTERVAL = 60000; // 1 minute when in background

// Cache management
const urlsToCache = [
    '/admin/index.html',
    '/admin/fragrances.html',
    '/admin/orders-script.js',
    '/admin/fragrances-script.js',
    '/admin/orders-style.css',
    '/admin/fragrances-style.css',
    '/favicon.ico',
    '/icons/icon-16x16.png',
    '/icons/icon-32x32.png',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// Install event
self.addEventListener('install', (event) => {
    console.log('[SW] Install event - Enhanced version');
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
            .catch((error) => {
                console.error('[SW] Cache installation failed:', error);
            })
    );
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('[SW] Activate event - Enhanced version');
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

// Fetch event - handle network requests with intelligent caching
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    const url = new URL(event.request.url);
    
    // For admin API requests, always go to network first with fallback
    if (url.pathname.startsWith('/admin/')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Clone response for caching if successful
                    if (response.ok && response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // If network fails, try cache
                    return caches.match(event.request).then(cachedResponse => {
                        if (cachedResponse) {
                            console.log('[SW] Serving from cache (network failed):', url.pathname);
                            return cachedResponse;
                        }
                        // Return a custom offline response for admin pages
                        if (url.pathname.endsWith('.html')) {
                            return new Response(
                                `<!DOCTYPE html>
                                <html><head><title>Offline - Qotore Admin</title>
                                <style>body{font-family:Arial,sans-serif;text-align:center;padding:50px;background:#f5f5f5;}
                                .offline{background:white;padding:40px;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.1);}
                                h1{color:#8B4513;}button{background:#8B4513;color:white;padding:10px 20px;border:none;border-radius:5px;cursor:pointer;}</style>
                                </head><body><div class="offline"><h1>🌸 Qotore Admin</h1>
                                <h2>You're Offline</h2><p>Please check your connection and try again.</p>
                                <button onclick="location.reload()">Retry</button></div></body></html>`,
                                {
                                    headers: { 'Content-Type': 'text/html' },
                                    status: 503
                                }
                            );
                        }
                        throw new Error('No cached response available');
                    });
                })
        );
        return;
    }

    // For other requests (icons, assets), use cache-first strategy
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                if (response) {
                    return response;
                }
                return fetch(event.request).then(fetchResponse => {
                    // Cache successful responses
                    if (fetchResponse.ok) {
                        const responseToCache = fetchResponse.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return fetchResponse;
                });
            })
    );
});

// Global variables for order tracking
let lastOrderCheck = 0;
let knownOrderIds = new Set();
let checkInterval = null;
let isPageVisible = true;
let notificationsEnabled = false;
let notificationQueue = [];

// Message handling from main thread
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);
    
    const { type, data } = event.data;
    
    switch (type) {
        case 'START_ORDER_MONITORING':
            notificationsEnabled = event.data.enabled;
            startOrderMonitoring();
            respondToClient(event, { success: true, message: 'Order monitoring started' });
            break;
            
        case 'STOP_ORDER_MONITORING':
            notificationsEnabled = false;
            stopOrderMonitoring();
            respondToClient(event, { success: true, message: 'Order monitoring stopped' });
            break;
            
        case 'PAGE_VISIBILITY':
            isPageVisible = event.data.visible;
            adjustMonitoringFrequency();
            break;
            
        case 'INIT_KNOWN_ORDERS':
            // Initialize known orders to prevent false notifications on first load
            knownOrderIds = new Set(event.data.orderIds || []);
            lastOrderCheck = Date.now();
            console.log('[SW] Initialized with', knownOrderIds.size, 'known orders');
            break;
            
        case 'GET_NOTIFICATION_STATUS':
            respondToClient(event, {
                enabled: notificationsEnabled,
                knownOrders: Array.from(knownOrderIds),
                lastCheck: lastOrderCheck
            });
            break;
    }
});

// Helper function to respond to client messages
function respondToClient(event, response) {
    if (event.ports && event.ports[0]) {
        event.ports[0].postMessage(response);
    }
}

// Start order monitoring
function startOrderMonitoring() {
    if (checkInterval) {
        clearInterval(checkInterval);
    }
    
    if (!notificationsEnabled) {
        console.log('[SW] Order monitoring not started - notifications disabled');
        return;
    }
    
    console.log('[SW] Starting enhanced order monitoring');
    
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
    // Clear notification queue
    notificationQueue = [];
}

// Adjust monitoring frequency based on page visibility
function adjustMonitoringFrequency() {
    if (checkInterval && notificationsEnabled) {
        clearInterval(checkInterval);
        const interval = isPageVisible ? CHECK_INTERVAL : BACKGROUND_CHECK_INTERVAL;
        checkInterval = setInterval(checkForNewOrders, interval);
        console.log('[SW] Adjusted monitoring frequency to', interval / 1000, 'seconds (visible:', isPageVisible, ')');
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
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        if (!response.ok) {
            console.log('[SW] Failed to fetch orders:', response.status, response.statusText);
            if (response.status === 401) {
                // Authentication failed - stop monitoring
                console.log('[SW] Authentication failed, stopping monitoring');
                stopOrderMonitoring();
                notifyMainThread('AUTH_FAILED', { message: 'Session expired' });
            }
            return;
        }
        
        const result = await response.json();
        
        if (!result.success || !result.data) {
            console.log('[SW] Invalid response format:', result);
            return;
        }
        
        const currentOrders = result.data;
        const currentOrderIds = new Set(currentOrders.map(order => order.id));
        
        // Find new orders (existed in current but not in known)
        const newOrderIds = [...currentOrderIds].filter(id => !knownOrderIds.has(id));
        
        if (newOrderIds.length > 0) {
            console.log('[SW] Found', newOrderIds.length, 'new order(s):', newOrderIds);
            
            const newOrders = currentOrders.filter(order => newOrderIds.includes(order.id));
            
            // Process each new order
            for (const order of newOrders) {
                await showOrderNotification(order);
            }
            
            // Update known orders
            knownOrderIds = currentOrderIds;
            
            // Notify the main thread about new orders
            notifyMainThread('NEW_ORDERS', {
                count: newOrderIds.length,
                orders: newOrders,
                orderIds: newOrderIds
            });
        } else {
            // Update known orders even if no new ones (handles deletions)
            knownOrderIds = currentOrderIds;
        }
        
        lastOrderCheck = Date.now();
        
    } catch (error) {
        console.error('[SW] Error checking for new orders:', error);
    }
}

// Show order notification (Enhanced for iOS PWA compatibility)
async function showOrderNotification(order) {
    try {
        const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Unknown Customer';
        const totalQuantity = order.totalQuantity || order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
        const orderNumber = order.orderNumber || `#${order.id}`;
        const orderTotal = order.total ? `${order.total.toFixed(3)} OMR` : 'Total TBD';
        
        const notificationTitle = '🛍️ New Order Received!';
        const notificationBody = `Order ${orderNumber} from ${customerName}\n💰 ${orderTotal} | 📦 ${totalQuantity} items`;
        
        const notificationOptions = {
            body: notificationBody,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            tag: `order-${order.id}`,
            data: {
                orderId: order.id,
                orderNumber: orderNumber,
                customerName: customerName,
                total: order.total || 0,
                itemCount: order.itemCount || order.items?.length || 0,
                totalQuantity: totalQuantity,
                url: '/admin/index.html',
                timestamp: Date.now()
            },
            requireInteraction: true,
            silent: false,
            timestamp: Date.now(),
            renotify: true,
            // Actions for supported browsers
            actions: [
                {
                    action: 'view',
                    title: '👀 View Orders',
                    icon: '/icons/icon-32x32.png'
                },
                {
                    action: 'dismiss',
                    title: '✕ Dismiss',
                    icon: '/icons/icon-32x32.png'
                }
            ]
        };
        
        console.log('[SW] Showing notification for order:', orderNumber);
        
        // Try to show notification
        if ('serviceWorker' in navigator && 'Notification' in window) {
            if (Notification.permission === 'granted') {
                if (self.registration && self.registration.showNotification) {
                    // Use service worker notification (preferred for PWAs)
                    await self.registration.showNotification(notificationTitle, notificationOptions);
                } else {
                    // Fallback: add to queue for main thread to show
                    notificationQueue.push({
                        title: notificationTitle,
                        options: notificationOptions
                    });
                    notifyMainThread('SHOW_NOTIFICATION', {
                        title: notificationTitle,
                        options: notificationOptions
                    });
                }
            } else {
                console.log('[SW] Notification permission not granted');
                // Still notify main thread for toast notification
                notifyMainThread('SHOW_TOAST', {
                    message: `New order ${orderNumber} from ${customerName}`,
                    type: 'success'
                });
            }
        } else {
            // Fallback for environments without notification support
            console.log('[SW] Notifications not supported, using fallback');
            notifyMainThread('SHOW_TOAST', {
                message: `New order ${orderNumber} from ${customerName}`,
                type: 'success'
            });
        }
        
    } catch (error) {
        console.error('[SW] Error showing notification:', error);
        // Fallback: notify main thread
        notifyMainThread('SHOW_TOAST', {
            message: 'New order received!',
            type: 'success'
        });
    }
}

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.notification.tag, 'Action:', event.action);
    
    event.notification.close();
    
    const data = event.notification.data || {};
    
    // Handle action buttons
    if (event.action === 'dismiss') {
        console.log('[SW] Notification dismissed by user');
        return;
    }
    
    // Default action or "view" action - open/focus admin panel
    event.waitUntil(
        clients.matchAll({ 
            type: 'window', 
            includeUncontrolled: true 
        }).then((clientList) => {
            // Try to find existing admin tab
            const adminClient = clientList.find(client => {
                const clientUrl = new URL(client.url);
                return clientUrl.pathname.includes('/admin/') && client.visibilityState === 'visible';
            });
            
            if (adminClient) {
                // Focus existing admin tab and notify about the click
                console.log('[SW] Focusing existing admin tab');
                return adminClient.focus().then(() => {
                    adminClient.postMessage({
                        type: 'NOTIFICATION_CLICKED',
                        data: data,
                        action: event.action || 'view'
                    });
                });
            } else {
                // Open new admin tab
                console.log('[SW] Opening new admin tab');
                const url = data.url || '/admin/index.html';
                return clients.openWindow(url).then(client => {
                    if (client) {
                        // Wait for the page to load, then send the message
                        setTimeout(() => {
                            client.postMessage({
                                type: 'NOTIFICATION_CLICKED',
                                data: data,
                                action: event.action || 'view'
                            });
                        }, 2000);
                    }
                });
            }
        }).catch(error => {
            console.error('[SW] Error handling notification click:', error);
        })
    );
});

// Notification close handler
self.addEventListener('notificationclose', (event) => {
    console.log('[SW] Notification closed:', event.notification.tag);
    
    // Track notification dismissals
    notifyMainThread('NOTIFICATION_CLOSED', {
        tag: event.notification.tag,
        data: event.notification.data,
        timestamp: Date.now()
    });
});

// Push event handler (for future server-sent push notifications)
self.addEventListener('push', (event) => {
    console.log('[SW] Push event received');
    
    if (event.data) {
        try {
            const pushData = event.data.json();
            console.log('[SW] Push data:', pushData);
            
            if (pushData.type === 'new_order' && pushData.order) {
                event.waitUntil(
                    showOrderNotification(pushData.order)
                );
            } else if (pushData.type === 'admin_message') {
                // Handle admin messages
                event.waitUntil(
                    self.registration.showNotification(
                        pushData.title || 'Qotore Admin',
                        {
                            body: pushData.message || 'You have a new admin notification',
                            icon: '/icons/icon-192x192.png',
                            badge: '/icons/icon-192x192.png',
                            tag: 'admin-message',
                            data: pushData.data || {}
                        }
                    )
                );
            }
        } catch (error) {
            console.error('[SW] Error processing push data:', error);
        }
    } else {
        // Generic push notification
        event.waitUntil(
            self.registration.showNotification('Qotore Admin', {
                body: 'You have a new notification',
                icon: '/icons/icon-192x192.png',
                tag: 'generic'
            })
        );
    }
});

// Background sync (for offline order checking)
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);
    
    if (event.tag === 'check-orders') {
        event.waitUntil(checkForNewOrders());
    } else if (event.tag === 'sync-admin-data') {
        // Sync admin data when coming back online
        event.waitUntil(syncAdminData());
    }
});

// Periodic background sync (for modern browsers)
self.addEventListener('periodicsync', (event) => {
    console.log('[SW] Periodic background sync:', event.tag);
    
    if (event.tag === 'check-orders-periodic') {
        event.waitUntil(checkForNewOrders());
    }
});

// Sync admin data helper
async function syncAdminData() {
    try {
        // Check orders
        await checkForNewOrders();
        
        // Cache fresh admin data
        const adminEndpoints = ['/admin/orders', '/admin/fragrances'];
        
        for (const endpoint of adminEndpoints) {
            try {
                const response = await fetch(endpoint, {
                    credentials: 'include'
                });
                if (response.ok) {
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(endpoint, response.clone());
                    console.log('[SW] Cached fresh data for:', endpoint);
                }
            } catch (error) {
                console.warn('[SW] Failed to sync data for:', endpoint, error);
            }
        }
        
    } catch (error) {
        console.error('[SW] Background sync failed:', error);
    }
}

// Notify main thread helper
function notifyMainThread(type, data) {
    self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
        const message = {
            type: type,
            data: data,
            timestamp: Date.now()
        };
        
        clients.forEach(client => {
            try {
                client.postMessage(message);
            } catch (error) {
                console.warn('[SW] Failed to send message to client:', error);
            }
        });
        
        console.log(`[SW] Notified ${clients.length} client(s) about:`, type);
    });
}

// Handle online/offline events
self.addEventListener('online', () => {
    console.log('[SW] Connection restored');
    notifyMainThread('CONNECTION_STATUS', { online: true });
    
    // Trigger background sync when coming back online
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        self.registration.sync.register('sync-admin-data');
    } else {
        // Fallback: immediate sync
        syncAdminData();
    }
});

self.addEventListener('offline', () => {
    console.log('[SW] Connection lost');
    notifyMainThread('CONNECTION_STATUS', { online: false });
});

// Visibility change detection
self.addEventListener('visibilitychange', () => {
    isPageVisible = document.visibilityState === 'visible';
    adjustMonitoringFrequency();
    console.log('[SW] Page visibility changed:', isPageVisible);
});

// Error handling
self.addEventListener('error', (event) => {
    console.error('[SW] Service Worker error:', event.error);
    notifyMainThread('SW_ERROR', {
        message: event.error?.message || 'Service Worker error',
        filename: event.filename,
        lineno: event.lineno
    });
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('[SW] Unhandled promise rejection:', event.reason);
    notifyMainThread('SW_ERROR', {
        message: 'Unhandled promise rejection',
        reason: event.reason?.message || event.reason
    });
});

// Update notification for new service worker versions
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Cleanup function for when service worker is being replaced
self.addEventListener('beforeunload', () => {
    console.log('[SW] Service Worker being replaced, cleaning up...');
    stopOrderMonitoring();
});

// Register for background sync if supported
self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            // Enable navigation preload if supported
            if ('navigationPreload' in self.registration) {
                await self.registration.navigationPreload.enable();
                console.log('[SW] Navigation preload enabled');
            }
            
            // Register periodic background sync if supported
            if ('periodicSync' in self.registration) {
                try {
                    await self.registration.periodicSync.register('check-orders-periodic', {
                        minInterval: 5 * 60 * 1000, // 5 minutes
                    });
                    console.log('[SW] Periodic background sync registered');
                } catch (error) {
                    console.warn('[SW] Periodic sync not available:', error);
                }
            }
        })()
    );
});

console.log('[SW] Enhanced Service Worker loaded and ready for iOS PWA notifications and offline functionality');

// Export some utilities for debugging
self.getServiceWorkerStatus = () => ({
    version: '2.0',
    cacheSize: knownOrderIds.size,
    lastCheck: lastOrderCheck,
    isMonitoring: !!checkInterval,
    notificationsEnabled: notificationsEnabled,
    isPageVisible: isPageVisible,
    queueSize: notificationQueue.length
});