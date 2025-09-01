// Image cache management for main page
class ImageCacheManager {
    constructor() {
        this.cacheTimestamp = Date.now();
        this.imageLoadAttempts = new Map();
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
    }

    // Generate cache buster parameter
    generateCacheBuster(imagePath) {
        const pathHash = this.simpleHash(imagePath);
        return `${this.cacheTimestamp}_${pathHash}`;
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    getImageUrl(imagePath, forceRefresh = false) {
        if (!imagePath) return null;
        
        // Clean the image path
        const cleanPath = imagePath.replace('fragrance-images/', '');
        
        // Generate cache buster
        const cacheBuster = forceRefresh ? Date.now() : this.generateCacheBuster(imagePath);
        
        return `/api/image/${cleanPath}?v=${cacheBuster}`;
    }

    // Load image with retry logic
    async loadImageWithRetry(imagePath, targetElement) {
        const imageUrl = this.getImageUrl(imagePath);
        const attempts = this.imageLoadAttempts.get(imagePath) || 0;

        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                // Success - update the target element
                if (targetElement) {
                    targetElement.src = imageUrl;
                    targetElement.style.display = 'block';
                }
                this.imageLoadAttempts.delete(imagePath); // Clear attempts on success
                resolve(imageUrl);
            };
            
            img.onerror = () => {
                console.warn(`Failed to load image: ${imageUrl} (attempt ${attempts + 1}/${this.maxRetries})`);
                
                if (attempts < this.maxRetries) {
                    // Retry with a delay
                    this.imageLoadAttempts.set(imagePath, attempts + 1);
                    setTimeout(() => {
                        // Try with force refresh
                        const refreshedUrl = this.getImageUrl(imagePath, true);
                        img.src = refreshedUrl;
                    }, this.retryDelay * (attempts + 1));
                } else {
                    // Max retries reached - show fallback
                    this.imageLoadAttempts.delete(imagePath);
                    if (targetElement) {
                        targetElement.style.display = 'none';
                        // Show fallback icon
                        const parent = targetElement.parentElement;
                        if (parent) {
                            parent.innerHTML = '<span class="fallback-icon">🌸</span>';
                        }
                    }
                    reject(new Error(`Failed to load image after ${this.maxRetries} attempts`));
                }
            };
            
            img.src = imageUrl;
        });
    }

    // Refresh all images on the page
    refreshAllImages() {
        console.log('🔄 Refreshing all product images...');
        this.cacheTimestamp = Date.now();
        
        // Find all product images
        const productImages = document.querySelectorAll('.product-image img, #modalImage');
        productImages.forEach(img => {
            const originalSrc = img.src;
            if (originalSrc && originalSrc.includes('/api/image/')) {
                // Extract image path from current src
                const pathMatch = originalSrc.match(/\/api\/image\/([^?]+)/);
                if (pathMatch) {
                    const imagePath = pathMatch[1];
                    const newUrl = this.getImageUrl(imagePath, true);
                    img.src = newUrl;
                    console.log(`🖼️ Refreshed: ${imagePath}`);
                }
            }
        });
    }

    // Preload images for better performance
    preloadImages(fragrances) {
        console.log('⬇️ Preloading product images...');
        fragrances.forEach(fragrance => {
            if (fragrance.image_path) {
                const img = new Image();
                img.src = this.getImageUrl(fragrance.image_path);
            }
        });
    }
}

// Global image cache manager instance
const imageCacheManager = new ImageCacheManager();

// Enhanced createProductCard function with cache busting
function createProductCard(fragrance) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.onclick = () => openProductModal(fragrance);
    
    // Get price range
    const sampleVariants = fragrance.variants.filter(v => !v.is_whole_bottle);
    let priceDisplay = 'Contact for pricing';
    
    if (sampleVariants.length > 0) {
        const prices = sampleVariants.map(v => v.price).filter(p => p > 0);
        if (prices.length > 0) {
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            priceDisplay = minPrice === maxPrice 
                ? `${minPrice.toFixed(3)} OMR`
                : `${minPrice.toFixed(3)} - ${maxPrice.toFixed(3)} OMR`;
        }
    }

    // Create image URL with cache buster
    const imageUrl = fragrance.image_path ? 
        imageCacheManager.getImageUrl(fragrance.image_path) : null;
    
    card.innerHTML = `
        <div class="product-image">
            ${imageUrl ? 
                `<img src="${imageUrl}" alt="${fragrance.name}" loading="lazy" onerror="handleImageError(this, '${fragrance.image_path}')">` :
                '<span class="fallback-icon">🌸</span>'
            }
        </div>
        <div class="product-info">
            ${fragrance.brand ? `<div class="product-brand">${fragrance.brand}</div>` : ''}
            <h3 class="product-name">${fragrance.name}</h3>
            <div class="product-price">${priceDisplay}</div>
        </div>
    `;
    
    return card;
}

