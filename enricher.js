const cheerio = require('cheerio');

const CATEGORY_IMAGES = {
  ac: 'https://images.unsplash.com/photo-1631545806609-99d586a2cb74?w=800&q=80',
  refrigerator: 'https://images.unsplash.com/photo-1571175443880-49ca94889491?w=800&q=80',
  washing: 'https://images.unsplash.com/photo-1626806819282-2aa113a747f6?w=800&q=80',
  tv: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80',
  microwave: 'https://images.unsplash.com/photo-1585659722983-3f344a2f8a1c?w=800&q=80',
  kitchen: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
  default: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800&q=80'
};

const BRANDS = [
  'LG', 'Samsung', 'Whirlpool', 'Sony', 'Panasonic', 'Haier', 'Godrej',
  'Voltas', 'Daikin', 'Blue Star', 'Hitachi', 'IFB', 'Bosch', 'Siemens',
  'Philips', 'Prestige', 'Bajaj', 'Crompton', 'Havells', 'Mi', 'Realme',
  'OnePlus', 'TCL', 'Hisense', 'Carrier', 'Lloyd', 'Onida', 'Videocon'
];

function detectCategory(name) {
  const n = name.toLowerCase();
  if (/\b(ac|air.?condition|split|inverter.?ac|ton\b)/i.test(n)) return 'ac';
  if (/\b(ref|refrigerat|fridge|freezer)/i.test(n)) return 'refrigerator';
  if (/\b(wash|washing|wm\b|front.?load|top.?load)/i.test(n)) return 'washing';
  if (/\b(tv|television|led|smart.?tv|bravia|oled|qled)/i.test(n)) return 'tv';
  if (/\b(microwave|mw\b|convection|grill.?oven)/i.test(n)) return 'microwave';
  if (/\b(mixer|chimney|purifier|induction|oven|appliance|grinder)/i.test(n)) return 'kitchen';
  return 'default';
}

function detectBrand(name) {
  const upper = name.toUpperCase();
  for (const brand of BRANDS) {
    if (upper.includes(brand.toUpperCase())) return brand;
  }
  return null;
}

