// ===================================
// ORDERS MANAGEMENT - FIXED VERSION
// Enhanced with proper scrolling modal, delete functionality, and Supabase integration
// ===================================

// Global variables
let allOrders = [];
let currentOrders = [];
let currentPage = 1;
let ordersPerPage = 25;
let currentSearchTerm = '';
let currentStatusFilter = '';
let currentOrderModal = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Orders management initialized');
    
    // Initialize components
    initializeEventListeners();
    loadOrders();
    
    // Load user preferences
    loadUserPreferences();
    
    console.log('✅ Orders management ready');
});

// ===================================
// EVENT LISTENERS
// ===================================

function initializeEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentSearchTerm = e.target.value.toLowerCase();
                currentPage = 1;
                applyFiltersAndPagination();
            }, 300);
        });
    }
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            currentStatusFilter = e.target.value;
            currentPage = 1;
            applyFiltersAndPagination();
        });
    }
    
    // Orders per page
    const ordersPerPageSelect = document.getElementById('ordersPerPageSelect');
    if (ordersPerPageSelect) {
        ordersPerPageSelect.addEventListener('change', (e) => {
            ordersPerPage = parseInt(e.target.value);
            currentPage = 1;
            applyFiltersAndPagination();
            saveUserPreferences();
        });
    }
    
    // Modal close on background click
    const modal = document.getElementById('orderModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeOrderModal();
            }
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeOrderModal();
        }
        if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
            e.preventDefault();
            refreshData();
        }
    });
    
    console.log('🎛️ Event listeners initialized');
}

// ===================================
// DATA LOADING AND MANAGEMENT
// ===================================

async function loadOrders() {
    try {
        showLoading(true);
        console.log('📊 Loading orders from server...');
        
        const response = await fetch('/admin/orders', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                showToast('Session expired. Please login again.', 'error');
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
                return;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('📊 Server response:', result);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to load orders');
        }
        
        // Handle the data
        allOrders = result.data || [];
        currentOrders = [...allOrders];
        
        // Update stats
        updateDashboardStats(result.stats);
        
        // Apply filters and display
        applyFiltersAndPagination();
        
        console.log(`✅ Loaded ${allOrders.length} orders successfully`);
        showToast(`Loaded ${allOrders.length} orders successfully`, 'success');
        
    } catch (error) {
        console.error('❌ Error loading orders:', error);
        showToast(`Failed to load orders: ${error.message}`, 'error');
        showEmptyState();
    } finally {
        showLoading(false);
    }
}

function updateDashboardStats(stats) {
    if (!stats) {
        // Calculate stats from loaded orders
        stats = calculateStatsFromOrders();
    }
    
    const elements = {
        totalOrders: document.getElementById('totalOrders'),
        pendingOrders: document.getElementById('pendingOrders'),
        completedOrders: document.getElementById('completedOrders'),
        totalRevenue: document.getElementById('totalRevenue')
    };
    
    // Animate the numbers
    if (elements.totalOrders) animateValue(elements.totalOrders, 0, stats.total || 0, 800);
    if (elements.pendingOrders) animateValue(elements.pendingOrders, 0, stats.pending || 0, 800);
    if (elements.completedOrders) animateValue(elements.completedOrders, 0, stats.completed || 0, 800);
    if (elements.totalRevenue) {
        const revenue = (stats.revenue || 0) / 1000; // Convert fils to OMR
        animateValue(elements.totalRevenue, 0, revenue, 1000, true);
    }
}

function calculateStatsFromOrders() {
    const stats = {
        total: allOrders.length,
        pending: 0,
        completed: 0,
        revenue: 0
    };
    
    allOrders.forEach(order => {
        const status = order.status?.toLowerCase();
        
        switch (status) {
            case 'pending':
                stats.pending++;
                break;
            case 'completed':
                stats.completed++;
                break;
        }
        
        if (status === 'completed') {
            stats.revenue += (order.total_amount || 0);
        }
    });
    
    return stats;
}

