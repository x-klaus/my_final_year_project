// ============================================================
// ATBU SMART TRANSPORT SYSTEM
// Login Page JavaScript — login.js
// Handles: role tab switching, identifier switching,
// password toggle, form validation, and login submission.
// ============================================================


// CURRENT STATE TRACKING
// These variables remember which role and identifier is selected

let currentRole = 'student';         // tracks active role tab
let currentStudentId = 'email';      // tracks student identifier (email/phone/reg)
let currentDriverId = 'email';       // tracks driver identifier (email/phone)


// ROLE TAB SWITCHING
// Called when user clicks Student or Driver tab.
// Shows the correct form fields for that role.

function switchRole(role) {
  currentRole = role;

  document.querySelectorAll('.role-tab').forEach(function (tab) {
    tab.classList.remove('active');
  });

  const activeTab = document.getElementById('tab-' + role);
  if (activeTab) activeTab.classList.add('active');

  const studentFields = document.getElementById('studentFields');
  const driverFields = document.getElementById('driverFields');
  const adminFields = document.getElementById('adminFields');

  if (studentFields) studentFields.classList.add('hidden');
  if (driverFields) driverFields.classList.add('hidden');
  if (adminFields) adminFields.classList.add('hidden');

  const roleFields = document.getElementById(role + 'Fields');
  if (roleFields) roleFields.classList.remove('hidden');

  hideError();
  toggleLoginBtn();
}


// STUDENT IDENTIFIER SWITCHING
// Called when student clicks Email / Phone / Reg Number buttons.
// Shows the matching input field and hides the others.

function switchIdentifier(type) {
  currentStudentId = type;

  // Remove "active" from all student identifier buttons
  document.querySelectorAll('#studentFields .identifier-btn').forEach(function (btn) {
    btn.classList.remove('active');
  });

  // Find the clicked button and make it active
  // We match by button text content
  document.querySelectorAll('#studentFields .identifier-btn').forEach(function (btn) {
    if (btn.textContent.toLowerCase().includes(type === 'reg' ? 'reg' : type)) {
      btn.classList.add('active');
    }
  });

  // Hide all student input groups
  document.getElementById('emailGroup').classList.add('hidden');
  document.getElementById('phoneGroup').classList.add('hidden');
  document.getElementById('regGroup').classList.add('hidden');

  // Show the correct input group based on selection
  if (type === 'email') {
    document.getElementById('emailGroup').classList.remove('hidden');
  } else if (type === 'phone') {
    document.getElementById('phoneGroup').classList.remove('hidden');
  } else if (type === 'reg') {
    document.getElementById('regGroup').classList.remove('hidden');
  }
}


// DRIVER IDENTIFIER SWITCHING
// Called when driver clicks Email / Phone buttons

function switchDriverIdentifier(type) {
  currentDriverId = type;

  // Remove active from all driver identifier buttons
  document.querySelectorAll('#driverFields .identifier-btn').forEach(function (btn) {
    btn.classList.remove('active');
  });

  // Make the clicked button active
  document.querySelectorAll('#driverFields .identifier-btn').forEach(function (btn) {
    if (btn.textContent.toLowerCase().includes(type)) {
      btn.classList.add('active');
    }
  });

  // Hide all driver input groups then show the correct one
  document.getElementById('driverEmailGroup').classList.add('hidden');
  document.getElementById('driverPhoneGroup').classList.add('hidden');

  if (type === 'email') {
    document.getElementById('driverEmailGroup').classList.remove('hidden');
  } else if (type === 'phone') {
    document.getElementById('driverPhoneGroup').classList.remove('hidden');
  }
}


// PASSWORD TOGGLE
// Switches the password input between hidden (****) and visible text.

function togglePassword() {
  const passwordInput = document.getElementById('password');
  const toggleBtn = document.getElementById('loginPasswordToggle');
  if (!passwordInput) return;

  const showPassword = passwordInput.type === 'password';
  passwordInput.type = showPassword ? 'text' : 'password';
  updatePasswordToggleButton(toggleBtn, showPassword);
}


// SHOW ERROR MESSAGE
// Displays a red error box with a custom message

function showError(message) {
  const errorBox = document.getElementById('loginError');
  const errorText = document.getElementById('loginErrorText');
  errorText.textContent = message;
  errorBox.classList.remove('hidden');
}

// HIDE ERROR MESSAGE
function hideError() {
  document.getElementById('loginError').classList.add('hidden');
}


// FORM VALIDATION
// Checks that all required fields are filled before submitting.
// Returns true if valid, false if not.

function validateForm() {
  const password = document.getElementById('password').value.trim();

  // Password must not be empty
  if (!password) {
    showError('Please enter your password.');
    return false;
  }

  // Check the identifier field based on role and type selected
  if (currentRole === 'student') {
    if (currentStudentId === 'email') {
      const email = document.getElementById('studentEmail').value.trim();
      if (!email) { showError('Please enter your email address.'); return false; }
      // Basic email format check
      if (!email.includes('@')) { showError('Please enter a valid email address.'); return false; }

    } else if (currentStudentId === 'phone') {
      const phone = document.getElementById('studentPhone').value.trim();
      if (!phone) { showError('Please enter your phone number.'); return false; }
      // Nigerian phone numbers are 11 digits
      if (phone.length < 10) { showError('Please enter a valid phone number.'); return false; }

    } else if (currentStudentId === 'reg') {
      const reg = document.getElementById('studentReg').value.trim();
      if (!reg) { showError('Please enter your registration number.'); return false; }
    }

  } else if (currentRole === 'driver') {
    if (currentDriverId === 'email') {
      const email = document.getElementById('driverEmail').value.trim();
      if (!email) { showError('Please enter your email address.'); return false; }
      if (!email.includes('@')) { showError('Please enter a valid email address.'); return false; }
    } else {
      const phone = document.getElementById('driverPhone').value.trim();
      if (!phone) { showError('Please enter your phone number.'); return false; }
    }

  }

  return true; // all checks passed
}

