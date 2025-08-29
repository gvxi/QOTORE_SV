// Admin Fragrances Management JavaScript

// Global variables
let fragrances = [];
let filteredFragrances = [];
let currentFilter = 'all';
let currentPage = 1;
let fragrancesPerPage = 10;
let searchTerm = '';
let currentEditingId = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Admin Fragrances Management Loading...');
    initializeApp();
});

async function initializeApp() {
    try {
        // Check authentication first
        if (!isAuthenticated()) {
            redirectToLogin();
            return;
        }
        
        // Load initial data
        await loadFragrances();
        
        // Set up event listeners
        setupEventListeners();
        
        console.log('✅ Admin Fragrances Management Ready');
        showToast('Fragrances management loaded successfully', 'success');
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        showToast('Failed to initialize fragrances management', 'error');
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

// Event Listeners
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('fragrancesSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
        searchInput.addEventListener('input', function() {
            const clearBtn = document.getElementById('fragrancesClearSearch');
            if (clearBtn) {
                clearBtn.style.display = this.value.length > 0 ? 'block' : 'none';
            }
        });
    }
    
    // Form submission
    const fragranceForm = document.getElementById('fragranceForm');
    if (fragranceForm) {
        fragranceForm.addEventListener('submit', handleFragranceSubmit);
    }
    
    // Image upload preview
    const imageInput = document.getElementById('fragranceImage');
    if (imageInput) {
        imageInput.addEventListener('change', handleImagePreview);
    }
    
    // Name to slug auto-generation
    const nameInput = document.getElementById('fragranceName');
    const slugInput = document.getElementById('fragranceSlug');
    if (nameInput && slugInput) {
        nameInput.addEventListener('input', function() {
            if (!currentEditingId) { // Only auto-generate for new fragrances
                const slug = generateSlug(this.value);
                slugInput.value = slug;
            }
        });
    }
    
    // Modal close on background click
    const modal = document.getElementById('fragranceModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeFragranceModal();
            }
        });
    }
    
    // ESC key to close modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeFragranceModal();
        }
    });
}

function handleSearch(event) {
    searchTerm = event.target.value.toLowerCase().trim();
    console.log('🔍 Searching:', searchTerm);
    currentPage = 1;
    applyFiltersAndPagination();
}

function clearFragrancesSearch() {
    const searchInput = document.getElementById('fragrancesSearch');
    const clearBtn = document.getElementById('fragrancesClearSearch');
    
    if (searchInput) {
        searchInput.value = '';
        searchTerm = '';
        clearBtn.style.display = 'none';
        currentPage = 1;
        applyFiltersAndPagination();
    }
}

function handleImagePreview(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('imagePreview');
    
    if (!preview) return;
    
    if (file) {
        // Validate file type
        if (!file.type.includes('png')) {
            showToast('Only PNG images are allowed', 'error');
            event.target.value = '';
            preview.style.display = 'none';
            return;
        }
        
        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image too large. Maximum size is 5MB.', 'error');
            event.target.value = '';
            preview.style.display = 'none';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `
                <img src="${e.target.result}" alt="Preview" style="max-width: 100%; max-height: 200px; border-radius: 8px;">
                <p style="margin-top: 0.5rem; font-size: 0.9rem; color: #666;">
                    ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
            `;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        preview.style.display = 'none';
    }
}