function animateValue(element, start, end, duration, isDecimal = false) {
    if (!element) return;
    
    const startTimestamp = performance.now();
    const step = (timestamp) => {
        const elapsed = timestamp - startTimestamp;
        const progress = Math.min(elapsed / duration, 1);
        
        const current = start + (end - start) * progress;
        
        if (isDecimal) {
            element.textContent = current.toFixed(3);
        } else {
            element.textContent = Math.floor(current);
        }
        
        if (progress < 1) {
            requestAnimationFrame(step);
        }
    };
    
    requestAnimationFrame(step);
}

// ===================================
// FILTERING AND PAGINATION
// ===================================

function applyFiltersAndPagination() {
    console.log('🔍 Applying filters and pagination');
    
    // Start with all orders
    let filteredOrders = [...allOrders];
    
    // Apply search filter
    if (currentSearchTerm) {
        filteredOrders = filteredOrders.filter(order => {
            const searchFields = [
                order.order_number || '',
                order.customer_first_name || '',
                order.customer_last_name || '',
                order.customer_phone || '',
                order.customer_email || '',
                order.delivery_city || '',
                order.notes || ''
            ].join(' ').toLowerCase();
            
            return searchFields.includes(currentSearchTerm);
        });
    }
    
    // Apply status filter
    if (currentStatusFilter) {
        filteredOrders = filteredOrders.filter(order => 
            order.status === currentStatusFilter
        );
    }
    
    // Sort by creation date (newest first)
    filteredOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Store filtered results
    currentOrders = filteredOrders;
    
    // Calculate pagination
    const totalOrders = currentOrders.length;
    const totalPages = Math.ceil(totalOrders / ordersPerPage) || 1;
    
    // Ensure current page is valid
    if (currentPage > totalPages) {
        currentPage = 1;
    }
    
    // Get current page orders
    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    const pageOrders = currentOrders.slice(startIndex, endIndex);
    
    // Display results
    displayOrders(pageOrders);
    setupPagination(totalPages, totalOrders);
    
    console.log(`📄 Page ${currentPage} of ${totalPages} (${totalOrders} total orders)`);
}

function displayOrders(orders) {
    const tableBody = document.getElementById('ordersTableBody');
    const ordersSection = document.getElementById('ordersSection');
    const emptyState = document.getElementById('emptyState');
    
    if (!orders || orders.length === 0) {
        showEmptyState();
        return;
    }
    
    // Show orders section, hide empty state
    if (ordersSection) ordersSection.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';
    
    if (!tableBody) {
        console.error('Orders table body not found');
        return;
    }
    
    // Generate table rows
    tableBody.innerHTML = orders.map(order => createOrderRow(order)).join('');
    
    console.log(`📊 Displayed ${orders.length} orders`);
}

