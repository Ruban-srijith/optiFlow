import React, { useState, useEffect } from 'react';
import SearchPanel from './components/SearchPanel';
import BusCard from './components/BusCard';
import MapView from './components/MapView';
import PaymentModal from './components/PaymentModal';
import BookingModal from './components/BookingModal';
import BookingPanel from './components/BookingPanel';
import AmbulancePortal from './components/AmbulancePortal';
import AmbulanceDriverPortal from './components/AmbulanceDriverPortal';
import PassengerLogin from './components/PassengerLogin';
import { useSocket } from './hooks/useSocket';
import { searchBuses, fetchAllBuses, fetchAmbulances, fetchHospitals } from './services/api';

// Unified imports for Single-Login Experience
import ConductorDashboard from './components/ConductorDashboard';
import SidebarAdmin from './components/admin/Sidebar';
import DashboardAdmin from './components/admin/Dashboard';
import UserManagementPage from './components/admin/UserManagementPage';
import RoutesPage from './components/admin/RoutesPage';
import ConductorsPage from './components/admin/ConductorsPage';
import BookingsPageAdmin from './components/admin/BookingsPage';
import RevenuePage from './components/admin/RevenuePage';
import AmbulanceFleetPage from './components/admin/AmbulanceFleetPage';
import EmergencyCallsPage from './components/admin/EmergencyCallsPage';
import TrafficControlPageAdmin from './components/admin/TrafficControlPage';


