// ============================================================
// ATBU SMART TRANSPORT SYSTEM
// Booking Page JavaScript
// Handles: step navigation, route selection, bus selection,
// seat map generation, payment simulation, QR code generation,
// boarding countdown timer, and departure timer.
// Add this to the bottom of your main.js file.
// ============================================================


// BOOKING STATE
// Tracks everything the user has selected during the booking flow

const bookingState = {
  currentStep:     1,
  selectedRoute:   null,   // 'yelwa-gubi' or 'gubi-yelwa'
  selectedBus:     null,   // bus object
  selectedSeat:    null,   // e.g. '5A'
  paymentMethod:   'wallet', // 'wallet', 'paystack', 'flutterwave'
  trackingBusId:   null    // set when booking started from map (bus1–bus4)
};

function setStepButtonEnabled(btnId, enabled) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = !enabled;
  btn.style.opacity = enabled ? '1' : '0.45';
}

function formatRouteLabel(routeKey) {
  return routeKey === 'yelwa-gubi' ? 'Yelwa → Gubi' : 'Gubi → Yelwa';
}

function findBusInRoute(routeKey, busName) {
  const buses = bookingBuses[routeKey] || [];
  return buses.find(function (b) { return b.name === busName; }) || null;
}

function updateDriverContactUI(driver, prefix) {
  if (!driver) return;

  const name = driver.name || '—';
  const phone = driver.phone || '';
  const intlPhone = phone ? '234' + phone.substring(1) : '';

  const avatarEl = document.getElementById(prefix + 'DriverAvatar');
  const nameEl = document.getElementById(prefix + 'DriverName');
  const phoneEl = document.getElementById(prefix + 'DriverPhone');
  const callBtn = document.getElementById(prefix + 'CallBtn');
  const whatsappBtn = document.getElementById(prefix + 'WhatsAppBtn');

  if (avatarEl) avatarEl.textContent = getDriverInitials(name);
  if (nameEl) nameEl.textContent = name;
  if (phoneEl) phoneEl.textContent = phone ? '📞 ' + phone : '📞 —';
  if (callBtn) callBtn.href = phone ? 'tel:' + phone : '#';
  if (whatsappBtn) whatsappBtn.href = intlPhone ? 'https://wa.me/' + intlPhone : '#';
}

function getStudentProfileForBooking() {
  try {
    const saved = JSON.parse(localStorage.getItem('studentProfile'));
    if (saved && saved.name) return saved;
  } catch (e) { /* ignore */ }
  return { name: 'Audu Wahab Ayodele', reg: '20/58646U/1' };
}

function buildTicketPayload(refNum) {
  const bus = bookingState.selectedBus;
  const student = getStudentProfileForBooking();
  return {
    ref: refNum,
    route: bookingState.selectedRoute,
    routeLabel: formatRouteLabel(bookingState.selectedRoute),
    bus: bus ? bus.name : '',
    seat: bookingState.selectedSeat || '',
    driver: bus && bus.driver ? bus.driver.name : '',
    phone: bus && bus.driver ? bus.driver.phone : '',
    name: student.name,
    reg: student.reg,
    fare: BOOKING_FARE,
    bookedAt: new Date().toISOString()
  };
}

function renderTicketScreen(ticket) {
  if (!ticket) return;

  const routeLabel = ticket.routeLabel || formatRouteLabel(ticket.route);

  const ticketRef = document.getElementById('ticketRef');
  const ticketRoute = document.getElementById('ticketRoute');
  const ticketBus = document.getElementById('ticketBus');
  const ticketSeat = document.getElementById('ticketSeat');

  if (ticketRef) ticketRef.textContent = ticket.ref;
  if (ticketRoute) ticketRoute.textContent = routeLabel;
  if (ticketBus) ticketBus.textContent = ticket.bus;
  if (ticketSeat) ticketSeat.textContent = ticket.seat;

  const ticketFare = document.getElementById('ticketFareValue');
  if (ticketFare) ticketFare.textContent = formatNaira(ticket.fare || BOOKING_FARE);

  updateDriverContactUI({ name: ticket.driver, phone: ticket.phone }, 'ticket');

  bookingState.selectedRoute = ticket.route;
  bookingState.selectedSeat = ticket.seat;
  bookingState.selectedBus = findBusInRoute(ticket.route, ticket.bus) || {
    name: ticket.bus,
    driver: { name: ticket.driver, phone: ticket.phone }
  };

  generateQRCode(ticket);
}

