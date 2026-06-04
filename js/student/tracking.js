// ============================================================
// ATBU SMART TRANSPORT SYSTEM
// Tracking Page JavaScript
// Handles: Leaflet.js map setup, bus markers, live position
// simulation, bus request feature, and panel interactions.
// Add this to the bottom of your main.js file.
// ============================================================


// BUS DATA
// This simulates what would come from the Django backend.
// Each bus has an id, name, route, coordinates, status, and seats.

const busData = {
  bus1: {
    id: 'bus1',
    name: 'BUS-001',
    route: 'Yelwa → Gubi',
    lat: 10.2980,
    lng: 9.8470,
    status: 'moving',
    seats: 18,
    available: 6,
    location: 'Near Main Gate',
    color: '#2176FF'
  },
  bus2: {
    id: 'bus2',
    name: 'BUS-002',
    route: 'Yelwa → Gubi',
    lat: 10.3050,
    lng: 9.8420,
    status: 'stopped',
    seats: 18,
    available: 12,
    location: 'Yelwa Campus Stop',
    color: '#1A9E5C'
  },
  bus3: {
    id: 'bus3',
    name: 'BUS-003',
    route: 'Gubi → Yelwa',
    lat: 10.2900,
    lng: 9.8530,
    status: 'moving',
    seats: 18,
    available: 4,
    location: 'Midway Point',
    color: '#2176FF'
  },
  bus4: {
    id: 'bus4',
    name: 'BUS-004',
    route: 'Gubi Campus',
    lat: 10.2750,
    lng: 9.8600,
    status: 'idle',
    seats: 18,
    available: 18,
    location: 'Gubi Campus Stop',
    color: '#FFA500'
  }
};

// Campus coordinates for ATBU
// These are approximate coordinates for Bauchi, Nigeria
const YELWA_CAMPUS  = { lat: 10.3050, lng: 9.8420 };
const GUBI_CAMPUS   = { lat: 10.2750, lng: 9.8600 };

// Map and marker variables
let busMap = null;
let driverMap = null;
let driverBusMarker = null;
let busMarkers = {};
const trackingMaxVotes = 18;
const TRACKING_REQUEST_KEY = 'trackingBusRequest';

function getDefaultTrackingRequest() {
  return { active: true, votes: 0, userJoined: false, campus: 'yelwa', dispatched: false };
}

function getTrackingRequestState() {
  try {
    const raw = localStorage.getItem(TRACKING_REQUEST_KEY);
    if (!raw) return getDefaultTrackingRequest();
    return Object.assign(getDefaultTrackingRequest(), JSON.parse(raw));
  } catch (e) {
    return getDefaultTrackingRequest();
  }
}

function saveTrackingRequestState(state) {
  localStorage.setItem(TRACKING_REQUEST_KEY, JSON.stringify(state));
}

function hasActiveTripBooking() {
  return localStorage.getItem('hasActiveBooking') === 'true';
}

function canBookBus(bus) {
  if (!bus) return false;
  if (hasActiveTripBooking()) return false;
  if (bus.status !== 'idle') return false;
  if (bus.available <= 0) return false;
  return true;
}

function getBookDisabledMessage(bus) {
  if (hasActiveTripBooking()) {
    return 'You already have an active booking. Finish or cancel it before booking another bus.';
  }
  if (bus.status === 'moving') {
    return 'This bus is moving. Booking opens when the bus is idle at a campus stop.';
  }
  if (bus.status === 'stopped') {
    return 'This bus is at a stop. Booking is only available when the bus is idle and empty.';
  }
  if (bus.available <= 0) {
    return 'This bus is full. Please choose another bus.';
  }
  return 'Booking is not available for this bus right now.';
}

function prefillBookingFromTrackingBus(busId) {
  const bus = busData[busId];
  if (!bus || !canBookBus(bus)) return false;
  sessionStorage.setItem('trackingBookBus', busId);
  return true;
}


// INITIALIZE THE MAP
// Sets up the Leaflet.js map when the tracking page loads

