const fileInput = document.getElementById('fileInput');
const importBtn = document.getElementById('importBtn');
const importStatus = document.getElementById('importStatus');
const productList = document.getElementById('productList');
const productCount = document.getElementById('productCount');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const adminSearchInput = document.getElementById('adminSearchInput');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');

// Stats elements
const statTotalProducts = document.getElementById('statTotalProducts');
const statTotalBrands = document.getElementById('statTotalBrands');
const statTotalCategories = document.getElementById('statTotalCategories');
const statMissingImages = document.getElementById('statMissingImages');
const recentImportsList = document.getElementById('recentImportsList');

importBtn.addEventListener('click', () => {
  if (!importBtn.disabled) fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  importExcel(file);
  fileInput.value = '';
});

function showStatus(message, type) {
  importStatus.textContent = message;
  importStatus.className = 'import-status ' + (type || '');
}

function setProgress(percent) {
  if (!progressBar) return;
  progressBar.hidden = percent <= 0 || percent >= 100;
  progressFill.style.width = percent + '%';
}

function setImporting(active) {
  importBtn.disabled = active;
  importBtn.textContent = active ? 'Searching internet...' : 'Import Inventory';
}

function findColumnKey(row, names) {
  const keys = Object.keys(row);
  for (const name of names) {
    const match = keys.find(k => k.trim().toLowerCase() === name.toLowerCase());
    if (match) return match;
  }
  return null;
}

function parseProducts(rows) {
  if (!rows.length) return [];

  const nameKey = findColumnKey(rows[0], ['Product Name', 'ProductName', 'Name', 'Product']);
  const priceKey = findColumnKey(rows[0], ['Price', 'MRP', 'Amount']);

  if (!nameKey || !priceKey) {
    throw new Error('Could not find "Product Name" and "Price" columns in your file.');
  }

  return rows
    .map(row => ({
      name: String(row[nameKey] || '').trim(),
      price: row[priceKey]
    }))
    .filter(p => p.name);
}

async function enrichAllProducts(products, existing = []) {
  const enriched = [];
  setImporting(true);
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < products.length; i++) {
    if (i > 0) {
      // Respect search rate limits
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    const p = products[i];
    const step = i + 1;
    const percent = Math.round((step / products.length) * 100);

    setProgress(percent);
    showStatus(`Searching internet for product ${step} of ${products.length}: ${p.name}...`, '');

    try {
      const product = await enrichOneProduct(p.name, p.price);
      enriched.push(product);
      successCount++;
    } catch (err) {
      console.error(`Failed to enrich product "${p.name}":`, err);
      const cat = detectCategory(p.name);
      enriched.push(normalizeProduct({
        name: p.name,
        price: Number(p.price) || 0,
        category: cat,
        image: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800&q=80',
        capacity: 'Standard',
        color: cat === 'refrigerator' ? 'Silver' : 'Black',
        features: ['Premium Quality', 'Energy Efficient', 'Reliable Performance'],
        energyRating: cat === 'kitchen' ? '750W Motor' : '3 Star BEE Rating',
        warranty: '1 Year Manufacturer Warranty',
        coolingTechnology: cat === 'tv' ? '4K Picture Engine' : cat === 'kitchen' ? 'High-Torque Motor' : 'Inverter Technology',
        description: `${p.name} — available at HI TECH REFRIGERATION & ELECTRONICS. Visit our showroom for full details.`
      }));
      errorCount++;
    }

    if (i % 10 === 0 || i === products.length - 1) {
      const merged = [...existing, ...enriched];
      await saveInventory(merged);
      displayProducts(merged);
    }
  }

  // Clear cache to force reload from server
  clearInventoryCache();

  setProgress(100);
  setImporting(false);
  const message = `Done! ${enriched.length} new products added (${existing.length} existing kept). ${successCount} enriched successfully, ${errorCount} used fallback data.`;
  showStatus(message, 'success');
  console.log(`Import complete: ${successCount} successful, ${errorCount} fallbacks`);
  setTimeout(() => setProgress(0), 2000);
}

async function fastBulkImport(products, existing = []) {
  setImporting(true);
  setProgress(20);
  showStatus(`Processing ${products.length} products with smart categorization...`, '');

  const enriched = [];
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    enriched.push(createSmartProduct(p.name, p.price));
  }

  setProgress(65);
  showStatus(`Saving ${enriched.length} products to inventory...`, '');

  const merged = [...existing, ...enriched];
  await saveInventory(merged);
  clearInventoryCache();
  displayProducts(merged);

  setProgress(100);
  setImporting(false);
  showStatus(`Success! ${enriched.length} new products added (${existing.length} existing products kept). Run build-catalog.js to fetch real photos.`, 'success');
  setTimeout(() => setProgress(0), 3000);
}

