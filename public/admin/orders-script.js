// Orders Management Script - FIXED VERSION
let orders = [];
let filteredOrders = [];
let currentPage = 1;
const ordersPerPage = 10;
let currentSearchTerm = '';
let currentStatusFilter = 'all';
let currentModalOrderId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Orders management loaded');
    loadOrders();
    setupEventListeners();
    checkNotificationStatus();
});

function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            currentSearchTerm = e.target.value;
            currentPage = 1;
            applyFiltersAndPagination();
        }, 300));
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
    
    // Notification toggle
    const notificationToggle = document.getElementById('notificationToggle');
    if (notificationToggle) {
        notificationToggle.addEventListener('click', toggleNotifications);
    }
    
    // Modal close on overlay click
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-overlay')) {
            closeOrderModal();
        }
    });
    
    // Escape key to close modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeOrderModal();
        }
    });
}

// Debounce utility function
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

// Data loading functions
async function loadOrders() {
    try {
        console.log('Loading orders from admin API...');
        
        const response = await fetch('/admin/orders', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/admin/login';
                return;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Orders loaded successfully:', data);
        
        if (data.success && Array.isArray(data.data)) {
            orders = data.data;
            console.log(`Loaded ${orders.length} orders for admin management`);
            
            updateDashboardStats();
            applyFiltersAndPagination();
        } else {
            console.warn('Invalid orders response structure:', data);
            orders = [];
            renderOrders([]);
        }
        
    } catch (error) {
        console.error('Failed to load orders:', error);
        showToast('Failed to load orders. Please check your connection and try again.', 'error');
        orders = [];
        renderOrders([]);
    }
}

function updateDashboardStats() {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const totalRevenue = orders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + (o.total_amount || 0), 0) / 1000; // Convert to OMR
    
    // Update DOM elements
    const totalOrdersEl = document.getElementById('totalOrders');
    const pendingOrdersEl = document.getElementById('pendingOrders');
    const completedOrdersEl = document.getElementById('completedOrders');
    const totalRevenueEl = document.getElementById('totalRevenue');
    
    if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
    if (pendingOrdersEl) pendingOrdersEl.textContent = pendingOrders;
    if (completedOrdersEl) completedOrdersEl.textContent = completedOrders;
    if (totalRevenueEl) totalRevenueEl.textContent = `${totalRevenue.toFixed(3)} OMR`;
}

// Filter and pagination functions
function applyFiltersAndPagination() {
    // Apply filters
    filteredOrders = orders.filter(order => {
        const matchesSearch = !currentSearchTerm || 
            order.customer_first_name?.toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
            order.customer_last_name?.toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
            order.customer_phone?.includes(currentSearchTerm) ||
            order.order_number?.toLowerCase().includes(currentSearchTerm.toLowerCase());
        
        const matchesStatus = currentStatusFilter === 'all' || order.status === currentStatusFilter;
        
        return matchesSearch && matchesStatus;
    });
    
    // Apply pagination
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
    
    renderOrders(paginatedOrders);
    renderPagination(totalPages);
    updateOrdersInfo();
}

