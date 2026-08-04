import React from 'react';

const NAV_ITEMS = [
  { key: 'dashboard', icon: '📊', label: 'Dashboard' },
  { key: 'routes', icon: '🗺️', label: 'Routes' },
  { key: 'conductors', icon: '👨‍✈️', label: 'Conductors' },
  { key: 'revenue', icon: '💰', label: 'Revenue' },
];

export default function Sidebar({ page, setPage, admin, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>🚌</span>
          <div>
            <div className="sidebar-brand-title">OptiFlow</div>
            <div className="sidebar-brand-badge">SUPER ADMIN</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`sidebar-item ${page === item.key ? 'active' : ''}`}
            onClick={() => setPage(item.key)}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{admin?.full_name}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{admin?.role}</div>
        </div>
        <button className="sidebar-item" onClick={onLogout} style={{ color: '#f87171' }}>
          <span className="icon">🚪</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
