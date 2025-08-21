// Fragrance Management Implementation

// Global variables for fragrances management
let allFragrances = [];
let filteredFragrances = [];
let currentFilter = 'all';
let isLoadingFragrances = false;

// Initialize fragrances tab functionality when the tab is switched
function initFragrancesTab() {
    console.log('Initializing fragrances tab');
    
    // Setup event listeners for the fragrances tab
    setupFragrancesEventListeners();
    
    // Load fragrances data
    loadFragrances();
}

// Collect variants from the form
function collectVariantsFromForm() {
    const variants = [];
    const variantRows = document.querySelectorAll('.variant-row');
    
    variantRows.forEach(row => {
        if (row.dataset.wholeBottle === 'true') {
            // Whole bottle variant
            variants.push({
                is_whole_bottle: true,
                sku: row.querySelector('input[name="sku"]').value || null
            });
        } else {
            // Regular variant
            const sizeInput = row.querySelector('input[name="size_ml"]');
            const priceInput = row.querySelector('input[name="price"]');
            const skuInput = row.querySelector('input[name="sku"]');
            
            // Only add valid variants
            if (sizeInput.value && priceInput.value) {
                variants.push({
                    size_ml: parseFloat(sizeInput.value),
                    price: parseFloat(priceInput.value),
                    sku: skuInput.value || null,
                    is_whole_bottle: false
                });
            }
        }
    });
    
    return variants;
}

// Validate the fragrance form
function validateFragranceForm() {
    const form = document.getElementById('fragranceForm');
    
    // Check required fields
    const name = document.getElementById('fragranceName').value.trim();
    const slug = document.getElementById('fragranceSlug').value.trim();
    const description = document.getElementById('fragranceDescription').value.trim();
    
    if (!name || !slug || !description) {
        showToast('Please fill in all required fields', 'error');
        return false;
    }
    
    // Validate slug format
    const slugRegex = /^[a-z0-9\-]+$/;
    if (!slugRegex.test(slug)) {
        showToast('Slug must contain only lowercase letters, numbers, and hyphens', 'error');
        return false;
    }
    
    // Collect and validate variants
    const variants = collectVariantsFromForm();
    
    if (variants.length === 0) {
        showToast('Please add at least one variant', 'error');
        return false;
    }
    
    return true;
}

// Add event handlers to the dashboard
function setupDashboardFragranceHandlers() {
    // Add fragrance button on dashboard
    const addFragranceBtn = document.getElementById('addFragranceBtn');
    if (addFragranceBtn) {
        addFragranceBtn.addEventListener('click', openAddFragrancePanel);
    }
}

// Initialize module when page loads
document.addEventListener('DOMContentLoaded', function() {
    setupDashboardFragranceHandlers();
    
    // Initialize the fragrance tab if it's the active tab
    if (currentTab === 'fragrances') {
        initFragrancesTab();
    }
});

// Update the tab switching function to initialize the fragrances tab
const originalSwitchToTab = window.switchToTab;
window.switchToTab = function(tabName) {
    originalSwitchToTab(tabName);
    
    if (tabName === 'fragrances') {
        initFragrancesTab();
    }
};

// Make functions available globally
window.openAddFragrancePanel = openAddFragrancePanel;
window.openEditFragrancePanel = openEditFragrancePanel;
window.closeFragranceModal = closeFragranceModal;
window.addVariantRow = addVariantRow;
window.addWholeBottleVariant = addWholeBottleVariant;
window.removeVariantRow = removeVariantRow;
window.saveFragrance = saveFragrance;
window.loadFragrances = loadFragrances;
window.filterFragrances = filterFragrances;
window.clearFragranceFilters = clearFragranceFilters;

