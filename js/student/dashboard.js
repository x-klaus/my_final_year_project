// ============================================================
// ATBU SMART TRANSPORT SYSTEM
// Dashboard JavaScript — dashboard.js
// Handles: date display, sidebar toggle, wallet balance
// toggle, top up modal, bus request modal,
// notifications panel, and dashboard interactions.
// ============================================================


// SET CURRENT DATE IN TOPBAR
// Runs when the page loads and displays today's date

function setCurrentDate() {
  const dateEl = document.getElementById('currentDate');
  if (!dateEl) return;

  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  dateEl.textContent = now.toLocaleDateString('en-NG', options);
}


// SET GREETING BASED ON TIME OF DAY
// Changes "Good morning/afternoon/evening" based on current hour

function setGreeting() {
  const greetingEl = document.querySelector('.welcome-banner h2');
  if (!greetingEl) return;

  const hour = new Date().getHours();
  const name = document.getElementById('welcomeName');
  let greeting = 'Good morning';

  if (hour >= 12 && hour < 17) {
    greeting = 'Good afternoon';
  } else if (hour >= 17) {
    greeting = 'Good evening';
  }

  // Update just the greeting text, keeping the name intact
  if (name) {
    greetingEl.innerHTML = greeting + ', <span id="welcomeName">' + name.textContent + '</span> 👋';
  }
}


// SIDEBAR TOGGLE
// Opens and closes the sidebar on mobile screens

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('open');
}

// Close sidebar when clicking outside of it on mobile
document.addEventListener('click', function (e) {
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.querySelector('.menu-toggle');

  if (sidebar && !sidebar.contains(e.target) && menuToggle && !menuToggle.contains(e.target)) {
    sidebar.classList.remove('open');
  }
});


// WALLET BALANCE TOGGLE
// Shows or hides the wallet balance when eye icon is clicked

let walletVisible = true;

function toggleWalletBalance() {
  const balanceEl = document.getElementById('walletBalance');
  const hiddenEl = document.getElementById('walletHidden');
  const toggleBtn = document.getElementById('walletBalanceToggle');

  walletVisible = !walletVisible;

  if (walletVisible) {
    balanceEl.classList.remove('hidden');
    hiddenEl.classList.add('hidden');
  } else {
    balanceEl.classList.add('hidden');
    hiddenEl.classList.remove('hidden');
  }

  updateVisibilityToggleButton(toggleBtn, walletVisible, {
    show: 'Show balance',
    hide: 'Hide balance'
  });
}


// TOP UP MODAL
// Opens and closes the wallet top up popup

let selectedTopUpAmount = 0;

function openTopUpModal() {
  const overlay = document.getElementById('topUpOverlay');
  if (!overlay) return;
  resetTopUpModal();
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden'; // prevent background scrolling
}

