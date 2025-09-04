let orders = [];
let filteredOrders = [];
let currentFilter = 'all';
let currentPage = 1;
let ordersPerPage = 10;
let searchTerm = '';
let isNotificationsEnabled = false;
let serviceWorker = null;
let lastKnownOrderIds = new Set();

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Admin Orders Dashboard Loading...');
    initializeApp();
});

async function initializeApp() {
    try {
        if (!isAuthenticated()) {
            redirectToLogin();
            return;
        }
        
        await loadOrders();
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
            throw new Error('HTTP ' + response.status + ': ' + response.statusText);
        }
        
        const result = await response.json();
        console.log('Orders API result:', result);
        
        if (result.success && Array.isArray(result.data)) {
            orders = result.data;
            console.log(`✅ Loaded ${orders.length} orders`);
            
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

function calculateStats() {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
    const reviewedOrders = orders.filter(o => o.reviewed).length;
    
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
    const searchInput = document.getElementById('searchOrders');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value.toLowerCase().trim();
            currentPage = 1;
            applyFiltersAndPagination();
        });
    }
    
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentFilter = btn.dataset.filter;
            currentPage = 1;
            applyFiltersAndPagination();
        });
    });
    
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => refreshData());
    }
}

function applyFiltersAndPagination() {
    filteredOrders = [...orders];
    
    if (searchTerm) {
        filteredOrders = filteredOrders.filter(order => {
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
    
    if (currentFilter && currentFilter !== 'all') {
        filteredOrders = filteredOrders.filter(order => {
            switch (currentFilter) {
                case 'pending': return order.status === 'pending';
                case 'completed': return order.status === 'completed';
                case 'cancelled': return order.status === 'cancelled';
                case 'reviewed': return order.reviewed === true;
                case 'needs-review': return !order.reviewed;
                default: return true;
            }
        });
    }
    
    console.log(`📋 Filtered to ${filteredOrders.length} orders`);
    
    if (filteredOrders.length === 0) {
        if (orders.length === 0) {
            showEmptyState();
        } else {
            showNoResultsState();
        }
        return;
    }
    
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = Math.min(startIndex + ordersPerPage, filteredOrders.length);
    
    const currentPageOrders = filteredOrders.slice(startIndex, endIndex);
    
    renderOrdersTable(currentPageOrders);
    updatePaginationInfo(startIndex + 1, endIndex, filteredOrders.length, totalPages);
    generatePaginationControls(totalPages);
    
    showOrdersContent();
}

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

function createOrderRow(order) {
    const row = document.createElement('tr');
    row.className = 'order-row';
    
    const customerName = `${order.customer_first_name || ''} ${order.customer_last_name || ''}`.trim();
    const itemsCount = (order.items && Array.isArray(order.items)) ? order.items.length : 0;
    const itemsPreview = getItemsPreview(order.items || []);
    const totalAmount = order.total_amount ? (order.total_amount / 1000).toFixed(3) : '0.000';
    const orderNumber = order.order_number || `ORD-${String(order.id).padStart(5, '0')}`;
    const primaryContact = order.customer_email || order.customer_phone || 'No contact';
    
    let statusContent = '';
    if (order.reviewed) {
        statusContent = `
            <div class="status-container">
                <span class="status-badge status-${order.status}">${order.status}</span>
                <span class="review-badge">✓ Reviewed</span>
            </div>
        `;
    } else {
        statusContent = `
            <div class="status-container">
                <span class="status-badge status-${order.status}">${order.status}</span>
                <span class="needs-review-badge">Needs Review</span>
            </div>
        `;
    }
    
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
            ${statusContent}
        </td>
        <td class="order-date">${formatDate(order.created_at)}</td>
        <td class="order-actions">
            <button class="btn btn-sm btn-outline" onclick="viewOrder('${order.id}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
                </svg>
                View
            </button>
            <div class="status-actions">
                ${order.status === 'pending' ?
                    `<button class="btn btn-sm btn-success" onclick="updateOrderStatus('${order.id}', 'completed')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
                        </svg>
                        Complete
                    </button>` : ''
                }
                <button class="btn btn-sm btn-danger" onclick="deleteOrder('${order.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                    </svg>
                    Delete
                </button>
            </div>
        </td>
    `;
    
    return row;
}

function getItemsPreview(items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
        return 'No items';
    }
    
    const preview = items.slice(0, 2).map(item => {
        const name = item.fragrance_name || item.name || 'Unknown Item';
        const size = item.variant_size || item.size || '';
        const quantity = item.quantity || 1;
        
        return `${name} (${size}) x${quantity}`;
    }).join(', ');
    
    return items.length > 2 ? `${preview}...` : preview;
}

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
    
    const prevBtn = document.createElement('button');
    prevBtn.className = `btn btn-outline ${currentPage === 1 ? 'disabled' : ''}`;
    prevBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z"/></svg> Previous';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => goToPage(currentPage - 1);
    container.appendChild(prevBtn);
    
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `btn ${i === currentPage ? 'btn-primary' : 'btn-outline'}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => goToPage(i);
        container.appendChild(pageBtn);
    }
    
    const nextBtn = document.createElement('button');
    nextBtn.className = `btn btn-outline ${currentPage === totalPages ? 'disabled' : ''}`;
    nextBtn.innerHTML = 'Next <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"/></svg>';
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

let currentModalOrderId = null;

async function viewOrder(orderId) {
    const order = orders.find(o => o.id == orderId);
    if (!order) {
        showToast('Order not found', 'error');
        return;
    }
    
    currentModalOrderId = orderId;
    
    await populateInvoiceModal(order);
    
    const modal = document.getElementById('orderModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    } else {
        console.error('Order modal not found in DOM');
        createAndShowInvoiceModal(order);
    }
}

function createAndShowInvoiceModal(order) {
    const existingModal = document.getElementById('orderModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const orderNumber = order.order_number || 'ORD-' + String(order.id).padStart(5, '0');
    const customerName = (order.customer_first_name || '') + ' ' + (order.customer_last_name || '');
    
    console.log('Creating modal for order:', order);
    console.log('Order items:', order.items);
    
    const modalHTML = 
        '<div id="orderModal" class="modal-overlay">' +
            '<div class="modal-container">' +
                '<div class="invoice-modal">' +
                    '<div class="invoice-header">' +
                        '<div class="invoice-logo">' +
                            '<img src="/icons/icon-32x32.png" alt="Qotore" class="logo-icon">' +
                            '<div class="company-info">' +
                                '<h2>Qotore</h2>' +
                                '<p>Premium Fragrances</p>' +
                                '<p>Muscat, Oman</p>' +
                            '</div>' +
                        '</div>' +
                        '<div class="invoice-details">' +
                            '<h1 id="invoiceTitle">INVOICE</h1>' +
                            '<div class="invoice-meta">' +
                                '<div><strong>Order #:</strong> <span id="invoiceOrderNumber">' + orderNumber + '</span></div>' +
                                '<div><strong>Date:</strong> <span id="invoiceDate">' + formatDate(order.created_at) + '</span></div>' +
                                '<div><strong>Status:</strong> <span id="invoiceStatus" class="status-badge status-' + order.status + '">' + order.status.toUpperCase() + '</span></div>' +
                                (order.reviewed ? '<div><strong>✓ Reviewed</strong></div>' : '') +
                            '</div>' +
                        '</div>' +
                        '<button class="modal-close" onclick="closeOrderModal()">&times;</button>' +
                    '</div>' +

                    '<div class="invoice-body">' +
                        '<div class="customer-section">' +
                            '<h3>Bill To:</h3>' +
                            '<div class="customer-details">' +
                                '<div class="customer-name" id="invoiceCustomerName">' + customerName.trim() + '</div>' +
                                '<div class="customer-contact" id="invoiceCustomerContact">' +
                                    (order.customer_phone ? '<div>📞 ' + order.customer_phone + '</div>' : '') +
                                    (order.customer_email ? '<div>✉️ ' + order.customer_email + '</div>' : '') +
                                '</div>' +
                                '<div class="delivery-address" id="invoiceDeliveryAddress">' +
                                    '<div><strong>Delivery Address:</strong></div>' +
                                    '<div>' + (order.delivery_address || 'N/A') + '</div>' +
                                    '<div>' + (order.delivery_city || '') + (order.delivery_region ? ', ' + order.delivery_region : '') + '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +

                        '<div class="items-section">' +
                            '<h3>Order Items:</h3>' +
                            '<table class="invoice-items-table">' +
                                '<thead>' +
                                    '<tr>' +
                                        '<th>Image</th>' +
                                        '<th>Item</th>' +
                                        '<th>Size</th>' +
                                        '<th>Qty</th>' +
                                        '<th>Unit Price</th>' +
                                        '<th>Total</th>' +
                                    '</tr>' +
                                '</thead>' +
                                '<tbody id="invoiceItemsBody">' +
                                '</tbody>' +
                            '</table>' +
                        '</div>' +

                        '<div class="invoice-summary">' +
                            '<div class="summary-row">' +
                                '<span>Subtotal:</span>' +
                                '<span id="invoiceSubtotal">' + (order.total_amount / 1000).toFixed(3) + ' OMR</span>' +
                            '</div>' +
                            '<div class="summary-row total-row">' +
                                '<span><strong>Total:</strong></span>' +
                                '<span id="invoiceTotal"><strong>' + (order.total_amount / 1000).toFixed(3) + ' OMR</strong></span>' +
                            '</div>' +
                        '</div>' +

                        (order.notes && order.notes.trim() ? 
                            '<div class="notes-section" id="invoiceNotesSection">' +
                                '<h3>Notes:</h3>' +
                                '<div class="notes-content" id="invoiceNotes">' + order.notes + '</div>' +
                            '</div>' : ''
                        ) +
                    '</div>' +

                    '<div class="invoice-footer">' +
                        '<div class="order-actions">' +
                            (order.status === 'pending' ? 
                                '<button id="markCompleteBtn" class="btn btn-success" onclick="updateOrderStatusFromModal(\'completed\')">' +
                                    '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">' +
                                        '<path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>' +
                                    '</svg>' +
                                    ' Mark as Completed' +
                                '</button>' : ''
                            ) +
                            (order.status === 'completed' ? 
                                '<button id="markPendingBtn" class="btn btn-warning" onclick="updateOrderStatusFromModal(\'pending\')">' +
                                    '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">' +
                                        '<path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,17A1.5,1.5 0 0,1 10.5,15.5A1.5,1.5 0 0,1 12,14A1.5,1.5 0 0,1 13.5,15.5A1.5,1.5 0 0,1 12,17M12,13A1.5,1.5 0 0,1 10.5,11.5A1.5,1.5 0 0,1 12,10A1.5,1.5 0 0,1 13.5,11.5A1.5,1.5 0 0,1 12,13Z"/>' +
                                    '</svg>' +
                                    ' Mark as Pending' +
                                '</button>' : ''
                            ) +
                            '<button id="markReviewedBtn" class="btn ' + (order.reviewed ? 'btn-warning' : 'btn-secondary') + '" onclick="toggleOrderReview()">' +
                                '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">' +
                                    '<path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z"/>' +
                                '</svg>' +
                                '<span id="reviewButtonText">' + (order.reviewed ? 'Mark as Unreviewed' : 'Mark as Reviewed') + '</span>' +
                            '</button>' +
                            '<button class="btn btn-danger" onclick="deleteOrderFromModal()">' +
                                '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">' +
                                    '<path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>' +
                                '</svg>' +
                                ' Delete Order' +
                            '</button>' +
                            '<button class="btn btn-secondary" onclick="printInvoice()">' +
                                '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">' +
                                    '<path d="M18,3H6V7H18M19,12A1,1 0 0,1 18,11A1,1 0 0,1 19,10A1,1 0 0,1 20,11A1,1 0 0,1 19,12M16,19H8V14H16M19,8H5A3,3 0 0,0 2,11V17H6V21H18V17H22V11A3,3 0 0,0 19,8Z"/>' +
                                '</svg>' +
                                ' Print Invoice' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    populateInvoiceItems(order.items || []);
    
    document.body.style.overflow = 'hidden';
}

async function populateInvoiceModal(order) {
    const customerName = `${order.customer_first_name || ''} ${order.customer_last_name || ''}`.trim();
    const totalAmount = (order.total_amount / 1000).toFixed(3);
    const orderNumber = order.order_number || `ORD-${String(order.id).padStart(5, '0')}`;
    
    const titleEl = document.getElementById('invoiceTitle');
    const orderNumEl = document.getElementById('invoiceOrderNumber');
    const dateEl = document.getElementById('invoiceDate');
    const statusEl = document.getElementById('invoiceStatus');
    
    if (titleEl) titleEl.textContent = 'ORDER INVOICE';
    if (orderNumEl) orderNumEl.textContent = orderNumber;
    if (dateEl) dateEl.textContent = formatDate(order.created_at);
    
    if (statusEl) {
        statusEl.textContent = order.status.toUpperCase();
        statusEl.className = `status-badge status-${order.status}`;
        
        const metaDiv = statusEl.closest('.invoice-meta');
        if (metaDiv && order.reviewed) {
            const reviewedIndicator = metaDiv.querySelector('.reviewed-indicator');
            if (!reviewedIndicator) {
                const reviewDiv = document.createElement('div');
                reviewDiv.className = 'reviewed-indicator';
                reviewDiv.innerHTML = '<strong style="color: #28a745;">✓ Reviewed</strong>';
                metaDiv.appendChild(reviewDiv);
            }
        }
    }
    
    const customerNameEl = document.getElementById('invoiceCustomerName');
    const customerContactEl = document.getElementById('invoiceCustomerContact');
    const deliveryAddressEl = document.getElementById('invoiceDeliveryAddress');
    
    if (customerNameEl) customerNameEl.textContent = customerName;
    if (customerContactEl) {
        customerContactEl.innerHTML = `
            ${order.customer_phone ? `<div>📞 ${order.customer_phone}</div>` : ''}
            ${order.customer_email ? `<div>✉️ ${order.customer_email}</div>` : ''}
        `;
    }
    if (deliveryAddressEl) {
        deliveryAddressEl.innerHTML = `
            <div><strong>Delivery Address:</strong></div>
            <div>${order.delivery_address}</div>
            <div>${order.delivery_city}${order.delivery_region ? `, ${order.delivery_region}` : ''}</div>
        `;
    }
    
    await populateInvoiceItems(order.items || []);
    
    const subtotalEl = document.getElementById('invoiceSubtotal');
    const totalEl = document.getElementById('invoiceTotal');
    if (subtotalEl) subtotalEl.textContent = `${totalAmount} OMR`;
    if (totalEl) totalEl.textContent = `${totalAmount} OMR`;
    
    const notesSection = document.getElementById('invoiceNotesSection');
    const notesContent = document.getElementById('invoiceNotes');
    if (notesSection && notesContent) {
        if (order.notes && order.notes.trim()) {
            notesSection.style.display = 'block';
            notesContent.textContent = order.notes;
        } else {
            notesSection.style.display = 'none';
        }
    }
    
    setupModalActionButtons(order);
}

async function populateInvoiceItems(items) {
    const tbody = document.getElementById('invoiceItemsBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="no-items">No items found in this order</td>
            </tr>
        `;
        return;
    }
    
    const cacheBuster = Date.now();
    
    for (const item of items) {
        const itemTotal = (item.total_price_cents / 1000).toFixed(3);
        const itemPrice = (item.unit_price_cents / 1000).toFixed(3);
        
        let imageHtml = '<div class="item-image-placeholder">📦</div>';
        
        const fragranceName = item.fragrance_name || '';
        const slug = generateSlugFromName(fragranceName);
        
        if (slug) {
            imageHtml = `
                <div class="item-image-container">
                    <img src="/api/image/${slug}.png?v=${cacheBuster}" 
                         alt="${fragranceName}"
                         class="item-image"
                         onerror="this.onerror=null; this.parentNode.innerHTML='<div class=\\'item-image-placeholder\\'>📦</div>'"
                         loading="lazy">
                </div>
            `;
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="item-image-cell">
                ${imageHtml}
            </td>
            <td class="item-details-cell">
                <div class="item-name">${item.fragrance_name}</div>
                ${item.fragrance_brand ? `<div class="item-brand">${item.fragrance_brand}</div>` : ''}
            </td>
            <td class="item-size">${item.variant_size}</td>
            <td class="item-quantity">${item.quantity}</td>
            <td class="item-price">${itemPrice} OMR</td>
            <td class="item-total"><strong>${itemTotal} OMR</strong></td>
        `;
        
        tbody.appendChild(row);
    }
}

function generateSlugFromName(name) {
    if (!name) return null;
    return name
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

function setupModalActionButtons(order) {
    const markCompleteBtn = document.getElementById('markCompleteBtn');
    const markPendingBtn = document.getElementById('markPendingBtn');
    const markReviewedBtn = document.getElementById('markReviewedBtn');
    const reviewButtonText = document.getElementById('reviewButtonText');
    
    if (markCompleteBtn) {
        if (order.status === 'pending') {
            markCompleteBtn.style.display = 'inline-flex';
        } else {
            markCompleteBtn.style.display = 'none';
        }
    }
    
    if (markPendingBtn) {
        if (order.status === 'completed') {
            markPendingBtn.style.display = 'inline-flex';
        } else {
            markPendingBtn.style.display = 'none';
        }
    }
    
    if (markReviewedBtn && reviewButtonText) {
        markReviewedBtn.style.display = 'inline-flex';
        if (order.reviewed) {
            reviewButtonText.textContent = 'Mark as Unreviewed';
            markReviewedBtn.className = 'btn btn-warning';
        } else {
            reviewButtonText.textContent = 'Mark as Reviewed';
            markReviewedBtn.className = 'btn btn-secondary';
        }
    }
}

async function toggleOrderReview() {
    if (!currentModalOrderId) return;
    
    const order = orders.find(o => o.id == currentModalOrderId);
    if (!order) return;
    
    const newReviewStatus = !order.reviewed;
    
    try {
        const response = await fetch('/admin/toggle-order-review', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ 
                id: parseInt(currentModalOrderId), 
                reviewed: newReviewStatus 
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`Order marked as ${newReviewStatus ? 'reviewed' : 'unreviewed'}`, 'success');
            
            order.reviewed = newReviewStatus;
            
            setupModalActionButtons(order);
            
            await refreshData(true);
        } else {
            throw new Error(result.error || 'Failed to update review status');
        }
        
    } catch (error) {
        console.error('❌ Failed to toggle review status:', error);
        showToast('Failed to update review status: ' + error.message, 'error');
    }
}

function closeOrderModal() {
    const modal = document.getElementById('orderModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    currentModalOrderId = null;
}

async function updateOrderStatusFromModal(newStatus) {
    if (!currentModalOrderId) return;
    
    try {
        await updateOrderStatus(currentModalOrderId, newStatus);
        closeOrderModal();
    } catch (error) {
        console.error('Failed to update order status from modal:', error);
    }
}

async function deleteOrderFromModal() {
    if (!currentModalOrderId) return;
    
    try {
        await deleteOrder(currentModalOrderId);
        closeOrderModal();
    } catch (error) {
        console.error('Failed to delete order from modal:', error);
    }
}

function printInvoice() {
    const modalContent = document.querySelector('.invoice-modal');
    const printWindow = window.open('', '_blank');
    
    const printStyles = `
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .invoice-header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #8B4513; padding-bottom: 20px; }
            .invoice-logo { display: flex; align-items: center; gap: 15px; }
            .invoice-logo img { width: 40px; height: 40px; }
            .company-info h2 { color: #8B4513; margin: 0; }
            .company-info p { margin: 2px 0; color: #666; }
            .invoice-details { text-align: right; }
            .invoice-details h1 { color: #8B4513; margin: 0; font-size: 2rem; }
            .invoice-meta div { margin: 5px 0; }
            .customer-section { margin-bottom: 30px; }
            .customer-details { margin-left: 20px; }
            .invoice-items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .invoice-items-table th, .invoice-items-table td { padding: 10px; border: 1px solid #ddd; text-align: left; }
            .invoice-items-table th { background: #f5f5f5; font-weight: bold; }
            .item-image { width: 40px; height: 40px; object-fit: cover; border-radius: 5px; }
            .item-image-placeholder { width: 40px; height: 40px; background: #f0f0f0; border-radius: 5px; display: flex; align-items: center; justify-content: center; }
            .invoice-summary { text-align: right; margin: 20px 0; }
            .summary-row { margin: 10px 0; }
            .total-row { font-size: 1.2rem; border-top: 2px solid #8B4513; padding-top: 10px; }
            .status-badge { padding: 5px 10px; border-radius: 15px; font-size: 0.8rem; font-weight: bold; }
            .status-pending { background: #fff3cd; color: #856404; }
            .status-completed { background: #d4edda; color: #155724; }
            .status-cancelled { background: #f8d7da; color: #721c24; }
            .modal-close, .order-actions { display: none !important; }
            @media print { .modal-close, .order-actions { display: none !important; } }
        </style>
    `;
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice - ${document.getElementById('invoiceOrderNumber').textContent}</title>
            ${printStyles}
        </head>
        <body>
            ${modalContent.innerHTML}
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}

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

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        console.warn('Toast container not found, creating one');
        createToastContainer();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-icon">
                ${type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ'}
            </div>
            <div class="toast-message">${message}</div>
        </div>
    `;
    
    document.getElementById('toastContainer').appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
}

async function logout() {
    const logoutBtn = document.querySelector('button[onclick="logout()"]');
    if (logoutBtn) {
        logoutBtn.innerHTML = '<svg class="spin" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/></svg> <span>Logging out...</span>';
        logoutBtn.disabled = true;
    }
    
    try {
        const response = await fetch('/admin/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            clearAdminCookies();
            clearAdminStorage();
            
            showToast('Logged out successfully', 'success');
            
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 1000);
        } else {
            throw new Error('Logout request failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
        
        clearAdminCookies();
        clearAdminStorage();
        
        showToast('Logged out (with cleanup)', 'warning');
        
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1500);
    }
}

function clearAdminCookies() {
    const cookieOptions = [
        'admin_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'admin_session=; Path=/admin; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'admin_session=; Domain=' + window.location.hostname + '; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'admin_session=; Path=/; Max-Age=0',
        'admin_session=; Max-Age=0'
    ];
    
    cookieOptions.forEach(cookieString => {
        document.cookie = cookieString;
    });
    
    const adminCookies = ['admin_token', 'admin_auth', 'qotore_admin'];
    adminCookies.forEach(cookieName => {
        document.cookie = `${cookieName}=; Path=/; Max-Age=0`;
    });
    
    console.log('🧹 Client-side admin cookies cleared');
}

function clearAdminStorage() {
    const adminKeys = [
        'admin_session',
        'admin_data',
        'qotore_admin',
        'items_cache',
        'orders_cache',
        'notifications_cache'
    ];
    
    adminKeys.forEach(key => {
        localStorage.removeItem(key);
    });
    
    try {
        sessionStorage.clear();
    } catch (error) {
        console.warn('Could not clear sessionStorage:', error);
    }
    
    console.log('🧹 Admin storage cleared');
}

window.updateOrderStatus = updateOrderStatus;
window.deleteOrder = deleteOrder;
window.viewOrder = viewOrder;
window.closeOrderModal = closeOrderModal;
window.goToPage = goToPage;
window.logout = logout;
window.updateOrderStatusFromModal = updateOrderStatusFromModal;
window.deleteOrderFromModal = deleteOrderFromModal;
window.toggleOrderReview = toggleOrderReview;
window.toggleOrderReviewFromTable = toggleOrderReviewFromTable;