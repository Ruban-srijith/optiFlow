const fs = require('fs');
const path = require('path');

const emojiMap = {
  '🗺️': 'Map',
  '👨‍✈️': 'UserSquare2',
  '🎫': 'Ticket',
  '💰': 'Coins',
  '🚑': 'Ambulance',
  '🏥': 'Hospital',
  '🚨': 'Siren',
  '🚥': 'TrafficCone',
  '🚦': 'TrafficCone',
  '👥': 'Users',
  '📍': 'MapPin',
  '🚌': 'Bus',
  '🔥': 'Flame',
  '❌': 'XCircle',
  '⚠️': 'AlertTriangle',
  '🛣️': 'Route',
  '📈': 'TrendingUp',
  '📊': 'BarChart',
  '🗓️': 'Calendar',
  '🛡️': 'ShieldCheck',
  '🎟️': 'Ticket',
  '👤': 'User',
  '💵': 'Banknote',
  '📲': 'Smartphone',
  '✅': 'CheckCircle2',
  '🛑': 'XCircle',
  '🟢': 'Circle'
};

function getRequiredIcons(content) {
  const icons = new Set();
  for (const [emoji, iconName] of Object.entries(emojiMap)) {
    if (content.includes(emoji)) icons.add(iconName);
  }
  return Array.from(icons);
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const requiredIcons = getRequiredIcons(content);
  if (requiredIcons.length === 0) return;

  // Add imports
  const importStatement = `import { ${requiredIcons.join(', ')} } from 'lucide-react';\n`;
  if (content.includes("from 'react'") || content.includes('from "react"')) {
    content = content.replace(/import React.*?from ['"]react['"];?\n/, match => match + importStatement);
  } else {
    content = importStatement + content;
  }

  // Replace quoted emojis: '🗺️' -> <Map size={16} />
  for (const [emoji, iconName] of Object.entries(emojiMap)) {
    // We use a regex that matches quotes, replacing them entirely to insert a React element
    // e.g. "🗺️" -> <Map size={16} />
    const quotedRegex = new RegExp(`(['"])${emoji}(['"])`, 'g');
    content = content.replace(quotedRegex, `<${iconName} size={16} />`);
    
    // Replace unquoted emojis
    const unquotedRegex = new RegExp(emoji, 'g');
    content = content.replace(unquotedRegex, `<${iconName} size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} />`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Patched: ' + filePath);
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  let files = fs.readdirSync(dir);
  for (let file of files) {
    let full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') walk(full);
    } else if (full.endsWith('.jsx')) {
      processFile(full);
    }
  }
}

walk('c:/Users/guruv/OneDrive/Desktop/OptiFlow/client/src/components');
walk('c:/Users/guruv/OneDrive/Desktop/OptiFlow/client-conductor/src/components');
