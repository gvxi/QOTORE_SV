// Orders Page Script
let supabase = null;
let currentLanguage = 'en';
let translations = {};
let currentUser = null;
let orders = [];
let isLoading = false;

// Initialize everything
document.addEventListener('DOMContentLoaded', initializePage);

async function initializePage() {
    try {
        await loadConfiguration();
        await loadTranslations();
        loadLanguagePreference();
        
        // Add a listener for language changes from other tabs/pages
        window.addEventListener('storage', function(e) {
            if (e.key === 'qotore_language' && e.newValue !== currentLanguage) {
                console.log('Language changed in another tab:', e.newValue);
                currentLanguage = e.newValue;
                document.documentElement.lang = currentLanguage;
                document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
                updateTranslations();
            }
        });
        
        await checkAuthentication();
        await loadUserOrders();
        setupEventListeners();
        hideLoadingSplash();
    } catch (error) {
        console.error('Error initializing orders page:', error);
        showToast('Failed to load orders', 'error');
        hideLoadingSplash();
    }
}

// Load configuration and initialize Supabase
async function loadConfiguration() {
    try {
        const response = await fetch('/api/config');
        if (response.ok) {
            const config = await response.json();
            if (typeof window.supabase !== 'undefined') {
                const { createClient } = window.supabase;
                supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
                console.log('Supabase client initialized');
            }
        }
    } catch (error) {
        console.error('Configuration load error:', error);
    }
}

// Load translations
async function loadTranslations() {
    try {
        const response = await fetch('/user/v1/user-translations.json');
        translations = await response.json();
    } catch (error) {
        console.error('Failed to load translations:', error);
        translations = { en: {}, ar: {} };
    }
}

// Translation function
function t(key) {
    return translations[currentLanguage]?.[key] || translations['en']?.[key] || key;
}

// Load language preference
function loadLanguagePreference() {
    currentLanguage = localStorage.getItem('preferred_language') || 'en';
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    updateTranslations();
}

// Update all translations
function updateTranslations() {
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        element.textContent = t(key);
    });
}

// Check authentication
async function checkAuthentication() {
    if (!supabase) {
        redirectToLogin();
        return;
    }

    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session?.user) {
            redirectToLogin();
            return;
        }

        currentUser = session.user;
    } catch (error) {
        console.error('Authentication check error:', error);
        redirectToLogin();
    }
}

// Redirect to login
function redirectToLogin() {
    showToast('Please login to view your orders', 'error');
    setTimeout(() => {
        window.location.href = '/user/login.html';
    }, 2000);
}