function importExcel(file) {
  showStatus('Reading file...', '');
  setProgress(0);

  const reader = new FileReader();

  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      const products = parseProducts(rows);

      if (!products.length) {
        showStatus('No products found in the file.', 'error');
        return;
      }

      // ---- Merge mode: never replace the existing catalog ----
      const existing = await getInventory(true);
      const norm = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const existingByName = new Map(existing.map(p => [norm(p.name), p]));
      const seen = new Set();
      const fresh = [];
      const priceChanges = [];
      let alreadyThere = 0;
      for (const row of products) {
        const key = norm(row.name);
        if (seen.has(key)) continue;
        seen.add(key);
        const match = existingByName.get(key);
        if (!match) { fresh.push(row); continue; }
        alreadyThere++;
        const newPrice = Number(row.price);
        if (newPrice > 0 && newPrice !== Number(match.price)) priceChanges.push({ match, newPrice });
      }
      const applyPrices = () => priceChanges.forEach(c => { c.match.price = c.newPrice; });

      if (!fresh.length) {
        if (priceChanges.length) {
          applyPrices();
          await saveInventory(existing);
          displayProducts(existing);
          showStatus(`No new products. Updated ${priceChanges.length} prices.`, 'success');
        } else {
          showStatus('Nothing to import: every product in this file is already in your inventory.', '');
        }
        return;
      }

      const proceed = confirm(
        `${fresh.length} new products will be added.\n` +
        `${alreadyThere} are already in your inventory (${priceChanges.length} price changes).\n\n` +
        `Your existing products and photos are kept.\nContinue?`
      );
      if (!proceed) {
        showStatus('Import cancelled. Nothing was changed.', '');
        return;
      }
      applyPrices();

      if (fresh.length > 25) {
        const useFast = confirm(
          `Adding ${fresh.length} new products.\n\n` +
          `• Click OK for Fast Import (instant, category photos - run build-catalog.js afterwards for real photos)\n` +
          `• Click Cancel for Live Web Search (~${Math.round((fresh.length * 2) / 60)} minutes)`
        );
        if (useFast) {
          await fastBulkImport(fresh, existing);
          return;
        }
      }

      await enrichAllProducts(fresh, existing);
    } catch (err) {
      setImporting(false);
      setProgress(0);
      showStatus(err.message || 'Could not read the file. Please check the format.', 'error');
    }
  };

  reader.onerror = () => {
    setImporting(false);
    showStatus('Could not read the file.', 'error');
  };

  reader.readAsArrayBuffer(file);
}

function displayProducts(products) {
  productCount.textContent = products.length + (products.length === 1 ? ' product' : ' products');
  renderAdminProductList(products);
  updateStats();
}

async function updateStats() {
  const stats = await getInventoryStats();
  if (statTotalProducts) statTotalProducts.textContent = stats.totalProducts;
  if (statTotalBrands) statTotalBrands.textContent = stats.totalBrands;
  if (statTotalCategories) statTotalCategories.textContent = stats.totalCategories;
  if (statMissingImages) statMissingImages.textContent = stats.missingImages;
  
  if (recentImportsList && stats.recentlyImported.length) {
    recentImportsList.innerHTML = stats.recentlyImported.map(p => 
      `<li>${escapeHtml(p.name)} — ${formatPrice(p.price)}</li>`
    ).join('');
  } else if (recentImportsList) {
    recentImportsList.innerHTML = '<li>No recent imports</li>';
  }
}

function renderAdminProductList(products) {
  if (!products.length) {
    productList.innerHTML = '<p class="inventory-empty">No products yet. Click "Import Inventory" to add products from your Excel file.</p>';
    return;
  }

  productList.innerHTML = products.map(p => `
    <div class="admin-product-row" data-product-id="${escapeHtml(p.id)}">
      <img src="${escapeHtml(productImageSrc(p))}" alt="${escapeHtml(p.name)}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=200&q=80'">
      <div class="admin-product-info">
        <h4>${escapeHtml(p.name)}</h4>
        <small>${escapeHtml(p.brand || 'Unknown Brand')} | ${formatPrice(p.price)}</small>
      </div>
      <div class="admin-product-actions">
        <button type="button" class="btn-sm btn-edit" data-action="edit" data-id="${escapeHtml(p.id)}">Edit</button>
        <button type="button" class="btn-sm btn-refresh" data-action="refresh" data-id="${escapeHtml(p.id)}">Refresh</button>
        <button type="button" class="btn-sm btn-delete" data-action="delete" data-id="${escapeHtml(p.id)}">Delete</button>
      </div>
    </div>
  `).join('');

  // Bind action buttons
  productList.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', handleProductAction);
  });
}

