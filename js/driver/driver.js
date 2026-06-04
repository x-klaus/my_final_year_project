// ============================================================
// ATBU SMART TRANSPORT SYSTEM
// Driver Portal — driver-dashboard.html, driver-manifest.html
// ============================================================

const DRIVER_PROFILE = {
  name: 'Abdullahi Danladi',
  firstName: 'Abdullahi',
  bus: 'BUS-002',
  busId: 'bus2',
  route: 'Yelwa → Gubi Campus',
  routeKey: 'yelwa-gubi',
  phone: '08023456789',
  totalSeats: 18
};

const DRIVER_TRIP_KEY = 'driverTripState';
const DRIVER_BOARDED_KEY = 'driverBoardedRefs';
const DRIVER_TRIPS_TODAY_KEY = 'driverTripsToday';
const DRIVER_TRIPS_LOG_KEY = 'driverTripsLog';
const DRIVER_EARNINGS_TODAY_KEY = 'driverEarningsToday';

let manifestFilter = 'all';

function getDriverEarningsToday() {
  return parseFloat(sessionStorage.getItem(DRIVER_EARNINGS_TODAY_KEY)) || 0;
}

function creditDriverEarnings(amount) {
  if (!amount || amount <= 0) return 0;
  sessionStorage.setItem(
    DRIVER_EARNINGS_TODAY_KEY,
    String(getDriverEarningsToday() + amount)
  );
  return amount;
}

function renderDriverEarningsUI() {
  localStorage.removeItem('driverEarningsBalance');

  const todayEl = document.getElementById('driverEarningsToday');
  const tripsEarnedEl = document.getElementById('tripsPageEarned');
  const tripsCountEl = document.getElementById('driverTripsEarnedCount');

  if (todayEl) todayEl.textContent = formatNaira(getDriverEarningsToday());
  if (tripsEarnedEl) tripsEarnedEl.textContent = formatNaira(getDriverEarningsToday());
  if (tripsCountEl) tripsCountEl.textContent = String(getDriverTripsToday());
}

