let allOrders = [];
let currentOrders = [];
let currentPage = 1;
let ordersPerPage = 25;
let currentSearchTerm = '';
let currentStatusFilter = '';
let currentOrderModal = null;
let currentLanguage = 'en';
let translations = {};

async function loadTranslations() {
    try {
        const response = await fetch('/admin/translations.json');
        translations = await response.json();
        console.log('Translations loaded from JSON:', Object.keys(translations));
    } catch (error) {
        console.error('Failed to load translations JSON:', error);
        translations = { en: {}, ar: {} };
    }
}

function t(key) {
    return translations[currentLanguage]?.[key] || key;
}

function updateTranslations() {
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        element.textContent = t(key);
    });
    
    document.querySelectorAll('[data-translate-placeholder]').forEach(element => {
        const key = element.getAttribute('data-translate-placeholder');
        element.placeholder = t(key);
    });
}

function toggleLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'ar' : 'en';
    document.documentElement.setAttribute('dir', currentLanguage === 'ar' ? 'rtl' : 'ltr');
    document.getElementById('currentLang').textContent = currentLanguage.toUpperCase();
    
    localStorage.setItem('admin_language', currentLanguage);
    updateTranslations();
    
    if (currentOrders.length > 0) {
        displayOrders(getCurrentPageOrders());
    }
}

function loadLanguagePreference() {
    const savedLanguage = localStorage.getItem('admin_language') || 'en';
    if (savedLanguage !== currentLanguage) {
        currentLanguage = savedLanguage;
        document.documentElement.setAttribute('dir', currentLanguage === 'ar' ? 'rtl' : 'ltr');
        document.getElementById('currentLang').textContent = currentLanguage.toUpperCase();
        updateTranslations();
    }
}

function getCurrentPageOrders() {
    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    return currentOrders.slice(startIndex, endIndex);
}

document.addEventListener('DOMContentLoaded', async function() {
    await loadTranslations(); // Load JSON first
    loadLanguagePreference();
    initializeEventListeners();
    loadOrders();
    loadUserPreferences();
});

function initializeEventListeners() {
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
    
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            currentStatusFilter = e.target.value;
            currentPage = 1;
            applyFiltersAndPagination();
        });
    }
    
    const ordersPerPageSelect = document.getElementById('ordersPerPageSelect');
    if (ordersPerPageSelect) {
        ordersPerPageSelect.addEventListener('change', (e) => {
            ordersPerPage = parseInt(e.target.value);
            currentPage = 1;
            applyFiltersAndPagination();
            saveUserPreferences();
        });
    }
    
    const modal = document.getElementById('orderModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeOrderModal();
            }
        });
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeOrderModal();
        }
        if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
            e.preventDefault();
            refreshData();
        }
    });
}

async function loadOrders() {
    try {
        showLoading(true);
        
        const response = await fetch('/admin/orders', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                showToast(t('session_expired'), 'error');
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
                return;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to load orders');
        }
        
        allOrders = result.data || [];
        currentOrders = [...allOrders];
        
        updateDashboardStats(result.stats);
        applyFiltersAndPagination();
        
        showToast(`${allOrders.length} ${t('loaded_orders_successfully')}`, 'success');
        
    } catch (error) {
        console.error('Error loading orders:', error);
        showToast(`${t('failed_to_load_orders')}: ${error.message}`, 'error');
        showEmptyState();
    } finally {
        showLoading(false);
    }
}