async function handleProductAction(e) {
  const action = e.target.dataset.action;
  const id = e.target.dataset.id;
  
  if (action === 'edit') {
    openEditModal(id);
  } else if (action === 'delete') {
    if (confirm('Are you sure you want to delete this product?')) {
      await deleteProduct(id);
      displayProducts(await getInventory());
    }
  } else if (action === 'refresh') {
    const product = await getProductById(id);
    if (product) {
      await refreshProductData(id, product.name, product.price);
    }
  }
}

async function openEditModal(id) {
  const product = await getProductById(id);
  if (!product) return;

  document.getElementById('editProductId').value = product.id;
  document.getElementById('editName').value = product.name;
  document.getElementById('editPrice').value = product.price;
  document.getElementById('editImage').value = product.image || '';
  document.getElementById('editCategory').value = product.category || 'default';
  document.getElementById('editBrand').value = product.brand || '';
  document.getElementById('editCapacity').value = product.capacity || '';
  document.getElementById('editColor').value = product.color || '';
  document.getElementById('editEnergy').value = product.energyRating || '';
  document.getElementById('editWarranty').value = product.warranty || '';
  document.getElementById('editCooling').value = product.coolingTechnology || '';
  document.getElementById('editDescription').value = product.description || '';

  editModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeEditModal() {
  editModal.hidden = true;
  document.body.style.overflow = '';
}

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('editProductId').value;
  const updates = {
    name: document.getElementById('editName').value,
    price: Number(document.getElementById('editPrice').value),
    image: document.getElementById('editImage').value,
    category: document.getElementById('editCategory').value,
    brand: document.getElementById('editBrand').value,
    capacity: document.getElementById('editCapacity').value,
    color: document.getElementById('editColor').value,
    energyRating: document.getElementById('editEnergy').value,
    warranty: document.getElementById('editWarranty').value,
    coolingTechnology: document.getElementById('editCooling').value,
    description: document.getElementById('editDescription').value
  };
  await updateProduct(id, updates);
  closeEditModal();
  displayProducts(await getInventory());
});

editModal.querySelector('.product-modal-close').addEventListener('click', closeEditModal);
editModal.querySelector('.product-modal-backdrop').addEventListener('click', closeEditModal);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !editModal.hidden) closeEditModal();
});

async function refreshProductData(id, name, price) {
  const btn = document.querySelector(`[data-action="refresh"][data-id="${id}"]`);
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Refreshing...';
  }

  try {
    const refreshed = await refreshOneProduct(name, price);
    const current = await getProductById(id);
    // Fill blanks only: never overwrite details or photos you already have
    const updates = {};
    ['capacity', 'color', 'energyRating', 'warranty', 'coolingTechnology', 'description', 'features'].forEach(k => {
      const cur = current && current[k];
      const empty = !cur || (Array.isArray(cur) && !cur.length);
      if (empty && refreshed[k]) updates[k] = refreshed[k];
    });
    // Replace the photo only if the current one is missing or a stock photo
    const curImg = (current && current.image) || '';
    const isStock = u => String(u).includes('images.unsplash.com');
    if ((!curImg || isStock(curImg)) && refreshed.image && !isStock(refreshed.image)) {
      updates.image = refreshed.image;
    }
    await updateProduct(id, updates);
    displayProducts(await getInventory());
    showStatus('Product data refreshed successfully!', 'success');
  } catch (err) {
    showStatus('Failed to refresh product. Server may not be running.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Refresh';
    }
  }
}

// Admin search
adminSearchInput.addEventListener('input', async (e) => {
  const query = e.target.value.toLowerCase().trim();
  const allProducts = await getInventory();
  const filtered = query 
    ? allProducts.filter(p => 
        p.name.toLowerCase().includes(query) || 
        (p.brand || '').toLowerCase().includes(query)
      )
    : allProducts;
  renderAdminProductList(filtered);
});

// Clear all inventory handler
const clearAllBtn = document.getElementById('clearAllBtn');
if (clearAllBtn) {
  clearAllBtn.addEventListener('click', async () => {
    const count = (await getInventory()).length;
    const typed = prompt(`This will delete ALL ${count} products from the website.\n(A backup copy is kept in the "backups" folder.)\n\nType DELETE to confirm:`);
    if (typed === 'DELETE') {
      await saveInventory([]);
      clearInventoryCache();
      displayProducts([]);
      showStatus('All inventory cleared successfully.', 'success');
    }
  });
}

// Initialize admin dashboard
(async () => {
  try {
    const products = await getInventory(true);
    displayProducts(products);
  } catch (err) {
    console.error('Failed to initialize admin dashboard:', err);
  }
})();
