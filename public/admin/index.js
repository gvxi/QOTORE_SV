// Display Functions
function displayFragrances() {
    const loading = document.getElementById('fragrancesLoading');
    const table = document.getElementById('fragrancesTable');
    const mobile = document.getElementById('fragrancesMobile');
    const empty = document.getElementById('fragrancesEmpty');
    const controls = document.getElementById('fragrancesControls');
    const noResults = document.getElementById('fragrancesNoResults');
    
    loading.style.display = 'none';
    
    // Filter fragrances first
    filterFragrances();
    
    if (fragrances.length === 0) {
        table.style.display = 'none';
        mobile.style.display = 'none';
        controls.style.display = 'none';
        noResults.style.display = 'none';
        empty.style.display = 'block';
        return;
    }
    
    if (filteredFragrances.length === 0 && fragrancesSearchTerm) {
        table.style.display = 'none';
        mobile.style.display = 'none';
        empty.style.display = 'none';
        controls.style.display = 'flex';
        noResults.style.display = 'block';
        updateFragrancesPagination();
        return;
    }
    
    empty.style.display = 'none';
    noResults.style.display = 'none';
    controls.style.display = 'flex';
    
    if (isMobile) {
        // Show mobile card view
        table.style.display = 'none';
        mobile.style.display = 'block';
        displayFragrancesMobile();
    } else {
        // Show desktop table view
        mobile.style.display = 'none';
        table.style.display = 'block';
        displayFragrancesTable();
    }
    
    updateFragrancesPagination();
}

function displayFragrancesTable() {
    const tbody = document.getElementById('fragrancesTableBody');
    tbody.innerHTML = '';
    
    const paginatedFragrances = getFragrancesPaginatedData();
    
    paginatedFragrances.forEach(fragrance => {
        const row = document.createElement('tr');
        
        const variantCount = fragrance.variants ? fragrance.variants.length : 0;
        const variantsText = variantCount > 0 ? `${variantCount} variants` : 'No variants';
        
        row.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 40px; height: 40px; background: #f5f5f5; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #ccc; flex-shrink: 0;">
                        ${fragrance.image_path ? 
                            `<img src="/api/image/${fragrance.image_path.replace('fragrance-images/', '')}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px;" onerror="this.style.display='none'; this.parentNode.innerHTML='🌸';">` :
                            '🌸'
                        }
                    </div>
                    <div style="min-width: 0;">
                        <strong style="display: block; word-break: break-word;">${fragrance.name}</strong>
                        <small style="color: #666; word-break: break-all;">${fragrance.slug}</small>
                    </div>
                </div>
            </td>
            <td>${fragrance.brand || '-'}</td>
            <td>${variantsText}</td>
            <td>
                <span class="status-badge ${fragrance.hidden ? 'status-hidden' : 'status-visible'}">
                    ${fragrance.hidden ? 'Hidden' : 'Visible'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-small btn-edit" onclick="editFragrance(${fragrance.id})">Edit</button>
                    <button class="btn-small ${fragrance.hidden ? 'btn-show' : 'btn-hide'}" 
                            onclick="toggleFragranceVisibility(${fragrance.id}, ${!fragrance.hidden})">
                        ${fragrance.hidden ? 'Show' : 'Hide'}
                    </button>
                    <button class="btn-small btn-delete" onclick="deleteFragrance(${fragrance.id})">Delete</button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function displayFragrancesMobile() {
    const container = document.getElementById('fragrancesMobile');
    container.innerHTML = '';
    
    const paginatedFragrances = getFragrancesPaginatedData();
    
    paginatedFragrances.forEach(fragrance => {
        const card = document.createElement('div');
        card.className = 'mobile-card';
        
        const variantCount = fragrance.variants ? fragrance.variants.length : 0;
        const variantsText = variantCount > 0 ? `${variantCount} variants` : 'No variants';
        
        card.innerHTML = `
            <div class="mobile-card-header">
                <div class="mobile-card-image">
                    ${fragrance.image_path ? 
                        `<img src="/api/image/${fragrance.image_path.replace('fragrance-images/', '')}" alt="${fragrance.name}" onerror="this.style.display='none'; this.parentNode.innerHTML='🌸';">` :
                        '🌸'
                    }
                </div>
                <div class="mobile-card-info">
                    <div class="mobile-card-title">${fragrance.name}</div>
                    <div class="mobile-card-subtitle">${fragrance.slug}</div>
                </div>
            </div>
            <div class="mobile-card-body">
                <div class="mobile-field">
                    <div class="mobile-field-label">Brand</div>
                    <div class="mobile-field-value">${fragrance.brand || '-'}</div>
                </div>
                <div class="mobile-field">
                    <div class="mobile-field-label">Variants</div>
                    <div class="mobile-field-value">${variantsText}</div>
                </div>
                <div class="mobile-field">
                    <div class="mobile-field-label">Status</div>
                    <div class="mobile-field-value">
                        <span class="status-badge ${fragrance.hidden ? 'status-hidden' : 'status-visible'}">
                            ${fragrance.hidden ? 'Hidden' : 'Visible'}
                        </span>
                    </div>
                </div>
            </div>
            <div class="action-buttons">
                <button class="btn-small btn-edit" onclick="editFragrance(${fragrance.id})">Edit</button>
                <button class="btn-small ${fragrance.hidden ? 'btn-show' : 'btn-hide'}" 
                        onclick="toggleFragranceVisibility(${fragrance.id}, ${!fragrance.hidden})">
                    ${fragrance.hidden ? 'Show' : 'Hide'}
                </button>
                <button class="btn-small btn-delete" onclick="deleteFragrance(${fragrance.id})">Delete</button>
            </div>
        `;
        
        container.appendChild(card);
    });
}

function displayOrders() {
    const loading = document.getElementById('ordersLoading');
    const table = document.getElementById('ordersTable');
    const mobile = document.getElementById('ordersMobile');
    const empty = document.getElementById('ordersEmpty');
    const controls = document.getElementById('ordersControls');
    const noResults = document.getElementById('ordersNoResults');

    loading.style.display = 'none';
    let fragrances = [];
    let orders = [];
    let currentEditingId = null;
    let isMobile = window.innerWidth <= 768;
    let isRefreshing = false;

// Service Worker and Notification Variables
let serviceWorker = null;
let notificationPermission = null;
let isIOSPWA = false;

// Pagination and Search Variables
let fragrancesPage = 1;
let fragrancesPerPage = 10;
let fragrancesSearchTerm = '';
let filteredFragrances = [];

let ordersPage = 1;
let ordersPerPage = 10;
let ordersSearchTerm = '';
let filteredOrders = [];

// Initialize Admin Panel
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    initializeServiceWorker();
    loadDashboardData();
    loadNotificationSettings();
    initializeImageUpload();
    initializeFormHandlers();
    initializeSearchAndPagination();
    detectIOSPWA();
    
    // Handle window resize
    window.addEventListener('resize', handleResize);
    
    // Initial render mode
    handleResize();
    
    // Handle page visibility for better notification management
    handlePageVisibility();
});

// Detect if running as iOS PWA
function detectIOSPWA() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  window.navigator.standalone === true;
    
    isIOSPWA = isIOS && isPWA;
    
    console.log('Device detection:', {
        isIOS: isIOS,
        isPWA: isPWA,
        isIOSPWA: isIOSPWA,
        userAgent: navigator.userAgent
    });
}

// Initialize Service Worker for iOS PWA compatibility
async function initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            console.log('Registering service worker...');
            
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });
            
            console.log('Service Worker registered:', registration);
            
            // Wait for service worker to be ready
            await navigator.serviceWorker.ready;
            
            serviceWorker = registration;
            
            // Listen for messages from service worker
            navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
            
            // Handle service worker updates
            registration.addEventListener('updatefound', () => {
                console.log('Service Worker update found');
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('New Service Worker installed, reloading...');
                        window.location.reload();
                    }
                });
            });
            
            console.log('Service Worker initialized successfully');
            
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    } else {
        console.warn('Service Worker not supported');
    }
}

