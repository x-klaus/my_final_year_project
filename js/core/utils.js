// ============================================================
// ATBU Smart Transport — shared helpers (used across modules)
// ============================================================

function updateVisibilityToggleButton(btn, contentVisible, labels) {
  if (!btn) return;
  btn.classList.toggle('visibility-toggle--visible', contentVisible);
  const text = contentVisible
    ? (labels && labels.hide) || 'Hide'
    : (labels && labels.show) || 'Show';
  btn.setAttribute('aria-label', text);
  btn.title = text;
}

function updatePasswordToggleButton(btn, passwordVisible) {
  updateVisibilityToggleButton(btn, passwordVisible, {
    show: 'Show password',
    hide: 'Hide password'
  });
}

function getDriverInitials(name) {
  if (!name) return '—';
  return name.trim().split(/\s+/).map(function (part) {
    return part.charAt(0).toUpperCase();
  }).join('').slice(0, 2);
}

function formatNaira(amount) {
  return '₦' + Number(amount).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function normalizeBookingRef(ref) {
  if (!ref) return '';
  ref = ref.trim().toUpperCase();
  if (!ref.startsWith('#')) ref = '#' + ref;
  return ref;
}
