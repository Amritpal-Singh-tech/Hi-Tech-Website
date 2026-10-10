# HI TECH Refrigeration & Electronics

Website and inventory manager for a home-appliance showroom. Customers can browse products by category, brand and price, and ask a built-in shopping assistant for suggestions. The owner manages products from a local admin page.

## Features

- **Storefront:** home, products, brands, about and contact pages
- **Product search and filters:** by name, category, brand, price range and sort order
- **Shopping assistant:** answers questions such as "refrigerator below 30000" using only the products in the inventory (rule-based, not an online AI service)
- **Dark mode**, mobile-friendly layout, and WhatsApp / call buttons
- **Admin page:** import products from Excel or CSV, edit, delete, and view inventory statistics
- **Catalog builder script:** finds and downloads a real photo for each product

## Project structure

| Path | Purpose |
|---|---|
| `index.html`, `products.html`, `brands.html`, `about.html`, `contact.html` | Public pages |
| `styles.css`, `components.css` | Site styling |
| `shared.js` | Navigation, footer, theme and page loader shared by all pages |
| `inventory.js` | Loads the product data and handles categories, brands and cards |
| `filters.js` | Product search and filtering |
| `assistant.js` | Shopping assistant |
| `inventory.json` | **The product data** (all products, prices and details) |
| `images/` | Product photos |
| `admin.html`, `admin.js`, `admin.css` | Admin page (use it on your own computer) |
| `server.js`, `enricher.js` | Local Node server that saves inventory and looks up product details |
| `build-catalog.js` | One-time and resumable script that downloads product photos |

## Run it on your computer

Requires **Node.js 18 or newer**.

```bash
cd HI-TECH
npm install        # first time only
node server.js
```

Then open:

- Website: http://localhost:3000/index.html
- Admin: http://localhost:3000/admin.html

The server saves every change to `inventory.json`. It also keeps timestamped backups in a `backups/` folder, at most one every 5 minutes, newest 20 kept. To undo a mistake, copy the newest backup over `inventory.json`.

## Managing products

### Add or update products
1. Open the admin page.
2. Click **Import Inventory** and choose an Excel or CSV file with the columns **Product Name** and **Price**.
3. The import only **adds new products**. Products already in the inventory keep their photos and details, and only their prices are updated.
4. Choose **Fast Import** when asked. New products appear immediately with a category photo.

### Get real product photos
Stop the server, then run the catalog builder. It needs a free API key from [Serper.dev](https://serper.dev) (or a Google Custom Search key and engine ID).

```bash
# Mac / Linux
SERPER_KEY=your_key node build-catalog.js --skip-csv --limit=400

# Windows PowerShell
$env:SERPER_KEY="your_key"; node build-catalog.js --skip-csv --limit=400
```

| Option | Meaning |
|---|---|
| `--limit=N` | Maximum searches in this run |
| `--retry` | Try products that failed before |
| `--approx` | Last resort: search by brand, size and type only. The photo may show a similar model, and these products are flagged `imageApprox` |
| `--skip-csv` | Do not re-apply the original CSV, so edits and deletions made in the admin page stay as they are |
| `--merge-only` | Merge the CSV and attach photos you added by hand, without searching |

Products still without a photo are listed in `missing-images.txt`, with the exact file name to save a photo under in `images/`.

**Never write an API key into a file or commit it to GitHub.** Pass it on the command line as shown above.

## Deploy the website (free, static)

The public site is a static site. Free hosts such as Cloudflare Pages or Netlify can publish it straight from this repository. If there is no Node server, `inventory.js` reads `inventory.json` directly.

**Settings on the host:**
- Build command: *(leave empty)*
- Output / publish directory: `/` (or `.`)

**Update the live site:**
1. Make your changes locally with the admin page and `build-catalog.js`.
2. Commit and push `inventory.json` and `images/` (GitHub Desktop: **Commit to main**, then **Push origin**).
3. The host rebuilds automatically, usually within a minute.

The admin page works only on your own computer. On the live site it cannot change the catalog.

## Before going live

- Replace the placeholder shop details (`123 Main Market Road, Your City`, `+91 98765 43210`, `info@hitech-electronics.com`). They appear in `shared.js`, `index.html`, `contact.html` and `about.html`.
- The contact form only shows a thank-you popup and sends nothing. Customers should use the WhatsApp and Call buttons, or connect a form service.
- Keep private files out of the repository. The included `.gitignore` excludes `*.csv`, `backups/`, `.env` and other temporary files.

## Troubleshooting

| Problem | Fix |
|---|---|
| Live site shows no products | Make sure `inventory.json` and the latest `inventory.js` are pushed, then hard-refresh with Cmd/Ctrl + Shift + R |
| Photos are missing on the live site | Push the `images/` folder |
| Lost products after a bad import | Copy the newest file in `backups/` over `inventory.json` |
| `build-catalog.js` says it cannot find the module | Run the command from inside the project folder |
| Image search stops with "refused the request" | The daily quota or credits are used up, or the key is wrong. Run it again later or check the key |

## Tech stack

HTML, CSS and vanilla JavaScript on the front end. Node.js with Express on the local server. SheetJS for reading Excel files in the admin page.