function isBookingRefBoarded(ref) {
  try {
    const boarded = JSON.parse(localStorage.getItem('driverBoardedRefs')) || [];
    return boarded.indexOf(normalizeBookingRef(ref)) !== -1;
  } catch (e) {
    return false;
  }
}

function handleBoardingTimerExpired() {
  clearInterval(boardingTimerInterval);
  boardingTimerInterval = null;

  const savedTicket = localStorage.getItem('activeTicket');
  if (savedTicket) {
    try {
      const ticket = JSON.parse(savedTicket);
      archiveBooking(ticket, 'Expired');
      recordWalletRefund(ticket, 'Expired');
      const expiredRef = normalizeBookingRef(ticket.ref);
      saveBoardedRefs(getBoardedRefs().filter(function (r) { return r !== expiredRef; }));
    } catch (e) { /* ignore */ }
  }

  clearStudentActiveBooking();
  setWalletBalance(getWalletBalance() + BOOKING_FARE);
  updateWalletDisplay();
  renderWalletTransactions();

  const countdownEl = document.getElementById('boardingCountdown');
  if (countdownEl) countdownEl.textContent = 'EXPIRED';

  refreshStudentDashboard();
  checkActiveBooking();
  showToast('⚠️ Boarding time expired. ₦' + BOOKING_FARE + ' refunded to your wallet.');
}

function stopBoardingTimer() {
  if (boardingTimerInterval) {
    clearInterval(boardingTimerInterval);
    boardingTimerInterval = null;
  }
}

function findBusDataByName(busName) {
  if (typeof busData === 'undefined') return null;
  return Object.values(busData).find(function (b) { return b.name === busName; }) || null;
}

function syncBusDataFromDriverState(busName) {
  if (busName !== 'BUS-002' || typeof busData === 'undefined' || !busData.bus2) return;
  try {
    const trip = JSON.parse(localStorage.getItem('driverTripState'));
    if (trip && trip.status) busData.bus2.status = trip.status;
  } catch (e) { /* ignore */ }
}

function getBookedCountForBus(busName) {
  if (localStorage.getItem('hasActiveBooking') !== 'true') return 0;
  try {
    const ticket = JSON.parse(localStorage.getItem('activeTicket'));
    return ticket && ticket.bus === busName ? 1 : 0;
  } catch (e) {
    return 0;
  }
}

function updateTicketDepartureStatus(ticket) {
  if (!ticket) return;

  const statusEl = document.getElementById('departureStatus');
  const textEl = document.getElementById('departureStatusText');

  // Live trip status is simulated for BUS-002 only; other buses use static demo data.
  if (ticket.bus !== 'BUS-002') {
    if (textEl) {
      textEl.textContent = 'Booking confirmed — board within 15 minutes using your QR code';
    }
    if (statusEl) {
      statusEl.classList.remove('departure-status--idle', 'departure-status--stopped', 'departure-status--moving');
      statusEl.classList.add('departure-status--idle');
    }
    return;
  }

  syncBusDataFromDriverState(ticket.bus);
  const liveBus = findBusDataByName(ticket.bus);
  const status = liveBus ? liveBus.status : 'idle';
  const totalSeats = liveBus ? liveBus.seats : 18;
  const seatsLeft = Math.max(0, totalSeats - getBookedCountForBus(ticket.bus));

  if (textEl) {
    if (status === 'idle') {
      textEl.innerHTML = 'Accepting bookings — <span id="seatsLeftCount">' + seatsLeft + '</span> seats remaining';
    } else if (status === 'stopped') {
      textEl.textContent = 'At stop — show your QR code to the driver to board';
    } else if (status === 'moving') {
      textEl.textContent = 'Trip in progress — no new bookings until the bus returns to campus';
    } else {
      textEl.textContent = 'Bus status unavailable';
    }
  }

  if (statusEl) {
    statusEl.classList.remove('departure-status--idle', 'departure-status--stopped', 'departure-status--moving');
    statusEl.classList.add('departure-status--' + status);
  }
}