// ENABLE OR DISABLE LOGIN BUTTON
// Button becomes active only when identifier and password are filled

function toggleLoginBtn() {
  const password = document.getElementById('password');
  const btn = document.getElementById('loginBtn');

  if (!btn || !password) return;

  const passwordFilled = password.value.trim().length > 0;

  // Check all possible identifier fields
  // whichever one is visible and has a value counts
  const emailEl = document.getElementById('studentEmail');
  const phoneEl = document.getElementById('studentPhone');
  const regEl   = document.getElementById('studentReg');
  const driverEmailEl = document.getElementById('driverEmail');
  const driverPhoneEl = document.getElementById('driverPhone');

  const emailVal       = emailEl       ? emailEl.value.trim()       : '';
  const phoneVal       = phoneEl       ? phoneEl.value.trim()       : '';
  const regVal         = regEl         ? regEl.value.trim()         : '';
  const driverEmailVal = driverEmailEl ? driverEmailEl.value.trim() : '';
  const driverPhoneVal = driverPhoneEl ? driverPhoneEl.value.trim() : '';

  let hasIdentifier = false;
  if (currentRole === 'student') {
    if (currentStudentId === 'email') hasIdentifier = !!emailVal;
    else if (currentStudentId === 'phone') hasIdentifier = !!phoneVal;
    else hasIdentifier = !!regVal;
  } else if (currentRole === 'driver') {
    hasIdentifier = currentDriverId === 'email' ? !!driverEmailVal : !!driverPhoneVal;
  }

  btn.disabled = !(hasIdentifier && passwordFilled);
  btn.style.opacity = (hasIdentifier && passwordFilled) ? '1' : '0.5';
}

function toggleAdminLoginBtn() {
  const emailEl = document.getElementById('adminLoginEmail');
  const passwordEl = document.getElementById('adminLoginPassword');
  const btn = document.getElementById('adminLoginBtn');

  if (!btn) return;

  const emailFilled = emailEl && emailEl.value.trim().length > 0 && emailEl.value.trim().includes('@');
  const passwordFilled = passwordEl && passwordEl.value.trim().length > 0;
  const ready = emailFilled && passwordFilled;

  btn.disabled = !ready;
  btn.style.opacity = ready ? '1' : '0.5';
}

function initAdminLoginForm() {
  const emailEl = document.getElementById('adminLoginEmail');
  const passwordEl = document.getElementById('adminLoginPassword');

  if (emailEl) emailEl.addEventListener('input', toggleAdminLoginBtn);
  if (passwordEl) passwordEl.addEventListener('input', toggleAdminLoginBtn);
  toggleAdminLoginBtn();
}


// HANDLE LOGIN FORM SUBMISSION
// This runs when the user clicks the "Log In" button.
// In a real app, this would send data to the Django backend.
// For now it validates and simulates a login.

function handleLogin(event) {
  event.preventDefault(); // stop the form from refreshing the page
  hideError();             // clear any previous error message

  // Validate the form first
  if (!validateForm()) return;

  // Show loading state on the button
  const loginBtn = document.getElementById('loginBtn');
  loginBtn.textContent = 'Logging in...';
  loginBtn.classList.add('btn-loading');

  // Simulate a network request (1.5 second delay)
  // In a real app, this is where you'd call the Django API
  setTimeout(function () {

    // For demo purposes: redirect based on role
    // In the real app, the backend would verify credentials first
    if (currentRole === 'student') {
      const regField = document.getElementById('studentReg');
      const reg = (regField && regField.value.trim()) || '20/58646U/1';
      const studentEmail = document.getElementById('studentEmail');
      const name = studentDatabase[reg] || 'Audu Wahab Ayodele';
      localStorage.setItem('studentProfile', JSON.stringify({
        name: name,
        reg: reg
      }));
      setAuthSession('student', {
        name: name,
        reg: reg,
        email: studentEmail ? studentEmail.value.trim() : ''
      });
      window.location.href = 'student-dashboard.html';
    } else if (currentRole === 'driver') {
      const driverEmail = document.getElementById('driverEmail');
      setAuthSession('driver', {
        name: 'Abdullahi Danladi',
        email: driverEmail ? driverEmail.value.trim() : ''
      });
      window.location.href = 'driver-dashboard.html';
    }
  }, 1500);
}

function handleAdminLogin(event) {
  event.preventDefault();

  const emailEl = document.getElementById('adminLoginEmail');
  const passwordEl = document.getElementById('adminLoginPassword');
  const errorEl = document.getElementById('adminLoginError');
  const errorText = document.getElementById('adminLoginErrorText');
  const btn = document.getElementById('adminLoginBtn');

  const email = emailEl ? emailEl.value.trim() : '';
  const password = passwordEl ? passwordEl.value.trim() : '';

  if (!email || !email.includes('@')) {
    if (errorText) errorText.textContent = 'Please enter a valid admin email address.';
    if (errorEl) errorEl.classList.remove('hidden');
    return;
  }
  if (!password) {
    if (errorText) errorText.textContent = 'Please enter your password.';
    if (errorEl) errorEl.classList.remove('hidden');
    return;
  }

  if (errorEl) errorEl.classList.add('hidden');
  if (btn) {
    btn.textContent = 'Logging in...';
    btn.classList.add('btn-loading');
  }

  setTimeout(function () {
    setAuthSession('admin', {
      name: 'Transport Admin',
      email: email
    });
    window.location.href = 'admin-dashboard.html';
  }, 1200);
}
