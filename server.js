const express = require('express');
const cors = require('cors');
const path = require('path');
const { enrichProduct } = require('./enricher');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname)));

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
    for (const item of products) {
      const product = await enrichProduct(String(item.name || '').trim(), item.price);
      enriched.push(product);
    }

    res.json({ products: enriched });
  } catch (err) {
    console.error('Enrich all error:', err.message);
    res.status(500).json({ error: 'Could not enrich products.' });
  }
});

app.listen(PORT, () => {
  console.log(`HI TECH server running at http://localhost:${PORT}`);
  console.log(`Website:  http://localhost:${PORT}/index.html`);
  console.log(`Admin:    http://localhost:${PORT}/admin.html`);
});