// Set up event listeners for the fragrances tab
function setupFragrancesEventListeners() {
    // Search input
    const fragrancesSearch = document.getElementById('fragrancesSearch');
    if (fragrancesSearch) {
        fragrancesSearch.addEventListener('input', debounce(function() {
            filterFragrances();
        }, 300));
    }
    
    // Status filter
    const fragrancesFilter = document.getElementById('fragrancesFilter');
    if (fragrancesFilter) {
        fragrancesFilter.addEventListener('change', function() {
            currentFilter = this.value;
            filterFragrances();
        });
    }
}

// Load fragrances from the API
async function loadFragrances() {
    if (isLoadingFragrances) return;
    isLoadingFragrances = true;
    
    // Get references to DOM elements
    const fragrancesTab = document.getElementById('fragrancesTab');
    const emptyState = fragrancesTab.querySelector('.empty-state');
    
    // Remove any existing table
    const existingTable = document.getElementById('fragrancesTable');
    if (existingTable) {
        existingTable.parentNode.removeChild(existingTable);
    }
    
    // Show loading state
    emptyState.innerHTML = `
        <div class="loading-spinner"></div>
        <h3 data-key="loading_fragrances">Loading Fragrances...</h3>
        <p>Please wait while we fetch the data.</p>
    `;
    emptyState.style.display = 'flex';
    
    try {
        // Fetch fragrances from the API
        const response = await fetch('/api/fragrances', {
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
            allFragrances = result.data;
            
            // Update dashboard count if we're on the dashboard
            if (currentTab === 'dashboard') {
                document.getElementById('totalFragrances').textContent = allFragrances.length;
            }
            
            // Display fragrances
            if (allFragrances.length > 0) {
                renderFragrancesTable(allFragrances);
                emptyState.style.display = 'none';
            } else {
                emptyState.innerHTML = `
                    <img src="/api/image/perfume-icon.png" alt="Fragrances" class="empty-icon" onerror="this.textContent='💎';">
                    <h3>No Fragrances Found</h3>
                    <p>Add your first fragrance to get started.</p>
                    <button class="primary-btn" onclick="openAddFragrancePanel()">Add Fragrance</button>
                `;
                emptyState.style.display = 'flex';
            }
        } else {
            throw new Error(result.error || 'Invalid API response');
        }
    } catch (error) {
        console.error('Error loading fragrances:', error);
        emptyState.innerHTML = `
            <img src="/api/image/error-icon.png" alt="Error" class="empty-icon" onerror="this.textContent='⚠️';">
            <h3>Error Loading Fragrances</h3>
            <p>${error.message || 'An error occurred while loading fragrances'}</p>
            <button class="primary-btn" onclick="loadFragrances()">Try Again</button>
        `;
        emptyState.style.display = 'flex';
    } finally {
        isLoadingFragrances = false;
    }
}

// Render fragrances table
function renderFragrancesTable(fragrances) {
    const fragrancesTab = document.getElementById('fragrancesTab');
    
    // Create table container
    const tableContainer = document.createElement('div');
    tableContainer.id = 'fragrancesTable';
    tableContainer.className = 'table-container';
    
    // Create table HTML
    const tableHTML = `
        <table class="fragrances-table">
            <thead>
                <tr>
                    <th data-key="image">Image</th>
                    <th data-key="name">Name</th>
                    <th data-key="brand">Brand</th>
                    <th data-key="variants">Variants</th>
                    <th data-key="status">Status</th>
                    <th data-key="actions">Actions</th>
                </tr>
            </thead>
            <tbody id="fragrancesTableBody">
                ${fragrances.map(fragrance => createFragranceRow(fragrance)).join('')}
            </tbody>
        </table>
    `;
    
    tableContainer.innerHTML = tableHTML;
    
    // Add the table after the section header
    const sectionHeader = fragrancesTab.querySelector('.section-header');
    sectionHeader.insertAdjacentElement('afterend', tableContainer);
    
    // Add event listeners to action buttons
    addFragranceActionListeners();
}

// Create a row for a fragrance
function createFragranceRow(fragrance) {
    const variants = fragrance.variants || [];
    const variantsDisplay = variants.length > 0 
        ? variants.map(v => {
            if (v.is_whole_bottle) {
                return `<span class="variant-tag whole-bottle">Whole Bottle</span>`;
            } else {
                return `<span class="variant-tag">${v.size_ml}ml - ${(v.price_cents / 1000).toFixed(3)} OMR</span>`;
            }
        }).join('')
        : '<span class="no-variants">No variants</span>';
    
    const statusClass = fragrance.hidden ? 'status-hidden' : 'status-visible';
    const statusText = fragrance.hidden ? 'Hidden' : 'Visible';
    
    return `
        <tr data-id="${fragrance.id}" data-slug="${fragrance.slug}">
            <td class="fragrance-image">
                ${fragrance.image_path 
                    ? `<img src="/api/image/${fragrance.image_path}" alt="${fragrance.name}" onerror="this.src='/api/image/perfume-placeholder.png';">` 
                    : `<div class="no-image">No Image</div>`
                }
            </td>
            <td class="fragrance-name">
                <div class="name-primary">${fragrance.name}</div>
                <div class="name-secondary">${fragrance.slug}</div>
            </td>
            <td class="fragrance-brand">${fragrance.brand || '-'}</td>
            <td class="fragrance-variants">${variantsDisplay}</td>
            <td class="fragrance-status">
                <span class="status-badge ${statusClass}" data-id="${fragrance.id}">${statusText}</span>
            </td>
            <td class="fragrance-actions">
                <button class="action-btn edit-btn" data-id="${fragrance.id}" title="Edit Fragrance">
                    <img src="/api/image/edit-icon.png" alt="Edit" onerror="this.textContent='✏️';">
                </button>
                <button class="action-btn toggle-btn" data-id="${fragrance.id}" data-hidden="${fragrance.hidden}" title="${fragrance.hidden ? 'Show Fragrance' : 'Hide Fragrance'}">
                    <img src="/api/image/${fragrance.hidden ? 'show-icon.png' : 'hide-icon.png'}" alt="${fragrance.hidden ? 'Show' : 'Hide'}" onerror="this.textContent='${fragrance.hidden ? '👁️' : '🚫'}';">
                </button>
                <button class="action-btn delete-btn" data-id="${fragrance.id}" title="Delete Fragrance">
                    <img src="/api/image/delete-icon.png" alt="Delete" onerror="this.textContent='🗑️';">
                </button>
            </td>
        </tr>
    `;
}

// Add event listeners to fragrance action buttons
function addFragranceActionListeners() {
    // Edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const fragranceId = this.getAttribute('data-id');
            editFragrance(fragranceId);
        });
    });
    
    // Toggle visibility buttons
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const fragranceId = this.getAttribute('data-id');
            const isHidden = this.getAttribute('data-hidden') === 'true';
            toggleFragranceVisibility(fragranceId, isHidden);
        });
    });
    
    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const fragranceId = this.getAttribute('data-id');
            confirmDeleteFragrance(fragranceId);
        });
    });
    
    // Status badges
    document.querySelectorAll('.status-badge').forEach(badge => {
        badge.addEventListener('click', function() {
            const fragranceId = this.getAttribute('data-id');
            const isHidden = this.classList.contains('status-hidden');
            toggleFragranceVisibility(fragranceId, isHidden);
        });
    });
}

