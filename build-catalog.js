/*
 * build-catalog.js — one-time, resumable catalog builder
 *
 * 1. Merges Export_Items_CLEANED.csv into inventory.json (brand / category / capacity / missing products)
 * 2. Attaches any photos YOU placed manually in /images (see missing-images.txt for exact file names)
 * 3. Finds a real product photo for each remaining item, downloads it into /images
 * 4. Saves inventory.json after EVERY product, so you can stop and re-run any time
 *
 * Usage (run from the project folder, with the server stopped):
 *   SERPER_KEY=xxx node build-catalog.js --limit=400              (Mac/Linux, Serper.dev - no card)
 *   GOOGLE_KEY=xxx GOOGLE_CX=yyy node build-catalog.js            (alternative: Google)
 *
 * Options:
 *   --limit=90     max searches this run (use --limit=400 with Serper)
 *   --retry        also retry products that failed on an earlier run
 *   --approx       last-resort search by brand + capacity + type only; the photo may show a
 *                  similar model, so those products are flagged imageApprox:true for you to review
 *   --merge-only   only merge the CSV, no image search (no keys needed)
 *   --skip-csv     do not touch products from the CSV (use this from now on, so products you
 *                  edited or deleted in the admin page are not changed back)
 *
 * Needs Node 18+. No npm packages required.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const INVENTORY = path.join(ROOT, 'inventory.json');
const BACKUP = path.join(ROOT, 'inventory.backup.json');
const CSV_FILE = path.join(ROOT, 'Export_Items_CLEANED.csv');
const IMG_DIR = path.join(ROOT, 'images');
const MISSING_FILE = path.join(ROOT, 'missing-images.txt');

const SERPER_KEY = process.env.SERPER_KEY;
const KEY = process.env.GOOGLE_KEY;
const CX = process.env.GOOGLE_CX;
const args = process.argv.slice(2);
const LIMIT = Number((args.find(a => a.startsWith('--limit=')) || '--limit=90').split('=')[1]);
const RETRY = args.includes('--retry');
const APPROX = args.includes('--approx');
const MERGE_ONLY = args.includes('--merge-only');
const SKIP_CSV = args.includes('--skip-csv');

const CATEGORY_WORD = {
  ac: 'air conditioner', refrigerator: 'refrigerator', washing: 'washing machine',
  tv: 'led tv', microwave: 'microwave oven', geyser: 'water heater',
  battery: 'inverter battery', cooler: 'water cooler', audio: 'soundbar'
};

// CSV category -> category key the website understands (see CATEGORY_LABELS in inventory.js)
const CATEGORY_MAP = {
  water_cooler: 'cooler', speaker: 'audio', ups: 'battery',
  iron: 'kitchen', fan: 'kitchen', stabilizer: 'kitchen'
};

function parseCsv(text) {
  text = text.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(x => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); if (row.some(x => x.trim())) rows.push(row); }
  const head = rows.shift().map(h => h.trim());
  return rows.map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
}

function saveInventory(products) {
  const tmp = INVENTORY + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(products, null, 2));
  fs.renameSync(tmp, INVENTORY); // atomic: never leaves a half-written file
}

function okUrl(url) {
  if (!/^https?:\/\//i.test(url || '')) return false;
  const u = url.toLowerCase();
  return !['logo', 'favicon', 'sprite', 'placeholder', 'avatar', '.svg', '.gif', 'data:image']
    .some(bad => u.includes(bad));
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
}

// The file name (without extension) this product's photo must have in /images
function imgBase(p) {
  return slug(p.name) + '-' + crypto.createHash('md5').update(p.name).digest('hex').slice(0, 6);
}

// ---- query building -------------------------------------------------------
const SPEC_LIKE = /^\d+(\.\d+)?(t|k|kg|l|ltr|ton|star|s|w|v)$/i; // 1.5T, 18K, 3STAR ...
const HSN_CODE = /\b8[45]\d{2}\b/g;                                // 8415, 8418 ... (tax codes, not model numbers)

function cleanName(p) {
  return p.name.replace(/[^\w\s.-]/g, ' ').replace(HSN_CODE, ' ').replace(/\s+/g, ' ').trim();
}

// Likely model numbers: tokens mixing letters and digits, e.g. SR163ATS, MS-GS18VF-DA1
function modelTokens(p) {
  const brand = (p.brand || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const prefix = brand ? new RegExp('^' + brand + '-', 'i') : null;
  return cleanName(p).split(/\s+/)
    .map(t => (prefix ? t.replace(prefix, '') : t))
    .filter(t => t.length >= 5 && /[a-z]/i.test(t) && /\d/.test(t) && !SPEC_LIKE.test(t))
    .slice(0, 2);
}

function buildQueries(p) {
  const word = CATEGORY_WORD[p.category] || '';
  const brand = p.brand || '';
  const name = cleanName(p);
  const prefixBrand = brand && !name.toLowerCase().includes(brand.toLowerCase()) ? brand + ' ' : '';
  const core = (prefixBrand + name).split(' ').slice(0, 10).join(' ');
  const tidy = s => s.replace(/\s+/g, ' ').trim();

  const qs = [tidy(word && !core.toLowerCase().includes(word) ? `${core} ${word}` : core)];
  const toks = modelTokens(p);
  if (toks.length) qs.push(tidy(`${brand} ${toks.join(' ')} ${word}`));        // brand + model number only
  if (APPROX) qs.push(tidy(`${brand} ${p.capacity || ''} ${word}`));           // brand + size + type only
  return [...new Set(qs)];
}

// ---- search providers -----------------------------------------------------
// Each returns [{ url, thumb }]
async function searchImages(query) {
  if (SERPER_KEY) {
    const res = await fetch('https://google.serper.dev/images', {
      method: 'POST',
      headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: 10, gl: 'in' }),
      signal: AbortSignal.timeout(10000)
    });
    if ([400, 401, 402, 403, 429].includes(res.status)) {
      const e = new Error('Serper refused the request (out of credits, or wrong key): ' +
        (await res.text()).slice(0, 200));
      e.stop = true;
      throw e;
    }
    if (!res.ok) throw new Error('Serper HTTP ' + res.status);
    const data = await res.json();
    return (data.images || []).map(i => ({ url: i.imageUrl, thumb: i.thumbnailUrl })).filter(c => okUrl(c.url));
  }
  const url = 'https://www.googleapis.com/customsearch/v1' +
    `?key=${KEY}&cx=${CX}&searchType=image&num=10&imgSize=large&safe=active&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (res.status === 403 || res.status === 429) {
    const e = new Error('Google refused the request (daily quota used up, or key/CX is wrong): ' +
      (await res.text()).slice(0, 200));
    e.stop = true;
    throw e;
  }
  if (!res.ok) throw new Error('Google HTTP ' + res.status);
  const data = await res.json();
  return (data.items || []).map(i => ({ url: i.link, thumb: i.image && i.image.thumbnailLink })).filter(c => okUrl(c.url));
}

async function download(url, baseName, minBytes = 5000) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const type = (res.headers.get('content-type') || '').split(';')[0].trim();
    const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[type];
    if (!res.ok || !ext) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < minBytes || buf.length > 5e6) return null; // skip tiny icons / huge files
    fs.writeFileSync(path.join(IMG_DIR, baseName + ext), buf);
    return 'images/' + baseName + ext;
  } catch {
    return null;
  }
}

function writeMissingList(products) {
  const missing = products.filter(p => p.imageSource !== 'local');
  if (!missing.length) {
    if (fs.existsSync(MISSING_FILE)) fs.unlinkSync(MISSING_FILE);
    return 0;
  }
  const lines = [
    'Products still without a real photo.',
    'To fix one by hand: save a photo in the images folder using the file name on the left',
    '(.jpg, .png or .webp), then run:  node build-catalog.js --merge-only',
    ''
  ].concat(missing.map(p => `${imgBase(p)}.jpg   <-   ${p.name}`));
  fs.writeFileSync(MISSING_FILE, lines.join('\n'));
  return missing.length;
}

(async () => {
  if (!fs.existsSync(INVENTORY)) { console.error('inventory.json not found in ' + ROOT); process.exit(1); }
  if (!fs.existsSync(BACKUP)) fs.copyFileSync(INVENTORY, BACKUP);
  fs.mkdirSync(IMG_DIR, { recursive: true });

  const products = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));

  // ---- Step 1: merge the cleaned CSV ----
  if (!SKIP_CSV && fs.existsSync(CSV_FILE)) {
    const byName = new Map(products.map(p => [p.name.trim().toLowerCase(), p]));
    let added = 0, updated = 0;
    for (const r of parseCsv(fs.readFileSync(CSV_FILE, 'utf8'))) {
      const name = r['Product Name'];
      if (!name) continue;
      let p = byName.get(name.toLowerCase());
      if (!p) {
        p = { id: 'p_' + crypto.randomBytes(5).toString('hex'), name, price: 0, enrichedAt: new Date().toISOString() };
        products.push(p); byName.set(name.toLowerCase(), p); added++;
      } else updated++;
      if (!p.price) p.price = Number(r.Price) || 0;
      if (r.Brand) p.brand = r.Brand;
      if (r.Category) p.category = CATEGORY_MAP[r.Category.toLowerCase()] || r.Category.toLowerCase();
      if (r.Capacity) p.capacity = r.Capacity;
    }
    console.log(`CSV merged: ${updated} matched, ${added} new products added.`);
  } else {
    console.log(SKIP_CSV ? 'CSV merge skipped (--skip-csv).' : 'Export_Items_CLEANED.csv not found - skipping merge.');
  }

  // ---- Step 2: attach photos you saved by hand in /images ----
  const filesOnDisk = fs.readdirSync(IMG_DIR);
  let attached = 0;
  for (const p of products) {
    if (p.imageSource === 'local') continue;
    const f = filesOnDisk.find(n => n.startsWith(imgBase(p) + '.'));
    if (f) { p.image = 'images/' + f; p.imageSource = 'local'; delete p.imageTried; attached++; }
  }
  if (attached) console.log(`${attached} photos found in /images and attached.`);
  saveInventory(products);

  if (MERGE_ONLY) {
    const left = writeMissingList(products);
    console.log(`Merge-only mode: done. ${left} products still without a real photo.`);
    return;
  }

  if (!SERPER_KEY && (!KEY || !CX)) {
    console.error('\nSet SERPER_KEY (or GOOGLE_KEY and GOOGLE_CX) first - see the top of this file.');
    process.exit(1);
  }

  // ---- Step 3: find + download images ----
  const todo = products.filter(p => p.imageSource !== 'local' && (RETRY || !p.imageTried));
  console.log(`${todo.length} products still need images. Using up to ${LIMIT} searches this run.\n`);

  let searches = 0, found = 0, failed = 0, stopped = false;
  for (const p of todo) {
    if (searches >= LIMIT) break;
    const base = imgBase(p);
    const queries = buildQueries(p);
    let saved = null, usedTier = -1, lowRes = false;
    const thumbs = [];

    for (let t = 0; t < queries.length && !saved; t++) {
      if (searches >= LIMIT) break;
      searches++;
      let cands = [];
      try {
        cands = await searchImages(queries[t]);
      } catch (err) {
        if (err.stop) { console.error('\nStopping: ' + err.message); stopped = true; break; }
        console.log(`[${searches}] search error: ${err.message}`);
        continue;
      }
      for (const c of cands) {
        saved = await download(c.url, base);
        if (saved) { usedTier = t; break; }
      }
      if (!saved) thumbs.push(...cands.map(c => c.thumb).filter(Boolean));
    }
    if (stopped) break;

    // Backup: full-size downloads were blocked, so use the small search-engine thumbnail
    if (!saved) {
      for (const th of thumbs.slice(0, 3)) {
        saved = await download(th, base, 1500);
        if (saved) { lowRes = true; break; }
      }
    }

    if (saved) {
      p.image = saved; p.imageSource = 'local'; delete p.imageTried; found++;
      if (lowRes) p.imageLowRes = true; else delete p.imageLowRes;
      if (APPROX && usedTier === 2) p.imageApprox = true; else delete p.imageApprox;
      console.log(`[${searches}] OK${lowRes ? ' (small)' : usedTier === 2 ? ' (approx)' : ''}  ${p.name}`);
    } else {
      p.imageTried = true; failed++;
      console.log(`[${searches}] none  ${p.name}`);
    }
    saveInventory(products); // save after every product so nothing is lost
    await new Promise(r => setTimeout(r, 300));
  }

  const remaining = writeMissingList(products);
  console.log(`\nThis run: ${found} images saved, ${failed} not found.`);
  console.log(`Total with real images: ${products.length - remaining} of ${products.length}.`);
  if (remaining) {
    console.log(`${remaining} products still have no photo. They are listed in missing-images.txt.`);
    if (!APPROX) console.log('Next try:  node build-catalog.js --retry --approx --limit=400');
  } else {
    console.log('All products have real photos.');
  }
})();