function createOrderRow(order) {
    const orderNumber = order.order_number || `ORD-${String(order.id).padStart(5, '0')}`;
    const customerName = `${order.customer_first_name} ${order.customer_last_name || ''}`.trim();
    const totalAmount = ((order.total_amount || 0) / 1000).toFixed(3);
    const orderDate = new Date(order.created_at).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Create items summary
    const items = order.items || [];
    const itemsSummary = items.length > 0 
        ? items.map(item => {
            const itemName = item.fragrance_name || 'Unknown Item';
            const variant = item.variant_size || 'Unknown Size';
            const quantity = item.quantity || 1;
            return `<div class="item-entry">${quantity}x ${itemName} (${variant})</div>`;
        }).join('')
        : '<div class="item-entry">No items</div>';
    
    // Status badge
    const status = order.status || 'pending';
    const statusClass = `status-${status}`;
    const statusIcon = getStatusIcon(status);
    
    return `
        <tr>
            <td>
                <div class="order-details">
                    <h4>${orderNumber}</h4>
                    <div class="order-number">ID: ${order.id}</div>
                </div>
            </td>
            <td>
                <div class="customer-info">
                    <h5>${customerName}</h5>
                    <div class="customer-contact">${order.customer_phone || 'No phone'}</div>
                    <div class="customer-contact">${order.customer_email || 'No email'}</div>
                    <div class="customer-address">${order.delivery_address || ''}, ${order.delivery_city || ''}</div>
                </div>
            </td>
            <td>
                <div class="order-items-summary">
                    ${itemsSummary}
                </div>
            </td>
            <td>
                <div class="total-amount">${totalAmount} OMR</div>
            </td>
            <td>
                <span class="status-badge ${statusClass}" onclick="toggleOrderStatus(${order.id}, '${status}')">
                    ${statusIcon} ${status.toUpperCase()}
                </span>
            </td>
            <td>
                <div class="order-date">${orderDate}</div>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-small btn-view" onclick="viewOrder(${order.id})">
                        👁️ View
                    </button>
                    <button class="btn-small btn-delete" onclick="deleteOrder(${order.id})">
                        🗑️ Delete
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function getStatusIcon(status) {
    const icons = {
        pending: '⏳',
        reviewed: '👀',
        completed: '✅',
        cancelled: '❌'
    };
    return icons[status] || '❓';
}

function showEmptyState() {
    const ordersSection = document.getElementById('ordersSection');
    const emptyState = document.getElementById('emptyState');
    
    if (ordersSection) ordersSection.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
}

// ===================================
// PAGINATION
// ===================================

function setupPagination(totalPages, totalOrders) {
    const container = document.getElementById('paginationContainer');
    if (!container) return;
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    const startItem = ((currentPage - 1) * ordersPerPage) + 1;
    const endItem = Math.min(currentPage * ordersPerPage, totalOrders);
    
    let paginationHTML = `
        <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
                onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            ‹ Previous
        </button>
    `;
    
    // Calculate visible pages
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    // Always show first page
    if (startPage > 1) {
        paginationHTML += `<button class="pagination-btn" onclick="changePage(1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">
                ${i}
            </button>
        `;
    }
    
    // Always show last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
        paginationHTML += `<button class="pagination-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
    }
    
    paginationHTML += `
        <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" 
                onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            Next ›
        </button>
        <div class="pagination-info">
            Showing ${startItem}-${endItem} of ${totalOrders} orders
        </div>
    `;
    
    container.innerHTML = paginationHTML;
}

