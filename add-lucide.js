const fs = require('fs');
const path = require('path');

const DIR = 'g:/optiFlow/client/src/components/admin';
const ALL_ICONS = "import { Activity, AlertCircle, AlertTriangle, ArrowRight, Banknote, BarChart, Bus, CheckCircle, CheckCircle2, ChevronDown, ChevronUp, Circle, Clock, Compass, CreditCard, DollarSign, Edit, Edit2, Flame, Hospital, LogOut, Map, MapPin, Navigation, Phone, PhoneCall, Play, Plus, PlusCircle, Radio, RefreshCw, RotateCcw, Search, ShieldAlert, Siren, Smartphone, StopCircle, Ticket, TrafficCone, Trash2, TrendingUp, User, Users, UserSquare2, X } from 'lucide-react';\n";

fs.readdirSync(DIR).forEach(file => {
  if (file.endsWith('.jsx')) {
    let content = fs.readFileSync(path.join(DIR, file), 'utf8');
    // Replace the old lucide import if it exists, or add it
    if (content.includes('from \'lucide-react\'')) {
      content = content.replace(/import \{.*?\} from 'lucide-react';\n/s, ALL_ICONS);
    } else {
      content = content.replace(/import React(.*?)\n/, `import React$1\n${ALL_ICONS}`);
    }
    fs.writeFileSync(path.join(DIR, file), content);
    console.log(`Updated lucide-react in ${file}`);
  }
});