function generateSlug(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// Data Loading Functions
async function loadFragrances() {
    console.log('📊 Loading fragrances...');
    showLoadingState();
    
    try {
        const response = await fetch('/admin/fragrances', {
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                redirectToLogin();
                return;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
            fragrances = result.data;
            console.log(`✅ Loaded ${fragrances.length} fragrances`);
            
            updateStats(result.stats);
            applyFiltersAndPagination();
            showFragrancesContent();
        } else {
            throw new Error(result.error || 'Failed to load fragrances');
        }
        
    } catch (error) {
        console.error('❌ Failed to load fragrances:', error);
        showErrorState();
        showToast('Failed to load fragrances: ' + error.message, 'error');
    }
}

async function refreshData() {
    console.log('🔄 Refreshing fragrances data...');
    
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.classList.add('refreshing');
    }
    
    try {
        await loadFragrances();
        showToast('Fragrances data refreshed successfully', 'success');
    } catch (error) {
        showToast('Failed to refresh fragrances data', 'error');
    } finally {
        if (refreshBtn) {
            refreshBtn.classList.remove('refreshing');
        }
    }
}

// UI State Management
function showLoadingState() {
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
    document.getElementById('fragrancesControls').style.display = 'flex';
}

function showEmptyState() {
    document.getElementById('fragrancesLoading').style.display = 'none';
    document.getElementById('fragrancesContent').style.display = 'none';
    document.getElementById('fragrancesEmpty').style.display = 'block';
    document.getElementById('fragrancesNoResults').style.display = 'none';
    document.getElementById('fragrancesError').style.display = 'none';
    document.getElementById('fragrancesControls').style.display = 'none';
}

function showNoResultsState() {
    document.getElementById('fragrancesLoading').style.display = 'none';
    document.getElementById('fragrancesContent').style.display = 'none';
    document.getElementById('fragrancesEmpty').style.display = 'none';
    document.getElementById('fragrancesNoResults').style.display = 'block';
    document.getElementById('fragrancesError').style.display = 'none';
    document.getElementById('fragrancesControls').style.display = 'flex';
}

function showErrorState() {
    document.getElementById('fragrancesLoading').style.display = 'none';
    document.getElementById('fragrancesContent').style.display = 'none';
    document.getElementById('fragrancesEmpty').style.display = 'none';
    document.getElementById('fragrancesNoResults').style.display = 'none';
    document.getElementById('fragrancesError').style.display = 'block';
    document.getElementById('fragrancesControls').style.display = 'none';
}

function updateStats(stats) {
    if (stats) {
        document.getElementById('totalFragrances').textContent = stats.total || fragrances.length;
        document.getElementById('visibleFragrances').textContent = stats.visible || fragrances.filter(f => !f.hidden).length;
        document.getElementById('hiddenFragrances').textContent = stats.hidden || fragrances.filter(f => f.hidden).length;
        document.getElementById('totalVariants').textContent = stats.variants || fragrances.reduce((sum, f) => sum + (f.variants?.length || 0), 0);
    } else {
        // Calculate from fragrances data
        const visible = fragrances.filter(f => !f.hidden).length;
        const hidden = fragrances.filter(f => f.hidden).length;
        const variants = fragrances.reduce((sum, f) => sum + (f.variants?.length || 0), 0);
        
        document.getElementById('totalFragrances').textContent = fragrances.length;
        document.getElementById('visibleFragrances').textContent = visible;
        document.getElementById('hiddenFragrances').textContent = hidden;
        document.getElementById('totalVariants').textContent = variants;
    }
}

// Filtering and Pagination
function filterFragrances(status) {
    currentFilter = status;
    currentPage = 1;
    
    // Update filter button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-filter') === status);
    });
    
    console.log('🔍 Filtering fragrances by:', status);
    applyFiltersAndPagination();
}

function applyFiltersAndPagination() {
    // Apply filters
    filteredFragrances = fragrances.filter(fragrance => {
        // Status filter
        if (currentFilter === 'visible' && fragrance.hidden) return false;
        if (currentFilter === 'hidden' && !fragrance.hidden) return false;
        
        // Search filter
        if (searchTerm) {
            const searchableText = [
                fragrance.name || '',
                fragrance.brand || '',
                fragrance.slug || '',
                fragrance.description || ''
            ].join(' ').toLowerCase();
            
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }
        
        return true;
    });
    
    console.log(`📋 Filtered: ${filteredFragrances.length} of ${fragrances.length} fragrances`);
    
    if (filteredFragrances.length === 0) {
        if (fragrances.length === 0) {
            showEmptyState();
        } else {
            showNoResultsState();
        }
        return;
    }
    
    showFragrancesContent();
    renderFragrances();
    updatePagination();
}

