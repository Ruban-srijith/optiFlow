import React, { useState, useEffect } from 'react';
import { Coins, Banknote, Smartphone } from 'lucide-react';
import { getRevenueStats } from '../../services/api';

export default function RevenuePage() {
  const [data, setData] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getRevenueStats(from || undefined, to || undefined);
      setData(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const overall = data?.overall || {};
  const routes = data?.routes || [];
  const maxRev = routes[0]?.grand_total || 1;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Revenue Analytics</div>
          <div className="page-sub">Cash vs Online collections per route</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="form-group" style={{ gap: 3 }}>
            <label className="form-label">From</label>
            <input type="date" className="form-input" style={{ height: 34 }} value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="form-group" style={{ gap: 3 }}>
            <label className="form-label">To</label>
            <input type="date" className="form-input" style={{ height: 34 }} value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <button className="btn btn-primary" style={{ alignSelf: 'flex-end' }} onClick={load} disabled={loading}>
            {loading ? <span className="spinner" /> : '🔍 Filter'}
          </button>
        </div>
      </div>

      {/* Overall stat cards */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f0fdf4' }}><Coins size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /></div>
          <div>
            <div className="stat-value">₹{(overall.grand_total || 0).toLocaleString()}</div>
            <div className="stat-label">Total Revenue</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fffbeb' }}><Banknote size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /></div>
          <div>
            <div className="stat-value">₹{(overall.cash_total || 0).toLocaleString()}</div>
            <div className="stat-label">Cash Collections</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eef2ff' }}><Smartphone size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /></div>
          <div>
            <div className="stat-value">₹{(overall.online_total || 0).toLocaleString()}</div>
            <div className="stat-label">Online Collections</div>
          </div>
        </div>
      </div>

      {/* Per-route breakdown */}
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Revenue by Route</div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>Loading...</div>
        ) : routes.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 13 }}>No revenue data for the selected period.</p>
        ) : (
          <div>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 8, padding: '8px 12px', borderBottom: '1px solid #f1f5f9', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              <span>Route</span>
              <span style={{ textAlign: 'right' }}>Cash</span>
              <span style={{ textAlign: 'right' }}>Online</span>
              <span style={{ textAlign: 'right' }}>Tickets</span>
              <span style={{ textAlign: 'right' }}>Total</span>
            </div>
            {routes.map((r) => {
              const pct = Math.round((r.grand_total / maxRev) * 100);
              const cashPct = r.grand_total ? Math.round(((r.cash?.total || 0) / r.grand_total) * 100) : 0;
              return (
                <div key={r.bus_id} style={{ borderBottom: '1px solid #f1f5f9', padding: '14px 12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 8, marginBottom: 10, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>Route {r.bus_number}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.route_name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#d97706' }}>₹{r.cash?.total || 0}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{r.cash?.tickets || 0} tickets</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#4f46e5' }}>₹{r.online?.total || 0}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{r.online?.tickets || 0} tickets</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{r.total_tickets}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{r.total_passengers} pax</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#16a34a' }}>₹{r.grand_total}</div>
                    </div>
                  </div>
                  {/* Segmented bar */}
                  <div style={{ height: 6, borderRadius: 99, background: '#e2e8f0', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${cashPct}%`, background: '#d97706', transition: 'width 0.4s' }} />
                    <div style={{ flex: 1, background: '#4f46e5', transition: 'width 0.4s' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: '#d97706' }}>■ Cash {cashPct}%</span>
                    <span style={{ fontSize: 10, color: '#4f46e5' }}>■ Online {100 - cashPct}%</span>
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
