const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const modules = [
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

function extractFunctions(code) {
  const names = new Set();
  const re = /function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  let m;
  while ((m = re.exec(code))) names.add(m[1]);
  return names;
}

const original = fs.readFileSync(path.join(root, 'js/main.js.backup'), 'utf8');
const bundled = modules.map(function (f) {
  return fs.readFileSync(path.join(root, f), 'utf8');
}).join('\n');

const origFns = extractFunctions(original);
const newFns = extractFunctions(bundled);

const missing = [...origFns].filter(function (n) { return !newFns.has(n); }).sort();
const extra = [...newFns].filter(function (n) { return !origFns.has(n); }).sort();

console.log('Original functions:', origFns.size);
console.log('Split functions:', newFns.size);
console.log('Missing:', missing.length ? missing.join(', ') : '(none)');
console.log('Extra:', extra.length ? extra.join(', ') : '(none)');
