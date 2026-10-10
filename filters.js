/* Product filters — instant client-side filtering */

async function initProductFilters(options = {}) {
  const container = document.getElementById(options.containerId || 'storeProducts');
  const toolbar = document.getElementById('filterToolbar');
  if (!container || !toolbar) return;

  const allProducts = await getInventory(true);
  const bounds = getPriceBounds(allProducts);

  const params = new URLSearchParams(window.location.search);
  const state = {
    search: params.get('q') || '',
    category: params.get('category') || 'all',
    brand: params.get('brand') || 'all',
    minPrice: bounds.min,
    maxPrice: bounds.max,
    sort: 'newest'
  };

  await renderFilterToolbar(toolbar, allProducts, bounds, state);
  applyFilters(container, allProducts, state);

  if (typeof scrollToProductsSection === 'function') {
    scrollToProductsSection(false);
    setTimeout(() => scrollToProductsSection(false), 200);
  }

  toolbar.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'filterCategory' || t.id === 'filterBrand' || t.id === 'filterSort') {
      if (typeof scrollToProductsSection === 'function') scrollToProductsSection(true);
    }
  });

  toolbar.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'filterSearch') state.search = t.value;
    if (t.id === 'filterCategory') state.category = t.value;
    if (t.id === 'filterBrand') state.brand = t.value;
    if (t.id === 'filterSort') state.sort = t.value;
    if (t.id === 'priceRange') {
      state.maxPrice = Number(t.value);
      const label = document.getElementById('priceRangeLabel');
      if (label) label.textContent = `Up to ${formatPrice(state.maxPrice)}`;
    }
    applyFilters(container, allProducts, state);
  });

  toolbar.addEventListener('click', async (e) => {
    if (e.target.closest('#clearFilters')) {
      state.search = '';
      state.category = 'all';
      state.brand = 'all';
      state.minPrice = bounds.min;
      state.maxPrice = bounds.max;
      state.sort = 'newest';
      await renderFilterToolbar(toolbar, allProducts, bounds, state);
      applyFilters(container, allProducts, state);
      if (typeof scrollToProductsSection === 'function') scrollToProductsSection(true);
    }
  });
}

async function renderFilterToolbar(toolbar, products, bounds, state) {
  const brands = await getBrandList();
  const categories = getCategoryList().filter(c => c.value !== 'default');

  toolbar.innerHTML = `
    <div class="filter-row filter-row-main">
      <div class="filter-group filter-search-group">
        <label for="filterSearch">Search</label>
        <input type="search" id="filterSearch" placeholder="Search by name, brand..." value="${escapeHtml(state.search)}">
      </div>
      <div class="filter-group">
        <label for="filterCategory">Category</label>
        <select id="filterCategory">
          <option value="all">All Categories</option>
          ${categories.map(c => `<option value="${c.value}" ${state.category === c.value ? 'selected' : ''}>${c.label}</option>`).join('')}
        </select>
      </div>
      <div class="filter-group">
        <label for="filterBrand">Brand</label>
        <select id="filterBrand">
          <option value="all">All Brands</option>
          ${brands.map(b => `<option value="${escapeHtml(b)}" ${state.brand === b ? 'selected' : ''}>${escapeHtml(b)}</option>`).join('')}
        </select>
      </div>
      <div class="filter-group">
        <label for="filterSort">Sort By</label>
        <select id="filterSort">
          <option value="newest" ${state.sort === 'newest' ? 'selected' : ''}>Newest</option>
          <option value="price-asc" ${state.sort === 'price-asc' ? 'selected' : ''}>Price: Low → High</option>
          <option value="price-desc" ${state.sort === 'price-desc' ? 'selected' : ''}>Price: High → Low</option>
          <option value="alpha" ${state.sort === 'alpha' ? 'selected' : ''}>Alphabetical</option>
        </select>
      </div>
    </div>
    <div class="filter-row filter-row-secondary">
      <div class="filter-group filter-range-group">
        <label for="priceRange">Price Range — <span id="priceRangeLabel">Up to ${formatPrice(state.maxPrice)}</span></label>
        <input type="range" id="priceRange" min="${bounds.min}" max="${Math.max(bounds.max, bounds.min + 1)}" step="500" value="${state.maxPrice}">
      </div>
    </div>
    <div class="filter-meta">
      <p id="filterResultsCount" class="filter-count"></p>
      <div id="activeFilters" class="active-filters"></div>
      <button type="button" id="clearFilters" class="btn-clear-filters">Clear Filters</button>
    </div>
  `;
}

function applyFilters(container, allProducts, state) {
  const filtered = filterAndSortProducts(allProducts, state);

  renderSkeletonCards(container, 4);
  requestAnimationFrame(() => {
    setTimeout(() => {
      renderProductCards(
        container,
        filtered,
        'No products match your filters. Try adjusting your search or clear filters.'
      );
      updateFilterMeta(filtered.length, allProducts.length, state);
    }, 180);
  });
}

function updateFilterMeta(found, total, state) {
  const countEl = document.getElementById('filterResultsCount');
  const tagsEl = document.getElementById('activeFilters');
  if (countEl) countEl.textContent = `${found} of ${total} products found`;

  if (!tagsEl) return;
  const tags = [];
  if (state.search) tags.push(`Search: "${state.search}"`);
  if (state.category !== 'all') tags.push(CATEGORY_LABELS[state.category] || state.category);
  if (state.brand !== 'all') tags.push(state.brand);
  if (state.sort !== 'newest') tags.push('Sorted');
  tagsEl.innerHTML = tags.map(t => `<span class="filter-tag">${escapeHtml(t)}</span>`).join('');
}

async function initHomeProductsPreview(limit = 6) {
  const container = document.getElementById('storeProducts');
  if (!container) return;
  const products = (await getInventory(true)).slice(0, limit);
  renderSkeletonCards(container, 3);
  setTimeout(() => {
    renderProductCards(container, products, 'Products coming soon. Visit our showroom for the latest stock.');
  }, 200);
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('filterToolbar')) {
    initProductFilters();
  }
  if (document.getElementById('storeProducts') && !document.getElementById('filterToolbar')) {
    initHomeProductsPreview(6);
  }
});