// Enhanced openProductModal function with cache busting
function openProductModal(fragrance) {
    const modal = document.getElementById('productModal');
    const modalImage = document.getElementById('modalImage');
    const modalTitle = document.getElementById('modalTitle');
    const modalBrand = document.getElementById('modalBrand');
    const modalDescription = document.getElementById('modalDescription');
    const modalVariants = document.getElementById('modalVariants');

    // Set basic info
    modalTitle.textContent = fragrance.name;
    modalBrand.textContent = fragrance.brand || '';
    modalDescription.textContent = fragrance.description || 'No description available';

    // Set image with cache buster
    if (fragrance.image_path) {
        const imageUrl = imageCacheManager.getImageUrl(fragrance.image_path);
        modalImage.src = imageUrl;
        modalImage.alt = fragrance.name;
        modalImage.style.display = 'block';
        
        // Handle image load error
        modalImage.onerror = () => handleImageError(modalImage, fragrance.image_path);
    } else {
        modalImage.style.display = 'none';
    }

    // Set variants
    if (modalVariants && fragrance.variants) {
        modalVariants.innerHTML = fragrance.variants.map(variant => `
            <div class="variant-option" data-variant-id="${variant.id}">
                <label>
                    <input type="radio" name="variant" value="${variant.id}">
                    <span class="variant-info">
                        <span class="variant-size">${variant.size}</span>
                        <span class="variant-price">${variant.price_display}</span>
                    </span>
                </label>
            </div>
        `).join('');
    }

    modal.style.display = 'flex';
}

// Handle image loading errors with retry
function handleImageError(imgElement, imagePath) {
    console.warn('Image failed to load, attempting retry:', imagePath);
    
    if (imgElement && imagePath) {
        // Try to reload with cache manager
        imageCacheManager.loadImageWithRetry(imagePath, imgElement)
            .catch(error => {
                console.error('Failed to load image after retries:', error);
            });
    }
}

// Enhanced displayFragrances function
function displayFragrances() {
    const grid = document.getElementById('productsGrid');
    const loading = document.getElementById('loading');
    const emptyState = document.getElementById('emptyState');
    
    if (fragrances.length === 0) {
        showEmptyState();
        return;
    }
    
    loading.style.display = 'none';
    emptyState.style.display = 'none';
    grid.style.display = 'grid';
    
    grid.innerHTML = '';
    
    // Preload images for better performance
    imageCacheManager.preloadImages(fragrances);
    
    fragrances.forEach(fragrance => {
        const card = createProductCard(fragrance);
        grid.appendChild(card);
    });
    
    console.log(`✅ Displayed ${fragrances.length} products with cache-busted images`);
}

// Add refresh functionality to main page
function refreshProductImages() {
    imageCacheManager.refreshAllImages();
    
    // Also reload fragrances data
    loadFragrances();
}

// Auto-refresh images periodically (optional)
function startImageRefreshTimer(intervalMinutes = 10) {
    setInterval(() => {
        console.log('🔄 Auto-refreshing product images...');
        imageCacheManager.refreshAllImages();
    }, intervalMinutes * 60 * 1000);
}

// Add manual refresh button (optional)
function addRefreshButton() {
    // Check if refresh button already exists
    if (document.getElementById('refreshImagesBtn')) return;
    
    const heroSection = document.querySelector('.hero-content');
    if (heroSection) {
        const refreshBtn = document.createElement('button');
        refreshBtn.id = 'refreshImagesBtn';
        refreshBtn.className = 'refresh-images-btn';
        refreshBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6 0-3.31 2.69-6 6-6 1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
            Refresh Images
        `;
        refreshBtn.onclick = refreshProductImages;
        refreshBtn.style.cssText = `
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 0.5rem 1rem;
            border-radius: 8px;
            cursor: pointer;
            margin-top: 1rem;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.3s ease;
        `;
        refreshBtn.onmouseover = () => {
            refreshBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        };
        refreshBtn.onmouseout = () => {
            refreshBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        };
        
        heroSection.appendChild(refreshBtn);
    }
}

// Initialize enhanced image loading when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🖼️ Image cache manager initialized');
    
    // Add refresh button (optional)
    addRefreshButton();
    
    // Start auto-refresh timer (optional - every 10 minutes)
    // startImageRefreshTimer(10);
});

// Keyboard shortcut to refresh images (Ctrl+Shift+R)
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        refreshProductImages();
        console.log('🔄 Manual image refresh triggered');
    }
});

// Make functions globally available
window.imageCacheManager = imageCacheManager;
window.refreshProductImages = refreshProductImages;
window.handleImageError = handleImageError;