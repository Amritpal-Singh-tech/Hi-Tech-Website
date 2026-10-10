const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { enrichProduct } = require('./enricher');

const app = express();
const PORT = 3000;
const INVENTORY_FILE = path.join(__dirname, 'inventory.json');

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname)));

// Initialize inventory.json if it doesn't exist
function initializeInventory() {
  if (!fs.existsSync(INVENTORY_FILE)) {
    fs.writeFileSync(INVENTORY_FILE, JSON.stringify([], null, 2));
    console.log('Created inventory.json');
  }
}

// Load inventory from file
function loadInventory() {
  try {
    const data = fs.readFileSync(INVENTORY_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading inventory:', err);
    return [];
  }
}

// Keep timestamped copies of inventory.json (at most one per 5 minutes, newest 20 kept)
const BACKUP_DIR = path.join(__dirname, 'backups');
function backupInventory() {
  try {
    if (!fs.existsSync(INVENTORY_FILE) || fs.statSync(INVENTORY_FILE).size < 10) return;
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json')).sort();
    const last = files[files.length - 1];
    if (last && Date.now() - fs.statSync(path.join(BACKUP_DIR, last)).mtimeMs < 5 * 60 * 1000) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(INVENTORY_FILE, path.join(BACKUP_DIR, `inventory-${stamp}.json`));
    files.slice(0, Math.max(0, files.length - 19)).forEach(f => fs.unlinkSync(path.join(BACKUP_DIR, f)));
  } catch (e) {
    console.error('Backup failed:', e.message);
  }
}

// Save inventory to file
function saveInventory(products) {
  try {
    backupInventory();
    fs.writeFileSync(INVENTORY_FILE, JSON.stringify(products, null, 2));
    return true;
  } catch (err) {
    console.error('Error saving inventory:', err);
    return false;
  }
}

// Initialize on startup
initializeInventory();

app.post('/api/enrich-one', async (req, res) => {
  try {
    const { name, price } = req.body;
    if (!name) return res.status(400).json({ error: 'Product name is required.' });

    const product = await enrichProduct(String(name).trim(), price);
    res.json(product);
  } catch (err) {
    console.error('Enrich error:', err.message);
    res.status(500).json({ error: 'Could not enrich product.' });
  }
});

app.post('/api/refresh-product', async (req, res) => {
  try {
    const { name, price } = req.body;
    if (!name) return res.status(400).json({ error: 'Product name is required.' });

    const product = await enrichProduct(String(name).trim(), price);
    res.json(product);
  } catch (err) {
    console.error('Refresh error:', err.message);
    res.status(500).json({ error: 'Could not refresh product.' });
  }
});

app.post('/api/enrich-all', async (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products)) {
      return res.status(400).json({ error: 'Products array is required.' });
    }

    const enriched = [];
    for (let i = 0; i < products.length; i++) {
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      const item = products[i];
      const product = await enrichProduct(String(item.name || '').trim(), item.price);
      enriched.push(product);
    }

    res.json({ products: enriched });
  } catch (err) {
    console.error('Enrich all error:', err.message);
    res.status(500).json({ error: 'Could not enrich products.' });
  }
});

// GET /api/inventory - Load inventory from file
app.get('/api/inventory', (req, res) => {
  try {
    const products = loadInventory();
    res.json({ products });
  } catch (err) {
    console.error('Error loading inventory:', err);
    res.status(500).json({ error: 'Could not load inventory.' });
  }
});

// POST /api/inventory - Save inventory to file
app.post('/api/inventory', (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products)) {
      console.error('Invalid request: products array required');
      return res.status(400).json({ error: 'Products array is required.' });
    }
    const success = saveInventory(products);
    if (success) {
      console.log(`Successfully saved ${products.length} products to inventory.json`);
      res.json({ success: true, count: products.length });
    } else {
      console.error('Failed to save inventory to file');
      res.status(500).json({ error: 'Could not save inventory.' });
    }
  } catch (err) {
    console.error('Error saving inventory:', err);
    res.status(500).json({ error: 'Could not save inventory.' });
  }
});

app.listen(PORT, () => {
  console.log(`HI TECH server running at http://localhost:${PORT}`);
  console.log(`Website:  http://localhost:${PORT}/index.html`);
  console.log(`Admin:    http://localhost:${PORT}/admin.html`);
});