function initMap() {
  // Only initialize if the map div exists on this page
  const mapDiv = document.getElementById('busMap');
  if (!mapDiv) return;

  // Create the map centered between the two campuses
  busMap = L.map('busMap', {
    center: [10.2900, 9.8510],
    zoom: 14,
    zoomControl: true
  });

  // Add OpenStreetMap tiles as the map background
  // OpenStreetMap is free and doesn't need an API key
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(busMap);

  // Add campus markers
  addCampusMarkers();

  // Add all bus markers
  Object.values(busData).forEach(function (bus) {
    addBusMarker(bus);
  });

  // Draw the route line between the two campuses
  drawRouteLine();
}


// ADD CAMPUS MARKERS
// Places markers for Yelwa and Gubi campuses on the map

function addCampusMarkers() {
  // Custom campus icon
  const campusIcon = L.divIcon({
    className: '',
    html: `<div style="
      background: #CC3333;
      width: 14px; height: 14px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });

  // Yelwa campus marker
  L.marker([YELWA_CAMPUS.lat, YELWA_CAMPUS.lng], { icon: campusIcon })
    .addTo(busMap)
    .bindPopup(`
      <div style="font-family: 'DM Sans', sans-serif; padding: 4px;">
        <strong style="color:#0B2545;">📍 Yelwa Campus</strong><br/>
        <small style="color:#5A7499;">Main Bus Stop</small>
      </div>
    `);

  // Gubi campus marker
  L.marker([GUBI_CAMPUS.lat, GUBI_CAMPUS.lng], { icon: campusIcon })
    .addTo(busMap)
    .bindPopup(`
      <div style="font-family: 'DM Sans', sans-serif; padding: 4px;">
        <strong style="color:#0B2545;">📍 Gubi Campus</strong><br/>
        <small style="color:#5A7499;">Main Bus Stop</small>
      </div>
    `);
}


// DRAW ROUTE LINE
// Draws a dashed line between the two campuses to show the route

function drawRouteLine() {
  const routeCoords = [
    [YELWA_CAMPUS.lat, YELWA_CAMPUS.lng],
    [10.2980, 9.8470], // midway point 1
    [10.2870, 9.8535], // midway point 2
    [GUBI_CAMPUS.lat, GUBI_CAMPUS.lng]
  ];

  L.polyline(routeCoords, {
    color: '#2176FF',
    weight: 3,
    opacity: 0.4,
    dashArray: '8, 8' // dashed line
  }).addTo(busMap);
}


// ADD BUS MARKER
// Creates a custom bus icon and places it on the map

function addBusMarker(bus) {
  // Create a custom HTML marker for the bus
  const busIcon = L.divIcon({
    className: '',
    html: `<div style="
      background: ${bus.color};
      color: white;
      padding: 4px 8px;
      border-radius: 20px;
      font-family: 'Sora', sans-serif;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      border: 2px solid white;
      display: flex;
      align-items: center;
      gap: 4px;
    ">🚌 ${bus.name}</div>`,
    iconSize: [80, 28],
    iconAnchor: [40, 14]
  });

  // Create the marker and add it to the map
  const marker = L.marker([bus.lat, bus.lng], { icon: busIcon })
    .addTo(busMap)
    .bindPopup(createBusPopup(bus));

  // Store the marker so we can update it later
  busMarkers[bus.id] = marker;
}


// CREATE BUS POPUP CONTENT
// Returns the HTML shown when a bus marker is clicked

function createBusPopup(bus) {
  const statusColor = bus.status === 'moving' ? '#2176FF' :
                      bus.status === 'stopped' ? '#1A9E5C' : '#FFA500';
  const statusText  = bus.status === 'moving' ? 'Moving' :
                      bus.status === 'stopped' ? 'At Stop' : 'Idle';

  let bookActionHtml = '';
  if (canBookBus(bus)) {
    bookActionHtml =
      '<a href="booking.html" class="map-popup-book-btn" style="color:#ffffff !important;" ' +
      'onclick="return prefillBookingFromTrackingBus(\'' + bus.id + '\')">Book a Seat →</a>';
  } else {
    bookActionHtml =
      '<div class="map-popup-book-disabled">' + getBookDisabledMessage(bus) + '</div>';
  }

  return `
    <div style="font-family:'DM Sans',sans-serif; padding:8px; min-width:180px;">
      <div style="font-family:'Sora',sans-serif; font-weight:700; font-size:1rem;
                  color:#0B2545; margin-bottom:8px;">
        🚌 ${bus.name}
      </div>
      <div style="font-size:0.82rem; color:#5A7499; margin-bottom:4px;">
        📍 ${bus.location}
      </div>
      <div style="font-size:0.82rem; color:#5A7499; margin-bottom:8px;">
        🛣️ ${bus.route}
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
        <span style="font-size:0.78rem; background:${statusColor}20;
                     color:${statusColor}; padding:3px 10px; border-radius:50px;
                     font-weight:600;">
          ${statusText}
        </span>
        <span style="font-size:0.78rem; color:#5A7499;">
          ${bus.available} seat${bus.available === 1 ? '' : 's'} left
        </span>
      </div>
      ${bookActionHtml}
    </div>
  `;
}

