// public/sw.js - Service Worker for PWA notifications
const CACHE_NAME = 'qotore-admin-v1';
const urlsToCache = [
  '/',
  '/admin/index.html',
  '/admin/orders-style.css',
  '/admin/orders-script.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache resources
self.addEventListener('install', function(event) {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        console.log('Service Worker: Installed successfully');
        return self.skipWaiting(); // Activate immediately
      })
      .catch(function(error) {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      console.log('Service Worker: Activated successfully');
      return self.clients.claim(); // Take control immediately
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests and chrome-extension requests
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version or fetch from network
        return response || fetch(event.request)
          .then(function(fetchResponse) {
            // Don't cache API responses or admin functions
            if (event.request.url.includes('/admin/') || 
                event.request.url.includes('/api/') ||
                event.request.url.includes('/functions/')) {
              return fetchResponse;
            }
            
            // Cache successful responses
            if (fetchResponse.status === 200) {
              const responseToCache = fetchResponse.clone();
              caches.open(CACHE_NAME)
                .then(function(cache) {
                  cache.put(event.request, responseToCache);
                });
            }
            
            return fetchResponse;
          })
          .catch(function() {
            // Return offline fallback for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/admin/index.html');
            }
          });
      })
  );
});

// Push notification event
self.addEventListener('push', function(event) {
  console.log('Service Worker: Push notification received');
  
  if (event.data) {
    const data = event.data.json();
    const title = data.title || '🛒 Qotore Admin';
    const options = {
      body: data.body || 'New order received',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: data.tag || 'qotore-notification',
      requireInteraction: true,
      actions: [
        { action: 'view', title: '👀 View Orders' },
        { action: 'dismiss', title: '✖ Dismiss' }
      ],
      data: data
    };
    
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', function(event) {
  console.log('Service Worker: Notification clicked', event.action);
  
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    // Open or focus the admin orders page
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(function(clientList) {
          // Look for existing admin window
          for (let client of clientList) {
            if (client.url.includes('/admin/') && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Open new admin window if none exists
          if (clients.openWindow) {
            return clients.openWindow('/admin/index.html');
          }
        })
    );
  }
  // 'dismiss' action just closes the notification (already handled above)
});

// Background sync (for future use)
self.addEventListener('sync', function(event) {
  console.log('SW: Background sync', event.tag);
  
  if (event.tag === 'check-orders') {
    event.waitUntil(
      // Could implement background order checking here
      Promise.resolve()
    );
  }
});

// Message handling from main app
self.addEventListener('message', function(event) {
  console.log('SW: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CHECK_ORDERS') {
    // Could trigger order checking
    console.log('SW: Order check requested');
  }
});

console.log('SW: Script loaded');