function applyTicketBoardedUI(boarded) {
  const timerEl = document.getElementById('boardingTimer');
  const boardedEl = document.getElementById('boardingBoarded');
  const qrLabel = document.querySelector('.ticket-qr .qr-label');

  if (boarded) {
    stopBoardingTimer();
    if (timerEl) timerEl.classList.add('hidden');
    if (boardedEl) boardedEl.classList.remove('hidden');
    if (qrLabel) qrLabel.textContent = 'Boarding verified ✓';
  } else {
    if (timerEl) timerEl.classList.remove('hidden');
    if (boardedEl) boardedEl.classList.add('hidden');
    if (qrLabel) qrLabel.textContent = 'Scan to verify boarding';
  }
}

function refreshTicketBoardingUI(ticket) {
  if (!ticket) {
    const saved = localStorage.getItem('activeTicket');
    if (!saved) return;
    try {
      ticket = JSON.parse(saved);
    } catch (e) {
      return;
    }
  }

  const boarded = isBookingRefBoarded(ticket.ref);
  applyTicketBoardedUI(boarded);
  updateTicketDepartureStatus(ticket);

  if (!boarded && document.getElementById('boardingCountdown')) {
    startBoardingTimer(false);
  }
}

function initTicketCrossTabSync() {
  window.addEventListener('storage', function (e) {
    if (e.key === 'driverBoardedRefs' || e.key === 'driverTripState') {
      refreshTicketBoardingUI();
    }
    if (e.key === 'hasActiveBooking' || e.key === 'activeTicket') {
      handleActiveBookingEndedOnTicketPage();
    }
  });
  window.addEventListener('focus', function () {
    refreshTicketBoardingUI();
    handleActiveBookingEndedOnTicketPage();
  });
}

function handleActiveBookingEndedOnTicketPage() {
  if (!document.getElementById('step1')) return;
  if (localStorage.getItem('hasActiveBooking') === 'true') return;

  const step5 = document.getElementById('step5');
  if (step5 && !step5.classList.contains('hidden')) {
    stopBoardingTimer();
    goToStep(1);
    showToast('✅ Trip completed. Your booking has been moved to history.');
  }
}

// Boarding countdown timer reference
let boardingTimerInterval = null;
let boardingSecondsLeft = 15 * 60; // 15 minutes in seconds


// BUS DATA FOR BOOKING
// Simulates buses returned from the Django backend

const bookingBuses = {
  'yelwa-gubi': [
    {
      id: 'bus1',
      name: 'BUS-001',
      route: 'Yelwa → Gubi Campus',
      totalSeats: 18,
      bookedSeats: 12,
      driver: { name: 'Musa Ibrahim', phone: '08098765432' },
      status: 'available',
      // Seats that are already taken (simulated)
      takenSeats: ['1A','1B','2A','2B','3A','4A','4B','5B','6A','6B','7A','7B']
    },
    {
      id: 'bus2',
      name: 'BUS-002',
      route: 'Yelwa → Gubi Campus',
      totalSeats: 18,
      bookedSeats: 6,
      driver: { name: 'Abdullahi Danladi', phone: '08023456789' },
      status: 'available',
      takenSeats: ['1A','2B','3A','4B','5A','6A']
    },
    {
      id: 'bus3',
      name: 'BUS-003',
      route: 'Yelwa → Gubi Campus',
      totalSeats: 18,
      bookedSeats: 18,
      driver: { name: 'Yusuf Garba', phone: '08034567890' },
      status: 'full',
      takenSeats: ['1A','1B','2A','2B','3A','3B','4A','4B','5A','5B',
                   '6A','6B','7A','7B','8A','8B','9A','9B']
    }
  ],
  'gubi-yelwa': [
    {
      id: 'bus4',
      name: 'BUS-004',
      route: 'Gubi → Yelwa Campus',
      totalSeats: 18,
      bookedSeats: 4,
      driver: { name: 'Ibrahim Sani', phone: '08045678901' },
      status: 'available',
      takenSeats: ['1A','2A','3B','4A']
    },
    {
      id: 'bus5',
      name: 'BUS-005',
      route: 'Gubi → Yelwa Campus',
      totalSeats: 18,
      bookedSeats: 14,
      driver: { name: 'Lawal Bello', phone: '08056789012' },
      status: 'available',
      takenSeats: ['1A','1B','2A','2B','3A','3B','4A','4B',
                   '5A','5B','6A','6B','7A','7B']
    }
  ]
};


