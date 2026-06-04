// Runs after all feature modules load (must be last script in app.js).
initAppAuth();

if (document.getElementById('registerNextBtn')) {
  toggleRegisterNextBtn();
}

if (document.getElementById('bookingsList')) {
  setCurrentDate();
  setGreeting();
  checkActiveBooking();
  updateWalletDisplay();
  initStudentDashboardSync();
}

if (document.getElementById('studentBookingHistoryPage')) {
  setCurrentDate();
  renderStudentBookingHistoryPage();
  updateTripsCompletedStat();
  initStudentHistorySync();
}

if (document.getElementById('step1')) {
  setCurrentDate();
  updateWalletDisplay();
  syncBookingFareLabels();
  setStepButtonEnabled('step1Next', false);
  setStepButtonEnabled('step2Next', false);
  setStepButtonEnabled('step3Next', false);
  updateBookingStepBackBar(bookingState.currentStep);

  const hasActiveBooking = localStorage.getItem('hasActiveBooking');
  if (hasActiveBooking === 'true') {
    const savedTicket = localStorage.getItem('activeTicket');
    if (savedTicket) {
      const ticket = JSON.parse(savedTicket);
      renderTicketScreen(ticket);
      refreshTicketBoardingUI(ticket);
      initTicketCrossTabSync();
      goToStep(5);
    }
  } else if (sessionStorage.getItem('trackingBookBus')) {
    applyTrackingBusPrefill();
  }
}

if (document.getElementById('driverDashboard')) {
  initDriverDashboard();
}

if (document.getElementById('driverManifest')) {
  initDriverManifest();
}

if (document.getElementById('driverTripsPage')) {
  initDriverTripsPage();
}

if (document.getElementById('adminDashboard')) {
  initAdminDashboard();
}

if (document.getElementById('adminLiveBusesPage')) {
  initAdminLiveBusesPage();
}

if (document.getElementById('adminBusRequestsPage')) {
  initAdminBusRequestsPage();
}

if (document.getElementById('adminBookingsPage')) {
  initAdminBookingsPage();
}

if (document.getElementById('adminActionsPage')) {
  initAdminActionsPage();
}
