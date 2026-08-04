import React, { useRef, useCallback } from 'react';
import { MapPin, Search, ArrowUpDown, Bus } from 'lucide-react';

const COIMBATORE_STOPS = [
  'Ondipudur', 'Singanallur', 'Ramanathapuram', 'Lakshmi Mills',
  'Gandhipuram', 'Lawley Road', 'Vadavalli', 'Maruthamalai',
  'Ganapathy', 'Sivananda Colony', 'Town Hall', 'Ukkadam',
  'Kovaipudur', 'Railway Station', 'Saibaba Colony', 'Thudiyalur',
];

/**
 * SearchPanel — left sidebar with origin/destination inputs and bus result cards.
 *
 * Props:
 *   origin, destination: string state
 *   setOrigin, setDestination: setters
 *   onSearch: () => void
 *   loading: boolean
 *   results: bus array
 *   busUpdates: live socket data
 *   selectedBus: bus_id string
 *   onSelectBus: (bus) => void
 *   BusCardComponent: component ref
 */
export default function SearchPanel({
  origin, destination,
  setOrigin, setDestination,
  onSearch, loading,
  results,
  busUpdates,
  selectedBus,
  onSelectBus,
  onPayOnline,
  BusCardComponent,
  error,
}) {
  const originRef = useRef(null);
  const destRef = useRef(null);

  const [originSuggestions, setOriginSuggestions] = React.useState([]);
  const [destSuggestions, setDestSuggestions] = React.useState([]);
  const [showOriginSugg, setShowOriginSugg] = React.useState(false);
  const [showDestSugg, setShowDestSugg] = React.useState(false);

  const filterStops = (query) =>
    COIMBATORE_STOPS.filter((s) => s.toLowerCase().includes(query.toLowerCase()));

  const handleOriginChange = (e) => {
    const val = e.target.value;
    setOrigin(val);
    setOriginSuggestions(val.length >= 2 ? filterStops(val) : []);
    setShowOriginSugg(val.length >= 2);
  };

  const handleDestChange = (e) => {
    const val = e.target.value;
    setDestination(val);
    setDestSuggestions(val.length >= 2 ? filterStops(val) : []);
    setShowDestSugg(val.length >= 2);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setShowOriginSugg(false);
      setShowDestSugg(false);
      onSearch();
    }
  };

  return (
    <>
      {/* Search form */}
      <div className="card" style={{ padding: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#1e293b' }}>
          Find Your Bus
        </h2>

        {/* Origin input */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
            FROM
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
              <MapPin size={16} color="#16a34a" />
            </span>
            <input
              id="origin-input"
              ref={originRef}
              className="input-field"
              placeholder="Origin stop (e.g. Gandhipuram)"
              value={origin}
              onChange={handleOriginChange}
              onKeyDown={handleKeyDown}
              onFocus={() => origin.length >= 2 && setShowOriginSugg(true)}
              onBlur={() => setTimeout(() => setShowOriginSugg(false), 150)}
              style={{ paddingLeft: 32 }}
              autoComplete="off"
            />
          </div>
          {showOriginSugg && originSuggestions.length > 0 && (
            <SuggestionList
              items={originSuggestions}
              onSelect={(val) => { setOrigin(val); setShowOriginSugg(false); }}
            />
          )}
        </div>

        {/* Swap button */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '2px 0' }}>
          <button
            id="swap-stops-btn"
            onClick={() => { setOrigin(destination); setDestination(origin); }}
            title="Swap stops"
            style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '50%',
              width: 28, height: 28, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}
          >
            <ArrowUpDown size={14} color="#15803d" />
          </button>
        </div>

        {/* Destination input */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
            TO
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
              <MapPin size={16} color="#1e293b" />
            </span>
            <input
              id="destination-input"
              ref={destRef}
              className="input-field"
              placeholder="Destination stop (e.g. Vadavalli)"
              value={destination}
              onChange={handleDestChange}
              onKeyDown={handleKeyDown}
              onFocus={() => destination.length >= 2 && setShowDestSugg(true)}
              onBlur={() => setTimeout(() => setShowDestSugg(false), 150)}
              style={{ paddingLeft: 32 }}
              autoComplete="off"
            />
          </div>
          {showDestSugg && destSuggestions.length > 0 && (
            <SuggestionList
              items={destSuggestions}
              onSelect={(val) => { setDestination(val); setShowDestSugg(false); }}
            />
          )}
        </div>

        <button
          id="search-btn"
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={onSearch}
          disabled={loading || !origin || !destination}
        >
          {loading ? <span className="spinner" /> : <Search size={16} />}
          {loading ? 'Searching...' : 'Search Buses'}
        </button>

        {error && (
          <p style={{ fontSize: 12, color: '#ef4444', marginTop: 10, textAlign: 'center' }}>
            {error}
          </p>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
              {results.length} bus{results.length > 1 ? 'es' : ''} found
            </span>
            <span className="badge badge-green">{origin} → {destination}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {results.map((bus) => (
              <BusCardComponent
                key={bus.bus_id}
                bus={bus}
                liveData={busUpdates[bus.bus_id]}
                onSelect={onSelectBus}
                selected={selectedBus === bus.bus_id}
                onPayOnline={onPayOnline}
              />
            ))}
          </div>
        </div>
      )}

      {results.length === 0 && !loading && origin && destination && (
        <div
          style={{
            textAlign: 'center', padding: '32px 16px',
            color: '#64748b', fontSize: 14,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Bus size={48} color="#94a3b8" /></div>
          No direct buses found for this route.
          <br />
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Try searching common stops like Gandhipuram.</span>
        </div>
      )}
    </>
  );
}

function SuggestionList({ items, onSelect }) {
  return (
    <div
      style={{
        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)', marginTop: 2, overflow: 'hidden',
      }}
    >
      {items.map((item) => (
        <button
          key={item}
          onMouseDown={() => onSelect(item)}
          style={{
            display: 'block', width: '100%', textAlign: 'left',
            padding: '10px 14px', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 13, color: '#1e293b',
            borderBottom: '1px solid #f1f5f9',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#f0fdf4')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          <MapPin size={14} color="#64748b" style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} /> {item}
        </button>
      ))}
    </div>
  );
}