function getDriverTripsLog() {
  try {
    return JSON.parse(sessionStorage.getItem(DRIVER_TRIPS_LOG_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveDriverTripsLog(log) {
  sessionStorage.setItem(DRIVER_TRIPS_LOG_KEY, JSON.stringify(log));
}

function formatTripLogTime(iso) {
  return new Date(iso).toLocaleString('en-NG', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function recordCompletedDriverTrip() {
  const passengers = getDriverPassengers();
  const boardedPassengers = passengers.filter(function (p) { return p.boarded; });
  const totalFare = boardedPassengers.reduce(function (sum, p) {
    return sum + (p.fare || BOOKING_FARE);
  }, 0);
  const log = getDriverTripsLog();
  log.unshift({
    tripNumber: log.length + 1,
    endedAt: new Date().toISOString(),
    route: DRIVER_PROFILE.route,
    bus: DRIVER_PROFILE.bus,
    totalFare: totalFare,
    passengers: passengers.map(function (p) {
      return {
        name: p.name,
        reg: p.reg,
        seat: p.seat,
        ref: p.ref,
        fare: p.fare || BOOKING_FARE,
        status: p.boarded ? 'Boarded' : 'No-show'
      };
    })
  });
  saveDriverTripsLog(log);
  if (totalFare > 0) creditDriverEarnings(totalFare);
  return totalFare;
}

function buildTripsTodayHtml(log) {
  if (log.length === 0) {
    return '<div class="empty-state dashboard-card" style="padding:40px 20px;">' +
      '<span class="empty-icon">🛣️</span>' +
      '<p>No completed trips yet today.</p>' +
      '<p style="font-size:0.82rem;color:#5A7499;margin-top:8px;">Trips appear here after you end a journey.</p>' +
      '</div>';
  }

  return log.map(function (trip, index) {
    const tripLabel = log.length - index;
    const rows = trip.passengers.length
      ? trip.passengers.map(function (p) {
          const badge = p.status === 'Boarded' ? 'badge--success' : 'badge--cancelled';
          return '<tr>' +
            '<td>' + p.name + '</td>' +
            '<td>' + p.reg + '</td>' +
            '<td>' + p.seat + '</td>' +
            '<td class="ref-col">' + p.ref + '</td>' +
            '<td>₦' + (p.fare || BOOKING_FARE) + '</td>' +
            '<td><span class="table-badge ' + badge + '">' + p.status + '</span></td>' +
            '</tr>';
        }).join('')
      : '<tr><td colspan="6" style="text-align:center;color:#5A7499;">No passengers recorded</td></tr>';

    const totalFare = trip.totalFare != null
      ? trip.totalFare
      : trip.passengers.filter(function (p) { return p.status === 'Boarded'; })
          .reduce(function (sum, p) { return sum + (p.fare || BOOKING_FARE); }, 0);

    return '<div class="trip-log-card">' +
      '<div class="trip-log-header">' +
      '<strong>Trip ' + tripLabel + '</strong>' +
      '<span>' + formatTripLogTime(trip.endedAt) + '</span>' +
      '</div>' +
      '<div class="trip-log-meta">' + trip.route + ' · ' + trip.bus +
      ' · <strong>Credited: ' + formatNaira(totalFare) + '</strong></div>' +
      '<div class="table-wrapper">' +
      '<table class="data-table">' +
      '<thead><tr><th>Passenger</th><th>Reg No</th><th>Seat</th><th>Ref</th><th>Fare</th><th>Status</th></tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
      '</table></div></div>';
  }).join('');
}

function renderTripsTodayPage() {
  const listEl = document.getElementById('tripsTodayList');
  const countEl = document.getElementById('tripsPageCount');
  const log = getDriverTripsLog();

  if (countEl) countEl.textContent = String(log.length);
  renderDriverEarningsUI();

  if (!listEl) return;
  listEl.innerHTML = buildTripsTodayHtml(log);
}

function initDriverTripsPage() {
  setCurrentDate();
  renderTripsTodayPage();
}

function hasVerifiedPassengers() {
  return getDriverPassengers().some(function (p) { return p.boarded; });
}

function getDriverTripsToday() {
  return parseInt(sessionStorage.getItem(DRIVER_TRIPS_TODAY_KEY), 10) || 0;
}

function incrementDriverTripsToday() {
  const next = getDriverTripsToday() + 1;
  sessionStorage.setItem(DRIVER_TRIPS_TODAY_KEY, String(next));
  return next;
}

function getDriverTripState() {
  try {
    const saved = JSON.parse(localStorage.getItem(DRIVER_TRIP_KEY));
    return Object.assign({
      status: 'idle',
      gpsConnected: true
    }, saved || {});
  } catch (e) {
    return { status: 'idle', gpsConnected: true };
  }
}

function saveDriverTripState(state) {
  const toSave = Object.assign({}, state);
  delete toSave.tripsToday;
  localStorage.setItem(DRIVER_TRIP_KEY, JSON.stringify(toSave));
}

function getBoardedRefs() {
  try {
    return JSON.parse(localStorage.getItem(DRIVER_BOARDED_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveBoardedRefs(refs) {
  localStorage.setItem(DRIVER_BOARDED_KEY, JSON.stringify(refs));
}

function getDriverPassengers() {
  if (localStorage.getItem('hasActiveBooking') !== 'true') {
    return [];
  }

  const activeTicket = localStorage.getItem('activeTicket');
  if (!activeTicket) return [];

  try {
    const ticket = JSON.parse(activeTicket);
    if (ticket.bus !== DRIVER_PROFILE.bus) return [];

    const ref = normalizeBookingRef(ticket.ref);
    const boarded = getBoardedRefs();
    return [{
      ref: ticket.ref,
      name: ticket.name || 'Passenger',
      reg: ticket.reg || '—',
      seat: ticket.seat || '—',
      bus: DRIVER_PROFILE.bus,
      fare: ticket.fare || BOOKING_FARE,
      boarded: boarded.indexOf(ref) !== -1
    }];
  } catch (e) {
    return [];
  }
}

function isTripInProgress() {
  const trip = getDriverTripState();
  return trip.status === 'moving' || trip.status === 'stopped';
}

function isBusFullyBookedAndConfirmed() {
  const passengers = getDriverPassengers();
  return passengers.length >= DRIVER_PROFILE.totalSeats &&
    passengers.every(function (p) { return p.boarded; });
}

function isDriverVerificationLocked() {
  return isTripInProgress() && isBusFullyBookedAndConfirmed();
}

function isDriverGpsLockedOff() {
  const trip = getDriverTripState();
  return isTripInProgress() && trip.gpsConnected;
}

function syncDriverBusToTrackingMap() {
  if (typeof busData === 'undefined') return;
  const trip = getDriverTripState();
  const bus = busData[DRIVER_PROFILE.busId];
  if (!bus) return;

  bus.status = trip.status;
  if (typeof refreshBusMarkerPopup === 'function') {
    refreshBusMarkerPopup(DRIVER_PROFILE.busId);
  }
  if (typeof syncTrackingPanelFromBusData === 'function') {
    syncTrackingPanelFromBusData();
  }
}

function getDriverStatusLabel(status) {
  if (status === 'moving') return 'Moving';
  if (status === 'stopped') return 'At Stop';
  return 'Idle';
}

function getDriverStatusHint(status) {
  if (status === 'idle') {
    return 'Set status to <strong>Idle</strong> when waiting at campus. Passengers can book only while idle.';
  }
  if (status === 'stopped') {
    return 'You are <strong>At Stop</strong>. Drop off passengers, then tap <strong>Continue Trip</strong> to resume.';
  }
  return 'Trip is <strong>in progress</strong>. No new bookings until you end the trip and return to Idle.';
}

function renderDriverTripUI() {
  const trip = getDriverTripState();
  const badge = document.getElementById('driverTripBadge');
  const hint = document.getElementById('driverStatusHint');
  const manifestStatus = document.getElementById('manifestTripStatus');

  if (badge) {
    badge.textContent = getDriverStatusLabel(trip.status);
    badge.className = 'trip-status-badge trip-status-badge--' + trip.status;
  }
  if (hint) hint.innerHTML = getDriverStatusHint(trip.status);
  if (manifestStatus) manifestStatus.textContent = getDriverStatusLabel(trip.status);

  const verified = hasVerifiedPassengers();
  const status = trip.status;
  const idleBtn = document.getElementById('btnStatusIdle');
  const stoppedBtn = document.getElementById('btnStatusStopped');
  const movingBtn = document.getElementById('btnStatusMoving');

  if (idleBtn) {
    idleBtn.classList.toggle('status-btn--active', status === 'idle');
    idleBtn.disabled = true;
  }

  if (movingBtn) {
    movingBtn.classList.toggle('status-btn--active', status === 'moving');
    movingBtn.disabled = status !== 'idle' || !verified;
  }

  if (stoppedBtn) {
    stoppedBtn.classList.remove('status-btn--resume');
    if (status === 'stopped') {
      stoppedBtn.textContent = '🚌 Continue Trip';
      stoppedBtn.classList.remove('status-btn--active');
      stoppedBtn.classList.add('status-btn--resume');
      stoppedBtn.disabled = false;
    } else if (status === 'moving') {
      stoppedBtn.textContent = '🛑 At Stop';
      stoppedBtn.classList.remove('status-btn--active', 'status-btn--resume');
      stoppedBtn.disabled = false;
    } else {
      stoppedBtn.textContent = '🛑 At Stop';
      stoppedBtn.classList.remove('status-btn--active', 'status-btn--resume');
      stoppedBtn.disabled = true;
    }
  }

  const gpsCard = document.getElementById('gpsStatusCard');
  const gpsDot = document.getElementById('gpsDot');
  const gpsText = document.getElementById('gpsStatusText');
  if (gpsDot) {
    gpsDot.className = 'gps-dot ' + (trip.gpsConnected ? 'gps-dot--on' : 'gps-dot--off');
  }
  if (gpsText) {
    gpsText.textContent = trip.gpsConnected
      ? 'Connected — location sharing active'
      : 'Disconnected — turn on GPS to share location';
  }
  if (gpsCard) {
    gpsCard.classList.toggle('gps-status-card--off', !trip.gpsConnected);
    gpsCard.classList.toggle('gps-status-card--locked', isDriverGpsLockedOff());
  }

  const gpsToggleBtn = document.getElementById('gpsToggleBtn');
  if (gpsToggleBtn) {
    if (isDriverGpsLockedOff()) {
      gpsToggleBtn.disabled = true;
      gpsToggleBtn.textContent = 'Locked';
    } else {
      gpsToggleBtn.disabled = false;
      gpsToggleBtn.textContent = trip.gpsConnected ? 'Turn Off' : 'Turn On';
    }
  }

  applyDriverFeatureLocks();

  const endBtn = document.getElementById('btnEndTrip');
  if (endBtn) {
    endBtn.disabled = status !== 'moving' && status !== 'stopped';
  }
}

function renderDriverStats() {
  const passengers = getDriverPassengers();
  const boarded = passengers.filter(function (p) { return p.boarded; }).length;
  const booked = passengers.length;
  const seatsLeft = DRIVER_PROFILE.totalSeats - booked;

  const elBooked = document.getElementById('driverStatBooked');
  const elBoarded = document.getElementById('driverStatBoarded');
  const elSeats = document.getElementById('driverStatSeatsLeft');
  const elTrips = document.getElementById('driverStatTrips');
  const elFilled = document.getElementById('manifestSeatsFilled');

  if (elBooked) elBooked.textContent = booked;
  if (elBoarded) elBoarded.textContent = boarded;
  if (elSeats) elSeats.textContent = Math.max(0, seatsLeft);
  if (elTrips) elTrips.textContent = getDriverTripsToday();
  if (elFilled) elFilled.textContent = booked + ' / ' + DRIVER_PROFILE.totalSeats;
}

function renderPassengerRow(p, showActions) {
  const statusBadge = p.boarded
    ? '<span class="table-badge badge--success">Boarded</span>'
    : '<span class="table-badge badge--pending">Pending</span>';

  let actionCell = '—';
  if (showActions && isDriverVerificationLocked()) {
    actionCell = '<span style="color:#5A7499;font-size:0.82rem;">Closed until trip ends</span>';
  } else if (showActions && !p.boarded) {
    actionCell = '<button class="btn btn-outline btn-sm table-action-btn" onclick="openDriverScanModalForRef(\'' +
      p.ref + '\')">Verify</button>';
  } else if (showActions && p.boarded) {
    actionCell = '<span style="color:#1A9E5C;font-size:0.82rem;">✓ Done</span>';
  }

  return '<tr data-status="' + (p.boarded ? 'boarded' : 'pending') + '">' +
    '<td>' + p.name + '</td>' +
    (showActions ? '<td>' + p.reg + '</td>' : '') +
    '<td>' + p.seat + '</td>' +
    '<td class="ref-col">' + p.ref + '</td>' +
    '<td>' + statusBadge + '</td>' +
    (showActions ? '<td>' + actionCell + '</td>' : '') +
    '</tr>';
}

function renderDriverPreview() {
  const tbody = document.getElementById('driverPreviewBody');
  if (!tbody) return;

  const passengers = getDriverPassengers().slice(0, 5);
  if (passengers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#5A7499;">No bookings yet.</td></tr>';
    return;
  }
  tbody.innerHTML = passengers.map(function (p) {
    return renderPassengerRow(p, false);
  }).join('');
}

function renderManifestTable() {
  const tbody = document.getElementById('manifestTableBody');
  const empty = document.getElementById('manifestEmpty');
  if (!tbody) return;

  let passengers = getDriverPassengers();
  if (manifestFilter === 'pending') {
    passengers = passengers.filter(function (p) { return !p.boarded; });
  } else if (manifestFilter === 'boarded') {
    passengers = passengers.filter(function (p) { return p.boarded; });
  }

  if (passengers.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');
  tbody.innerHTML = passengers.map(function (p) {
    return renderPassengerRow(p, true);
  }).join('');
}

function getDriverBoardedCount() {
  return getDriverPassengers().filter(function (p) { return p.boarded; }).length;
}

function isDriverBusFullForTrip() {
  return getDriverBoardedCount() >= DRIVER_PROFILE.totalSeats;
}

let driverTripConfirmAction = null;

function openDriverTripConfirmModal(options) {
  const overlay = document.getElementById('driverTripConfirmOverlay');
  const modal = document.getElementById('driverTripConfirmModal');
  const titleEl = document.getElementById('driverTripConfirmTitle');
  const messageEl = document.getElementById('driverTripConfirmMessage');
  const confirmBtn = document.getElementById('driverTripConfirmBtn');
  if (!overlay || !titleEl || !messageEl || !confirmBtn) return;

  driverTripConfirmAction = options.onConfirm || null;
  titleEl.textContent = options.title || 'Confirm';
  messageEl.textContent = options.message || '';
  confirmBtn.textContent = options.confirmLabel || 'Confirm';

  if (modal) {
    modal.classList.toggle('driver-trip-confirm--warning', options.variant === 'warning');
  }
  if (options.variant === 'warning') {
    confirmBtn.className = 'btn btn-primary';
  } else {
    confirmBtn.className = 'btn btn-primary';
  }

  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeDriverTripConfirmModal() {
  const overlay = document.getElementById('driverTripConfirmOverlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
  driverTripConfirmAction = null;
}

function executeDriverTripConfirm() {
  const action = driverTripConfirmAction;
  closeDriverTripConfirmModal();
  if (action) action();
}

function confirmStartDriverTrip() {
  const trip = getDriverTripState();
  if (trip.status !== 'idle') return;

  if (!hasVerifiedPassengers()) {
    showToast('⚠️ Verify at least one passenger booking before starting the trip.');
    return;
  }

  const boarded = getDriverBoardedCount();
  const total = DRIVER_PROFILE.totalSeats;

  if (isDriverBusFullForTrip()) {
    openDriverTripConfirmModal({
      title: 'Start Trip?',
      message: 'All ' + total + ' passenger seats are filled. Confirm you are ready to depart.',
      confirmLabel: 'Start Trip',
      onConfirm: function () { setDriverTripStatus('moving'); }
    });
    return;
  }

  openDriverTripConfirmModal({
    title: '⚠️ Bus Not Full',
    message: 'Only ' + boarded + ' of ' + total + ' passengers are boarded. Are you sure you want to start the trip before the bus is full?',
    confirmLabel: 'Start Trip Anyway',
    variant: 'warning',
    onConfirm: function () { setDriverTripStatus('moving'); }
  });
}

function confirmEndDriverTrip() {
  const trip = getDriverTripState();
  if (trip.status !== 'moving' && trip.status !== 'stopped') return;

  openDriverTripConfirmModal({
    title: 'End Trip & Reset?',
    message: 'This will end the current trip and reset the bus to Idle. Active passengers will be cleared and new bookings can begin. Do you want to continue?',
    confirmLabel: 'Yes, End Trip',
    onConfirm: function () { endDriverTrip(true); }
  });
}

function toggleDriverStopStatus() {
  const trip = getDriverTripState();

  if (trip.status === 'moving') {
    trip.status = 'stopped';
    saveDriverTripState(trip);
    syncDriverBusToTrackingMap();
    renderDriverTripUI();
    showToast('🛑 At stop — tap Continue Trip when ready to resume.');
    return;
  }

  if (trip.status === 'stopped') {
    trip.status = 'moving';
    saveDriverTripState(trip);
    syncDriverBusToTrackingMap();
    renderDriverTripUI();
    showToast('🚌 Trip resumed — continuing route.');
    return;
  }

  showToast('⚠️ At Stop is available only while a trip is in progress.');
}

function setDriverTripStatus(status) {
  const trip = getDriverTripState();

  if (status === 'idle') {
    showToast('⚠️ Use End Trip & Reset to return to Idle.');
    return;
  }

  if (status === 'moving') {
    if (trip.status === 'stopped') {
      trip.status = 'moving';
      saveDriverTripState(trip);
      syncDriverBusToTrackingMap();
      renderDriverTripUI();
      showToast('🚌 Trip resumed — continuing route.');
      return;
    }
    if (trip.status !== 'idle' || !hasVerifiedPassengers()) {
      showToast('⚠️ Verify at least one passenger booking before starting the trip.');
      return;
    }
  }

  if (status === 'stopped') {
    if (trip.status !== 'moving') {
      showToast('⚠️ At Stop is available only while a trip is in progress.');
      return;
    }
  }

  trip.status = status;
  saveDriverTripState(trip);
  syncDriverBusToTrackingMap();
  renderDriverTripUI();
  showToast('🚌 Trip status updated to ' + getDriverStatusLabel(status));
}

function completeTripForStudents() {
  if (localStorage.getItem('hasActiveBooking') !== 'true') return;

  const saved = localStorage.getItem('activeTicket');
  if (!saved) return;

  try {
    const ticket = JSON.parse(saved);
    if (ticket.bus !== DRIVER_PROFILE.bus) return;
    finalizeCompletedBooking(ticket);
  } catch (e) { /* ignore */ }
}

function endDriverTrip(confirmed) {
  const trip = getDriverTripState();
  if (trip.status !== 'moving' && trip.status !== 'stopped') return;

  if (!confirmed) {
    confirmEndDriverTrip();
    return;
  }

  const tripCredit = recordCompletedDriverTrip();
  completeTripForStudents();

  trip.status = 'idle';
  saveDriverTripState(trip);
  incrementDriverTripsToday();
  syncDriverBusToTrackingMap();
  renderDriverTripUI();
  renderDriverStats();
  renderDriverEarningsUI();

  if (tripCredit > 0) {
    showToast('✅ Trip ended. ' + formatNaira(tripCredit) + ' added to today\'s earnings.');
  } else {
    showToast('✅ Trip ended. Bus is now Idle.');
  }
}

function applyDriverFeatureLocks() {
  const scanLocked = isDriverVerificationLocked();

  document.querySelectorAll('[data-driver-scan]').forEach(function (el) {
    el.classList.toggle('driver-action--locked', scanLocked);
    el.setAttribute('aria-disabled', scanLocked ? 'true' : 'false');
  });

  const manifestScanBtn = document.getElementById('manifestScanBtn');
  if (manifestScanBtn) {
    manifestScanBtn.classList.toggle('driver-action--locked', scanLocked);
    manifestScanBtn.setAttribute('aria-disabled', scanLocked ? 'true' : 'false');
    manifestScanBtn.onclick = scanLocked
      ? function (e) {
          e.preventDefault();
          showToast('⚠️ Bus is full. Boarding verification is closed until the trip ends.');
        }
      : null;
  }
}

function toggleDriverGps() {
  if (isDriverGpsLockedOff()) {
    showToast('⚠️ GPS must stay on until the trip ends.');
    return;
  }

  const trip = getDriverTripState();
  trip.gpsConnected = !trip.gpsConnected;
  saveDriverTripState(trip);
  renderDriverTripUI();
  showToast(trip.gpsConnected ? '📍 GPS connected' : '📍 GPS disconnected');
}

function markPassengerBoarded(ref) {
  if (isDriverVerificationLocked()) {
    showToast('⚠️ Bus is full. Boarding verification is closed until the trip ends.');
    return false;
  }

  ref = normalizeBookingRef(ref);
  const passengers = getDriverPassengers();
  const passenger = passengers.find(function (p) {
    return normalizeBookingRef(p.ref) === ref;
  });

  if (!passenger) {
    showToast('⚠️ Booking not found on this bus.');
    return false;
  }
  if (passenger.boarded) {
    showToast('This passenger is already boarded.');
    return false;
  }

  const boarded = getBoardedRefs();
  boarded.push(ref);
  saveBoardedRefs(boarded);

  renderDriverStats();
  renderDriverPreview();
  renderManifestTable();
  renderDriverTripUI();
  showToast('✅ ' + passenger.name + ' boarded successfully (Seat ' + passenger.seat + ')');
  return true;
}

function ensureDriverScanModal() {
  if (document.getElementById('driverScanOverlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'driverScanOverlay';
  overlay.className = 'modal-overlay hidden';
  overlay.innerHTML =
    '<div class="modal" onclick="event.stopPropagation()">' +
      '<div class="modal-header">' +
        '<h3>📱 Scan Boarding QR</h3>' +
        '<button type="button" class="modal-close" onclick="closeDriverScanModal()" aria-label="Close">✕</button>' +
      '</div>' +
      '<div class="modal-body">' +
        '<p class="modal-desc">Enter the booking reference from the student\'s QR code to verify and mark them as boarded.</p>' +
        '<div class="form-group">' +
          '<label for="scanRefInput">Booking Reference</label>' +
          '<div class="input-wrapper">' +
            '<span class="input-icon">🎫</span>' +
            '<input type="text" id="scanRefInput" placeholder="e.g. #ATB-51491" autocomplete="off"/>' +
          '</div>' +
        '</div>' +
        '<div class="form-error hidden" id="scanError">' +
          '<span>⚠️</span>' +
          '<span id="scanErrorText">Booking not found.</span>' +
        '</div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button type="button" class="btn btn-outline" onclick="closeDriverScanModal()">Cancel</button>' +
        '<button type="button" class="btn btn-primary" id="scanVerifyBtn" onclick="verifyPassengerQR()" disabled>Verify &amp; Board</button>' +
      '</div>' +
    '</div>';

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeDriverScanModal();
  });

  document.body.appendChild(overlay);
  initDriverScanModal();
}

function prefillDriverScanRef(ref) {
  const input = document.getElementById('scanRefInput');
  if (!input) return;
  input.value = ref ? String(ref).replace(/^#/, '') : '';
  input.focus();
  updateScanVerifyButton();
  const err = document.getElementById('scanError');
  if (err) err.classList.add('hidden');
}

function openDriverScanModal(event) {
  if (event) event.preventDefault();
  openDriverScanModalForRef('');
}

function updateScanVerifyButton() {
  const input = document.getElementById('scanRefInput');
  const btn = document.getElementById('scanVerifyBtn');
  if (!input || !btn) return;
  btn.disabled = input.value.trim().length === 0;
}

function initDriverScanModal() {
  const input = document.getElementById('scanRefInput');
  if (!input || input.dataset.bound === 'true') return;
  input.dataset.bound = 'true';
  input.addEventListener('input', updateScanVerifyButton);
  updateScanVerifyButton();
}

function openDriverScanModalForRef(ref) {
  if (isDriverVerificationLocked()) {
    showToast('⚠️ Bus is full. Boarding verification is closed until the trip ends.');
    return;
  }

  if (document.getElementById('driverScanPage')) {
    prefillDriverScanRef(ref);
    return;
  }

  var url = 'driver-scan.html';
  if (ref) {
    url += '?ref=' + encodeURIComponent(String(ref).replace(/^#/, ''));
  }
  window.location.href = url;
}

function closeDriverScanModal() {
  const overlay = document.getElementById('driverScanOverlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
}

function verifyPassengerQR() {
  const input = document.getElementById('scanRefInput');
  const err = document.getElementById('scanError');
  const errText = document.getElementById('scanErrorText');
  if (!input) return;

  const ref = normalizeBookingRef(input.value);
  if (!ref || ref === '#') {
    if (errText) errText.textContent = 'Please enter a booking reference.';
    if (err) err.classList.remove('hidden');
    return;
  }

  const ok = markPassengerBoarded(ref);
  if (ok) {
    if (document.getElementById('driverScanPage')) {
      input.value = '';
      updateScanVerifyButton();
      if (err) err.classList.add('hidden');
    } else {
      closeDriverScanModal();
    }
  } else {
    if (errText) errText.textContent = 'Booking not found on BUS-002 or already boarded.';
    if (err) err.classList.remove('hidden');
  }
}

function filterManifest(filter, btn) {
  manifestFilter = filter;
  document.querySelectorAll('.manifest-filters .map-btn').forEach(function (b) {
    b.classList.remove('active');
  });
  if (btn) btn.classList.add('active');
  renderManifestTable();
}

function refreshDriverBookingUI() {
  renderDriverStats();
  renderDriverPreview();
  renderManifestTable();
  renderDriverTripUI();
}

function initDriverCrossTabSync() {
  window.addEventListener('storage', function (e) {
    if (
      e.key === 'activeTicket' ||
      e.key === 'hasActiveBooking' ||
      e.key === DRIVER_BOARDED_KEY
    ) {
      refreshDriverBookingUI();
      syncDriverBusToTrackingMap();
    }
  });
  window.addEventListener('focus', refreshDriverBookingUI);
}

function initDriverDashboard() {
  setCurrentDate();
  setGreeting();
  syncDriverBusToTrackingMap();
  renderDriverTripUI();
  refreshDriverBookingUI();
  renderDriverEarningsUI();
  initDriverScanModal();
  initDriverCrossTabSync();
}

function initDriverManifest() {
  setCurrentDate();
  manifestFilter = 'all';
  if (window.location.hash === '#pending') manifestFilter = 'pending';
  else if (window.location.hash === '#boarded') manifestFilter = 'boarded';

  const busEl = document.getElementById('manifestBus');
  const routeEl = document.getElementById('manifestRoute');
  if (busEl) busEl.textContent = DRIVER_PROFILE.bus;
  if (routeEl) routeEl.textContent = DRIVER_PROFILE.route;

  document.querySelectorAll('.manifest-filters .map-btn').forEach(function (btn) {
    btn.classList.remove('active');
    const label = btn.textContent.trim();
    if (manifestFilter === 'all' && label === 'All') btn.classList.add('active');
    if (manifestFilter === 'pending' && label === 'Pending') btn.classList.add('active');
    if (manifestFilter === 'boarded' && label === 'Boarded') btn.classList.add('active');
  });

  renderDriverTripUI();
  refreshDriverBookingUI();
  applyDriverFeatureLocks();
  initDriverScanModal();
  initDriverCrossTabSync();
}

let driverMapRefreshInterval = null;

function createDriverBusPopup(bus) {
  const statusText = bus.status === 'moving' ? 'Moving' :
    bus.status === 'stopped' ? 'At Stop' : 'Idle';

  return '<div style="font-family:\'DM Sans\',sans-serif;padding:8px;min-width:180px;">' +
    '<div style="font-family:\'Sora\',sans-serif;font-weight:700;font-size:1rem;color:#0B2545;margin-bottom:8px;">' +
    '🚌 Your Bus · ' + bus.name + '</div>' +
    '<div style="font-size:0.82rem;color:#5A7499;margin-bottom:4px;">📍 ' + bus.location + '</div>' +
    '<div style="font-size:0.82rem;color:#5A7499;margin-bottom:8px;">🛣️ ' + bus.route + '</div>' +
    '<div style="font-size:0.78rem;color:#2176FF;font-weight:600;">Status: ' + statusText + '</div>' +
    '</div>';
}

function addCampusMarkersToMap(map) {
  const campusIcon = L.divIcon({
    className: '',
    html: '<div style="background:#CC3333;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });

  L.marker([YELWA_CAMPUS.lat, YELWA_CAMPUS.lng], { icon: campusIcon })
    .addTo(map)
    .bindPopup('<strong>📍 Yelwa Campus</strong><br/><small>Main Bus Stop</small>');

  L.marker([GUBI_CAMPUS.lat, GUBI_CAMPUS.lng], { icon: campusIcon })
    .addTo(map)
    .bindPopup('<strong>📍 Gubi Campus</strong><br/><small>Main Bus Stop</small>');
}

function drawRouteLineOnMap(map) {
  L.polyline([
    [YELWA_CAMPUS.lat, YELWA_CAMPUS.lng],
    [10.2980, 9.8470],
    [10.2870, 9.8535],
    [GUBI_CAMPUS.lat, GUBI_CAMPUS.lng]
  ], {
    color: '#2176FF',
    weight: 4,
    opacity: 0.55,
    dashArray: '8, 8'
  }).addTo(map);
}

function initDriverMap() {
  const mapDiv = document.getElementById('driverMap');
  if (!mapDiv) return;

  syncDriverBusToTrackingMap();
  const bus = busData[DRIVER_PROFILE.busId];
  if (!bus) return;

  driverMap = L.map('driverMap', {
    center: [bus.lat, bus.lng],
    zoom: 15,
    zoomControl: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(driverMap);

  addCampusMarkersToMap(driverMap);
  drawRouteLineOnMap(driverMap);

  const busIcon = L.divIcon({
    className: '',
    html: '<div style="background:' + bus.color + ';color:white;padding:6px 12px;border-radius:20px;font-family:\'Sora\',sans-serif;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.25);border:3px solid white;">🚌 You · ' + bus.name + '</div>',
    iconSize: [100, 32],
    iconAnchor: [50, 16]
  });

  driverBusMarker = L.marker([bus.lat, bus.lng], { icon: busIcon })
    .addTo(driverMap)
    .bindPopup(createDriverBusPopup(bus));

  driverMap.setView([bus.lat, bus.lng], 15);
}

function updateDriverMapPanel() {
  if (!document.getElementById('driverMapPage')) return;

  const trip = getDriverTripState();
  const bus = busData[DRIVER_PROFILE.busId];
  const passengers = getDriverPassengers().filter(function (p) { return p.boarded; });

  const statusEl = document.getElementById('driverMapTripStatus');
  const locationEl = document.getElementById('driverMapLocation');
  const passengersEl = document.getElementById('driverMapPassengers');
  const nextStopEl = document.getElementById('driverMapNextStop');
  const gpsText = document.getElementById('driverMapGpsText');
  const gpsDot = document.getElementById('driverMapGpsDot');
  const gpsBar = document.getElementById('driverMapGpsBar');

  if (statusEl) statusEl.textContent = getDriverStatusLabel(trip.status);
  if (locationEl && bus) locationEl.textContent = bus.location;
  if (passengersEl) passengersEl.textContent = String(passengers.length);
  if (nextStopEl) {
    nextStopEl.textContent = trip.status === 'moving' || trip.status === 'stopped'
      ? 'Gubi Campus'
      : 'Awaiting departure';
  }
  if (gpsText) {
    gpsText.textContent = trip.gpsConnected
      ? 'GPS connected — sharing location'
      : 'GPS off — turn on from dashboard';
  }
  if (gpsDot) {
    gpsDot.className = trip.gpsConnected ? 'live-dot-green' : 'live-dot-red';
  }
  if (gpsBar) {
    gpsBar.classList.toggle('live-status-bar--off', !trip.gpsConnected);
  }

  if (driverBusMarker && bus) {
    driverBusMarker.setLatLng([bus.lat, bus.lng]);
    driverBusMarker.setPopupContent(createDriverBusPopup(bus));
  }
}

function refreshDriverMapPosition() {
  const btn = document.getElementById('refreshDriverMapBtn');
  if (btn) btn.classList.add('map-btn--refreshing');

  applyBusPositionUpdates(3);
  updateDriverMapPanel();
  showToast('📍 Route position updated');

  setTimeout(function () {
    if (btn) btn.classList.remove('map-btn--refreshing');
  }, 900);
}

function initDriverScanPage() {
  setCurrentDate();

  const routeEl = document.getElementById('driverScanRoute');
  if (routeEl) routeEl.textContent = DRIVER_PROFILE.route;

  const locked = isDriverVerificationLocked();
  const lockHint = document.getElementById('driverScanLockHint');
  if (lockHint) lockHint.hidden = !locked;

  const input = document.getElementById('scanRefInput');
  const verifyBtn = document.getElementById('scanVerifyBtn');
  if (locked) {
    if (input) input.disabled = true;
    if (verifyBtn) verifyBtn.disabled = true;
  } else {
    initDriverScanModal();
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) prefillDriverScanRef(ref);
    else if (input) input.focus();
  }
}

function initDriverMapPage() {
  setCurrentDate();
  applyDriverFeatureLocks();
  initDriverMap();
  updateDriverMapPanel();

  if (driverMapRefreshInterval) clearInterval(driverMapRefreshInterval);
  driverMapRefreshInterval = setInterval(function () {
    applyBusPositionUpdates(1);
  }, 5000);
}

if (document.getElementById('driverMapPage')) {
  window.addEventListener('load', function () {
    initDriverMapPage();
  });
}
