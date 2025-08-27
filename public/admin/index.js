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

// Logout function - FIXED
async function logout() {
    try {
        const response = await fetch('/logout', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        if (result.success) {
            // Clear local session data
            document.cookie = 'admin_session=; Path=/; Max-Age=0';
            localStorage.removeItem('notificationsEnabled');
            
            showCustomAlert('Logged out successfully', () => {
                window.location.href = '/login.html';
            });
        } else {
            throw new Error(result.error || 'Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
        // Force logout even if server request fails
        document.cookie = 'admin_session=; Path=/; Max-Age=0';
        window.location.href = '/login.html';
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

// Load Fragrances - FIXED
async function loadFragrances() {
    try {
        console.log('Loading fragrances...');
        showFragrancesLoading();
        
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

// Load Orders - FIXED
async function loadOrders() {
    try {
        console.log('Loading orders...');
        showOrdersLoading();
        
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
        showOrdersError();
    }
}

// Display Functions - FIXED
function displayFragrances() {
    filterAndDisplayFragrances();
}

function filterAndDisplayFragrances() {
    // Filter fragrances based on search term
    filteredFragrances = fragrances.filter(fragrance => {
        if (!fragrancesSearchTerm) return true;
        
        const searchLower = fragrancesSearchTerm.toLowerCase();
        return (
            (fragrance.name || '').toLowerCase().includes(searchLower) ||
            (fragrance.brand || '').toLowerCase().includes(searchLower) ||
            (fragrance.slug || '').toLowerCase().includes(searchLower)
        );
    });
    
    // Show appropriate state
    if (fragrances.length === 0) {
        showFragrancesEmpty();
    } else if (filteredFragrances.length === 0) {
        showFragrancesNoResults();
    } else {
        showFragrancesContent();
        renderFragrances();
    }
}

function renderFragrances() {
    const startIndex = (fragrancesPage - 1) * fragrancesPerPage;
    const endIndex = startIndex + fragrancesPerPage;
    const pageFragrances = filteredFragrances.slice(startIndex, endIndex);
    
    // Desktop table view
    const tableBody = document.getElementById('fragrancesTableBody');
    if (tableBody) {
        tableBody.innerHTML = pageFragrances.map(fragrance => {
            const variants = (fragrance.variants || []).map(v => {
                if (v.is_whole_bottle) {
                    return 'Whole Bottle';
                } else {
                    return `${v.size_ml}ml (${(v.price_cents / 1000).toFixed(3)} OMR)`;
                }
            }).join(', ') || 'No variants';
            
            const imageSrc = fragrance.image_path 
                ? (fragrance.image_path.startsWith('http') 
                   ? fragrance.image_path 
                   : `/api/image/${fragrance.image_path}`)
                : '/placeholder-fragrance.png';
            
            return `
                <tr>
                    <td>
                        <img src="${imageSrc}" 
                             alt="${fragrance.name || 'Fragrance'}" 
                             style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd;"
                             onerror="this.src='/placeholder-fragrance.png'">
                    </td>
                    <td>
                        <div><strong>${fragrance.name || 'Unnamed'}</strong></div>
                        <div><small>${fragrance.slug || ''}</small></div>
                    </td>
                    <td>${fragrance.brand || 'No brand'}</td>
                    <td><small>${variants}</small></td>
                    <td>
                        <span class="status-badge ${fragrance.hidden ? 'status-hidden' : 'status-visible'}">
                            ${fragrance.hidden ? 'Hidden' : 'Visible'}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-small btn-edit" onclick="editFragrance(${fragrance.id})" title="Edit">Edit</button>
                            <button class="btn-small ${fragrance.hidden ? 'btn-show' : 'btn-hide'}" 
                                    onclick="toggleFragranceVisibility(${fragrance.id}, ${!fragrance.hidden})" 
                                    title="${fragrance.hidden ? 'Show' : 'Hide'}">
                                ${fragrance.hidden ? 'Show' : 'Hide'}
                            </button>
                            <button class="btn-small btn-delete" onclick="deleteFragrance(${fragrance.id})" title="Delete">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    // Mobile cards view
    const cardsContainer = document.getElementById('fragranceCards');
    if (cardsContainer) {
        cardsContainer.innerHTML = pageFragrances.map(fragrance => {
            const variants = (fragrance.variants || []).map(v => {
                if (v.is_whole_bottle) {
                    return 'Whole Bottle';
                } else {
                    return `${v.size_ml}ml (${(v.price_cents / 1000).toFixed(3)} OMR)`;
                }
            }).join(', ') || 'No variants';
            
            const imageSrc = fragrance.image_path 
                ? (fragrance.image_path.startsWith('http') 
                   ? fragrance.image_path 
                   : `/api/image/${fragrance.image_path}`)
                : '/placeholder-fragrance.png';
            
            return `
                <div class="mobile-card">
                    <div class="mobile-card-header">
                        <img src="${imageSrc}" 
                             alt="${fragrance.name || 'Fragrance'}" 
                             style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd;"
                             onerror="this.src='/placeholder-fragrance.png'">
                        <div class="mobile-card-info">
                            <h4>${fragrance.name || 'Unnamed'}</h4>
                            <p>${fragrance.brand || 'No brand'}</p>
                            <span class="status-badge ${fragrance.hidden ? 'status-hidden' : 'status-visible'}">
                                ${fragrance.hidden ? 'Hidden' : 'Visible'}
                            </span>
                        </div>
                    </div>
                    <div class="mobile-card-body">
                        <div><strong>Variants:</strong> ${variants}</div>
                    </div>
                    <div class="mobile-card-actions">
                        <button class="btn-small btn-edit" onclick="editFragrance(${fragrance.id})">Edit</button>
                        <button class="btn-small ${fragrance.hidden ? 'btn-show' : 'btn-hide'}" 
                                onclick="toggleFragranceVisibility(${fragrance.id}, ${!fragrance.hidden})">
                            ${fragrance.hidden ? 'Show' : 'Hide'}
                        </button>
                        <button class="btn-small btn-delete" onclick="deleteFragrance(${fragrance.id})">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    updateFragrancesPagination();
}

function displayOrders() {
    filterAndDisplayOrders();
}

function filterAndDisplayOrders() {
    // Filter orders based on search term
    filteredOrders = orders.filter(order => {
        if (!ordersSearchTerm) return true;
        
        const searchLower = ordersSearchTerm.toLowerCase();
        return (
            (order.orderNumber || '').toLowerCase().includes(searchLower) ||
            (order.customer?.firstName || '').toLowerCase().includes(searchLower) ||
            (order.customer?.lastName || '').toLowerCase().includes(searchLower) ||
            (order.customer?.phone || '').toLowerCase().includes(searchLower) ||
            order.id.toString().includes(searchLower)
        );
    });
    
    // Show appropriate state
    if (orders.length === 0) {
        showOrdersEmpty();
    } else if (filteredOrders.length === 0) {
        showOrdersNoResults();
    } else {
        showOrdersContent();
        renderOrders();
    }
}

function renderOrders() {
    const startIndex = (ordersPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    const pageOrders = filteredOrders.slice(startIndex, endIndex);
    
    // Desktop table view
    const tableBody = document.getElementById('ordersTableBody');
    if (tableBody) {
        tableBody.innerHTML = pageOrders.map(order => {
            const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Unknown';
            const itemCount = (order.items || []).length;
            const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Unknown';
            const orderNumber = order.orderNumber || `#${order.id}`;
            
            // Calculate total for sample items only
            let total = 0;
            const sampleItems = (order.items || []).filter(item => !item.isWholeBottle);
            sampleItems.forEach(item => {
                if (item.priceInCents && item.quantity) {
                    total += (item.priceInCents / 1000) * item.quantity;
                }
            });
            
            const hasWholeBottles = (order.items || []).some(item => item.isWholeBottle);
            const totalDisplay = hasWholeBottles 
                ? `${total.toFixed(3)} OMR + Contact Items`
                : `${total.toFixed(3)} OMR`;
            
            return `
                <tr>
                    <td><strong>${orderNumber}</strong></td>
                    <td>
                        <div><strong>${customerName}</strong></div>
                        <div><small>${order.customer?.phone || 'No phone'}</small></div>
                    </td>
                    <td>${itemCount} item${itemCount !== 1 ? 's' : ''}</td>
                    <td>${totalDisplay}</td>
                    <td>
                        <span class="status-badge ${order.completed ? 'status-completed' : 'status-pending'}">
                            ${order.completed ? 'Completed' : 'Pending'}
                        </span>
                    </td>
                    <td>${orderDate}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-small btn-edit" onclick="viewOrder(${order.id})" title="View Details">View</button>
                            <button class="btn-small ${order.completed ? 'btn-hide' : 'btn-show'}" 
                                    onclick="toggleOrderStatus(${order.id}, ${!order.completed})" 
                                    title="${order.completed ? 'Mark Pending' : 'Mark Complete'}">
                                ${order.completed ? 'Pending' : 'Complete'}
                            </button>
                            <button class="btn-small btn-delete" onclick="deleteOrder(${order.id})" title="Delete">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    // Mobile cards view
    const cardsContainer = document.getElementById('orderCards');
    if (cardsContainer) {
        cardsContainer.innerHTML = pageOrders.map(order => {
            const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Unknown';
            const itemCount = (order.items || []).length;
            const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Unknown';
            const orderNumber = order.orderNumber || `#${order.id}`;
            
            // Calculate total for sample items only
            let total = 0;
            const sampleItems = (order.items || []).filter(item => !item.isWholeBottle);
            sampleItems.forEach(item => {
                if (item.priceInCents && item.quantity) {
                    total += (item.priceInCents / 1000) * item.quantity;
                }
            });
            
            const hasWholeBottles = (order.items || []).some(item => item.isWholeBottle);
            const totalDisplay = hasWholeBottles 
                ? `${total.toFixed(3)} OMR + Contact Items`
                : `${total.toFixed(3)} OMR`;
            
            return `
                <div class="mobile-card">
                    <div class="mobile-card-header">
                        <div class="mobile-card-info">
                            <h4>${orderNumber}</h4>
                            <p><strong>${customerName}</strong></p>
                            <p>${order.customer?.phone || 'No phone'}</p>
                            <span class="status-badge ${order.completed ? 'status-completed' : 'status-pending'}">
                                ${order.completed ? 'Completed' : 'Pending'}
                            </span>
                        </div>
                    </div>
                    <div class="mobile-card-body">
                        <div><strong>Items:</strong> ${itemCount}</div>
                        <div><strong>Total:</strong> ${totalDisplay}</div>
                        <div><strong>Date:</strong> ${orderDate}</div>
                    </div>
                    <div class="mobile-card-actions">
                        <button class="btn-small btn-edit" onclick="viewOrder(${order.id})">View</button>
                        <button class="btn-small ${order.completed ? 'btn-hide' : 'btn-show'}" 
                                onclick="toggleOrderStatus(${order.id}, ${!order.completed})">
                            ${order.completed ? 'Pending' : 'Complete'}
                        </button>
                        <button class="btn-small btn-delete" onclick="deleteOrder(${order.id})">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    updateOrdersPagination();
}

// Form submission handler - FIXED
async function handleFragranceSubmit(e) {
    e.preventDefault();
    
    const button = document.getElementById('submitFragranceBtn');
    const originalText = button.textContent;
    
    try {
        button.disabled = true;
        button.textContent = currentEditingId ? 'Updating...' : 'Adding...';
        
        const form = e.target;
        const fragranceData = {
            name: form.name.value.trim(),
            slug: form.slug.value.trim(),
            brand: form.brand.value.trim(),
            description: form.description.value.trim(),
            hidden: form.hidden.checked,
            variants: []
        };
        
        // Validate required fields
        if (!fragranceData.name) {
            throw new Error('Fragrance name is required');
        }
        if (!fragranceData.slug) {
            throw new Error('URL slug is required');
        }
        
        // Collect variants
        const variantCheckboxes = form.querySelectorAll('input[data-variant]:checked');
        variantCheckboxes.forEach(checkbox => {
            const size = checkbox.getAttribute('data-variant');
            if (size) {
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
        console.error('Error submitting fragrance:', error);
        showCustomAlert('Error: ' + error.message);
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

// Fragrance Management Functions - FIXED
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
            const imageSrc = fragrance.image_path.startsWith('http') 
                ? fragrance.image_path 
                : `/api/image/${fragrance.image_path}`;
            preview.innerHTML = `<img src="${imageSrc}" alt="Preview" style="max-width: 100%; max-height: 200px;" onerror="this.src='/placeholder-fragrance.png'">`;
        }
    }
    
    // Clear all variant checkboxes first
    document.querySelectorAll('input[data-variant]').forEach(checkbox => {
        checkbox.checked = false;
    });
    document.querySelectorAll('input[data-variant-price]').forEach(input => {
        input.value = '';
    });
    
    // Populate variants
    if (fragrance.variants && fragrance.variants.length > 0) {
        fragrance.variants.forEach(variant => {
            const size = variant.is_whole_bottle ? 'Whole Bottle' : `${variant.size_ml}ml`;
            const checkbox = document.querySelector(`input[data-variant="${size}"]`);
            if (checkbox) {
                checkbox.checked = true;
                if (!variant.is_whole_bottle) {
                    const priceInput = document.querySelector(`input[data-variant-price="${size}"]`);
                    if (priceInput) {
                        priceInput.value = (variant.price_cents / 1000).toFixed(3);
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

// Order Management - FIXED
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
        if (item.isWholeBottle) {
            orderDetails += `${index + 1}. ${brandName}${item.fragranceName} - Whole Bottle (Contact for pricing) x${item.quantity}\n`;
        } else {
            const price = (item.priceInCents / 1000).toFixed(3);
            orderDetails += `${index + 1}. ${brandName}${item.fragranceName} - ${item.variantSize} (${price} OMR each) x${item.quantity}\n`;
        }
    });
    
    if (order.delivery.notes) {
        orderDetails += `\nSpecial Instructions:\n${order.delivery.notes}`;
    }
    
    // Calculate total for samples only
    let total = 0;
    const sampleItems = order.items.filter(item => !item.isWholeBottle);
    sampleItems.forEach(item => {
        if (item.priceInCents && item.quantity) {
            total += (item.priceInCents / 1000) * item.quantity;
        }
    });
    
    const hasWholeBottles = order.items.some(item => item.isWholeBottle);
    if (hasWholeBottles) {
        orderDetails += `\nSample Items Total: ${total.toFixed(3)} OMR`;
        orderDetails += `\nNote: Contains whole bottle items - contact customer for pricing`;
    } else {
        orderDetails += `\nTotal: ${total.toFixed(3)} OMR`;
    }
    
    orderDetails += `\nOrder Date: ${new Date(order.created_at).toLocaleString()}`;
    orderDetails += `\nStatus: ${order.completed ? 'Completed' : 'Pending'}`;
    
    showCustomAlert(orderDetails);
}

async function toggleOrderStatus(id, completed) {
    try {
        const response = await fetch('/admin/toggle-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ id, completed })
        });
        
        const result = await response.json();
        if (result.success) {
            await loadOrders();
            updateStats();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error toggling order status:', error);
        showCustomAlert('Failed to update order status');
    }
}

async function deleteOrder(id) {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    
    const orderNumber = order.orderNumber || `#${order.id}`;
    showCustomConfirm(`Delete order ${orderNumber}? This action cannot be undone.`, async () => {
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

// UI State Management Functions
function showFragrancesLoading() {
    document.getElementById('fragrancesLoading').style.display = 'block';
    document.getElementById('fragrancesContent').style.display = 'none';
    document.getElementById('fragrancesEmpty').style.display = 'none';
    document.getElementById('fragrancesNoResults').style.display = 'none';
    document.getElementById('fragrancesError').style.display = 'none';
    document.getElementById('fragrancesControls').style.display = 'none';
}

function showFragrancesContent() {
    document.getElementById('fragrancesLoading').style.display = 'none';
    document.getElementById('fragrancesContent').style.display = 'block';
    document.getElementById('fragrancesEmpty').style.display = 'none';
    document.getElementById('fragrancesNoResults').style.display = 'none';
    document.getElementById('fragrancesError').style.display = 'none';
    document.getElementById('fragrancesControls').style.display = 'block';
}

function showFragrancesEmpty() {
    document.getElementById('fragrancesLoading').style.display = 'none';
    document.getElementById('fragrancesContent').style.display = 'none';
    document.getElementById('fragrancesEmpty').style.display = 'block';
    document.getElementById('fragrancesNoResults').style.display = 'none';
    document.getElementById('fragrancesError').style.display = 'none';
    document.getElementById('fragrancesControls').style.display = 'none';
}

function showFragrancesNoResults() {
    document.getElementById('fragrancesLoading').style.display = 'none';
    document.getElementById('fragrancesContent').style.display = 'none';
    document.getElementById('fragrancesEmpty').style.display = 'none';
    document.getElementById('fragrancesNoResults').style.display = 'block';
    document.getElementById('fragrancesError').style.display = 'none';
    document.getElementById('fragrancesControls').style.display = 'block';
}

function showFragrancesError() {
    document.getElementById('fragrancesLoading').style.display = 'none';
    document.getElementById('fragrancesContent').style.display = 'none';
    document.getElementById('fragrancesEmpty').style.display = 'none';
    document.getElementById('fragrancesNoResults').style.display = 'none';
    document.getElementById('fragrancesError').style.display = 'block';
    document.getElementById('fragrancesControls').style.display = 'none';
}

function showOrdersLoading() {
    document.getElementById('ordersLoading').style.display = 'block';
    document.getElementById('ordersContent').style.display = 'none';
    document.getElementById('ordersEmpty').style.display = 'none';
    document.getElementById('ordersNoResults').style.display = 'none';
    document.getElementById('ordersError').style.display = 'none';
    document.getElementById('ordersControls').style.display = 'none';
}

function showOrdersContent() {
    document.getElementById('ordersLoading').style.display = 'none';
    document.getElementById('ordersContent').style.display = 'block';
    document.getElementById('ordersEmpty').style.display = 'none';
    document.getElementById('ordersNoResults').style.display = 'none';
    document.getElementById('ordersError').style.display = 'none';
    document.getElementById('ordersControls').style.display = 'block';
}

function showOrdersEmpty() {
    document.getElementById('ordersLoading').style.display = 'none';
    document.getElementById('ordersContent').style.display = 'none';
    document.getElementById('ordersEmpty').style.display = 'block';
    document.getElementById('ordersNoResults').style.display = 'none';
    document.getElementById('ordersError').style.display = 'none';
    document.getElementById('ordersControls').style.display = 'none';
}

function showOrdersNoResults() {
    document.getElementById('ordersLoading').style.display = 'none';
    document.getElementById('ordersContent').style.display = 'none';
    document.getElementById('ordersEmpty').style.display = 'none';
    document.getElementById('ordersNoResults').style.display = 'block';
    document.getElementById('ordersError').style.display = 'none';
    document.getElementById('ordersControls').style.display = 'block';
}

function showOrdersError() {
    document.getElementById('ordersLoading').style.display = 'none';
    document.getElementById('ordersContent').style.display = 'none';
    document.getElementById('ordersEmpty').style.display = 'none';
    document.getElementById('ordersNoResults').style.display = 'none';
    document.getElementById('ordersError').style.display = 'block';
    document.getElementById('ordersControls').style.display = 'none';
}

// Search and Pagination Functions
function clearFragrancesSearch() {
    document.getElementById('fragrancesSearch').value = '';
    fragrancesSearchTerm = '';
    fragrancesPage = 1;
    filterAndDisplayFragrances();
    toggleSearchClear('fragrances');
}

function clearOrdersSearch() {
    document.getElementById('ordersSearch').value = '';
    ordersSearchTerm = '';
    ordersPage = 1;
    filterAndDisplayOrders();
    toggleSearchClear('orders');
}

function toggleSearchClear(type) {
    const searchInput = document.getElementById(`${type}Search`);
    const clearButton = document.getElementById(`${type}ClearSearch`);
    
    if (searchInput && clearButton) {
        clearButton.style.display = searchInput.value.length > 0 ? 'block' : 'none';
    }
}

function updateFragrancesPagination() {
    const totalPages = Math.ceil(filteredFragrances.length / fragrancesPerPage);
    const prevBtn = document.getElementById('fragrancesPrevBtn');
    const nextBtn = document.getElementById('fragrancesNextBtn');
    const pageInfo = document.getElementById('fragrancesPageInfo');
    
    if (prevBtn) prevBtn.disabled = fragrancesPage <= 1;
    if (nextBtn) nextBtn.disabled = fragrancesPage >= totalPages;
    if (pageInfo) pageInfo.textContent = `Page ${fragrancesPage} of ${totalPages || 1}`;
    
    const pagination = document.getElementById('fragrancesPagination');
    if (pagination) {
        pagination.style.display = totalPages > 1 ? 'block' : 'none';
    }
}

function updateOrdersPagination() {
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    const prevBtn = document.getElementById('ordersPrevBtn');
    const nextBtn = document.getElementById('ordersNextBtn');
    const pageInfo = document.getElementById('ordersPageInfo');
    
    if (prevBtn) prevBtn.disabled = ordersPage <= 1;
    if (nextBtn) nextBtn.disabled = ordersPage >= totalPages;
    if (pageInfo) pageInfo.textContent = `Page ${ordersPage} of ${totalPages || 1}`;
    
    const pagination = document.getElementById('ordersPagination');
    if (pagination) {
        pagination.style.display = totalPages > 1 ? 'block' : 'none';
    }
}

// Pagination Navigation
function previousFragrancesPage() {
    if (fragrancesPage > 1) {
        fragrancesPage--;
        renderFragrances();
    }
}

function nextFragrancesPage() {
    const totalPages = Math.ceil(filteredFragrances.length / fragrancesPerPage);
    if (fragrancesPage < totalPages) {
        fragrancesPage++;
        renderFragrances();
    }
}

function previousOrdersPage() {
    if (ordersPage > 1) {
        ordersPage--;
        renderOrders();
    }
}

function nextOrdersPage() {
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    if (ordersPage < totalPages) {
        ordersPage++;
        renderOrders();
    }
}

// Image handling functions
function handleImageUpload(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('imagePreview');
    
    if (file) {
        if (!file.type.includes('png')) {
            showCustomAlert('Only PNG images are allowed');
            e.target.value = '';
            clearImage();
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            showCustomAlert('Image must be smaller than 5MB');
            e.target.value = '';
            clearImage();
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.style.display = 'block';
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 100%; max-height: 200px;">`;
        };
        reader.readAsDataURL(file);
    } else {
        clearImage();
    }
}

function clearImage() {
    const preview = document.getElementById('imagePreview');
    if (preview) {
        preview.style.display = 'none';
        preview.innerHTML = '';
    }
}

// Stats update function
function updateStats() {
    document.getElementById('totalFragrances').textContent = fragrances.length;
    document.getElementById('visibleFragrances').textContent = fragrances.filter(f => !f.hidden).length;
    document.getElementById('totalOrders').textContent = orders.length;
    document.getElementById('pendingOrders').textContent = orders.filter(o => !o.completed).length;
}

// Refresh data function
async function refreshData() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (isRefreshing) return;
    
    isRefreshing = true;
    if (refreshBtn) {
        refreshBtn.classList.add('refreshing');
        refreshBtn.title = 'Refreshing...';
    }
    
    try {
        await loadDashboardData();
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
            renderFragrances();
        }
        if (orders.length > 0) {
            renderOrders();
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
            fragrancesPage = 1;
            filterAndDisplayFragrances();
            toggleSearchClear('fragrances');
        });
    }
    
    // Orders search
    const ordersSearch = document.getElementById('ordersSearch');
    if (ordersSearch) {
        ordersSearch.addEventListener('input', (e) => {
            ordersSearchTerm = e.target.value.toLowerCase();
            ordersPage = 1;
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

// Notification functions (for service worker)
function initializeServiceWorker() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
                serviceWorker = registration;
                
                // Listen for messages from service worker
                navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
            })
            .catch(error => {
                console.warn('Service Worker registration failed:', error);
            });
    }
}

function loadNotificationSettings() {
    const toggle = document.getElementById('notificationToggle');
    const enabled = localStorage.getItem('notificationsEnabled') === 'true';
    
    if (toggle) {
        toggle.checked = enabled;
        toggle.addEventListener('change', handleNotificationToggle);
    }
}

async function handleNotificationToggle(e) {
    const enabled = e.target.checked;
    
    if (enabled) {
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                e.target.checked = false;
                showCustomAlert('Notification permission denied');
                return;
            }
            
            localStorage.setItem('notificationsEnabled', 'true');
            
            // Initialize known orders in service worker
            if (serviceWorker && serviceWorker.active) {
                const currentOrderIds = orders.map(order => order.id);
                await sendMessageToServiceWorker('INIT_KNOWN_ORDERS', {
                    orderIds: currentOrderIds
                });
            }
            
        } catch (error) {
            console.error('Error enabling notifications:', error);
            e.target.checked = false;
            showCustomAlert('Failed to enable notifications');
        }
    } else {
        localStorage.removeItem('notificationsEnabled');
    }
}

async function sendMessageToServiceWorker(type, data) {
    return new Promise((resolve, reject) => {
        if (!serviceWorker || !serviceWorker.active) {
            reject(new Error('Service worker not available'));
            return;
        }
        
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
            if (event.data.error) {
                reject(new Error(event.data.error));
            } else {
                resolve(event.data);
            }
        };
        
        serviceWorker.active.postMessage({
            type: type,
            data: data
        }, [messageChannel.port2]);
    });
}

function handleServiceWorkerMessage(event) {
    const { type, data } = event.data;
    
    if (type === 'NEW_ORDER_DETECTED') {
        // Refresh orders to show the new order
        loadOrders().then(() => {
            updateStats();
        });
    }
}

function detectIOSPWA() {
    isIOSPWA = window.navigator.standalone === true;
}

// Custom modal functions
function showCustomAlert(message, callback) {
    const modal = document.getElementById('customAlert');
    const text = document.getElementById('customAlertText');
    
    text.textContent = message;
    modal.style.display = 'flex';
    
    // Store callback for when OK is clicked
    modal._callback = callback;
}

function closeCustomAlert() {
    const modal = document.getElementById('customAlert');
    modal.style.display = 'none';
    
    // Execute callback if provided
    if (modal._callback && typeof modal._callback === 'function') {
        modal._callback();
        modal._callback = null;
    }
}

function showCustomConfirm(message, confirmCallback) {
    const modal = document.getElementById('customConfirm');
    const text = document.getElementById('customConfirmText');
    const okBtn = document.getElementById('customConfirmOk');
    
    text.textContent = message;
    modal.style.display = 'flex';
    
    // Remove any existing event listeners
    okBtn.replaceWith(okBtn.cloneNode(true));
    const newOkBtn = document.getElementById('customConfirmOk');
    
    // Add new event listener
    newOkBtn.addEventListener('click', () => {
        closeCustomConfirm();
        if (confirmCallback && typeof confirmCallback === 'function') {
            confirmCallback();
        }
    });
}

function closeCustomConfirm() {
    const modal = document.getElementById('customConfirm');
    modal.style.display = 'none';
}

// Close modals when clicking outside
document.addEventListener('click', (e) => {
    // Close fragrance modal
    const fragranceModal = document.getElementById('fragranceModal');
    if (e.target === fragranceModal) {
        closeFragranceModal();
    }
    
    // Close custom alert
    const customAlert = document.getElementById('customAlert');
    if (e.target === customAlert) {
        closeCustomAlert();
    }
    
    // Close custom confirm
    const customConfirm = document.getElementById('customConfirm');
    if (e.target === customConfirm) {
        closeCustomConfirm();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Close modals with Escape key
    if (e.key === 'Escape') {
        if (document.getElementById('fragranceModal').classList.contains('active')) {
            closeFragranceModal();
        }
        if (document.getElementById('customAlert').style.display === 'flex') {
            closeCustomAlert();
        }
        if (document.getElementById('customConfirm').style.display === 'flex') {
            closeCustomConfirm();
        }
    }
    
    // Refresh data with F5
    if (e.key === 'F5' && !e.ctrlKey) {
        e.preventDefault();
        refreshData();
    }
});