function updateDashboardStats(stats) {
    if (!stats) {
        stats = calculateStatsFromOrders();
    }
    
    const elements = {
        totalOrders: document.getElementById('totalOrders'),
        pendingOrders: document.getElementById('pendingOrders'),
        completedOrders: document.getElementById('completedOrders'),
        totalRevenue: document.getElementById('totalRevenue')
    };
    
    if (elements.totalOrders) animateValue(elements.totalOrders, 0, stats.total || 0, 800);
    if (elements.pendingOrders) animateValue(elements.pendingOrders, 0, stats.pending || 0, 800);
    if (elements.completedOrders) animateValue(elements.completedOrders, 0, stats.completed || 0, 800);
    if (elements.totalRevenue) {
        const revenue = (stats.revenue || 0) / 1000;
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

function applyFiltersAndPagination() {
    let filteredOrders = [...allOrders];
    
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
    
    if (currentStatusFilter) {
        filteredOrders = filteredOrders.filter(order => 
            order.status === currentStatusFilter
        );
    }
    
    filteredOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    currentOrders = filteredOrders;
    
    const totalOrders = currentOrders.length;
    const totalPages = Math.ceil(totalOrders / ordersPerPage) || 1;
    
    if (currentPage > totalPages) {
        currentPage = 1;
    }
    
    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    const pageOrders = currentOrders.slice(startIndex, endIndex);
    
    displayOrders(pageOrders);
    setupPagination(totalPages, totalOrders);
}

function displayOrders(orders) {
    const tableBody = document.getElementById('ordersTableBody');
    const ordersSection = document.getElementById('ordersSection');
    const emptyState = document.getElementById('emptyState');
    
    if (!orders || orders.length === 0) {
        showEmptyState();
        return;
    }
    
    if (ordersSection) ordersSection.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';
    
    if (!tableBody) {
        console.error('Orders table body not found');
        return;
    }
    
    tableBody.innerHTML = orders.map(order => createOrderRow(order)).join('');
}

function createOrderRow(order) {
    const orderNumber = order.order_number || `ORD-${String(order.id).padStart(5, '0')}`;
    const customerName = `${order.customer_first_name} ${order.customer_last_name || ''}`.trim();
    const totalAmount = ((order.total_amount || 0) / 1000).toFixed(3);
    const orderDate = new Date(order.created_at).toLocaleDateString(currentLanguage === 'ar' ? 'ar-OM' : 'en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const items = order.items || [];
    const itemsSummary = items.length > 0 
        ? items.map(item => {
            const itemName = item.fragrance_name || t('no_items');
            const variant = item.variant_size || 'Unknown Size';
            const quantity = item.quantity || 1;
            return `<div class="item-entry">${quantity}x ${itemName} (${variant})</div>`;
        }).join('')
        : `<div class="item-entry">${t('no_items')}</div>`;
    
    const status = order.status || 'pending';
    const statusClass = `status-${status}`;
    const statusIcon = getStatusIcon(status);
    
    const viewText = currentLanguage === 'ar' ? '👁️ عرض' : '👁️ View';
    const deleteText = currentLanguage === 'ar' ? '🗑️ حذف' : '🗑️ Delete';
    
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
                    <div class="customer-contact">${order.customer_phone || t('not_provided')}</div>
                    <div class="customer-contact">${order.customer_email || t('not_provided')}</div>
                    <div class="customer-address">${order.delivery_address || ''}, ${order.delivery_city || ''}</div>
                </div>
            </td>
            <td>
                <div class="order-items-summary">
                    ${itemsSummary}
                </div>
            </td>
            <td>
                <div class="total-amount">${totalAmount} ${currentLanguage === 'ar' ? 'ر.ع' : 'OMR'}</div>
            </td>
            <td>
                <span class="status-badge ${statusClass}" onclick="toggleOrderStatus(${order.id}, '${status}')">
                    ${statusIcon} ${t(status).toUpperCase()}
                </span>
            </td>
            <td>
                <div class="order-date">${orderDate}</div>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-small btn-view" onclick="viewOrder(${order.id})">
                        ${viewText}
                    </button>
                    <button class="btn-small btn-delete" onclick="deleteOrder(${order.id})">
                        ${deleteText}
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
            ‹ ${t('previous')}
        </button>
    `;
    
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        paginationHTML += `<button class="pagination-btn" onclick="changePage(1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
        paginationHTML += `<button class="pagination-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
    }
    
    paginationHTML += `
        <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" 
                onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            ${t('next')} ›
        </button>
        <div class="pagination-info">
            ${t('showing')} ${startItem}-${endItem} ${t('of')} ${totalOrders} ${t('orders')}
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
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function viewOrder(orderId) {
    try {
        const order = allOrders.find(o => o.id === orderId);
        if (!order) {
            showToast(t('order_not_found'), 'error');
            return;
        }
        
        currentOrderModal = order;
        
        showOrderModal();
        document.getElementById('modalTitle').textContent = t('loading');
        document.getElementById('modalBody').innerHTML = `<div class="loading-spinner"><div class="spinner"></div><div class="loading-text">${t('loading_order_details')}</div></div>`;
        
        const orderDetails = await loadOrderDetails(orderId);
        
        displayOrderDetails(orderDetails || order);
        
    } catch (error) {
        console.error('Error viewing order:', error);
        showToast(`Failed to load order details: ${error.message}`, 'error');
        closeOrderModal();
    }
}

async function loadOrderDetails(orderId) {
    try {
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
    modalTitle.textContent = `${t('order_details')} ${orderNumber}`;
    
    const totalAmount = ((order.total_amount || 0) / 1000).toFixed(3);
    const orderDate = new Date(order.created_at).toLocaleString(currentLanguage === 'ar' ? 'ar-OM' : 'en-GB');
    const customerName = `${order.customer_first_name} ${order.customer_last_name || ''}`.trim();
    
    const currency = currentLanguage === 'ar' ? 'ر.ع' : 'OMR';
    
    modalBody.innerHTML = `
        <div class="order-detail-section">
            <h3>📋 ${t('order_information')}</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">${t('order_number')}</div>
                    <div class="detail-value">${orderNumber}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">${t('order_id')}</div>
                    <div class="detail-value">#${order.id}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">${t('status')}</div>
                    <div class="detail-value">
                        <span class="status-badge status-${order.status}">${getStatusIcon(order.status)} ${t(order.status || 'pending').toUpperCase()}</span>
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">${t('order_date')}</div>
                    <div class="detail-value">${orderDate}</div>
                </div>
            </div>
        </div>

        <div class="order-detail-section">
            <h3>👤 ${t('customer_information')}</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">${t('full_name')}</div>
                    <div class="detail-value">${customerName || t('not_provided')}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">${t('phone_number')}</div>
                    <div class="detail-value">
                        ${order.customer_phone ? `<a href="tel:${order.customer_phone}">${order.customer_phone}</a>` : t('not_provided')}
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">${t('email_address')}</div>
                    <div class="detail-value">
                        ${order.customer_email ? `<a href="mailto:${order.customer_email}">${order.customer_email}</a>` : t('not_provided')}
                    </div>
                </div>
            </div>
        </div>

        <div class="order-detail-section">
            <h3>🚚 ${t('delivery_information')}</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">${t('city')}</div>
                    <div class="detail-value">${order.delivery_city || t('not_provided')}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">${t('region')}</div>
                    <div class="detail-value">${order.delivery_region || t('not_provided')}</div>
                </div>
            </div>
        </div>

        <div class="order-detail-section">
            <h3>🛍️ ${t('order_items')}</h3>
            <div class="order-items-list">
                ${createOrderItemsList(order.items || [])}
            </div>
        </div>

        ${order.notes ? `
        <div class="order-detail-section">
            <h3>📝 ${t('order_notes')}</h3>
            <div class="detail-item">
                <div class="detail-value">${order.notes}</div>
            </div>
        </div>
        ` : ''}

        <div class="order-summary">
            <div class="summary-row">
                <span class="summary-label">${t('items_total')}:</span>
                <span class="summary-value">${totalAmount} ${currency}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">${t('delivery')}:</span>
                <span class="summary-value">${t('free')}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label total-amount-large">${t('total_amount')}:</span>
                <span class="summary-value total-amount-large">${totalAmount} ${currency}</span>
            </div>
        </div>

        <div class="status-change-buttons">
            ${createStatusChangeButtons(order)}
        </div>
    `;
}

function createOrderItemsList(items) {
    if (!items || items.length === 0) {
        return `<div class="order-item"><div class="item-details"><div class="item-name">${t('no_items')}</div></div></div>`;
    }
    
    const currency = currentLanguage === 'ar' ? 'ر.ع' : 'OMR';
    
    return items.map(item => {
        const itemTotal = ((item.total_price_cents || 0) / 1000).toFixed(3);
        const unitPrice = ((item.unit_price_cents || 0) / 1000).toFixed(3);
        
        return `
            <div class="order-item">
                <div class="item-details">
                    <div class="item-name">${item.fragrance_name || t('no_items')}</div>
                    <div class="item-brand">${item.fragrance_brand || 'Unknown Brand'}</div>
                    <div class="item-variant">${item.variant_size || 'Unknown Size'}</div>
                </div>
                <div class="item-pricing">
                    <div class="item-quantity">${t('qty')}: ${item.quantity || 1}</div>
                    <div class="item-unit-price">${unitPrice} ${currency} ${t('each')}</div>
                    <div class="item-total">${itemTotal} ${currency}</div>
                </div>
            </div>
        `;
    }).join('');
}

function createStatusChangeButtons(order) {
    const currentStatus = order.status || 'pending';
    const buttons = [];
    
    switch (currentStatus) {
        case 'pending':
            buttons.push(`<button class="btn btn-warning" onclick="changeOrderStatus(${order.id}, 'reviewed')">👀 ${t('mark_reviewed')}</button>`);
            buttons.push(`<button class="btn btn-success" onclick="changeOrderStatus(${order.id}, 'completed')">✅ ${t('mark_completed')}</button>`);
            buttons.push(`<button class="btn btn-danger" onclick="changeOrderStatus(${order.id}, 'cancelled')">❌ ${t('cancel_order')}</button>`);
            break;
        case 'reviewed':
            buttons.push(`<button class="btn btn-warning" onclick="changeOrderStatus(${order.id}, 'pending')">⏳ ${t('mark_pending')}</button>`);
            buttons.push(`<button class="btn btn-success" onclick="changeOrderStatus(${order.id}, 'completed')">✅ ${t('mark_completed')}</button>`);
            buttons.push(`<button class="btn btn-danger" onclick="changeOrderStatus(${order.id}, 'cancelled')">❌ ${t('cancel_order')}</button>`);
            break;
        case 'completed':
            buttons.push(`<button class="btn btn-warning" onclick="changeOrderStatus(${order.id}, 'pending')">⏳ ${t('mark_pending')}</button>`);
            buttons.push(`<button class="btn btn-warning" onclick="changeOrderStatus(${order.id}, 'reviewed')">👀 ${t('mark_reviewed')}</button>`);
            break;
        case 'cancelled':
            buttons.push(`<button class="btn btn-warning" onclick="changeOrderStatus(${order.id}, 'pending')">⏳ ${t('mark_pending')}</button>`);
            buttons.push(`<button class="btn btn-success" onclick="changeOrderStatus(${order.id}, 'completed')">✅ ${t('mark_completed')}</button>`);
            break;
    }
    
    return buttons.join('');
}

function showOrderModal() {
    const modal = document.getElementById('orderModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeOrderModal() {
    const modal = document.getElementById('orderModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        currentOrderModal = null;
    }
}

async function toggleOrderStatus(orderId, currentStatus) {
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
        
        const orderIndex = allOrders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            allOrders[orderIndex].status = newStatus;
            allOrders[orderIndex].updated_at = new Date().toISOString();
        }
        
        applyFiltersAndPagination();
        updateDashboardStats();
        
        if (currentOrderModal && currentOrderModal.id === orderId) {
            currentOrderModal.status = newStatus;
            displayOrderDetails(currentOrderModal);
        }
        
        showToast(`${t('order_status_updated')} ${t(newStatus)}`, 'success');
        
    } catch (error) {
        console.error('Error updating order status:', error);
        showToast(`${t('failed_to_update')} ${error.message}`, 'error');
    }
}

async function deleteOrder(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) {
        showToast(t('order_not_found'), 'error');
        return;
    }
    
    const orderNumber = order.order_number || `ORD-${String(order.id).padStart(5, '0')}`;
    const customerName = `${order.customer_first_name} ${order.customer_last_name || ''}`.trim();
    
    const confirmed = confirm(`${t('are_you_sure_delete')} ${orderNumber} ${t('from')} ${customerName}?\n\n${t('action_cannot_be_undone')}`);
    if (!confirmed) {
        return;
    }
    
    try {
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
        
        const orderIndex = allOrders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            allOrders.splice(orderIndex, 1);
        }
        
        if (currentOrderModal && currentOrderModal.id === orderId) {
            closeOrderModal();
        }
        
        applyFiltersAndPagination();
        updateDashboardStats();
        
        showToast(`${orderNumber} ${t('order_deleted_successfully')}`, 'success');
        
    } catch (error) {
        console.error('Error deleting order:', error);
        showToast(`${t('failed_to_delete')} ${error.message}`, 'error');
    }
}

function deleteCurrentOrder() {
    if (currentOrderModal && currentOrderModal.id) {
        deleteOrder(currentOrderModal.id);
    } else {
        showToast(t('no_order_selected'), 'error');
    }
}

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
        refreshBtn.querySelector('span').textContent = t('refreshing');
    }
    
    loadOrders().finally(() => {
        if (refreshBtn) {
            refreshBtn.classList.remove('refreshing');
            refreshBtn.querySelector('span').textContent = t('refresh');
        }
    });
}

function clearAdminSession() {
    const cookieOptions = [
        'admin_session=; Path=/admin/; Max-Age=0; SameSite=Lax',
        'admin_session=; Path=/; Max-Age=0; SameSite=Lax',
        'admin_session=; Path=/; Max-Age=0',
        'admin_session=; Max-Age=0'
    ];
    
    cookieOptions.forEach(cookieString => {
        document.cookie = cookieString;
    });
    
    localStorage.removeItem('admin_session');
    localStorage.removeItem('orders_cache');
    localStorage.removeItem('admin_preferences');
}

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
window.toggleLanguage = toggleLanguage;