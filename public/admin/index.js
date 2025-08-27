// Fixed handleFragranceSubmit function - KEEP ALL OTHER CODE INTACT
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

        // Collect variants - FIXED FORMAT FOR BACKEND
        const variantCheckboxes = form.querySelectorAll('input[data-variant]');
        variantCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                const size = checkbox.getAttribute('data-variant');
                const isWholeBottle = size === 'Whole Bottle';
                
                const variant = {
                    is_whole_bottle: isWholeBottle
                };
                
                if (isWholeBottle) {
                    // Whole bottle - no size_ml or price needed
                    variant.size_ml = null;
                    variant.price = null;
                } else {
                    // Extract numeric value from size (e.g., "5ml" -> 5)
                    const sizeNumeric = parseInt(size.replace('ml', ''));
                    variant.size_ml = sizeNumeric;
                    
                    // Get price
                    const priceInput = form.querySelector(`input[data-variant-price="${size}"]`);
                    if (priceInput && priceInput.value) {
                        variant.price = parseFloat(priceInput.value);
                    } else {
                        // Skip this variant if no price provided for sized variant
                        return;
                    }
                }
                
                fragranceData.variants.push(variant);
            }
        });

        // Validate at least one variant
        if (fragranceData.variants.length === 0) {
            throw new Error('Please select at least one variant with a price');
        }

        console.log('Submitting fragrance data:', fragranceData);

        let response;
        const imageFile = form.fragranceImage.files[0];
        
        if (imageFile) {
            // Use FormData for image upload
            const formData = new FormData();
            formData.append('image', imageFile);
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
            // Use JSON for no image
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
            console.error('Server error:', errorText);
            throw new Error(`Server error: ${response.status}`);
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
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Fixed editFragrance function - CORRECTED VARIANT MAPPING
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
    
    // Populate variants - FIXED MAPPING
    if (fragrance.variants && fragrance.variants.length > 0) {
        fragrance.variants.forEach(variant => {
            // The variant.size comes as "5ml", "10ml", "30ml", or "Whole Bottle"
            const size = variant.size; // This should match the data-variant attribute
            const checkbox = document.querySelector(`input[data-variant="${size}"]`);
            
            if (checkbox) {
                checkbox.checked = true;
                
                // If it's not a whole bottle, populate the price
                if (!variant.is_whole_bottle && variant.price) {
                    const priceInput = document.querySelector(`input[data-variant-price="${size}"]`);
                    if (priceInput) {
                        priceInput.value = variant.price.toFixed(3);
                    }
                }
            }
        });
    }
    
    document.getElementById('fragranceModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Fixed logout function
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

// Fixed renderFragrances function to show images correctly
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
                    return `${v.size} (${parseFloat(v.price).toFixed(3)} OMR)`;
                }
            }).join(', ') || 'No variants';
            
            // FIXED IMAGE PATH HANDLING
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
    
    // Mobile cards view - FIXED IMAGE HANDLING
    const cardsContainer = document.getElementById('fragranceCards');
    if (cardsContainer) {
        cardsContainer.innerHTML = pageFragrances.map(fragrance => {
            const variants = (fragrance.variants || []).map(v => {
                if (v.is_whole_bottle) {
                    return 'Whole Bottle';
                } else {
                    return `${v.size} (${parseFloat(v.price).toFixed(3)} OMR)`;
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

// Fixed viewOrder function
function viewOrder(id) {
    const order = orders.find(o => o.id === id);
    if (!order) {
        showCustomAlert('Order not found');
        return;
    }
    
    let orderDetails = `Order ${order.orderNumber || `#${order.id}`}\n\n`;
    orderDetails += `Customer: ${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Unknown';
    orderDetails += `\nPhone: ${order.customer?.phone || 'No phone'}\n`;
    if (order.customer?.email) orderDetails += `Email: ${order.customer.email}\n`;
    
    orderDetails += `\nDelivery Address:\n${order.delivery?.address || 'No address'}\n`;
    orderDetails += `${order.delivery?.city || 'No city'}`;
    if (order.delivery?.region) orderDetails += `, ${order.delivery.region}`;
    
    orderDetails += `\n\nItems:\n`;
    
    if (order.items && order.items.length > 0) {
        order.items.forEach((item, index) => {
            const brandName = item.fragranceBrand ? `${item.fragranceBrand} ` : '';
            if (item.isWholeBottle) {
                orderDetails += `${index + 1}. ${brandName}${item.fragranceName || 'Unknown'} - Whole Bottle (Contact for pricing) x${item.quantity || 1}\n`;
            } else {
                const price = item.priceInCents ? (item.priceInCents / 1000).toFixed(3) : (item.variantPrice || 0).toFixed(3);
                orderDetails += `${index + 1}. ${brandName}${item.fragranceName || 'Unknown'} - ${item.variantSize || 'Unknown size'} (${price} OMR each) x${item.quantity || 1}\n`;
            }
        });
    } else {
        orderDetails += 'No items found\n';
    }
    
    if (order.delivery?.notes) {
        orderDetails += `\nSpecial Instructions:\n${order.delivery.notes}`;
    }
    
    // Calculate total for samples only
    let total = 0;
    if (order.items) {
        const sampleItems = order.items.filter(item => !item.isWholeBottle);
        sampleItems.forEach(item => {
            const itemPrice = item.priceInCents ? (item.priceInCents / 1000) : (item.variantPrice || 0);
            const quantity = item.quantity || 1;
            total += itemPrice * quantity;
        });
        
        const hasWholeBottles = order.items.some(item => item.isWholeBottle);
        if (hasWholeBottles) {
            orderDetails += `\nSample Items Total: ${total.toFixed(3)} OMR`;
            orderDetails += `\nNote: Contains whole bottle items - contact customer for pricing`;
        } else {
            orderDetails += `\nTotal: ${total.toFixed(3)} OMR`;
        }
    }
    
    orderDetails += `\nOrder Date: ${order.created_at ? new Date(order.created_at).toLocaleString() : 'Unknown'}`;
    orderDetails += `\nStatus: ${order.completed ? 'Completed' : 'Pending'}`;
    
    showCustomAlert(orderDetails);
}