// Load user orders - Updated to use email-based approach
async function loadUserOrders(statusFilter = 'all') {
    if (!supabase || !currentUser || isLoading) return;

    isLoading = true;
    showLoadingState();

    try {
        // Query orders by user_id (for logged-in users) or by email (for orders placed as guest)
        let query = supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    id,
                    fragrance_name,
                    fragrance_brand,
                    variant_size,
                    quantity,
                    unit_price_cents,
                    total_price_cents,
                    is_whole_bottle
                )
            `)
            .or(`user_id.eq.${currentUser.id},customer_email.eq.${currentUser.email}`)
            .order('created_at', { ascending: false });

        // Apply status filter
        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        const { data: ordersData, error } = await query;

        if (error) {
            throw error;
        }

        orders = ordersData || [];
        displayOrders(orders);

    } catch (error) {
        console.error('Error loading orders:', error);
        showToast('Failed to load orders', 'error');
        showEmptyState();
    } finally {
        isLoading = false;
        hideLoadingState();
    }
}

// Display orders
function displayOrders(ordersToDisplay) {
    const container = document.getElementById('ordersContainer');
    
    if (!ordersToDisplay || ordersToDisplay.length === 0) {
        showEmptyState();
        return;
    }

    container.innerHTML = ordersToDisplay.map(order => createOrderCard(order)).join('');
    updateTranslations();
}

// Create order card HTML
function createOrderCard(order) {
    const orderDate = new Date(order.created_at).toLocaleDateString(
        currentLanguage === 'ar' ? 'ar-OM' : 'en-OM',
        { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }
    );

    const totalAmount = (order.total_amount / 1000).toFixed(3); // Convert fils to OMR
    const statusClass = `status-${order.status}`;

    const orderItems = order.order_items || [];

    return `
        <div class="order-card">
            <div class="order-header">
                <div class="order-info">
                    <div class="order-number">${t('order')} #${order.order_number}</div>
                    <div class="order-date">${orderDate}</div>
                </div>
                <div class="order-status ${statusClass}">
                    ${getStatusIcon(order.status)}
                    <span data-translate="${order.status}">${capitalizeFirst(order.status)}</span>
                </div>
                <div class="order-total">
                    <div class="total-label" data-translate="total">Total</div>
                    <div class="total-amount">${totalAmount} ${t('omr') || 'OMR'}</div>
                </div>
            </div>
            <div class="order-content">
                <div class="order-items">
                    ${orderItems.map(item => createOrderItemHTML(item)).join('')}
                </div>
                ${createCustomerInfoHTML(order)}
            </div>
        </div>
    `;
}

// Create order item HTML
function createOrderItemHTML(item) {
    const unitPrice = (item.unit_price_cents / 1000).toFixed(3);
    const totalPrice = (item.total_price_cents / 1000).toFixed(3);

    return `
        <div class="order-item">
            <div class="item-image">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,2A3,3 0 0,1 15,5V6H16A2,2 0 0,1 18,8V18A2,2 0 0,1 16,20H8A2,2 0 0,1 6,18V8A2,2 0 0,1 8,6H9V5A3,3 0 0,1 12,2M12,4A1,1 0 0,0 11,5V6H13V5A1,1 0 0,0 12,4Z"/>
                </svg>
            </div>
            <div class="item-details">
                <div class="item-name">${item.fragrance_name}</div>
                <div class="item-brand">${item.fragrance_brand || ''}</div>
                <div class="item-variant">${item.variant_size}${item.is_whole_bottle ? ` (${t('full_bottle') || 'Full Bottle'})` : ''}</div>
            </div>
            <div class="item-quantity">×${item.quantity}</div>
            <div class="item-price">
                <div>${unitPrice} ${t('omr') || 'OMR'}</div>
                <div style="font-size: 0.8rem; color: #64748b;">${t('total')}: ${totalPrice} ${t('omr') || 'OMR'}</div>
            </div>
        </div>
    `;
}

// Create customer info HTML
function createCustomerInfoHTML(order) {
    return `
        <div class="customer-info">
            <h4 data-translate="delivery_information">Delivery Information</h4>
            <div class="customer-details">
                <div class="detail-item">
                    <span class="detail-label" data-translate="customer_name">Customer Name:</span>
                    <span class="detail-value">${order.customer_first_name} ${order.customer_last_name || ''}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label" data-translate="phone">Phone:</span>
                    <span class="detail-value">${order.customer_phone}</span>
                </div>
                ${order.customer_email ? `
                <div class="detail-item">
                    <span class="detail-label" data-translate="email">Email:</span>
                    <span class="detail-value">${order.customer_email}</span>
                </div>
                ` : ''}
                <div class="detail-item">
                    <span class="detail-label" data-translate="delivery_city">City:</span>
                    <span class="detail-value">${order.delivery_city}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label" data-translate="delivery_region">Region:</span>
                    <span class="detail-value">${order.delivery_region || '-'}</span>
                </div>
                <div class="detail-item" style="grid-column: 1 / -1;">
                    <span class="detail-label" data-translate="delivery_address">Address:</span>
                    <span class="detail-value">${order.delivery_address}</span>
                </div>
                ${order.notes ? `
                <div class="detail-item" style="grid-column: 1 / -1;">
                    <span class="detail-label" data-translate="notes">Notes:</span>
                    <span class="detail-value">${order.notes}</span>
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Get status icon
function getStatusIcon(status) {
    switch (status) {
        case 'pending':
            return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,6A1,1 0 0,1 13,7V12.28L16.43,14.93A1,1 0 0,1 16.43,16.63L12.71,13.71A1,1 0 0,1 12,13V7A1,1 0 0,1 12,6Z"/>
            </svg>`;
        case 'reviewed':
            return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z"/>
            </svg>`;
        case 'completed':
            return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
            </svg>`;
        case 'cancelled':
            return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"/>
            </svg>`;
        default:
            return '';
    }
}

// Capitalize first letter
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Show empty state
function showEmptyState() {
    const container = document.getElementById('ordersContainer');
    container.innerHTML = `
        <div class="empty-state">
            <svg class="empty-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,7H16V6A4,4 0 0,0 8,6V7H5A1,1 0 0,0 4,8V19A3,3 0 0,0 7,22H17A3,3 0 0,0 20,19V8A1,1 0 0,0 19,7M10,6A2,2 0 0,1 14,6V7H10V6Z"/>
            </svg>
            <h3 data-translate="no_orders">No Orders Found</h3>
            <p data-translate="no_orders_message">You haven't placed any orders yet. Start shopping to see your orders here!</p>
            <a href="/" class="empty-action">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19,7H16V6A4,4 0 0,0 8,6V7H5A1,1 0 0,0 4,8V19A3,3 0 0,0 7,22H17A3,3 0 0,0 20,19V8A1,1 0 0,0 19,7M10,6A2,2 0 0,1 14,6V7H10V6Z"/>
                </svg>
                <span data-translate="start_shopping">Start Shopping</span>
            </a>
        </div>
    `;
    updateTranslations();
}

// Show loading state
function showLoadingState() {
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
        loadingState.style.display = 'flex';
    }
}

// Hide loading state
function hideLoadingState() {
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
        loadingState.style.display = 'none';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            loadUserOrders(e.target.value);
        });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.classList.add('refreshing');
            const currentFilter = document.getElementById('statusFilter').value;
            loadUserOrders(currentFilter).finally(() => {
                refreshBtn.classList.remove('refreshing');
            });
        });
    }
}

// Confirm delete order
function confirmDeleteOrder(orderId, orderNumber) {
    if (isLoading) return;

    const confirmMessage = t('confirm_delete_order') || `Are you sure you want to delete order #${orderNumber}? This action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
        deleteOrder(orderId, orderNumber);
    }
}