function changePage(page) {
    if (page < 1 || page > Math.ceil(currentOrders.length / ordersPerPage)) {
        return;
    }
    
    currentPage = page;
    applyFiltersAndPagination();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===================================
// ORDER MODAL - FIXED WITH SCROLLING
// ===================================

async function viewOrder(orderId) {
    try {
        console.log(`👁️ Viewing order: ${orderId}`);
        
        const order = allOrders.find(o => o.id === orderId);
        if (!order) {
            showToast('Order not found', 'error');
            return;
        }
        
        // Store current order for delete functionality
        currentOrderModal = order;
        
        // Show loading in modal
        showOrderModal();
        document.getElementById('modalTitle').textContent = 'Loading...';
        document.getElementById('modalBody').innerHTML = '<div class="loading-spinner"><div class="spinner"></div><div class="loading-text">Loading order details...</div></div>';
        
        // Load full order details (in case we need fresh data)
        const orderDetails = await loadOrderDetails(orderId);
        
        // Display order details
        displayOrderDetails(orderDetails || order);
        
    } catch (error) {
        console.error('❌ Error viewing order:', error);
        showToast(`Failed to load order details: ${error.message}`, 'error');
        closeOrderModal();
    }
}

async function loadOrderDetails(orderId) {
    try {
        // For now, return the cached order data
        // In the future, this could make a specific API call for full details
        return allOrders.find(o => o.id === orderId);
    } catch (error) {
        console.error('Error loading order details:', error);
        return null;
    }
}

function displayOrderDetails(order) {
    const modal = document.getElementById('orderModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    if (!order || !modalTitle || !modalBody) {
        console.error('Order data or modal elements not found');
        return;
    }
    
    const orderNumber = order.order_number || `ORD-${String(order.id).padStart(5, '0')}`;
    modalTitle.textContent = `Order ${orderNumber}`;
    
    const totalAmount = ((order.total_amount || 0) / 1000).toFixed(3);
    const orderDate = new Date(order.created_at).toLocaleString('en-GB');
    const customerName = `${order.customer_first_name} ${order.customer_last_name || ''}`.trim();
    
    // Create order details HTML
    modalBody.innerHTML = `
        <!-- Order Information -->
        <div class="order-detail-section">
            <h3>📋 Order Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Order Number</div>
                    <div class="detail-value">${orderNumber}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Order ID</div>
                    <div class="detail-value">#${order.id}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Status</div>
                    <div class="detail-value">
                        <span class="status-badge status-${order.status}">${getStatusIcon(order.status)} ${(order.status || 'pending').toUpperCase()}</span>
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Order Date</div>
                    <div class="detail-value">${orderDate}</div>
                </div>
            </div>
        </div>

        <!-- Customer Information -->
        <div class="order-detail-section">
            <h3>👤 Customer Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Full Name</div>
                    <div class="detail-value">${customerName || 'Not provided'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Phone Number</div>
                    <div class="detail-value">
                        ${order.customer_phone ? `<a href="tel:${order.customer_phone}">${order.customer_phone}</a>` : 'Not provided'}
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Email Address</div>
                    <div class="detail-value">
                        ${order.customer_email ? `<a href="mailto:${order.customer_email}">${order.customer_email}</a>` : 'Not provided'}
                    </div>
                </div>
            </div>
        </div>

        <!-- Delivery Information -->
        <div class="order-detail-section">
            <h3>🚚 Delivery Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Address</div>
                    <div class="detail-value">${order.delivery_address || 'Not provided'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">City</div>
                    <div class="detail-value">${order.delivery_city || 'Not provided'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Region</div>
                    <div class="detail-value">${order.delivery_region || 'Not provided'}</div>
                </div>
            </div>
        </div>

        <!-- Order Items -->
        <div class="order-detail-section">
            <h3>🛍️ Order Items</h3>
            <div class="order-items-list">
                ${createOrderItemsList(order.items || [])}
            </div>
        </div>

        <!-- Order Notes -->
        ${order.notes ? `
        <div class="order-detail-section">
            <h3>📝 Order Notes</h3>
            <div class="detail-item">
                <div class="detail-value">${order.notes}</div>
            </div>
        </div>
        ` : ''}

        <!-- Order Summary -->
        <div class="order-summary">
            <div class="summary-row">
                <span class="summary-label">Items Total:</span>
                <span class="summary-value">${totalAmount} OMR</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Delivery:</span>
                <span class="summary-value">Free</span>
            </div>
            <div class="summary-row">
                <span class="summary-label total-amount-large">Total Amount:</span>
                <span class="summary-value total-amount-large">${totalAmount} OMR</span>
            </div>
        </div>

        <!-- Status Change Buttons -->
        <div class="status-change-buttons">
            ${createStatusChangeButtons(order)}
        </div>
    `;
}

function createOrderItemsList(items) {
    if (!items || items.length === 0) {
        return '<div class="order-item"><div class="item-details"><div class="item-name">No items found</div></div></div>';
    }
    
    return items.map(item => {
        const itemTotal = ((item.total_price_cents || 0) / 1000).toFixed(3);
        const unitPrice = ((item.unit_price_cents || 0) / 1000).toFixed(3);
        
        return `
            <div class="order-item">
                <div class="item-details">
                    <div class="item-name">${item.fragrance_name || 'Unknown Item'}</div>
                    <div class="item-brand">${item.fragrance_brand || 'Unknown Brand'}</div>
                    <div class="item-variant">${item.variant_size || 'Unknown Size'}</div>
                </div>
                <div class="item-pricing">
                    <div class="item-quantity">Qty: ${item.quantity || 1}</div>
                    <div class="item-unit-price">${unitPrice} OMR each</div>
                    <div class="item-total">${itemTotal} OMR</div>
                </div>
            </div>
        `;
    }).join('');
}

function createStatusChangeButtons(order) {
    const currentStatus = order.status || 'pending';
    const buttons = [];
    
    // Status transition buttons based on current status
    switch (currentStatus) {
        case 'pending':
            buttons.push(`<button class="btn btn-warning" onclick="changeOrderStatus(${order.id}, 'reviewed')">👀 Mark as Reviewed</button>`);
            buttons.push(`<button class="btn btn-success" onclick="changeOrderStatus(${order.id}, 'completed')">✅ Mark as Completed</button>`);
            buttons.push(`<button class="btn btn-danger" onclick="changeOrderStatus(${order.id}, 'cancelled')">❌ Cancel Order</button>`);
            break;
        case 'reviewed':
            buttons.push(`<button class="btn btn-warning" onclick="changeOrderStatus(${order.id}, 'pending')">⏳ Mark as Pending</button>`);
            buttons.push(`<button class="btn btn-success" onclick="changeOrderStatus(${order.id}, 'completed')">✅ Mark as Completed</button>`);
            buttons.push(`<button class="btn btn-danger" onclick="changeOrderStatus(${order.id}, 'cancelled')">❌ Cancel Order</button>`);
            break;
        case 'completed':
            buttons.push(`<button class="btn btn-warning" onclick="changeOrderStatus(${order.id}, 'pending')">⏳ Mark as Pending</button>`);
            buttons.push(`<button class="btn btn-warning" onclick="changeOrderStatus(${order.id}, 'reviewed')">👀 Mark as Reviewed</button>`);
            break;
        case 'cancelled':
            buttons.push(`<button class="btn btn-warning" onclick="changeOrderStatus(${order.id}, 'pending')">⏳ Mark as Pending</button>`);
            buttons.push(`<button class="btn btn-success" onclick="changeOrderStatus(${order.id}, 'completed')">✅ Mark as Completed</button>`);
            break;
    }
    
    return buttons.join('');
}

function showOrderModal() {
    const modal = document.getElementById('orderModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
}

function closeOrderModal() {
    const modal = document.getElementById('orderModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Restore scrolling
        currentOrderModal = null;
    }
}

// ===================================
// ORDER STATUS MANAGEMENT
// ===================================

async function toggleOrderStatus(orderId, currentStatus) {
    // Simple toggle for quick status changes
    const nextStatus = getNextStatus(currentStatus);
    await changeOrderStatus(orderId, nextStatus);
}

function getNextStatus(currentStatus) {
    const statusFlow = {
        'pending': 'reviewed',
        'reviewed': 'completed',
        'completed': 'pending',
        'cancelled': 'pending'
    };
    
    return statusFlow[currentStatus] || 'pending';
}

async function changeOrderStatus(orderId, newStatus) {
    try {
        console.log(`🔄 Changing order ${orderId} status to: ${newStatus}`);
        
        const response = await fetch('/admin/update-order-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                id: orderId,
                status: newStatus
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to update order status');
        }
        
        // Update local data
        const orderIndex = allOrders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            allOrders[orderIndex].status = newStatus;
            allOrders[orderIndex].updated_at = new Date().toISOString();
        }
        
        // Refresh displays
        applyFiltersAndPagination();
        updateDashboardStats();
        
        // Update modal if it's open for this order
        if (currentOrderModal && currentOrderModal.id === orderId) {
            currentOrderModal.status = newStatus;
            displayOrderDetails(currentOrderModal);
        }
        
        showToast(`Order status updated to ${newStatus}`, 'success');
        console.log(`✅ Order ${orderId} status updated to: ${newStatus}`);
        
    } catch (error) {
        console.error('❌ Error updating order status:', error);
        showToast(`Failed to update order status: ${error.message}`, 'error');
    }
}

// ===================================
// ORDER DELETION - FIXED
// ===================================

async function deleteOrder(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) {
        showToast('Order not found', 'error');
        return;
    }
    
    const orderNumber = order.order_number || `ORD-${String(order.id).padStart(5, '0')}`;
    const customerName = `${order.customer_first_name} ${order.customer_last_name || ''}`.trim();
    
    // Confirm deletion
    const confirmed = confirm(`Are you sure you want to delete order ${orderNumber} from ${customerName}?\n\nThis action cannot be undone.`);
    if (!confirmed) {
        return;
    }
    
    try {
        console.log(`🗑️ Deleting order: ${orderId}`);
        
        const response = await fetch('/admin/delete-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ id: orderId })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to delete order');
        }
        
        // Remove from local data
        const orderIndex = allOrders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            allOrders.splice(orderIndex, 1);
        }
        
        // Close modal if this order was being viewed
        if (currentOrderModal && currentOrderModal.id === orderId) {
            closeOrderModal();
        }
        
        // Refresh displays
        applyFiltersAndPagination();
        updateDashboardStats();
        
        showToast(`Order ${orderNumber} deleted successfully`, 'success');
        console.log(`✅ Order ${orderId} deleted successfully`);
        
    } catch (error) {
        console.error('❌ Error deleting order:', error);
        showToast(`Failed to delete order: ${error.message}`, 'error');
    }
}

