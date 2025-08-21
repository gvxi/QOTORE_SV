// Global variables
let orders = [];
let fragrances = [];
let filteredOrders = [];
let filteredFragrances = [];
let currentTab = 'orders';
let editingFragranceId = null;

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuthentication();
    
    // Load initial data
    loadOrders();
    
    // Setup event listeners
    setupEventListeners();
});

// Check if user is authenticated
async function checkAuthentication() {
    try {
        const response = await fetch('/api/admin/auth/verify', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            window.location.href = '/admin/login.html';
            return;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/admin/login.html';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    document.getElementById('ordersSearch').addEventListener('input', debounce(filterOrders, 300));
    document.getElementById('ordersFilter').addEventListener('change', filterOrders);
    document.getElementById('fragrancesSearch').addEventListener('input', debounce(filterFragrances, 300));
    document.getElementById('fragrancesFilter').addEventListener('change', filterFragrances);
    
    // Form submission
    document.getElementById('fragranceForm').addEventListener('submit', handleFragranceSubmit);
    
    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
            }
        });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Debounce function for search
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

// Tab Management
function switchTab(tabName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    currentTab = tabName;
    
    // Load data for the active tab
    if (tabName === 'fragrances' && fragrances.length === 0) {
        loadFragrances();
    }
}

// Orders Management
async function loadOrders() {
    showLoadingState('orders');
    
    try {
        const response = await fetch('/api/admin/orders', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const result = await response.json();
            orders = result.data || [];
            filteredOrders = [...orders];
            displayOrders();
        } else {
            throw new Error('Failed to load orders');
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        showEmptyState('orders');
        showToast('Error loading orders', 'error');
    }
}

function displayOrders() {
    const tableBody = document.getElementById('ordersTableBody');
    const ordersTable = document.getElementById('ordersTable');
    const emptyOrders = document.getElementById('emptyOrders');
    const ordersLoading = document.getElementById('ordersLoading');
    
    ordersLoading.style.display = 'none';
    
    if (!filteredOrders.length) {
        ordersTable.style.display = 'none';
        emptyOrders.style.display = 'block';
        return;
    }
    
    ordersTable.style.display = 'block';
    emptyOrders.style.display = 'none';
    
    tableBody.innerHTML = filteredOrders.map(order => `
        <tr onclick="viewOrderDetails('${order.id}')" style="cursor: pointer;">
            <td>
                <strong>#${order.id}</strong>
            </td>
            <td>
                <div>
                    <div style="font-weight: 500;">${order.customer.name}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${order.customer.email}</div>
                </div>
            </td>
            <td>
                <span style="font-weight: 500;">${order.items.length}</span> item${order.items.length !== 1 ? 's' : ''}
            </td>
            <td>
                <strong style="color: var(--primary-color);">${formatPrice(order.total)}</strong>
            </td>
            <td>
                <span class="status-badge status-${order.status}">${formatStatus(order.status)}</span>
            </td>
            <td>
                <div style="font-size: 0.8rem;">${formatDate(order.createdAt)}</div>
            </td>
            <td onclick="event.stopPropagation();">
                <div class="action-buttons">
                    ${order.status === 'pending' ? `
                        <button class="action-btn btn-success" onclick="updateOrderStatus('${order.id}', 'completed')" title="Mark as Completed">
                            <img src="/api/image/check-icon.png" alt="Complete" onerror="this.textContent='✓';">
                        </button>
                        <button class="action-btn btn-warning" onclick="updateOrderStatus('${order.id}', 'canceled')" title="Cancel Order">
                            <img src="/api/image/cancel-icon.png" alt="Cancel" onerror="this.textContent='✕';">
                        </button>
                    ` : ''}
                    <button class="action-btn btn-danger" onclick="deleteOrder('${order.id}')" title="Delete Order">
                        <img src="/api/image/delete-icon.png" alt="Delete" onerror="this.textContent='🗑️';">
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function filterOrders() {
    const searchTerm = document.getElementById('ordersSearch').value.toLowerCase();
    const statusFilter = document.getElementById('ordersFilter').value;
    
    filteredOrders = orders.filter(order => {
        const matchesSearch = 
            order.id.toString().includes(searchTerm) ||
            order.customer.name.toLowerCase().includes(searchTerm) ||
            order.customer.email.toLowerCase().includes(searchTerm);
        
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });
    
    displayOrders();
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await fetch(`/api/admin/orders/${orderId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.ok) {
            // Update local data
            const orderIndex = orders.findIndex(o => o.id === orderId);
            if (orderIndex !== -1) {
                orders[orderIndex].status = newStatus;
                filterOrders();
            }
            showToast(`Order ${newStatus} successfully`, 'success');
        } else {
            throw new Error('Failed to update order status');
        }
    } catch (error) {
        console.error('Error updating order:', error);
        showToast('Failed to update order status', 'error');
    }
}

async function deleteOrder(orderId) {
    if (!confirm('Are you sure you want to delete this order?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/orders/${orderId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            // Remove from local data
            orders = orders.filter(o => o.id !== orderId);
            filterOrders();
            showToast('Order deleted successfully', 'success');
        } else {
            throw new Error('Failed to delete order');
        }
    } catch (error) {
        console.error('Error deleting order:', error);
        showToast('Failed to delete order', 'error');
    }
}

function viewOrderDetails(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const modalBody = document.getElementById('orderModalBody');
    modalBody.innerHTML = `
        <div style="margin-bottom: 1.5rem;">
            <h4 style="margin-bottom: 1rem; color: var(--text-primary);">Order Information</h4>
            <div style="background: var(--background); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div><strong>Order ID:</strong> #${order.id}</div>
                    <div><strong>Status:</strong> <span class="status-badge status-${order.status}">${formatStatus(order.status)}</span></div>
                    <div><strong>Date:</strong> ${formatDate(order.createdAt)}</div>
                    <div><strong>Total:</strong> <strong style="color: var(--primary-color);">${formatPrice(order.total)}</strong></div>
                </div>
            </div>
        </div>
        
        <div style="margin-bottom: 1.5rem;">
            <h4 style="margin-bottom: 1rem; color: var(--text-primary);">Customer Information</h4>
            <div style="background: var(--background); padding: 1rem; border-radius: var(--radius-md);">
                <div style="display: grid; gap: 0.5rem;">
                    <div><strong>Name:</strong> ${order.customer.name}</div>
                    <div><strong>Email:</strong> ${order.customer.email}</div>
                    <div><strong>Phone:</strong> ${order.customer.phone}</div>
                    <div><strong>Address:</strong> ${order.customer.address}</div>
                    ${order.preferredTime ? `<div><strong>Preferred Time:</strong> ${order.preferredTime}</div>` : ''}
                    ${order.specialInstructions ? `<div><strong>Instructions:</strong> ${order.specialInstructions}</div>` : ''}
                </div>
            </div>
        </div>
        
        <div>
            <h4 style="margin-bottom: 1rem; color: var(--text-primary);">Order Items</h4>
            <div style="background: var(--background); border-radius: var(--radius-md); overflow: hidden;">
                ${order.items.map(item => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid var(--border);">
                        <div>
                            <div style="font-weight: 500; margin-bottom: 0.25rem;">${item.fragrance}</div>
                            <div style="font-size: 0.875rem; color: var(--text-secondary);">${item.size} × ${item.quantity}</div>
                        </div>
                        <div style="font-weight: 600; color: var(--primary-color);">${formatPrice(item.total)}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    document.getElementById('orderModal').classList.add('show');
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('show');
}

// Fragrances Management
async function loadFragrances() {
    showLoadingState('fragrances');
    
    try {
        const response = await fetch('/api/admin/fragrances', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const result = await response.json();
            fragrances = result.data || [];
            filteredFragrances = [...fragrances];
            displayFragrances();
        } else {
            throw new Error('Failed to load fragrances');
        }
    } catch (error) {
        console.error('Error loading fragrances:', error);
        showEmptyState('fragrances');
        showToast('Error loading fragrances', 'error');
    }
}

function displayFragrances() {
    const tableBody = document.getElementById('fragrancesTableBody');
    const fragrancesTable = document.getElementById('fragrancesTable');
    const emptyFragrances = document.getElementById('emptyFragrances');
    const fragrancesLoading = document.getElementById('fragrancesLoading');
    
    fragrancesLoading.style.display = 'none';
    
    if (!filteredFragrances.length) {
        fragrancesTable.style.display = 'none';
        emptyFragrances.style.display = 'block';
        return;
    }
    
    fragrancesTable.style.display = 'block';
    emptyFragrances.style.display = 'none';
    
    tableBody.innerHTML = filteredFragrances.map(fragrance => `
        <tr>
            <td>
                ${fragrance.image ? 
                    `<img src="${fragrance.image}" alt="${fragrance.name}" class="product-image" onerror="this.parentElement.innerHTML='<div class=\\'no-image\\'>No Image</div>'">` :
                    '<div class="no-image">No Image</div>'
                }
            </td>
            <td>
                <div>
                    <div style="font-weight: 500; margin-bottom: 0.25rem;">${fragrance.name}</div>
                    ${fragrance.brand ? `<div style="font-size: 0.8rem; color: var(--text-secondary);">${fragrance.brand}</div>` : ''}
                </div>
            </td>
            <td>
                <span style="color: var(--text-secondary);">${fragrance.brand || '-'}</span>
            </td>
            <td>
                ${fragrance.variants && fragrance.variants.length > 0 ? 
                    fragrance.variants.map(v => `
                        <span class="variant-tag">
                            ${v.is_whole_bottle ? 'Full Bottle' : `${v.size_ml}ml`}
                        </span>
                    `).join('') : 
                    '<span style="color: var(--text-secondary); font-style: italic;">No variants</span>'
                }
            </td>
            <td>
                <span class="status-badge ${fragrance.hidden ? 'status-hidden' : 'status-visible'}">
                    ${fragrance.hidden ? 'Hidden' : 'Visible'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn btn-primary" onclick="editFragrance(${fragrance.id})" title="Edit Fragrance">
                        <img src="/api/image/edit-icon.png" alt="Edit" onerror="this.textContent='✏️';">
                    </button>
                    <button class="action-btn ${fragrance.hidden ? 'btn-success' : 'btn-warning'}" onclick="toggleFragranceVisibility(${fragrance.id})" title="${fragrance.hidden ? 'Show' : 'Hide'} Fragrance">
                        <img src="/api/image/${fragrance.hidden ? 'show' : 'hide'}-icon.png" alt="${fragrance.hidden ? 'Show' : 'Hide'}" onerror="this.textContent='${fragrance.hidden ? '👁️' : '🙈'}';">
                    </button>
                    <button class="action-btn btn-danger" onclick="deleteFragrance(${fragrance.id})" title="Delete Fragrance">
                        <img src="/api/image/delete-icon.png" alt="Delete" onerror="this.textContent='🗑️';">
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function filterFragrances() {
    const searchTerm = document.getElementById('fragrancesSearch').value.toLowerCase();
    const statusFilter = document.getElementById('fragrancesFilter').value;
    
    filteredFragrances = fragrances.filter(fragrance => {
        const matchesSearch = 
            fragrance.name.toLowerCase().includes(searchTerm) ||
            (fragrance.brand && fragrance.brand.toLowerCase().includes(searchTerm)) ||
            fragrance.description.toLowerCase().includes(searchTerm);
        
        const matchesStatus = 
            statusFilter === 'all' ||
            (statusFilter === 'visible' && !fragrance.hidden) ||
            (statusFilter === 'hidden' && fragrance.hidden);
        
        return matchesSearch && matchesStatus;
    });
    
    displayFragrances();
}

// Fragrance Modal Management
function openAddFragranceModal() {
    editingFragranceId = null;
    document.getElementById('fragranceModalTitle').textContent = 'Add Fragrance';
    document.getElementById('fragranceSubmitBtn').querySelector('span').textContent = 'Add Fragrance';
    
    // Reset form
    document.getElementById('fragranceForm').reset();
    
    document.getElementById('fragranceModal').classList.add('show');
    document.getElementById('fragranceName').focus();
}

function editFragrance(fragranceId) {
    const fragrance = fragrances.find(f => f.id === fragranceId);
    if (!fragrance) return;
    
    editingFragranceId = fragranceId;
    document.getElementById('fragranceModalTitle').textContent = 'Edit Fragrance';
    document.getElementById('fragranceSubmitBtn').querySelector('span').textContent = 'Update Fragrance';
    
    // Populate form
    document.getElementById('fragranceName').value = fragrance.name;
    document.getElementById('fragranceBrand').value = fragrance.brand || '';
    document.getElementById('fragranceDescription').value = fragrance.description;
    document.getElementById('fragranceImage').value = fragrance.image || '';
    
    document.getElementById('fragranceModal').classList.add('show');
    document.getElementById('fragranceName').focus();
}

function closeFragranceModal() {
    document.getElementById('fragranceModal').classList.remove('show');
    editingFragranceId = null;
}

async function handleFragranceSubmit(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('fragranceName').value.trim(),
        brand: document.getElementById('fragranceBrand').value.trim(),
        description: document.getElementById('fragranceDescription').value.trim(),
        image: document.getElementById('fragranceImage').value.trim(),
        slug: document.getElementById('fragranceName').value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        variants: [] // Default empty variants
    };
    
    if (!formData.name || !formData.description) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('fragranceSubmitBtn');
    const originalText = submitBtn.querySelector('span').textContent;
    submitBtn.disabled = true;
    submitBtn.querySelector('span').textContent = 'Saving...';
    
    try {
        const url = editingFragranceId ? 
            `/api/admin/fragrances/${editingFragranceId}` : 
            '/api/admin/fragrances';
        
        const method = editingFragranceId ? 'PUT' : 'POST';
        
        if (editingFragranceId) {
            formData.id = editingFragranceId;
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            const result = await response.json();
            
            if (editingFragranceId) {
                // Update existing fragrance
                const fragranceIndex = fragrances.findIndex(f => f.id === editingFragranceId);
                if (fragranceIndex !== -1) {
                    fragrances[fragranceIndex] = { ...fragrances[fragranceIndex], ...formData };
                }
                showToast('Fragrance updated successfully', 'success');
            } else {
                // Add new fragrance
                fragrances.unshift({ ...formData, id: result.id || Date.now(), hidden: false, variants: [] });
                showToast('Fragrance added successfully', 'success');
            }
            
            filterFragrances();
            closeFragranceModal();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save fragrance');
        }
    } catch (error) {
        console.error('Error saving fragrance:', error);
        showToast('Failed to save fragrance', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.querySelector('span').textContent = originalText;
    }
}

async function toggleFragranceVisibility(fragranceId) {
    const fragrance = fragrances.find(f => f.id === fragranceId);
    if (!fragrance) return;
    
    try {
        const response = await fetch(`/api/admin/fragrances/${fragranceId}/toggle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ hidden: !fragrance.hidden })
        });
        
        if (response.ok) {
            // Update local data
            fragrance.hidden = !fragrance.hidden;
            filterFragrances();
            showToast(`Fragrance ${fragrance.hidden ? 'hidden' : 'shown'} successfully`, 'success');
        } else {
            throw new Error('Failed to toggle fragrance visibility');
        }
    } catch (error) {
        console.error('Error toggling fragrance visibility:', error);
    }}