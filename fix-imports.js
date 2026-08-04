const fs = require('fs');
const path = require('path');

// Extensive list of all possible icons from lucide-react used
const knownIcons = [
  'Bus', 'Ambulance', 'CreditCard', 'CheckCircle2', 'Ticket', 'Flame', 'Siren', 'MapPin',
  'UserSquare2', 'AlertTriangle', 'Hospital', 'ShieldAlert', 'BarChart3', 'Users', 'Radio',
  'Calendar', 'ShieldCheck', 'TicketIcon', 'Smartphone', 'Banknote', 'RefreshCw', 'PlusCircle',
  'TrafficCone', 'Navigation', 'User', 'Map', 'Play', 'RotateCcw', 'Compass', 'TrendingUp',
  'CheckCircle', 'Search', 'ArrowUpDown', 'Edit3', 'Trash2', 'XCircle', 'AlertCircle',
  'TicketCheck', 'BarChart', 'Coins', 'BusFront'
];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('dist')) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('g:/optiFlow');
let fixedCount = 0;

files.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  let originalCode = code;

  const tags = [...code.matchAll(/<([A-Z][a-zA-Z0-9]+)/g)].map(m => m[1]);
  const uniqueTags = [...new Set(tags)];

  const usedIcons = uniqueTags.filter(tag => knownIcons.includes(tag));
  if (usedIcons.length === 0) return;

  let lucideImportMatch = code.match(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];?/);
  
  let importedIcons = [];
  if (lucideImportMatch) {
    importedIcons = lucideImportMatch[1].split(',').map(s => s.trim()).filter(Boolean);
  }

  const missingIcons = usedIcons.filter(icon => !importedIcons.includes(icon));

  if (missingIcons.length > 0) {
    if (lucideImportMatch) {
      const allIcons = [...new Set([...importedIcons, ...missingIcons])];
      const newImport = `import { ${allIcons.join(', ')} } from 'lucide-react';`;
      code = code.replace(lucideImportMatch[0], newImport);
    } else {
      const newImport = `import { ${missingIcons.join(', ')} } from 'lucide-react';\n`;
      code = newImport + code;
    }
  }

  if (code !== originalCode) {
    fs.writeFileSync(file, code, 'utf8');
    fixedCount++;
    console.log('Fixed imports in:', file);
  }
});

console.log('Total files fixed:', fixedCount);