function deleteCurrentOrder() {
    if (currentOrderModal && currentOrderModal.id) {
        deleteOrder(currentOrderModal.id);
    } else {
        showToast('No order selected for deletion', 'error');
    }
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

function showLoading(show) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const ordersSection = document.getElementById('ordersSection');
    
    if (show) {
        if (loadingSpinner) loadingSpinner.style.display = 'flex';
        if (ordersSection) ordersSection.style.display = 'none';
    } else {
        if (loadingSpinner) loadingSpinner.style.display = 'none';
    }
}

function refreshData() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.classList.add('refreshing');
        refreshBtn.querySelector('span').textContent = 'Refreshing...';
    }
    
    loadOrders().finally(() => {
        if (refreshBtn) {
            refreshBtn.classList.remove('refreshing');
            refreshBtn.querySelector('span').textContent = 'Refresh';
        }
    });
}

function clearAdminSession() {
    // Clear cookies
    const cookieOptions = [
        'admin_session=; Path=/admin/; Max-Age=0; SameSite=Lax',
        'admin_session=; Path=/; Max-Age=0; SameSite=Lax',
        'admin_session=; Path=/; Max-Age=0',
        'admin_session=; Max-Age=0'
    ];
    
    cookieOptions.forEach(cookieString => {
        document.cookie = cookieString;
    });
    
    // Clear localStorage
    localStorage.removeItem('admin_session');
    localStorage.removeItem('orders_cache');
    localStorage.removeItem('admin_preferences');
    
    console.log('🧹 Admin session cleared');
}

