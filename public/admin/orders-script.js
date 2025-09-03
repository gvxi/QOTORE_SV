// FIXED Admin Orders Dashboard JavaScript
// Updated to work with your exact database structure

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
        
        // Load initial data
        await loadOrders();
        
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

// Data Loading Functions
async function loadOrders() {
    console.log('📊 Loading orders...');
    showLoadingState();
    
    try {
        const response = await fetch('/admin/orders', {
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Orders API response status:', response.status);
        
        if (!response.ok) {
            if (response.status === 401) {
                redirectToLogin();
                return;
            }
            
            const errorText = await response.text();
            console.error('Orders API error:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Orders API result:', result);
        
        if (result.success && Array.isArray(result.data)) {
            orders = result.data;
            console.log(`✅ Loaded ${orders.length} orders`);
            
            // Debug: Log first order structure
            if (orders.length > 0) {
                console.log('First order structure:', orders[0]);
            }
            
            updateStats(result.stats || calculateStats());
            applyFiltersAndPagination();
            showOrdersContent();
        } else {
            console.warn('Unexpected API response:', result);
            throw new Error(result.error || 'Failed to load orders - Invalid response format');
        }
        
    } catch (error) {
        console.error('❌ Failed to load orders:', error);
        showErrorState(error.message);
        showToast('Failed to load orders: ' + error.message, 'error');
    }
}

// Calculate stats from orders data
function calculateStats() {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
    const reviewedOrders = orders.filter(o => o.reviewed).length;
    
    // Calculate revenue in OMR (total_amount is in fils/cents)
    const totalRevenue = orders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + (o.total_amount || 0), 0) / 1000;
    
    return {
        total: totalOrders,
        pending: pendingOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        reviewed: reviewedOrders,
        revenue: totalRevenue
    };
}

// Update stats display
function updateStats(stats) {
    if (!stats) return;
    
    const totalEl = document.getElementById('totalOrdersCount');
    const pendingEl = document.getElementById('pendingOrdersCount');
    const completedEl = document.getElementById('completedOrdersCount');
    const revenueEl = document.getElementById('totalRevenueAmount');
    
    if (totalEl) totalEl.textContent = stats.total || 0;
    if (pendingEl) pendingEl.textContent = stats.pending || 0;
    if (completedEl) completedEl.textContent = stats.completed || 0;
    if (revenueEl) revenueEl.textContent = `${(stats.revenue || 0).toFixed(3)} OMR`;
}

function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchOrders');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value.toLowerCase().trim();
            currentPage = 1;
            applyFiltersAndPagination();
        });
    }
    
    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            filterButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
            
            currentFilter = btn.dataset.filter;
            currentPage = 1;
            applyFiltersAndPagination();
        });
    });
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => refreshData());
    }
}

