const INVENTORY_KEY = 'hitech_inventory';
const API_BASE = window.location.origin;

const CATEGORY_LABELS = {
  ac: 'Air Conditioners',
  refrigerator: 'Refrigerators',
  washing: 'Washing Machines',
  tv: 'LED TVs',
  microwave: 'Microwaves',
  kitchen: 'Kitchen Appliances',
  default: 'Other Appliances'
};

const KNOWN_BRANDS = [
  'LG', 'Samsung', 'Whirlpool', 'Sony', 'Panasonic', 'Haier', 'Godrej',
  'Voltas', 'Daikin', 'Blue Star', 'Hitachi', 'IFB', 'Bosch', 'Siemens',
  'Philips', 'Prestige', 'Bajaj', 'Crompton', 'Havells', 'Mi', 'Realme',
  'OnePlus', 'TCL', 'Hisense', 'Carrier', 'Lloyd', 'Onida', 'Videocon'
];

function generateProductId() {
  return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function detectCategory(name) {
  const n = (name || '').toLowerCase();
  if (/\b(ac|air.?condition|split|inverter.?ac|ton\b)/i.test(n)) return 'ac';
  if (/\b(ref|refrigerat|fridge|freezer)/i.test(n)) return 'refrigerator';
  if (/\b(wash|washing|wm\b|front.?load|top.?load)/i.test(n)) return 'washing';
  if (/\b(tv|television|led|smart.?tv|bravia|oled|qled)/i.test(n)) return 'tv';
  if (/\b(microwave|mw\b|convection|grill.?oven)/i.test(n)) return 'microwave';
  if (/\b(mixer|chimney|purifier|induction|oven|appliance|grinder)/i.test(n)) return 'kitchen';
  return 'default';
}

function detectBrand(name, product) {
  if (product && product.brand) return product.brand;
  const upper = (name || '').toUpperCase();
  for (const brand of KNOWN_BRANDS) {
    if (upper.includes(brand.toUpperCase())) return brand;
  }
  return '';
}

function normalizeProduct(product, index) {
  const p = { ...product };
  if (!p.id) p.id = generateProductId();
  p.name = String(p.name || '').trim();
  p.price = Number(p.price) || 0;
  p.category = p.category || detectCategory(p.name);
  p.brand = detectBrand(p.name, p);
  if (!p.enrichedAt) p.enrichedAt = new Date().toISOString();
  return p;
}

function getInventory() {
  try {
    const data = localStorage.getItem(INVENTORY_KEY);
    const products = data ? JSON.parse(data) : [];
    const normalized = products.map((p, i) => normalizeProduct(p, i));
    if (JSON.stringify(normalized) !== JSON.stringify(products)) {
      saveInventory(normalized);
    }
    return normalized;
  } catch {
    return [];
  }
}

function saveInventory(products) {
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(products.map((p, i) => normalizeProduct(p, i))));
}

function getProductById(id) {
  return getInventory().find(p => p.id === id);
}

function updateProduct(id, updates) {
  const products = getInventory();
  const index = products.findIndex(p => p.id === id);
  if (index === -1) return null;
  products[index] = normalizeProduct({ ...products[index], ...updates, id }, index);
  saveInventory(products);
  return products[index];
}

function deleteProduct(id) {
  const products = getInventory().filter(p => p.id !== id);
  saveInventory(products);
  return products;
}

function getInventoryStats() {
  const products = getInventory();
  const categories = new Set(products.map(p => p.category));
  const brands = new Set(products.map(p => p.brand).filter(Boolean));
  const fallbackImage = 'images.unsplash.com/photo-1468495244123';
  return {
    totalProducts: products.length,
    totalCategories: categories.size,
    totalBrands: brands.size,
    missingImages: products.filter(p => !p.image || p.image.includes(fallbackImage)).length,
    missingDescriptions: products.filter(p => !p.description || p.description.length < 40).length,
    recentlyImported: [...products]
      .sort((a, b) => new Date(b.enrichedAt || 0) - new Date(a.enrichedAt || 0))
      .slice(0, 5)
  };
}

function getCategoryList() {
  return Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));
}

function getBrandList() {
  const brands = new Set(getInventory().map(p => p.brand).filter(Boolean));
  return [...brands].sort();
}

function getPriceBounds(products) {
  const prices = products.map(p => Number(p.price)).filter(n => !Number.isNaN(n) && n > 0);
  if (!prices.length) return { min: 0, max: 100000 };
  return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
}

function parsePrice(value) {
  const num = Number(value);
  return Number.isNaN(num) ? 0 : num;
}

