const cheerio = require('cheerio');

const CATEGORY_IMAGES = {
  ac: 'https://images.unsplash.com/photo-1631545806609-99d586a2cb74?w=800&q=80',
  refrigerator: 'https://images.unsplash.com/photo-1571175443880-49ca94889491?w=800&q=80',
  washing: 'https://images.unsplash.com/photo-1626806819282-2aa113a747f6?w=800&q=80',
  tv: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80',
  microwave: 'https://images.unsplash.com/photo-1585659722983-3f344a2f8a1c?w=800&q=80',
  kitchen: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
  geyser: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800&q=80',
  battery: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&q=80',
  cooler: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4e?w=800&q=80',
  audio: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80',
  default: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&q=80'
};

const CATEGORY_POOLS = {
  ac: [
    'https://images.unsplash.com/photo-1631545806609-99d586a2cb74?w=800&q=80',
    'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800&q=80',
    'https://images.unsplash.com/photo-1614633833026-062035532567?w=800&q=80'
  ],
  refrigerator: [
    'https://images.unsplash.com/photo-1571175443880-49ca94889491?w=800&q=80',
    'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=800&q=80',
    'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=800&q=80'
  ],
  washing: [
    'https://images.unsplash.com/photo-1626806819282-2aa113a747f6?w=800&q=80',
    'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=800&q=80',
    'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=800&q=80'
  ],
  tv: [
    'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80',
    'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=800&q=80',
    'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=800&q=80'
  ],
  microwave: [
    'https://images.unsplash.com/photo-1585659722983-3f344a2f8a1c?w=800&q=80',
    'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=800&q=80'
  ],
  kitchen: [
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
    'https://images.unsplash.com/photo-1578643463396-0997cb5328c1?w=800&q=80',
    'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=800&q=80'
  ],
  geyser: [
    'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800&q=80'
  ],
  battery: [
    'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&q=80'
  ],
  cooler: [
    'https://images.unsplash.com/photo-1548839140-29a749e1cf4e?w=800&q=80'
  ],
  audio: [
    'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80'
  ],
  default: [
    'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&q=80'
  ]
};

