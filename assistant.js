/* AI Shopping Assistant — answers using imported inventory only */

function initShoppingAssistant() {
  if (document.getElementById('aiAssistant')) return;

  document.body.insertAdjacentHTML('beforeend', `
    <div id="aiAssistant" class="ai-assistant">
      <button type="button" class="ai-toggle" id="aiToggle" aria-label="Open shopping assistant">
        <span>🤖</span> Ask AI
      </button>
      <div class="ai-panel" id="aiPanel" hidden>
        <div class="ai-header">
          <div>
            <strong>Shopping Assistant</strong>
            <small>Answers from our live inventory only</small>
          </div>
          <button type="button" class="ai-close" id="aiClose" aria-label="Close">×</button>
        </div>
        <div class="ai-messages" id="aiMessages">
          <div class="ai-msg bot">Hi! I can help you find products from our showroom inventory. Try asking about refrigerators, ACs, or your budget.</div>
        </div>
        <form class="ai-input-row" id="aiForm">
          <input type="text" id="aiInput" placeholder="e.g. refrigerator below ₹30,000" autocomplete="off">
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  `);

  document.getElementById('aiToggle').addEventListener('click', () => {
    const panel = document.getElementById('aiPanel');
    panel.hidden = !panel.hidden;
    if (!panel.hidden) document.getElementById('aiInput').focus();
  });

  document.getElementById('aiClose').addEventListener('click', () => {
    document.getElementById('aiPanel').hidden = true;
  });

  document.getElementById('aiForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('aiInput');
    const q = input.value.trim();
    if (!q) return;
    appendAiMessage(q, 'user');
    input.value = '';
    setTimeout(async () => {
      const answer = await answerFromInventory(q);
      appendAiMessage(answer, 'bot');
    }, 300);
  });
}

function appendAiMessage(text, role) {
  const box = document.getElementById('aiMessages');
  const div = document.createElement('div');
  div.className = `ai-msg ${role}`;
  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

async function answerFromInventory(question) {
  const products = await getInventory();
  if (!products.length) {
    return 'Our inventory is empty right now. Please visit the showroom or check back after products are imported.';
  }

  const q = question.toLowerCase();

  if (/compare|vs|versus|difference between/i.test(q)) {
    return compareProducts(q, products);
  }

  let filtered = [...products];
  const maxPrice = extractBudget(q, 'max');
  const minPrice = extractBudget(q, 'min');
  const category = detectCategoryFromQuestion(q);
  const brand = KNOWN_BRANDS.find(b => q.includes(b.toLowerCase()));

  if (category) filtered = filtered.filter(p => p.category === category);
  if (brand) filtered = filtered.filter(p => (p.brand || '').toLowerCase() === brand.toLowerCase());
  if (maxPrice) filtered = filtered.filter(p => parsePrice(p.price) <= maxPrice);
  if (minPrice) filtered = filtered.filter(p => parsePrice(p.price) >= minPrice);

  if (/biggest|largest|maximum|most capacity/i.test(q)) {
    filtered.sort((a, b) => extractCapacityNumber(b.capacity) - extractCapacityNumber(a.capacity));
  } else if (/cheapest|lowest price|affordable|budget/i.test(q)) {
    filtered.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
  } else if (/small|bedroom|compact|1 ton|1\.0 ton/i.test(q)) {
    if (category === 'ac' || q.includes('ac') || q.includes('air condition')) {
      filtered = filtered.filter(p => p.category === 'ac');
      filtered.sort((a, b) => extractCapacityNumber(a.capacity) - extractCapacityNumber(b.capacity));
    }
  }

  if (!filtered.length) {
    return 'I could not find any matching products in our current inventory. Try a different budget or category, or visit our showroom for more options.';
  }

  const top = filtered.slice(0, 3);
  let reply = `I found ${filtered.length} matching product${filtered.length > 1 ? 's' : ''} in our inventory:\n\n`;

  top.forEach((p, i) => {
    reply += `${i + 1}. ${p.name}\n   Price: ${formatPrice(p.price)}`;
    if (p.capacity) reply += ` | Capacity: ${p.capacity}`;
    reply += '\n';
  });

  if (top.length >= 2 && /compare|vs|difference/i.test(q)) {
    reply += '\n' + explainComparison(top[0], top[1]);
  } else if (top[0]) {
    reply += `\n${shortRecommendation(top[0])}`;
  }

  if (filtered.length > 3) {
    reply += `\n\n+ ${filtered.length - 3} more available. Browse all on the Products page.`;
  }

  return reply.trim();
}

function detectCategoryFromQuestion(q) {
  if (/refrigerat|fridge|ref\b/.test(q)) return 'refrigerator';
  if (/air condition|\bac\b|split ac|inverter ac/.test(q)) return 'ac';
  if (/washing|washer|laundry/.test(q)) return 'washing';
  if (/\btv\b|television|led|smart tv/.test(q)) return 'tv';
  if (/microwave/.test(q)) return 'microwave';
  if (/kitchen|mixer|chimney|purifier/.test(q)) return 'kitchen';
  return null;
}

function extractBudget(q, type) {
  const patterns = type === 'max'
    ? [/below\s*₹?\s*([\d,]+)/i, /under\s*₹?\s*([\d,]+)/i, /max\s*₹?\s*([\d,]+)/i, /budget\s*₹?\s*([\d,]+)/i]
    : [/above\s*₹?\s*([\d,]+)/i, /over\s*₹?\s*([\d,]+)/i, /min\s*₹?\s*([\d,]+)/i];

  for (const pattern of patterns) {
    const m = q.match(pattern);
    if (m) return parseInt(m[1].replace(/,/g, ''), 10);
  }

  const lakh = q.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac)/i);
  if (lakh && type === 'max') return Math.round(parseFloat(lakh[1]) * 100000);

  return null;
}

