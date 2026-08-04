import React from 'react';

export default function Sidebar({ page, setPage, admin, onLogout }) {
  const role = admin?.role || 'superadmin';

  const isSuper = role === 'superadmin';
  const isTransit = isSuper || role === 'transit_admin';
  const isAmbulance = isSuper || role === 'ambulance_admin';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>⚡</span>
          <div>
            <div className="sidebar-brand-title">OptiFlow</div>
            <div className="sidebar-brand-badge">
              {role === 'superadmin' ? 'SUPER ADMIN' : role === 'transit_admin' ? 'TRANSIT ADMIN' : 'HEALTH ADMIN'}
            </div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`sidebar-item ${page === 'dashboard' ? 'active' : ''}`}
          onClick={() => setPage('dashboard')}
        >
          <span className="icon">📊</span>
          Overview Dashboard
        </button>

        {isSuper && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', padding: '12px 12px 4px 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              👑 System Governance
            </div>
            <button
              className={`sidebar-item ${page === 'users' ? 'active' : ''}`}
              onClick={() => setPage('users')}
            >
              <span className="icon">👥</span>
              Users & Hierarchy
            </button>
          </>
        )}

        {isTransit && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', padding: '16px 12px 4px 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🚌 Govt Bus Transit
            </div>
            <button className={`sidebar-item ${page === 'routes' ? 'active' : ''}`} onClick={() => setPage('routes')}>
              <span className="icon">🗺️</span> Routes & Buses
            </button>
            <button className={`sidebar-item ${page === 'conductors' ? 'active' : ''}`} onClick={() => setPage('conductors')}>
              <span className="icon">👨‍✈️</span> Conductors
            </button>
            <button className={`sidebar-item ${page === 'bookings' ? 'active' : ''}`} onClick={() => setPage('bookings')}>
              <span className="icon">🎟️</span> Seat Bookings
            </button>
            <button className={`sidebar-item ${page === 'revenue' ? 'active' : ''}`} onClick={() => setPage('revenue')}>
              <span className="icon">💰</span> Revenue Stats
            </button>
          </>
        )}

        {isAmbulance && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#f87171', padding: '16px 12px 4px 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🚑 Ambulance Emergency
            </div>
            <button className={`sidebar-item ${page === 'ambulance_fleet' ? 'active' : ''}`} onClick={() => setPage('ambulance_fleet')}>
              <span className="icon">🚑</span> Ambulance Fleet
            </button>
            <button className={`sidebar-item ${page === 'emergency_calls' ? 'active' : ''}`} onClick={() => setPage('emergency_calls')}>
              <span className="icon">🚨</span> Emergency Dispatch
            </button>
            <button className={`sidebar-item ${page === 'traffic_control' ? 'active' : ''}`} onClick={() => setPage('traffic_control')}>
              <span className="icon">🚥</span> Traffic Control
            </button>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{admin?.full_name}</div>
          <div style={{ fontSize: 10, color: '#93c5fd', marginTop: 2 }}>{admin?.phone_number || admin?.username}</div>
        </div>
        <button className="sidebar-item" onClick={onLogout} style={{ color: '#f87171' }}>
          <span className="icon">🚪</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