function filterAndSortProducts(products, filters) {
  let result = [...products];
  const q = (filters.search || '').trim().toLowerCase();

  if (q) {
    result = result.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.brand || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (CATEGORY_LABELS[p.category] || '').toLowerCase().includes(q)
    );
  }

  if (filters.category && filters.category !== 'all') {
    result = result.filter(p => p.category === filters.category);
  }

  if (filters.brand && filters.brand !== 'all') {
    result = result.filter(p => p.brand === filters.brand);
  }

  const minP = parsePrice(filters.minPrice);
  const maxP = parsePrice(filters.maxPrice);
  if (maxP > 0) {
    result = result.filter(p => {
      const price = parsePrice(p.price);
      return price >= minP && price <= maxP;
    });
  }

  switch (filters.sort) {
    case 'price-asc':
      result.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
      break;
    case 'price-desc':
      result.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
      break;
    case 'alpha':
      result.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'newest':
    default:
      result.sort((a, b) => new Date(b.enrichedAt || 0) - new Date(a.enrichedAt || 0));
      break;
  }

  return result;
}

function formatPrice(price) {
  const num = Number(price);
  if (Number.isNaN(num)) return price;
  return '₹' + num.toLocaleString('en-IN');
}

function escapeHtml(text) {
  if (text == null) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function productImageSrc(product) {
  return product.image || 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800&q=80';
}

function shortDescription(product) {
  const desc = product.description ||
    `${product.name} — premium quality home appliance available at HI TECH REFRIGERATION & ELECTRONICS.`;
  const max = 130;
  if (desc.length <= max) return desc;
  return desc.slice(0, max).trim() + '…';
}

function getFeatureIcon(feature) {
  const f = feature.toLowerCase();
  if (/energy|efficient|star|bee|eco/i.test(f)) return '⚡';
  if (/warranty|guarantee|protect/i.test(f)) return '🛡️';
  if (/cool|frost|inverter|compressor|freeze/i.test(f)) return '❄️';
  if (/smart|wifi|diagnosis|voice/i.test(f)) return '📶';
  if (/wash|clean|steam/i.test(f)) return '✨';
  if (/display|hd|4k|tv|led|screen/i.test(f)) return '📺';
  if (/noise|quiet|silent/i.test(f)) return '🔇';
  if (/capacity|litre|ton|kg|inch/i.test(f)) return '📐';
  if (/delivery|install|setup/i.test(f)) return '🔧';
  if (/lock|safe|child/i.test(f)) return '🔒';
  return '✓';
}

function buildFeatureList(product) {
  const fromProduct = (product.features || []).slice(0, 4);
  if (fromProduct.length >= 4) return fromProduct;

  const extras = [
    product.capacity && `${product.capacity} Capacity`,
    product.energyRating,
    product.coolingTechnology,
    product.warranty && 'Official Warranty'
  ].filter(Boolean);

  const merged = [...fromProduct];
  for (const item of extras) {
    if (merged.length >= 4) break;
    if (!merged.some(m => m.toLowerCase().includes(String(item).toLowerCase().slice(0, 8)))) {
      merged.push(item);
    }
  }

  while (merged.length < 4) {
    const defaults = ['Premium Build Quality', 'Energy Efficient', 'Expert Installation', 'Genuine Product'];
    const next = defaults[merged.length];
    if (!merged.includes(next)) merged.push(next);
    else break;
  }

  return merged.slice(0, 4);
}

function renderFeatureItems(features) {
  return features.map(f => `
    <li class="product-feature-item">
      <span class="product-feature-icon">${getFeatureIcon(f)}</span>
      <span class="product-feature-text">${escapeHtml(f)}</span>
    </li>
  `).join('');
}

function renderProductCard(product) {
  const features = buildFeatureList(product);
  const img = escapeHtml(productImageSrc(product));
  const fallback = 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800&q=80';

  return `
    <article class="product-card ecommerce-card fade-up">
      <div class="product-image-wrap">
        <img src="${img}" alt="${escapeHtml(product.name)}"
             loading="lazy" decoding="async" width="400" height="260"
             onerror="this.src='${fallback}'">
      </div>
      <div class="product-card-body">
        <h3 class="product-name">${escapeHtml(product.name)}</h3>
        <div class="product-price-block">
          <span class="product-price-label">Selling Price</span>
          <p class="product-price">${formatPrice(product.price)}</p>
        </div>
        <p class="product-desc-short">${escapeHtml(shortDescription(product))}</p>
        <ul class="product-features">
          ${renderFeatureItems(features)}
        </ul>
        <button type="button" class="btn-view-details" data-product-id="${escapeHtml(product.id)}">
          View Details
        </button>
      </div>
    </article>
  `;
}

function renderSkeletonCards(container, count = 6) {
  if (!container) return;
  container.innerHTML = Array(count).fill(0).map(() => `
    <article class="product-card ecommerce-card skeleton-card" aria-hidden="true">
      <div class="skeleton skeleton-image"></div>
      <div class="product-card-body">
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text short"></div>
        <div class="skeleton skeleton-text medium"></div>
        <div class="skeleton skeleton-btn"></div>
      </div>
    </article>
  `).join('');
}

function renderProductCards(container, products, emptyMessage) {
  if (!container) return;

  if (!products.length) {
    container.innerHTML = `<p class="inventory-empty">${emptyMessage}</p>`;
    return;
  }

  container.innerHTML = products.map(product => renderProductCard(product)).join('');
  bindViewDetailsButtons(container, products);
  observeFadeElements(container);
}

function bindViewDetailsButtons(container, products) {
  container.querySelectorAll('.btn-view-details').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.productId;
      const product = products.find(p => p.id === id) || getProductById(id);
      openProductModal(product);
    });
  });
}

