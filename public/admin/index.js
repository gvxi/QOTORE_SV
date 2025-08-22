// Global Variables
let fragrances = [];
let orders = [];
let currentEditingId = null;
let isMobile = window.innerWidth <= 768;
let isRefreshing = false;

// Initialize Admin Panel
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadDashboardData();
    loadNotificationSettings();
    initializeImageUpload();
    initializeFormHandlers();
    
    // Handle window resize
    window.addEventListener('resize', handleResize);
    
    // Initial render mode
    handleResize();
    
    // Start order polling if notifications are enabled
    setTimeout(() => {
        const notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';
        if (notificationsEnabled && Notification.permission === 'granted') {
            startOrderPolling();
        }
    }, 2000); // Wait 2 seconds after initial load
});

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
    
    loading.style.display = 'none';
    
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

// Check for new orders periodically (when notifications are enabled)
let orderCheckInterval = null;

function startOrderPolling() {
    const notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';
    
    if (notificationsEnabled && Notification.permission === 'granted') {
        // Check for new orders every 30 seconds
        orderCheckInterval = setInterval(async () => {
            await checkForNewOrders();
        }, 30000);
        
        console.log('Order polling started - checking every 30 seconds');
    }
}

function stopOrderPolling() {
    if (orderCheckInterval) {
        clearInterval(orderCheckInterval);
        orderCheckInterval = null;
        console.log('Order polling stopped');
    }
}

let lastOrderCount = 0;
let knownOrderIds = new Set();

async function checkForNewOrders() {
    try {
        const response = await fetch('/admin/orders', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                const currentOrders = result.data || [];
                
                // Initialize known orders on first load
                if (lastOrderCount === 0) {
                    lastOrderCount = currentOrders.length;
                    knownOrderIds = new Set(currentOrders.map(order => order.id));
                    return;
                }
                
                // Check for new orders
                const newOrders = currentOrders.filter(order => !knownOrderIds.has(order.id));
                
                if (newOrders.length > 0) {
                    console.log(`Found ${newOrders.length} new order(s)`);
                    
                    // Show notification for each new order
                    newOrders.forEach(order => {
                        const customerName = `${order.customer.firstName} ${order.customer.lastName}`;
                        const totalQuantity = order.totalQuantity || order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                        
                        showOrderNotification({
                            title: '🛍️ New Order Received!',
                            body: `Order ${order.orderNumber || `#${order.id}`} from ${customerName}\n💰 Total: ${order.total.toFixed(3)} OMR | 📦 ${totalQuantity} items`,
                            icon: '/favicon.ico',
                            data: {
                                orderId: order.id,
                                orderNumber: order.orderNumber,
                                customerName: customerName,
                                total: order.total,
                                itemCount: order.itemCount || order.items?.length || 0
                            },
                            tag: `order-${order.id}`,
                            requireInteraction: true
                        });
                        
                        // Add to known orders
                        knownOrderIds.add(order.id);
                    });
                    
                    // Update order count
                    lastOrderCount = currentOrders.length;
                    
                    // Refresh the orders display
                    orders = currentOrders;
                    displayOrders();
                    updateStats();
                }
            }
        }
    } catch (error) {
        console.error('Error checking for new orders:', error);
    }
}

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
}