const BRANDS = [
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

function detectBrand(name) {
  if (!name) return null;
  const str = String(name);
  for (const alias of BRAND_ALIASES) {
    if (alias.match.test(str)) return alias.name;
  }
  for (const brand of BRANDS) {
    const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i');
    if (regex.test(str)) return brand;
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

  const defaultEnergy = category === 'kitchen' ? '750W Heavy Duty' :
    category === 'microwave' ? 'Energy Efficient' :
    category === 'tv' ? 'Smart Power Saving' : '3 Star BEE Rating';

  const energyRating = extractFromText(combined, [
    { regex: /(\d)\s*star\s*(?:bee\s*)?(?:rated?|rating|energy)?/i, format: m => `${m[1]} Star BEE Rating` },
    { regex: /bee\s*(\d)\s*star/i, format: m => `${m[1]} Star BEE Rating` },
    { regex: /energy\s*rating[:\s]*(\d)\s*star/i, format: m => `${m[1]} Star BEE Rating` },
    { regex: /(\d+)\s*(?:watt|w)\b/i, format: m => `${m[1]}W Power` }
  ], defaultEnergy);

  const defaultWarranty = category === 'ac' ? '1 Year Comprehensive + 10 Years Compressor Warranty' :
    category === 'refrigerator' ? '1 Year Product + 10 Years Compressor Warranty' :
    category === 'washing' ? '2 Years Comprehensive + 10 Years Motor Warranty' :
    category === 'tv' ? '1 Year Comprehensive + 1 Year Panel Warranty' :
    category === 'kitchen' ? '2 Years Product Warranty + 5 Years Motor Warranty' :
    '1 Year Manufacturer Warranty';

  const warranty = extractFromText(combined, [
    { regex: /(\d+)\s*(?:year|yr|years)\s*(?:on\s*)?(?:product|comprehensive|overall)/i, format: m => `${m[1]} Years Product Warranty` },
    { regex: /(\d+)\s*(?:year|yr|years)\s*(?:warranty|guarantee)/i, format: m => `${m[1]} Years Warranty` },
    { regex: /warranty[:\s]*(\d+)\s*(?:year|yr)/i, format: m => `${m[1]} Years Warranty` }
  ], defaultWarranty);

  const defaultTech = {
    ac: 'Inverter Cooling Technology',
    refrigerator: 'Smart Inverter Compressor',
    washing: 'Smart Inverter Motor',
    tv: '4K HDR Picture Processing Engine',
    microwave: 'Multi-Stage Inverter Heating',
    kitchen: 'Heavy-Duty Copper Motor',
    default: 'Advanced Performance System'
  };

  const coolingTech = extractFromText(combined, [
    { regex: /(inverter\s*(?:compressor|technology|linear|motor)?)/i, format: m => m[1].replace(/\b\w/g, c => c.toUpperCase()) },
    { regex: /(dual\s*inverter)/i, format: m => 'Dual Inverter Technology' },
    { regex: /(smart\s*inverter)/i, format: m => 'Smart Inverter Technology' },
    { regex: /(frost\s*free)/i, format: m => 'Frost Free Cooling' },
    { regex: /(direct\s*cool)/i, format: m => 'Direct Cool Technology' },
    { regex: /(turbo\s*cool(?:ing)?)/i, format: m => 'Turbo Cooling Technology' },
    { regex: /(convertible)/i, format: m => 'Convertible Cooling Technology' },
    { regex: /(4k\s*hdr|picture\s*processor|dolby\s*vision)/i, format: m => '4K HDR Picture Processor' },
    { regex: /(copper\s*motor|tri.?action\s*blades)/i, format: m => 'High-Torque Copper Motor' },
    { regex: /(no\s*frost)/i, format: m => 'No Frost Technology' }
  ], defaultTech[category] || defaultTech.default);

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
  const displayName = brand && !name.toLowerCase().startsWith(brand.toLowerCase())
    ? `${brand} ${name}`
    : name;

  const categoryNames = {
    ac: 'air conditioner',
    refrigerator: 'refrigerator',
    washing: 'washing machine',
    tv: 'Smart TV',
    microwave: 'microwave oven',
    kitchen: 'kitchen appliance',
    default: 'home appliance'
  };
  const catName = categoryNames[category] || 'appliance';
  const featureList = features.slice(0, 4).join(', ');

  let techSentence = `Powered by ${coolingTechnology}, this model ensures reliable day-to-day operation while keeping energy efficiency in check — backed by a ${energyRating.toLowerCase()}.`;
  if (category === 'tv') {
    techSentence = `Powered by ${coolingTechnology}, this TV delivers vivid colors, deep contrast, and exceptional detail for family entertainment.`;
  } else if (category === 'kitchen') {
    techSentence = `Equipped with ${coolingTechnology}, it handles daily kitchen tasks with power and precision.`;
  }

  return `${displayName} is a beautifully engineered ${catName} designed for modern Indian homes. ` +
    `With a generous ${capacity} capacity finished in an elegant ${color.toLowerCase()} exterior, ` +
    `it delivers outstanding performance day after day. ` +
    `${techSentence} ` +
    `Standout features include ${featureList}, making it a smart choice for families who value quality and durability. ` +
    `Enjoy complete peace of mind with ${warranty.toLowerCase()}. ` +
    `Available now at HI TECH REFRIGERATION & ELECTRONICS — visit our showroom to experience it firsthand.`;
}

let cachedVqd = null;
let cachedVqdExpiresAt = 0;
let ddgBlockedUntil = 0;

const BRAND_CATEGORY_IMAGES = {
  'lg-refrigerator': 'https://images.unsplash.com/photo-1571175443880-49ca94889491?w=800&q=80',
  'samsung-ac': 'https://images.unsplash.com/photo-1631545806609-99d586a2cb74?w=800&q=80',
  'whirlpool-washing': 'https://images.unsplash.com/photo-1626806819282-2aa113a747f6?w=800&q=80',
  'sony-tv': 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80',
  'ifb-microwave': 'https://images.unsplash.com/photo-1585659722983-3f344a2f8a1c?w=800&q=80',
  'philips-kitchen': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
  'daikin-ac': 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800&q=80',
  'haier-refrigerator': 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=800&q=80',
  'bosch-washing': 'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=800&q=80'
};

async function fetchWithTimeout(url, options = {}, timeout = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-IN,en;q=0.9',
        ...(options.headers || {})
      }
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
  const lower = url.toLowerCase();
  const badPatterns = [
    'logo', 'icon', 'badge', 'banner', 'sprite', 'placeholder',
    'avatar', 'favicon', '.svg', '.gif', 'data:image', 'pixel', 'spinner',
    'rating', 'star', 'button', 'arrow', 'blank'
  ];
  return !badPatterns.some(p => lower.includes(p));
}

function getCategoryFallbackImage(name, category, brand = '') {
  if (brand) {
    const key = `${brand.toLowerCase()}-${category}`;
    if (BRAND_CATEGORY_IMAGES[key]) {
      return BRAND_CATEGORY_IMAGES[key];
    }
  }

  const pool = CATEGORY_POOLS[category] || CATEGORY_POOLS.default;
  if (!pool || !pool.length) return CATEGORY_IMAGES[category] || CATEGORY_IMAGES.default;
  let hash = 0;
  const str = String(name || '');
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % pool.length;
  return pool[index];
}

async function searchWeb(query) {
  if (Date.now() < ddgBlockedUntil) return '';
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetchWithTimeout(url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    }, 4000);
    if (!res.ok) return '';

    const html = await res.text();
    const $ = cheerio.load(html);
    const snippets = [];

    $('.result__snippet, .result__body').each((_, el) => {
      const text = $(el).text().trim();
      if (text) snippets.push(text);
    });

    return snippets.join(' ').slice(0, 3000);
  } catch (err) {
    if (err.code === 'ECONNRESET' || err.message?.includes('fetch failed')) {
      ddgBlockedUntil = Date.now() + 60 * 1000;
    }
    return '';
  }
}

