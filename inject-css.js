const fs = require('fs');

const adminCssPath = 'g:/optiFlow/admin/src/index.css';
const clientCssPath = 'g:/optiFlow/client/src/index.css';

const adminCss = fs.readFileSync(adminCssPath, 'utf8');
let clientCss = fs.readFileSync(clientCssPath, 'utf8');

// If it already has admin styles, we don't append again
if (!clientCss.includes('.admin-layout')) {
  // Extract CSS variables from admin and append them to client's :root
  // Or simply append the whole admin CSS (it won't hurt, it just redefines some variables)
  
  // Let's extract everything from /* ─── Layout ─── */ to the end
  const layoutMatch = adminCss.indexOf('/* ─── Layout ────────────────────────────────────────────────────────────────── */');
  if (layoutMatch !== -1) {
    const adminLayoutCss = adminCss.substring(layoutMatch);
    
    // Also extract the :root variables from admin
    const rootMatch = adminCss.match(/:root\s*{([^}]+)}/);
    if (rootMatch) {
      const variables = rootMatch[1];
      // Inject variables into client's :root
      clientCss = clientCss.replace(/:root\s*{/, `:root {\n  /* Admin Variables */${variables}\n`);
    }
    
    // Append the layout CSS
    clientCss += '\n\n/* ─── ADMIN PORTAL CSS ─── */\n\n' + adminLayoutCss;
    
    fs.writeFileSync(clientCssPath, clientCss);
    console.log('Successfully injected Admin CSS into passenger app index.css');
  } else {
    console.log('Could not find Layout section in admin css');
  }
} else {
  console.log('Admin CSS already exists in passenger app index.css');
}