// Handle messages from service worker
function handleServiceWorkerMessage(event) {
    const { type, data } = event.data;
    
    console.log('Message from Service Worker:', type, data);
    
    switch (type) {
        case 'NEW_ORDERS':
            console.log(`${data.count} new order(s) detected by Service Worker`);
            // Refresh orders display
            loadOrders();
            break;
            
        case 'NOTIFICATION_CLICKED':
            console.log('Notification clicked, order data:', data);
            // Scroll to orders section
            const ordersSection = document.querySelector('.section:nth-child(3)');
            if (ordersSection) {
                ordersSection.scrollIntoView({ behavior: 'smooth' });
            }
            // Refresh orders
            loadOrders();
            break;
            
        case 'SHOW_NOTIFICATION':
            // Fallback for older iOS versions
            if (data.title && data.options) {
                showFallbackNotification(data.title, data.options);
            }
            break;
            
        case 'NOTIFICATION_CLOSED':
            console.log('Notification closed:', data.tag);
            break;
    }
}

// Fallback notification for older iOS versions
function showFallbackNotification(title, options) {
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            const notification = new Notification(title, options);
            
            notification.onclick = function(event) {
                event.preventDefault();
                window.focus();
                notification.close();
                
                // Handle the click action
                if (options.data && options.data.url) {
                    // Focus the current window instead of opening new one
                    const ordersSection = document.querySelector('.section:nth-child(3)');
                    if (ordersSection) {
                        ordersSection.scrollIntoView({ behavior: 'smooth' });
                    }
                    loadOrders();
                }
            };
            
            // Auto-close after 10 seconds for fallback notifications
            setTimeout(() => {
                notification.close();
            }, 10000);
            
        } catch (error) {
            console.error('Error showing fallback notification:', error);
        }
    }
}

// Handle page visibility changes
function handlePageVisibility() {
    document.addEventListener('visibilitychange', () => {
        const isVisible = !document.hidden;
        console.log('Page visibility changed:', isVisible ? 'visible' : 'hidden');
        
        // Notify service worker about visibility change
        if (serviceWorker && serviceWorker.active) {
            serviceWorker.active.postMessage({
                type: 'PAGE_VISIBILITY',
                visible: isVisible
            });
        }
        
        if (isVisible) {
            // Refresh data when page becomes visible
            loadDashboardData();
        }
    });
}

// Send message to service worker
function sendMessageToServiceWorker(type, data) {
    return new Promise((resolve, reject) => {
        if (!serviceWorker || !serviceWorker.active) {
            reject(new Error('Service Worker not available'));
            return;
        }
        
        const messageChannel = new MessageChannel();
        
        messageChannel.port1.onmessage = (event) => {
            if (event.data.success) {
                resolve(event.data);
            } else {
                reject(new Error(event.data.error || 'Service Worker operation failed'));
            }
        };
        
        serviceWorker.active.postMessage({
            type: type,
            ...data
        }, [messageChannel.port2]);
    });
}

// Enhanced notification settings
async function loadNotificationSettings() {
    const enabled = localStorage.getItem('notificationsEnabled') === 'true';
    const checkbox = document.getElementById('notificationsEnabled');
    if (checkbox) {
        checkbox.checked = enabled;
    }
    
    // Check notification permission status
    if ('Notification' in window) {
        notificationPermission = Notification.permission;
        
        if (enabled && notificationPermission === 'granted') {
            console.log('Notifications are enabled and permission granted');
            await startServiceWorkerMonitoring();
        } else if (enabled && notificationPermission === 'denied') {
            console.log('Notifications denied by user');
            showCustomAlert('Notifications are blocked in your browser. Please enable them in browser settings to receive order notifications.');
        }
    }
}

// Start service worker order monitoring
async function startServiceWorkerMonitoring() {
    try {
        if (serviceWorker && serviceWorker.active) {
            // Initialize service worker with current known orders
            const currentOrderIds = orders.map(order => order.id);
            
            await sendMessageToServiceWorker('INIT_KNOWN_ORDERS', {
                orderIds: currentOrderIds
            });
            
            await sendMessageToServiceWorker('START_ORDER_MONITORING', {
                enabled: true
            });
            
            console.log('Service Worker order monitoring started');
        }
    } catch (error) {
        console.error('Failed to start Service Worker monitoring:', error);
    }
}

// Stop service worker order monitoring
async function stopServiceWorkerMonitoring() {
    try {
        if (serviceWorker && serviceWorker.active) {
            await sendMessageToServiceWorker('STOP_ORDER_MONITORING', {});
            console.log('Service Worker order monitoring stopped');
        }
    } catch (error) {
        console.error('Failed to stop Service Worker monitoring:', error);
    }
}

// Enhanced toggle notifications with iOS PWA support
async function toggleNotifications() {
    const enabled = document.getElementById('notificationsEnabled').checked;
    localStorage.setItem('notificationsEnabled', enabled);
    
    if (enabled && 'Notification' in window) {
        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            notificationPermission = permission;
            
            if (permission === 'granted') {
                await startServiceWorkerMonitoring();
                
                showCustomAlert('✅ Order notifications enabled! You will receive notifications for new orders even when the tab is in the background.');
                
                // Send a welcome notification via service worker
                if (serviceWorker && serviceWorker.active) {
                    serviceWorker.active.postMessage({
                        type: 'SHOW_NOTIFICATION',
                        data: {
                            title: '🔔 Notifications Enabled',
                            options: {
                                body: 'You will now receive notifications for new orders.',
                                icon: '/favicon.ico',
                                tag: 'welcome-notification'
                            }
                        }
                    });
                }
                
            } else if (permission === 'denied') {
                document.getElementById('notificationsEnabled').checked = false;
                localStorage.setItem('notificationsEnabled', 'false');
                
                let message = '❌ Notification permission denied.';
                if (isIOSPWA) {
                    message += ' On iOS, please enable notifications in Settings > Notifications > Safari > Allow Notifications.';
                } else {
                    message += ' Please enable notifications in your browser settings to receive order alerts.';
                }
                showCustomAlert(message);
            }
        } else if (Notification.permission === 'granted') {
            await startServiceWorkerMonitoring();
            showCustomAlert('✅ Order notifications enabled!');
        } else {
            document.getElementById('notificationsEnabled').checked = false;
            localStorage.setItem('notificationsEnabled', 'false');
            
            let message = '❌ Notifications are blocked.';
            if (isIOSPWA) {
                message += ' Please enable notifications in iOS Settings > Notifications > Safari.';
            } else {
                message += ' Please enable them in your browser settings.';
            }
            showCustomAlert(message);
        }
    } else if (!enabled) {
        await stopServiceWorkerMonitoring();
        showCustomAlert('Order notifications disabled.');
    } else {
        showCustomAlert('❌ Your browser does not support notifications.');
    }
}

// Enhanced test notification for iOS PWA
function testNotification() {
    if (!('Notification' in window)) {
        showCustomAlert('❌ Your browser does not support notifications.');
        return;
    }
    
    if (Notification.permission !== 'granted') {
        showCustomAlert('❌ Please enable notifications first by checking the "Enable Order Notifications" checkbox.');
        return;
    }
    
    const notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';
    if (!notificationsEnabled) {
        showCustomAlert('❌ Please enable notifications first by checking the "Enable Order Notifications" checkbox.');
        return;
    }
    
    // Test notification data
    const testOrderData = {
        id: 999999,
        orderNumber: 'ORD-TEST123',
        customer: {
            firstName: 'Test',
            lastName: 'Customer'
        },
        total: 15.500,
        itemCount: 3,
        items: [{ quantity: 2 }, { quantity: 1 }]
    };
    
    // Send test notification via service worker for better iOS PWA compatibility
    if (serviceWorker && serviceWorker.active) {
        serviceWorker.active.postMessage({
            type: 'SHOW_TEST_NOTIFICATION',
            data: {
                title: '🧪 Test Order Notification',
                options: {
                    body: `Test order ${testOrderData.orderNumber} from ${testOrderData.customer.firstName} ${testOrderData.customer.lastName}\n💰 ${testOrderData.total.toFixed(3)} OMR | 📦 3 items`,
                    icon: '/favicon.ico',
                    badge: '/favicon.ico',
                    tag: 'test-order',
                    data: testOrderData,
                    requireInteraction: true,
                    actions: [
                        { action: 'view', title: '👀 View Orders' },
                        { action: 'dismiss', title: '✕ Dismiss' }
                    ]
                }
            }
        });
    } else {
        // Fallback to regular notification
        showFallbackNotification('🧪 Test Order Notification', {
            body: `Test order ${testOrderData.orderNumber} from ${testOrderData.customer.firstName} ${testOrderData.customer.lastName}\n💰 ${testOrderData.total.toFixed(3)} OMR | 📦 3 items`,
            icon: '/favicon.ico',
            tag: 'test-order',
            data: testOrderData
        });
    }
    
    let message = '✅ Test notification sent!';
    if (isIOSPWA) {
        message += ' Check for the notification banner at the top of your screen.';
    } else {
        message += ' Check your browser for the notification.';
    }
    
    showCustomAlert(message);
}

