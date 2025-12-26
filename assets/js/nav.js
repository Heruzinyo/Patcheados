document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('nav');

  if (!navToggle || !nav) return;

  navToggle.addEventListener('click', () => {
    const isActive = navToggle.classList.toggle('active');
    nav.classList.toggle('active');
    navToggle.setAttribute('aria-expanded', isActive);
  });

  document.addEventListener('click', (e) => {
    if (nav.classList.contains('active') && !nav.contains(e.target) && !navToggle.contains(e.target)) {
      navToggle.classList.remove('active');
      nav.classList.remove('active');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });
});