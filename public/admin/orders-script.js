// Admin Orders Dashboard JavaScript

// Global variables
let orders = [];
let filteredOrders = [];
let currentFilter = 'all';
let currentPage = 1;
let ordersPerPage = 10;
let searchTerm = '';
let isNotificationsEnabled = false;
let serviceWorker = null;
let lastKnownOrderIds = new Set();

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Admin Orders Dashboard Loading...');
    initializeApp();
});

async function initializeApp() {
    try {
        // Check authentication first
        if (!isAuthenticated()) {
            redirectToLogin();
            return;
        }
        
        // Initialize PWA features
        await initializePWA();
        
        // Load initial data
        await loadOrders();
        
        // Initialize notifications
        initializeNotifications();
        
        // Set up event listeners
        setupEventListeners();
        
        console.log('✅ Admin Orders Dashboard Ready');
        showToast('Dashboard loaded successfully', 'success');
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        showToast('Failed to initialize dashboard', 'error');
    }
}

function isAuthenticated() {
    const cookies = document.cookie.split(';');
    return cookies.some(cookie => cookie.trim().startsWith('admin_session='));
}

function redirectToLogin() {
    showToast('Session expired. Redirecting to login...', 'warning');
    setTimeout(() => {
        window.location.href = '/login.html';
    }, 2000);
}

// PWA Initialization
async function initializePWA() {
    try {
        // Register service worker
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.register('/admin/sw.js');
            console.log('✅ Service Worker registered:', registration.scope);
            
            serviceWorker = registration.active || registration.waiting || registration.installing;
            
            // Listen for service worker messages
            navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
            
            // Request notification permission for iOS/Desktop
            if ('Notification' in window) {
                const permission = await Notification.requestPermission();
                console.log('📱 Notification permission:', permission);
            }
        }
        
        // Handle PWA install prompt
        window.addEventListener('beforeinstallprompt', handleInstallPrompt);
        
        // Handle visibility changes for battery optimization
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
    } catch (error) {
        console.error('❌ PWA initialization failed:', error);
    }
}

function handleServiceWorkerMessage(event) {
    const { type, data } = event.data;
    
    switch (type) {
        case 'NEW_ORDER_DETECTED':
            showNewOrderNotification(data);
            refreshData(true);
            break;
        case 'CONNECTION_STATUS':
            updateConnectionStatus(data.online);
            break;
        case 'SW_ERROR':
            console.error('Service Worker Error:', data);
            break;
    }
}

function handleInstallPrompt(event) {
    event.preventDefault();
    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
        installBtn.style.display = 'block';
        installBtn.addEventListener('click', () => {
            event.prompt();
        });
    }
}

function handleVisibilityChange() {
    const isVisible = !document.hidden;
    if (serviceWorker) {
        serviceWorker.postMessage({
            type: 'PAGE_VISIBILITY',
            visible: isVisible
        });
    }
}

// Initialize notifications system
function initializeNotifications() {
    console.log('🔔 Initializing notification system...');
    
    // Check if notifications are supported
    if (!('Notification' in window)) {
        console.warn('⚠️ Notifications not supported in this environment');
        const notificationToggle = document.getElementById('notificationToggle');
        if (notificationToggle) {
            notificationToggle.disabled = true;
            notificationToggle.parentElement.title = 'Notifications not supported in this browser';
        }
        return;
    }
    
    // Load saved notification preferences
    const savedState = localStorage.getItem('notificationsEnabled') === 'true';
    const notificationToggle = document.getElementById('notificationToggle');
    
    if (notificationToggle) {
        notificationToggle.checked = savedState;
        isNotificationsEnabled = savedState;
        
        // Initialize monitoring if enabled
        if (isNotificationsEnabled && Notification.permission === 'granted') {
            startNotificationMonitoring();
        }
    }
    
    updateNotificationStatus();
    console.log('✅ Notification system initialized');
}