// Initialize Search and Pagination
function initializeSearchAndPagination() {
    // Fragrances search
    const fragrancesSearch = document.getElementById('fragrancesSearch');
    if (fragrancesSearch) {
        fragrancesSearch.addEventListener('input', function(e) {
            fragrancesSearchTerm = e.target.value.toLowerCase();
            fragrancesPage = 1; // Reset to first page
            filterAndDisplayFragrances();
            toggleSearchClear('fragrances');
        });
    }
    
    // Orders search
    const ordersSearch = document.getElementById('ordersSearch');
    if (ordersSearch) {
        ordersSearch.addEventListener('input', function(e) {
            ordersSearchTerm = e.target.value.toLowerCase();
            ordersPage = 1; // Reset to first page
            filterAndDisplayOrders();
            toggleSearchClear('orders');
        });
    }
}

// Search and Filter Functions
function filterFragrances() {
    if (!fragrancesSearchTerm) {
        filteredFragrances = [...fragrances];
    } else {
        filteredFragrances = fragrances.filter(fragrance => {
            const searchFields = [
                fragrance.name,
                fragrance.brand,
                fragrance.slug,
                fragrance.description
            ].filter(Boolean).join(' ').toLowerCase();
            
            return searchFields.includes(fragrancesSearchTerm);
        });
    }
}

function filterOrders() {
    if (!ordersSearchTerm) {
        filteredOrders = [...orders];
    } else {
        filteredOrders = orders.filter(order => {
            const customerName = `${order.customer.firstName} ${order.customer.lastName}`.toLowerCase();
            const orderNumber = (order.orderNumber || `#${order.id}`).toLowerCase();
            const phone = order.customer.phone.toLowerCase();
            const email = (order.customer.email || '').toLowerCase();
            
            return customerName.includes(ordersSearchTerm) ||
                   orderNumber.includes(ordersSearchTerm) ||
                   phone.includes(ordersSearchTerm) ||
                   email.includes(ordersSearchTerm);
        });
    }
}

function filterAndDisplayFragrances() {
    filterFragrances();
    displayFragrances();
}

function filterAndDisplayOrders() {
    filterOrders();
    displayOrders();
}

// Clear Search Functions
function clearFragrancesSearch() {
    document.getElementById('fragrancesSearch').value = '';
    fragrancesSearchTerm = '';
    fragrancesPage = 1;
    filterAndDisplayFragrances();
    toggleSearchClear('fragrances');
}

function clearOrdersSearch() {
    document.getElementById('ordersSearch').value = '';
    ordersSearchTerm = '';
    ordersPage = 1;
    filterAndDisplayOrders();
    toggleSearchClear('orders');
}

function toggleSearchClear(type) {
    const searchInput = document.getElementById(`${type}Search`);
    const clearBtn = document.getElementById(`${type}ClearSearch`);
    
    if (searchInput && clearBtn) {
        clearBtn.style.display = searchInput.value ? 'block' : 'none';
    }
}

// Pagination Functions
function getFragrancesPaginatedData() {
    const startIndex = (fragrancesPage - 1) * fragrancesPerPage;
    const endIndex = startIndex + fragrancesPerPage;
    return filteredFragrances.slice(startIndex, endIndex);
}

function getOrdersPaginatedData() {
    const startIndex = (ordersPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    return filteredOrders.slice(startIndex, endIndex);
}

function updateFragrancesPagination() {
    const totalItems = filteredFragrances.length;
    const totalPages = Math.ceil(totalItems / fragrancesPerPage);
    const startItem = totalItems === 0 ? 0 : (fragrancesPage - 1) * fragrancesPerPage + 1;
    const endItem = Math.min(fragrancesPage * fragrancesPerPage, totalItems);
    
    // Update pagination info
    const paginationInfo = document.getElementById('fragrancesPaginationInfo');
    if (paginationInfo) {
        paginationInfo.textContent = `Showing ${startItem}-${endItem} of ${totalItems} fragrances`;
    }
    
    // Update pagination buttons
    const prevBtn = document.getElementById('fragrancesPrevBtn');
    const nextBtn = document.getElementById('fragrancesNextBtn');
    
    if (prevBtn) prevBtn.disabled = fragrancesPage <= 1;
    if (nextBtn) nextBtn.disabled = fragrancesPage >= totalPages;
    
    // Update page numbers
    const numbersContainer = document.getElementById('fragrancesPaginationNumbers');
    if (numbersContainer) {
        numbersContainer.innerHTML = '';
        
        const maxVisiblePages = isMobile ? 3 : 5;
        let startPage = Math.max(1, fragrancesPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `pagination-btn ${i === fragrancesPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => {
                fragrancesPage = i;
                filterAndDisplayFragrances();
            };
            numbersContainer.appendChild(pageBtn);
        }
    }
}

function updateOrdersPagination() {
    const totalItems = filteredOrders.length;
    const totalPages = Math.ceil(totalItems / ordersPerPage);
    const startItem = totalItems === 0 ? 0 : (ordersPage - 1) * ordersPerPage + 1;
    const endItem = Math.min(ordersPage * ordersPerPage, totalItems);
    
    // Update pagination info
    const paginationInfo = document.getElementById('ordersPaginationInfo');
    if (paginationInfo) {
        paginationInfo.textContent = `Showing ${startItem}-${endItem} of ${totalItems} orders`;
    }
    
    // Update pagination buttons
    const prevBtn = document.getElementById('ordersPrevBtn');
    const nextBtn = document.getElementById('ordersNextBtn');
    
    if (prevBtn) prevBtn.disabled = ordersPage <= 1;
    if (nextBtn) nextBtn.disabled = ordersPage >= totalPages;
    
    // Update page numbers
    const numbersContainer = document.getElementById('ordersPaginationNumbers');
    if (numbersContainer) {
        numbersContainer.innerHTML = '';
        
        const maxVisiblePages = isMobile ? 3 : 5;
        let startPage = Math.max(1, ordersPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `pagination-btn ${i === ordersPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => {
                ordersPage = i;
                filterAndDisplayOrders();
            };
            numbersContainer.appendChild(pageBtn);
        }
    }
}

// Navigation Functions
function previousFragrancesPage() {
    if (fragrancesPage > 1) {
        fragrancesPage--;
        filterAndDisplayFragrances();
    }
}

function nextFragrancesPage() {
    const totalPages = Math.ceil(filteredFragrances.length / fragrancesPerPage);
    if (fragrancesPage < totalPages) {
        fragrancesPage++;
        filterAndDisplayFragrances();
    }
}

function previousOrdersPage() {
    if (ordersPage > 1) {
        ordersPage--;
        filterAndDisplayOrders();
    }
}

function nextOrdersPage() {
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    if (ordersPage < totalPages) {
        ordersPage++;
        filterAndDisplayOrders();
    }
}

// Handle page visibility for better polling management
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Page is hidden, continue polling but less frequently
        stopOrderPolling();
        
        const notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';
        if (notificationsEnabled && Notification.permission === 'granted') {
            // Check every 60 seconds when page is hidden
            orderCheckInterval = setInterval(async () => {
                await checkForNewOrders();
            }, 60000);
        }
    } else {
        // Page is visible, resume normal polling
        stopOrderPolling();
        
        const notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';
        if (notificationsEnabled && Notification.permission === 'granted') {
            startOrderPolling();
        }
        
        // Refresh data when page becomes visible
        loadDashboardData();
    }
});

// Refresh Data Function
async function refreshData() {
    if (isRefreshing) return;
    
    isRefreshing = true;
    const refreshBtn = document.querySelector('[onclick="refreshData()"]');
    
    if (refreshBtn) {
        refreshBtn.classList.add('refreshing');
        refreshBtn.title = 'Refreshing...';
    }
    
    try {
        await loadDashboardData();
        
        // Show success feedback
        showCustomAlert('Data refreshed successfully!');
    } catch (error) {
        console.error('Error refreshing data:', error);
        showCustomAlert('Failed to refresh data. Please try again.');
    } finally {
        isRefreshing = false;
        
        if (refreshBtn) {
            refreshBtn.classList.remove('refreshing');
            refreshBtn.title = 'Refresh Data';
        }
    }
}