// Filter fragrances based on search and filter
function filterFragrances() {
    const searchTerm = document.getElementById('fragrancesSearch').value.toLowerCase();
    const statusFilter = document.getElementById('fragrancesFilter').value;
    
    let filtered = [...allFragrances];
    
    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(fragrance => {
            const searchableText = [
                fragrance.name,
                fragrance.brand,
                fragrance.slug,
                fragrance.description
            ].filter(Boolean).join(' ').toLowerCase();
            
            return searchableText.includes(searchTerm);
        });
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
        filtered = filtered.filter(fragrance => {
            if (statusFilter === 'visible') {
                return !fragrance.hidden;
            } else if (statusFilter === 'hidden') {
                return fragrance.hidden;
            }
            return true;
        });
    }
    
    filteredFragrances = filtered;
    
    // Re-render the table
    const fragrancesTab = document.getElementById('fragrancesTab');
    const emptyState = fragrancesTab.querySelector('.empty-state');
    
    // Remove existing table
    const existingTable = document.getElementById('fragrancesTable');
    if (existingTable) {
        existingTable.parentNode.removeChild(existingTable);
    }
    
    if (filteredFragrances.length > 0) {
        renderFragrancesTable(filteredFragrances);
        emptyState.style.display = 'none';
    } else {
        emptyState.innerHTML = `
            <img src="/api/image/search-icon.png" alt="No Results" class="empty-icon" onerror="this.textContent='🔍';">
            <h3>No Matching Fragrances</h3>
            <p>Try adjusting your search or filter.</p>
            <button class="secondary-btn" onclick="clearFragranceFilters()">Clear Filters</button>
        `;
        emptyState.style.display = 'flex';
    }
}

