import React from 'react';
import ForecastDrawer from './ForecastDrawer';
import { Bus, MapPin } from 'lucide-react';

/**
 * BusCard — displays bus info, occupancy, fare, forecast accordion, and Pay Online.
 *
 * Props:
 *   bus         — bus object from search API
 *   liveData    — real-time socket data
 *   onSelect    — highlight on map
 *   selected    — boolean
 *   onPayOnline — trigger payment modal with this bus
 */
export default function BusCard({ bus, liveData, onSelect, selected, onPayOnline }) {
  const freeSeats = liveData?.free_seats ?? bus.free_seats;
  const passengers = liveData?.current_passengers ?? bus.current_passengers;
  const capacity = bus.seating_capacity || 40;
  // Calculate standing passengers: total passengers exceeding seating capacity
  const standing = Math.max(0, passengers - capacity);

  const fillPct = Math.min(100, (passengers / capacity) * 100);

  const getFillColor = () => {
    if (standing > 30) return '#dc2626'; // Overcrowded - Dark Red
    if (standing > 0) return '#ea580c';  // Moderate Crowd - Orange/Amber
    if (fillPct < 60) return '#16a34a';  // Available - Green
    return '#f59e0b';                    // Filling Up - Yellow
  };

  const getOccupancyBadge = () => {
    if (standing > 30) {
      return { cls: 'badge badge-red', label: `Overcrowded (${standing} Standing)` };
    }
    if (standing > 0) {
      return { cls: 'badge badge-orange', label: `Moderate Crowd (${standing} Standing)` };
    }
    if (fillPct < 60) {
      return { cls: 'badge badge-green', label: 'Available' };
    }
    return { cls: 'badge badge-orange', label: 'Filling up' };
  };

  const badge = getOccupancyBadge();

  return (
    <div
      className="card"
      id={`bus-card-${bus.bus_id}`}
      onClick={() => onSelect && onSelect(bus)}
      style={{
        padding: '16px',
        cursor: 'pointer',
        border: selected ? '2px solid #16a34a' : '1px solid #e2e8f0',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 42, height: 42, background: '#f0fdf4', border: '1.5px solid #bbf7d0',
              borderRadius: 10, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 16 }}><Bus size={20} color="#15803d" /></span>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#15803d', lineHeight: 1 }}>
              {bus.bus_number}
            </span>
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
              Route {bus.bus_number}
            </h3>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{bus.route_name}</p>
          </div>
        </div>
        <span className={badge.cls}>{badge.label}</span>
      </div>

      {/* Stats Row */}
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}
      >
        <StatBox label="Free Seats" value={freeSeats} color="#16a34a" />
        <StatBox label="Standing" value={standing} color={standing > 30 ? '#dc2626' : standing > 0 ? '#ea580c' : '#64748b'} />
        <StatBox label="Fare" value={`₹${bus.fare}`} color="#1e293b" />
      </div>

      {/* Occupancy bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: '#64748b' }}>Occupancy ({passengers} total)</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: getFillColor() }}>
            {standing > 0 ? `${standing} Standing` : `${passengers} / ${capacity} seats`}
          </span>
        </div>
        <div className="seat-bar">
          <div
            className="seat-bar__fill"
            style={{ width: `${fillPct}%`, background: getFillColor() }}
          />
        </div>
      </div>

      {/* Chips row */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        <Chip icon={<MapPin size={12} color="#475569" />} label={`${bus.intermediate_stops} stops`} />
      </div>



      {/* Forecast drawer */}
      <ForecastDrawer forecast={bus.forecast} seatingCapacity={capacity} />
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div
      style={{
        background: '#f8fafc', border: '1px solid #e2e8f0',
        borderRadius: 8, padding: '8px 10px', textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 17, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Chip({ icon, label }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: '#f1f5f9', borderRadius: 99, padding: '3px 10px',
        fontSize: 12, color: '#475569',
      }}
    >
      {icon} {label}
    </span>
  );
}
