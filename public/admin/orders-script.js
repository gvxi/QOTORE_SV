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
        
        // Handle visibility changes for background notifications
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
    } catch (error) {
        console.warn('⚠️ PWA features not available:', error);
    }
}

let deferredPrompt;
function handleInstallPrompt(e) {
    e.preventDefault();
    deferredPrompt = e;
    // Could show install button here
    console.log('📱 PWA install prompt ready');
}

function handleVisibilityChange() {
    const isVisible = !document.hidden;
    
    if (serviceWorker) {
        serviceWorker.postMessage({
            type: 'PAGE_VISIBILITY',
            visible: isVisible
        });
    }
    
    if (isVisible && isNotificationsEnabled) {
        // Refresh data when page becomes visible
        setTimeout(() => {
            refreshData();
        }, 1000);
    }
}

function handleServiceWorkerMessage(event) {
    const { type, data } = event.data;
    
    switch (type) {
        case 'NEW_ORDERS':
            console.log('🔔 New orders detected:', data.count);
            showNewOrderBadge(data.count);
            showToast(`${data.count} new order(s) received!`, 'success');
            // Auto-refresh orders
            setTimeout(() => {
                refreshData();
            }, 2000);
            break;
            
        case 'NOTIFICATION_CLICKED':
            console.log('🔔 Notification clicked:', data);
            // Could scroll to orders section or filter pending orders
            filterOrders('pending');
            break;
            
        case 'SHOW_NOTIFICATION':
            // Fallback for iOS - show toast instead
            if (data && data.title) {
                showToast(data.title, 'success');
            }
            break;
    }
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
    
    // Notification toggle
    const notificationToggle = document.getElementById('notificationToggle');
    if (notificationToggle) {
        // Load saved state
        const savedState = localStorage.getItem('notificationsEnabled') === 'true';
        notificationToggle.checked = savedState;
        isNotificationsEnabled = savedState;
        updateNotificationStatus();
        
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
            showToast('Data refreshed successfully', 'success');
        }
    } catch (error) {
        if (!silent) {
            showToast('Failed to refresh data', 'error');
        }
    } finally {
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.classList.remove('refreshing');
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

function updateStats(stats) {
    if (stats) {
        document.getElementById('totalOrders').textContent = stats.total || orders.length;
        document.getElementById('pendingOrders').textContent = stats.pending || orders.filter(o => o.status === 'pending').length;
        document.getElementById('completedOrders').textContent = stats.completed || orders.filter(o => o.status === 'completed').length;
        document.getElementById('totalRevenue').textContent = (stats.revenue || 0).toFixed(3);
    } else {
        // Calculate from orders data
        const pending = orders.filter(o => o.status === 'pending').length;
        const completed = orders.filter(o => o.status === 'completed').length;
        const revenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
        
        document.getElementById('totalOrders').textContent = orders.length;
        document.getElementById('pendingOrders').textContent = pending;
        document.getElementById('completedOrders').textContent = completed;
        document.getElementById('totalRevenue').textContent = revenue.toFixed(3);
    }
}

function showNewOrderBadge(count) {
    const badge = document.getElementById('newOrderBadge');
    const countEl = document.getElementById('newOrderCount');
    
    if (badge && countEl && count > 0) {
        countEl.textContent = count;
        badge.style.display = 'block';
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            badge.style.display = 'none';
        }, 10000);
    }
}

// Filtering and Pagination
function filterOrders(status) {
    currentFilter = status;
    currentPage = 1;
    
    // Update filter button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-filter') === status);
    });
    
    console.log('🔍 Filtering orders by:', status);
    applyFiltersAndPagination();
}

function applyFiltersAndPagination() {
    // Apply filters
    filteredOrders = orders.filter(order => {
        // Status filter
        if (currentFilter !== 'all' && order.status !== currentFilter) {
            return false;
        }
        
        // Search filter
        if (searchTerm) {
            const searchableText = [
                order.customer?.firstName || '',
                order.customer?.lastName || '',
                order.customer?.phone || '',
                order.orderNumber || '',
                order.id.toString()
            ].join(' ').toLowerCase();
            
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }
        
        return true;
    });
    
    console.log(`📋 Filtered: ${filteredOrders.length} of ${orders.length} orders`);
    
    if (filteredOrders.length === 0) {
        if (orders.length === 0) {
            showEmptyState();
        } else {
            showNoResultsState();
        }
        return;
    }
    
    showOrdersContent();
    renderOrders();
    updatePagination();
}

