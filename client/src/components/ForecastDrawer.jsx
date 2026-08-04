import React, { useState } from 'react';
import { Bot } from 'lucide-react';

/**
 * ForecastDrawer — expandable accordion showing stop-by-stop ML seat forecast.
 * Props:
 *   forecast: [{ stop_id, stop_name, predicted_free_seats, predicted_boardings, predicted_dropoffs }]
 *   seatingCapacity: number
 */
export default function ForecastDrawer({ forecast = [], seatingCapacity = 40 }) {
  const [open, setOpen] = useState(false);

  if (!forecast || forecast.length === 0) return null;

  const getSeatColor = (freeSeats) => {
    const pct = freeSeats / seatingCapacity;
    if (pct >= 0.4) return '#16a34a';
    if (pct >= 0.15) return '#f59e0b';
    return '#ef4444';
  };

  const getSeatBadge = (freeSeats) => {
    const pct = freeSeats / seatingCapacity;
    if (pct >= 0.4) return 'badge badge-green';
    if (pct >= 0.15) return 'badge badge-orange';
    return 'badge badge-red';
  };

  return (
    <div style={{ marginTop: 12 }}>
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#16a34a',
          fontWeight: 600,
          fontSize: 13,
          padding: '6px 0',
        }}
        id="forecast-toggle"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        {open ? 'Hide' : 'View'} Stop-by-Stop Forecast
      </button>

      <div className={`accordion-content ${open ? 'open' : ''}`}>
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 10,
            padding: '12px 14px',
            marginTop: 8,
          }}
        >
          <p
            style={{ fontSize: 11, color: '#64748b', marginBottom: 12, fontWeight: 500 }}
          >
            <Bot size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} /> ML-predicted occupancy — powered by LightGBM
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {forecast.map((stop, idx) => {
              const fillPct = Math.max(
                0,
                Math.min(100, ((seatingCapacity - stop.predicted_free_seats) / seatingCapacity) * 100)
              );
              return (
                <div key={stop.stop_id || idx}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          background: '#16a34a',
                          color: '#fff',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{stop.stop_name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {stop.predicted_boardings > 0 && (
                        <span style={{ fontSize: 11, color: '#16a34a' }}>
                          ↑{stop.predicted_boardings}
                        </span>
                      )}
                      {stop.predicted_dropoffs > 0 && (
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          ↓{stop.predicted_dropoffs}
                        </span>
                      )}
                      <span className={getSeatBadge(stop.predicted_free_seats)}>
                        {stop.predicted_free_seats} free
                      </span>
                    </div>
                  </div>
                  {/* Occupancy bar */}
                  <div className="seat-bar" style={{ marginLeft: 30 }}>
                    <div
                      className="seat-bar__fill"
                      style={{
                        width: `${fillPct}%`,
                        background: getSeatColor(stop.predicted_free_seats),
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