// Event Listeners
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('ordersSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
        searchInput.addEventListener('input', function() {
            const clearBtn = document.getElementById('ordersClearSearch');
            if (clearBtn) {
                clearBtn.style.display = this.value.length > 0 ? 'block' : 'none';
            }
        });
    }
    
    // Clear search button
    const clearSearchBtn = document.getElementById('ordersClearSearch');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearOrdersSearch);
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => refreshData());
    }
    
    // Items per page dropdown
    const itemsPerPageSelect = document.getElementById('ordersPerPage');
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', function() {
            ordersPerPage = parseInt(this.value);
            currentPage = 1;
            applyFiltersAndPagination();
        });
    }
    
    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;
            if (filter !== currentFilter) {
                // Update active state
                filterButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Apply filter
                currentFilter = filter;
                currentPage = 1;
                applyFiltersAndPagination();
            }
        });
    });
    
    // Notification toggle
    const notificationToggle = document.getElementById('notificationToggle');
    if (notificationToggle) {
        notificationToggle.addEventListener('change', handleNotificationToggle);
    }
    
    // Auto-refresh every 30 seconds if notifications enabled
    setInterval(() => {
        if (isNotificationsEnabled && !document.hidden) {
            refreshData(true); // Silent refresh
        }
    }, 30000);
}

function handleSearch(event) {
    searchTerm = event.target.value.toLowerCase().trim();
    console.log('🔍 Searching:', searchTerm);
    applyFiltersAndPagination();
}

function clearOrdersSearch() {
    const searchInput = document.getElementById('ordersSearch');
    const clearBtn = document.getElementById('ordersClearSearch');
    
    if (searchInput) {
        searchInput.value = '';
        searchTerm = '';
        clearBtn.style.display = 'none';
        applyFiltersAndPagination();
    }
}

async function handleNotificationToggle(event) {
    const isEnabled = event.target.checked;
    console.log('🔔 Notifications toggled:', isEnabled);
    
    try {
        if (isEnabled) {
            // Request permission if needed
            if ('Notification' in window) {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    event.target.checked = false;
                    showToast('Notification permission denied', 'error');
                    return;
                }
            }
            
            // Start monitoring
            await startNotificationMonitoring();
            isNotificationsEnabled = true;
            showToast('Order notifications enabled', 'success');
        } else {
            // Stop monitoring
            await stopNotificationMonitoring();
            isNotificationsEnabled = false;
            showToast('Order notifications disabled', 'info');
        }
        
        // Save state
        localStorage.setItem('notificationsEnabled', isNotificationsEnabled);
        updateNotificationStatus();
        
    } catch (error) {
        console.error('❌ Notification toggle failed:', error);
        event.target.checked = false;
        showToast('Failed to toggle notifications', 'error');
    }
}

async function startNotificationMonitoring() {
    if (serviceWorker) {
        // Initialize known orders to prevent false notifications on first load
        const knownOrderIds = orders.map(order => order.id);
        lastKnownOrderIds = new Set(knownOrderIds);
        
        const channel = new MessageChannel();
        serviceWorker.postMessage({
            type: 'START_ORDER_MONITORING',
            enabled: true
        }, [channel.port2]);
        
        serviceWorker.postMessage({
            type: 'INIT_KNOWN_ORDERS',
            orderIds: knownOrderIds
        });
        
        console.log('🔔 Notification monitoring started');
    }
}

async function stopNotificationMonitoring() {
    if (serviceWorker) {
        const channel = new MessageChannel();
        serviceWorker.postMessage({
            type: 'STOP_ORDER_MONITORING'
        }, [channel.port2]);
        
        console.log('🔔 Notification monitoring stopped');
    }
}

function updateNotificationStatus() {
    const statusEl = document.getElementById('notificationStatus');
    if (statusEl) {
        statusEl.style.display = isNotificationsEnabled ? 'flex' : 'none';
    }
}

// Data Loading Functions
async function loadOrders() {
    console.log('📊 Loading orders...');
    showLoadingState();
    
    try {
        const response = await fetch('/admin/orders', {
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                redirectToLogin();
                return;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
            orders = result.data;
            console.log(`✅ Loaded ${orders.length} orders`);
            
            updateStats(result.stats);
            applyFiltersAndPagination();
            
            // Check for new orders if notifications are enabled
            if (isNotificationsEnabled && lastKnownOrderIds.size > 0) {
                checkForNewOrders();
            }
            
            showOrdersContent();
        } else {
            throw new Error(result.error || 'Failed to load orders');
        }
        
    } catch (error) {
        console.error('❌ Failed to load orders:', error);
        showErrorState();
        showToast('Failed to load orders: ' + error.message, 'error');
    }
}

function checkForNewOrders() {
    const currentOrderIds = new Set(orders.map(order => order.id));
    const newOrderIds = [...currentOrderIds].filter(id => !lastKnownOrderIds.has(id));
    
    if (newOrderIds.length > 0) {
        console.log('🆕 Found new orders:', newOrderIds);
        showNewOrderBadge(newOrderIds.length);
        showToast(`${newOrderIds.length} new order(s) received!`, 'success');
        
        // Update known orders
        lastKnownOrderIds = currentOrderIds;
    }
}

async function refreshData(silent = false) {
    if (!silent) {
        console.log('🔄 Refreshing data...');
        
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.classList.add('refreshing');
        }
    }
    
    try {
        await loadOrders();
        if (!silent) {
            showToast('Orders data refreshed successfully', 'success');
        }
    } catch (error) {
        if (!silent) {
            showToast('Failed to refresh orders data', 'error');
        }
    } finally {
        if (!silent) {
            const refreshBtn = document.getElementById('refreshBtn');
            if (refreshBtn) {
                refreshBtn.classList.remove('refreshing');
            }
        }
    }
}