// STEP NAVIGATION
// Moves the user between the 4 booking steps

function updateBookingStepBackBar(stepNum) {
  const bar = document.getElementById('bookingStepBackBar');
  if (!bar) return;
  bar.classList.toggle('hidden', stepNum !== 1);
}

function goToStep(stepNum) {
  const prevStep = bookingState.currentStep;

  // Block forward navigation without required selections
  if (stepNum === 3 && !bookingState.selectedBus) return;
  if (stepNum === 4 && !bookingState.selectedSeat) return;

  // Clear seat when entering pick-seat from bus list (not when going back from payment)
  if (stepNum === 3 && prevStep === 2) {
    bookingState.selectedSeat = null;
  }

  bookingState.currentStep = stepNum;

  // Hide all steps
  for (let i = 1; i <= 5; i++) {
    const step = document.getElementById('step' + i);
    if (step) step.classList.add('hidden');
  }

  const targetStep = document.getElementById('step' + stepNum);
  if (targetStep) targetStep.classList.remove('hidden');

  // Update the step indicator bar
  for (let i = 1; i <= 4; i++) {
    const indicator = document.getElementById('step-indicator-' + i);
    if (!indicator) continue;

    indicator.classList.remove('step--active', 'step--done');

    if (i < stepNum) {
      indicator.classList.add('step--done');
      indicator.querySelector('.step-num').textContent = '✓';
    } else if (i === stepNum) {
      indicator.classList.add('step--active');
      indicator.querySelector('.step-num').textContent = String(i);
    } else {
      indicator.querySelector('.step-num').textContent = String(i);
    }
  }

  if (stepNum === 2) loadBusOptions();
  if (stepNum === 3) generateSeatMap();
  if (stepNum === 4) loadBookingSummary();

  const content = document.getElementById('bookingContent');
  if (content) content.scrollIntoView({ behavior: 'smooth', block: 'start' });

  updateBookingStepBackBar(stepNum);
}


// STEP 1 - SELECT ROUTE

function selectRoute(route) {
  bookingState.selectedRoute = route;
  bookingState.selectedBus = null;
  bookingState.selectedSeat = null;

  document.querySelectorAll('.route-card').forEach(function (card) {
    card.classList.remove('route-card--selected');
  });

  const selectedCard = document.getElementById('route-' + route);
  if (selectedCard) selectedCard.classList.add('route-card--selected');

  setStepButtonEnabled('step1Next', true);
}


// STEP 2 - LOAD BUS OPTIONS

