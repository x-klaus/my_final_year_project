// ============================================================
// ATBU SMART TRANSPORT SYSTEM
// Register Page JavaScript — register.js
// Handles: role switching, student ID auto-fetch,
// password strength checker, password match checker,
// form validation, and registration submission.
// ============================================================


// DEMO STUDENT DATABASE
// This simulates what would normally come from the Django backend.
// When the real backend is ready, we replace this with an API call.
// Key = student ID, Value = student's full name

const studentDatabase = {
  '20/58646U/1': 'Audu Wahab Ayodele',
  '19/45231T/2': 'Fatima Aliyu Bello',
  '21/67890K/3': 'Ibrahim Musa Danladi',
  '20/11234P/4': 'Aisha Suleiman Yusuf',
  '22/78901Q/5': 'Chukwuemeka Obi Nwosu',
  '19/22345R/6': 'Hauwa Usman Garba',
  '21/99012S/7': 'Abdullahi Sadiq Lawal',
  '20/33456V/8': 'Blessing Adamu James',
};


// CURRENT ROLE TRACKER
let currentRegRole = 'student';
let currentRegStep = 1;


// ROLE TAB SWITCHING
// Shows the correct form section when a role tab is clicked

function switchRegRole(role) {
  currentRegRole = role;
  goToRegisterStep(1);

  // Remove active from all tabs
  document.querySelectorAll('#registerRoleTabs .role-tab').forEach(function (tab) {
    tab.classList.remove('active');
  });

  // Set the clicked tab as active
  document.getElementById('reg-tab-' + role).classList.add('active');

  // Hide all role form sections
  document.getElementById('reg-studentFields').classList.add('hidden');
  document.getElementById('reg-driverFields').classList.add('hidden');
  document.getElementById('reg-adminFields').classList.add('hidden');

  // Show only the selected role's section
  document.getElementById('reg-' + role + 'Fields').classList.remove('hidden');
  toggleRegisterNextBtn();
}