function extractCapacity(name, category) {
  const patterns = [
    /(\d+(?:\.\d+)?)\s*(?:ton|tonne|tr\b)/i,
    /(\d+(?:\.\d+)?)\s*(?:l|ltr|litre|liter|litres|liters)\b/i,
    /(\d+(?:\.\d+)?)\s*(?:kg|kgs)\b/i,
    /(\d+(?:\.\d+)?)\s*(?:inch|inches|")\b/i,
    /(\d+)\s*(?:cm)\b/i
  ];

  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      const num = match[1];
      const unit = match[0].replace(num, '').trim().toLowerCase();
      if (/ton/i.test(unit)) return `${num} Ton`;
      if (/l|ltr|litre|liter/i.test(unit)) return `${num} Litres`;
      if (/kg/i.test(unit)) return `${num} kg`;
      if (/inch|"/i.test(unit)) return `${num}"`;
      if (/cm/i.test(unit)) return `${num} cm`;
    }
  }

  if (category === 'ac') return '1.5 Ton';
  if (category === 'refrigerator') return '260 Litres';
  if (category === 'washing') return '7 kg';
  if (category === 'tv') return '55"';
  return 'Standard';
}

function extractFromText(text, patterns, fallback) {
  for (const { regex, format } of patterns) {
    const match = text.match(regex);
    if (match) return format ? format(match) : match[1] || match[0];
  }
  return fallback;
}

function parseSpecsFromText(text, category, name) {
  const combined = `${name} ${text}`.toLowerCase();

  const color = extractFromText(combined, [
    { regex: /\b(silver|stainless steel|grey|gray|black|white|red|blue|gold|graphite|platinum|pearl|maroon|brown|beige)\b/i },
    { regex: /color[:\s]+([a-z\s]+)/i }
  ], category === 'refrigerator' ? 'Silver' : 'Black');

  const energyRating = extractFromText(combined, [
    { regex: /(\d)\s*star\s*(?:bee\s*)?(?:rated?|rating|energy)?/i, format: m => `${m[1]} Star BEE Rating` },
    { regex: /bee\s*(\d)\s*star/i, format: m => `${m[1]} Star BEE Rating` },
    { regex: /energy\s*rating[:\s]*(\d)\s*star/i, format: m => `${m[1]} Star BEE Rating` }
  ], '3 Star BEE Rating');

  const warranty = extractFromText(combined, [
    { regex: /(\d+)\s*(?:year|yr|years)\s*(?:on\s*)?(?:product|comprehensive|overall)/i, format: m => `${m[1]} Years Product Warranty` },
    { regex: /(\d+)\s*(?:year|yr|years)\s*(?:warranty|guarantee)/i, format: m => `${m[1]} Years Warranty` },
    { regex: /warranty[:\s]*(\d+)\s*(?:year|yr)/i, format: m => `${m[1]} Years Warranty` }
  ], '1 Year Product Warranty + 10 Years Compressor Warranty');

  const coolingTech = extractFromText(combined, [
    { regex: /(inverter\s*(?:compressor|technology|linear)?)/i, format: m => m[1].replace(/\b\w/g, c => c.toUpperCase()) },
    { regex: /(dual\s*inverter)/i, format: m => 'Dual Inverter Technology' },
    { regex: /(smart\s*inverter)/i, format: m => 'Smart Inverter Technology' },
    { regex: /(frost\s*free)/i, format: m => 'Frost Free Cooling' },
    { regex: /(direct\s*cool)/i, format: m => 'Direct Cool Technology' },
    { regex: /(turbo\s*cool(?:ing)?)/i, format: m => 'Turbo Cooling Technology' },
    { regex: /(convertible)/i, format: m => 'Convertible Cooling Technology' },
    { regex: /(no\s*frost)/i, format: m => 'No Frost Technology' }
  ], category === 'ac' ? 'Inverter Technology' : category === 'refrigerator' ? 'Smart Inverter Compressor' : 'Advanced Cooling System');

  const featurePatterns = [
    /smart\s*diagnosis/i, /wifi\s*enabled/i, /wi-fi/i, /energy\s*efficient/i,
    /low\s*noise/i, /anti.?bacterial/i, /dehumidif/i, /auto\s*clean/i,
    /stabilizer\s*free/i, /convertible/i, /frost\s*free/i, /direct\s*cool/i,
    /digital\s*inverter/i, /quick\s*freeze/i, /multi\s*air\s*flow/i,
    /led\s*display/i, /touch\s*control/i, /child\s*lock/i, /turbo\s*mode/i,
    /sleep\s*mode/i, /eco\s*mode/i, /4k\s*ultra\s*hd/i, /smart\s*tv/i,
    /voice\s*control/i, /steam\s*wash/i, /in.?built\s*heater/i
  ];

  const features = [];
  for (const pattern of featurePatterns) {
    const match = combined.match(pattern);
    if (match) {
      const label = match[0].replace(/\s+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      if (!features.includes(label)) features.push(label);
    }
  }

  const defaultFeatures = {
    ac: ['Energy Efficient Inverter', 'Low Noise Operation', 'Auto Restart', 'Anti-Bacterial Filter'],
    refrigerator: ['Frost Free Operation', 'Multi Air Flow Cooling', 'Stabilizer Free Operation', 'Smart Diagnosis'],
    washing: ['Multiple Wash Programs', 'Energy Efficient Motor', 'Child Lock', 'Quick Wash Mode'],
    tv: ['Full HD / 4K Display', 'Smart TV Features', 'Multiple HDMI Ports', 'Low Power Consumption'],
    microwave: ['Auto Cook Menus', 'Touch Control Panel', 'Child Lock', 'Timer Function'],
    kitchen: ['Durable Build Quality', 'Easy to Clean', 'Energy Efficient', 'Compact Design'],
    default: ['Premium Build Quality', 'Energy Efficient', 'Reliable Performance', 'Easy Maintenance']
  };

  const merged = [...features];
  for (const f of (defaultFeatures[category] || defaultFeatures.default)) {
    if (merged.length >= 5) break;
    if (!merged.some(m => m.toLowerCase().includes(f.toLowerCase().split(' ')[0]))) {
      merged.push(f);
    }
  }

  return { color, energyRating, warranty, coolingTechnology: coolingTech, features: merged.slice(0, 5) };
}

function buildDescription(product) {
  const { name, brand, capacity, color, features, energyRating, warranty, coolingTechnology, category } = product;
  const brandLine = brand && !name.toUpperCase().startsWith(brand.toUpperCase())
    ? `${brand}'s`
    : brand || 'This premium';
  const categoryNames = {
    ac: 'air conditioner',
    refrigerator: 'refrigerator',
    washing: 'washing machine',
    tv: 'LED TV',
    microwave: 'microwave oven',
    kitchen: 'kitchen appliance',
    default: 'home appliance'
  };
  const catName = categoryNames[category] || 'appliance';
  const featureList = features.slice(0, 4).join(', ');

  return `${brandLine} ${name} is a beautifully engineered ${catName} designed for modern Indian homes. ` +
    `With a generous ${capacity} capacity finished in an elegant ${color.toLowerCase()} exterior, ` +
    `it delivers outstanding performance day after day. ` +
    `Powered by ${coolingTechnology}, this model ensures efficient operation while keeping energy bills in check — ` +
    `backed by a ${energyRating.toLowerCase()}. ` +
    `Standout features include ${featureList}, making it a smart choice for families who value quality and reliability. ` +
    `Enjoy complete peace of mind with ${warranty.toLowerCase()}. ` +
    `Available now at HI TECH REFRIGERATION & ELECTRONICS — visit our showroom to experience it firsthand.`;
}

async function fetchWithTimeout(url, options = {}, timeout = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-IN,en;q=0.9',
        ...(options.headers || {})
      }
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function searchWeb(query) {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return '';

    const html = await res.text();
    const $ = cheerio.load(html);
    const snippets = [];

    $('.result__snippet, .result__body').each((_, el) => {
      const text = $(el).text().trim();
      if (text) snippets.push(text);
    });

    return snippets.join(' ').slice(0, 3000);
  } catch {
    return '';
  }
}

async function getDuckDuckGoVqd(query) {
  try {
    const res = await fetchWithTimeout(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`);
    const html = await res.text();
    const match = html.match(/vqd=["']([^"']+)["']/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

async function searchImage(query, category) {
  const searches = [
    `${query} product image official`,
    `${query} flipkart`,
    `${query} amazon india appliance`,
    `${query.split(' ').slice(0, 4).join(' ')} ${category} appliance`
  ];

  for (const search of searches) {
    try {
      const vqd = await getDuckDuckGoVqd(search);
      if (!vqd) continue;

      const imgUrl = `https://duckduckgo.com/i.js?l=in-en&o=json&q=${encodeURIComponent(search)}&vqd=${vqd}`;
      const res = await fetchWithTimeout(imgUrl, {
        headers: { Referer: 'https://duckduckgo.com/' }
      });

      if (!res.ok) continue;
      const data = await res.json();

      if (data.results && data.results.length) {
        for (const result of data.results.slice(0, 5)) {
          const src = result.image || result.thumbnail;
          if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon')) {
            return src;
          }
        }
      }
    } catch {
      continue;
    }
  }

  return CATEGORY_IMAGES[category] || CATEGORY_IMAGES.default;
}

async function enrichProduct(name, price) {
  const category = detectCategory(name);
  const brand = detectBrand(name);
  const capacity = extractCapacity(name, category);

  const searchQuery = brand
    ? `${brand} ${name} specifications features warranty india`
    : `${name} specifications features warranty india`;

  const webText = await searchWeb(searchQuery);
  const specs = parseSpecsFromText(webText, category, name);
  const image = await searchImage(name, category);

  const product = {
    name,
    price,
    brand: brand || '',
    category,
    image,
    capacity,
    color: specs.color,
    features: specs.features,
    energyRating: specs.energyRating,
    warranty: specs.warranty,
    coolingTechnology: specs.coolingTechnology,
    description: '',
    enrichedAt: new Date().toISOString()
  };

  product.description = buildDescription(product);
  return product;
}

module.exports = { enrichProduct, detectCategory, CATEGORY_IMAGES };