// UI State Management
function showLoadingState() {
    document.getElementById('ordersLoading').style.display = 'block';
    document.getElementById('ordersContent').style.display = 'none';
    document.getElementById('ordersEmpty').style.display = 'none';
    document.getElementById('ordersNoResults').style.display = 'none';
    document.getElementById('ordersError').style.display = 'none';
    document.getElementById('ordersControls').style.display = 'none';
}

function showOrdersContent() {
    document.getElementById('ordersLoading').style.display = 'none';
    document.getElementById('ordersContent').style.display = 'block';
    document.getElementById('ordersEmpty').style.display = 'none';
    document.getElementById('ordersNoResults').style.display = 'none';
    document.getElementById('ordersError').style.display = 'none';
    document.getElementById('ordersControls').style.display = 'flex';
}

function showEmptyState() {
    document.getElementById('ordersLoading').style.display = 'none';
    document.getElementById('ordersContent').style.display = 'none';
    document.getElementById('ordersEmpty').style.display = 'block';
    document.getElementById('ordersNoResults').style.display = 'none';
    document.getElementById('ordersError').style.display = 'none';
    document.getElementById('ordersControls').style.display = 'none';
}

function showNoResultsState() {
    document.getElementById('ordersLoading').style.display = 'none';
    document.getElementById('ordersContent').style.display = 'none';
    document.getElementById('ordersEmpty').style.display = 'none';
    document.getElementById('ordersNoResults').style.display = 'block';
    document.getElementById('ordersError').style.display = 'none';
    document.getElementById('ordersControls').style.display = 'flex';
}

function showErrorState() {
    document.getElementById('ordersLoading').style.display = 'none';
    document.getElementById('ordersContent').style.display = 'none';
    document.getElementById('ordersEmpty').style.display = 'none';
    document.getElementById('ordersNoResults').style.display = 'none';
    document.getElementById('ordersError').style.display = 'block';
    document.getElementById('ordersControls').style.display = 'none';
}

// Filtering and Pagination
function applyFiltersAndPagination() {
    console.log(`🔧 Applying filters: ${currentFilter}, search: "${searchTerm}"`);
    
    // Start with all orders
    filteredOrders = [...orders];
    
    // Apply search filter
    if (searchTerm) {
        filteredOrders = filteredOrders.filter(order => {
            const searchFields = [
                order.order_number,
                order.customer_name,
                order.customer_email,
                order.customer_phone,
                order.status
            ].filter(field => field).join(' ').toLowerCase();
            
            return searchFields.includes(searchTerm);
        });
    }
    
    // Apply status filter
    if (currentFilter !== 'all') {
        filteredOrders = filteredOrders.filter(order => {
            switch (currentFilter) {
                case 'pending': return order.status === 'pending';
                case 'completed': return order.status === 'completed';
                case 'cancelled': return order.status === 'cancelled';
                default: return true;
            }
        });
    }
    
    console.log(`📋 Filtered to ${filteredOrders.length} orders`);
    
    // Handle empty results
    if (filteredOrders.length === 0) {
        if (orders.length === 0) {
            showEmptyState();
        } else {
            showNoResultsState();
        }
        return;
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = Math.min(startIndex + ordersPerPage, filteredOrders.length);
    
    // Get current page orders
    const currentPageOrders = filteredOrders.slice(startIndex, endIndex);
    
    // Update UI
    renderOrdersTable(currentPageOrders);
    updatePaginationInfo(startIndex + 1, endIndex, filteredOrders.length, totalPages);
    generatePaginationControls(totalPages);
    
    showOrdersContent();
}

function renderOrdersTable(orders) {
    const tbody = document.querySelector('#ordersTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    orders.forEach(order => {
        const row = createOrderRow(order);
        tbody.appendChild(row);
    });
}

