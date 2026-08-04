import React, { useEffect, useState } from 'react';
import { Activity, AlertCircle, AlertTriangle, Ambulance, ArrowRight, Banknote, BarChart, Bus, CheckCircle, CheckCircle2, ChevronDown, ChevronUp, Circle, Clock, Coins, Compass, CreditCard, DollarSign, Edit, Edit2, Edit3, Flame, Hospital, LogOut, Map, MapPin, Navigation, Phone, PhoneCall, Play, Plus, PlusCircle, Radio, RefreshCw, RotateCcw, Search, ShieldAlert, Siren, Smartphone, StopCircle, Ticket, TrafficCone, Trash2, TrendingUp, User, Users, UserSquare2, X, XCircle } from 'lucide-react';
import { getBuses, getConductors, getRevenueStats } from '../../services/api';

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState({ buses: 0, conductors: 0, revenue: 0, tickets: 0 });
  const [recentRoutes, setRecentRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [busRes, condRes, revRes] = await Promise.all([
          getBuses(), getConductors(), getRevenueStats()
        ]);
        const buses = busRes.data || [];
        const conductors = condRes.data || [];
        const rev = revRes.data;

        setStats({
          buses: buses.length,
          conductors: conductors.filter(c => c.is_active).length,
          revenue: rev.overall?.grand_total || 0,
          tickets: rev.overall?.total_tickets || 0,
        });
        setRecentRoutes(rev.routes?.slice(0, 5) || []);
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div style={{ padding: 40, color: '#64748b' }}>Loading dashboard...</div>;

  const statCards = [
    { icon: <Map size={16} />, label: 'Active Routes', value: stats.buses, bg: '#eef2ff', iconColor: '#4f46e5' },
    { icon: <UserSquare2 size={16} />, label: 'Conductors', value: stats.conductors, bg: '#f0fdf4', iconColor: '#16a34a' },
    { icon: <Ticket size={16} />, label: 'Total Tickets', value: stats.tickets, bg: '#fffbeb', iconColor: '#d97706' },
    { icon: <Coins size={16} />, label: 'Total Revenue', value: `₹${stats.revenue.toLocaleString()}`, bg: '#fdf4ff', iconColor: '#9333ea' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">OptiFlow fleet overview</div>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 28 }}>
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}>
              <span style={{ color: s.iconColor }}>{s.icon}</span>
            </div>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Top routes by revenue */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Top Routes by Revenue</div>
          <button className="btn btn-outline btn-ghost" style={{ fontSize: 12 }} onClick={() => onNavigate('revenue')}>
            View All →
          </button>
        </div>
        {recentRoutes.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 13 }}>No revenue data yet. Issue tickets from the Conductor Dashboard.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentRoutes.map((r) => {
              const maxRev = recentRoutes[0]?.grand_total || 1;
              const pct = Math.round((r.grand_total / maxRev) * 100);
              return (
                <div key={r.bus_id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      Route {r.bus_number} — {r.route_name}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#16a34a' }}>₹{r.grand_total}</span>
                  </div>
                  <div className="rev-bar">
                    <div className="rev-bar-fill" style={{ width: `${pct}%`, background: '#16a34a' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: '#64748b' }}><Banknote size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> Cash ₹{r.cash?.total || 0}</span>
                    <span style={{ fontSize: 10, color: '#4f46e5' }}><Smartphone size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> Online ₹{r.online?.total || 0}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
