// Global Variables
let fragrances = [];
let orders = [];
let currentEditingId = null;

// Initialize Admin Panel
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadDashboardData();
    loadNotificationSettings();
});

// Authentication Check
function checkAuth() {
    const cookies = document.cookie.split(';');
    const adminSession = cookies.find(cookie => 
        cookie.trim().startsWith('admin_session=')
    );
    
    if (!adminSession) {
        alert('Please log in to access admin panel');
        window.location.href = 'login.html';
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
            window.location.href = 'login.html';
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
    const empty = document.getElementById('fragrancesEmpty');
    const tbody = document.getElementById('fragrancesTableBody');
    
    loading.style.display = 'none';
    
    if (fragrances.length === 0) {
        table.style.display = 'none';
        empty.style.display = 'block';
        return;
    }
    
    table.style.display = 'block';
    empty.style.display = 'none';
    
    tbody.innerHTML = '';
    
    fragrances.forEach(fragrance => {
        const row = document.createElement('tr');
        
        const variantCount = fragrance.variants ? fragrance.variants.length : 0;
        const variantsText = variantCount > 0 ? `${variantCount} variants` : 'No variants';
        
        row.innerHTML = `
            <td>
                <strong>${fragrance.name}</strong>
                <br><small style="color: #666;">${fragrance.slug}</small>
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

function displayOrders() {
    const loading = document.getElementById('ordersLoading');
    const table = document.getElementById('ordersTable');
    const empty = document.getElementById('ordersEmpty');
    const tbody = document.getElementById('ordersTableBody');
    
    loading.style.display = 'none';
    
    if (orders.length === 0) {
        table.style.display = 'none';
        empty.style.display = 'block';
        return;
    }
    
    table.style.display = 'block';
    empty.style.display = 'none';
    
    tbody.innerHTML = '';
    
    orders.forEach(order => {
        const row = document.createElement('tr');
        
        const customerName = `${order.customer.firstName} ${order.customer.lastName}`;
        const itemCount = order.items.length;
        const itemsText = itemCount === 1 ? '1 item' : `${itemCount} items`;
        
       row.innerHTML = `
    <td>
        <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 50px; height: 50px; background: #f5f5f5; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: #ccc;">
                ${fragrance.image_path ? 
                    `<img src="/api/image/${fragrance.image_path.replace('fragrance-images/', '')}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;" onerror="this.style.display='none'; this.parentNode.innerHTML='🌸';">` :
                    '🌸'
                }
            </div>
            <div>
                <strong>${fragrance.name}</strong>
                <br><small style="color: #666;">${fragrance.slug}</small>
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

function showFragrancesError() {
    document.getElementById('fragrancesLoading').style.display = 'none';
    document.getElementById('fragrancesTable').style.display = 'none';
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

// Add after DOMContentLoaded
document.getElementById('fragranceImage').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        if (!file.type.includes('png')) {
            alert('Only PNG files are allowed');
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

function clearImage() {
    document.getElementById('fragranceImage').value = '';
    document.getElementById('imagePreview').style.display = 'none';
}

// Update form submission to handle image upload
async function uploadImageIfPresent(slug) {
    const imageFile = document.getElementById('fragranceImage').files[0];
    if (!imageFile) return null;
    
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
        return result.data.path;
    }
    throw new Error('Image upload failed');
}

// Fragrance Management
function openAddFragranceModal() {
    currentEditingId = null;
    document.getElementById('fragranceModalTitle').textContent = 'Add New Fragrance';
    document.getElementById('fragranceForm').reset();
    
    // Reset variants to default
    document.getElementById('variant5ml').checked = true;
    document.getElementById('variant10ml').checked = true;
    document.getElementById('variant30ml').checked = true;
    document.getElementById('variantFull').checked = true;
    
    document.getElementById('fragranceModal').classList.add('active');
}

function editFragrance(id) {
    const fragrance = fragrances.find(f => f.id === id);
    if (!fragrance) {
        console.error('Fragrance not found:', id);
        alert('Fragrance not found. Please refresh the page.');
        return;
    }

    currentEditingId = id;
    document.getElementById('fragranceModalTitle').textContent = 'Edit Fragrance';
    
    document.getElementById('fragranceId').value = fragrance.id;
    document.getElementById('fragranceName').value = fragrance.name;
    document.getElementById('fragranceBrand').value = fragrance.brand || '';
    document.getElementById('fragranceDescription').value = fragrance.description || '';
    
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
                document.querySelector('#variant5ml').nextElementSibling.nextElementSibling.value = variant.price.toFixed(3);
            } else if (variant.size === '10ml') {
                document.getElementById('variant10ml').checked = true;
                document.querySelector('#variant10ml').nextElementSibling.nextElementSibling.value = variant.price.toFixed(3);
            } else if (variant.size === '30ml') {
                document.getElementById('variant30ml').checked = true;
                document.querySelector('#variant30ml').nextElementSibling.nextElementSibling.value = variant.price.toFixed(3);
            }
        });
    }
    
    document.getElementById('fragranceModal').classList.add('active');
}

function closeFragranceModal() {
    document.getElementById('fragranceModal').classList.remove('active');
    currentEditingId = null;
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
        alert('Failed to update fragrance visibility');
    }
}