function applyFiltersAndPagination() {
    // Start with all orders
    filteredOrders = [...orders];
    
    // Apply search filter
    if (searchTerm) {
        filteredOrders = filteredOrders.filter(order => {
            // Build customer name from database fields
            const customerName = `${order.customer_first_name || ''} ${order.customer_last_name || ''}`.toLowerCase();
            const customerPhone = (order.customer_phone || '').toLowerCase();
            const customerEmail = (order.customer_email || '').toLowerCase();
            const orderNumber = (order.order_number || '').toLowerCase();
            
            return customerName.includes(searchTerm) || 
                   customerPhone.includes(searchTerm) || 
                   customerEmail.includes(searchTerm) ||
                   orderNumber.includes(searchTerm);
        });
    }
    
    // Apply status filter
    if (currentFilter && currentFilter !== 'all') {
        filteredOrders = filteredOrders.filter(order => {
            switch (currentFilter) {
                case 'pending': return order.status === 'pending';
                case 'completed': return order.status === 'completed';
                case 'cancelled': return order.status === 'cancelled';
                case 'reviewed': return order.reviewed === true;
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

// Render orders table with proper data handling
function renderOrdersTable(orders) {
    const tbody = document.querySelector('#ordersTable tbody') || document.querySelector('#ordersTableBody');
    if (!tbody) {
        console.error('Orders table tbody not found');
        return;
    }
    
    tbody.innerHTML = '';
    
    orders.forEach(order => {
        const row = createOrderRow(order);
        tbody.appendChild(row);
    });
}

// Create order row with your exact database structure
function createOrderRow(order) {
    const row = document.createElement('tr');
    row.className = 'order-row';
    
    // Build customer name from database fields
    const customerName = `${order.customer_first_name || ''} ${order.customer_last_name || ''}`.trim();
    
    // Handle order items - get from the items array that should be populated by the API
    const itemsCount = (order.items && Array.isArray(order.items)) ? order.items.length : 0;
    const itemsPreview = getItemsPreview(order.items || []);
    
    // Convert total_amount from fils to OMR (divide by 1000)
    const totalAmount = order.total_amount ? (order.total_amount / 1000).toFixed(3) : '0.000';
    
    // Handle order number
    const orderNumber = order.order_number || `ORD-${String(order.id).padStart(5, '0')}`;
    
    // Primary contact info
    const primaryContact = order.customer_email || order.customer_phone || 'No contact';
    
    // Status badge with review indicator
    const statusBadge = order.reviewed ? 
        `<span class="status-badge status-${order.status}">✓ ${order.status}</span>` :
        `<span class="status-badge status-${order.status}">${order.status}</span>`;
    
    row.innerHTML = `
        <td class="order-number">${orderNumber}</td>
        <td class="customer-info">
            <div class="customer-name">${customerName}</div>
            <div class="customer-contact">${primaryContact}</div>
            ${order.customer_phone && order.customer_phone !== primaryContact ? 
                `<div class="customer-phone">${order.customer_phone}</div>` : ''}
        </td>
        <td class="order-items">
            <div class="items-count">${itemsCount} item(s)</div>
            <div class="items-preview">${itemsPreview}</div>
        </td>
        <td class="order-total">${totalAmount} OMR</td>
        <td class="order-status">
            ${statusBadge}
        </td>
        <td class="order-date">${formatDate(order.created_at)}</td>
        <td class="order-actions">
            <button class="btn btn-sm btn-outline" onclick="viewOrder('${order.id}')">
                <i class="icon-eye"></i> View
            </button>
            <div class="status-actions">
                ${order.status === 'pending' ?
                    `<button class="btn btn-sm btn-success" onclick="updateOrderStatus('${order.id}', 'completed')">
                        <i class="icon-check"></i> Complete
                    </button>` : ''
                }
                <button class="btn btn-sm btn-danger" onclick="deleteOrder('${order.id}')">
                    <i class="icon-trash"></i> Delete
                </button>
            </div>
        </td>
    `;
    
    return row;
}

// Get items preview with proper handling of order_items structure
function getItemsPreview(items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
        return 'No items';
    }
    
    // Handle the structure from order_items table
    const preview = items.slice(0, 2).map(item => {
        // Use fragrance_name and variant_size from order_items table
        const name = item.fragrance_name || item.name || 'Unknown Item';
        const size = item.variant_size || item.size || '';
        const quantity = item.quantity || 1;
        
        return `${name} (${size}) x${quantity}`;
    }).join(', ');
    
    return items.length > 2 ? `${preview}...` : preview;
}

// Format date helper
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.warn('Date formatting error:', error);
        return dateString;
    }
}

// Pagination helpers
function updatePaginationInfo(start, end, total, totalPages) {
    const infoEl = document.getElementById('ordersInfo') || document.getElementById('ordersPageInfo');
    if (infoEl) {
        infoEl.textContent = `Showing ${start}-${end} of ${total} orders`;
    }
    
    const totalEl = document.getElementById('ordersTotalCount');
    if (totalEl) {
        totalEl.textContent = total;
    }
}

function generatePaginationControls(totalPages) {
    const container = document.getElementById('ordersPagination');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (totalPages <= 1) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'flex';
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = `btn btn-outline ${currentPage === 1 ? 'disabled' : ''}`;
    prevBtn.innerHTML = '<i class="icon-chevron-left"></i> Previous';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => goToPage(currentPage - 1);
    container.appendChild(prevBtn);
    
    // Page numbers (show current and nearby pages)
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `btn ${i === currentPage ? 'btn-primary' : 'btn-outline'}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => goToPage(i);
        container.appendChild(pageBtn);
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = `btn btn-outline ${currentPage === totalPages ? 'disabled' : ''}`;
    nextBtn.innerHTML = 'Next <i class="icon-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => goToPage(currentPage + 1);
    container.appendChild(nextBtn);
}

function goToPage(page) {
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        applyFiltersAndPagination();
    }
}

// Refresh data
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

// Order Management Functions
async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await fetch('/admin/update-order-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ 
                id: parseInt(orderId), 
                status: newStatus 
            })
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
        const response = await fetch('/admin/delete-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ 
                id: parseInt(orderId) 
            })
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

async function viewOrder(orderId) {
    // Find the order in current data
    const order = orders.find(o => o.id == orderId);
    if (!order) {
        showToast('Order not found', 'error');
        return;
    }
    
    // Create modal content
    const customerName = `${order.customer_first_name || ''} ${order.customer_last_name || ''}`.trim();
    const totalAmount = (order.total_amount / 1000).toFixed(3);
    
    let itemsHtml = '';
    if (order.items && order.items.length > 0) {
        itemsHtml = order.items.map(item => {
            const itemTotal = (item.total_price_cents / 1000).toFixed(3);
            const itemPrice = (item.unit_price_cents / 1000).toFixed(3);
            return `
                <div class="order-item">
                    <div class="item-name">${item.fragrance_name}</div>
                    <div class="item-details">${item.variant_size} × ${item.quantity} = ${itemTotal} OMR</div>
                    <div class="item-price">${itemPrice} OMR each</div>
                </div>
            `;
        }).join('');
    } else {
        itemsHtml = '<div class="no-items">No items found</div>';
    }
    
    const modalHtml = `
        <div class="modal-overlay" onclick="closeOrderModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>Order Details - ${order.order_number}</h3>
                    <button onclick="closeOrderModal()" class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="order-details">
                        <div class="detail-section">
                            <h4>Customer Information</h4>
                            <p><strong>Name:</strong> ${customerName}</p>
                            <p><strong>Phone:</strong> ${order.customer_phone || 'N/A'}</p>
                            <p><strong>Email:</strong> ${order.customer_email || 'N/A'}</p>
                        </div>
                        
                        <div class="detail-section">
                            <h4>Delivery Information</h4>
                            <p><strong>Address:</strong> ${order.delivery_address}</p>
                            <p><strong>City:</strong> ${order.delivery_city}</p>
                            <p><strong>Region:</strong> ${order.delivery_region || 'N/A'}</p>
                        </div>
                        
                        <div class="detail-section">
                            <h4>Order Items</h4>
                            ${itemsHtml}
                        </div>
                        
                        <div class="detail-section">
                            <h4>Order Summary</h4>
                            <p><strong>Status:</strong> ${order.status}</p>
                            <p><strong>Total:</strong> ${totalAmount} OMR</p>
                            <p><strong>Created:</strong> ${formatDate(order.created_at)}</p>
                            <p><strong>Notes:</strong> ${order.notes || 'None'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeOrderModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// UI State Management
function showLoadingState() {
    const loadingEl = document.getElementById('ordersLoading');
    const contentEl = document.getElementById('ordersContent');
    const emptyEl = document.getElementById('ordersEmpty');
    const errorEl = document.getElementById('ordersError');
    const controlsEl = document.getElementById('ordersControls');
    
    if (loadingEl) loadingEl.style.display = 'block';
    if (contentEl) contentEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    if (controlsEl) controlsEl.style.display = 'none';
}

function showOrdersContent() {
    const loadingEl = document.getElementById('ordersLoading');
    const contentEl = document.getElementById('ordersContent');
    const emptyEl = document.getElementById('ordersEmpty');
    const errorEl = document.getElementById('ordersError');
    const controlsEl = document.getElementById('ordersControls');
    
    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';
    if (emptyEl) emptyEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    if (controlsEl) controlsEl.style.display = 'flex';
}

function showEmptyState() {
    const loadingEl = document.getElementById('ordersLoading');
    const contentEl = document.getElementById('ordersContent');
    const emptyEl = document.getElementById('ordersEmpty');
    const errorEl = document.getElementById('ordersError');
    const controlsEl = document.getElementById('ordersControls');
    
    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'block';
    if (errorEl) errorEl.style.display = 'none';
    if (controlsEl) controlsEl.style.display = 'none';
}

function showNoResultsState() {
    const noResultsEl = document.getElementById('ordersNoResults');
    const contentEl = document.getElementById('ordersContent');
    
    if (noResultsEl) noResultsEl.style.display = 'block';
    if (contentEl) contentEl.style.display = 'none';
}

function showErrorState(errorMessage) {
    const loadingEl = document.getElementById('ordersLoading');
    const contentEl = document.getElementById('ordersContent');
    const emptyEl = document.getElementById('ordersEmpty');
    const errorEl = document.getElementById('ordersError');
    const controlsEl = document.getElementById('ordersControls');
    
    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';
    if (errorEl) {
        errorEl.style.display = 'block';
        const errorMsgEl = errorEl.querySelector('.error-message');
        if (errorMsgEl) {
            errorMsgEl.textContent = errorMessage;
        }
    }
    if (controlsEl) controlsEl.style.display = 'none';
}

// Toast notification helper
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        console.warn('Toast container not found');
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toastContainer.removeChild(toast), 300);
    }, 3000);
}

// Export functions for global access
window.updateOrderStatus = updateOrderStatus;
window.deleteOrder = deleteOrder;
window.viewOrder = viewOrder;
window.closeOrderModal = closeOrderModal;
window.goToPage = goToPage;