function createOrderRow(order) {
    const row = document.createElement('tr');
    row.className = 'order-row';
    row.innerHTML = `
        <td class="order-number">${order.order_number}</td>
        <td class="customer-info">
            <div class="customer-name">${order.customer_name}</div>
            <div class="customer-contact">${order.customer_email}</div>
            ${order.customer_phone ? `<div class="customer-phone">${order.customer_phone}</div>` : ''}
        </td>
        <td class="order-items">
            <div class="items-count">${order.items.length} item(s)</div>
            <div class="items-preview">${getItemsPreview(order.items)}</div>
        </td>
        <td class="order-total">$${order.total.toFixed(2)}</td>
        <td class="order-status">
            <span class="status-badge status-${order.status}">${order.status}</span>
        </td>
        <td class="order-date">${formatDate(order.created_at)}</td>
        <td class="order-actions">
            <button class="btn btn-sm btn-outline" onclick="viewOrder('${order.id}')">
                <i class="icon-eye"></i> View
            </button>
            <div class="status-actions">
                ${order.status === 'pending' ? `
                    <button class="btn btn-sm btn-success" onclick="updateOrderStatus('${order.id}', 'completed')">
                        <i class="icon-check"></i> Complete
                    </button>
                ` : ''}
                <button class="btn btn-sm btn-danger" onclick="deleteOrder('${order.id}')">
                    <i class="icon-trash"></i> Delete
                </button>
            </div>
        </td>
    `;
    
    return row;
}

function getItemsPreview(items) {
    if (!items || items.length === 0) return 'No items';
    
    const preview = items.slice(0, 2).map(item => 
        `${item.name} (${item.size})`
    ).join(', ');
    
    return items.length > 2 ? `${preview}...` : preview;
}

function updatePaginationInfo(start, end, total, totalPages) {
    const infoEl = document.getElementById('ordersInfo');
    if (infoEl) {
        infoEl.textContent = `Showing ${start}-${end} of ${total} orders (Page ${currentPage} of ${totalPages})`;
    }
}

function generatePaginationControls(totalPages) {
    const container = document.getElementById('ordersPagination');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = `btn btn-outline ${currentPage === 1 ? 'disabled' : ''}`;
    prevBtn.innerHTML = '<i class="icon-chevron-left"></i> Previous';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => goToPage(currentPage - 1);
    container.appendChild(prevBtn);
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        const firstBtn = createPageButton(1);
        container.appendChild(firstBtn);
        
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            container.appendChild(ellipsis);
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = createPageButton(i, i === currentPage);
        container.appendChild(pageBtn);
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            container.appendChild(ellipsis);
        }
        
        const lastBtn = createPageButton(totalPages);
        container.appendChild(lastBtn);
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = `btn btn-outline ${currentPage === totalPages ? 'disabled' : ''}`;
    nextBtn.innerHTML = 'Next <i class="icon-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => goToPage(currentPage + 1);
    container.appendChild(nextBtn);
}

function createPageButton(pageNumber, isActive = false) {
    const btn = document.createElement('button');
    btn.className = `btn ${isActive ? 'btn-primary' : 'btn-outline'}`;
    btn.textContent = pageNumber;
    btn.onclick = () => goToPage(pageNumber);
    return btn;
}

function goToPage(page) {
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        applyFiltersAndPagination();
    }
}

// Order Management Functions
async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await fetch(`/admin/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ status: newStatus })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`Order status updated to ${newStatus}`, 'success');
            await refreshData(true);
        } else {
            throw new Error(result.error || 'Failed to update order status');
        }
        
    } catch (error) {
        console.error('❌ Failed to update order status:', error);
        showToast('Failed to update order status: ' + error.message, 'error');
    }
}

async function deleteOrder(orderId) {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/admin/orders/${orderId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Order deleted successfully', 'success');
            await refreshData(true);
        } else {
            throw new Error(result.error || 'Failed to delete order');
        }
        
    } catch (error) {
        console.error('❌ Failed to delete order:', error);
        showToast('Failed to delete order: ' + error.message, 'error');
    }
}

function viewOrder(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    // Create modal for order details
    showOrderDetailsModal(order);
}

function showOrderDetailsModal(order) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('orderDetailsModal');
    if (!modal) {
        modal = createOrderDetailsModal();
        document.body.appendChild(modal);
    }
    
    // Populate modal with order details
    populateOrderModal(order);
    
    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function createOrderDetailsModal() {
    const modal = document.createElement('div');
    modal.id = 'orderDetailsModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Order Details</h3>
                <button class="modal-close" onclick="closeOrderModal()">
                    <i class="icon-x"></i>
                </button>
            </div>
            <div class="modal-body">
                <div id="orderDetailsContent"></div>
            </div>
        </div>
    `;
    
    return modal;
}

