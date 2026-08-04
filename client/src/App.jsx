import React, { useState, useEffect } from 'react';
import SearchPanel from './components/SearchPanel';
import BusCard from './components/BusCard';
import MapView from './components/MapView';
import PaymentModal from './components/PaymentModal';
import { useSocket } from './hooks/useSocket';
import { searchBuses, fetchAllBuses } from './services/api';

export default function App() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [allBuses, setAllBuses] = useState([]);
  const [originStop, setOriginStop] = useState(null);
  const [destinationStop, setDestinationStop] = useState(null);
  const [paymentBus, setPaymentBus] = useState(null); // bus to pay for

  const { busPositions, busUpdates, connected } = useSocket();

  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    fetchAllBuses()
      .then((res) => setAllBuses(res.data))
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

  // Only show buses on the map that have received a LIVE WebSocket position update.
  // This prevents stale simulator positions from MongoDB being shown on the map.
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

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── NAVBAR ── */}
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🚌</span>
          <span className="hide-on-mobile" style={{ fontWeight: 700, fontSize: 17, color: '#1e293b' }}>Opti</span>
          <span className="hide-on-mobile" style={{ fontWeight: 700, fontSize: 17, color: '#16a34a' }}>Flow</span>
          <span
            style={{
              marginLeft: 4, fontSize: 10, fontWeight: 600, color: '#16a34a',
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: 99, padding: '2px 8px', letterSpacing: '0.05em',
            }}
          >
            PASSENGER
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Live dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="live-dot" style={{ background: connected ? '#16a34a' : '#ef4444' }} />
          <span className="hide-on-mobile" style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>
            {connected ? 'Live' : 'Connecting...'}
          </span>
        </div>

        <div className="hide-on-mobile" style={{ height: 20, width: 1, background: '#e2e8f0', margin: '0 12px' }} />
        <span className="hide-on-mobile" style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap', marginRight: 12 }}>Coimbatore City Transit</span>

        {deferredPrompt && (
          <button
            onClick={handleInstallClick}
            style={{
              background: '#16a34a', color: '#fff', border: 'none',
              padding: '6px 14px', borderRadius: 99, fontSize: 13,
              fontWeight: 600, cursor: 'pointer', display: 'flex', gap: 6,
              alignItems: 'center', boxShadow: '0 2px 4px rgba(22,163,74,0.3)',
              marginLeft: 'auto'
            }}
          >
            <span style={{ fontSize: 14 }}>⬇️</span> Install App
          </button>
        )}
      </nav>

      {/* ── MAIN LAYOUT ── */}
      <div className="app-layout" style={{ flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <aside className="sidebar">
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
            originStop={originStop}
            destinationStop={destinationStop}
            BusCardComponent={BusCard}
            error={error}
          />
        </aside>

        {/* Map */}
        <main className="map-container" style={{ position: 'relative', overflow: 'hidden' }}>
          <MapView
            selectedBus={selectedBus}
            busPositions={busPositions}
            allBuses={mergedBuses}
            busUpdates={busUpdates}
            originStop={originStop}
            destinationStop={destinationStop}
          />

          {/* Map legend */}
          <div
            style={{
              position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
              border: '1px solid #e2e8f0', borderRadius: 99,
              padding: '8px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
              display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#64748b',
              whiteSpace: 'nowrap',
            }}
          >
            <span>🟢 Origin</span>
            <span style={{ color: '#e2e8f0' }}>|</span>
            <span>⬛ Destination</span>
            <span style={{ color: '#e2e8f0' }}>|</span>
            <span>🚌 Live Bus</span>
            <span style={{ color: '#e2e8f0' }}>|</span>
            <span style={{ color: '#16a34a' }}>━</span> Route
          </div>

          {/* Selected bus banner */}
          {selectedBus && (
            <div
              style={{
                position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
                background: '#fff', border: '1.5px solid #16a34a',
                borderRadius: 10, padding: '8px 18px',
                display: 'flex', alignItems: 'center', gap: 10,
                boxShadow: '0 2px 12px rgba(22,163,74,0.15)',
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 13, color: '#16a34a' }}>
                🚌 Route {selectedBus.bus_number}
              </span>
              <span style={{ fontSize: 12, color: '#64748b' }}>{selectedBus.route_name}</span>
              <button
                onClick={() => setSelectedBus(null)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#94a3b8', fontSize: 16, padding: 0, lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Selected bus banner */}
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