// ===================================
// USER PREFERENCES
// ===================================

function saveUserPreferences() {
    const preferences = {
        ordersPerPage: ordersPerPage,
        lastUpdate: Date.now()
    };
    
    try {
        localStorage.setItem('orders_admin_preferences', JSON.stringify(preferences));
    } catch (error) {
        console.warn('Could not save user preferences:', error);
    }
}

function loadUserPreferences() {
    try {
        const saved = localStorage.getItem('orders_admin_preferences');
        if (saved) {
            const preferences = JSON.parse(saved);
            
            if (preferences.ordersPerPage) {
                ordersPerPage = preferences.ordersPerPage;
                const select = document.getElementById('ordersPerPageSelect');
                if (select) select.value = ordersPerPage;
            }
        }
    } catch (error) {
        console.warn('Could not load user preferences:', error);
    }
}

// ===================================
// TOAST NOTIFICATIONS
// ===================================

function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.warn('Toast container not found');
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const titles = {
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Info'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
        <div class="toast-content">
            <div class="toast-title">${titles[type] || 'Notification'}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }, duration);
}

// ===================================
// GLOBAL FUNCTIONS FOR WINDOW SCOPE
// ===================================

// Make functions available globally for onclick handlers
window.refreshData = refreshData;
window.viewOrder = viewOrder;
window.deleteOrder = deleteOrder;
window.deleteCurrentOrder = deleteCurrentOrder;
window.changeOrderStatus = changeOrderStatus;
window.toggleOrderStatus = toggleOrderStatus;
window.closeOrderModal = closeOrderModal;
window.changePage = changePage;
window.clearAdminSession = clearAdminSession;
window.loadOrders = loadOrders;

console.log('📋 Orders management script loaded');