function loadBusOptions() {
  const container = document.getElementById('availableBuses');
  const routeLabel = document.getElementById('step2RouteLabel');
  if (!container || !bookingState.selectedRoute) return;

  // Update route label
  if (routeLabel) {
    routeLabel.textContent = bookingState.selectedRoute === 'yelwa-gubi'
      ? 'Yelwa Campus → Gubi Campus'
      : 'Gubi Campus → Yelwa Campus';
  }

  const buses = bookingBuses[bookingState.selectedRoute] || [];
  container.innerHTML = '';

  buses.forEach(function (bus) {
    const isFull     = bus.bookedSeats >= bus.totalSeats;
    const seatsLeft  = bus.totalSeats - bus.bookedSeats;
    const fillPct    = (bus.bookedSeats / bus.totalSeats) * 100;
    const fillClass  = fillPct >= 100 ? 'seat-bar-fill--full' :
                       fillPct >= 70  ? 'seat-bar-fill--warning' : '';

    // Departure badge based on status
    let badgeHtml = '';
    if (isFull) {
      badgeHtml = `<span class="departure-badge departure-badge--departing">
                    🕐 Departing soon
                  </span>`;
    } else if (fillPct >= 70) {
      badgeHtml = `<span class="departure-badge departure-badge--filling">
                    ⚡ Filling fast
                  </span>`;
    } else {
      badgeHtml = `<span class="departure-badge departure-badge--available">
                    ✅ Accepting bookings
                  </span>`;
    }

    const busCard = document.createElement('div');
    busCard.className = 'bus-option' + (isFull ? ' bus-option--full' : '');
    busCard.id = 'bus-option-' + bus.id;

    busCard.innerHTML = `
      <div class="bus-option-icon">🚌</div>
      <div class="bus-option-info">
        <div class="bus-option-name">${bus.name}</div>
        <div class="bus-option-meta">${bus.route} · 18 seats total</div>
        <div class="bus-option-meta">
          👨‍✈️ ${bus.driver.name} · 📞 ${bus.driver.phone}
        </div>
        <div class="seat-bar">
          <div class="seat-bar-fill ${fillClass}" style="width:${fillPct}%"></div>
        </div>
      </div>
      <div class="bus-option-right">
        <div class="bus-option-seats">${seatsLeft}</div>
        <div class="bus-option-seats-label">seats left</div>
        ${badgeHtml}
      </div>
    `;

    // Only allow clicking if bus is not full
    if (!isFull) {
      busCard.onclick = function () { selectBus(bus); };
    }

    container.appendChild(busCard);
  });

  // Restore selection when returning from a later step
  if (bookingState.selectedBus) {
    const selectedCard = document.getElementById('bus-option-' + bookingState.selectedBus.id);
    if (selectedCard) {
      selectedCard.classList.add('bus-option--selected');
      setStepButtonEnabled('step2Next', true);
    } else {
      bookingState.selectedBus = null;
      setStepButtonEnabled('step2Next', false);
    }
  } else {
    setStepButtonEnabled('step2Next', false);
  }
}


// STEP 2 - SELECT BUS

function selectBus(bus) {
  bookingState.selectedBus = bus;
  bookingState.selectedSeat = null;

  document.querySelectorAll('.bus-option').forEach(function (card) {
    card.classList.remove('bus-option--selected');
  });

  const selectedCard = document.getElementById('bus-option-' + bus.id);
  if (selectedCard) selectedCard.classList.add('bus-option--selected');

  setStepButtonEnabled('step2Next', true);

  const step3Label = document.getElementById('step3BusLabel');
  if (step3Label) step3Label.textContent = bus.name + ' · ' + bus.route;
}


// STEP 3 - GENERATE SEAT MAP
// Creates a visual grid of seats for the selected bus

function generateSeatMap() {
  const container = document.getElementById('seatRows');
  if (!container || !bookingState.selectedBus) return;

  container.innerHTML = '';
  const bus = bookingState.selectedBus;

  // Bus has 9 rows, 2 seats on each side (A and B columns)
  // Layout: [A] [aisle] [B] per row
  // Total: 9 rows × 2 seats = 18 seats

  for (let row = 1; row <= 9; row++) {
    const seatA = row + 'A';
    const seatB = row + 'B';

    const rowEl = document.createElement('div');
    rowEl.className = 'seat-row';

    // Row number
    rowEl.innerHTML = `<div class="seat-row-num">${row}</div>`;

    // Seat A (left side)
    rowEl.appendChild(createSeatElement(seatA, bus.takenSeats));

    // Aisle gap
    const aisle = document.createElement('div');
    aisle.className = 'seat-aisle';
    rowEl.appendChild(aisle);

    // Seat B (right side)
    rowEl.appendChild(createSeatElement(seatB, bus.takenSeats));

    container.appendChild(rowEl);
  }

  const infoBar = document.getElementById('selectedSeatInfo');
  if (infoBar) infoBar.classList.add('hidden');

  if (bookingState.selectedSeat) {
    const savedSeat = bookingState.selectedSeat;
    document.querySelectorAll('.seat--selected, .seat--available').forEach(function (s) {
      if (s.textContent === savedSeat) {
        s.classList.remove('seat--available');
        s.classList.add('seat--selected');
        if (infoBar) infoBar.classList.remove('hidden');
        const seatLabel = document.getElementById('selectedSeatLabel');
        if (seatLabel) seatLabel.textContent = 'Seat ' + savedSeat;
        setStepButtonEnabled('step3Next', true);
      }
    });
  } else {
    setStepButtonEnabled('step3Next', false);
  }
}


