// Admin Dashboard - Complete Fixed Version
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
});

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
        console.log('Loading fragrances...');
        const response = await fetch('/admin/fragrances', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Fragrances response:', result);
            if (result.success) {
                fragrances = result.data || [];
                fragrancesPage = 1;
                displayFragrances();
                console.log('Loaded fragrances:', fragrances.length);
            } else {
                throw new Error(result.error || 'Failed to load fragrances');
            }
        } else if (response.status === 401) {
            window.location.href = '/login.html';
        } else {
            throw new Error(`HTTP ${response.status}: Failed to load fragrances`);
        }
    } catch (error) {
        console.error('Error loading fragrances:', error);
        showFragrancesError();
    }
}

// Load Orders
async function loadOrders() {
    try {
        console.log('Loading orders...');
        const response = await fetch('/admin/orders', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Orders response:', result);
            if (result.success) {
                orders = result.data || [];
                ordersPage = 1;
                displayOrders();
                console.log('Loaded orders:', orders.length);
                
                // Update service worker if notifications enabled
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

// Filter Functions
function filterFragrances() {
    if (!fragrancesSearchTerm) {
        filteredFragrances = [...fragrances];
        return;
    }
    
    const searchTerm = fragrancesSearchTerm.toLowerCase();
    filteredFragrances = fragrances.filter(fragrance => {
        const name = (fragrance.name || '').toLowerCase();
        const brand = (fragrance.brand || '').toLowerCase();
        const description = (fragrance.description || '').toLowerCase();
        
        return name.includes(searchTerm) ||
               brand.includes(searchTerm) ||
               description.includes(searchTerm);
    });
}

function filterOrders() {
    if (!ordersSearchTerm) {
        filteredOrders = [...orders];
        return;
    }
    
    const searchTerm = ordersSearchTerm.toLowerCase();
    filteredOrders = orders.filter(order => {
        if (!order.customer) return false;
        
        const firstName = (order.customer.firstName || '').toLowerCase();
        const lastName = (order.customer.lastName || '').toLowerCase();
        const phone = (order.customer.phone || '').toLowerCase();
        const email = (order.customer.email || '').toLowerCase();
        const orderNumber = (order.orderNumber || '').toLowerCase();
        
        return firstName.includes(searchTerm) ||
               lastName.includes(searchTerm) ||
               phone.includes(searchTerm) ||
               email.includes(searchTerm) ||
               orderNumber.includes(searchTerm);
    });
}

// Display Functions
function displayFragrances() {
    const loading = document.getElementById('fragrancesLoading');
    const table = document.getElementById('fragrancesTable');
    const mobile = document.getElementById('fragrancesMobile');
    const empty = document.getElementById('fragrancesEmpty');
    const controls = document.getElementById('fragrancesControls');
    const noResults = document.getElementById('fragrancesNoResults');
    
    if (loading) loading.style.display = 'none';
    
    // Filter fragrances first
    filterFragrances();
    
    if (fragrances.length === 0) {
        if (table) table.style.display = 'none';
        if (mobile) mobile.style.display = 'none';
        if (controls) controls.style.display = 'none';
        if (noResults) noResults.style.display = 'none';
        if (empty) empty.style.display = 'block';
        return;
    }
    
    if (filteredFragrances.length === 0 && fragrancesSearchTerm) {
        if (table) table.style.display = 'none';
        if (mobile) mobile.style.display = 'none';
        if (empty) empty.style.display = 'none';
        if (controls) controls.style.display = 'flex';
        if (noResults) noResults.style.display = 'block';
        updateFragrancesPagination();
        return;
    }
    
    if (empty) empty.style.display = 'none';
    if (noResults) noResults.style.display = 'none';
    if (controls) controls.style.display = 'flex';
    
    if (isMobile) {
        // Show mobile card view
        if (table) table.style.display = 'none';
        if (mobile) mobile.style.display = 'block';
        displayFragrancesMobile();
    } else {
        // Show desktop table view
        if (mobile) mobile.style.display = 'none';
        if (table) table.style.display = 'block';
        displayFragrancesTable();
    }
    
    updateFragrancesPagination();
}

function displayFragrancesTable() {
    const tbody = document.getElementById('fragrancesTableBody');
    if (!tbody) return;
    
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
                            `<img src="/api/image/${fragrance.image_path}" alt="${fragrance.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;" onerror="this.style.display='none'; this.parentNode.innerHTML='🌸';">` : 
                            '🌸'
                        }
                    </div>
                    <div>
                        <div style="font-weight: 600;">${fragrance.name}</div>
                        <div style="font-size: 0.8rem; color: #666;">${fragrance.brand || 'No brand'}</div>
                    </div>
                </div>
            </td>
            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${fragrance.description || 'No description'}">
                ${fragrance.description || 'No description'}
            </td>
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
    const container = document.getElementById('fragrancesMobileContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    const paginatedFragrances = getFragrancesPaginatedData();
    
    paginatedFragrances.forEach(fragrance => {
        const card = document.createElement('div');
        card.className = 'mobile-card';
        
        const variantCount = fragrance.variants ? fragrance.variants.length : 0;
        const variantsText = variantCount > 0 ? `${variantCount} variants` : 'No variants';
        
        card.innerHTML = `
            <div class="mobile-card-header">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 50px; height: 50px; background: #f5f5f5; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #ccc; flex-shrink: 0;">
                        ${fragrance.image_path ? 
                            `<img src="/api/image/${fragrance.image_path}" alt="${fragrance.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;" onerror="this.style.display='none'; this.parentNode.innerHTML='🌸';">` : 
                            '🌸'
                        }
                    </div>
                    <div>
                        <div style="font-weight: 600; margin-bottom: 4px;">${fragrance.name}</div>
                        <div style="font-size: 0.8rem; color: #666;">${fragrance.brand || 'No brand'}</div>
                    </div>
                </div>
                <span class="status-badge ${fragrance.hidden ? 'status-hidden' : 'status-visible'}">
                    ${fragrance.hidden ? 'Hidden' : 'Visible'}
                </span>
            </div>
            <div class="mobile-card-body">
                <div><strong>Description:</strong> ${fragrance.description || 'No description'}</div>
                <div><strong>Variants:</strong> ${variantsText}</div>
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

    if (loading) loading.style.display = 'none';
    
    // Filter orders first
    filterOrders();
    
    if (orders.length === 0) {
        if (table) table.style.display = 'none';
        if (mobile) mobile.style.display = 'none';
        if (controls) controls.style.display = 'none';
        if (noResults) noResults.style.display = 'none';
        if (empty) empty.style.display = 'block';
        return;
    }
    
    if (filteredOrders.length === 0 && ordersSearchTerm) {
        if (table) table.style.display = 'none';
        if (mobile) mobile.style.display = 'none';
        if (empty) empty.style.display = 'none';
        if (controls) controls.style.display = 'flex';
        if (noResults) noResults.style.display = 'block';
        updateOrdersPagination();
        return;
    }
    
    if (empty) empty.style.display = 'none';
    if (noResults) noResults.style.display = 'none';
    if (controls) controls.style.display = 'flex';
    
    if (isMobile) {
        // Show mobile card view
        if (table) table.style.display = 'none';
        if (mobile) mobile.style.display = 'block';
        displayOrdersMobile();
    } else {
        // Show desktop table view
        if (mobile) mobile.style.display = 'none';
        if (table) table.style.display = 'block';
        displayOrdersTable();
    }
    
    updateOrdersPagination();
}

function displayOrdersTable() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const paginatedOrders = getOrdersPaginatedData();
    
    paginatedOrders.forEach(order => {
        const row = document.createElement('tr');
        
        const customerName = order.customer ? 
            `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() : 
            'Unknown Customer';
        
        const itemCount = order.items ? order.items.length : 0;
        const total = order.items ? 
            order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(3) : 
            '0.000';
        
        const createdDate = order.created_at ? 
            new Date(order.created_at).toLocaleDateString() : 
            'Unknown';
            
        row.innerHTML = `
            <td>${order.orderNumber || `#${order.id}`}</td>
            <td>
                <div>
                    <div style="font-weight: 600;">${customerName}</div>
                    <div style="font-size: 0.8rem; color: #666;">${order.customer?.phone || 'No phone'}</div>
                </div>
            </td>
            <td>${itemCount} items</td>
            <td>${total} OMR</td>
            <td>${createdDate}</td>
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
    const container = document.getElementById('ordersMobileContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    const paginatedOrders = getOrdersPaginatedData();
    
    paginatedOrders.forEach(order => {
        const card = document.createElement('div');
        card.className = 'mobile-card';
        
        const customerName = order.customer ? 
            `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() : 
            'Unknown Customer';
        
        const itemCount = order.items ? order.items.length : 0;
        const total = order.items ? 
            order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(3) : 
            '0.000';
        
        const createdDate = order.created_at ? 
            new Date(order.created_at).toLocaleDateString() : 
            'Unknown';
            
        card.innerHTML = `
            <div class="mobile-card-header">
                <div>
                    <div style="font-weight: 600; margin-bottom: 4px;">${order.orderNumber || `#${order.id}`}</div>
                    <div style="font-size: 0.8rem; color: #666;">${createdDate}</div>
                </div>
                <span class="status-badge ${order.status === 'completed' ? 'status-completed' : 'status-pending'}">
                    ${order.status === 'completed' ? 'Completed' : 'Pending'}
                </span>
            </div>
            <div class="mobile-card-body">
                <div><strong>Customer:</strong> ${customerName}</div>
                <div><strong>Phone:</strong> ${order.customer?.phone || 'No phone'}</div>
                <div><strong>Items:</strong> ${itemCount} items</div>
                <div><strong>Total:</strong> ${total} OMR</div>
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
    const loading = document.getElementById('fragrancesLoading');
    const table = document.getElementById('fragrancesTable');
    const mobile = document.getElementById('fragrancesMobile');
    const controls = document.getElementById('fragrancesControls');
    const empty = document.getElementById('fragrancesEmpty');
    
    if (loading) loading.style.display = 'none';
    if (table) table.style.display = 'none';
    if (mobile) mobile.style.display = 'none';
    if (controls) controls.style.display = 'none';
    if (empty) {
        empty.style.display = 'block';
        const h3 = empty.querySelector('h3');
        const p = empty.querySelector('p');
        if (h3) h3.textContent = 'Error loading fragrances';
        if (p) p.textContent = 'Please refresh the page to try again';
    }
}

function updateStats() {
    const totalFragrances = fragrances.length;
    const visibleFragrances = fragrances.filter(f => !f.hidden).length;
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status !== 'completed').length;
    
    const totalFragrancesEl = document.getElementById('totalFragrances');
    const visibleFragrancesEl = document.getElementById('visibleFragrances');
    const totalOrdersEl = document.getElementById('totalOrders');
    const pendingOrdersEl = document.getElementById('pendingOrders');
    
    if (totalFragrancesEl) totalFragrancesEl.textContent = totalFragrances;
    if (visibleFragrancesEl) visibleFragrancesEl.textContent = visibleFragrances;
    if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
    if (pendingOrdersEl) pendingOrdersEl.textContent = pendingOrders;
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
}

// Search Functions
function filterAndDisplayFragrances() {
    fragrancesPage = 1;
    displayFragrances();
}

function filterAndDisplayOrders() {
    ordersPage = 1;
    displayOrders();
}

function clearFragrancesSearch() {
    const searchInput = document.getElementById('fragrancesSearch');
    if (searchInput) {
        searchInput.value = '';
        fragrancesSearchTerm = '';
        fragrancesPage = 1;
        displayFragrances();
        toggleSearchClear('fragrances');
    }
}

function clearOrdersSearch() {
    const searchInput = document.getElementById('ordersSearch');
    if (searchInput) {
        searchInput.value = '';
        ordersSearchTerm = '';
        ordersPage = 1;
        displayOrders();
        toggleSearchClear('orders');
    }
}

function toggleSearchClear(type) {
    const searchInput = document.getElementById(`${type}Search`);
    const clearBtn = document.getElementById(`${type}ClearSearch`);
    
    if (searchInput && clearBtn) {
        clearBtn.style.display = searchInput.value ? 'block' : 'none';
    }
}

// Pagination Navigation
function previousFragrancesPage() {
    if (fragrancesPage > 1) {
        fragrancesPage--;
        displayFragrances();
    }
}

function nextFragrancesPage() {
    const totalPages = Math.ceil(filteredFragrances.length / fragrancesPerPage);
    if (fragrancesPage < totalPages) {
        fragrancesPage++;
        displayFragrances();
    }
}

function previousOrdersPage() {
    if (ordersPage > 1) {
        ordersPage--;
        displayOrders();
    }
}

function nextOrdersPage() {
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    if (ordersPage < totalPages) {
        ordersPage++;
        displayOrders();
    }
}

// Fragrance Management Functions
function openFragranceModal() {
    currentEditingId = null;
    document.getElementById('fragranceModalTitle').textContent = 'Add New Fragrance';
    document.getElementById('fragranceForm').reset();
    clearImage();
    document.getElementById('fragranceModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function editFragrance(id) {
    const fragrance = fragrances.find(f => f.id === id);
    if (!fragrance) return;
    
    currentEditingId = id;
    document.getElementById('fragranceModalTitle').textContent = 'Edit Fragrance';
    
    // Populate form
    document.getElementById('fragranceName').value = fragrance.name || '';
    document.getElementById('fragranceSlug').value = fragrance.slug || '';
    document.getElementById('fragranceBrand').value = fragrance.brand || '';
    document.getElementById('fragranceDescription').value = fragrance.description || '';
    
    // Set visibility
    document.getElementById('fragranceHidden').checked = fragrance.hidden || false;
    
    // Show image preview if exists
    if (fragrance.image_path) {
        const preview = document.getElementById('imagePreview');
        if (preview) {
            preview.style.display = 'block';
            preview.innerHTML = `<img src="/api/image/${fragrance.image_path}" alt="Preview" style="max-width: 100%; max-height: 200px;">`;
        }
    }
    
    // Populate variants
    if (fragrance.variants && fragrance.variants.length > 0) {
        fragrance.variants.forEach(variant => {
            const checkbox = document.querySelector(`input[data-variant="${variant.size}"]`);
            if (checkbox) {
                checkbox.checked = true;
                if (!variant.is_whole_bottle) {
                    const priceInput = document.querySelector(`input[data-variant-price="${variant.size}"]`);
                    if (priceInput) {
                        priceInput.value = variant.price || '';
                    }
                }
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
        orderDetails += `   Size: ${item.variant.size}\n`;
        orderDetails += `   Price: ${item.variant.price_display}\n`;
        orderDetails += `   Quantity: ${item.quantity}\n\n`;
    });
    
    const total = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    orderDetails += `Total: ${total.toFixed(3)} OMR\n`;
    
    if (order.notes) {
        orderDetails += `\nNotes: ${order.notes}`;
    }
    
    showCustomAlert(orderDetails);
}

async function toggleOrderStatus(id) {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    
    const newStatus = order.status === 'completed' ? 'pending' : 'completed';
    
    try {
        const response = await fetch('/admin/toggle-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ id, status: newStatus })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        if (result.success) {
            await loadOrders();
            updateStats();
            showCustomAlert(`Order marked as ${newStatus}!`);
        } else {
            throw new Error(result.error || 'Failed to update order status');
        }
    } catch (error) {
        console.error('Error toggling order status:', error);
        showCustomAlert('Failed to update order status: ' + error.message);
    }
}

async function deleteOrder(id) {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    
    const orderName = order.orderNumber || `#${order.id}`;
    showCustomConfirm(`Delete order ${orderName}? This action cannot be undone.`, async () => {
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

// Refresh Data
async function refreshData() {
    if (isRefreshing) return;
    
    isRefreshing = true;
    const refreshBtn = document.getElementById('refreshBtn');
    
    if (refreshBtn) {
        refreshBtn.classList.add('refreshing');
        refreshBtn.title = 'Refreshing...';
    }
    
    try {
        await loadDashboardData();
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

// Form handling and initialization functions
function initializeSearchAndPagination() {
    // Fragrances search
    const fragrancesSearch = document.getElementById('fragrancesSearch');
    if (fragrancesSearch) {
        fragrancesSearch.addEventListener('input', (e) => {
            fragrancesSearchTerm = e.target.value.toLowerCase();
            filterAndDisplayFragrances();
            toggleSearchClear('fragrances');
        });
    }
    
    // Orders search
    const ordersSearch = document.getElementById('ordersSearch');
    if (ordersSearch) {
        ordersSearch.addEventListener('input', (e) => {
            ordersSearchTerm = e.target.value.toLowerCase();
            filterAndDisplayOrders();
            toggleSearchClear('orders');
        });
    }
}

function initializeFormHandlers() {
    const fragranceForm = document.getElementById('fragranceForm');
    if (fragranceForm) {
        fragranceForm.addEventListener('submit', handleFragranceSubmit);
    }
}

function initializeImageUpload() {
    const imageInput = document.getElementById('fragranceImage');
    if (imageInput) {
        imageInput.addEventListener('change', handleImageUpload);
    }
}

function handleImageUpload(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('imagePreview');
    
    if (file && preview) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.style.display = 'block';
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 100%; max-height: 200px;">`;
        };
        reader.readAsDataURL(file);
    }
}

function clearImage() {
    const imageInput = document.getElementById('fragranceImage');
    const preview = document.getElementById('imagePreview');
    
    if (imageInput) imageInput.value = '';
    if (preview) {
        preview.style.display = 'none';
        preview.innerHTML = '';
    }
}

async function handleFragranceSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitFragranceBtn');
    const originalText = submitBtn.textContent;
    
    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        
        const form = e.target;
        
        // Basic fragrance data
        const fragranceData = {
            name: form.fragranceName.value.trim(),
            slug: form.fragranceSlug.value.trim(),
            brand: form.fragranceBrand.value.trim(),
            description: form.fragranceDescription.value.trim(),
            hidden: form.fragranceHidden.checked,
            variants: []
        };

        // Validate required fields
        if (!fragranceData.name || !fragranceData.slug) {
            throw new Error('Name and slug are required');
        }

        // Collect variants
        const variantCheckboxes = form.querySelectorAll('input[data-variant]');
        variantCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                const size = checkbox.getAttribute('data-variant');
                const isWholeBottle = size === 'Whole Bottle';
                
                const variant = {
                    size: size,
                    is_whole_bottle: isWholeBottle
                };
                
                if (!isWholeBottle) {
                    const priceInput = form.querySelector(`input[data-variant-price="${size}"]`);
                    if (priceInput && priceInput.value) {
                        variant.price = parseFloat(priceInput.value);
                    }
                }
                
                fragranceData.variants.push(variant);
            }
        });

        let response;
        
        // Handle image upload for both add and update
        const imageFile = form.fragranceImage.files[0];
        if (imageFile || !currentEditingId) {
            // Use FormData for image upload
            const formData = new FormData();
            if (imageFile) {
                formData.append('image', imageFile);
            }
            formData.append('data', JSON.stringify(fragranceData));
            
            if (currentEditingId) {
                formData.append('id', currentEditingId);
                // Use PUT method for update
                response = await fetch('/admin/update-fragrance', {
                    method: 'PUT',
                    credentials: 'include',
                    body: formData
                });
            } else {
                response = await fetch('/admin/add-fragrance', {
                    method: 'POST',
                    credentials: 'include',
                    body: formData
                });
            }
        } else {
            // Update without image - use JSON
            if (currentEditingId) {
                fragranceData.id = currentEditingId;
            }
            
            response = await fetch(currentEditingId ? '/admin/update-fragrance' : '/admin/add-fragrance', {
                method: currentEditingId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(fragranceData)
            });
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        if (result.success) {
            closeFragranceModal();
            await loadFragrances();
            updateStats();
            showCustomAlert(currentEditingId ? 'Fragrance updated successfully!' : 'Fragrance added successfully!');
        } else {
            throw new Error(result.error || 'Failed to save fragrance');
        }
        
    } catch (error) {
        console.error('Error saving fragrance:', error);
        showCustomAlert('Failed to save fragrance: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Service Worker Functions
function initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registered');
                serviceWorker = registration;
                
                // Listen for messages from service worker
                navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
                
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    }
}

function handleServiceWorkerMessage(event) {
    const { type, data } = event.data;
    
    switch (type) {
        case 'NEW_ORDER_NOTIFICATION':
            console.log('New order notification received:', data);
            // Refresh orders to show new order
            loadOrders();
            break;
        case 'NOTIFICATION_PERMISSION_CHANGED':
            notificationPermission = data.permission;
            break;
    }
}

function sendMessageToServiceWorker(type, data) {
    return new Promise((resolve, reject) => {
        if (!serviceWorker || !serviceWorker.active) {
            reject(new Error('Service Worker not available'));
            return;
        }
        
        const messageChannel = new MessageChannel();
        
        messageChannel.port1.onmessage = function(event) {
            if (event.data.error) {
                reject(new Error(event.data.error));
            } else {
                resolve(event.data);
            }
        };
        
        serviceWorker.active.postMessage({
            type,
            data
        }, [messageChannel.port2]);
    });
}

function loadNotificationSettings() {
    const notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';
    const toggleSwitch = document.getElementById('notificationToggle');
    
    if (toggleSwitch) {
        toggleSwitch.checked = notificationsEnabled;
        toggleSwitch.addEventListener('change', toggleNotifications);
    }
}

async function toggleNotifications() {
    const toggleSwitch = document.getElementById('notificationToggle');
    const enabled = toggleSwitch.checked;
    
    if (enabled) {
        // Request permission
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            localStorage.setItem('notificationsEnabled', 'true');
            
            // Initialize service worker with current orders
            if (serviceWorker && serviceWorker.active) {
                const currentOrderIds = orders.map(order => order.id);
                try {
                    await sendMessageToServiceWorker('ENABLE_NOTIFICATIONS', {
                        orderIds: currentOrderIds
                    });
                    showCustomAlert('Order notifications enabled!');
                } catch (error) {
                    console.error('Failed to enable notifications:', error);
                    showCustomAlert('Failed to enable notifications');
                }
            }
        } else {
            toggleSwitch.checked = false;
            showCustomAlert('Please allow notifications in your browser settings');
        }
    } else {
        localStorage.setItem('notificationsEnabled', 'false');
        
        if (serviceWorker && serviceWorker.active) {
            try {
                await sendMessageToServiceWorker('DISABLE_NOTIFICATIONS', {});
                showCustomAlert('Order notifications disabled');
            } catch (error) {
                console.error('Failed to disable notifications:', error);
            }
        }
    }
}

function detectIOSPWA() {
    isIOSPWA = window.navigator.standalone === true;
    if (isIOSPWA) {
        document.body.classList.add('ios-pwa');
    }
}

// Utility Functions
function showCustomAlert(message, callback = null) {
    // Create simple alert modal
    const modal = document.createElement('div');
    modal.className = 'custom-alert-modal';
    modal.innerHTML = `
        <div class="custom-alert-content">
            <div class="custom-alert-message">${message}</div>
            <div class="custom-alert-actions">
                <button class="custom-modal-btn custom-alert-ok">OK</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    const okBtn = modal.querySelector('.custom-alert-ok');
    okBtn.onclick = () => {
        document.body.removeChild(modal);
        document.body.style.overflow = 'auto';
        if (callback) callback();
    };
    
    // Focus the OK button
    okBtn.focus();
}

function showCustomConfirm(message, onConfirm) {
    // Create simple confirm modal
    const modal = document.createElement('div');
    modal.className = 'custom-alert-modal';
    modal.innerHTML = `
        <div class="custom-alert-content">
            <div class="custom-alert-message">${message}</div>
            <div class="custom-alert-actions">
                <button class="custom-modal-btn secondary custom-alert-cancel">Cancel</button>
                <button class="custom-modal-btn custom-alert-confirm">Confirm</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    const cancelBtn = modal.querySelector('.custom-alert-cancel');
    const confirmBtn = modal.querySelector('.custom-alert-confirm');
    
    cancelBtn.onclick = () => {
        document.body.removeChild(modal);
        document.body.style.overflow = 'auto';
    };
    
    confirmBtn.onclick = () => {
        document.body.removeChild(modal);
        document.body.style.overflow = 'auto';
        onConfirm();
    };
    
    // Focus the confirm button
    confirmBtn.focus();
}