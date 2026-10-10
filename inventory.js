const INVENTORY_KEY = 'hitech_inventory';
const API_BASE = window.location.origin;

// Cache inventory in memory to avoid frequent API calls
let cachedInventory = null;

const CATEGORY_LABELS = {
  ac: 'Air Conditioners',
  refrigerator: 'Refrigerators',
  washing: 'Washing Machines',
  tv: 'LED TVs',
  microwave: 'Microwaves',
  kitchen: 'Kitchen Appliances',
  geyser: 'Water Heaters & Geysers',
  battery: 'Inverters & Batteries',
  cooler: 'Water Coolers & Dispensers',
  audio: 'Soundbars & Audio',
  default: 'Other Appliances'
};

const KNOWN_BRANDS = [
  'LG', 'Samsung', 'Whirlpool', 'Sony', 'Panasonic', 'Haier', 'Godrej',
  'Voltas Beko', 'Voltas', 'Daikin', 'Blue Star', 'Hitachi', 'IFB', 'Bosch',
  'Siemens', 'Philips', 'Prestige', 'Bajaj', 'Crompton', 'Havells', 'Mi',
  'Realme', 'OnePlus', 'TCL', 'Hisense', 'Carrier', 'Lloyd', 'Onida',
  'Videocon', 'Kelvinator', 'BPL', 'Microtek', 'Luminous', 'Exide',
  'Envitek', 'Celfrost', 'Inalsa', 'Glen', 'Kaff', 'Usha', 'Orient',
  'Polar', 'Kenstar', 'boAt', 'Wybor', 'Zunvolt', 'Toshiba', 'Mitsubishi'
];

const BRAND_ALIASES = [
  { match: /\b(whirlpool|wp)\b/i, name: 'Whirlpool' },
  { match: /\b(godrej)\b/i, name: 'Godrej' },
  { match: /\b(haier)\b/i, name: 'Haier' },
  { match: /\b(voltas\s*beko|voltbek)\b/i, name: 'Voltas Beko' },
  { match: /\b(voltas)\b/i, name: 'Voltas' },
  { match: /\b(onida)\b/i, name: 'Onida' },
  { match: /\b(lg)\b/i, name: 'LG' },
  { match: /\b(samsung)\b/i, name: 'Samsung' },
  { match: /\b(bpl)\b/i, name: 'BPL' },
  { match: /\b(kelvinator|kelivinator|kel)\b/i, name: 'Kelvinator' },
  { match: /\b(lloyd|llyod)\b/i, name: 'Lloyd' },
  { match: /\b(daikin)\b/i, name: 'Daikin' },
  { match: /\b(blue\s*star|bluestar)\b/i, name: 'Blue Star' },
  { match: /\b(mitsubishi)\b/i, name: 'Mitsubishi' },
  { match: /\b(sony)\b/i, name: 'Sony' },
  { match: /\b(ifb)\b/i, name: 'IFB' },
  { match: /\b(philips)\b/i, name: 'Philips' },
  { match: /\b(tcl)\b/i, name: 'TCL' },
  { match: /\b(toshiba)\b/i, name: 'Toshiba' },
  { match: /\b(microtek)\b/i, name: 'Microtek' },
  { match: /\b(luminous|lum)\b/i, name: 'Luminous' },
  { match: /\b(exide)\b/i, name: 'Exide' },
  { match: /\b(envitek)\b/i, name: 'Envitek' },
  { match: /\b(celfrost)\b/i, name: 'Celfrost' },
  { match: /\b(inalsa)\b/i, name: 'Inalsa' },
  { match: /\b(glen)\b/i, name: 'Glen' },
  { match: /\b(kaff)\b/i, name: 'Kaff' },
  { match: /\b(usha)\b/i, name: 'Usha' },
  { match: /\b(orient)\b/i, name: 'Orient' },
  { match: /\b(polar)\b/i, name: 'Polar' },
  { match: /\b(crompton)\b/i, name: 'Crompton' },
  { match: /\b(kenstar)\b/i, name: 'Kenstar' },
  { match: /\b(boat)\b/i, name: 'boAt' },
  { match: /\b(wybor)\b/i, name: 'Wybor' },
  { match: /\b(zunvolt)\b/i, name: 'Zunvolt' }
];