export default function App() {
  const [passengerUser, setPassengerUser] = useState(() => {
    const stored = localStorage.getItem('passenger_info');
    return stored ? JSON.parse(stored) : null;
  });
  const [portalMode, setPortalMode] = useState('bus'); // 'bus' | 'ambulance'
  const [showDriverPortal, setShowDriverPortal] = useState(false);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [allBuses, setAllBuses] = useState([]);
  const [originStop, setOriginStop] = useState(null);
  const [destinationStop, setDestinationStop] = useState(null);
  const [paymentBus, setPaymentBus] = useState(null);

  // Ambulance portal state
  const [ambulances, setAmbulances] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);

  // Admin routing state
  const [adminPage, setAdminPage] = useState('dashboard');

  // Booking states
  const [bookingBus, setBookingBus] = useState(null);
  const [refreshBookings, setRefreshBookings] = useState(0);

  // Automatically enforce portal mode based on role
  useEffect(() => {
    if (passengerUser?.role === 'ambulance_driver') {
      setPortalMode('ambulance');
    } else if (passengerUser?.role === 'conductor') {
      setPortalMode('bus');
    }
  }, [passengerUser]);

  const { busPositions, busUpdates, connected } = useSocket();
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    fetchAllBuses()
      .then((res) => setAllBuses(res.data))
      .catch(() => {});

    fetchAmbulances()
      .then((res) => setAmbulances(res.data))
      .catch(() => {});

    fetchHospitals()
      .then((res) => setHospitals(res.data))
      .catch(() => {});

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const mergedBuses = allBuses
    .filter((b) => busPositions[b.bus_id] != null)
    .map((b) => ({
      ...b,
      current_location: { coordinates: busPositions[b.bus_id] },
    }));

  const handleSearch = async () => {
    if (!origin || !destination) return;
    setLoading(true);
    setError('');
    setResults([]);
    setSelectedBus(null);
    try {
      const res = await searchBuses(origin, destination);
      const data = res.data;
      setResults(data.buses || []);
      if (data.origin) setOriginStop(data.origin);
      if (data.destination) setDestinationStop(data.destination);
      if (data.buses?.length === 0) setError('No direct buses found for this route.');
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBus = (bus) => {
    setSelectedBus((prev) => (prev?.bus_id === bus.bus_id ? null : bus));
  };

  const handlePassengerLogout = () => {
    localStorage.removeItem('passenger_token');
    localStorage.removeItem('passenger_info');
    setPassengerUser(null);
  };

  if (!passengerUser) {
    return <PassengerLogin onLoginSuccess={setPassengerUser} />;
  }

  // 1. Conductor & Ambulance Driver view redirection
  if (['conductor', 'ambulance_driver'].includes(passengerUser.role)) {
    return (
      <ConductorDashboard
        conductor={passengerUser}
        onLogout={handlePassengerLogout}
      />
    );
  }

  // 2. Admin Roles view redirection (superadmin, transit_admin, ambulance_admin)
  if (['superadmin', 'transit_admin', 'ambulance_admin'].includes(passengerUser.role)) {
    const renderAdminPage = () => {
      switch (adminPage) {
        case 'dashboard': return <DashboardAdmin onNavigate={setAdminPage} />;
        case 'users': return <UserManagementPage />;
        case 'routes': return <RoutesPage />;
        case 'conductors': return <ConductorsPage />;
        case 'bookings': return <BookingsPageAdmin />;
        case 'revenue': return <RevenuePage />;
        case 'ambulance_fleet': return <AmbulanceFleetPage />;
        case 'emergency_calls': return <EmergencyCallsPage />;
        case 'traffic_control': return <TrafficControlPageAdmin />;
        default: return <DashboardAdmin onNavigate={setAdminPage} />;
      }
    };

    const adminPageTitles = {
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
      <div className="admin-layout" style={{ display: 'flex', height: '100vh', background: '#f8fafc' }}>
        <SidebarAdmin page={adminPage} setPage={setAdminPage} admin={passengerUser} onLogout={handlePassengerLogout} />
        <div className="admin-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Top bar */}
          <header className="admin-navbar" style={{ padding: '16px 24px', background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>{adminPageTitles[adminPage]?.title}</h2>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{adminPageTitles[adminPage]?.sub}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                Unified Single-Portal ({passengerUser.role})
              </span>
            </div>
          </header>
          <main className="admin-main" style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
            {renderAdminPage()}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── NAVBAR ── */}
      <nav className="navbar" style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '10px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>{portalMode === 'bus' ? '🚌' : '🚑'}</span>
          <span className="hide-on-mobile" style={{ fontWeight: 800, fontSize: 18, color: '#1e293b' }}>Opti</span>
          <span className="hide-on-mobile" style={{ fontWeight: 800, fontSize: 18, color: portalMode === 'bus' ? '#16a34a' : '#dc2626' }}>
            Flow
          </span>
        </div>

        {/* ── PORTAL SWITCHER PILL ── */}
        {passengerUser?.role !== 'ambulance_driver' && passengerUser?.role !== 'conductor' && (
          <div
            style={{
              display: 'flex',
              background: '#f1f5f9',
              borderRadius: 99,
              padding: 3,
              border: '1px solid #cbd5e1',
              margin: '0 16px',
            }}
          >
            <button
              onClick={() => setPortalMode('bus')}
              style={{
                background: portalMode === 'bus' ? '#ffffff' : 'transparent',
                color: portalMode === 'bus' ? '#15803d' : '#64748b',
                border: 'none',
                borderRadius: 99,
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: portalMode === 'bus' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>🚌</span> Govt Bus Portal
            </button>

            <button
              onClick={() => setPortalMode('ambulance')}
              style={{
                background: portalMode === 'ambulance' ? '#dc2626' : 'transparent',
                color: portalMode === 'ambulance' ? '#ffffff' : '#64748b',
                border: 'none',
                borderRadius: 99,
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: portalMode === 'ambulance' ? '0 2px 8px rgba(220,38,38,0.3)' : 'none',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>🚑</span> Ambulance Portal
            </button>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Live dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="live-dot" style={{ background: connected ? '#16a34a' : '#ef4444' }} />
          <span className="hide-on-mobile" style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
            {connected ? 'Live Sync' : 'Connecting...'}
          </span>
        </div>

        {['ambulance_driver', 'ambulance_admin', 'superadmin'].includes(passengerUser?.role) && (
          <>
            <div className="hide-on-mobile" style={{ height: 20, width: 1, background: '#e2e8f0', margin: '0 12px' }} />
            <button
              onClick={() => setShowDriverPortal(true)}
              style={{
                background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5',
                padding: '6px 12px', borderRadius: 99, fontSize: 12,
                fontWeight: 700, cursor: 'pointer', display: 'flex', gap: 6,
                alignItems: 'center', marginRight: 8,
              }}
            >
              <span>🚨</span> Driver Terminal
            </button>
          </>
        )}

        {/* Profile & Role Badge Chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', padding: '4px 12px', borderRadius: 99, border: '1px solid #cbd5e1' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
            {passengerUser?.role === 'superadmin' ? '👑 Super Admin' :
             passengerUser?.role === 'transit_admin' ? '🚌 Transit Admin' :
             passengerUser?.role === 'ambulance_admin' ? '🚑 Health Admin' :
             passengerUser?.role === 'conductor' ? '👨‍✈️ Conductor' :
             passengerUser?.role === 'ambulance_driver' ? '🚨 Ambulance Driver' : '👤 Passenger'}
            <span style={{ fontWeight: 500, color: '#64748b', marginLeft: 6, fontFamily: 'monospace' }}>
              ({passengerUser?.phone_number || passengerUser?.full_name})
            </span>
          </span>
          <button
            onClick={handlePassengerLogout}
            title="Sign Out"
            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontWeight: 700, marginLeft: 4 }}
          >
            Sign Out
          </button>
        </div>

        {deferredPrompt && (
          <button
            onClick={handleInstallClick}
            style={{
              background: '#16a34a', color: '#fff', border: 'none',
              padding: '6px 14px', borderRadius: 99, fontSize: 13,
              fontWeight: 600, cursor: 'pointer', display: 'flex', gap: 6,
              alignItems: 'center', boxShadow: '0 2px 4px rgba(22,163,74,0.3)',
            }}
          >
            <span>⬇️</span> Install
          </button>
        )}
      </nav>

      {/* ── MAIN LAYOUT ── */}
      <div className="app-layout" style={{ flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <aside className="sidebar">
          {portalMode === 'bus' ? (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <StatChip icon="🚌" label={`${allBuses.length} Active Buses`} />
                <StatChip
                  icon="🔴"
                  label={Object.keys(busUpdates).length > 0 ? `${Object.keys(busUpdates).length} Updated` : 'Awaiting updates'}
                />
              </div>

              <SearchPanel
                origin={origin}
                destination={destination}
                setOrigin={setOrigin}
                setDestination={setDestination}
                onSearch={handleSearch}
                loading={loading}
                results={results}
                busUpdates={busUpdates}
                selectedBus={selectedBus?.bus_id}
                onSelectBus={handleSelectBus}
                onPayOnline={setPaymentBus}
                onBookSeat={setBookingBus}
                userRole={passengerUser?.role}
                originStop={originStop}
                destinationStop={destinationStop}
                BusCardComponent={BusCard}
                error={error}
              />
              {passengerUser?.role === 'passenger' && (
                <BookingPanel refreshTrigger={refreshBookings} onBookingUpdate={() => setRefreshBookings((prev) => prev + 1)} />
              )}
            </>
          ) : (
            <AmbulancePortal
              selectedAmbulance={selectedAmbulance}
              onSelectAmbulance={setSelectedAmbulance}
              socketUpdates={busUpdates}
            />
          )}
        </aside>

        {/* Map */}
        <main className="map-container" style={{ position: 'relative', overflow: 'hidden' }}>
          <MapView
            portalMode={portalMode}
            selectedBus={selectedBus}
            busPositions={busPositions}
            allBuses={mergedBuses}
            busUpdates={busUpdates}
            originStop={originStop}
            destinationStop={destinationStop}
            ambulances={ambulances}
            hospitals={hospitals}
          />

          {/* Map legend */}
          <div
            style={{
              position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
              border: '1px solid #e2e8f0', borderRadius: 99,
              padding: '8px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
              display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#64748b',
              whiteSpace: 'nowrap', zIndex: 10,
            }}
          >
            {portalMode === 'bus' ? (
              <>
                <span>🟢 Origin</span>
                <span style={{ color: '#e2e8f0' }}>|</span>
                <span>⬛ Destination</span>
                <span style={{ color: '#e2e8f0' }}>|</span>
                <span>🚌 Live Bus</span>
                <span style={{ color: '#e2e8f0' }}>|</span>
                <span style={{ color: '#16a34a' }}>━</span> Route
              </>
            ) : (
              <>
                <span>🚑 Emergency Ambulance</span>
                <span style={{ color: '#e2e8f0' }}>|</span>
                <span>🏥 Trauma Hospital</span>
                <span style={{ color: '#e2e8f0' }}>|</span>
                <span style={{ color: '#22c55e', fontWeight: 700 }}>━━ Green Corridor</span>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Driver Terminal Modal */}
      {showDriverPortal && (
        <AmbulanceDriverPortal onClose={() => setShowDriverPortal(false)} />
      )}

      {/* Payment Modal */}
      {paymentBus && (
        <PaymentModal
          bus={paymentBus}
          originStop={originStop}
          destinationStop={destinationStop}
          onClose={() => setPaymentBus(null)}
        />
      )}

      {/* Booking Modal */}
      {bookingBus && (
        <BookingModal
          bus={bookingBus}
          originStop={originStop}
          destinationStop={destinationStop}
          onClose={() => setBookingBus(null)}
          onBookingSuccess={() => {
            setBookingBus(null);
            setRefreshBookings((prev) => prev + 1);
          }}
        />
      )}
    </div>
  );
}

function StatChip({ icon, label }) {
  return (
    <div
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: '#f0fdf4', border: '1px solid #bbf7d0',
        borderRadius: 99, padding: '4px 12px',
        fontSize: 12, color: '#15803d', fontWeight: 500,
      }}
    >
      {icon} {label}
    </div>
  );
}