function closeTopUpModal() {
  const overlay = document.getElementById('topUpOverlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
  resetTopUpModal();
}

function resetTopUpModal() {
  // Reset all amount buttons
  document.querySelectorAll('.amount-btn').forEach(function (btn) {
    btn.classList.remove('selected');
  });

  // Clear custom amount input
  const customInput = document.getElementById('customAmount');
  if (customInput) customInput.value = '';

  // Reset selected amount display
  selectedTopUpAmount = 0;
  updateSelectedAmountDisplay();
}

// Called when user clicks one of the preset amount buttons (₦500, ₦1000 etc.)
function selectAmount(amount) {
  selectedTopUpAmount = amount;

  // Remove selected class from all buttons
  document.querySelectorAll('.amount-btn').forEach(function (btn) {
    btn.classList.remove('selected');
  });

  // Add selected class to clicked button
  // We find it by matching the text content
  document.querySelectorAll('.amount-btn').forEach(function (btn) {
    if (btn.textContent.includes(amount.toLocaleString())) {
      btn.classList.add('selected');
    }
  });

  // Clear custom input since a preset was chosen
  const customInput = document.getElementById('customAmount');
  if (customInput) customInput.value = '';

  updateSelectedAmountDisplay();
}

// Called when user types a custom amount
function onCustomAmount() {
  const customInput = document.getElementById('customAmount');
  const value = parseInt(customInput.value);

  // Remove selected from preset buttons since user is typing custom
  document.querySelectorAll('.amount-btn').forEach(function (btn) {
    btn.classList.remove('selected');
  });

  selectedTopUpAmount = isNaN(value) ? 0 : value;
  updateSelectedAmountDisplay();
}

// Updates the "Amount to add: ₦X" display
function updateSelectedAmountDisplay() {
  const display = document.getElementById('selectedAmountText');
  const payBtn = document.getElementById('topUpPayBtn');
  const validAmount = selectedTopUpAmount >= 100;

  if (display) {
    display.textContent = selectedTopUpAmount > 0
      ? '₦' + selectedTopUpAmount.toLocaleString()
      : '₦0';
  }

  if (payBtn) payBtn.disabled = !validAmount;
}

// Called when user clicks "Proceed to Pay"
function processTopUp() {
  if (selectedTopUpAmount < 100) {
    alert('Please select or enter a minimum amount of ₦100.');
    return;
  }

  setWalletBalance(getWalletBalance() + selectedTopUpAmount);
  recordWalletTopUp(selectedTopUpAmount);
  updateWalletDisplay();
  closeTopUpModal();
  renderWalletTransactions();
  showToast('✅ Wallet top up of ₦' + selectedTopUpAmount.toLocaleString() + ' successful!');

  if (document.getElementById('studentWalletPage')) {
    resetTopUpModal();
  }
}


// BUS REQUEST MODAL
// Opens and closes the bus request popup

function openBusRequest() {
  openPlannedFeature('Collective Bus Request');
}

function closeBusRequest() {
  const overlay = document.getElementById('busRequestOverlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
}

function submitBusRequest() {
  openPlannedFeature('Collective Bus Request');
}

// CANCEL BOOKING
// Removes the active booking and re-enables the Book a Seat button

function executeCancelBooking() {
  const savedTicket = localStorage.getItem('activeTicket');

  if (savedTicket) {
    try {
      const ticket = JSON.parse(savedTicket);
      archiveBooking(ticket, 'Cancelled');
      recordWalletRefund(ticket, 'Cancelled');
      const cancelledRef = normalizeBookingRef(ticket.ref);
      const boarded = getBoardedRefs().filter(function (r) { return r !== cancelledRef; });
      saveBoardedRefs(boarded);
    } catch (e) { /* ignore */ }
  }

  clearStudentActiveBooking();

  setWalletBalance(getWalletBalance() + BOOKING_FARE);
  updateWalletDisplay();
  refreshStudentDashboard();
  showToast('❌ Booking cancelled. ₦' + BOOKING_FARE + ' refunded to your wallet.');
}

function openCancelBookingModal() {
  const overlay = document.getElementById('cancelBookingOverlay');
  const refundEl = document.getElementById('cancelBookingRefundAmount');
  if (refundEl) refundEl.textContent = formatNaira(BOOKING_FARE);
  if (!overlay) {
    executeCancelBooking();
    return;
  }
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeCancelBookingModal() {
  const overlay = document.getElementById('cancelBookingOverlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
}

function confirmCancelBooking() {
  closeCancelBookingModal();
  executeCancelBooking();
}

function cancelBooking() {
  const savedTicket = localStorage.getItem('activeTicket');
  if (savedTicket) {
    try {
      if (!isCancelAllowedForTicket(JSON.parse(savedTicket))) {
        showToast('⚠️ Cannot cancel — the trip has already started.');
        return;
      }
    } catch (e) { /* ignore */ }
  }

  openCancelBookingModal();
}



// Cancel an existing bus request
function cancelRequest() {
  openPlannedFeature('Collective Bus Request');
}


// WALLET HISTORY — credits/debits on student-wallet.html
function renderWalletTransactions() {
  const tbody = document.getElementById('walletHistoryBody');
  const empty = document.getElementById('walletHistoryEmpty');
  if (!tbody) return;

  syncWalletTransactionsFromBookingHistory();
  const transactions = getWalletTransactions();

  if (transactions.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');

  tbody.innerHTML = transactions.map(function (tx) {
    const isCredit = tx.type === 'credit';
    const typeLabel = isCredit ? 'Credit' : 'Debit';
    const amountStr = (isCredit ? '+' : '−') + '₦' + Number(tx.amount).toLocaleString('en-NG');

    return '<tr>' +
      '<td>' + formatHistoryDate(tx.date) + '</td>' +
      '<td>' + tx.description + '</td>' +
      '<td class="ref-col">' + tx.ref + '</td>' +
      '<td>' + amountStr + '</td>' +
      '<td><span class="table-badge ' + (isCredit ? 'badge--success' : 'badge--cancelled') + '">' + typeLabel + '</span></td>' +
      '</tr>';
  }).join('');
}

function openWalletHistory() {
  if (document.getElementById('walletHistorySection')) {
    document.getElementById('walletHistorySection').scrollIntoView({ behavior: 'smooth' });
    return;
  }
  window.location.href = 'student-wallet.html#history';
}

function openWallet() {
  if (document.getElementById('topUpOverlay')) {
    openTopUpModal();
    return;
  }
  if (document.getElementById('studentWalletPage')) {
    const topUp = document.getElementById('walletTopUpSection');
    if (topUp) topUp.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  window.location.href = 'student-wallet.html';
}

function initStudentWalletPage() {
  setCurrentDate();
  updateWalletDisplay();
  renderWalletTransactions();
  resetTopUpModal();

  const hash = window.location.hash;
  if (hash === '#history') {
    const section = document.getElementById('walletHistorySection');
    if (section) section.scrollIntoView({ behavior: 'smooth' });
  } else if (hash === '#topup') {
    const section = document.getElementById('walletTopUpSection');
    if (section) section.scrollIntoView({ behavior: 'smooth' });
  }

  initStudentWalletSync();
}

function initStudentWalletSync() {
  window.addEventListener('storage', function (e) {
    if (
      e.key === WALLET_BALANCE_KEY ||
      e.key === WALLET_TRANSACTIONS_KEY ||
      e.key === BOOKING_HISTORY_KEY
    ) {
      updateWalletDisplay();
      renderWalletTransactions();
    }
  });
  window.addEventListener('focus', function () {
    updateWalletDisplay();
    renderWalletTransactions();
  });
}


// NOTIFICATIONS PANEL
// Opens and closes the sliding notification panel

function toggleNotifications() {
  openPlannedFeature('Notifications');
}


// USER MENU TOGGLE
function toggleUserMenu() {
  openPlannedFeature('Account Settings');
}


// TOAST NOTIFICATION
// A small pop-up message that appears and disappears automatically
// Used to confirm actions like top up, bus request etc.

function showToast(message) {
  const existing = document.getElementById('toastMsg');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'toastMsg';
  toast.className = 'toast-msg';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(function () {
    toast.style.opacity = '0';
    setTimeout(function () { toast.remove(); }, 300);
  }, 3000);
}


// CHECK IF STUDENT HAS AN ACTIVE BOOKING
// If yes, disable the Book a Seat button and show a warning

function updateDashboardStat(statId, value) {
  const el = document.getElementById(statId);
  if (el) el.textContent = value;
}

const WALLET_BALANCE_KEY = 'walletBalance';
const WALLET_TRANSACTIONS_KEY = 'walletTransactions';
const BOOKING_HISTORY_KEY = 'bookingHistory';
const DEFAULT_WALLET_BALANCE = 2500;
const BOOKING_FARE = 600;

function getWalletBalance() {
  const stored = localStorage.getItem(WALLET_BALANCE_KEY);
  return stored !== null ? parseFloat(stored) : DEFAULT_WALLET_BALANCE;
}

function setWalletBalance(amount) {
  localStorage.setItem(WALLET_BALANCE_KEY, String(Math.max(0, amount)));
}

function getWalletTransactions() {
  try {
    return JSON.parse(localStorage.getItem(WALLET_TRANSACTIONS_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveWalletTransactions(list) {
  localStorage.setItem(WALLET_TRANSACTIONS_KEY, JSON.stringify(list));
}

function addWalletTransaction(tx) {
  const list = getWalletTransactions();
  if (tx.id && list.some(function (t) { return t.id === tx.id; })) return;
  list.unshift({
    id: tx.id || 'tx-' + Date.now(),
    date: tx.date || new Date().toISOString(),
    description: tx.description,
    ref: tx.ref || '—',
    amount: Number(tx.amount),
    type: tx.type
  });
  saveWalletTransactions(list);
}

function recordWalletTopUp(amount) {
  const methodEl = document.querySelector('input[name="payMethod"]:checked');
  const method = methodEl ? methodEl.value : 'paystack';
  const label = method === 'flutterwave' ? 'Flutterwave' : 'Paystack';
  addWalletTransaction({
    id: 'topup-' + Date.now(),
    description: 'Wallet top up via ' + label,
    ref: 'TOP-' + Date.now().toString(36).toUpperCase(),
    amount: amount,
    type: 'credit'
  });
}

function recordWalletBookingDebit(ticket) {
  if (!ticket || !ticket.ref) return;
  addWalletTransaction({
    id: 'debit-' + normalizeBookingRef(ticket.ref),
    description: 'Bus booking — ' + ticket.bus + ', Seat ' + ticket.seat,
    ref: ticket.ref,
    amount: ticket.fare || BOOKING_FARE,
    type: 'debit'
  });
}

function recordWalletRefund(ticket, status) {
  if (!ticket || !ticket.ref) return;
  addWalletTransaction({
    id: 'refund-' + normalizeBookingRef(ticket.ref) + '-' + status,
    description: 'Refund — ' + ticket.bus + ' (' + status + ')',
    ref: ticket.ref,
    amount: ticket.fare || BOOKING_FARE,
    type: 'credit'
  });
}

function syncWalletTransactionsFromBookingHistory() {
  if (getWalletTransactions().length > 0) return;
  const history = getBookingHistory();
  if (history.length === 0) return;

  const backfill = history.map(function (entry) {
    const isRefund = entry.status === 'Cancelled' || entry.status === 'Expired';
    return {
      id: 'hist-' + entry.ref + '-' + entry.status,
      date: entry.date,
      description: isRefund
        ? 'Refund — ' + entry.bus + ' (' + entry.status + ')'
        : 'Bus booking — ' + entry.bus + ', Seat ' + entry.seat,
      ref: entry.ref,
      amount: Number(entry.amount || BOOKING_FARE),
      type: isRefund ? 'credit' : 'debit'
    };
  });
  saveWalletTransactions(backfill);
}

function formatWalletDisplay(amount) {
  const whole = Math.floor(amount);
  const kobo = Math.round((amount - whole) * 100);
  return {
    main: '₦' + whole.toLocaleString('en-NG'),
    kobo: '.' + String(kobo).padStart(2, '0')
  };
}

function getTodayBookingDebitsTotal() {
  let total = 0;
  const today = new Date().toDateString();

  function isToday(iso) {
    if (!iso) return false;
    return new Date(iso).toDateString() === today;
  }

  if (localStorage.getItem('hasActiveBooking') === 'true') {
    try {
      const ticket = JSON.parse(localStorage.getItem('activeTicket'));
      if (ticket && isToday(ticket.bookedAt || new Date().toISOString())) {
        total += Number(ticket.fare || BOOKING_FARE);
      }
    } catch (e) { /* ignore */ }
  }

  getBookingHistory().forEach(function (entry) {
    if (isToday(entry.date)) {
      total += Number(entry.amount || BOOKING_FARE);
    }
  });

  return total;
}

function updateWalletRecentActivity() {
  const el = document.getElementById('walletRecentValue');
  if (!el) return;

  syncWalletTransactionsFromBookingHistory();
  const transactions = getWalletTransactions();
  if (transactions.length === 0) {
    el.textContent = 'No recent activity';
    return;
  }

  const latest = transactions[0];
  const isCredit = latest.type === 'credit';
  const sign = isCredit ? '+' : '−';
  const when = formatHistoryDate(latest.date);
  const today = new Date().toDateString() === new Date(latest.date).toDateString();
  el.textContent = sign + '₦' + Number(latest.amount).toLocaleString('en-NG') + ' · ' + latest.description + (today ? ' · Today' : ' · ' + when);
}

function updateWalletDisplay() {
  const balance = getWalletBalance();
  const formatted = formatWalletDisplay(balance);

  const balanceEl = document.getElementById('walletBalance');
  if (balanceEl) {
    balanceEl.innerHTML = formatted.main + '<span class="wallet-kobo">' + formatted.kobo + '</span>';
  }

  const payBalanceEl = document.querySelector('#pay-wallet .payment-choice-balance');
  if (payBalanceEl) {
    payBalanceEl.textContent = 'Balance: ' + formatNaira(balance);
  }

  updateWalletRecentActivity();
}

function getBookingPayButtonLabel() {
  return '💳 Pay ' + formatNaira(BOOKING_FARE) + ' & Confirm Booking';
}

function syncBookingFareLabels() {
  document.querySelectorAll('[data-booking-fare]').forEach(function (el) {
    el.textContent = formatNaira(BOOKING_FARE);
  });

  const payBtn = document.getElementById('payBtn');
  if (payBtn && !payBtn.classList.contains('btn-loading')) {
    payBtn.textContent = getBookingPayButtonLabel();
  }
}

function getBookingHistory() {
  try {
    return JSON.parse(localStorage.getItem(BOOKING_HISTORY_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveBookingHistory(history) {
  localStorage.setItem(BOOKING_HISTORY_KEY, JSON.stringify(history));
}

function archiveBooking(ticket, status) {
  if (!ticket || !ticket.ref) return;

  const history = getBookingHistory();
  if (history.some(function (entry) { return entry.ref === ticket.ref; })) return;

  history.unshift({
    ref: ticket.ref,
    name: ticket.name || getStudentProfileForBooking().name || '',
    reg: ticket.reg || getStudentProfileForBooking().reg || '',
    route: ticket.routeLabel || formatRouteLabel(ticket.route),
    bus: ticket.bus,
    seat: ticket.seat,
    date: ticket.bookedAt || new Date().toISOString(),
    amount: BOOKING_FARE,
    status: status
  });
  saveBookingHistory(history);
}

function clearStudentActiveBooking() {
  localStorage.removeItem('hasActiveBooking');
  localStorage.removeItem('activeTicket');
  localStorage.removeItem('boardingExpiryTime');
  sessionStorage.removeItem('activeBookingToastShown');
}

function finalizeCompletedBooking(ticket) {
  archiveBooking(ticket, 'Completed');
  const ref = normalizeBookingRef(ticket.ref);
  saveBoardedRefs(getBoardedRefs().filter(function (r) { return r !== ref; }));
  clearStudentActiveBooking();
}

function formatHistoryDate(iso) {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function isTripInProgressForStudent() {
  try {
    const trip = JSON.parse(localStorage.getItem('driverTripState'));
    return trip && (trip.status === 'moving' || trip.status === 'stopped');
  } catch (e) {
    return false;
  }
}

function isCancelAllowedForTicket(ticket) {
  if (!ticket) return false;
  if (ticket.bus === 'BUS-002' && isTripInProgressForStudent()) return false;
  return true;
}

function updateCancelBookingVisibility(ticket) {
  const cancelBtn = document.getElementById('dashCancelBookingBtn');
  if (!cancelBtn) return;
  cancelBtn.classList.toggle('hidden', !isCancelAllowedForTicket(ticket));
}

function getUpcomingBookingStatus(ticket) {
  if (ticket.bus === 'BUS-002') {
    try {
      const trip = JSON.parse(localStorage.getItem('driverTripState'));
      if (trip && trip.status === 'moving') {
        return { label: 'Trip Started', modifier: 'started' };
      }
      if (trip && trip.status === 'stopped') {
        return { label: 'At Stop', modifier: 'pending' };
      }
    } catch (e) { /* ignore */ }
    if (isBookingRefBoarded(ticket.ref)) {
      return { label: 'Boarded', modifier: 'confirmed' };
    }
  }
  return { label: 'Confirmed', modifier: 'confirmed' };
}

function updateUpcomingBookingStatus(ticket) {
  const statusEl = document.getElementById('dashBookingStatus');
  if (!statusEl || !ticket) return;

  const status = getUpcomingBookingStatus(ticket);
  statusEl.textContent = status.label;
  statusEl.className = 'booking-status booking-status--' + status.modifier;
  updateCancelBookingVisibility(ticket);
}

function enableBookSeatLinks() {
  document.querySelectorAll('a[href="booking.html"]').forEach(function (link) {
    link.style.opacity = '1';
    link.style.pointerEvents = 'auto';
    link.title = '';
  });

  const bookAction = document.querySelector('.quick-action[href="booking.html"]');
  if (bookAction) {
    bookAction.style.opacity = '1';
    bookAction.style.pointerEvents = 'auto';
  }
}

function disableBookSeatLinks() {
  document.querySelectorAll('a[href="booking.html"]').forEach(function (link) {
    if (link.id === 'viewTicketBtn') return;
    link.style.opacity = '0.5';
    link.style.pointerEvents = 'none';
    link.title = 'Board your current bus before booking another';
  });

  const bookAction = document.querySelector('.quick-action[href="booking.html"]');
  if (bookAction) {
    bookAction.style.opacity = '0.5';
    bookAction.style.pointerEvents = 'none';
  }
}

function hideUpcomingBookingUI() {
  updateDashboardStat('statUpcomingBookings', '0');
  enableBookSeatLinks();

  const noBookingState = document.getElementById('noBookingState');
  const activeBookingItem = document.getElementById('activeBookingItem');
  const viewTicketBtn = document.getElementById('viewTicketBtn');
  if (noBookingState) noBookingState.classList.remove('hidden');
  if (activeBookingItem) activeBookingItem.classList.add('hidden');
  if (viewTicketBtn) viewTicketBtn.classList.add('hidden');
}

function showUpcomingBookingUI(ticket) {
  updateDashboardStat('statUpcomingBookings', '1');
  disableBookSeatLinks();

  const noBookingState = document.getElementById('noBookingState');
  const activeBookingItem = document.getElementById('activeBookingItem');
  const viewTicketBtn = document.getElementById('viewTicketBtn');
  if (noBookingState) noBookingState.classList.add('hidden');
  if (activeBookingItem) activeBookingItem.classList.remove('hidden');
  if (viewTicketBtn) viewTicketBtn.classList.remove('hidden');

  const refEl = document.getElementById('dashBookingRef');
  const routeEl = document.querySelector('.booking-route');
  const metaEl = document.getElementById('dashBookingMeta');

  if (refEl) refEl.textContent = 'Ref: ' + ticket.ref;
  if (routeEl && ticket.route) {
    routeEl.textContent = ticket.route === 'yelwa-gubi'
      ? 'Yelwa → Gubi Campus'
      : 'Gubi → Yelwa Campus';
  }
  if (metaEl && ticket.bus && ticket.seat) {
    const when = ticket.bookedAt
      ? new Date(ticket.bookedAt).toLocaleString('en-NG', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
      : 'Today';
    metaEl.textContent = ticket.bus + ' · Seat ' + ticket.seat + ' · ' + when;
  }

  updateUpcomingBookingStatus(ticket);
}

function buildBookingHistoryRowHtml(entry) {
  const badgeClass = entry.status === 'Cancelled' || entry.status === 'Expired'
    ? 'badge--cancelled'
    : 'badge--success';
  return '<tr>' +
    '<td class="ref-col">' + entry.ref + '</td>' +
    '<td>' + entry.route + '</td>' +
    '<td>' + entry.bus + '</td>' +
    '<td>' + entry.seat + '</td>' +
    '<td>' + formatHistoryDate(entry.date) + '</td>' +
    '<td>₦' + entry.amount + '</td>' +
    '<td><span class="table-badge ' + badgeClass + '">' + entry.status + '</span></td>' +
    '</tr>';
}

const BOOKING_HISTORY_PREVIEW_LIMIT = 5;

function renderBookingHistoryTable(config) {
  const tbody = document.getElementById(config.tbodyId);
  const empty = document.getElementById(config.emptyId);
  if (!tbody) return;

  const allHistory = getBookingHistory();
  const limit = config.limit || 0;
  const history = limit > 0 ? allHistory.slice(0, limit) : allHistory;

  if (config.clearBtnId) {
    const clearBtn = document.getElementById(config.clearBtnId);
    if (clearBtn) clearBtn.classList.toggle('hidden', allHistory.length === 0);
  }

  if (config.viewAllId) {
    const viewAllWrap = document.getElementById(config.viewAllId);
    if (viewAllWrap) {
      if (allHistory.length === 0) {
        viewAllWrap.classList.add('hidden');
        viewAllWrap.classList.remove('view-all--mobile-only');
      } else if (allHistory.length <= BOOKING_HISTORY_PREVIEW_LIMIT) {
        viewAllWrap.classList.remove('hidden');
        viewAllWrap.classList.add('view-all--mobile-only');
      } else {
        viewAllWrap.classList.remove('hidden');
        viewAllWrap.classList.remove('view-all--mobile-only');
      }
    }
  }

  if (allHistory.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');
  tbody.innerHTML = history.map(buildBookingHistoryRowHtml).join('');
}

function renderBookingHistory() {
  renderBookingHistoryTable({
    tbodyId: 'bookingHistoryBody',
    emptyId: 'bookingHistoryEmpty',
    limit: BOOKING_HISTORY_PREVIEW_LIMIT,
    viewAllId: 'bookingHistoryViewAll'
  });
}

function renderStudentBookingHistoryPage() {
  renderBookingHistoryTable({
    tbodyId: 'studentHistoryBody',
    emptyId: 'studentHistoryEmpty',
    clearBtnId: 'clearHistoryBtn'
  });
}

function renderAllBookingHistoryViews() {
  renderBookingHistory();
  renderStudentBookingHistoryPage();
}

function updateTripsCompletedStat() {
  const completed = getBookingHistory().filter(function (entry) {
    return entry.status === 'Completed';
  }).length;
  updateDashboardStat('statTripsCompleted', String(completed));
}

function executeClearBookingHistory() {
  localStorage.removeItem(BOOKING_HISTORY_KEY);
  localStorage.removeItem(WALLET_TRANSACTIONS_KEY);
  renderAllBookingHistoryViews();
  renderWalletTransactions();
  updateTripsCompletedStat();
  updateWalletDisplay();
  showToast('📋 Booking history cleared.');
}

function openClearHistoryModal() {
  if (getBookingHistory().length === 0) return;

  const overlay = document.getElementById('clearHistoryOverlay');
  if (!overlay) {
    executeClearBookingHistory();
    return;
  }

  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeClearHistoryModal() {
  const overlay = document.getElementById('clearHistoryOverlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
}

function confirmClearBookingHistory() {
  closeClearHistoryModal();
  executeClearBookingHistory();
}

function clearBookingHistory() {
  openClearHistoryModal();
}

function refreshStudentDashboard() {
  if (!document.getElementById('bookingsList')) return;

  if (localStorage.getItem('hasActiveBooking') !== 'true') {
    hideUpcomingBookingUI();
  } else {
    const savedTicket = localStorage.getItem('activeTicket');
    if (savedTicket) {
      let ticket;
      try {
        ticket = JSON.parse(savedTicket);
        showUpcomingBookingUI(ticket);
      } catch (e) {
        hideUpcomingBookingUI();
      }
    } else {
      hideUpcomingBookingUI();
    }
  }

  renderAllBookingHistoryViews();
  updateTripsCompletedStat();
  updateWalletDisplay();
  renderWalletTransactions();
}

function initStudentHistorySync() {
  window.addEventListener('storage', function (e) {
    if (
      e.key === BOOKING_HISTORY_KEY ||
      e.key === WALLET_TRANSACTIONS_KEY ||
      e.key === WALLET_BALANCE_KEY
    ) {
      renderAllBookingHistoryViews();
      renderWalletTransactions();
      updateTripsCompletedStat();
    }
  });
  window.addEventListener('focus', function () {
    renderStudentBookingHistoryPage();
    updateTripsCompletedStat();
  });
}

function initStudentDashboardSync() {
  window.addEventListener('storage', function (e) {
    if (
      e.key === 'hasActiveBooking' ||
      e.key === 'activeTicket' ||
      e.key === 'driverTripState' ||
      e.key === 'driverBoardedRefs' ||
      e.key === BOOKING_HISTORY_KEY ||
      e.key === WALLET_BALANCE_KEY ||
      e.key === WALLET_TRANSACTIONS_KEY
    ) {
      refreshStudentDashboard();
      renderWalletTransactions();
    }
  });
  window.addEventListener('focus', refreshStudentDashboard);
}

function checkActiveBooking() {
  refreshStudentDashboard();

  if (
    localStorage.getItem('hasActiveBooking') === 'true' &&
    !sessionStorage.getItem('activeBookingToastShown')
  ) {
    showToast('⚠️ You have an active booking. Board your bus before booking another.');
    sessionStorage.setItem('activeBookingToastShown', '1');
  }
}