// CREATE SEAT ELEMENT
// Returns a single seat div with correct styling and click handler

function createSeatElement(seatId, takenSeats) {
  const isTaken = takenSeats.includes(seatId);
  const seatEl = document.createElement('div');

  seatEl.className = 'seat ' + (isTaken ? 'seat--taken' : 'seat--available');
  seatEl.textContent = seatId;
  seatEl.title = isTaken ? 'Seat ' + seatId + ' is taken' : 'Select seat ' + seatId;

  if (!isTaken) {
    seatEl.onclick = function () { selectSeat(seatId, seatEl); };
  }

  return seatEl;
}


// STEP 3 - SELECT SEAT

function selectSeat(seatId, seatEl) {
  bookingState.selectedSeat = seatId;

  // Remove selected class from all available seats
  document.querySelectorAll('.seat--selected').forEach(function (s) {
    s.classList.remove('seat--selected');
    s.classList.add('seat--available');
  });

  // Mark this seat as selected
  seatEl.classList.remove('seat--available');
  seatEl.classList.add('seat--selected');

  // Show the selected seat info bar
  const infoBar = document.getElementById('selectedSeatInfo');
  const seatLabel = document.getElementById('selectedSeatLabel');
  if (infoBar)  infoBar.classList.remove('hidden');
  if (seatLabel) seatLabel.textContent = 'Seat ' + seatId;

  setStepButtonEnabled('step3Next', true);
}


// STEP 4 - LOAD BOOKING SUMMARY