function refreshBusMarkerPopup(busId) {
  const bus = busData[busId];
  if (bus && busMarkers[busId]) {
    busMarkers[busId].setPopupContent(createBusPopup(bus));
  }
}

function refreshAllBusPopups() {
  Object.keys(busData).forEach(function (busId) {
    refreshBusMarkerPopup(busId);
  });
}


// FOCUS ON A BUS
// Called when a bus item in the left panel is clicked.
// Moves the map to that bus and opens its popup.

function focusBus(busId) {
  const bus = busData[busId];
  if (!bus || !busMap) return;

  // Remove focused class from all bus items
  document.querySelectorAll('.bus-item').forEach(function (item) {
    item.classList.remove('bus-item--focused');
  });

  // Add focused class to clicked bus item
  const busItems = document.querySelectorAll('.bus-item');
  const index = Object.keys(busData).indexOf(busId);
  if (busItems[index]) {
    busItems[index].classList.add('bus-item--focused');
  }

  // Fly the map to that bus location
  busMap.flyTo([bus.lat, bus.lng], 16, { duration: 1 });

  // Open the bus popup
  if (busMarkers[busId]) {
    busMarkers[busId].openPopup();
  }
}


// SIMULATE BUS MOVEMENT
// Moves buses slightly every few seconds to simulate real GPS updates.
// In the real app, this data comes from the Django WebSocket.

function getLocationLabelForBus(bus) {
  if (bus.status === 'idle') return bus.location;
  if (bus.status === 'stopped') return bus.location;

  // Approximate labels for moving buses based on position
  if (bus.route.indexOf('Yelwa → Gubi') !== -1) {
    if (bus.lat >= 10.302) return 'Leaving Yelwa Campus';
    if (bus.lat >= 10.292) return 'Near Main Gate';
    if (bus.lat >= 10.282) return 'Midway Point';
    return 'Approaching Gubi Campus';
  }
  if (bus.lat <= 10.278) return 'Leaving Gubi Campus';
  if (bus.lat <= 10.288) return 'Midway Point';
  if (bus.lat <= 10.298) return 'Near Main Gate';
  return 'Approaching Yelwa Campus';
}

function syncTrackingPanelFromBusData() {
  Object.keys(busData).forEach(function (busId) {
    const bus = busData[busId];
    const locEl = document.getElementById(busId + '-location');
    const seatsEl = document.getElementById(busId + '-available');

    if (locEl) locEl.textContent = getLocationLabelForBus(bus);
    if (seatsEl) seatsEl.textContent = bus.available;
  });
}

function setTrackingLastUpdated() {
  const updateEl = document.getElementById('lastUpdate');
  if (!updateEl) return;

  const now = new Date();
  updateEl.textContent = 'Updated ' + now.toLocaleTimeString('en-NG', {
    hour: 'numeric',
    minute: '2-digit'
  });
}