function renderOrders() {
    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    const pageOrders = filteredOrders.slice(startIndex, endIndex);
    
    // Desktop table view
    renderOrdersTable(pageOrders);
    
    // Mobile cards view
    renderOrdersCards(pageOrders);
}

function renderOrdersTable(pageOrders) {
    const tableBody = document.getElementById('ordersTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = pageOrders.map(order => {
        const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Unknown';
        const phone = order.customer?.phone || 'No phone';
        const itemCount = order.items?.length || 0;
        const totalQuantity = order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
        const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Unknown';
        const orderNumber = order.orderNumber || `#${order.id}`;
        
        // Calculate total for samples only
        let displayTotal = '0.000';
        if (order.items) {
            const sampleItems = order.items.filter(item => !item.isWholeBottle);
            if (sampleItems.length > 0) {
                const total = sampleItems.reduce((sum, item) => {
                    const itemPrice = item.variantPrice || 0;
                    const quantity = item.quantity || 1;
                    return sum + (itemPrice * quantity);
                }, 0);
                displayTotal = total.toFixed(3);
            }
            
            const hasWholeBottles = order.items.some(item => item.isWholeBottle);
            if (hasWholeBottles) {
                displayTotal += ' + Bottles';
            }
        }
        
        return `
            <tr>
                <td>
                    <div><strong>${orderNumber}</strong></div>
                    <small class="text-muted">ID: ${order.id}</small>
                </td>
                <td>
                    <div><strong>${customerName}</strong></div>
                    <small class="text-muted">${phone}</small>
                </td>
                <td>
                    <div>${itemCount} item(s)</div>
                    <small class="text-muted">${totalQuantity} total qty</small>
                </td>
                <td>
                    <strong>${displayTotal} OMR</strong>
                </td>
                <td>
                    <span class="status-badge status-${order.status || 'pending'}">
                        ${(order.status || 'pending').charAt(0).toUpperCase() + (order.status || 'pending').slice(1)}
                    </span>
                </td>
                <td>
                    <div>${orderDate}</div>
                    <small class="text-muted">${order.created_at ? new Date(order.created_at).toLocaleTimeString() : ''}</small>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-small btn-view" onclick="viewOrder(${order.id})" title="View Details">
                            View
                        </button>
                        <button class="btn-small ${order.status === 'completed' ? 'btn-pending' : 'btn-complete'}" 
                                onclick="toggleOrderStatus(${order.id})" 
                                title="${order.status === 'completed' ? 'Mark as Pending' : 'Mark as Complete'}">
                            ${order.status === 'completed' ? 'Pending' : 'Complete'}
                        </button>
                        <button class="btn-small btn-delete" onclick="deleteOrder(${order.id})" title="Delete Order">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderOrdersCards(pageOrders) {
    const cardsContainer = document.getElementById('orderCards');
    if (!cardsContainer) return;
    
    cardsContainer.innerHTML = pageOrders.map(order => {
        const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Unknown';
        const phone = order.customer?.phone || 'No phone';
        const itemCount = order.items?.length || 0;
        const totalQuantity = order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
        const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Unknown';
        const orderNumber = order.orderNumber || `#${order.id}`;
        
        // Calculate total for samples only
        let displayTotal = '0.000';
        if (order.items) {
            const sampleItems = order.items.filter(item => !item.isWholeBottle);
            if (sampleItems.length > 0) {
                const total = sampleItems.reduce((sum, item) => {
                    const itemPrice = item.variantPrice || 0;
                    const quantity = item.quantity || 1;
                    return sum + (itemPrice * quantity);
                }, 0);
                displayTotal = total.toFixed(3);
            }
            
            const hasWholeBottles = order.items.some(item => item.isWholeBottle);
            if (hasWholeBottles) {
                displayTotal += ' + Bottles';
            }
        }
        
        return `
            <div class="mobile-card">
                <div class="mobile-card-header">
                    <div class="mobile-card-info">
                        <h4>${orderNumber}</h4>
                        <p>${customerName}</p>
                        <span class="status-badge status-${order.status || 'pending'}">
                            ${(order.status || 'pending').charAt(0).toUpperCase() + (order.status || 'pending').slice(1)}
                        </span>
                    </div>
                </div>
                <div class="mobile-card-body">
                    <div>
                        <strong>Phone:</strong>
                        ${phone}
                    </div>
                    <div>
                        <strong>Items:</strong>
                        ${itemCount} item(s), ${totalQuantity} qty
                    </div>
                    <div>
                        <strong>Total:</strong>
                        ${displayTotal} OMR
                    </div>
                    <div>
                        <strong>Date:</strong>
                        ${orderDate}
                    </div>
                </div>
                <div class="mobile-card-actions">
                    <button class="btn-small btn-view" onclick="viewOrder(${order.id})">View</button>
                    <button class="btn-small ${order.status === 'completed' ? 'btn-pending' : 'btn-complete'}" 
                            onclick="toggleOrderStatus(${order.id})">
                        ${order.status === 'completed' ? 'Pending' : 'Complete'}
                    </button>
                    <button class="btn-small btn-delete" onclick="deleteOrder(${order.id})">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// Pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    const paginationEl = document.getElementById('ordersPagination');
    const pageInfoEl = document.getElementById('ordersPageInfo');
    const totalCountEl = document.getElementById('ordersTotalCount');
    const prevBtn = document.getElementById('ordersPrevBtn');
    const nextBtn = document.getElementById('ordersNextBtn');
    
    if (totalPages <= 1) {
        paginationEl.style.display = 'none';
        return;
    }
    
    paginationEl.style.display = 'flex';
    
    if (pageInfoEl) {
        pageInfoEl.textContent = `Page ${currentPage} of ${totalPages}`;
    }
    
    if (totalCountEl) {
        totalCountEl.textContent = filteredOrders.length;
    }
    
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages;
    }
}

function previousOrdersPage() {
    if (currentPage > 1) {
        currentPage--;
        renderOrders();
        updatePagination();
        
        // Scroll to top of table
        document.querySelector('.orders-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function nextOrdersPage() {
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderOrders();
        updatePagination();
        
        // Scroll to top of table
        document.querySelector('.orders-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Order Actions
function viewOrder(id) {
    const order = orders.find(o => o.id === id);
    if (!order) {
        showToast('Order not found', 'error');
        return;
    }
    
    console.log('👁️ Viewing order:', id);
    
    const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Unknown Customer';
    const phone = order.customer?.phone || 'No phone provided';
    const email = order.customer?.email || 'No email provided';
    const address = order.delivery?.address || 'No address provided';
    const city = order.delivery?.city || 'No city';
    const region = order.delivery?.region || '';
    const notes = order.notes || 'No special instructions';
    const orderDate = order.created_at ? new Date(order.created_at).toLocaleString() : 'Unknown date';
    const orderNumber = order.orderNumber || `#${order.id}`;
    
    let itemsList = 'No items found';
    let totalAmount = 0;
    
    if (order.items && order.items.length > 0) {
        itemsList = order.items.map((item, index) => {
            const brandName = item.fragranceBrand ? `${item.fragranceBrand} ` : '';
            const fragName = item.fragranceName || 'Unknown Fragrance';
            const quantity = item.quantity || 1;
            
            if (item.isWholeBottle) {
                return `${index + 1}. ${brandName}${fragName} - Whole Bottle x${quantity} (Contact for pricing)`;
            } else {
                const size = item.variantSize || 'Unknown size';
                const unitPrice = item.variantPrice || 0;
                const itemTotal = unitPrice * quantity;
                totalAmount += itemTotal;
                
                return `${index + 1}. ${brandName}${fragName} - ${size} (${unitPrice.toFixed(3)} OMR each) x${quantity} = ${itemTotal.toFixed(3)} OMR`;
            }
        }).join('\n');
        
        const hasWholeBottles = order.items.some(item => item.isWholeBottle);
        if (hasWholeBottles) {
            itemsList += `\n\nSample Items Subtotal: ${totalAmount.toFixed(3)} OMR`;
            itemsList += `\nNote: Contains whole bottle items - contact customer for total pricing`;
        } else {
            itemsList += `\n\nTotal Amount: ${totalAmount.toFixed(3)} OMR`;
        }
    }
    
    const fullAddress = `${address}\n${city}${region ? `, ${region}` : ''}`;
    
    const orderDetails = `Order ${orderNumber} Details

👤 Customer Information:
Name: ${customerName}
Phone: ${phone}
Email: ${email}

📍 Delivery Address:
${fullAddress}

🛍️ Order Items:
${itemsList}

💬 Special Instructions:
${notes}

📅 Order Details:
Date: ${orderDate}
Status: ${(order.status || 'pending').charAt(0).toUpperCase() + (order.status || 'pending').slice(1)}`;
    
    showToast('Order details copied to view', 'info');
    
    // Create a modal-like toast with longer duration
    showCustomToast('Order Details', orderDetails, 'info', 15000);
}

async function toggleOrderStatus(id) {
    const order = orders.find(o => o.id === id);
    if (!order) {
        showToast('Order not found', 'error');
        return;
    }
    
    const currentStatus = order.status || 'pending';
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    
    console.log('🔄 Toggling order status:', id, currentStatus, '->', newStatus);
    
    try {
        const response = await fetch('/admin/toggle-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                id: id,
                status: newStatus
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`Order marked as ${newStatus}`, 'success');
            // Update local data
            order.status = newStatus;
            // Re-render to reflect changes
            updateStats();
            renderOrders();
        } else {
            throw new Error(result.error || 'Failed to update order status');
        }
        
    } catch (error) {
        console.error('❌ Failed to toggle order status:', error);
        showToast('Failed to update order status: ' + error.message, 'error');
    }
}