function renderFragrances() {
    const startIndex = (currentPage - 1) * fragrancesPerPage;
    const endIndex = startIndex + fragrancesPerPage;
    const pageFragrances = filteredFragrances.slice(startIndex, endIndex);
    
    // Desktop table view
    renderFragrancesTable(pageFragrances);
    
    // Mobile cards view
    renderFragrancesCards(pageFragrances);
}

function renderFragrancesTable(pageFragrances) {
    const tableBody = document.getElementById('fragrancesTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = pageFragrances.map(fragrance => {
        const variants = (fragrance.variants || []).map(v => {
            if (v.is_whole_bottle) {
                return 'Whole Bottle';
            } else {
                return `${v.size} (${parseFloat(v.price).toFixed(3)} OMR)`;
            }
        }).join(', ') || 'No variants';
        
        // Handle image path
        const imageSrc = fragrance.image_path 
            ? (fragrance.image_path.startsWith('http') 
               ? fragrance.image_path 
               : `/api/image/${fragrance.image_path.replace('fragrance-images/', '')}`)
            : '/icons/icon-192x192.png';
        
        return `
            <tr>
                <td>
                    <img src="${imageSrc}" 
                         alt="${fragrance.name || 'Fragrance'}" 
                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd;"
                         onerror="this.src='/icons/icon-192x192.png'">
                </td>
                <td>
                    <div><strong>${fragrance.name || 'Unnamed'}</strong></div>
                    <div><small style="color: #666;">${fragrance.slug || ''}</small></div>
                </td>
                <td>${fragrance.brand || 'No brand'}</td>
                <td><small style="color: #666;">${variants}</small></td>
                <td>
                    <span class="status-badge ${fragrance.hidden ? 'status-hidden' : 'status-visible'}">
                        ${fragrance.hidden ? 'Hidden' : 'Visible'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-small btn-edit" onclick="editFragrance(${fragrance.id})" title="Edit Fragrance">
                            Edit
                        </button>
                        <button class="btn-small ${fragrance.hidden ? 'btn-show' : 'btn-hide'}" 
                                onclick="toggleFragranceVisibility(${fragrance.id}, ${!fragrance.hidden})" 
                                title="${fragrance.hidden ? 'Show in Store' : 'Hide from Store'}">
                            ${fragrance.hidden ? 'Show' : 'Hide'}
                        </button>
                        <button class="btn-small btn-delete" onclick="deleteFragrance(${fragrance.id})" title="Delete Fragrance">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderFragrancesCards(pageFragrances) {
    const cardsContainer = document.getElementById('fragranceCards');
    if (!cardsContainer) return;
    
    cardsContainer.innerHTML = pageFragrances.map(fragrance => {
        const variants = (fragrance.variants || []).map(v => {
            if (v.is_whole_bottle) {
                return 'Whole Bottle';
            } else {
                return `${v.size} (${parseFloat(v.price).toFixed(3)} OMR)`;
            }
        }).join(', ') || 'No variants';
        
        // Handle image path
        const imageSrc = fragrance.image_path 
            ? (fragrance.image_path.startsWith('http') 
               ? fragrance.image_path 
               : `/api/image/${fragrance.image_path.replace('fragrance-images/', '')}`)
            : '/icons/icon-192x192.png';
        
        return `
            <div class="mobile-card">
                <div class="mobile-card-header">
                    <img src="${imageSrc}" 
                         alt="${fragrance.name || 'Fragrance'}" 
                         style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd; margin-right: 1rem;"
                         onerror="this.src='/icons/icon-192x192.png'">
                    <div class="mobile-card-info">
                        <h4>${fragrance.name || 'Unnamed'}</h4>
                        <p>${fragrance.brand || 'No brand'}</p>
                        <span class="status-badge ${fragrance.hidden ? 'status-hidden' : 'status-visible'}">
                            ${fragrance.hidden ? 'Hidden' : 'Visible'}
                        </span>
                    </div>
                </div>
                <div class="mobile-card-body">
                    <div>
                        <strong>Slug:</strong>
                        ${fragrance.slug || 'No slug'}
                    </div>
                    <div>
                        <strong>Variants:</strong>
                        ${variants}
                    </div>
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

// Pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredFragrances.length / fragrancesPerPage);
    const paginationEl = document.getElementById('fragrancesPagination');
    const pageInfoEl = document.getElementById('fragrancesPageInfo');
    const totalCountEl = document.getElementById('fragrancesTotalCount');
    const prevBtn = document.getElementById('fragrancesPrevBtn');
    const nextBtn = document.getElementById('fragrancesNextBtn');
    
    if (totalPages <= 1) {
        paginationEl.style.display = 'none';
        return;
    }
    
    paginationEl.style.display = 'flex';
    
    if (pageInfoEl) {
        pageInfoEl.textContent = `Page ${currentPage} of ${totalPages}`;
    }
    
    if (totalCountEl) {
        totalCountEl.textContent = filteredFragrances.length;
    }
    
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages;
    }
}

