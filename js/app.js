// ATBU Smart Transport — script load order for all pages.
// Each HTML page includes this single file instead of js/main.js.
(function () {
  var modules = [
    'js/core/utils.js',
    'js/core/auth.js',
    'js/core/public.js',
    'js/auth/login.js',
    'js/auth/register.js',
    'js/student/dashboard.js',
    'js/student/tracking.js',
    'js/student/booking.js',
    'js/driver/driver.js',
    'js/admin/admin.js',
    'js/core/bootstrap.js'
  ];

  for (var i = 0; i < modules.length; i++) {
    document.write('<script src="' + modules[i] + '"><\/script>');
  }
})();