function compareProducts(q, products) {
  const names = products.filter(p => q.includes(p.name.toLowerCase().slice(0, 12)));
  if (names.length >= 2) return explainComparison(names[0], names[1]);

  const category = detectCategoryFromQuestion(q);
  let pool = category ? products.filter(p => p.category === category) : products;
  if (pool.length < 2) pool = products;
  pool.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
  return `Here's a comparison of two products from our inventory:\n\n${explainComparison(pool[0], pool[1])}`;
}

function explainComparison(a, b) {
  const priceDiff = parsePrice(a.price) - parsePrice(b.price);
  let text = `${a.name} (${formatPrice(a.price)}) vs ${b.name} (${formatPrice(b.price)}):\n`;
  text += priceDiff > 0
    ? `• ${b.name} is ${formatPrice(Math.abs(priceDiff))} cheaper.\n`
    : priceDiff < 0
      ? `• ${a.name} is ${formatPrice(Math.abs(priceDiff))} cheaper.\n`
      : '• Both are priced the same.\n';

  if (a.capacity || b.capacity) {
    text += `• Capacity: ${a.capacity || 'N/A'} vs ${b.capacity || 'N/A'}\n`;
  }
  if (a.energyRating || b.energyRating) {
    text += `• Energy: ${a.energyRating || 'N/A'} vs ${b.energyRating || 'N/A'}\n`;
  }
  text += `\nBoth are available at HI TECH. Visit our showroom to compare in person.`;
  return text;
}

function shortRecommendation(p) {
  return `Recommendation: ${p.name} at ${formatPrice(p.price)} is a great choice${p.capacity ? ` with ${p.capacity} capacity` : ''}. ${p.warranty ? 'Comes with ' + p.warranty.toLowerCase() + '.' : ''}`;
}

document.addEventListener('DOMContentLoaded', () => {
  if (!window.location.pathname.includes('admin')) {
    initShoppingAssistant();
  }
});