// Delete order function
async function deleteOrder(orderId, orderNumber) {
    if (isLoading) return;

    isLoading = true;
    
    // Show loading state on the delete button
    const orderCard = document.querySelector(`[data-order-id="${orderId}"]`);
    const deleteBtn = orderCard?.querySelector('.delete-order-btn');
    
    if (deleteBtn) {
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
            </svg>
        `;
        deleteBtn.style.animation = 'spin 1s linear infinite';
    }

    try {
        const params = new URLSearchParams({
            order_id: orderId,
            email: currentUser.email,
            user_id: currentUser.id
        });

        const response = await fetch(`/api/get-user-orders?${params}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Failed to delete order');
        }

        showToast(`Order #${orderNumber} deleted successfully`, 'success');
        
        // Remove the order card from DOM with animation
        if (orderCard) {
            orderCard.style.transition = 'all 0.3s ease';
            orderCard.style.transform = 'translateX(-100%)';
            orderCard.style.opacity = '0';
            
            setTimeout(() => {
                orderCard.remove();
                
                // Check if no orders left and show empty state
                const remainingCards = document.querySelectorAll('.order-card');
                if (remainingCards.length === 0) {
                    showEmptyState();
                }
            }, 300);
        }

        // Update orders array
        orders = orders.filter(order => order.id !== parseInt(orderId));

    } catch (error) {
        console.error('Error deleting order:', error);
        showToast(error.message || 'Failed to delete order', 'error');
        
        // Restore delete button
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.style.animation = '';
            deleteBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                </svg>
            `;
        }
    } finally {
        isLoading = false;
    }
}

// Make functions global for onclick handlers
window.confirmDeleteOrder = confirmDeleteOrder;

// Hide loading splash
function hideLoadingSplash() {
    const splash = document.getElementById('loadingSplash');
    if (splash) {
        splash.classList.add('hidden');
    }
}

// Toast notification system
function showToast(message, type = 'info', duration = 5000) {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon;
    switch (type) {
        case 'success':
            icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22,4 12,14.01 9,11.01"></polyline>
            </svg>`;
            break;
        case 'error':
            icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>`;
            break;
        default:
            icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="m9 12 2 2 4-4"></path>
            </svg>`;
    }
    
    toast.innerHTML = `${icon}<span>${message}</span>`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, duration);
}