function previousFragrancesPage() {
    if (currentPage > 1) {
        currentPage--;
        renderFragrances();
        updatePagination();
        
        // Scroll to top of table
        document.querySelector('.fragrances-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function nextFragrancesPage() {
    const totalPages = Math.ceil(filteredFragrances.length / fragrancesPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderFragrances();
        updatePagination();
        
        // Scroll to top of table
        document.querySelector('.fragrances-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Modal Functions
function openFragranceModal() {
    currentEditingId = null;
    document.getElementById('fragranceModalTitle').textContent = 'Add New Fragrance';
    resetFragranceForm();
    document.getElementById('fragranceModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Focus on first input
    setTimeout(() => {
        const nameInput = document.getElementById('fragranceName');
        if (nameInput) nameInput.focus();
    }, 100);
}

function closeFragranceModal() {
    document.getElementById('fragranceModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    resetFragranceForm();
    currentEditingId = null;
}

function resetFragranceForm() {
    const form = document.getElementById('fragranceForm');
    if (form) {
        form.reset();
    }
    
    // Reset image preview
    const preview = document.getElementById('imagePreview');
    if (preview) {
        preview.style.display = 'none';
        preview.innerHTML = '';
    }
    
    // Reset variant checkboxes and prices
    document.querySelectorAll('input[data-variant]').forEach(checkbox => {
        checkbox.checked = false;
    });
    document.querySelectorAll('input[data-variant-price]').forEach(input => {
        input.value = '';
    });
    
    // Reset submit button
    const submitBtn = document.getElementById('submitFragranceBtn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            Save Fragrance
        `;
    }
}

// Fragrance Actions
function editFragrance(id) {
    const fragrance = fragrances.find(f => f.id === id);
    if (!fragrance) {
        showToast('Fragrance not found', 'error');
        return;
    }
    
    console.log('✏️ Editing fragrance:', id);
    
    currentEditingId = id;
    document.getElementById('fragranceModalTitle').textContent = 'Edit Fragrance';
    
    // Populate form
    document.getElementById('fragranceName').value = fragrance.name || '';
    document.getElementById('fragranceSlug').value = fragrance.slug || '';
    document.getElementById('fragranceBrand').value = fragrance.brand || '';
    document.getElementById('fragranceDescription').value = fragrance.description || '';
    document.getElementById('fragranceHidden').checked = fragrance.hidden || false;
    
    // Show image preview if exists
    if (fragrance.image_path) {
        const preview = document.getElementById('imagePreview');
        if (preview) {
            const imageSrc = fragrance.image_path.startsWith('http') 
                ? fragrance.image_path 
                : `/api/image/${fragrance.image_path.replace('fragrance-images/', '')}`;
            
            preview.innerHTML = `
                <img src="${imageSrc}" alt="Current Image" style="max-width: 100%; max-height: 200px; border-radius: 8px;" 
                     onerror="this.style.display='none'">
                <p style="margin-top: 0.5rem; font-size: 0.9rem; color: #666;">Current image</p>
            `;
            preview.style.display = 'block';
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

async function handleFragranceSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitFragranceBtn');
    const originalHTML = submitBtn.innerHTML;
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <div class="spinner" style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 0.5rem;"></div>
            ${currentEditingId ? 'Updating...' : 'Saving...'}
        `;
        
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
        if (!fragranceData.name || !fragranceData.slug || !fragranceData.description) {
            throw new Error('Name, slug, and description are required');
        }
        
        // Validate slug format
        if (!/^[a-z0-9-]+$/.test(fragranceData.slug)) {
            throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
        }

        // Collect variants
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
            let errorMessage = `Server error: ${response.status}`;
            
            try {
                const errorData = JSON.parse(errorText);
                if (errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch (parseError) {
                // Keep default error message
            }
            
            throw new Error(errorMessage);
        }

        const result = await response.json();
        if (result.success) {
            closeFragranceModal();
            await loadFragrances();
            showToast(currentEditingId ? 'Fragrance updated successfully!' : 'Fragrance added successfully!', 'success');
        } else {
            throw new Error(result.error || 'Failed to save fragrance');
        }
        
    } catch (error) {
        console.error('❌ Error submitting fragrance:', error);
        showToast('Error: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHTML;
    }
}

async function toggleFragranceVisibility(id, hidden) {
    const fragrance = fragrances.find(f => f.id === id);
    if (!fragrance) {
        showToast('Fragrance not found', 'error');
        return;
    }
    
    const action = hidden ? 'hiding' : 'showing';
    console.log(`👁️ ${action} fragrance:`, id);
    
    try {
        const response = await fetch('/admin/toggle-fragrance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                id: id,
                hidden: hidden
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`Fragrance ${hidden ? 'hidden from' : 'made visible in'} store`, 'success');
            // Update local data
            fragrance.hidden = hidden;
            // Re-render to reflect changes
            updateStats();
            renderFragrances();
        } else {
            throw new Error(result.error || 'Failed to update fragrance visibility');
        }
        
    } catch (error) {
        console.error('❌ Failed to toggle fragrance visibility:', error);
        showToast('Failed to update fragrance visibility: ' + error.message, 'error');
    }
}

async function deleteFragrance(id) {
    const fragrance = fragrances.find(f => f.id === id);
    if (!fragrance) {
        showToast('Fragrance not found', 'error');
        return;
    }
    
    const fragranceName = fragrance.name || 'Unnamed Fragrance';
    const confirmed = confirm(`Are you sure you want to delete "${fragranceName}"?\n\nThis action cannot be undone and will also delete all variants and associated data.`);
    
    if (!confirmed) return;
    
    console.log('🗑️ Deleting fragrance:', id);
    
    try {
        const response = await fetch('/admin/delete-fragrance', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ id: id })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`Fragrance "${fragranceName}" deleted successfully`, 'success');
            // Remove from local data
            fragrances = fragrances.filter(f => f.id !== id);
            // Re-apply filters and pagination
            applyFiltersAndPagination();
            updateStats();
        } else {
            throw new Error(result.error || 'Failed to delete fragrance');
        }
        
    } catch (error) {
        console.error('❌ Failed to delete fragrance:', error);
        showToast('Failed to delete fragrance: ' + error.message, 'error');
    }
}

// Logout
async function logout() {
    const confirmed = confirm('Are you sure you want to logout?');
    if (!confirmed) return;
    
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
            // Clear local data
            document.cookie = 'admin_session=; Path=/; Max-Age=0';
            
            showToast('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 1000);
        } else {
            throw new Error(result.error || 'Logout failed');
        }
    } catch (error) {
        console.error('❌ Logout error:', error);
        // Force logout even if server request fails
        document.cookie = 'admin_session=; Path=/; Max-Age=0';
        window.location.href = '/login.html';
    }
}

// Toast Notifications System
function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">
            <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, duration);
}

// Utility Functions
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}