async function deleteOrder(id) {
    const order = orders.find(o => o.id === id);
    if (!order) {
        showToast('Order not found', 'error');
        return;
    }
    
    const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Unknown Customer';
    const orderNumber = order.orderNumber || `#${order.id}`;
    
    const confirmed = confirm(`Are you sure you want to delete order ${orderNumber} from ${customerName}?\n\nThis action cannot be undone.`);
    
    if (!confirmed) return;
    
    console.log('🗑️ Deleting order:', id);
    
    try {
        const response = await fetch('/admin/delete-order', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ id: id })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`Order ${orderNumber} deleted successfully`, 'success');
            // Remove from local data
            orders = orders.filter(o => o.id !== id);
            // Re-apply filters and pagination
            applyFiltersAndPagination();
            updateStats();
        } else {
            throw new Error(result.error || 'Failed to delete order');
        }
        
    } catch (error) {
        console.error('❌ Failed to delete order:', error);
        showToast('Failed to delete order: ' + error.message, 'error');
    }
}

// Logout
async function logout() {
    const confirmed = confirm('Are you sure you want to logout?');
    if (!confirmed) return;
    
    try {
        // Stop notifications first
        if (isNotificationsEnabled) {
            await stopNotificationMonitoring();
        }
        
        const response = await fetch('/logout', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        if (result.success) {
            // Clear local data
            document.cookie = 'admin_session=; Path=/; Max-Age=0';
            localStorage.removeItem('notificationsEnabled');
            
            showToast('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 1000);
        } else {
            throw new Error(result.error || 'Logout failed');
        }
    } catch (error) {
        console.error('❌ Logout error:', error);
        // Force logout even if server request fails
        document.cookie = 'admin_session=; Path=/; Max-Age=0';
        window.location.href = '/login.html';
    }
}

// Toast Notifications System
function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">
            <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, duration);
}

function showCustomToast(title, message, type = 'info', duration = 10000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.maxWidth = '500px';
    toast.style.minHeight = '100px';
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message" style="white-space: pre-line; max-height: 300px; overflow-y: auto;">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, duration);
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}