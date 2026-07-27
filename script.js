// Smooth highlight on scroll for nav links
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav a');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(section => {
    const top = section.offsetTop - 120;
    if (scrollY >= top) {
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

// Contact form feedback
document.querySelector('.contact-form').addEventListener('submit', function (e) {
  e.preventDefault();
  alert('Thank you! We will contact you shortly.');
  this.reset();
});

// Display imported inventory on homepage
const storeProducts = document.getElementById('storeProducts');
if (storeProducts) {
  getInventory(true).then(products => {
    renderProductCards(
      storeProducts,
      products,
      'Products coming soon. Visit our showroom for the latest stock.'
    );
  });
}