function ensureProductModal() {
  if (document.getElementById('productModal')) return;

  document.body.insertAdjacentHTML('beforeend', `
    <div id="productModal" class="product-modal" hidden>
      <div class="product-modal-backdrop"></div>
      <div class="product-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modalProductName">
        <button type="button" class="product-modal-close" aria-label="Close">&times;</button>
        <div class="product-modal-content"></div>
      </div>
    </div>
  `);

  const modal = document.getElementById('productModal');
  modal.querySelector('.product-modal-backdrop').addEventListener('click', closeProductModal);
  modal.querySelector('.product-modal-close').addEventListener('click', closeProductModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeProductModal();
  });
}

function openProductModal(product) {
  if (!product) return;
  ensureProductModal();

  const modal = document.getElementById('productModal');
  const content = modal.querySelector('.product-modal-content');
  const features = buildFeatureList(product);
  const img = escapeHtml(productImageSrc(product));
  const fallback = 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800&q=80';

  content.innerHTML = `
    <div class="modal-grid">
      <div class="modal-image-wrap">
        <img src="${img}" alt="${escapeHtml(product.name)}" loading="lazy"
             onerror="this.src='${fallback}'">
      </div>
      <div class="modal-info">
        <h2 id="modalProductName">${escapeHtml(product.name)}</h2>
        <p class="modal-price">${formatPrice(product.price)}</p>
        <p class="modal-desc">${escapeHtml(product.description || shortDescription(product))}</p>
        <ul class="modal-features">
          ${renderFeatureItems(features)}
        </ul>
        <div class="modal-specs">
          ${product.capacity ? `<div class="modal-spec"><span>Capacity</span><strong>${escapeHtml(product.capacity)}</strong></div>` : ''}
          ${product.color ? `<div class="modal-spec"><span>Color</span><strong>${escapeHtml(product.color)}</strong></div>` : ''}
          ${product.energyRating ? `<div class="modal-spec"><span>Energy Rating</span><strong>${escapeHtml(product.energyRating)}</strong></div>` : ''}
          ${product.warranty ? `<div class="modal-spec"><span>Warranty</span><strong>${escapeHtml(product.warranty)}</strong></div>` : ''}
          ${product.coolingTechnology ? `<div class="modal-spec"><span>Cooling Technology</span><strong>${escapeHtml(product.coolingTechnology)}</strong></div>` : ''}
        </div>
        <a href="tel:+919876543210" class="btn btn-primary btn-full modal-call-btn">Call to Order</a>
      </div>
    </div>
  `;

  modal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeProductModal() {
  const modal = document.getElementById('productModal');
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  document.body.style.overflow = '';
}

function observeFadeElements(root = document) {
  if (!('IntersectionObserver' in window)) return;
  const els = root.querySelectorAll('.fade-up:not(.visible)');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  els.forEach(el => observer.observe(el));
}

async function enrichOneProduct(name, price) {
  const res = await fetch(`${API_BASE}/api/enrich-one`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, price })
  });
  if (!res.ok) throw new Error('Server not running');
  const product = await res.json();
  return normalizeProduct({ ...product, id: generateProductId() }, 0);
}

async function refreshOneProduct(name, price) {
  const res = await fetch(`${API_BASE}/api/refresh-product`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, price })
  });
  if (!res.ok) throw new Error('Server not running');
  return res.json();
}

function extractCapacityNumber(text) {
  if (!text) return 0;
  const m = String(text).match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}
