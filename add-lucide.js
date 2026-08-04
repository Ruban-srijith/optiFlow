const fs = require('fs');
const path = require('path');

const dirs = ['g:/optiFlow/client/src/components/admin', 'g:/optiFlow/admin/src/components'];
const ALL_ICONS = "import { Activity, AlertCircle, AlertTriangle, Ambulance, ArrowRight, Banknote, BarChart, Bus, CheckCircle, CheckCircle2, ChevronDown, ChevronUp, Circle, Clock, Coins, Compass, CreditCard, DollarSign, Edit, Edit2, Edit3, Flame, Hospital, LogOut, Map, MapPin, Navigation, Phone, PhoneCall, Play, Plus, PlusCircle, Radio, RefreshCw, RotateCcw, Search, ShieldAlert, Siren, Smartphone, StopCircle, Ticket, TrafficCone, Trash2, TrendingUp, User, Users, UserSquare2, X, XCircle } from 'lucide-react';\n";

dirs.forEach(DIR => {
  if (!fs.existsSync(DIR)) return;
  fs.readdirSync(DIR).forEach(file => {
    if (file.endsWith('.jsx')) {
      let content = fs.readFileSync(path.join(DIR, file), 'utf8');
      
      // Robustly remove ANY existing lucide-react imports
      content = content.replace(/import\s+\{[^}]*\}\s+from\s+['"]lucide-react['"];?(\r?\n)*/g, '');
      
      // Insert the new exhaustive import right after React import
      content = content.replace(/import React(.*?)\r?\n/, `import React$1\n${ALL_ICONS}`);
      
      fs.writeFileSync(path.join(DIR, file), content);
      console.log(`Replaced lucide-react in ${file}`);
    }
  });
});
