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
    }

            // Global Variables
        let currentTab = 'dashboard';
        let orders = [];
        let filteredOrders = [];
        let notificationsEnabled = false;
        let currentOrderId = null;
        let orderCheckInterval = null;

// Tab switching function
function switchToTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(`${tabName}Tab`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(navTab => {
        navTab.classList.remove('active');
        if (navTab.getAttribute('data-tab') === tabName) {
            navTab.classList.add('active');
        }
    });
    
    // Update current tab variable
    currentTab = tabName;
    
    // Store the current tab in localStorage
    localStorage.setItem('admin_current_tab', tabName);
    
    // Load tab-specific data
    if (tabName === 'orders') {
        loadOrders();
    } else if (tabName === 'fragrances') {
        // Initialize the fragrances tab
        if (typeof initFragrancesTab === 'function') {
            initFragrancesTab();
        }
    } else if (tabName === 'dashboard') {
        loadDashboardData();
    }

        // Initialize the application
        document.addEventListener('DOMContentLoaded', function() {
            // Check authentication before initializing
            checkAuthentication().then(isAuthenticated => {
                if (!isAuthenticated) {
                    console.log('Not authenticated, redirecting to login');
                    window.location.href = '/login.html';
                    return;
                }
                
                // Only initialize if authenticated
                initializeApp();
            }).catch(error => {
                console.error('Authentication check failed:', error);
                window.location.href = '/login.html';
            });
        });

        // Check authentication status
        async function checkAuthentication() {
            try {
                // Check if session cookie exists
                const cookies = document.cookie.split(';');
                const sessionCookie = cookies.find(cookie => 
                    cookie.trim().startsWith('admin_session=')
                );
                
                if (!sessionCookie) {
                    console.log('No admin session cookie found');
                    return false;
                }
                
                // Test authentication with a simple API call
                const testResponse = await fetch('/api/admin/orders/stats', {
                    method: 'GET',
                    credentials: 'include'
                });
                
                if (testResponse.status === 401) {
                    console.log('Session invalid - 401 response');
                    // Clear invalid session cookie
                    document.cookie = 'admin_session=; Path=/; Max-Age=0';
                    return false;
                }
                
                if (!testResponse.ok) {
                    console.log('Authentication test failed with status:', testResponse.status);
                    return false;
                }
                
                console.log('Authentication verified successfully');
                return true;
                
            } catch (error) {
                console.error('Authentication check error:', error);
                return false;
            }
        }

        function initializeApp() {
            initializeTheme();
            initializeEventListeners();
            loadDashboardData();
            checkNotificationPermission();
            
            // Start checking for new orders every 30 seconds
            startOrderChecking();
        }

        // Theme Management
        function initializeTheme() {
            const savedTheme = localStorage.getItem('qotor_admin_theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
        }

        function toggleTheme() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('qotor_admin_theme', newTheme);
        }

        // Event Listeners
        function initializeEventListeners() {
            // Navigation tabs
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabName = tab.getAttribute('data-tab');
                    switchToTab(tabName);
                });
            });

            // Language switcher
            const languageBtn = document.getElementById('languageBtn');
            const languageDropdown = document.getElementById('languageDropdown');
            
            if (languageBtn && languageDropdown) {
                languageBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    languageDropdown.classList.toggle('show');
                });

                document.addEventListener('click', () => {
                    languageDropdown.classList.remove('show');
                });

                document.querySelectorAll('.language-option').forEach(option => {
                    option.addEventListener('click', () => {
                        const lang = option.getAttribute('data-lang');
                        changeLanguage(lang);
                        languageDropdown.classList.remove('show');
                    });
                });
            }

            // Notification toggle
            const notificationToggle = document.getElementById('notificationToggle');
            if (notificationToggle) {
                notificationToggle.addEventListener('click', toggleNotifications);
            }

            // Logout
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', logout);
            }

            // Order search and filter
            const ordersSearch = document.getElementById('ordersSearch');
            const ordersFilter = document.getElementById('ordersFilter');
            
            if (ordersSearch) {
                ordersSearch.addEventListener('input', filterOrders);
            }
            
            if (ordersFilter) {
                ordersFilter.addEventListener('change', filterOrders);
            }

            // Modal close on background click
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.classList.remove('show');
                    }
                });
            });
        }

        // Tab Switching
        function switchToTab(tabName) {
            // Update navigation
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

            // Update content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabName}Tab`).classList.add('active');

            currentTab = tabName;

            // Load data for specific tabs
            if (tabName === 'orders') {
                loadOrders();
            } else if (tabName === 'dashboard') {
                loadDashboardData();
            }
        }

        // Dashboard Data Loading
        async function loadDashboardData() {
            try {
                // Update statistics
                await updateStatistics();
            } catch (error) {
                console.error('Error loading dashboard data:', error);
                showToast('Error loading dashboard data', 'error');
            }
        }

        async function updateStatistics() {
            try {
                // Simulate API calls - replace with actual API endpoints
                const stats = await fetchStatistics();
                
                document.getElementById('totalOrders').textContent = stats.totalOrders || '0';
                document.getElementById('pendingOrders').textContent = stats.pendingOrders || '0';
                document.getElementById('totalFragrances').textContent = stats.totalFragrances || '0';
                document.getElementById('totalRevenue').textContent = `${stats.totalRevenue || '0.000'} OMR`;

                // Update change indicators
                updateChangeIndicator('ordersChange', stats.ordersChange);
                updateChangeIndicator('pendingChange', stats.pendingChange);
                updateChangeIndicator('fragranceChange', stats.fragranceChange);
                updateChangeIndicator('revenueChange', stats.revenueChange);
            } catch (error) {
                console.error('Error updating statistics:', error);
            }
        }

        function updateChangeIndicator(elementId, change) {
            const element = document.getElementById(elementId);
            if (!element || !change) return;

            element.textContent = `${change.value > 0 ? '+' : ''}${change.value}${change.unit || ''}`;
            element.className = `stat-change ${change.value >= 0 ? 'positive' : 'negative'}`;
        }

        // Orders Management
        async function loadOrders() {
            showLoadingState('orders');
            
            try {
                const response = await fetchOrders();
                orders = response.orders || [];
                filteredOrders = [...orders];
                
                displayOrders();
                hideLoadingState('orders');
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

            if (!filteredOrders.length) {
                ordersTable.style.display = 'none';
                emptyOrders.style.display = 'block';
                return;
            }

            ordersTable.style.display = 'block';
            emptyOrders.style.display = 'none';

            tableBody.innerHTML = filteredOrders.map(order => `
                <tr onclick="viewOrderDetails('${order.id}')" style="cursor: pointer;">
                    <td>#${order.id}</td>
                    <td>
                        <div>
                            <div style="font-weight: 500;">${order.customer.name}</div>
                            <div style="font-size: 0.875rem; color: var(--text-secondary);">${order.customer.email}</div>
                        </div>
                    </td>
                    <td>${order.items.length} item${order.items.length !== 1 ? 's' : ''}</td>
                    <td style="font-weight: 600;">${formatPrice(order.total)}</td>
                    <td><span class="status-badge ${order.status}">${formatStatus(order.status)}</span></td>
                    <td>${formatDate(order.createdAt)}</td>
                    <td>
                        <div style="display: flex; gap: 0.5rem;">
                            ${order.status === 'pending' ? `
                                <button class="btn btn-success" onclick="event.stopPropagation(); updateOrderStatus('${order.id}', 'completed')" title="Mark as Completed">✓</button>
                                <button class="btn btn-danger" onclick="event.stopPropagation(); updateOrderStatus('${order.id}', 'canceled')" title="Cancel Order">✕</button>
                            ` : ''}
                            <button class="btn btn-secondary" onclick="event.stopPropagation(); viewOrderDetails('${order.id}')" title="View Details">👁</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        function filterOrders() {
            const searchTerm = document.getElementById('ordersSearch').value.toLowerCase();
            const statusFilter = document.getElementById('ordersFilter').value;

            filteredOrders = orders.filter(order => {
                const matchesSearch = !searchTerm || 
                    order.id.toString().includes(searchTerm) ||
                    order.customer.name.toLowerCase().includes(searchTerm) ||
                    order.customer.email.toLowerCase().includes(searchTerm);

                const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

                return matchesSearch && matchesStatus;
            });

            displayOrders();
        }

        function refreshOrders() {
            loadOrders();
            showToast('Orders refreshed', 'success');
        }

        // Order Details Modal
        function viewOrderDetails(orderId) {
            const order = orders.find(o => o.id === orderId);
            if (!order) return;

            currentOrderId = orderId;

            // Populate modal with order data
            document.getElementById('modalOrderId').textContent = `#${order.id}`;
            document.getElementById('modalOrderDate').textContent = formatDate(order.createdAt);
            document.getElementById('modalOrderStatus').textContent = formatStatus(order.status);
            document.getElementById('modalOrderStatus').className = `status-badge ${order.status}`;
            document.getElementById('modalOrderTotal').textContent = formatPrice(order.total);

            // Customer information
            document.getElementById('modalCustomerName').textContent = order.customer.name;
            document.getElementById('modalCustomerEmail').textContent = order.customer.email;
            document.getElementById('modalCustomerPhone').textContent = order.customer.phone || 'Not provided';
            document.getElementById('modalDeliveryAddress').textContent = order.customer.address || 'Not provided';

            // Optional fields
            const preferredTimeItem = document.getElementById('preferredTimeItem');
            const specialInstructionsItem = document.getElementById('specialInstructionsItem');
            
            if (order.preferredTime) {
                document.getElementById('modalPreferredTime').textContent = order.preferredTime;
                preferredTimeItem.style.display = 'block';
            } else {
                preferredTimeItem.style.display = 'none';
            }

            if (order.specialInstructions) {
                document.getElementById('modalSpecialInstructions').textContent = order.specialInstructions;
                specialInstructionsItem.style.display = 'block';
            } else {
                specialInstructionsItem.style.display = 'none';
            }

            // Order items
            const itemsContainer = document.getElementById('modalOrderItems');
            itemsContainer.innerHTML = order.items.map(item => `
                <div class="order-item">
                    <div class="item-info">
                        <div class="item-name">${item.fragrance}</div>
                        <div class="item-details">${item.size} • Qty: ${item.quantity}</div>
                    </div>
                    <div class="item-price">${formatPrice(item.price * item.quantity)}</div>
                </div>
            `).join('');

            // Summary
            document.getElementById('modalSubtotal').textContent = formatPrice(order.subtotal);
            document.getElementById('modalTotal').textContent = formatPrice(order.total);

            // Action buttons
            const completeBtn = document.getElementById('completeOrderBtn');
            const cancelBtn = document.getElementById('cancelOrderBtn');
            
            if (order.status === 'pending') {
                completeBtn.style.display = 'inline-flex';
                cancelBtn.style.display = 'inline-flex';
            } else {
                completeBtn.style.display = 'none';
                cancelBtn.style.display = 'none';
            }

            // Show modal
            document.getElementById('orderModal').classList.add('show');
        }

        function closeOrderModal() {
            document.getElementById('orderModal').classList.remove('show');
            currentOrderId = null;
        }

        // Order Status Update
        async function updateOrderStatus(orderId, newStatus) {
            if (!orderId) orderId = currentOrderId;
            if (!orderId) return;

            try {
                const response = await fetch('/api/admin/orders', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ 
                        orderId: orderId, 
                        status: newStatus 
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    
                    // Update local order data
                    const orderIndex = orders.findIndex(o => o.id === orderId);
                    if (orderIndex !== -1) {
                        orders[orderIndex].status = newStatus;
                        orders[orderIndex].updatedAt = new Date().toISOString();
                    }

                    // Refresh displays
                    filterOrders();
                    updateStatistics();
                    
                    // Close modal if open
                    if (currentOrderId === orderId) {
                        closeOrderModal();
                    }

                    showToast(`Order ${newStatus === 'completed' ? 'completed' : 'canceled'} successfully`, 'success');
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to update order status');
                }
            } catch (error) {
                console.error('Error updating order status:', error);
                showToast('Error updating order status: ' + error.message, 'error');
            }
        }

        // Notifications Management
        function checkNotificationPermission() {
            if ('Notification' in window) {
                const permission = Notification.permission;
                updateNotificationStatus(permission === 'granted');
            } else {
                console.log('Notifications not supported');
            }
        }

        function toggleNotifications() {
            if (!('Notification' in window)) {
                showToast('Notifications not supported in this browser', 'warning');
                return;
            }

            if (Notification.permission === 'granted') {
                notificationsEnabled = !notificationsEnabled;
                updateNotificationStatus(notificationsEnabled);
                
                if (notificationsEnabled) {
                    showToast('Notifications enabled', 'success');
                } else {
                    showToast('Notifications disabled', 'warning');
                }
            } else if (Notification.permission === 'denied') {
                showToast('Notifications are blocked. Please enable them in browser settings.', 'warning');
            } else {
                // Show modal to request permission
                document.getElementById('notificationModal').classList.add('show');
            }
        }

        async function enableNotifications() {
            try {
                const permission = await Notification.requestPermission();
                
                if (permission === 'granted') {
                    notificationsEnabled = true;
                    updateNotificationStatus(true);
                    closeNotificationModal();
                    showToast('Notifications enabled successfully!', 'success');
                    
                    // Show test notification
                    new Notification('Qotor Admin', {
                        body: 'Notifications are now enabled! You\'ll receive alerts for new orders.',
                        icon: '/api/image/logo.png'
                    });
                } else {
                    showToast('Notification permission denied', 'warning');
                }
            } catch (error) {
                console.error('Error requesting notification permission:', error);
                showToast('Error enabling notifications', 'error');
            }
        }

        function updateNotificationStatus(enabled) {
            notificationsEnabled = enabled;
            const statusElement = document.getElementById('notificationStatus');
            const badgeElement = document.getElementById('notificationBadge');
            
            if (statusElement) {
                statusElement.textContent = enabled ? 'ON' : 'OFF';
            }
            
            if (!enabled && badgeElement) {
                badgeElement.textContent = '0';
            }
        }

        function closeNotificationModal() {
            document.getElementById('notificationModal').classList.remove('show');
        }

        // Order Checking (for new order notifications)
        function startOrderChecking() {
            if (orderCheckInterval) {
                clearInterval(orderCheckInterval);
            }
            
            // Check for new orders every 30 seconds
            orderCheckInterval = setInterval(async () => {
                if (notificationsEnabled) {
                    await checkForNewOrders();
                }
            }, 30000);
        }

        async function checkForNewOrders() {
            try {
                const response = await fetchOrders();
                const newOrders = response.orders || [];
                
                // Compare with existing orders to find new ones
                const existingOrderIds = orders.map(o => o.id);
                const newOrdersFound = newOrders.filter(order => !existingOrderIds.includes(order.id));
                
                if (newOrdersFound.length > 0) {
                    // Update orders array
                    orders = newOrders;
                    
                    // Show notifications for new orders
                    newOrdersFound.forEach(order => {
                        showNewOrderNotification(order);
                    });
                    
                    // Update notification badge
                    updateNotificationBadge(newOrdersFound.length);
                    
                    // Refresh current view if on orders tab
                    if (currentTab === 'orders') {
                        filteredOrders = [...orders];
                        displayOrders();
                    }
                    
                    // Update dashboard statistics
                    updateStatistics();
                }
            } catch (error) {
                console.error('Error checking for new orders:', error);
            }
        }

        function showNewOrderNotification(order) {
            if (!notificationsEnabled || Notification.permission !== 'granted') return;
            
            new Notification('New Order Received!', {
                body: `Order #${order.id} from ${order.customer.name} - ${formatPrice(order.total)}`,
                icon: '/api/image/logo.png',
                tag: `order-${order.id}`,
                requireInteraction: true
            });
        }

        function updateNotificationBadge(newCount) {
            const badgeElement = document.getElementById('notificationBadge');
            if (badgeElement) {
                const currentCount = parseInt(badgeElement.textContent) || 0;
                badgeElement.textContent = currentCount + newCount;
            }
        }

        // Language Management
        function changeLanguage(lang) {
            // Store language preference
            localStorage.setItem('qotor_admin_language', lang);
            
            // Update document direction for Arabic
            if (lang === 'ar') {
                document.documentElement.setAttribute('dir', 'rtl');
                document.documentElement.setAttribute('lang', 'ar');
            } else {
                document.documentElement.setAttribute('dir', 'ltr');
                document.documentElement.setAttribute('lang', 'en');
            }
            
            // Apply translations (this would typically load from a translations file)
            applyTranslations(lang);
            
            showToast(`Language changed to ${lang === 'ar' ? 'العربية' : 'English'}`, 'success');
        }

        function applyTranslations(lang) {
            // This is a simplified translation system
            // In a real application, you would load translations from external files
            const translations = {
                en: {
                    admin_panel: 'Admin Panel',
                    nav_dashboard: 'Dashboard',
                    nav_orders: 'Orders',
                    nav_fragrances: 'Fragrances',
                    nav_analytics: 'Analytics',
                    total_orders: 'Total Orders',
                    pending_orders: 'Pending Orders',
                    // Add more translations as needed
                },
                ar: {
                    admin_panel: 'لوحة الإدارة',
                    nav_dashboard: 'الرئيسية',
                    nav_orders: 'الطلبات',
                    nav_fragrances: 'العطور',
                    nav_analytics: 'الإحصائيات',
                    total_orders: 'إجمالي الطلبات',
                    pending_orders: 'الطلبات المعلقة',
                    // Add more translations as needed
                }
            };

            const langData = translations[lang] || translations.en;
            
            // Apply translations to elements with data-key attributes
            document.querySelectorAll('[data-key]').forEach(element => {
                const key = element.getAttribute('data-key');
                if (langData[key]) {
                    element.textContent = langData[key];
                }
            });

            // Apply placeholder translations
            document.querySelectorAll('[data-key-placeholder]').forEach(element => {
                const key = element.getAttribute('data-key-placeholder');
                if (langData[key]) {
                    element.placeholder = langData[key];
                }
            });
        }

        // Utility Functions
        function showLoadingState(section) {
            const loadingElement = document.getElementById(`${section}Loading`);
            const contentElement = document.getElementById(`${section}Table`);
            const emptyElement = document.getElementById(`empty${section.charAt(0).toUpperCase() + section.slice(1)}`);
            
            if (loadingElement) loadingElement.style.display = 'block';
            if (contentElement) contentElement.style.display = 'none';
            if (emptyElement) emptyElement.style.display = 'none';
        }

        function hideLoadingState(section) {
            const loadingElement = document.getElementById(`${section}Loading`);
            if (loadingElement) loadingElement.style.display = 'none';
        }

        function showEmptyState(section) {
            const loadingElement = document.getElementById(`${section}Loading`);
            const contentElement = document.getElementById(`${section}Table`);
            const emptyElement = document.getElementById(`empty${section.charAt(0).toUpperCase() + section.slice(1)}`);
            
            if (loadingElement) loadingElement.style.display = 'none';
            if (contentElement) contentElement.style.display = 'none';
            if (emptyElement) emptyElement.style.display = 'block';
        }

        function formatPrice(price) {
            return `${(price / 1000).toFixed(3)} OMR`;
        }

        function formatStatus(status) {
            const statusMap = {
                pending: 'Pending',
                completed: 'Completed',
                canceled: 'Canceled'
            };
            return statusMap[status] || status;
        }

        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        function showToast(message, type = 'success') {
            // Remove existing toasts
            document.querySelectorAll('.toast').forEach(toast => toast.remove());
            
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.textContent = message;
            
            document.body.appendChild(toast);
            
            // Show toast
            setTimeout(() => toast.classList.add('show'), 100);
            
            // Hide toast after 3 seconds
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        function logout() {
            if (confirm('Are you sure you want to logout?')) {
                // Clear session cookie
                document.cookie = 'admin_session=; Path=/; Max-Age=0; SameSite=Lax';
                
                // Clear local storage
                localStorage.removeItem('admin_session');
                localStorage.removeItem('qotor_admin_theme');
                localStorage.removeItem('qotor_admin_language');
                
                // Clear intervals
                if (orderCheckInterval) {
                    clearInterval(orderCheckInterval);
                }
                
                // Call logout API to invalidate session server-side
                fetch('/logout', {
                    method: 'POST',
                    credentials: 'include'
                }).finally(() => {
                    // Redirect to login regardless of API response
                    window.location.href = '/login.html';
                });
            }
        }

        // API Functions (Real Supabase implementations)
        async function fetchStatistics() {
            try {
                // Fetch orders statistics
                const ordersResponse = await fetch('/api/admin/orders/stats');
                if (!ordersResponse.ok) {
                    throw new Error('Failed to fetch orders statistics');
                }
                const ordersStats = await ordersResponse.json();

                // Fetch fragrances statistics
                const fragrancesResponse = await fetch('/api/admin/fragrances');
                if (!fragrancesResponse.ok) {
                    throw new Error('Failed to fetch fragrances statistics');
                }
                const fragrancesData = await fragrancesResponse.json();

                return {
                    totalOrders: ordersStats.totalOrders || 0,
                    pendingOrders: ordersStats.pendingOrders || 0,
                    totalFragrances: fragrancesData.stats?.total || 0,
                    totalRevenue: ordersStats.totalRevenue || 0,
                    ordersChange: ordersStats.ordersChange || { value: 0, unit: '' },
                    pendingChange: ordersStats.pendingChange || { value: 0, unit: '' },
                    fragranceChange: fragrancesData.stats?.change || { value: 0, unit: '' },
                    revenueChange: ordersStats.revenueChange || { value: 0, unit: ' OMR' }
                };
            } catch (error) {
                console.error('Error fetching statistics:', error);
                // Return default values on error
                return {
                    totalOrders: 0,
                    pendingOrders: 0,
                    totalFragrances: 0,
                    totalRevenue: 0,
                    ordersChange: { value: 0, unit: '' },
                    pendingChange: { value: 0, unit: '' },
                    fragranceChange: { value: 0, unit: '' },
                    revenueChange: { value: 0, unit: ' OMR' }
                };
            }
        }

        async function fetchOrders() {
            try {
                const response = await fetch('/api/admin/orders', {
                    method: 'GET',
                    credentials: 'include'
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        // Redirect to login if unauthorized
                        window.location.href = '/admin/login.html';
                        return { orders: [] };
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                return { orders: data.data || [] };
            } catch (error) {
                console.error('Error fetching orders:', error);
                throw error;
            }
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            // Alt + 1-4 for tab switching
            if (e.altKey && e.key >= '1' && e.key <= '4') {
                e.preventDefault();
                const tabs = ['dashboard', 'orders', 'fragrances', 'analytics'];
                const tabIndex = parseInt(e.key) - 1;
                if (tabs[tabIndex]) {
                    switchToTab(tabs[tabIndex]);
                }
            }
            
            // Escape to close modals
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.show').forEach(modal => {
                    modal.classList.remove('show');
                });
            }
            
            // Ctrl/Cmd + R to refresh orders (when on orders tab)
            if ((e.ctrlKey || e.metaKey) && e.key === 'r' && currentTab === 'orders') {
                e.preventDefault();
                refreshOrders();
            }
        });

        // Auto-refresh dashboard statistics every 5 minutes
        setInterval(() => {
            if (currentTab === 'dashboard') {
                updateStatistics();
            }
        }, 5 * 60 * 1000);

        // Page visibility handling
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'visible') {
                // Page became visible, refresh current tab data
                if (currentTab === 'orders') {
                    loadOrders();
                } else if (currentTab === 'dashboard') {
                    loadDashboardData();
                }
            }
        });}}