// Clear fragrance filters
function clearFragranceFilters() {
    document.getElementById('fragrancesSearch').value = '';
    document.getElementById('fragrancesFilter').value = 'all';
    currentFilter = 'all';
    filterFragrances();
}

// Toggle fragrance visibility
async function toggleFragranceVisibility(fragranceId, currentlyHidden) {
    try {
        showToast(`Updating fragrance visibility...`, 'info');
        
        const response = await fetch(`/admin/update-fragrance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: fragranceId,
                hidden: !currentlyHidden
            })
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Update the fragrance in our data
            const index = allFragrances.findIndex(f => f.id === parseInt(fragranceId));
            if (index !== -1) {
                allFragrances[index].hidden = !currentlyHidden;
            }
            
            // Refresh the table
            filterFragrances();
            
            showToast(`Fragrance is now ${currentlyHidden ? 'visible' : 'hidden'}`, 'success');
        } else {
            throw new Error(result.error || 'Failed to update fragrance');
        }
    } catch (error) {
        console.error('Error toggling fragrance visibility:', error);
        showToast(`Error: ${error.message}`, 'error');
    }
}

// Confirm delete fragrance
function confirmDeleteFragrance(fragranceId) {
    const fragrance = allFragrances.find(f => f.id === parseInt(fragranceId));
    if (!fragrance) return;
    
    if (confirm(`Are you sure you want to delete the fragrance "${fragrance.name}"?\nThis action cannot be undone.`)) {
        deleteFragrance(fragranceId);
    }
}

// Delete fragrance
async function deleteFragrance(fragranceId) {
    try {
        showToast(`Deleting fragrance...`, 'info');
        
        const response = await fetch(`/admin/delete-fragrance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: fragranceId
            })
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Remove the fragrance from our data
            allFragrances = allFragrances.filter(f => f.id !== parseInt(fragranceId));
            
            // Refresh the table
            filterFragrances();
            
            // Update dashboard count if we're on the dashboard
            if (currentTab === 'dashboard') {
                document.getElementById('totalFragrances').textContent = allFragrances.length;
            }
            
            showToast(`Fragrance deleted successfully`, 'success');
        } else {
            throw new Error(result.error || 'Failed to delete fragrance');
        }
    } catch (error) {
        console.error('Error deleting fragrance:', error);
        showToast(`Error: ${error.message}`, 'error');
    }
}

// Edit fragrance
function editFragrance(fragranceId) {
    const fragrance = allFragrances.find(f => f.id === parseInt(fragranceId));
    if (!fragrance) return;
    
    openEditFragrancePanel(fragrance);
}

// === Add Fragrance Modal Functionality ===