function applyBusPositionUpdates(steps) {
  steps = steps || 1;

  Object.keys(busData).forEach(function (busId) {
    const bus = busData[busId];
    if (bus.status !== 'moving') return;

    for (let i = 0; i < steps; i++) {
      if (bus.route.indexOf('Yelwa → Gubi') !== -1) {
        bus.lat -= 0.0005;
        bus.lng += 0.0005;
      } else if (bus.route.indexOf('Gubi → Yelwa') !== -1) {
        bus.lat += 0.0005;
        bus.lng -= 0.0005;
      }
    }

    bus.location = getLocationLabelForBus(bus);

    if (busMarkers[busId]) {
      busMarkers[busId].setLatLng([bus.lat, bus.lng]);
    }
  });

  if (driverBusMarker && typeof DRIVER_PROFILE !== 'undefined' && busData[DRIVER_PROFILE.busId]) {
    const assigned = busData[DRIVER_PROFILE.busId];
    driverBusMarker.setLatLng([assigned.lat, assigned.lng]);
    if (driverMap) {
      driverMap.panTo([assigned.lat, assigned.lng], { animate: true, duration: 0.5 });
    }
  }

  syncTrackingPanelFromBusData();
  if (typeof updateDriverMapPanel === 'function') updateDriverMapPanel();
  refreshAllBusPopups();
  setTrackingLastUpdated();
}

function simulateBusMovement() {
  applyBusPositionUpdates(1);
}


// REFRESH BUS POSITIONS
// Called when user clicks the Refresh button on the map toolbar

function refreshBusPositions() {
  const btn = document.getElementById('refreshMapBtn');
  const statusBar = document.querySelector('.live-status-bar');

  if (btn) btn.classList.add('map-btn--refreshing');
  if (statusBar) statusBar.classList.add('live-status-bar--updated');

  // Manual refresh moves buses further so the update is clearly visible
  applyBusPositionUpdates(3);

  showToast('🔄 Bus positions updated');

  setTimeout(function () {
    if (btn) btn.classList.remove('map-btn--refreshing');
    if (statusBar) statusBar.classList.remove('live-status-bar--updated');
  }, 900);
}


// SET MAP VIEW
// Filters which buses are shown based on the toolbar buttons

function busMatchesTrackingView(bus, view) {
  if (!bus || view === 'all') return true;
  if (view === 'yelwa-gubi') return bus.route.indexOf('Yelwa → Gubi') !== -1;
  if (view === 'gubi-yelwa') return bus.route.indexOf('Gubi → Yelwa') !== -1;
  return true;
}

function syncTrackingBusListFilter(view) {
  const busList = document.getElementById('busList');
  if (!busList) return;

  let visibleCount = 0;

  busList.querySelectorAll('.bus-item').forEach(function (item) {
    const busId = item.getAttribute('data-bus-id');
    const bus = busId ? busData[busId] : null;
    const show = busMatchesTrackingView(bus, view);
    item.classList.toggle('hidden', !show);
    if (show) visibleCount += 1;
  });

  let emptyEl = document.getElementById('busListEmpty');
  if (visibleCount === 0) {
    if (!emptyEl) {
      emptyEl = document.createElement('div');
      emptyEl.id = 'busListEmpty';
      emptyEl.className = 'bus-list-empty';
      emptyEl.textContent = 'No buses on this route right now.';
      busList.appendChild(emptyEl);
    }
    emptyEl.classList.remove('hidden');
  } else if (emptyEl) {
    emptyEl.classList.add('hidden');
  }
}

function setMapView(view, btn) {
  // Update active filter button (ignore Refresh and other toolbar actions)
  document.querySelectorAll('.map-toolbar-left .map-btn').forEach(function (mapBtn) {
    mapBtn.classList.remove('active');
  });
  if (btn) {
    btn.classList.add('active');
  }

  syncTrackingBusListFilter(view);

  if (!busMap) return;

  // Show/hide markers based on selected view
  Object.keys(busData).forEach(function (busId) {
    const bus = busData[busId];
    const marker = busMarkers[busId];
    if (!marker) return;

    if (busMatchesTrackingView(bus, view)) {
      busMap.addLayer(marker);
    } else {
      busMap.removeLayer(marker);
    }
  });
}


// TRACKING PAGE BUS REQUEST FEATURE

function joinTrackingRequestOnce() {
  const req = getTrackingRequestState();

  if (req.userJoined) {
    showToast('You have already joined this request.');
    return false;
  }

  if (req.votes >= trackingMaxVotes) {
    showToast('This request already has enough passengers.');
    return false;
  }

  req.userJoined = true;
  req.active = true;
  req.votes += 1;
  saveTrackingRequestState(req);
  updateTrackingRequestUI();
  updateDashboardStat('statActiveBusRequest', req.votes > 0 ? '1' : '0');
  return true;
}

