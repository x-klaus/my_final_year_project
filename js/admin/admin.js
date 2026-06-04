// ============================================================
// Admin Portal — admin-dashboard.html, admin-login.html
// ============================================================

const ADMIN_FLEET_META = {
  bus1: { driver: 'Musa Ibrahim', route: 'Yelwa → Gubi Campus' },
  bus2: { driver: 'Abdullahi Danladi', route: 'Yelwa → Gubi Campus' },
  bus3: { driver: 'Yusuf Garba', route: 'Yelwa → Gubi Campus' },
  bus4: { driver: 'Ibrahim Sani', route: 'Gubi → Yelwa Campus' }
};

function isSameCalendarDay(iso) {
  if (!iso) return false;
  return new Date(iso).toDateString() === new Date().toDateString();
}

function getAdminDriverContact(busId) {
  if (busId === 'bus2' && typeof DRIVER_PROFILE !== 'undefined') {
    return { name: DRIVER_PROFILE.name, phone: DRIVER_PROFILE.phone };
  }

  let routes = bookingBuses;
  if (typeof routes === 'undefined') return { name: '—', phone: '—' };

  const routeKeys = Object.keys(routes);
  for (let i = 0; i < routeKeys.length; i++) {
    const match = routes[routeKeys[i]].find(function (bus) { return bus.id === busId; });
    if (match && match.driver) return match.driver;
  }

  const meta = ADMIN_FLEET_META[busId];
  return { name: meta ? meta.driver : '—', phone: '—' };
}

function getAdminDriversList() {
  return getAdminFleetRows().map(function (row) {
    const driver = getAdminDriverContact(row.id);
    return {
      name: driver.name,
      phone: driver.phone || '—',
      bus: row.name,
      route: row.route,
      status: row.status,
      seatsFilled: row.booked + ' / ' + row.total,
      liveSync: row.id === 'bus2'
    };
  });
}

function renderAdminDriversTable() {
  const tbody = document.getElementById('adminDriversBody');
  if (!tbody) return;

  tbody.innerHTML = getAdminDriversList().map(function (driver) {
    return '<tr>' +
      '<td><strong>' + driver.name + '</strong>' +
        (driver.liveSync ? ' <span class="table-badge badge--success" style="font-size:0.68rem;">Live</span>' : '') +
      '</td>' +
      '<td>' + driver.phone + '</td>' +
      '<td>' + driver.bus + '</td>' +
      '<td>' + driver.route + '</td>' +
      '<td>' + getAdminStatusBadge(driver.status) + '</td>' +
      '<td>' + driver.seatsFilled + '</td>' +
      '</tr>';
  }).join('');
}

