import React, { useState, useEffect } from 'react';
import './index.css';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import RoutesPage from './components/RoutesPage';
import ConductorsPage from './components/ConductorsPage';
import BookingsPage from './components/BookingsPage';
import TrafficControlPage from './components/TrafficControlPage';
import RevenuePage from './components/RevenuePage';
import AmbulanceFleetPage from './components/AmbulanceFleetPage';
import EmergencyCallsPage from './components/EmergencyCallsPage';
import UserManagementPage from './components/UserManagementPage';
import { getMe } from './services/api';

export default function App() {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(true);
  const [page, setPage] = useState('dashboard');

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      getMe()
        .then((res) => setAdmin(res.data))
        .catch(() => {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_info');
        })
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  const handleLogin = (adminData) => setAdmin(adminData);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_info');
    setAdmin(null);
  };

  if (checking) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: '#64748b', background: '#f8fafc' }}>
        <span style={{ fontSize: 32 }}>⚡</span>
        <p style={{ fontSize: 14 }}>Verifying session...</p>
      </div>
    );
  }

  if (!admin) return <Login onLogin={handleLogin} />;

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard onNavigate={setPage} />;
      case 'users': return <UserManagementPage />;
      case 'routes': return <RoutesPage />;
      case 'conductors': return <ConductorsPage />;
      case 'bookings': return <BookingsPage />;
      case 'revenue': return <RevenuePage />;
      case 'ambulance_fleet': return <AmbulanceFleetPage />;
      case 'emergency_calls': return <EmergencyCallsPage />;
      case 'traffic_control': return <TrafficControlPage />;
      default: return <Dashboard onNavigate={setPage} />;
    }
  };

  const pageTitles = {
    dashboard: { title: 'Dashboard', sub: 'Transit & emergency fleet overview' },
    users: { title: 'User Hierarchy', sub: 'Manage roles, admins, drivers, and conductors' },
    routes: { title: 'Bus Routes', sub: 'Manage bus routes and stops' },
    conductors: { title: 'Conductors', sub: 'Manage conductor accounts and assignments' },
    bookings: { title: 'Commuter Bookings', sub: 'Manage passenger seat reservations' },
    revenue: { title: 'Revenue', sub: 'Collection analytics' },
    ambulance_fleet: { title: 'Ambulance Fleet', sub: 'Emergency medical unit management' },
    emergency_calls: { title: 'Emergency Dispatch', sub: 'Hotline calls and Green Corridor overrides' },
    traffic_control: { title: 'Traffic Signal Override', sub: 'Coimbatore junction controls and manual overrides' },
  };

  return (
    <div className="admin-layout">
      <Sidebar page={page} setPage={setPage} admin={admin} onLogout={handleLogout} />
      <div className="admin-content">
        {/* Top bar */}
        <header className="admin-navbar">
          <div>
            <div className="admin-navbar-title">{pageTitles[page]?.title}</div>
            <div className="admin-navbar-sub">{pageTitles[page]?.sub}</div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
              RBAC Enabled ({admin.role})
            </span>
          </div>
        </header>
        <main className="admin-main">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