function generateProductId() {
  return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function detectCategory(name) {
  const n = (name || '').toLowerCase();
  if (/\b(battery|ups|150ah|200ah|160ah|220ah|eco\s*watt|red\s*charge|eco\s*charge|intt)\b/i.test(n)) return 'battery';
  if (/\b(geyser|water\s*heater|storage\s*heater|storage\s*hearter)\b/i.test(n)) return 'geyser';
  if (/\b(water\s*cooler|watercooler|water\s*dispenser|r\/o|commercial\s*r\/o)\b/i.test(n)) return 'cooler';
  if (/\b(tv\b|television|led\b|smart\s*tv|qled|bravia|onkyo|oled)\b/i.test(n)) return 'tv';
  if (/\b(soundbar|speaker|speakers|bar\s*1550|party\s*speaker)\b/i.test(n)) return 'audio';
  if (/\b(ac\b|sac\b|\b1\.5t\b|\b1\.3t\b|\b1\.6t\b|\b1\.7t\b|\b2\s*ton\b|\b1ton\b|\b1\.5\s*ton\b|split|spilt|inverter\s*ac|neocool|magicool|3dcool|vectra|vertis|tsnq|usnq|usuq|usuh)\b/i.test(n)) return 'ac';
  if (/\b(ws\b|wm\b|w\/m\b|washing|satt|front\s*load|top\s*load|f\/load|hydrowash|ace\s*xl|semi\s*auto|wtt|wfl)\b/i.test(n)) return 'washing';
  if (/\b(ref\b|refrigerat|fridge|freezer|impc|impro|eon|emarvel|chest\s*ref|chest\s*freezer|cfcc|\bcf\b|\brd\b|\brt\b|gl-b|gl-d|gl-n|gl-t|rdc|hrd|sbs)\b/i.test(n)) return 'refrigerator';
  if (/\b(microwave|mwo|mw\b|\bmicro\b|magicook|otg)\b/i.test(n)) return 'microwave';
  if (/\b(chimny|chimney|fan|iron|jmg|induction|infrared|toaster|sandwich|stove|washer|powershot|stabilizer|stabiliser|actd|lvp|mixer|purifier|oven|grinder|blender|cooker|kettle)\b/i.test(n)) return 'kitchen';
  return 'kitchen';
}

function detectBrand(name, product) {
  if (product && product.brand) return product.brand;
  const str = String(name || '');
  for (const alias of BRAND_ALIASES) {
    if (alias.match.test(str)) return alias.name;
  }
  for (const brand of KNOWN_BRANDS) {
    const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i');
    if (regex.test(str)) return brand;
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
  if (p.specifications && typeof p.specifications === 'object') {
    if (!p.capacity && p.specifications.capacity) p.capacity = p.specifications.capacity;
    if (!p.energyRating && p.specifications.energyRating) p.energyRating = p.specifications.energyRating;
    if (!p.warranty && p.specifications.warranty) p.warranty = p.specifications.warranty;
    if (!p.coolingTechnology && p.specifications.coolingTechnology) p.coolingTechnology = p.specifications.coolingTechnology;
    if (!p.color && p.specifications.color) p.color = p.specifications.color;
  }
  if (!p.enrichedAt) p.enrichedAt = new Date().toISOString();
  return p;
}

function createSmartProduct(name, price) {
  const cleanName = String(name || '').trim();
  const category = detectCategory(cleanName);
  const brand = detectBrand(cleanName);

  let capacity = 'Standard';
  const capMatch = cleanName.match(/(\d+(?:\.\d+)?)\s*(?:ton|tonne|l|ltr|litre|kg|kgs|inch|")\b/i);
  if (capMatch) capacity = capMatch[0];

  const categoryDefaults = {
    ac: {
      color: 'White',
      energy: '5 Star BEE Rating',
      warranty: '1 Year Comprehensive + 10 Years Compressor Warranty',
      tech: 'Inverter Cooling Technology',
      image: 'https://images.unsplash.com/photo-1631545806609-99d586a2cb74?w=800&q=80',
      features: ['5 Star BEE Rating', 'Inverter Cooling Technology', 'Anti-Bacterial Filter', 'Low Noise Operation']
    },
    refrigerator: {
      color: 'Silver',
      energy: '3 Star BEE Rating',
      warranty: '1 Year Product + 10 Years Compressor Warranty',
      tech: 'Smart Inverter Compressor',
      image: 'https://images.unsplash.com/photo-1571175443880-49ca94889491?w=800&q=80',
      features: ['Frost Free Operation', 'Smart Inverter Compressor', 'Multi Air Flow', 'Stabilizer Free']
    },
    washing: {
      color: 'Silver',
      energy: '5 Star BEE Rating',
      warranty: '2 Years Comprehensive + 10 Years Motor Warranty',
      tech: 'Smart Inverter Motor',
      image: 'https://images.unsplash.com/photo-1626806819282-2aa113a747f6?w=800&q=80',
      features: ['Multiple Wash Programs', 'Smart Inverter Motor', 'Child Lock', 'Quick Wash Mode']
    },
    tv: {
      color: 'Black',
      energy: 'Smart Power Saving',
      warranty: '1 Year Comprehensive + 1 Year Panel Warranty',
      tech: '4K HDR Picture Processor',
      image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80',
      features: ['4K Ultra HD Display', 'Smart TV Features', 'Multiple HDMI Ports', 'Dolby Audio']
    },
    microwave: {
      color: 'Black',
      energy: 'Energy Efficient',
      warranty: '1 Year Machine + 3 Years Magnetron Warranty',
      tech: 'Multi-Stage Heating',
      image: 'https://images.unsplash.com/photo-1585659722983-3f344a2f8a1c?w=800&q=80',
      features: ['Auto Cook Menus', 'Touch Control Panel', 'Child Lock', 'Timer Function']
    },
    kitchen: {
      color: 'White',
      energy: '750W Motor',
      warranty: '2 Years Product + 5 Years Motor Warranty',
      tech: 'High-Torque Copper Motor',
      image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
      features: ['750W Heavy Duty Motor', 'Stainless Steel Jars', 'Overload Protection', 'Durable Build']
    },
    default: {
      color: 'Black',
      energy: 'Energy Efficient',
      warranty: '1 Year Manufacturer Warranty',
      tech: 'Advanced Technology',
      image: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800&q=80',
      features: ['Premium Quality', 'Energy Efficient', 'Reliable Performance', 'Easy Maintenance']
    }
  };

  const def = categoryDefaults[category] || categoryDefaults.default;
  const displayName = brand && !cleanName.toLowerCase().startsWith(brand.toLowerCase())
    ? `${brand} ${cleanName}`
    : cleanName;

  return normalizeProduct({
    name: cleanName,
    price: Number(price) || 0,
    category,
    brand: brand || '',
    capacity,
    color: def.color,
    energyRating: def.energy,
    warranty: def.warranty,
    coolingTechnology: def.tech,
    features: def.features,
    image: def.image,
    description: `${displayName} — premium quality ${category !== 'default' ? category : 'home'} appliance available at HI TECH REFRIGERATION & ELECTRONICS.`
  });
}

async function getInventory(forceRefresh = false) {
  // Force refresh if requested
  if (forceRefresh) {
    cachedInventory = null;
  }

  // Return cached inventory if available
  if (cachedInventory) {
    return cachedInventory;
  }

  try {
    const res = await fetch(`${API_BASE}/api/inventory`);
    if (!res.ok) throw new Error('Failed to load inventory');
    const data = await res.json();
    const products = data.products || [];
    const normalized = products.map((p, i) => normalizeProduct(p, i));
    cachedInventory = normalized;
    return normalized;
  } catch (err) {
    console.error('Error loading inventory from server:', err);
    // Fallback to localStorage if server is unavailable
    try {
      const data = localStorage.getItem(INVENTORY_KEY);
      const products = data ? JSON.parse(data) : [];
      const normalized = products.map((p, i) => normalizeProduct(p, i));
      cachedInventory = normalized;
      return normalized;
    } catch {
      return [];
    }
  }
}

function clearInventoryCache() {
  cachedInventory = null;
}

async function saveInventory(products) {
  const normalized = products.map((p, i) => normalizeProduct(p, i));
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(normalized));
  cachedInventory = normalized;

  // Also save to server
  try {
    const res = await fetch(`${API_BASE}/api/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: normalized })
    });
    if (!res.ok) throw new Error('Failed to save to server');
    const result = await res.json();
    console.log(`Saved ${result.count} products to inventory.json`);
    return true;
  } catch (err) {
    console.error('Error saving inventory to server:', err);
    return false;
  }
}

async function getProductById(id) {
  const products = await getInventory();
  return products.find(p => p.id === id);
}

async function updateProduct(id, updates) {
  const products = await getInventory();
  const index = products.findIndex(p => p.id === id);
  if (index === -1) return null;
  products[index] = normalizeProduct({ ...products[index], ...updates, id }, index);
  await saveInventory(products);
  return products[index];
}

async function deleteProduct(id) {
  const products = await getInventory();
  const filtered = products.filter(p => p.id !== id);
  await saveInventory(filtered);
  return filtered;
}

async function getInventoryStats() {
  const products = await getInventory();
  const categories = new Set(products.map(p => p.category));
  const brands = new Set(products.map(p => p.brand).filter(Boolean));
  const fallbackImage = 'images.unsplash.com'; // any stock photo counts as a missing real image
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

async function getBrandList() {
  const products = await getInventory();
  const brands = new Set(products.map(p => p.brand).filter(Boolean));
  return [...brands].sort();
}

function getPriceBounds(products) {
  const prices = products.map(p => Number(p.price)).filter(n => !Number.isNaN(n) && n > 0);
  if (!prices.length) return { min: 0, max: 100000 };
  const min = Math.floor(Math.min(...prices));
  const max = Math.ceil(Math.max(...prices));
  if (min === max) {
    return { min: 0, max: Math.max(max, 10000) };
  }
  return { min, max };
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
             onerror="this.onerror=null; this.src='${fallback}'">
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
    btn.addEventListener('click', async () => {
      const id = btn.dataset.productId;
      const product = products.find(p => p.id === id) || await getProductById(id);
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
             onerror="this.onerror=null; this.src='${fallback}'">
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