// Handle responsive behavior
function handleResize() {
    const newIsMobile = window.innerWidth <= 768;
    if (newIsMobile !== isMobile) {
        isMobile = newIsMobile;
        // Re-render data with appropriate view
        if (fragrances.length > 0) {
            displayFragrances();
        }
        if (orders.length > 0) {
            displayOrders();
        }
    }
}

// Authentication Check
function checkAuth() {
    const cookies = document.cookie.split(';');
    const adminSession = cookies.find(cookie => 
        cookie.trim().startsWith('admin_session=')
    );
    
    if (!adminSession) {
        showCustomAlert('Please log in to access admin panel', () => {
            window.location.href = '/login.html';
        });
        return;
    }
}

// Load Dashboard Data
async function loadDashboardData() {
    await Promise.all([
        loadFragrances(),
        loadOrders()
    ]);
    updateStats();
}

// Load Fragrances
async function loadFragrances() {
    try {
        const response = await fetch('/admin/fragrances', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                fragrances = result.data || [];
                displayFragrances();
            } else {
                throw new Error(result.error);
            }
        } else if (response.status === 401) {
            window.location.href = '/login.html';
        } else {
            throw new Error('Failed to load fragrances');
        }
    } catch (error) {
        console.error('Error loading fragrances:', error);
        showFragrancesError();
    }
}

// Load Orders
async function loadOrders() {
    try {
        const response = await fetch('/admin/orders', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                orders = result.data || [];
                displayOrders();
            } else {
                orders = [];
                displayOrders();
            }
        } else {
            orders = [];
            displayOrders();
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        orders = [];
        displayOrders();
    }
}

// Display Functions
function displayFragrances() {
    const loading = document.getElementById('fragrancesLoading');
    const table = document.getElementById('fragrancesTable');
    const mobile = document.getElementById('fragrancesMobile');
    const empty = document.getElementById('fragrancesEmpty');
    const tbody = document.getElementById('fragrancesTableBody');
    
    loading.style.display = 'none';
    
    if (fragrances.length === 0) {
        table.style.display = 'none';
        mobile.style.display = 'none';
        empty.style.display = 'block';
        return;
    }
    
    empty.style.display = 'none';
    
    if (isMobile) {
        // Show mobile card view
        table.style.display = 'none';
        mobile.style.display = 'block';
        displayFragrancesMobile();
    } else {
        // Show desktop table view
        mobile.style.display = 'none';
        table.style.display = 'block';
        displayFragrancesTable();
    }
}