function renderOrders(ordersToRender) {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    
    if (ordersToRender.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 3rem; color: #64748b;">
                    <div style="font-size: 1.2rem; margin-bottom: 0.5rem;">📦</div>
                    <div>No orders found</div>
                    ${currentSearchTerm || currentStatusFilter !== 'all' ? 
                        '<div style="font-size: 0.9rem; margin-top: 0.5rem;">Try adjusting your search or filters</div>' : 
                        '<div style="font-size: 0.9rem; margin-top: 0.5rem;">Orders will appear here when customers make purchases</div>'
                    }
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = ordersToRender.map(order => {
        const orderNumber = order.order_number || `ORD-${String(order.id).padStart(5, '0')}`;
        const customerName = `${order.customer_first_name || ''} ${order.customer_last_name || ''}`.trim() || 'N/A';
        const totalAmount = ((order.total_amount || 0) / 1000).toFixed(3);
        const itemCount = order.items ? order.items.length : 0;
        const createdAt = formatDate(order.created_at);
        
        const statusClass = `status-${order.status || 'pending'}`;
        const reviewClass = order.reviewed ? 'review-reviewed' : 'review-unreviewed';
        const reviewText = order.reviewed ? 'Reviewed' : 'New';
        
        return `
            <tr>
                <td>
                    <div style="font-weight: 600; color: #2d3748;">${orderNumber}</div>
                    <div class="review-badge ${reviewClass}" style="margin-top: 0.25rem; font-size: 0.7rem;">
                        ${reviewText}
                    </div>
                </td>
                <td>
                    <div style="font-weight: 600; color: #2d3748;">${customerName}</div>
                    <div style="color: #64748b; font-size: 0.9rem;">${order.customer_phone || ''}</div>
                </td>
                <td>
                    <div style="font-weight: 600; color: #8B4513;">${itemCount} item${itemCount !== 1 ? 's' : ''}</div>
                </td>
                <td>
                    <div style="font-weight: 700; color: #8B4513; font-size: 1.1rem;">${totalAmount} OMR</div>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">${order.status || 'pending'}</span>
                </td>
                <td>
                    <div style="color: #4a5568;">${createdAt}</div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-small" onclick="viewOrder(${order.id})" title="View Details">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
                            </svg>
                        </button>
                        <select class="filter-select" style="padding: 0.5rem; font-size: 0.8rem; min-width: 100px;" onchange="updateOrderStatus(${order.id}, this.value)">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                            <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                        <button class="btn btn-${order.reviewed ? 'warning' : 'success'} btn-small" onclick="toggleOrderReviewFromTable(${order.id})" title="${order.reviewed ? 'Mark as Unreviewed' : 'Mark as Reviewed'}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z"/>
                            </svg>
                        </button>
                        <button class="btn btn-danger btn-small" onclick="deleteOrderDirect(${order.id})" title="Delete Order">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function updateOrdersInfo() {
    const ordersInfo = document.getElementById('ordersInfo');
    if (ordersInfo) {
        const startIndex = (currentPage - 1) * ordersPerPage + 1;
        const endIndex = Math.min(currentPage * ordersPerPage, filteredOrders.length);
        ordersInfo.textContent = `Showing ${startIndex}-${endIndex} of ${filteredOrders.length} orders`;
    }
}

function renderPagination(totalPages) {
    const container = document.querySelector('.pagination-buttons');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = `btn btn-outline ${currentPage === 1 ? 'disabled' : ''}`;
    prevBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z"/></svg> Previous';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => goToPage(currentPage - 1);
    container.appendChild(prevBtn);
    
    // Page buttons
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        const firstBtn = document.createElement('button');
        firstBtn.className = 'btn btn-outline';
        firstBtn.textContent = '1';
        firstBtn.onclick = () => goToPage(1);
        container.appendChild(firstBtn);
        
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.style.padding = '0.5rem';
            container.appendChild(ellipsis);
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `btn ${i === currentPage ? 'btn-primary' : 'btn-outline'}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => goToPage(i);
        container.appendChild(pageBtn);
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.style.padding = '0.5rem';
            container.appendChild(ellipsis);
        }
        
        const lastBtn = document.createElement('button');
        lastBtn.className = 'btn btn-outline';
        lastBtn.textContent = totalPages;
        lastBtn.onclick = () => goToPage(totalPages);
        container.appendChild(lastBtn);
    }
    
    // Next button
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

// FIXED: Order Modal Functions with Proper Scrolling
async function viewOrder(orderId) {
    const order = orders.find(o => o.id == orderId);
    if (!order) {
        showToast('Order not found', 'error');
        return;
    }
    
    currentModalOrderId = orderId;
    
    // Clear any existing modal
    const existingModal = document.getElementById('orderModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create and show modal
    createAndShowInvoiceModal(order);
    
    // Populate modal data
    await populateInvoiceModal(order);
}

function createAndShowInvoiceModal(order) {
    const orderNumber = order.order_number || 'ORD-' + String(order.id).padStart(5, '0');
    const customerName = (order.customer_first_name || '') + ' ' + (order.customer_last_name || '');
    
    console.log('Creating modal for order:', order);
    console.log('Order items:', order.items);
    
    const modalHTML = `
        <div id="orderModal" class="modal-overlay" style="display: flex;">
            <div class="modal-container">
                <div class="invoice-modal">
                    <div class="invoice-header">
                        <div class="invoice-logo">
                            <img src="/icons/icon-32x32.png" alt="Qotore" class="logo-icon">
                            <div class="company-info">
                                <h2>Qotore</h2>
                                <p>Premium Fragrances</p>
                                <p>Muscat, Oman</p>
                            </div>
                        </div>
                        <div class="invoice-details">
                            <h1 id="invoiceTitle">ORDER INVOICE</h1>
                            <div class="invoice-meta">
                                <div><strong>Order #:</strong> <span id="invoiceOrderNumber">${orderNumber}</span></div>
                                <div><strong>Date:</strong> <span id="invoiceDate">${formatDate(order.created_at)}</span></div>
                                <div><strong>Status:</strong> <span id="invoiceStatus" class="status-badge status-${order.status || 'pending'}">${order.status || 'pending'}</span></div>
                            </div>
                        </div>
                        <button class="modal-close" onclick="closeOrderModal()">&times;</button>
                    </div>

                    <div class="invoice-body">
                        <div class="customer-section">
                            <h3>Customer Information</h3>
                            <div class="customer-details">
                                <div class="customer-name" id="customerName">${customerName}</div>
                                <div class="customer-contact" id="customerContact">
                                    ${order.customer_phone ? `<div>📞 ${order.customer_phone}</div>` : ''}
                                    ${order.customer_email ? `<div>✉️ ${order.customer_email}</div>` : ''}
                                </div>
                                <div class="delivery-address" id="deliveryAddress">
                                    <div><strong>Delivery Address:</strong></div>
                                    <div>${order.delivery_address || 'Not provided'}</div>
                                    <div>${order.delivery_city || ''}${order.delivery_region ? `, ${order.delivery_region}` : ''}</div>
                                </div>
                            </div>
                        </div>

                        <div class="items-section">
                            <h3>Ordered Items</h3>
                            <table class="invoice-items-table">
                                <thead>
                                    <tr>
                                        <th>Image</th>
                                        <th>Item</th>
                                        <th>Size</th>
                                        <th>Qty</th>
                                        <th>Price</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody id="invoiceItemsBody">
                                    <!-- Items will be populated here -->
                                </tbody>
                            </table>
                        </div>

                        <div class="invoice-summary">
                            <div class="summary-row">
                                <span class="summary-label">Subtotal:</span>
                                <span class="summary-value" id="invoiceSubtotal">${((order.total_amount || 0) / 1000).toFixed(3)} OMR</span>
                            </div>
                            <div class="summary-row total-row">
                                <span class="summary-label">Total Amount:</span>
                                <span class="summary-value" id="invoiceTotal">${((order.total_amount || 0) / 1000).toFixed(3)} OMR</span>
                            </div>
                        </div>

                        <div class="notes-section" id="invoiceNotesSection" style="${order.notes && order.notes.trim() ? 'display: block;' : 'display: none;'}">
                            <h4>Customer Notes</h4>
                            <div class="notes-content" id="invoiceNotes">${order.notes || ''}</div>
                        </div>
                    </div>

                    <div class="order-actions">
                        <div class="action-group">
                            <label for="statusSelect" style="font-weight: 600; color: #4a5568;">Update Status:</label>
                            <select id="statusSelect" class="filter-select" onchange="updateOrderStatusFromModal(this.value)">
                                <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                                <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                                <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </div>
                        
                        <div class="action-group">
                            <button class="btn ${order.reviewed ? 'btn-warning' : 'btn-success'}" onclick="toggleOrderReview()" id="reviewButton">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z"/>
                                </svg>
                                <span id="reviewButtonText">${order.reviewed ? 'Mark as Unreviewed' : 'Mark as Reviewed'}</span>
                            </button>
                            <button class="btn btn-danger" onclick="deleteOrderFromModal()">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                                </svg>
                                Delete Order
                            </button>
                            <button class="btn btn-secondary" onclick="printInvoice()">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18,3H6V7H18M19,12A1,1 0 0,1 18,11A1,1 0 0,1 19,10A1,1 0 0,1 20,11A1,1 0 0,1 19,12M16,19H8V14H16M19,8H5A3,3 0 0,0 2,11V17H6V21H18V17H22V11A3,3 0 0,0 19,8Z"/>
                                </svg>
                                Print Invoice
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';
    
    // Populate items after modal is in DOM
    populateInvoiceItems(order.items || []);
}

async function populateInvoiceModal(order) {
    // Modal is already populated in createAndShowInvoiceModal
    // This function exists for compatibility but the real work is done above
    console.log('Modal populated for order:', order.id);
}

// FIXED: Populate Invoice Items with Better Error Handling
async function populateInvoiceItems(items) {
    const tbody = document.getElementById('invoiceItemsBody');
    if (!tbody) {
        console.error('Invoice items table body not found');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="no-items">No items found in this order</td>
            </tr>
        `;
        return;
    }
    
    console.log('Populating items:', items);
    
    const cacheBuster = Date.now();
    
    for (const item of items) {
        const itemTotal = ((item.total_price_cents || 0) / 1000).toFixed(3);
        const itemPrice = ((item.unit_price_cents || 0) / 1000).toFixed(3);
        
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
                <div class="item-name">${item.fragrance_name || 'Unknown Item'}</div>
                ${item.fragrance_brand ? `<div class="item-brand">${item.fragrance_brand}</div>` : ''}
            </td>
            <td>
                <span class="variant-size">${item.variant_size || 'N/A'}</span>
            </td>
            <td class="quantity-cell">
                ${item.quantity || 1}
            </td>
            <td class="price-cell">
                ${item.is_whole_bottle ? 'Contact' : `${itemPrice} OMR`}
            </td>
            <td class="total-cell">
                ${item.is_whole_bottle ? 'Contact' : `${itemTotal} OMR`}
            </td>
        `;
        tbody.appendChild(row);
    }
    
    console.log('Items populated successfully');
}

// Utility function to generate slug from fragrance name
function generateSlugFromName(name) {
    if (!name || typeof name !== 'string') return '';
    
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
        .trim();
}

// FIXED: Close Modal Function
function closeOrderModal() {
    const modal = document.getElementById('orderModal');
    if (modal) {
        modal.style.display = 'none';
        modal.remove(); // Remove from DOM to prevent conflicts
        document.body.style.overflow = 'auto';
    }
    currentModalOrderId = null;
}

// FIXED: Delete Functions with Better Error Handling
async function deleteOrderDirect(orderId) {
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

async function deleteOrderFromModal() {
    if (!currentModalOrderId) {
        showToast('No order selected for deletion', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
        return;
    }
    
    try {
        await deleteOrderDirect(currentModalOrderId);
        closeOrderModal(); // Close modal after successful deletion
    } catch (error) {
        console.error('Failed to delete order from modal:', error);
        showToast('Failed to delete order: ' + error.message, 'error');
    }
}

// Order status and review functions
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
            
            // Update modal if it's open for this order
            if (currentModalOrderId == orderId) {
                const statusEl = document.getElementById('invoiceStatus');
                if (statusEl) {
                    statusEl.className = `status-badge status-${newStatus}`;
                    statusEl.textContent = newStatus;
                }
            }
        } else {
            throw new Error(result.error || 'Failed to update order status');
        }
        
    } catch (error) {
        console.error('❌ Failed to update order status:', error);
        showToast('Failed to update order status: ' + error.message, 'error');
    }
}

async function updateOrderStatusFromModal(newStatus) {
    if (!currentModalOrderId) return;
    
    try {
        await updateOrderStatus(currentModalOrderId, newStatus);
    } catch (error) {
        console.error('Failed to update order status from modal:', error);
    }
}

async function toggleOrderReviewFromTable(orderId) {
    const order = orders.find(o => o.id == orderId);
    if (!order) {
        showToast('Order not found', 'error');
        return;
    }
    
    const newReviewStatus = !order.reviewed;
    
    try {
        const response = await fetch('/admin/toggle-order-review', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ 
                id: parseInt(orderId),
                reviewed: newReviewStatus
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`Order marked as ${newReviewStatus ? 'reviewed' : 'unreviewed'}`, 'success');
            
            // Update local data
            order.reviewed = newReviewStatus;
            
            // Refresh the table
            applyFiltersAndPagination();
        } else {
            throw new Error(result.error || 'Failed to update review status');
        }
        
    } catch (error) {
        console.error('❌ Failed to toggle review status:', error);
        showToast('Failed to update review status: ' + error.message, 'error');
    }
}

async function toggleOrderReview() {
    if (!currentModalOrderId) return;
    
    const order = orders.find(o => o.id == currentModalOrderId);
    if (!order) {
        showToast('Order not found', 'error');
        return;
    }
    
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
            
            // Update local data
            order.reviewed = newReviewStatus;
            
            // Update modal button
            const reviewButton = document.getElementById('reviewButton');
            const reviewButtonText = document.getElementById('reviewButtonText');
            if (reviewButton && reviewButtonText) {
                reviewButton.className = `btn ${newReviewStatus ? 'btn-warning' : 'btn-success'}`;
                reviewButtonText.textContent = newReviewStatus ? 'Mark as Unreviewed' : 'Mark as Reviewed';
            }
            
            await refreshData(true);
        } else {
            throw new Error(result.error || 'Failed to update review status');
        }
        
    } catch (error) {
        console.error('❌ Failed to toggle review status:', error);
        showToast('Failed to update review status: ' + error.message, 'error');
    }
}

// Print functionality
function printInvoice() {
    const modalContent = document.querySelector('.invoice-modal');
    if (!modalContent) {
        showToast('No invoice content found to print', 'error');
        return;
    }
    
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
    
    const orderNumber = document.getElementById('invoiceOrderNumber')?.textContent || 'N/A';
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice - ${orderNumber}</title>
            ${printStyles}
        </head>
        <body>
            ${modalContent.innerHTML}
            <script>
                window.onload = function() {
                    window.print();
                    window.close();
                };
            </script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
}

// Notification functions
async function checkNotificationStatus() {
    try {
        const response = await fetch('/admin/notification-status', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            const toggle = document.getElementById('notificationToggle');
            if (toggle && data.success) {
                if (data.enabled) {
                    toggle.classList.add('active');
                }
            }
        }
    } catch (error) {
        console.error('Failed to check notification status:', error);
    }
}

async function toggleNotifications() {
    try {
        const response = await fetch('/admin/toggle-notifications', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            const toggle = document.getElementById('notificationToggle');
            
            if (data.success && toggle) {
                if (data.enabled) {
                    toggle.classList.add('active');
                    showToast('Notifications enabled', 'success');
                } else {
                    toggle.classList.remove('active');
                    showToast('Notifications disabled', 'warning');
                }
            }
        }
    } catch (error) {
        console.error('Failed to toggle notifications:', error);
        showToast('Failed to update notification settings', 'error');
    }
}

// Refresh function
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

// Toast notification system
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove toast after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// Utility function for date formatting
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
        return 'Invalid Date';
    }
}

// Logout function
async function logout() {
    try {
        const response = await fetch('/admin/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        // Clear any client-side storage
        clearAdminCookies();
        clearAdminStorage();
        
        // Redirect to login page
        window.location.href = '/admin/login';
        
    } catch (error) {
        console.error('Logout error:', error);
        // Even if logout fails, clear local data and redirect
        clearAdminCookies();
        clearAdminStorage();
        window.location.href = '/admin/login';
    }
}

function clearAdminCookies() {
    // Get all cookies and clear admin-related ones
    document.cookie.split(";").forEach(function(c) { 
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
        const cookieString = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
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

// Export functions to global scope for HTML onclick handlers
window.updateOrderStatus = updateOrderStatus;
window.deleteOrderDirect = deleteOrderDirect;
window.viewOrder = viewOrder;
window.closeOrderModal = closeOrderModal;
window.goToPage = goToPage;
window.logout = logout;
window.updateOrderStatusFromModal = updateOrderStatusFromModal;
window.deleteOrderFromModal = deleteOrderFromModal;
window.toggleOrderReview = toggleOrderReview;
window.toggleOrderReviewFromTable = toggleOrderReviewFromTable;
window.printInvoice = printInvoice;
window.refreshData = refreshData;