function populateOrderModal(order) {
    const content = document.getElementById('orderDetailsContent');
    if (!content) return;
    
    content.innerHTML = `
        <div class="order-details">
            <div class="order-header">
                <h4>Order #${order.order_number}</h4>
                <span class="status-badge status-${order.status}">${order.status}</span>
            </div>
            
            <div class="customer-section">
                <h5>Customer Information</h5>
                <div class="customer-details">
                    <p><strong>Name:</strong> ${order.customer_name}</p>
                    <p><strong>Email:</strong> ${order.customer_email}</p>
                    ${order.customer_phone ? `<p><strong>Phone:</strong> ${order.customer_phone}</p>` : ''}
                </div>
            </div>
            
            <div class="items-section">
                <h5>Order Items</h5>
                <div class="items-list">
                    ${order.items.map(item => `
                        <div class="item-row">
                            <div class="item-info">
                                <strong>${item.name}</strong>
                                <span class="item-size">${item.size}</span>
                            </div>
                            <div class="item-price">
                                ${item.quantity}x $${item.price} = $${(item.quantity * item.price).toFixed(2)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="order-summary">
                <h5>Order Summary</h5>
                <div class="summary-row">
                    <span>Total:</span>
                    <strong>$${order.total.toFixed(2)}</strong>
                </div>
                <div class="summary-row">
                    <span>Order Date:</span>
                    <span>${formatDate(order.created_at)}</span>
                </div>
            </div>
            
            <div class="order-actions">
                ${order.status === 'pending' ? `
                    <button class="btn btn-success" onclick="updateOrderStatus('${order.id}', 'completed')">
                        Mark as Completed
                    </button>
                ` : ''}
                <button class="btn btn-danger" onclick="deleteOrder('${order.id}')">
                    Delete Order
                </button>
            </div>
        </div>
    `;
}

function closeOrderModal() {
    const modal = document.getElementById('orderDetailsModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Statistics and Analytics
function updateStats(stats) {
    if (!stats) return;
    
    const elements = {
        totalOrders: document.getElementById('totalOrders'),
        pendingOrders: document.getElementById('pendingOrders'),
        completedOrders: document.getElementById('completedOrders'),
        totalRevenue: document.getElementById('totalRevenue')
    };
    
    if (elements.totalOrders) elements.totalOrders.textContent = stats.total || 0;
    if (elements.pendingOrders) elements.pendingOrders.textContent = stats.pending || 0;
    if (elements.completedOrders) elements.completedOrders.textContent = stats.completed || 0;
    if (elements.totalRevenue) elements.totalRevenue.textContent = `$${(stats.revenue || 0).toFixed(2)}`;
}

// Notification Functions
function showNewOrderNotification(orderData) {
    // Show browser notification if supported and permitted
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Order Received!', {
            body: `Order ${orderData.orderNumber} from ${orderData.customerName}`,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-32x32.png'
        });
    }
    
    // Show toast notification
    showToast(`New order ${orderData.orderNumber} from ${orderData.customerName}`, 'success');
    
    // Show new order badge
    showNewOrderBadge(1);
}

function showNewOrderBadge(count) {
    const badge = document.getElementById('newOrderBadge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = 'inline-block';
        badge.classList.add('pulse');
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            badge.style.display = 'none';
            badge.classList.remove('pulse');
        }, 10000);
    }
}

function updateConnectionStatus(isOnline) {
    const statusEl = document.getElementById('connectionStatus');
    if (statusEl) {
        statusEl.className = `connection-status ${isOnline ? 'online' : 'offline'}`;
        statusEl.innerHTML = `
            <i class="icon-${isOnline ? 'wifi' : 'wifi-off'}"></i>
            ${isOnline ? 'Online' : 'Offline'}
        `;
    }
}

// Utility Functions
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

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showToast(message, type = 'info') {
    // Create toast if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="toast-icon icon-${getToastIcon(type)}"></i>
            <span class="toast-message">${message}</span>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="icon-x"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

function getToastIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'x-circle',
        warning: 'alert-triangle',
        info: 'info'
    };
    return icons[type] || 'info';
}

// Export functions for global access
window.updateOrderStatus = updateOrderStatus;
window.deleteOrder = deleteOrder;
window.viewOrder = viewOrder;
window.closeOrderModal = closeOrderModal;
window.goToPage = goToPage;