async function deleteFragrance(id) {
    const fragrance = fragrances.find(f => f.id === id);
    if (!fragrance) return;
    
    if (!confirm(`Delete "${fragrance.name}"? This action cannot be undone.`)) return;
    
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
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error deleting fragrance:', error);
        alert('Failed to delete fragrance');
    }
}

// Order Management
function viewOrder(id) {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    
    let orderDetails = `Order #${order.id}\n\n`;
    orderDetails += `Customer: ${order.customer.firstName} ${order.customer.lastName}\n`;
    orderDetails += `Phone: ${order.customer.phone}\n`;
    if (order.customer.email) orderDetails += `Email: ${order.customer.email}\n`;
    orderDetails += `\nDelivery Address:\n${order.delivery.address}\n`;
    orderDetails += `${order.delivery.city}`;
    if (order.delivery.region) orderDetails += `, ${order.delivery.region}`;
    orderDetails += `\n\nItems:\n`;
    
    order.items.forEach((item, index) => {
        orderDetails += `${index + 1}. ${item.fragranceBrand ? item.fragranceBrand + ' ' : ''}${item.fragranceName}\n`;
        orderDetails += `   ${item.variant.size} × ${item.quantity} = ${(item.price * item.quantity).toFixed(3)} OMR\n`;
    });
    
    orderDetails += `\nTotal: ${order.total.toFixed(3)} OMR\n`;
    orderDetails += `Status: ${order.status}\n`;
    orderDetails += `Order Date: ${new Date(order.orderDate).toLocaleString()}`;
    
    if (order.notes) {
        orderDetails += `\n\nNotes: ${order.notes}`;
    }
    
    alert(orderDetails);
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
        alert('Failed to update order status');
    }
}

async function deleteOrder(id) {
    if (!confirm('Delete this order? This action cannot be undone.')) return;
    
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
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error deleting order:', error);
        alert('Failed to delete order');
    }
}

// Form Handlers
cument.getElementById('fragranceForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('fragranceName').value.trim(),
        brand: document.getElementById('fragranceBrand').value.trim(),
        description: document.getElementById('fragranceDescription').value.trim(),
        slug: document.getElementById('fragranceName').value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        variants: []
    };
    
    // Upload image if present
    try {
        const imagePath = await uploadImageIfPresent(formData.slug);
        if (imagePath) {
            formData.image = imagePath;
        }
    } catch (error) {
        alert('Image upload failed: ' + error.message);
        return;
    }
    
    // Collect variants
    const variantInputs = [
        { id: 'variant5ml', size: '5ml', size_ml: 5 },
        { id: 'variant10ml', size: '10ml', size_ml: 10 },
        { id: 'variant30ml', size: '30ml', size_ml: 30 },
        { id: 'variantFull', size: 'Whole Bottle', is_whole_bottle: true }
    ];
    
    variantInputs.forEach(variant => {
        const checkbox = document.getElementById(variant.id);
        if (checkbox.checked) {
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
        alert('Please select at least one variant');
        return;
    }
    
    if (currentEditingId) {
        formData.id = currentEditingId;
    }
    
    try {
        const endpoint = currentEditingId ? '/admin/update-fragrance' : '/admin/add-fragrance';
        const method = currentEditingId ? 'PUT' : 'POST';
        
        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        if (result.success) {
            closeFragranceModal();
            await loadFragrances();
            updateStats();
            alert(currentEditingId ? 'Fragrance updated successfully!' : 'Fragrance added successfully!');
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error saving fragrance:', error);
        alert('Failed to save fragrance: ' + error.message);
    }
});

// Notification Settings
function loadNotificationSettings() {
    const enabled = localStorage.getItem('notificationsEnabled') === 'true';
    document.getElementById('notificationsEnabled').checked = enabled;
}

function toggleNotifications() {
    const enabled = document.getElementById('notificationsEnabled').checked;
    localStorage.setItem('notificationsEnabled', enabled);
    
    if (enabled && 'Notification' in window) {
        Notification.requestPermission();
    }
}

// Logout Function
async function logout() {
    if (confirm('Are you sure you want to logout?')) {
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
    }
}

// Close modals when clicking outside
document.getElementById('fragranceModal').addEventListener('click', function(e) {
    if (e.target === this) closeFragranceModal();
});

// ESC key to close modals
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeFragranceModal();
    }
});