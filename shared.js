/* Shared layout, navigation, theme, loader */

function initSharedLayout() {
  injectNav();
  injectFooter();
  injectBackToTop();
  injectPageLoader();
  initTheme();
  initMobileNav();
  initNavSearch();
  initHeaderScroll();
  hidePageLoader();
  initAutoScroll();
  if (typeof observeFadeElements === 'function') {
    observeFadeElements();
  }
}

function scrollToProductsSection(smooth = true) {
  const target = document.getElementById('filterToolbar') ||
                 document.getElementById('storeProducts') ||
                 document.getElementById('inventory');
  if (!target) return;

  const header = document.getElementById('siteHeader');
  const headerOffset = header ? header.offsetHeight + 16 : 90;
  const elementPosition = target.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

  window.scrollTo({
    top: Math.max(0, offsetPosition),
    behavior: smooth ? 'smooth' : 'auto'
  });
}

function initAutoScroll() {
  const path = window.location.pathname.split('/').pop() || 'index.html';

  if (path === 'products.html' || window.location.hash) {
    const doScroll = () => scrollToProductsSection(false);
    doScroll();
    setTimeout(doScroll, 80);
    setTimeout(doScroll, 300);
  }
}

function injectNav() {
  const mount = document.getElementById('site-nav');
  if (!mount) return;

  const path = window.location.pathname.split('/').pop() || 'index.html';
  const isActive = (page) => path === page ? ' active' : '';

  mount.innerHTML = `
    <div class="top-bar">
      <div class="container top-bar-inner">
        <span>📞 Call us: +91 62845 37273</span>
        <span>🕐 Mon–Sat: 9:00 AM – 8:00 PM</span>
      </div>
    </div>
    <header class="site-header" id="siteHeader">
      <div class="container header-inner">
        <a href="index.html" class="logo" aria-label="HI TECH Home">
          <span class="logo-icon">⚡</span>
          <div class="logo-text">
            <strong>HI TECH</strong>
            <small>Refrigeration & Electronics</small>
          </div>
        </a>

        <nav class="nav" id="mainNav" aria-label="Main navigation">
          <a href="index.html" class="nav-link${isActive('index.html')}">Home</a>
          <a href="products.html#storeProducts" class="nav-link${isActive('products.html')}">Products</a>
          <a href="brands.html" class="nav-link${isActive('brands.html')}">Brands</a>
          <a href="about.html" class="nav-link${isActive('about.html')}">About Us</a>
          <a href="contact.html" class="nav-link${isActive('contact.html')}">Contact</a>
        </nav>

        <div class="header-actions">
          <form class="nav-search" id="navSearchForm" role="search">
            <input type="search" id="navSearchInput" placeholder="Search products..." aria-label="Search products">
            <button type="submit" aria-label="Search">🔍</button>
          </form>
          <button type="button" class="theme-toggle" id="themeToggle" aria-label="Toggle dark mode">🌙</button>
          <a href="contact.html" class="btn btn-primary header-cta hide-mobile">Visit Showroom</a>
          <button type="button" class="hamburger" id="hamburgerBtn" aria-label="Open menu" aria-expanded="false">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
      <div class="mobile-nav" id="mobileNav" hidden>
        <a href="index.html">Home</a>
        <a href="products.html#storeProducts">Products</a>
        <a href="brands.html">Brands</a>
        <a href="about.html">About Us</a>
        <a href="contact.html">Contact</a>
        <a href="tel:+916284537273" class="mobile-call">📞 Call Now</a>
      </div>
    </header>
  `;
}

function injectFooter() {
  const mount = document.getElementById('site-footer');
  if (!mount) return;

  mount.innerHTML = `
    <footer class="footer">
      <div class="container footer-inner">
        <div class="footer-brand">
          <strong>HI TECH REFRIGERATION & ELECTRONICS</strong>
          <p>Quality home appliances at competitive prices. Trusted service since 2010.</p>
          <div class="footer-social">
            <a href="#" aria-label="Facebook">f</a>
            <a href="#" aria-label="Instagram">◎</a>
            <a href="#" aria-label="YouTube">▶</a>
            <a href="https://wa.me/916284537273" aria-label="WhatsApp">💬</a>
          </div>
        </div>
        <div class="footer-links">
          <h5>Quick Links</h5>
          <a href="index.html">Home</a>
          <a href="products.html#storeProducts">Products</a>
          <a href="brands.html">Brands</a>
          <a href="about.html">About Us</a>
          <a href="contact.html">Contact</a>
        </div>
        <div class="footer-links">
          <h5>Categories</h5>
          <a href="products.html?category=ac#storeProducts">Air Conditioners</a>
          <a href="products.html?category=refrigerator#storeProducts">Refrigerators</a>
          <a href="products.html?category=washing#storeProducts">Washing Machines</a>
          <a href="products.html?category=tv#storeProducts">LED TVs</a>
          <a href="products.html?category=microwave#storeProducts">Microwaves</a>
          <a href="products.html?category=kitchen#storeProducts">Kitchen Appliances</a>
        </div>
        <div class="footer-contact">
          <h5>Contact</h5>
          <p>📞 +91 62845 37273</p>
          <p>✉️ info@hitech-electronics.com</p>
          <p>📍 123 Main Market Road, Your City</p>
        </div>
      </div>
      <div class="footer-bottom">
        <div class="container footer-bottom-inner">
          <p>© 2026 HI TECH REFRIGERATION & ELECTRONICS. All rights reserved.</p>
        </div>
      </div>
    </footer>
  `;
}

function injectBackToTop() {
  if (document.getElementById('backToTop')) return;
  const btn = document.createElement('button');
  btn.id = 'backToTop';
  btn.className = 'back-to-top';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Back to top');
  btn.innerHTML = '↑';
  document.body.appendChild(btn);

  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
}

function injectPageLoader() {
  if (document.getElementById('pageLoader')) return;
  document.body.insertAdjacentHTML('afterbegin', `
    <div id="pageLoader" class="page-loader" aria-hidden="true">
      <div class="loader-spinner"></div>
    </div>
  `);
}

function hidePageLoader() {
  const loader = document.getElementById('pageLoader');
  if (!loader) return;
  requestAnimationFrame(() => {
    loader.classList.add('hidden');
    setTimeout(() => loader.remove(), 400);
  });
}

function initTheme() {
  const saved = localStorage.getItem('hitech_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);

  document.addEventListener('click', (e) => {
    if (e.target.closest('#themeToggle')) {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('hitech_theme', next);
      updateThemeIcon(next);
    }
  });
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = theme === 'light' ? '🌙' : '☀️';
}

function initMobileNav() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#hamburgerBtn');
    const mobileNav = document.getElementById('mobileNav');
    if (!btn || !mobileNav) return;
    const open = mobileNav.hidden;
    mobileNav.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    btn.classList.toggle('open', open);
    document.body.classList.toggle('nav-open', open);
  });
}

function initNavSearch() {
  document.addEventListener('submit', (e) => {
    const form = e.target.closest('#navSearchForm');
    if (!form) return;
    e.preventDefault();
    const q = document.getElementById('navSearchInput')?.value.trim();
    if (q) {
      window.location.href = `products.html?q=${encodeURIComponent(q)}#storeProducts`;
    } else {
      window.location.href = 'products.html#storeProducts';
    }
  });
}

function initHeaderScroll() {
  const header = document.getElementById('siteHeader');
  if (!header) return;
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

document.addEventListener('DOMContentLoaded', initSharedLayout);
