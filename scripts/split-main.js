const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
const lines = src.split(/\r?\n/);

const sections = [
  { file: 'js/core/auth.js', start: 1, end: 159 },
  { file: 'js/core/public.js', start: 163, end: 213 },
  { file: 'js/auth/login.js', start: 216, end: 546 },
  { file: 'js/auth/register.js', start: 548, end: 1090 },
  { file: 'js/student/dashboard.js', start: 1092, end: 1924 },
  { file: 'js/student/tracking.js', start: 1926, end: 2607 },
  { file: 'js/student/booking.js', start: 2609, end: 3479 },
  { file: 'js/driver/driver.js', start: 3482, end: 4497 },
  { file: 'js/admin/admin.js', start: 4499, end: 4928 }
];

let total = 0;
for (const s of sections) {
  const chunk = lines.slice(s.start - 1, s.end).join('\n') + '\n';
  const out = path.join(root, s.file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, chunk);
  const count = chunk.split('\n').length - 1;
  total += count;
  console.log(s.file, count, 'lines');
}
console.log('Total split lines:', total, 'Original:', lines.length);