async function getDuckDuckGoVqd(query) {
  if (Date.now() < ddgBlockedUntil) return null;

  // Reuse valid cached token (valid ~10 mins) to prevent rate limits
  if (cachedVqd && Date.now() < cachedVqdExpiresAt) {
    return cachedVqd;
  }

  const urls = [
    `https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=images&iax=images`,
    `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
  ];

  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(url, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      }, 3500);

      if (!res.ok) continue;
      const html = await res.text();

      const match =
        html.match(/vqd=["']([^"']+)["']/) ||
        html.match(/vqd=([0-9-_]+)/) ||
        html.match(/data-vqd=["']([^"']+)["']/) ||
        html.match(/"vqd"\s*:\s*"([^"]+)"/) ||
        html.match(/vqd\s*[:=]\s*['"]?([^'"&\s;]+)/);

      if (match && match[1]) {
        cachedVqd = match[1];
        cachedVqdExpiresAt = Date.now() + 10 * 60 * 1000;
        return cachedVqd;
      }
    } catch (err) {
      if (err.code === 'ECONNRESET' || err.message?.includes('fetch failed')) {
        ddgBlockedUntil = Date.now() + 60 * 1000;
        return null;
      }
      continue;
    }
  }

  return null;
}

async function searchImage(query, category, brand = '') {
  const cleanName = query.replace(/[^\w\s.-]/g, ' ').replace(/\s+/g, ' ').trim();
  const brandPrefix = (brand && !cleanName.toLowerCase().includes(brand.toLowerCase())) ? `${brand} ` : '';
  const searches = [
    `${brandPrefix}${cleanName} appliance white background`,
    `${brandPrefix}${cleanName} product photo`
  ];

  // 1. DuckDuckGo photo search with circuit breaker
  if (Date.now() >= ddgBlockedUntil) {
    for (const search of searches) {
      try {
        const vqd = await getDuckDuckGoVqd(search);
        if (!vqd) break;

        const imgUrl = `https://duckduckgo.com/i.js?l=in-en&o=json&q=${encodeURIComponent(search)}&vqd=${vqd}&f=,,,type:photo,,&p=1`;
        const res = await fetchWithTimeout(imgUrl, {
          headers: {
            'Referer': 'https://duckduckgo.com/',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin'
          }
        }, 3500);

        if (!res.ok) {
          if (res.status === 403 || res.status === 429) {
            ddgBlockedUntil = Date.now() + 2 * 60 * 1000;
          }
          continue;
        }

        const text = await res.text();
        if (!text.startsWith('{') && !text.startsWith('[')) {
          if (text.includes('error persists') || text.includes('ops@duckduckgo.com')) {
            ddgBlockedUntil = Date.now() + 2 * 60 * 1000;
          }
          break;
        }

        const data = JSON.parse(text);
        if (data.results && data.results.length) {
          for (const result of data.results.slice(0, 8)) {
            const src = result.image || result.thumbnail;
            if (src && isValidImageUrl(src)) {
              return src;
            }
          }
        }
      } catch (err) {
        if (err.code === 'ECONNRESET' || err.message?.includes('fetch failed')) {
          ddgBlockedUntil = Date.now() + 60 * 1000;
          break;
        }
        continue;
      }
    }
  }

  // 2. High-quality brand & category photo fallback
  return getCategoryFallbackImage(query, category, brand);
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
  const image = await searchImage(name, category, brand);

  const product = {
    name,
    price: Number(price) || 0,
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

module.exports = {
  enrichProduct,
  detectCategory,
  detectBrand,
  searchImage,
  CATEGORY_IMAGES,
  CATEGORY_POOLS
};