function openAdminDriversModal() {
  renderAdminDriversTable();
  const overlay = document.getElementById('adminDriversOverlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeAdminDriversModal() {
  const overlay = document.getElementById('adminDriversOverlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
}

function getAdminFleetRows() {
  const rows = [];
  Object.keys(busData).forEach(function (busId) {
    const bus = busData[busId];
    const meta = ADMIN_FLEET_META[busId] || { driver: '—', route: bus.route };
    let status = bus.status;
    let booked = Math.max(0, bus.seats - bus.available);

    if (busId === 'bus2' && typeof getDriverTripState === 'function') {
      status = getDriverTripState().status;
      booked = getDriverPassengers().length;
    }

    rows.push({
      id: busId,
      name: bus.name,
      route: meta.route,
      driver: meta.driver,
      status: status,
      booked: booked,
      total: bus.seats
    });
  });
  return rows;
}

function getAdminBusesActiveToday() {
  return getAdminFleetRows().filter(function (row) {
    return row.status === 'moving' || row.status === 'stopped' || row.status === 'idle';
  }).length;
}

function toDateInputValue(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function lookupPassengerNameByRef(ref) {
  if (!ref) return '';

  const normalized = normalizeBookingRef(ref);

  try {
    if (localStorage.getItem('hasActiveBooking') === 'true') {
      const ticket = JSON.parse(localStorage.getItem('activeTicket'));
      if (ticket && normalizeBookingRef(ticket.ref) === normalized && ticket.name) {
        return ticket.name;
      }
    }
  } catch (e) { /* ignore */ }

  let found = '';
  getDriverTripsLog().some(function (trip) {
    return trip.passengers.some(function (p) {
      if (p.ref && normalizeBookingRef(p.ref) === normalized && p.name) {
        found = p.name;
        return true;
      }
      return false;
    });
  });
  if (found) return found;

  try {
    const profile = JSON.parse(localStorage.getItem('studentProfile') || '{}');
    if (profile.name) return profile.name;
  } catch (e) { /* ignore */ }

  return '';
}

function getAllAdminBookingRows() {
  const rows = [];
  const seen = {};

  if (localStorage.getItem('hasActiveBooking') === 'true') {
    try {
      const ticket = JSON.parse(localStorage.getItem('activeTicket'));
      const profile = JSON.parse(localStorage.getItem('studentProfile') || '{}');
      if (ticket && ticket.ref) {
        rows.push({
          name: ticket.name || profile.name || lookupPassengerNameByRef(ticket.ref) || 'Passenger',
          bus: ticket.bus || '—',
          seat: ticket.seat || '—',
          ref: ticket.ref,
          payment: 'Paid',
          date: ticket.bookedAt || new Date().toISOString()
        });
        seen[ticket.ref] = true;
      }
    } catch (e) { /* ignore */ }
  }

  getBookingHistory().forEach(function (entry) {
    if (seen[entry.ref]) return;
    rows.push({
      name: entry.name || lookupPassengerNameByRef(entry.ref) || 'Passenger',
      bus: entry.bus || '—',
      seat: entry.seat || '—',
      ref: entry.ref,
      payment: entry.status === 'Cancelled' || entry.status === 'Expired' ? 'Refunded' : 'Paid',
      date: entry.date || new Date().toISOString()
    });
    seen[entry.ref] = true;
  });

  getDriverTripsLog().forEach(function (trip) {
    trip.passengers.forEach(function (p) {
      if (!p.ref || seen[p.ref]) return;
      rows.push({
        name: p.name || 'Passenger',
        bus: trip.bus || '—',
        seat: p.seat || '—',
        ref: p.ref,
        payment: p.status === 'Boarded' ? 'Paid' : 'No-show',
        date: trip.endedAt || new Date().toISOString()
      });
      seen[p.ref] = true;
    });
  });

  return rows.sort(function (a, b) {
    return new Date(b.date) - new Date(a.date);
  });
}

function getAdminBookingsTodayRows() {
  return getAllAdminBookingRows().filter(function (row) {
    return isSameCalendarDay(row.date);
  });
}

function getAdminBookingFilterValues() {
  const busEl = document.getElementById('adminFilterBus');
  const dateEl = document.getElementById('adminFilterDate');
  return {
    bus: busEl ? busEl.value : 'all',
    date: dateEl ? dateEl.value : toDateInputValue(new Date())
  };
}

function filterAdminBookingRows(rows) {
  const filters = getAdminBookingFilterValues();
  return rows.filter(function (row) {
    const busMatch = filters.bus === 'all' || row.bus === filters.bus;
    const dateMatch = !filters.date || toDateInputValue(row.date) === filters.date;
    return busMatch && dateMatch;
  });
}

function populateAdminBookingBusFilter() {
  const select = document.getElementById('adminFilterBus');
  if (!select) return;

  const buses = {};
  getAdminFleetRows().forEach(function (row) {
    buses[row.name] = true;
  });
  getAllAdminBookingRows().forEach(function (row) {
    if (row.bus && row.bus !== '—') buses[row.bus] = true;
  });

  const current = select.value || 'all';
  select.innerHTML = '<option value="all">All buses</option>';
  Object.keys(buses).sort().forEach(function (busName) {
    select.innerHTML += '<option value="' + busName + '">' + busName + '</option>';
  });
  select.value = (current === 'all' || buses[current]) ? current : 'all';
}

function initAdminBookingFilters() {
  const dateEl = document.getElementById('adminFilterDate');
  if (dateEl && !dateEl.value) {
    dateEl.value = toDateInputValue(new Date());
  }
  populateAdminBookingBusFilter();
}

function resetAdminBookingFilters() {
  const busEl = document.getElementById('adminFilterBus');
  const dateEl = document.getElementById('adminFilterDate');
  if (busEl) busEl.value = 'all';
  if (dateEl) dateEl.value = toDateInputValue(new Date());
  renderAdminBookingsTodayTable();
}

function getAdminStatusBadge(status) {
  const labels = {
    idle: 'Idle',
    moving: 'Moving',
    stopped: 'At Stop'
  };
  const cls = {
    idle: 'badge--pending',
    moving: 'badge--success',
    stopped: 'badge--pending'
  };
  return '<span class="table-badge ' + (cls[status] || 'badge--pending') + '">' +
    (labels[status] || status) + '</span>';
}

function renderAdminStats() {
  updateDashboardStat('adminStatBusesActive', String(getAdminBusesActiveToday()));
  updateDashboardStat('adminStatBookingsToday', String(getAdminBookingsTodayRows().length));
  updateDashboardStat('adminStatRevenueToday', formatNaira(getDriverEarningsToday()));
  updateDashboardStat('adminStatPendingRequests', '0');
}

function renderAdminLiveBusTable() {
  const tbody = document.getElementById('adminLiveBusBody');
  if (!tbody) return;

  tbody.innerHTML = getAdminFleetRows().map(function (row) {
    return '<tr>' +
      '<td><strong>' + row.name + '</strong></td>' +
      '<td>' + getAdminStatusBadge(row.status) + '</td>' +
      '<td>' + row.booked + ' / ' + row.total + '</td>' +
      '<td>' + row.driver + '</td>' +
      '<td>' + row.route + '</td>' +
      '</tr>';
  }).join('');
}

function renderAdminBookingsTodayTable() {
  const tbody = document.getElementById('adminBookingsTodayBody');
  const empty = document.getElementById('adminBookingsTodayEmpty');
  const emptyText = document.getElementById('adminBookingsEmptyText');
  if (!tbody) return;

  populateAdminBookingBusFilter();
  const allRows = getAllAdminBookingRows();
  const rows = filterAdminBookingRows(allRows);

  if (rows.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    if (emptyText) {
      emptyText.textContent = allRows.length === 0
        ? 'No bookings recorded yet.'
        : 'No bookings match the selected bus and date filters.';
    }
    return;
  }

  if (empty) empty.classList.add('hidden');
  tbody.innerHTML = rows.map(function (row) {
    const payBadge = row.payment === 'Paid'
      ? 'badge--success'
      : row.payment === 'Refunded' ? 'badge--pending' : 'badge--cancelled';
    return '<tr>' +
      '<td>' + row.name + '</td>' +
      '<td>' + row.bus + '</td>' +
      '<td>' + row.seat + '</td>' +
      '<td class="ref-col">' + row.ref + '</td>' +
      '<td>' + formatHistoryDate(row.date) + '</td>' +
      '<td><span class="table-badge ' + payBadge + '">' + row.payment + '</span></td>' +
      '</tr>';
  }).join('');
}

function refreshAdminPageData() {
  renderAdminStats();
  renderAdminLiveBusTable();
  renderAdminBookingsTodayTable();
}

function applyAdminUserInfo() {
  const session = getAuthSession();
  const adminNameEl = document.getElementById('adminName');
  const adminAvatarEl = document.getElementById('adminAvatar');
  const welcomeNameEl = document.getElementById('welcomeName');

  if (session && session.name) {
    if (adminNameEl) adminNameEl.textContent = session.name;
    if (welcomeNameEl) welcomeNameEl.textContent = session.name.split(' ')[0];
    if (adminAvatarEl) adminAvatarEl.textContent = getDriverInitials(session.name);
  }
}

function bindAdminLiveSync() {
  window.addEventListener('storage', function (e) {
    if (
      e.key === 'driverTripState' ||
      e.key === 'activeTicket' ||
      e.key === 'hasActiveBooking' ||
      e.key === BOOKING_HISTORY_KEY ||
      e.key === DRIVER_TRIPS_LOG_KEY
    ) {
      refreshAdminPageData();
    }
  });
  window.addEventListener('focus', refreshAdminPageData);
}

function initAdminCommon() {
  setCurrentDate();
  setGreeting();
  applyAdminUserInfo();
  bindAdminLiveSync();
}

function initAdminDashboard() {
  initAdminCommon();
  refreshAdminPageData();
}

function initAdminLiveBusesPage() {
  initAdminCommon();
  refreshAdminPageData();
}

function initAdminBusRequestsPage() {
  initAdminCommon();
}

function initAdminBookingsPage() {
  initAdminCommon();
  initAdminBookingFilters();
  refreshAdminPageData();
}

function initAdminActionsPage() {
  initAdminCommon();
  refreshAdminPageData();
}
