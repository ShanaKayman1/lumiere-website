let allProducts = [];
let uniqueProducts = [];
let filteredProducts = [];
let favorites = JSON.parse(localStorage.getItem('lumiere_favorites')) || [];

document.addEventListener('DOMContentLoaded', () => {
    const config = window.LUMIERE_CONFIG || {};
    const waNumber = config.whatsappNumber || "972537926529";
    const defaultMsg = encodeURIComponent("Hello, I am interested in exploring the Lumière fine lab-grown diamond collection.");
    
    document.querySelectorAll('#nav-whatsapp-btn, #hero-whatsapp-btn, #footer-whatsapp-btn, #contact-whatsapp-btn').forEach(btn => {
        if(btn) btn.href = `https://wa.me/${waNumber}?text=${defaultMsg}`;
    });

    fetchInventory();

    document.getElementById('search-input').addEventListener('input', applyFiltersAndSorting);
    document.getElementById('category-filter').addEventListener('change', applyFiltersAndSorting);
    document.getElementById('metal-filter').addEventListener('change', applyFiltersAndSorting);
    document.getElementById('sort-select').addEventListener('change', applyFiltersAndSorting);

    updateFavoritesBadge();
});

async function fetchInventory() {
    const config = window.LUMIERE_CONFIG;
    const loadingState = document.getElementById('loading-state');
    
    try {
        const response = await fetch(config.apiUrl);
        const data = await response.json();
        
        if (data.status === 'success' && Array.isArray(data.products)) {
            allProducts = data.products;
            
            const modelMap = {};
            allProducts.forEach(p => {
                const modelKey = String(p.modelNumber || "").trim().toUpperCase();
                if (!modelKey) return;

                if (!modelMap[modelKey]) {
                    modelMap[modelKey] = {
                        ...p,
                        stockCount: 1,
                        allIds: [p.id]
                    };
                } else {
                    modelMap[modelKey].stockCount += 1;
                    modelMap[modelKey].allIds.push(p.id);
                }
            });

            uniqueProducts = Object.values(modelMap);
            filteredProducts = [...uniqueProducts];
            
            populateFilterDropdowns();
            renderCatalog(filteredProducts);
            if (loadingState) loadingState.classList.add('hidden');
        } else {
            throw new Error(data.message || "Invalid API response structure.");
        }
    } catch (error) {
        console.error("Failed to load live catalog:", error);
        if (loadingState) {
            loadingState.innerHTML = `
                <div class="text-center space-y-3">
                    <i class="fas fa-exclamation-circle text-2xl text-amber-600"></i>
                    <p class="text-sm text-muted">Unable to connect to live inventory sheet at this moment.</p>
                    <button onclick="fetchInventory()" class="bg-charcoal text-ivory px-4 py-2 text-xs uppercase tracking-wider">Retry Connection</button>
                </div>
            `;
        }
    }
}

function populateFilterDropdowns() {
    const categories = [...new Set(uniqueProducts.map(p => p.category))].filter(Boolean).sort();
    const metals = [...new Set(uniqueProducts.map(p => p.metal))].filter(Boolean).sort();

    const catSelect = document.getElementById('category-filter');
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        catSelect.appendChild(opt);
    });

    const metalSelect = document.getElementById('metal-filter');
    metals.forEach(metal => {
        const opt = document.createElement('option');
        opt.value = metal;
        opt.textContent = metal;
        metalSelect.appendChild(opt);
    });
}

function applyFiltersAndSorting() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const selectedCategory = document.getElementById('category-filter').value;
    const selectedMetal = document.getElementById('metal-filter').value;
    const sortBy = document.getElementById('sort-select').value;

    filteredProducts = uniqueProducts.filter(p => {
        const matchSearch = !searchTerm || 
            (p.details && p.details.toLowerCase().includes(searchTerm)) ||
            (p.modelNumber && p.modelNumber.toLowerCase().includes(searchTerm)) ||
            (p.category && p.category.toLowerCase().includes(searchTerm)) ||
            (p.metal && p.metal.toLowerCase().includes(searchTerm)) ||
            (p.goldColor && p.goldColor.toLowerCase().includes(searchTerm));

        const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
        const matchMetal = selectedMetal === 'all' || p.metal === selectedMetal;

        return matchSearch && matchCategory && matchMetal;
    });

    if (sortBy === 'price-asc') {
        filteredProducts.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
        filteredProducts.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'carat-desc') {
        filteredProducts.sort((a, b) => parseFloat(b.caratWeight || 0) - parseFloat(a.caratWeight || 0));
    }

    renderCatalog(filteredProducts);
}

function resetFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('category-filter').value = 'all';
    document.getElementById('metal-filter').value = 'all';
    document.getElementById('sort-select').value = 'default';
    filteredProducts = [...uniqueProducts];
    renderCatalog(filteredProducts);
}

