const fs = require('fs');
const path = require('path');

const dirs = ['g:/optiFlow/client/src/components/admin', 'g:/optiFlow/admin/src/components'];
const allTags = new Set();

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.jsx')) {
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      const matches = content.match(/<([A-Z][a-zA-Z0-9]*)/g);
      if (matches) {
        matches.forEach(m => allTags.add(m.substring(1)));
      }
    }
  });
});

console.log([...allTags].join(', '));
