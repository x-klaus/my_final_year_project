// NAVBAR SCROLL EFFECT
// When the user scrolls down, we add a shadow to the navbar
// to make it look like it's floating above the page content.

const navbar = document.getElementById('navbar');

// This runs every time the user scrolls (landing + auth pages only)
if (navbar) {
  window.addEventListener('scroll', function () {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}


// SCROLL REVEAL ANIMATION
// Elements with the class "reveal" start invisible.
// When they scroll into view, we add the "visible" class
// which triggers the CSS fade-in + slide-up animation.

const revealElements = document.querySelectorAll('.reveal');

// IntersectionObserver watches elements and tells us when they
// enter or leave the visible area of the screen
const revealObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry, index) {

    // If the element is now visible on screen
    if (entry.isIntersecting) {

      // Small staggered delay so cards don't all appear at once
      // Each element waits a little longer than the previous one
      setTimeout(function () {
        entry.target.classList.add('visible');
      }, index * 80);

      // Stop watching this element once it's been revealed
      revealObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.12 // trigger when 12% of the element is visible
});

// Attach the observer to every reveal element on the page
revealElements.forEach(function (el) {
  revealObserver.observe(el);
});