function joinTrackingRequest() {
  openPlannedFeature('Collective Bus Request');
}

function updateTrackingRequestUI() {
  const req = getTrackingRequestState();
  const card = document.getElementById('requestPanelCard');
  const noPanel = document.getElementById('noRequestPanel');
  const voteEl = document.getElementById('trackingVoteCount');
  const fillEl = document.getElementById('trackingProgressFill');
  const noteEl = document.getElementById('trackingRequestNote');
  const joinBtn = document.getElementById('trackingJoinBtn');

  if (!req.active || req.dispatched) {
    if (card) card.classList.add('hidden');
    if (noPanel) noPanel.classList.remove('hidden');
    if (req.dispatched && noPanel) {
      const msg = noPanel.querySelector('p');
      if (msg) msg.textContent = 'A bus has been dispatched for the latest collective request.';
    }
    return;
  }

  if (card) card.classList.remove('hidden');
  if (noPanel) noPanel.classList.add('hidden');

  const votes = req.votes;
  const percentage = (votes / trackingMaxVotes) * 100;
  const remaining = trackingMaxVotes - votes;

  if (voteEl) voteEl.textContent = votes + ' / ' + trackingMaxVotes;
  if (fillEl) fillEl.style.width = percentage + '%';

  if (noteEl) {
    noteEl.style.color = '';
    if (req.dispatched) {
      noteEl.textContent = 'Bus dispatched by admin — students notified.';
      noteEl.style.color = '#1A9E5C';
    } else if (remaining > 0) {
      noteEl.textContent = remaining + ' more passenger' + (remaining > 1 ? 's' : '') + ' needed to dispatch';
    } else {
      noteEl.textContent = '🎉 Target reached — awaiting admin dispatch.';
      noteEl.style.color = '#1A9E5C';
    }
  }

  if (joinBtn) {
    if (req.userJoined) {
      joinBtn.textContent = votes >= trackingMaxVotes
        ? '✅ Joined — Bus is being dispatched!'
        : '✅ Joined! Waiting for more passengers...';
      joinBtn.disabled = true;
      joinBtn.style.opacity = '0.7';
    } else if (votes >= trackingMaxVotes) {
      joinBtn.textContent = '✅ Request full — Bus dispatching';
      joinBtn.disabled = true;
      joinBtn.style.opacity = '0.7';
    } else {
      joinBtn.textContent = '✋ Join This Request';
      joinBtn.disabled = false;
      joinBtn.style.opacity = '1';
    }
  }
}

function initTrackingRequestUI() {
  updateTrackingRequestUI();
}

function applyTrackingBusPrefill() {
  const busId = sessionStorage.getItem('trackingBookBus');
  if (!busId || hasActiveTripBooking()) {
    sessionStorage.removeItem('trackingBookBus');
    return;
  }

  const liveBus = busData[busId];
  sessionStorage.removeItem('trackingBookBus');
  if (!liveBus || !canBookBus(liveBus)) return;

  bookingState.trackingBusId = busId;

  let route = 'gubi-yelwa';
  if (liveBus.route.indexOf('Yelwa → Gubi') !== -1) {
    route = 'yelwa-gubi';
  }

  selectRoute(route);
  goToStep(2);

  const buses = bookingBuses[route] || [];
  const match = buses.find(function (b) { return b.name === liveBus.name; });
  if (match && match.status !== 'full') {
    selectBus(match);
  }
}


// OPEN REQUEST PANEL MODAL
function openRequestPanel() {
  openPlannedFeature('Collective Bus Request');
}

function closeRequestModal() {
  const overlay = document.getElementById('startRequestOverlay');
  if (overlay) {
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

function submitTrackingRequest() {
  openPlannedFeature('Collective Bus Request');
}


// INITIALIZE EVERYTHING WHEN PAGE LOADS
// Check if we are on the tracking page before running map code

if (document.getElementById('busMap')) {
  window.addEventListener('load', function () {
    setCurrentDate();
    initMap();
    syncTrackingPanelFromBusData();
    refreshAllBusPopups();
    setTrackingLastUpdated();

    setInterval(simulateBusMovement, 5000);
  });
}