function renderCatalog(products) {
    const grid = document.getElementById('product-grid');
    const emptyState = document.getElementById('empty-state');
    const resultsCount = document.getElementById('results-count');

    if (!grid) return;

    resultsCount.textContent = `Showing ${products.length} unique fine jewelry model${products.length === 1 ? '' : 's'}`;

    if (products.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    const fallbackImg = window.LUMIERE_CONFIG.fallbackImage;

    grid.innerHTML = products.map(p => {
        const isFav = favorites.some(fav => fav.modelNumber === p.modelNumber);
        const imgSrc = p.image && p.image.startsWith('http') ? p.image : fallbackImg;
        const displayName = p.details || `Model ${p.modelNumber} Fine Jewelry`;
        
        return `
            <div class="bg-white border border-cream group flex flex-col justify-between transition hover:shadow-lg">
                <div class="relative bg-cream h-[320px] overflow-hidden cursor-pointer" onclick="openProductModal('${p.modelNumber}')">
                    <img src="${imgSrc}" alt="${displayName}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" onerror="this.src='${fallbackImg}'">
                    <span class="absolute top-4 left-4 bg-white/90 px-3 py-1 text-[10px] tracking-widest uppercase text-charcoal font-medium">In Stock: ${p.stockCount}</span>
                    <button onclick="event.stopPropagation(); toggleFavorite('${p.modelNumber}')" class="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm flex items-center justify-center text-charcoal hover:text-champagne transition">
                        <i class="${isFav ? 'fas text-champagne' : 'far'} fa-heart text-lg"></i>
                    </button>
                </div>
                <div class="p-6 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between text-xs text-muted tracking-wider uppercase mb-1">
                            <span>${p.category}</span>
                            <span>Model: ${p.modelNumber}</span>
                        </div>
                        <h3 class="font-serif text-lg font-medium cursor-pointer hover:text-champagne transition line-clamp-2" onclick="openProductModal('${p.modelNumber}')">
                            ${displayName}
                        </h3>
                    </div>
                    <div class="flex items-center justify-between pt-4 border-t border-cream">
                        <span class="font-serif text-lg font-semibold">$${Number(p.price).toLocaleString()}</span>
                        <button onclick="openProductModal('${p.modelNumber}')" class="text-xs uppercase tracking-widest text-charcoal font-medium hover:text-champagne transition flex items-center gap-1">
                            View Details <i class="fas fa-chevron-right text-[10px]"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openProductModal(modelNumber) {
    const p = uniqueProducts.find(item => item.modelNumber === modelNumber);
    if (!p) return;

    const fallbackImg = window.LUMIERE_CONFIG.fallbackImage;
    const imgSrc = p.image && p.image.startsWith('http') ? p.image : fallbackImg;
    const isFav = favorites.some(fav => fav.modelNumber === p.modelNumber);
    const displayName = p.details || `Model ${p.modelNumber} Fine Jewelry`;

    document.getElementById('modal-image').src = imgSrc;
    
    let specsHtml = '';
    specsHtml += `<div class="flex justify-between py-1 border-b border-cream"><span class="text-muted">Model Number</span><span class="font-medium">${p.modelNumber}</span></div>`;
    if (p.metal) specsHtml += `<div class="flex justify-between py-1 border-b border-cream"><span class="text-muted">Metal</span><span class="font-medium">${p.metal}</span></div>`;
    if (p.goldColor) specsHtml += `<div class="flex justify-between py-1 border-b border-cream"><span class="text-muted">Gold Color</span><span class="font-medium">${p.goldColor}</span></div>`;
    if (p.caratWeight) specsHtml += `<div class="flex justify-between py-1 border-b border-cream"><span class="text-muted">Carat Weight</span><span class="font-medium">${p.caratWeight} CT</span></div>`;
    if (p.stoneColor) specsHtml += `<div class="flex justify-between py-1 border-b border-cream"><span class="text-muted">Diamond Color</span><span class="font-medium">${p.stoneColor}</span></div>`;
    if (p.clarity) specsHtml += `<div class="flex justify-between py-1 border-b border-cream"><span class="text-muted">Clarity</span><span class="font-medium">${p.clarity}</span></div>`;
    if (p.stoneAmount) specsHtml += `<div class="flex justify-between py-1 border-b border-cream"><span class="text-muted">Stone Amount</span><span class="font-medium">${p.stoneAmount}</span></div>`;
    if (p.itemWeight) specsHtml += `<div class="flex justify-between py-1 border-b border-cream"><span class="text-muted">Item Weight</span><span class="font-medium">${p.itemWeight} GR</span></div>`;
    specsHtml += `<div class="flex justify-between py-1 border-b border-cream"><span class="text-muted">Availability</span><span class="font-medium text-champagne-dark">In Stock (${p.stockCount} available)</span></div>`;

    const detailsContainer = document.getElementById('modal-details-container');
    detailsContainer.innerHTML = `
        <div class="space-y-4">
            <div class="flex items-center justify-between">
                <span class="text-xs uppercase tracking-widest text-champagne-dark">${p.category}</span>
                <span class="text-xs text-muted">Model: ${p.modelNumber}</span>
            </div>
            <h2 class="font-serif text-2xl font-normal">${displayName}</h2>
            <div class="font-serif text-2xl font-semibold text-charcoal">$${Number(p.price).toLocaleString()}</div>
            
            <div class="space-y-2 pt-2 text-xs">
                ${specsHtml}
            </div>
        </div>

        <div class="space-y-3 pt-6">
            <button onclick="inquireProductWhatsApp('${p.modelNumber}', '${p.price}')" class="w-full bg-charcoal text-ivory py-4 text-xs tracking-[0.2em] uppercase hover:bg-champagne transition flex items-center justify-center gap-2">
                <i class="fab fa-whatsapp text-base"></i> Inquire Via WhatsApp
            </button>
            <button onclick="toggleFavorite('${p.modelNumber}'); openProductModal('${p.modelNumber}');" class="w-full border border-charcoal/30 py-3 text-xs tracking-[0.2em] uppercase hover:border-champagne hover:text-champagne transition flex items-center justify-center gap-2">
                <i class="${isFav ? 'fas text-champagne' : 'far'} fa-heart"></i> ${isFav ? 'Remove from Wishlist' : 'Add to Wishlist'}
            </button>
        </div>
    `;

    document.getElementById('product-modal').classList.remove('hidden');
}

function closeProductModal() {
    document.getElementById('product-modal').classList.add('hidden');
}

function toggleFavorite(modelNumber) {
    const p = uniqueProducts.find(item => item.modelNumber === modelNumber);
    if (!p) return;

    const index = favorites.findIndex(fav => fav.modelNumber === modelNumber);
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(p);
    }

    localStorage.setItem('lumiere_favorites', JSON.stringify(favorites));
    updateFavoritesBadge();
    renderCatalog(filteredProducts);
}

function updateFavoritesBadge() {
    const badge = document.getElementById('favorites-badge');
    if (!badge) return;
    if (favorites.length > 0) {
        badge.textContent = favorites.length;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function openFavoritesModal() {
    const container = document.getElementById('favorites-list-container');
    const fallbackImg = window.LUMIERE_CONFIG.fallbackImage;

    if (favorites.length === 0) {
        container.innerHTML = `
            <div class="text-center py-16 space-y-3">
                <i class="far fa-heart text-3xl text-muted"></i>
                <p class="text-sm text-muted">Your wishlist is currently empty.</p>
            </div>
        `;
    } else {
        container.innerHTML = favorites.map(f => {
            const displayName = f.details || `Model ${f.modelNumber}`;
            return `
                <div class="flex items-center space-x-4 p-3 bg-ivory border border-cream">
                    <img src="${f.image || fallbackImg}" class="w-16 h-16 object-cover bg-cream" onerror="this.src='${fallbackImg}'">
                    <div class="flex-1">
                        <h4 class="font-serif text-sm font-medium line-clamp-1">${displayName}</h4>
                        <p class="text-xs text-muted">Model: ${f.modelNumber} | $${Number(f.price).toLocaleString()} (Stock: ${f.stockCount})</p>
                    </div>
                    <button onclick="toggleFavorite('${f.modelNumber}'); openFavoritesModal();" class="text-muted hover:text-red-500 p-2">
                        <i class="fas fa-trash-alt text-xs"></i>
                    </button>
                </div>
            `;
        }).join('');
    }

    document.getElementById('favorites-drawer').classList.remove('hidden');
}

function closeFavoritesModal() {
    document.getElementById('favorites-drawer').classList.add('hidden');
}

function inquireProductWhatsApp(model, price) {
    const config = window.LUMIERE_CONFIG;
    const message = encodeURIComponent(`Hello, I am interested in the following Lumière piece:\nModel: ${model}\nPrice: $${Number(price).toLocaleString()}\nCould you please share more details and availability?`);
    window.open(`https://wa.me/${config.whatsappNumber}?text=${message}`, '_blank');
}

function inquireWishlistWhatsApp() {
    if (favorites.length === 0) return;
    const config = window.LUMIERE_CONFIG;
    
    let itemsText = favorites.map(f => `- ${f.details || 'Model ' + f.modelNumber} (Model: ${f.modelNumber}): $${Number(f.price).toLocaleString()} (In Stock: ${f.stockCount})`).join('\n');
    const message = encodeURIComponent(`Hello, I am interested in the following Lumière wishlist pieces:\n\n${itemsText}\n\nCould you please share more details and availability?`);
    window.open(`https://wa.me/${config.whatsappNumber}?text=${message}`, '_blank');
}
