// Smooth highlight on scroll for nav links
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav a');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(section => {
    const top = section.offsetTop - 120;
    if (window.scrollY >= top) {
      current = section.getAttribute('id');
    }
  });

  navLinks.forEach(link => {
    link.style.color = '';
    if (link.getAttribute('href') === `#${current}`) {
      link.style.color = '#00a8cc';
    }
  });
});

// Contact form feedback (homepage inline contact form only)
const homeContactForm = document.querySelector('.contact-form');
if (homeContactForm) {
  homeContactForm.addEventListener('submit', function (e) {
    e.preventDefault();
    alert('Thank you! We will contact you shortly.');
    this.reset();
  });
}

// NOTE: rendering #storeProducts is handled by filters.js
// (initHomeProductsPreview on pages without a #filterToolbar).
// Do not duplicate that call here — it caused a race where two
// separate renders competed for the same container on index.html.