function displayFragrancesTable() {
    const tbody = document.getElementById('fragrancesTableBody');
    tbody.innerHTML = '';
    
    fragrances.forEach(fragrance => {
        const row = document.createElement('tr');
        
        const variantCount = fragrance.variants ? fragrance.variants.length : 0;
        const variantsText = variantCount > 0 ? `${variantCount} variants` : 'No variants';
        
        row.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 40px; height: 40px; background: #f5f5f5; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #ccc; flex-shrink: 0;">
                        ${fragrance.image_path ? 
                            `<img src="/api/image/${fragrance.image_path.replace('fragrance-images/', '')}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px;" onerror="this.style.display='none'; this.parentNode.innerHTML='🌸';">` :
                            '🌸'
                        }
                    </div>
                    <div style="min-width: 0;">
                        <strong style="display: block; word-break: break-word;">${fragrance.name}</strong>
                        <small style="color: #666; word-break: break-all;">${fragrance.slug}</small>
                    </div>
                </div>
            </td>
            <td>${fragrance.brand || '-'}</td>
            <td>${variantsText}</td>
            <td>
                <span class="status-badge ${fragrance.hidden ? 'status-hidden' : 'status-visible'}">
                    ${fragrance.hidden ? 'Hidden' : 'Visible'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-small btn-edit" onclick="editFragrance(${fragrance.id})">Edit</button>
                    <button class="btn-small ${fragrance.hidden ? 'btn-show' : 'btn-hide'}" 
                            onclick="toggleFragranceVisibility(${fragrance.id}, ${!fragrance.hidden})">
                        ${fragrance.hidden ? 'Show' : 'Hide'}
                    </button>
                    <button class="btn-small btn-delete" onclick="deleteFragrance(${fragrance.id})">Delete</button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function displayFragrancesMobile() {
    const container = document.getElementById('fragrancesMobile');
    container.innerHTML = '';
    
    fragrances.forEach(fragrance => {
        const card = document.createElement('div');
        card.className = 'mobile-card';
        
        const variantCount = fragrance.variants ? fragrance.variants.length : 0;
        const variantsText = variantCount > 0 ? `${variantCount} variants` : 'No variants';
        
        card.innerHTML = `
            <div class="mobile-card-header">
                <div class="mobile-card-image">
                    ${fragrance.image_path ? 
                        `<img src="/api/image/${fragrance.image_path.replace('fragrance-images/', '')}" alt="${fragrance.name}" onerror="this.style.display='none'; this.parentNode.innerHTML='🌸';">` :
                        '🌸'
                    }
                </div>
                <div class="mobile-card-info">
                    <div class="mobile-card-title">${fragrance.name}</div>
                    <div class="mobile-card-subtitle">${fragrance.slug}</div>
                </div>
            </div>
            <div class="mobile-card-body">
                <div class="mobile-field">
                    <div class="mobile-field-label">Brand</div>
                    <div class="mobile-field-value">${fragrance.brand || '-'}</div>
                </div>
                <div class="mobile-field">
                    <div class="mobile-field-label">Variants</div>
                    <div class="mobile-field-value">${variantsText}</div>
                </div>
                <div class="mobile-field">
                    <div class="mobile-field-label">Status</div>
                    <div class="mobile-field-value">
                        <span class="status-badge ${fragrance.hidden ? 'status-hidden' : 'status-visible'}">
                            ${fragrance.hidden ? 'Hidden' : 'Visible'}
                        </span>
                    </div>
                </div>
            </div>
            <div class="action-buttons">
                <button class="btn-small btn-edit" onclick="editFragrance(${fragrance.id})">Edit</button>
                <button class="btn-small ${fragrance.hidden ? 'btn-show' : 'btn-hide'}" 
                        onclick="toggleFragranceVisibility(${fragrance.id}, ${!fragrance.hidden})">
                    ${fragrance.hidden ? 'Show' : 'Hide'}
                </button>
                <button class="btn-small btn-delete" onclick="deleteFragrance(${fragrance.id})">Delete</button>
            </div>
        `;
        
        container.appendChild(card);
    });
}

function displayOrders() {
    const loading = document.getElementById('ordersLoading');
    const table = document.getElementById('ordersTable');
    const mobile = document.getElementById('ordersMobile');
    const empty = document.getElementById('ordersEmpty');
    const controls = document.getElementById('ordersControls');
    const noResults = document.getElementById('ordersNoResults');
    
    loading.style.display = 'none';
    
    // Filter orders first
    filterOrders();
    
    if (orders.length === 0) {
        table.style.display = 'none';
        mobile.style.display = 'none';
        controls.style.display = 'none';
        noResults.style.display = 'none';
        empty.style.display = 'block';
        return;
    }
    
    if (filteredOrders.length === 0 && ordersSearchTerm) {
        table.style.display = 'none';
        mobile.style.display = 'none';
        empty.style.display = 'none';
        controls.style.display = 'flex';
        noResults.style.display = 'block';
        updateOrdersPagination();
        return;
    }
    
    empty.style.display = 'none';
    noResults.style.display = 'none';
    controls.style.display = 'flex';
    
    if (isMobile) {
        // Show mobile card view
        table.style.display = 'none';
        mobile.style.display = 'block';
        displayOrdersMobile();
    } else {
        // Show desktop table view
        mobile.style.display = 'none';
        table.style.display = 'block';
        displayOrdersTable();
    }
    
    updateOrdersPagination();
}

function displayOrdersTable() {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = '';
    
    const paginatedOrders = getOrdersPaginatedData();
    
    paginatedOrders.forEach(order => {
        const row = document.createElement('tr');
        
        const customerName = `${order.customer.firstName} ${order.customer.lastName}`;
        const totalQuantity = order.totalQuantity || 0;
        const itemsText = `${order.itemCount} items (${totalQuantity} total)`;
        
        row.innerHTML = `
            <td>
                <strong>${order.orderNumber || `#${order.id}`}</strong>
                <br><small style="color: #666;">${new Date(order.orderDate).toLocaleDateString()}</small>
            </td>
            <td>
                <strong style="word-break: break-word;">${customerName}</strong>
                <br><small style="color: #666; word-break: break-all;">${order.customer.phone}</small>
            </td>
            <td>${itemsText}</td>
            <td><strong>${order.total.toFixed(3)} OMR</strong></td>
            <td>
                <span class="status-badge ${order.status === 'completed' ? 'status-completed' : 'status-pending'}">
                    ${order.status === 'completed' ? 'Completed' : 'Pending'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-small btn-edit" onclick="viewOrder(${order.id})">View</button>
                    <button class="btn-small ${order.status === 'completed' ? 'btn-hide' : 'btn-show'}"
                            onclick="toggleOrderStatus(${order.id})">
                        ${order.status === 'completed' ? 'Mark Pending' : 'Mark Complete'}
                    </button>
                    <button class="btn-small btn-delete" onclick="deleteOrder(${order.id})">Delete</button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function displayOrdersMobile() {
    const container = document.getElementById('ordersMobile');
    container.innerHTML = '';
    
    const paginatedOrders = getOrdersPaginatedData();
    
    paginatedOrders.forEach(order => {
        const card = document.createElement('div');
        card.className = 'mobile-card';
        
        const customerName = `${order.customer.firstName} ${order.customer.lastName}`;
        const totalQuantity = order.totalQuantity || order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        const itemsText = `${order.itemCount} items (${totalQuantity} total)`;
        
        card.innerHTML = `
            <div class="mobile-card-header">
                <div class="mobile-card-image">📦</div>
                <div class="mobile-card-info">
                    <div class="mobile-card-title">${order.orderNumber || `#${order.id}`}</div>
                    <div class="mobile-card-subtitle">${new Date(order.orderDate).toLocaleDateString()}</div>
                </div>
            </div>
            <div class="mobile-card-body">
                <div class="mobile-field">
                    <div class="mobile-field-label">Customer</div>
                    <div class="mobile-field-value">${customerName}</div>
                </div>
                <div class="mobile-field">
                    <div class="mobile-field-label">Phone</div>
                    <div class="mobile-field-value">${order.customer.phone}</div>
                </div>
                <div class="mobile-field">
                    <div class="mobile-field-label">Items</div>
                    <div class="mobile-field-value">${itemsText}</div>
                </div>
                <div class="mobile-field">
                    <div class="mobile-field-label">Total</div>
                    <div class="mobile-field-value"><strong>${order.total.toFixed(3)} OMR</strong></div>
                </div>
                <div class="mobile-field">
                    <div class="mobile-field-label">Status</div>
                    <div class="mobile-field-value">
                        <span class="status-badge ${order.status === 'completed' ? 'status-completed' : 'status-pending'}">
                            ${order.status === 'completed' ? 'Completed' : 'Pending'}
                        </span>
                    </div>
                </div>
            </div>
            <div class="action-buttons">
                <button class="btn-small btn-edit" onclick="viewOrder(${order.id})">View</button>
                <button class="btn-small ${order.status === 'completed' ? 'btn-hide' : 'btn-show'}"
                        onclick="toggleOrderStatus(${order.id})">
                    ${order.status === 'completed' ? 'Mark Pending' : 'Mark Complete'}
                </button>
                <button class="btn-small btn-delete" onclick="deleteOrder(${order.id})">Delete</button>
            </div>
        `;
        
        container.appendChild(card);
    });
}

function showFragrancesError() {
    document.getElementById('fragrancesLoading').style.display = 'none';
    document.getElementById('fragrancesTable').style.display = 'none';
    document.getElementById('fragrancesMobile').style.display = 'none';
    document.getElementById('fragrancesControls').style.display = 'none';
    document.getElementById('fragrancesEmpty').style.display = 'block';
    document.querySelector('#fragrancesEmpty h3').textContent = 'Error loading fragrances';
    document.querySelector('#fragrancesEmpty p').textContent = 'Please refresh the page to try again';
}

function updateStats() {
    const totalFragrances = fragrances.length;
    const visibleFragrances = fragrances.filter(f => !f.hidden).length;
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status !== 'completed').length;
    
    document.getElementById('totalFragrances').textContent = totalFragrances;
    document.getElementById('visibleFragrances').textContent = visibleFragrances;
    document.getElementById('totalOrders').textContent = totalOrders;
    document.getElementById('pendingOrders').textContent = pendingOrders;
}

// Load Fragrances (updated to handle pagination)
async function loadFragrances() {
    try {
        const response = await fetch('/admin/fragrances', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                fragrances = result.data || [];
                // Reset pagination when loading new data
                fragrancesPage = 1;
                displayFragrances();
            } else {
                throw new Error(result.error);
            }
        } else if (response.status === 401) {
            window.location.href = '/login.html';
        } else {
            throw new Error('Failed to load fragrances');
        }
    } catch (error) {
        console.error('Error loading fragrances:', error);
        showFragrancesError();
    }
}

// Load Orders (updated to initialize service worker)
async function loadOrders() {
    try {
        const response = await fetch('/admin/orders', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                orders = result.data || [];
                // Reset pagination when loading new data
                ordersPage = 1;
                displayOrders();
                
                // Update service worker with current orders if notifications are enabled
                const notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';
                if (notificationsEnabled && serviceWorker && serviceWorker.active) {
                    const currentOrderIds = orders.map(order => order.id);
                    sendMessageToServiceWorker('INIT_KNOWN_ORDERS', {
                        orderIds: currentOrderIds
                    }).catch(error => {
                        console.warn('Failed to update service worker with order IDs:', error);
                    });
                }
            } else {
                orders = [];
                displayOrders();
            }
        } else {
            orders = [];
            displayOrders();
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        orders = [];
        displayOrders();
    }
}

// Remove old polling functions and replace with service worker monitoring
function startOrderPolling() {
    // Legacy function - now handled by service worker
    console.log('Order polling is now handled by Service Worker');
}

function stopOrderPolling() {
    // Legacy function - now handled by service worker
    console.log('Order polling stop is now handled by Service Worker');
}
function checkForNewOrders() {
    // Legacy function - now handled by service worker
    console.log('Order checking is now handled by Service Worker');

    // Example fallback (optional)
    try {
        let orders = [];
        displayOrders();
    } catch (error) {
        console.error("Error displaying orders:", error);
    }
}

// Handle responsive behavior (updated)
function handleResize() {
    const newIsMobile = window.innerWidth <= 768;
    if (newIsMobile !== isMobile) {
        isMobile = newIsMobile;
        // Re-render data with appropriate view
        if (fragrances.length > 0) {
            displayFragrances();
        }
        if (orders.length > 0) {
            displayOrders();
        }
    }
}
    
    if (orders.length === 0) {
        table.style.display = 'none';
        mobile.style.display = 'none';
        empty.style.display = 'block';
        return;
    }
    
    empty.style.display = 'none';
    
    if (isMobile) {
        // Show mobile card view
        table.style.display = 'none';
        mobile.style.display = 'block';
        displayOrdersMobile();
    } else {
        // Show desktop table view
        mobile.style.display = 'none';
        table.style.display = 'block';
        displayOrdersTable();
    }

function displayOrdersTable() {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = '';
    
    orders.forEach(order => {
        const row = document.createElement('tr');
        
        const customerName = `${order.customer.firstName} ${order.customer.lastName}`;
        const totalQuantity = order.totalQuantity || 0;
        const itemsText = `${order.itemCount} items (${totalQuantity} total)`;
        
        row.innerHTML = `
            <td>
                <strong>${order.orderNumber || `#${order.id}`}</strong>
                <br><small style="color: #666;">${new Date(order.orderDate).toLocaleDateString()}</small>
            </td>
            <td>
                <strong style="word-break: break-word;">${customerName}</strong>
                <br><small style="color: #666; word-break: break-all;">${order.customer.phone}</small>
            </td>
            <td>${itemsText}</td>
            <td><strong>${order.total.toFixed(3)} OMR</strong></td>
            <td>
                <span class="status-badge ${order.status === 'completed' ? 'status-completed' : 'status-pending'}">
                    ${order.status === 'completed' ? 'Completed' : 'Pending'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-small btn-edit" onclick="viewOrder(${order.id})">View</button>
                    <button class="btn-small ${order.status === 'completed' ? 'btn-hide' : 'btn-show'}"
                            onclick="toggleOrderStatus(${order.id})">
                        ${order.status === 'completed' ? 'Mark Pending' : 'Mark Complete'}
                    </button>
                    <button class="btn-small btn-delete" onclick="deleteOrder(${order.id})">Delete</button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function displayOrdersMobile() {
    const container = document.getElementById('ordersMobile');
    container.innerHTML = '';
    
    orders.forEach(order => {
        const card = document.createElement('div');
        card.className = 'mobile-card';
        
        const customerName = `${order.customer.firstName} ${order.customer.lastName}`;
        const totalQuantity = order.totalQuantity || 0;
        const itemsText = `${order.itemCount} items (${totalQuantity} total)`;
        
        card.innerHTML = `
            <div class="mobile-card-header">
                <div class="mobile-card-image">📦</div>
                <div class="mobile-card-info">
                    <div class="mobile-card-title">${order.orderNumber || `#${order.id}`}</div>
                    <div class="mobile-card-subtitle">${new Date(order.orderDate).toLocaleDateString()}</div>
                </div>
            </div>
            <div class="mobile-card-body">
                <div class="mobile-field">
                    <div class="mobile-field-label">Customer</div>
                    <div class="mobile-field-value">${customerName}</div>
                </div>
                <div class="mobile-field">
                    <div class="mobile-field-label">Phone</div>
                    <div class="mobile-field-value">${order.customer.phone}</div>
                </div>
                <div class="mobile-field">
                    <div class="mobile-field-label">Items</div>
                    <div class="mobile-field-value">${itemsText}</div>
                </div>
                <div class="mobile-field">
                    <div class="mobile-field-label">Total</div>
                    <div class="mobile-field-value"><strong>${order.total.toFixed(3)} OMR</strong></div>
                </div>
                <div class="mobile-field">
                    <div class="mobile-field-label">Status</div>
                    <div class="mobile-field-value">
                        <span class="status-badge ${order.status === 'completed' ? 'status-completed' : 'status-pending'}">
                            ${order.status === 'completed' ? 'Completed' : 'Pending'}
                        </span>
                    </div>
                </div>
            </div>
            <div class="action-buttons">
                <button class="btn-small btn-edit" onclick="viewOrder(${order.id})">View</button>
                <button class="btn-small ${order.status === 'completed' ? 'btn-hide' : 'btn-show'}"
                        onclick="toggleOrderStatus(${order.id})">
                    ${order.status === 'completed' ? 'Mark Pending' : 'Mark Complete'}
                </button>
                <button class="btn-small btn-delete" onclick="deleteOrder(${order.id})">Delete</button>
            </div>
        `;
        
        container.appendChild(card);
    });
}

function showFragrancesError() {
    document.getElementById('fragrancesLoading').style.display = 'none';
    document.getElementById('fragrancesTable').style.display = 'none';
    document.getElementById('fragrancesMobile').style.display = 'none';
    document.getElementById('fragrancesEmpty').style.display = 'block';
    document.querySelector('#fragrancesEmpty h3').textContent = 'Error loading fragrances';
    document.querySelector('#fragrancesEmpty p').textContent = 'Please refresh the page to try again';
}

function updateStats() {
    const totalFragrances = fragrances.length;
    const visibleFragrances = fragrances.filter(f => !f.hidden).length;
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status !== 'completed').length;
    
    document.getElementById('totalFragrances').textContent = totalFragrances;
    document.getElementById('visibleFragrances').textContent = visibleFragrances;
    document.getElementById('totalOrders').textContent = totalOrders;
    document.getElementById('pendingOrders').textContent = pendingOrders;
}

// Image Upload Functions
function initializeImageUpload() {
    const imageInput = document.getElementById('fragranceImage');
    if (imageInput) {
        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (!file.type.includes('png')) {
                    showCustomAlert('Only PNG files are allowed');
                    this.value = '';
                    return;
                }
                if (file.size > 5 * 1024 * 1024) {
                    showCustomAlert('Image too large. Maximum size is 5MB.');
                    this.value = '';
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('previewImg').src = e.target.result;
                    document.getElementById('imagePreview').style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

function clearImage() {
    const imageInput = document.getElementById('fragranceImage');
    const imagePreview = document.getElementById('imagePreview');
    if (imageInput) imageInput.value = '';
    if (imagePreview) imagePreview.style.display = 'none';
}

async function uploadImageIfPresent(slug) {
    const imageFile = document.getElementById('fragranceImage').files[0];
    if (!imageFile) return null;
    
    console.log('Uploading image for slug:', slug);
    
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('slug', slug);
    
    const response = await fetch('/admin/upload-image', {
        method: 'POST',
        credentials: 'include',
        body: formData
    });
    
    if (response.ok) {
        const result = await response.json();
        console.log('Image upload successful:', result);
        return result.data.path;
    } else {
        const error = await response.json();
        console.error('Image upload failed:', error);
        throw new Error(error.error || 'Image upload failed');
    }
}

// Fragrance Management
function openAddFragranceModal() {
    currentEditingId = null;
    document.getElementById('fragranceModalTitle').textContent = 'Add New Fragrance';
    document.getElementById('fragranceForm').reset();
    clearImage();
    
    // Reset variants to default
    document.getElementById('variant5ml').checked = true;
    document.getElementById('variant10ml').checked = true;
    document.getElementById('variant30ml').checked = true;
    document.getElementById('variantFull').checked = true;
    
    // Reset variant prices to defaults
    const price5ml = document.querySelector('#variant5ml').parentElement.querySelector('input[type="number"]');
    const price10ml = document.querySelector('#variant10ml').parentElement.querySelector('input[type="number"]');
    const price30ml = document.querySelector('#variant30ml').parentElement.querySelector('input[type="number"]');
    
    if (price5ml) price5ml.value = '2.500';
    if (price10ml) price10ml.value = '4.500';
    if (price30ml) price30ml.value = '12.000';
    
    document.getElementById('fragranceModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function editFragrance(id) {
    const fragrance = fragrances.find(f => f.id === id);
    if (!fragrance) {
        console.error('Fragrance not found:', id);
        showCustomAlert('Fragrance not found. Please refresh the page.');
        return;
    }
    
    currentEditingId = id;
    document.getElementById('fragranceModalTitle').textContent = 'Edit Fragrance';
    
    document.getElementById('fragranceId').value = fragrance.id;
    document.getElementById('fragranceName').value = fragrance.name;
    document.getElementById('fragranceBrand').value = fragrance.brand || '';
    document.getElementById('fragranceDescription').value = fragrance.description || '';
    
    // Clear image preview
    clearImage();
    
    // Show existing image if available
    if (fragrance.image_path) {
        const imageUrl = `/api/image/${fragrance.image_path.replace('fragrance-images/', '')}`;
        document.getElementById('previewImg').src = imageUrl;
        document.getElementById('imagePreview').style.display = 'block';
    }
    
    // Reset variants
    document.getElementById('variant5ml').checked = false;
    document.getElementById('variant10ml').checked = false;
    document.getElementById('variant30ml').checked = false;
    document.getElementById('variantFull').checked = false;
    
    // Set existing variants
    if (fragrance.variants) {
        fragrance.variants.forEach(variant => {
            if (variant.is_whole_bottle) {
                document.getElementById('variantFull').checked = true;
            } else if (variant.size === '5ml') {
                document.getElementById('variant5ml').checked = true;
                const priceInput = document.querySelector('#variant5ml').parentElement.querySelector('input[type="number"]');
                if (priceInput) priceInput.value = variant.price.toFixed(3);
            } else if (variant.size === '10ml') {
                document.getElementById('variant10ml').checked = true;
                const priceInput = document.querySelector('#variant10ml').parentElement.querySelector('input[type="number"]');
                if (priceInput) priceInput.value = variant.price.toFixed(3);
            } else if (variant.size === '30ml') {
                document.getElementById('variant30ml').checked = true;
                const priceInput = document.querySelector('#variant30ml').parentElement.querySelector('input[type="number"]');
                if (priceInput) priceInput.value = variant.price.toFixed(3);
            }
        });
    }
    
    document.getElementById('fragranceModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeFragranceModal() {
    document.getElementById('fragranceModal').classList.remove('active');
    document.getElementById('fragranceForm').reset();
    clearImage();
    currentEditingId = null;
    document.body.style.overflow = 'auto';
}

async function toggleFragranceVisibility(id, hide) {
    try {
        const response = await fetch('/admin/toggle-fragrance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ id, hidden: hide })
        });
        
        const result = await response.json();
        if (result.success) {
            await loadFragrances();
            updateStats();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error toggling visibility:', error);
        showCustomAlert('Failed to update fragrance visibility');
    }
}

async function deleteFragrance(id) {
    const fragrance = fragrances.find(f => f.id === id);
    if (!fragrance) return;
    
    showCustomConfirm(`Delete "${fragrance.name}"? This action cannot be undone.`, async () => {
        try {
            const response = await fetch('/admin/delete-fragrance', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ id })
            });
            
            const result = await response.json();
            if (result.success) {
                await loadFragrances();
                updateStats();
                showCustomAlert('Fragrance deleted successfully!');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error deleting fragrance:', error);
            showCustomAlert('Failed to delete fragrance');
        }
    });
}

// Order Management
function viewOrder(id) {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    
    let orderDetails = `Order ${order.orderNumber || `#${order.id}`}\n\n`;
    orderDetails += `Customer: ${order.customer.firstName} ${order.customer.lastName}\n`;
    orderDetails += `Phone: ${order.customer.phone}\n`;
    if (order.customer.email) orderDetails += `Email: ${order.customer.email}\n`;
    orderDetails += `\nDelivery Address:\n${order.delivery.address}\n`;
    orderDetails += `${order.delivery.city}`;
    if (order.delivery.region) orderDetails += `, ${order.delivery.region}`;
    orderDetails += `\n\nItems:\n`;
    
    order.items.forEach((item, index) => {
        const brandName = item.fragranceBrand ? `${item.fragranceBrand} ` : '';
        orderDetails += `${index + 1}. ${brandName}${item.fragranceName}\n`;
        orderDetails += `   ${item.variantSize} × ${item.quantity}`;
        if (!item.isWholeBottle) {
            orderDetails += ` @ ${item.variantPrice.toFixed(3)} OMR each`;
            orderDetails += ` = ${item.totalPrice.toFixed(3)} OMR`;
        } else {
            orderDetails += ` (Contact for pricing)`;
        }
        orderDetails += `\n`;
    });
    
    const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
    orderDetails += `\nTotal Items: ${totalQuantity}\n`;
    orderDetails += `Total Amount: ${order.total.toFixed(3)} OMR\n`;
    orderDetails += `Status: ${order.status}\n`;
    orderDetails += `Order Date: ${new Date(order.orderDate).toLocaleString()}`;
    
    if (order.notes) {
        orderDetails += `\n\nNotes: ${order.notes}`;
    }
    
    showCustomAlert(orderDetails);
}

async function toggleOrderStatus(id) {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    
    const newStatus = order.status === 'completed' ? 'pending' : 'completed';
    
    try {
        const response = await fetch('/admin/update-order-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ id, status: newStatus })
        });
        
        const result = await response.json();
        if (result.success) {
            await loadOrders();
            updateStats();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        showCustomAlert('Failed to update order status');
    }
}

async function deleteOrder(id) {
    showCustomConfirm('Delete this order? This action cannot be undone.', async () => {
        try {
            const response = await fetch('/admin/delete-order', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ id })
            });
            
            const result = await response.json();
            if (result.success) {
                await loadOrders();
                updateStats();
                showCustomAlert('Order deleted successfully!');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error deleting order:', error);
            showCustomAlert('Failed to delete order');
        }
    });
}

// Form Handlers
function initializeFormHandlers() {
    const fragranceForm = document.getElementById('fragranceForm');
    if (fragranceForm) {
        fragranceForm.addEventListener('submit', handleFragranceFormSubmit);
    }
}

async function handleFragranceFormSubmit(e) {
    e.preventDefault();
    
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;
    
    try {
        const formData = {
            name: document.getElementById('fragranceName').value.trim(),
            brand: document.getElementById('fragranceBrand').value.trim(),
            description: document.getElementById('fragranceDescription').value.trim(),
            slug: document.getElementById('fragranceName').value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            variants: []
        };
        
        // Collect variants
        const variantInputs = [
            { id: 'variant5ml', size: '5ml', size_ml: 5 },
            { id: 'variant10ml', size: '10ml', size_ml: 10 },
            { id: 'variant30ml', size: '30ml', size_ml: 30 },
            { id: 'variantFull', size: 'Whole Bottle', is_whole_bottle: true }
        ];
        
        variantInputs.forEach(variant => {
            const checkbox = document.getElementById(variant.id);
            if (checkbox && checkbox.checked) {
                if (variant.is_whole_bottle) {
                    formData.variants.push({
                        size: variant.size,
                        is_whole_bottle: true,
                        price: null,
                        size_ml: null
                    });
                } else {
                    const priceInput = checkbox.parentElement.querySelector('input[type="number"]');
                    const price = parseFloat(priceInput.value);
                    if (price > 0) {
                        formData.variants.push({
                            size: variant.size,
                            size_ml: variant.size_ml,
                            price: price,
                            is_whole_bottle: false
                        });
                    }
                }
            }
        });
        
        if (formData.variants.length === 0) {
            showCustomAlert('Please select at least one variant');
            return;
        }
        
        // Upload image if present
        try {
            const imagePath = await uploadImageIfPresent(formData.slug);
            if (imagePath) {
                formData.image = imagePath;
            }
        } catch (error) {
            showCustomAlert('Image upload failed: ' + error.message);
            return;
        }
        
        if (currentEditingId) {
            formData.id = currentEditingId;
        }
        
        const endpoint = currentEditingId ? '/admin/update-fragrance' : '/admin/add-fragrance';
        const method = currentEditingId ? 'PUT' : 'POST';
        
        console.log('Submitting fragrance data:', formData);
        
        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        console.log('Server response:', result);
        
        if (result.success) {
            closeFragranceModal();
            await loadFragrances();
            updateStats();
            showCustomAlert(currentEditingId ? 'Fragrance updated successfully!' : 'Fragrance added successfully!');
        } else {
            throw new Error(result.error || 'Unknown error');
        }
    } catch (error) {
        console.error('Error saving fragrance:', error);
        showCustomAlert('Failed to save fragrance: ' + error.message);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Notification Settings
function loadNotificationSettings() {
    const enabled = localStorage.getItem('notificationsEnabled') === 'true';
    const checkbox = document.getElementById('notificationsEnabled');
    if (checkbox) {
        checkbox.checked = enabled;
    }
    
    // Check notification permission status
    if ('Notification' in window && enabled) {
        if (Notification.permission === 'granted') {
            console.log('Notifications are enabled and permission granted');
        } else if (Notification.permission === 'denied') {
            console.log('Notifications denied by user');
            showCustomAlert('Notifications are blocked in your browser. Please enable them in browser settings to receive order notifications.');
        }
    }
}

async function toggleNotifications() {
    const enabled = document.getElementById('notificationsEnabled').checked;
    localStorage.setItem('notificationsEnabled', enabled);
    
    if (enabled && 'Notification' in window) {
        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                showCustomAlert('✅ Order notifications enabled! You will now receive notifications for new orders.');
                // Send a welcome notification
                showOrderNotification({
                    title: 'Notifications Enabled',
                    body: 'You will now receive notifications for new orders.',
                    icon: '🔔'
                });
                // Start polling for new orders
                startOrderPolling();
            } else if (permission === 'denied') {
                document.getElementById('notificationsEnabled').checked = false;
                localStorage.setItem('notificationsEnabled', 'false');
                showCustomAlert('❌ Notification permission denied. Please enable notifications in your browser settings to receive order alerts.');
            }
        } else if (Notification.permission === 'granted') {
            showCustomAlert('✅ Order notifications enabled!');
            // Start polling for new orders
            startOrderPolling();
        } else {
            document.getElementById('notificationsEnabled').checked = false;
            localStorage.setItem('notificationsEnabled', 'false');
            showCustomAlert('❌ Notifications are blocked. Please enable them in your browser settings.');
        }
    } else if (!enabled) {
        showCustomAlert('Order notifications disabled.');
        // Stop polling for orders
        stopOrderPolling();
    } else {
        showCustomAlert('❌ Your browser does not support notifications.');
    }
}

function testNotification() {
    if (!('Notification' in window)) {
        showCustomAlert('❌ Your browser does not support notifications.');
        return;
    }
    
    if (Notification.permission !== 'granted') {
        showCustomAlert('❌ Please enable notifications first by checking the "Enable Order Notifications" checkbox.');
        return;
    }
    
    const notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';
    if (!notificationsEnabled) {
        showCustomAlert('❌ Please enable notifications first by checking the "Enable Order Notifications" checkbox.');
        return;
    }
    
    // Test notification data
    const testOrderData = {
        orderNumber: 'ORD-TEST123',
        customerName: 'Test Customer',
        total: '15.500',
        itemCount: 3
    };
    
    showOrderNotification({
        title: '🧪 Test Order Notification',
        body: `New order ${testOrderData.orderNumber} from ${testOrderData.customerName}\n💰 Total: ${testOrderData.total} OMR | 📦 ${testOrderData.itemCount} items`,
        icon: '/favicon.ico',
        data: testOrderData,
        tag: 'test-order'
    });
    
    showCustomAlert('✅ Test notification sent! Check your browser for the notification.');
}

function showOrderNotification(options) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        console.log('Notifications not available or not permitted');
        return;
    }
    
    const notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';
    if (!notificationsEnabled) {
        console.log('Notifications disabled by user');
        return;
    }
    
    try {
        const notification = new Notification(options.title, {
            body: options.body,
            icon: options.icon || '/favicon.ico',
            badge: '/favicon.ico',
            tag: options.tag || 'qotore-order',
            data: options.data || {},
            requireInteraction: true, // Keep notification visible until user interacts
            silent: false,
            timestamp: Date.now(),
            actions: [
                {
                    action: 'view',
                    title: 'View Orders',
                    icon: '/favicon.ico'
                },
                {
                    action: 'dismiss',
                    title: 'Dismiss',
                    icon: '/favicon.ico'
                }
            ]
        });
        
        // Handle notification click
        notification.onclick = function(event) {
            event.preventDefault();
            window.focus(); // Focus the admin window
            notification.close();
            
            // Scroll to orders section if not test notification
            if (options.tag !== 'test-order') {
                document.querySelector('.section:nth-child(3)').scrollIntoView({
                    behavior: 'smooth'
                });
                
                // Refresh orders to show the new one
                loadOrders();
            }
        };
        
        // Auto-close after 10 seconds if not requiring interaction
        if (!options.requireInteraction) {
            setTimeout(() => {
                notification.close();
            }, 10000);
        }
        
        console.log('Order notification sent:', options.title);
        
    } catch (error) {
        console.error('Error showing notification:', error);
    }
}

function showOrderNotification(options) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        console.log('Notifications not available or not permitted');
        return;
    }
    
    const notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';
    if (!notificationsEnabled) {
        console.log('Notifications disabled by user');
        return;
    }
    
    try {
        const notification = new Notification(options.title, {
            body: options.body,
            icon: options.icon || '/favicon.ico',
            badge: '/favicon.ico',
            tag: options.tag || 'qotore-order',
            data: options.data || {},
            requireInteraction: true, // Keep notification visible until user interacts
            silent: false,
            timestamp: Date.now(),
            actions: [
                {
                    action: 'view',
                    title: 'View Orders',
                    icon: '/favicon.ico'
                },
                {
                    action: 'dismiss',
                    title: 'Dismiss',
                    icon: '/favicon.ico'
                }
            ]
        });
        
        // Handle notification click
        notification.onclick = function(event) {
            event.preventDefault();
            window.focus(); // Focus the admin window
            notification.close();
            
            // Scroll to orders section if not test notification
            if (options.tag !== 'test-order') {
                document.querySelector('.section:nth-child(3)').scrollIntoView({
                    behavior: 'smooth'
                });
                
                // Refresh orders to show the new one
                loadOrders();
            }
        };
        
        // Auto-close after 10 seconds if not requiring interaction
        if (!options.requireInteraction) {
            setTimeout(() => {
                notification.close();
            }, 10000);
        }
        
        console.log('Order notification sent:', options.title);
        
    } catch (error) {
        console.error('Error showing notification:', error);
    }
}

let orderCheckInterval = null;
let lastOrderCount = 0;
let knownOrderIds = new Set();

// These variables are kept for backward compatibility but functionality moved to service worker

// Logout Function
async function logout() {
    showCustomConfirm('Are you sure you want to logout?', async () => {
        try {
            await fetch('/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
        
        document.cookie = 'admin_session=; Path=/; Max-Age=0';
        window.location.href = '/login.html';
    });
}

// Close modals when clicking outside
document.addEventListener('DOMContentLoaded', function() {
    const fragranceModal = document.getElementById('fragranceModal');
    if (fragranceModal) {
        fragranceModal.addEventListener('click', function(e) {
            if (e.target === this) closeFragranceModal();
        });
    }
});

// ESC key to close modals
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeFragranceModal();
        closeCustomModal();
    }
});

// Custom Modal Functions
function showCustomAlert(message, onClose) {
    createCustomModal({
        title: 'Notice',
        message: message,
        type: 'alert',
        buttons: [
            { text: 'OK', action: onClose || 'close', primary: true }
        ]
    });
}

function showCustomConfirm(message, onConfirm) {
    createCustomModal({
        title: 'Confirm',
        message: message,
        type: 'confirm',
        buttons: [
            { text: 'Cancel', action: 'close', primary: false },
            { text: 'Confirm', action: onConfirm, primary: true }
        ]
    });
}

function createCustomModal(config) {
    // Remove existing custom modal if any
    const existingModal = document.getElementById('customModal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'customModal';
    modal.className = 'custom-modal';
    
    modal.innerHTML = `
        <div class="custom-modal-content">
            <div class="custom-modal-header">
                <h3>${config.title}</h3>
            </div>
            <div class="custom-modal-body">
                <p>${config.message}</p>
            </div>
            <div class="custom-modal-footer">
                ${config.buttons.map((button, index) => `
                    <button class="custom-modal-btn ${button.primary ? 'primary' : 'secondary'}" 
                            data-action-index="${index}">
                        ${button.text}
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    
    // Show modal with animation
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);

    // Add event listeners
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeCustomModal();
        }
    });

    modal.querySelectorAll('.custom-modal-btn').forEach((btn, index) => {
        btn.addEventListener('click', function() {
            const actionIndex = parseInt(this.getAttribute('data-action-index'));
            const button = config.buttons[actionIndex];
            
            closeCustomModal();
            
            if (button.action !== 'close' && typeof button.action === 'function') {
                button.action();
            }
        });
    });
}

function closeCustomModal() {
    const modal = document.getElementById('customModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// Touch and gesture support for mobile
document.addEventListener('touchstart', function(e) {
    // Improve touch responsiveness
}, { passive: true });

// Prevent zoom on input focus for iOS
document.addEventListener('DOMContentLoaded', function() {
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            if (window.navigator.userAgent.includes('iPhone') || window.navigator.userAgent.includes('iPad')) {
                this.style.fontSize = '16px';
            }
        });
        
        input.addEventListener('blur', function() {
            this.style.fontSize = '';
        });
    });
});

// Handle orientation change
window.addEventListener('orientationchange', function() {
    setTimeout(() => {
        handleResize();
    }, 500);
});

// Optimized scroll handling for mobile
let ticking = false;
function handleScroll() {
    if (!ticking) {
        requestAnimationFrame(() => {
            // Handle any scroll-based interactions here
            ticking = false;
        });
        ticking = true;
    }
}

window.addEventListener('scroll', handleScroll, { passive: true });

// Enhanced touch feedback
document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('.btn-small, .btn-primary, .nav-btn');
    buttons.forEach(button => {
        button.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.95)';
        }, { passive: true });
        
        button.addEventListener('touchend', function() {
            this.style.transform = '';
        }, { passive: true });
    });
});

// Network status handling
window.addEventListener('online', function() {
    console.log('Network connection restored');
    // Optionally refresh data
});

window.addEventListener('offline', function() {
    console.log('Network connection lost');
    showCustomAlert('Network connection lost. Some features may not work until connection is restored.');
});

// Performance optimizations
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Debounced resize handler
const debouncedResize = debounce(handleResize, 250);
window.addEventListener('resize', debouncedResize);

// Lazy loading for images (if needed in future)
function observeImages() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                }
            });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}}