function goToRegisterStep(step, keepError) {
  currentRegStep = step;

  const step1 = document.getElementById('registerStep1');
  const step2 = document.getElementById('registerStep2');
  const roleTabs = document.getElementById('registerRoleTabs');
  const headerSub = document.querySelector('.auth-form-header p');
  const backBar = document.getElementById('registerStepBackBar');

  if (!step1 || !step2) return;

  if (step === 1) {
    step1.classList.remove('hidden');
    step2.classList.add('hidden');
    if (roleTabs) roleTabs.classList.remove('hidden');
    if (backBar) backBar.classList.add('hidden');
    if (headerSub) headerSub.textContent = 'Select your role to get started';
  } else {
    step1.classList.add('hidden');
    step2.classList.remove('hidden');
    if (roleTabs) roleTabs.classList.add('hidden');
    if (backBar) backBar.classList.remove('hidden');
    if (headerSub) headerSub.textContent = 'Set your password to finish creating your account';
  }

  if (!keepError) hideRegError();
  closeCampusPickerModal();
  if (step === 1) toggleRegisterNextBtn();

  const formContainer = document.querySelector('.auth-form-container');
  if (formContainer) {
    formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function goRegisterNextStep() {
  hideRegError();
  if (!validateRegisterStep1()) return;
  goToRegisterStep(2);
}

function goRegisterPrevStep() {
  goToRegisterStep(1);
}


const STUDENT_CAMPUS_LABELS = {
  yelwa: 'Yelwa Campus',
  gubi: 'Gubi Campus'
};

function openCampusPickerModal() {
  const overlay = document.getElementById('campusPickerOverlay');
  const trigger = document.getElementById('studentCampusTrigger');
  if (!overlay) return;

  const current = document.getElementById('studentCampus');
  const value = current ? current.value : '';

  document.querySelectorAll('.campus-picker-option').forEach(function (btn) {
    btn.classList.toggle('active', btn.getAttribute('data-campus') === value);
  });

  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (trigger) trigger.setAttribute('aria-expanded', 'true');
}

function closeCampusPickerModal() {
  const overlay = document.getElementById('campusPickerOverlay');
  const trigger = document.getElementById('studentCampusTrigger');
  if (!overlay) return;
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
}

function selectStudentCampus(value) {
  const input = document.getElementById('studentCampus');
  const label = document.getElementById('studentCampusLabel');
  const trigger = document.getElementById('studentCampusTrigger');

  if (input) input.value = value;
  if (label) {
    label.textContent = STUDENT_CAMPUS_LABELS[value] || 'Select your campus';
    label.classList.toggle('campus-picker-value--placeholder', !value);
  }
  if (trigger) trigger.classList.toggle('campus-picker-trigger--selected', !!value);

  closeCampusPickerModal();
  toggleRegisterNextBtn();
}


// STUDENT ID AUTO-FETCH
// This runs every time the student types in the ID field.
// We wait until they've typed at least 8 characters before searching.

let idLookupTimer = null; // timer to delay the search until typing stops

function onStudentIdInput() {
  const idInput = document.getElementById('studentId');
  const idValue = idInput.value.trim();
  const nameInput = document.getElementById('studentName');
  const idHint = document.getElementById('idHint');
  const idStatusIcon = document.getElementById('idStatusIcon');
  const autoFillBadge = document.getElementById('autoFillBadge');
  const nameSpinner = document.getElementById('nameSpinner');

  // Reset everything if input is too short
  if (idValue.length < 5) {
    resetNameField();
    return;
  }

  // Cancel any previous timer so we don't search on every keystroke
  clearTimeout(idLookupTimer);

  // Show a searching state
  idStatusIcon.textContent = '';
  idHint.textContent = 'Searching...';
  idHint.className = 'field-hint';
  nameSpinner.classList.remove('hidden');
  nameInput.value = '';
  nameInput.placeholder = 'Searching...';
  nameInput.disabled = true;

  // Wait 800ms after the user stops typing before searching
  // This prevents searching on every single keystroke
  idLookupTimer = setTimeout(function () {
    lookupStudentId(idValue);
  }, 800);
}


// LOOKUP STUDENT ID
// Checks the student ID against our demo database.
// In the real app, this would be a fetch() call to the Django API.

function lookupStudentId(studentId) {
  const nameInput = document.getElementById('studentName');
  const idHint = document.getElementById('idHint');
  const idStatusIcon = document.getElementById('idStatusIcon');
  const autoFillBadge = document.getElementById('autoFillBadge');
  const nameSpinner = document.getElementById('nameSpinner');

  // Hide the spinner now that "searching" is done
  nameSpinner.classList.add('hidden');

  // Check if the ID exists in our database
  const foundName = studentDatabase[studentId];

  if (foundName) {
    // ID FOUND - auto-fill the name field and lock it
    nameInput.value = foundName;
    nameInput.disabled = true;
    nameInput.placeholder = '';
    nameInput.classList.add('auto-filled');

    // Show success indicators
    idStatusIcon.textContent = '✅';
    idHint.textContent = 'Student ID verified successfully.';
    idHint.className = 'field-hint field-hint--success';
    autoFillBadge.classList.remove('hidden');

  } else {
    // ID NOT FOUND - let the user type their name manually
    nameInput.value = '';
    nameInput.disabled = false;
    nameInput.placeholder = 'ID not found — enter your name manually';
    nameInput.classList.remove('auto-filled');

    // Show error indicators
    idStatusIcon.textContent = '⚠️';
    idHint.textContent = 'ID not found. You can enter your name manually below.';
    idHint.className = 'field-hint field-hint--error';
    autoFillBadge.classList.add('hidden');
  }

  toggleRegisterNextBtn();
}


// RESET NAME FIELD
// Clears the name field back to its default waiting state

function resetNameField() {
  const nameInput = document.getElementById('studentName');
  const idHint = document.getElementById('idHint');
  const idStatusIcon = document.getElementById('idStatusIcon');
  const autoFillBadge = document.getElementById('autoFillBadge');
  const nameSpinner = document.getElementById('nameSpinner');

  nameInput.value = '';
  nameInput.disabled = true;
  nameInput.placeholder = 'Searching by ID first...';
  nameInput.classList.remove('auto-filled');
  idHint.textContent = '';
  idHint.className = 'field-hint';
  idStatusIcon.textContent = '';
  autoFillBadge.classList.add('hidden');
  nameSpinner.classList.add('hidden');
  toggleRegisterNextBtn();
}


// PASSWORD TOGGLE
// Works for both password and confirm password fields

function toggleRegPassword(inputId, toggleBtnId) {
  const input = document.getElementById(inputId);
  const toggleBtn = document.getElementById(toggleBtnId);
  if (!input) return;

  const showPassword = input.type === 'password';
  input.type = showPassword ? 'text' : 'password';
  updatePasswordToggleButton(toggleBtn, showPassword);
}


// PASSWORD STRENGTH CHECKER
// Runs as the user types their password.
// Checks length, numbers, uppercase, and special characters.

function checkPasswordStrength() {
  const password = document.getElementById('regPassword').value;
  const strengthFill = document.getElementById('strengthFill');
  const strengthLabel = document.getElementById('strengthLabel');

  // Remove all strength classes first
  strengthFill.className = 'strength-fill';
  strengthLabel.className = 'strength-label';

  if (password.length === 0) {
    strengthFill.style.width = '0%';
    strengthLabel.textContent = '';
    return;
  }

  // Count how many strength criteria are met
  let score = 0;
  if (password.length >= 8)            score++; // at least 8 characters
  if (/[A-Z]/.test(password))          score++; // has uppercase letter
  if (/[0-9]/.test(password))          score++; // has a number
  if (/[^A-Za-z0-9]/.test(password))  score++; // has special character

  // Apply the appropriate strength level
  if (score <= 1) {
    strengthFill.classList.add('weak');
    strengthLabel.classList.add('weak');
    strengthLabel.textContent = 'Weak';
  } else if (score <= 3) {
    strengthFill.classList.add('fair');
    strengthLabel.classList.add('fair');
    strengthLabel.textContent = 'Fair';
  } else {
    strengthFill.classList.add('strong');
    strengthLabel.classList.add('strong');
    strengthLabel.textContent = 'Strong';
  }

  // Also re-check the confirm password match whenever password changes
  checkPasswordMatch();
}


// PASSWORD MATCH CHECKER
// Runs as the user types in the confirm password field.
// Shows whether the two passwords match.

function checkPasswordMatch() {
  const password = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regConfirmPassword').value;
  const hint = document.getElementById('passwordMatchHint');

  if (confirm.length === 0) {
    hint.textContent = '';
    hint.className = 'field-hint';
    return;
  }

  if (password === confirm) {
    hint.textContent = '✅ Passwords match';
    hint.className = 'field-hint match';
  } else {
    hint.textContent = '❌ Passwords do not match';
    hint.className = 'field-hint no-match';
  }
}


// SHOW / HIDE ERROR MESSAGE

function showRegError(message, step) {
  const regStep = step || currentRegStep;
  if (regStep === 1 && currentRegStep !== 1) {
    goToRegisterStep(1, true);
  }
  const errorBox = document.getElementById(regStep === 1 ? 'registerStep1Error' : 'registerError');
  const errorText = document.getElementById(regStep === 1 ? 'registerStep1ErrorText' : 'registerErrorText');
  if (!errorBox || !errorText) return;
  errorText.textContent = message;
  errorBox.classList.remove('hidden');
  errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideRegError() {
  ['registerStep1Error', 'registerError'].forEach(function (id) {
    const box = document.getElementById(id);
    if (box) box.classList.add('hidden');
  });
}


// STEP 1 VALIDATION — profile fields only

function isRegisterStep1Complete() {
  if (currentRegRole === 'student') {
    const studentId = document.getElementById('studentId');
    const studentName = document.getElementById('studentName');
    const email = document.getElementById('studentRegEmail');
    const phone = document.getElementById('studentRegPhone');
    const dept = document.getElementById('studentDept');
    const faculty = document.getElementById('studentFaculty');
    const campus = document.getElementById('studentCampus');

    if (!studentId || !studentName || !email || !phone || !dept || !faculty || !campus) {
      return false;
    }

    return !!(
      studentId.value.trim() &&
      studentName.value.trim() &&
      email.value.trim() &&
      phone.value.trim() &&
      dept.value.trim() &&
      faculty.value.trim() &&
      campus.value
    );
  }

  if (currentRegRole === 'driver') {
    const name = document.getElementById('driverName');
    const staffId = document.getElementById('driverStaffId');
    const email = document.getElementById('driverRegEmail');
    const phone = document.getElementById('driverRegPhone');
    const licence = document.getElementById('driverLicence');

    if (!name || !staffId || !email || !phone || !licence) return false;

    return !!(
      name.value.trim() &&
      staffId.value.trim() &&
      email.value.trim() &&
      phone.value.trim() &&
      licence.value.trim()
    );
  }

  return false;
}

function toggleRegisterNextBtn() {
  const btn = document.getElementById('registerNextBtn');
  if (!btn) return;
  const ready = isRegisterStep1Complete();
  btn.disabled = !ready;
  btn.style.opacity = ready ? '1' : '0.5';
}

function validateRegisterStep1() {
  if (currentRegRole === 'student') {
    const studentId = document.getElementById('studentId').value.trim();
    const studentName = document.getElementById('studentName').value.trim();
    const email = document.getElementById('studentRegEmail').value.trim();
    const phone = document.getElementById('studentRegPhone').value.trim();
    const dept = document.getElementById('studentDept').value.trim();
    const faculty = document.getElementById('studentFaculty').value.trim();
    const campus = document.getElementById('studentCampus').value;

    if (!studentId)   { showRegError('Please enter your Student ID.', 1); return false; }
    if (!studentName) { showRegError('Please enter your full name.', 1); return false; }
    if (!email)       { showRegError('Please enter your email address.', 1); return false; }
    if (!phone)       { showRegError('Please enter your phone number.', 1); return false; }
    if (!dept)        { showRegError('Please enter your department.', 1); return false; }
    if (!faculty)     { showRegError('Please enter your faculty.', 1); return false; }
    if (!campus)      { showRegError('Please select your campus.', 1); return false; }

  } else if (currentRegRole === 'driver') {
    const name    = document.getElementById('driverName').value.trim();
    const staffId = document.getElementById('driverStaffId').value.trim();
    const email   = document.getElementById('driverRegEmail').value.trim();
    const phone   = document.getElementById('driverRegPhone').value.trim();
    const licence = document.getElementById('driverLicence').value.trim();

    if (!name)    { showRegError('Please enter your full name.', 1); return false; }
    if (!staffId) { showRegError('Please enter your Staff ID.', 1); return false; }
    if (!email)   { showRegError('Please enter your email address.', 1); return false; }
    if (!phone)   { showRegError('Please enter your phone number.', 1); return false; }
    if (!licence) { showRegError('Please enter your driver\'s licence number.', 1); return false; }

  } else if (currentRegRole === 'admin') {
    const name       = document.getElementById('adminName').value.trim();
    const staffId    = document.getElementById('adminStaffId').value.trim();
    const email      = document.getElementById('adminRegEmail').value.trim();
    const accessCode = document.getElementById('adminAccessCode').value.trim();

    if (!name)       { showRegError('Please enter your full name.', 1); return false; }
    if (!staffId)    { showRegError('Please enter your Staff ID.', 1); return false; }
    if (!email)      { showRegError('Please enter your email address.', 1); return false; }
    if (!accessCode) { showRegError('Please enter the Admin Access Code.', 1); return false; }
  }

  return true;
}


// FORM VALIDATION
// Checks all fields are filled correctly before submitting

function validateRegisterForm() {
  if (!validateRegisterStep1()) return false;

  const password = document.getElementById('regPassword').value.trim();
  const confirm = document.getElementById('regConfirmPassword').value.trim();
  const agreed = document.getElementById('agreeTerms').checked;

  // Password checks - same for all roles
  if (!password)              { showRegError('Please create a password.', 2); return false; }
  if (password.length < 8)    { showRegError('Password must be at least 8 characters.', 2); return false; }
  if (password !== confirm)   { showRegError('Passwords do not match.', 2); return false; }
  if (!agreed)                { showRegError('Please agree to the Terms of Service to continue.', 2); return false; }

  return true; // all good
}


// ENABLE OR DISABLE CREATE ACCOUNT BUTTON
// Based on whether terms and conditions checkbox is checked
function toggleRegisterBtn() {
  const agreed = document.getElementById('agreeTerms').checked;
  const btn = document.getElementById('registerBtn');
  if (btn) {
    btn.disabled = !agreed;
    btn.style.opacity = agreed ? '1' : '0.5';
  }
}

// HANDLE REGISTRATION SUBMISSION
// Runs when the user clicks "Create Account"

function handleRegister(event) {
  event.preventDefault(); // stop page from refreshing
  hideRegError();

  // Validate the form first
  if (!validateRegisterForm()) return;

  // Show loading state on the button
  const registerBtn = document.getElementById('registerBtn');
  registerBtn.textContent = 'Creating account...';
  registerBtn.classList.add('btn-loading');

  // Simulate a network request (1.5 second delay)
  // In the real app, this sends data to the Django backend API
  setTimeout(function () {

    // Show the success screen instead of the form
    const formContainer = document.querySelector('.auth-form-container');
    formContainer.innerHTML = `
      <div class="register-success">
        <div class="success-icon">🎉</div>
        <h2>Account Created!</h2>
        <p>Welcome to ATBU Smart Transport. Your account has been created successfully.</p>
        <a href="login.html" class="btn btn-primary btn-lg" style="margin-top: 16px;">
          Log In Now →
        </a>
      </div>
    `;

  }, 1500);
}