function loadBookingSummary() {
  const route = formatRouteLabel(bookingState.selectedRoute);

  const routeEl = document.getElementById('summaryRoute');
  const busEl   = document.getElementById('summaryBus');
  const seatEl  = document.getElementById('summarySeat');
  const dateEl  = document.getElementById('summaryDate');

  if (routeEl) routeEl.textContent = route;
  if (busEl && bookingState.selectedBus) {
    busEl.textContent = bookingState.selectedBus.name;
  }
  if (seatEl && bookingState.selectedSeat) {
    seatEl.textContent = bookingState.selectedSeat;
  }
  if (dateEl) {
    const today = new Date();
    dateEl.textContent = today.toLocaleDateString('en-NG', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  if (bookingState.selectedBus && bookingState.selectedBus.driver) {
    updateDriverContactUI(bookingState.selectedBus.driver, 'summary');
  }

  updateWalletDisplay();
}


// STEP 4 - SELECT PAYMENT METHOD

function selectPayment(method) {
  bookingState.paymentMethod = method;

  // Remove active from all payment choices
  document.querySelectorAll('.payment-choice').forEach(function (el) {
    el.classList.remove('active');
  });

  // Add active to selected
  const selected = document.getElementById('pay-' + method);
  if (selected) selected.classList.add('active');
}


// STEP 4 - PROCESS PAYMENT AND CONFIRM BOOKING

function processBookingPayment() {
  const fare = BOOKING_FARE;
  const payBtn = document.getElementById('payBtn');

  if (bookingState.paymentMethod === 'wallet' && getWalletBalance() < fare) {
    showToast('⚠️ Insufficient wallet balance. Please top up first.');
    return;
  }

  if (payBtn) {
    payBtn.textContent = 'Processing...';
    payBtn.classList.add('btn-loading');
  }

  setTimeout(function () {

    const refNum = '#ATB-' + String(Math.floor(10000 + Math.random() * 90000));
    const ticketData = buildTicketPayload(refNum);

    if (bookingState.paymentMethod === 'wallet') {
      setWalletBalance(getWalletBalance() - fare);
      recordWalletBookingDebit(ticketData);
      updateWalletDisplay();
      renderWalletTransactions();
    }

    localStorage.removeItem('boardingSecondsLeft');
    localStorage.setItem('hasActiveBooking', 'true');
    localStorage.setItem('activeTicket', JSON.stringify(ticketData));
    bookingState.trackingBusId = null;

    renderTicketScreen(ticketData);
    updateTicketDepartureStatus(ticketData);
    startBoardingTimer(true);
    initTicketCrossTabSync();

    if (payBtn) {
      payBtn.textContent = getBookingPayButtonLabel();
      payBtn.classList.remove('btn-loading');
    }

    goToStep(5);

  }, 1500);
}


// GENERATE QR CODE
// Creates a QR code from the booking reference number
// The QR contains all booking info for driver verification

function generateQRCode(ticket) {
  const qrContainer = document.getElementById('qrCode');
  if (!qrContainer) return;

  qrContainer.innerHTML = '';

  const payload = typeof ticket === 'string'
    ? {
        ref: ticket,
        seat: bookingState.selectedSeat,
        bus: bookingState.selectedBus ? bookingState.selectedBus.name : '',
        route: bookingState.selectedRoute
      }
    : ticket;

  const qrData = JSON.stringify({
    ref:    payload.ref,
    name:   payload.name || getStudentProfileForBooking().name,
    reg:    payload.reg || getStudentProfileForBooking().reg,
    bus:    payload.bus || '',
    seat:   payload.seat || '',
    route:  payload.route || '',
    paid:   true,
    time:   new Date().toISOString()
  });

  new QRCode(qrContainer, {
    text:          qrData,
    width:         160,
    height:        160,
    colorDark:     '#0B2545',
    colorLight:    '#ffffff',
    correctLevel:  QRCode.CorrectLevel.H
  });
}


// START BOARDING COUNTDOWN TIMER
// 15 minutes to board the bus after confirmation

function startBoardingTimer(fresh) {

  // Clear any existing timer first
  if (boardingTimerInterval) clearInterval(boardingTimerInterval);

  if (fresh) {
    // Save the exact time when the timer expires (15 minutes from now)
    const expiryTime = Date.now() + (15 * 60 * 1000);
    localStorage.setItem('boardingExpiryTime', expiryTime);
  }

  boardingTimerInterval = setInterval(function () {

    const savedTicket = localStorage.getItem('activeTicket');
    if (savedTicket) {
      try {
        if (isBookingRefBoarded(JSON.parse(savedTicket).ref)) {
          stopBoardingTimer();
          refreshTicketBoardingUI();
          return;
        }
      } catch (e) { /* ignore */ }
    }

    // Calculate remaining seconds based on expiry time
    const expiryTime = parseInt(localStorage.getItem('boardingExpiryTime'));
    const remainingMs = expiryTime - Date.now();
    boardingSecondsLeft = Math.floor(remainingMs / 1000);

    // If time has expired
    if (boardingSecondsLeft <= 0) {
      handleBoardingTimerExpired();
      return;
    }

    const minutes = Math.floor(boardingSecondsLeft / 60);
    const seconds = boardingSecondsLeft % 60;

    // Format as MM:SS
    const display = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');

    const countdownEl = document.getElementById('boardingCountdown');
    if (countdownEl) countdownEl.textContent = display;

    // Change colour to red when less than 5 minutes left
    if (boardingSecondsLeft <= 300) {
      const timerEl = document.getElementById('boardingTimer');
      if (timerEl) {
        timerEl.style.background = '#FFF0F0';
        timerEl.style.borderColor = '#FFD0D0';
      }
      if (countdownEl) countdownEl.style.color = '#CC3333';
    }

  }, 1000);
}