// Open add fragrance panel
function openAddFragrancePanel() {
    // Create modal if it doesn't exist
    if (!document.getElementById('addFragranceModal')) {
        createAddFragranceModal();
    }
    
    // Reset form
    resetFragranceForm();
    
    // Set modal title for add mode
    document.getElementById('fragranceModalTitle').textContent = 'Add New Fragrance';
    
    // Show the modal
    document.getElementById('addFragranceModal').classList.add('show');
}

// Open edit fragrance panel
function openEditFragrancePanel(fragrance) {
    // Create modal if it doesn't exist
    if (!document.getElementById('addFragranceModal')) {
        createAddFragranceModal();
    }
    
    // Set modal title for edit mode
    document.getElementById('fragranceModalTitle').textContent = 'Edit Fragrance';
    
    // Populate form with fragrance data
    populateFragranceForm(fragrance);
    
    // Show the modal
    document.getElementById('addFragranceModal').classList.add('show');
}

// Create the add/edit fragrance modal
function createAddFragranceModal() {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.id = 'addFragranceModal';
    
    modalOverlay.innerHTML = `
        <div class="modal-content fragrance-modal">
            <div class="modal-header">
                <h2 class="modal-title" id="fragranceModalTitle">Add New Fragrance</h2>
                <button class="close-btn" onclick="closeFragranceModal()">
                    <img src="/api/image/close-icon.png" alt="Close" onerror="this.textContent='✕';">
                </button>
            </div>
            <div class="modal-body">
                <form id="fragranceForm">
                    <input type="hidden" id="fragranceId" name="fragranceId">
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="fragranceName">Name *</label>
                            <input type="text" id="fragranceName" name="name" required placeholder="Fragrance name">
                        </div>
                        
                        <div class="form-group">
                            <label for="fragranceSlug">Slug *</label>
                            <input type="text" id="fragranceSlug" name="slug" required placeholder="fragrance-slug">
                            <div class="help-text">URL-friendly identifier (lowercase, no spaces)</div>
                        </div>
                        
                        <div class="form-group">
                            <label for="fragranceBrand">Brand</label>
                            <input type="text" id="fragranceBrand" name="brand" placeholder="Brand name (optional)">
                        </div>
                        
                        <div class="form-group">
                            <label for="fragranceImage">Image Path</label>
                            <input type="text" id="fragranceImage" name="image" placeholder="image-filename.jpg">
                            <div class="help-text">Image must be uploaded separately</div>
                        </div>
                    </div>
                    
                    <div class="form-group full-width">
                        <label for="fragranceDescription">Description *</label>
                        <textarea id="fragranceDescription" name="description" required rows="4" placeholder="Fragrance description"></textarea>
                    </div>
                    
                    <div class="variant-section">
                        <div class="variant-header">
                            <h3>Variants</h3>
                            <button type="button" class="add-variant-btn" onclick="addVariantRow()">+ Add Variant</button>
                        </div>
                        
                        <div class="variants-info">Add at least one variant (size and price) for this fragrance</div>
                        
                        <div class="variants-table">
                            <div class="variants-header">
                                <div class="variant-cell">Size (ml)</div>
                                <div class="variant-cell">Price (OMR)</div>
                                <div class="variant-cell">SKU (optional)</div>
                                <div class="variant-cell variant-actions">Actions</div>
                            </div>
                            
                            <div id="variantsContainer">
                                <!-- Variant rows will be added here -->
                            </div>
                            
                            <div class="variants-add">
                                <div class="whole-bottle-option">
                                    <button type="button" class="add-whole-bottle-btn" onclick="addWholeBottleVariant()">
                                        + Add Whole Bottle Option
                                    </button>
                                    <div class="help-text">For items where customers need to contact for pricing</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="secondary-btn" onclick="closeFragranceModal()">Cancel</button>
                <button type="button" class="primary-btn" id="saveFragranceBtn" onclick="saveFragrance()">Save Fragrance</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalOverlay);
    
    // Auto-generate slug from name
    document.getElementById('fragranceName').addEventListener('input', function() {
        const slugInput = document.getElementById('fragranceSlug');
        // Only auto-generate if slug is empty or hasn't been manually edited
        if (!slugInput.dataset.manuallyEdited) {
            slugInput.value = generateSlug(this.value);
        }
    });
    
    document.getElementById('fragranceSlug').addEventListener('input', function() {
        // Mark the slug as manually edited
        this.dataset.manuallyEdited = 'true';
    });
}

// Close fragrance modal
function closeFragranceModal() {
    const modal = document.getElementById('addFragranceModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Reset fragrance form
function resetFragranceForm() {
    const form = document.getElementById('fragranceForm');
    if (form) {
        form.reset();
        
        // Clear hidden id field
        document.getElementById('fragranceId').value = '';
        
        // Reset slug manual edit flag
        document.getElementById('fragranceSlug').dataset.manuallyEdited = '';
        
        // Clear variants
        const variantsContainer = document.getElementById('variantsContainer');
        variantsContainer.innerHTML = '';
        
        // Add one empty variant row by default
        addVariantRow();
    }
}

// Populate fragrance form with data for editing
function populateFragranceForm(fragrance) {
    const form = document.getElementById('fragranceForm');
    if (form && fragrance) {
        // Set ID
        document.getElementById('fragranceId').value = fragrance.id;
        
        // Set basic fields
        document.getElementById('fragranceName').value = fragrance.name || '';
        document.getElementById('fragranceSlug').value = fragrance.slug || '';
        document.getElementById('fragranceBrand').value = fragrance.brand || '';
        document.getElementById('fragranceImage').value = fragrance.image_path || '';
        document.getElementById('fragranceDescription').value = fragrance.description || '';
        
        // Mark slug as manually edited
        document.getElementById('fragranceSlug').dataset.manuallyEdited = 'true';
        
        // Clear variants
        const variantsContainer = document.getElementById('variantsContainer');
        variantsContainer.innerHTML = '';
        
        // Add variant rows
        const variants = fragrance.variants || [];
        if (variants.length > 0) {
            variants.forEach(variant => {
                if (variant.is_whole_bottle) {
                    addWholeBottleVariant(variant.sku);
                } else {
                    addVariantRow(variant.size_ml, (variant.price_cents / 1000).toFixed(3), variant.sku);
                }
            });
        } else {
            // Add one empty variant row if no variants
            addVariantRow();
        }
    }
}

// Add a new variant row
function addVariantRow(size = '', price = '', sku = '') {
    const variantsContainer = document.getElementById('variantsContainer');
    const variantId = Date.now(); // Unique ID for this variant row
    
    const variantRow = document.createElement('div');
    variantRow.className = 'variant-row';
    variantRow.dataset.id = variantId;
    
    variantRow.innerHTML = `
        <div class="variant-cell">
            <input type="number" name="size_ml" value="${size}" min="1" max="1000" step="1" placeholder="Size (ml)" required>
        </div>
        <div class="variant-cell">
            <input type="number" name="price" value="${price}" min="0.001" step="0.001" placeholder="Price (OMR)" required>
        </div>
        <div class="variant-cell">
            <input type="text" name="sku" value="${sku}" placeholder="SKU (optional)">
        </div>
        <div class="variant-cell variant-actions">
            <button type="button" class="remove-variant-btn" onclick="removeVariantRow(${variantId})">
                <img src="/api/image/delete-icon.png" alt="Remove" onerror="this.textContent='🗑️';">
            </button>
        </div>
    `;
    
    variantsContainer.appendChild(variantRow);
}

// Add a whole bottle variant
function addWholeBottleVariant(sku = '') {
    const variantsContainer = document.getElementById('variantsContainer');
    const variantId = Date.now(); // Unique ID for this variant row
    
    const variantRow = document.createElement('div');
    variantRow.className = 'variant-row whole-bottle-row';
    variantRow.dataset.id = variantId;
    variantRow.dataset.wholeBottle = 'true';
    
    variantRow.innerHTML = `
        <div class="variant-cell">
            <span class="whole-bottle-label">Whole Bottle</span>
            <input type="hidden" name="is_whole_bottle" value="true">
        </div>
        <div class="variant-cell">
            <span class="whole-bottle-price">Contact for pricing</span>
        </div>
        <div class="variant-cell">
            <input type="text" name="sku" value="${sku}" placeholder="SKU (optional)">
        </div>
        <div class="variant-cell variant-actions">
            <button type="button" class="remove-variant-btn" onclick="removeVariantRow(${variantId})">
                <img src="/api/image/delete-icon.png" alt="Remove" onerror="this.textContent='🗑️';">
            </button>
        </div>
    `;
    
    variantsContainer.appendChild(variantRow);
    
    // Disable the add whole bottle button since we can only have one
    document.querySelector('.add-whole-bottle-btn').disabled = true;
}

// Remove a variant row
function removeVariantRow(variantId) {
    const variantRow = document.querySelector(`.variant-row[data-id="${variantId}"]`);
    if (variantRow) {
        const isWholeBottle = variantRow.dataset.wholeBottle === 'true';
        
        // Remove the row
        variantRow.parentNode.removeChild(variantRow);
        
        // If it was a whole bottle variant, re-enable the add whole bottle button
        if (isWholeBottle) {
            document.querySelector('.add-whole-bottle-btn').disabled = false;
        }
        
        // Make sure we have at least one variant row
        const variantsContainer = document.getElementById('variantsContainer');
        if (variantsContainer.children.length === 0) {
            addVariantRow();
        }
    }
}

// Generate a URL-friendly slug from a string
function generateSlug(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')        // Replace spaces with -
        .replace(/[^\w\-]+/g, '')     // Remove all non-word chars
        .replace(/\-\-+/g, '-')       // Replace multiple - with single -
        .replace(/^-+/, '')           // Trim - from start of text
        .replace(/-+$/, '');          // Trim - from end of text
}

// Save fragrance
async function saveFragrance() {
    // Get form data
    const form = document.getElementById('fragranceForm');
    const formData = new FormData(form);
    
    // Validate form
    if (!validateFragranceForm()) {
        return;
    }
    
    // Get fragrance ID (if editing)
    const fragranceId = document.getElementById('fragranceId').value;
    const isEditing = !!fragranceId;
    
    // Build the payload
    const payload = {
        name: formData.get('name'),
        slug: formData.get('slug'),
        description: formData.get('description'),
        brand: formData.get('brand') || null,
        image: formData.get('image') || null
    };
    
    // If editing, add the ID
    if (isEditing) {
        payload.id = fragranceId;
    }
    
    // Collect variants
    payload.variants = collectVariantsFromForm();
    
    // Show loading state
    const saveButton = document.getElementById('saveFragranceBtn');
    const originalText = saveButton.textContent;
    saveButton.textContent = 'Saving...';
    saveButton.disabled = true;
    
    try {
        // Determine endpoint based on whether we're adding or editing
        const endpoint = isEditing ? '/admin/update-fragrance' : '/admin/add-fragrance';
        
        // Send request to API
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Close the modal
            closeFragranceModal();
            
            // Refresh the fragrances list
            loadFragrances();
            
            // Show success message
            showToast(`Fragrance ${isEditing ? 'updated' : 'added'} successfully`, 'success');
        } else {
            throw new Error(result.error || `Failed to ${isEditing ? 'update' : 'add'} fragrance`);
        }
    } catch (error) {
        console.error(`Error ${isEditing ? 'updating' : 'adding'} fragrance:`, error);
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        // Reset button state
        saveButton.textContent = originalText;
        saveButton.disabled = false;
    }}