const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = fs.readdirSync(root).filter(function (f) { return f.endsWith('.html'); });

files.forEach(function (f) {
  const p = path.join(root, f);
  let c = fs.readFileSync(p, 'utf8');
  if (c.indexOf('js/main.js') === -1) return;
  c = c.replace('<script src="js/main.js"></script>', '<script src="js/app.js"></script>');
  fs.writeFileSync(p, c);
  console.log('updated', f);
});
