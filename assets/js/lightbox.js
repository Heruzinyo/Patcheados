document.addEventListener('DOMContentLoaded', () => {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;
  
  const lightboxImage = document.getElementById('lightboxImage');
  
  const closeLightbox = () => {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  };

  document.addEventListener('click', (e) => {
    if (e.target.matches('.gallery-grid img')) {
      lightboxImage.src = e.target.dataset.src || e.target.src;
      lightboxImage.alt = e.target.alt;
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  });
  
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('active')) {
      closeLightbox();
    }
  });
});