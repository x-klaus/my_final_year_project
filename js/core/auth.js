// ============================================================
// ATBU Smart Transport — auth session, guards, planned features
// ============================================================

const AUTH_SESSION_KEY = 'atbuAuthSession';

function getAuthSession() {
  try {
    const raw = sessionStorage.getItem(AUTH_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setAuthSession(role, profile) {
  sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({
    role: role,
    name: profile.name || '',
    email: profile.email || '',
    reg: profile.reg || '',
    loggedInAt: Date.now()
  }));
}

function clearAuthSession() {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
}

function getDashboardUrlForRole(role) {
  if (role === 'student') return 'student-dashboard.html';
  if (role === 'driver') return 'driver-dashboard.html';
  if (role === 'admin') return 'admin-dashboard.html';
  return 'login.html';
}

function getLoginUrlForRole(role) {
  if (role === 'admin') return 'admin-login.html';
  return 'login.html';
}

function requireAuth(requiredRole) {
  const allowedRoles = String(requiredRole || '')
    .split(',')
    .map(function (role) { return role.trim(); })
    .filter(Boolean);
  const session = getAuthSession();

  if (!session || !session.role) {
    const loginUrl = allowedRoles.indexOf('admin') !== -1 ? 'admin-login.html' : 'login.html';
    window.location.replace(loginUrl);
    return false;
  }

  if (allowedRoles.indexOf(session.role) === -1) {
    window.location.replace(getDashboardUrlForRole(session.role));
    return false;
  }

  return true;
}

function redirectIfAuthenticated() {
  const session = getAuthSession();
  if (session && session.role) {
    window.location.replace(getDashboardUrlForRole(session.role));
  }
}

function handleLogout(event) {
  if (event) event.preventDefault();
  const session = getAuthSession();
  const role = session ? session.role : null;
  clearAuthSession();
  window.location.href = getLoginUrlForRole(role);
}

function ensurePlannedFeatureModal() {
  if (document.getElementById('plannedFeatureOverlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'plannedFeatureOverlay';
  overlay.className = 'modal-overlay hidden';
  overlay.innerHTML =
    '<div class="modal planned-feature-modal" onclick="event.stopPropagation()">' +
      '<button type="button" class="modal-close" onclick="closePlannedFeature()" aria-label="Close">&times;</button>' +
      '<div class="modal-body">' +
        '<div class="planned-feature-icon">🚀</div>' +
        '<h3 id="plannedFeatureTitle">Feature</h3>' +
        '<p>This feature is planned for the next release of ATBU Smart Transport.</p>' +
        '<button type="button" class="btn btn-primary btn-full" onclick="closePlannedFeature()">Got it</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closePlannedFeature();
  });
}

function openPlannedFeature(featureName) {
  ensurePlannedFeatureModal();
  const title = document.getElementById('plannedFeatureTitle');
  if (title) title.textContent = featureName;
  document.getElementById('plannedFeatureOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closePlannedFeature() {
  const overlay = document.getElementById('plannedFeatureOverlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
}

function applyPortalUserInfo() {
  const session = getAuthSession();
  if (!session || !session.name || session.role === 'admin') return;

  const fullName = session.name;
  const firstName = fullName.split(' ')[0];
  const initials = getDriverInitials(fullName);

  ['userName', 'driverName'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.textContent = fullName;
  });

  ['userAvatar', 'driverAvatar'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.textContent = initials;
  });

  const welcomeNameEl = document.getElementById('welcomeName');
  if (welcomeNameEl) welcomeNameEl.textContent = firstName;

  const topbarUser = document.querySelector('.topbar-user');
  if (topbarUser) {
    const avatar = topbarUser.querySelector('.user-avatar:not([id])');
    const nameSpan = topbarUser.querySelector('.user-name:not([id])');
    if (avatar) avatar.textContent = initials;
    if (nameSpan) nameSpan.textContent = fullName;
  }
}

function initAppAuth() {
  const authRole = document.body.getAttribute('data-auth-role');
  if (authRole && requireAuth(authRole)) {
    applyPortalUserInfo();
  }

  if (document.getElementById('loginForm') || document.getElementById('adminLoginForm')) {
    redirectIfAuthenticated();
  }
}

