import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket';
import { fetchAllBuses, issueTicket } from '../services/api';
import axios from 'axios';

// ---------------------------------------------------------------------------
// STOP NAMES (mirrors seed data)
// ---------------------------------------------------------------------------
const STOP_NAMES = {
  101: 'Ondipudur',     102: 'Singanallur',     103: 'Ramanathapuram',
  104: 'Lakshmi Mills', 105: 'Gandhipuram',      106: 'Lawley Road',
  107: 'Vadavalli',     108: 'Maruthamalai',
  201: 'Ganapathy',     202: 'Sivananda Colony', 203: 'Town Hall',
  204: 'Ukkadam',       205: 'Kovaipudur',
  301: 'Railway Station', 302: 'Saibaba Colony', 303: 'Thudiyalur',
};

function calculateFare(stopCount) {
  return Math.max(5, stopCount * 2);
}

// ---------------------------------------------------------------------------
// TICKET RECEIPT COMPONENT
// ---------------------------------------------------------------------------
function TicketReceipt({ ticket, onClose }) {
  if (!ticket) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200, padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, padding: 28,
          maxWidth: 360, width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          border: '2px solid #16a34a',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🎫</div>
          <h3 style={{ fontWeight: 800, fontSize: 18, color: '#16a34a' }}>Ticket Issued!</h3>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>TNSTC · OptiFlow</p>
        </div>

        {/* Divider dashed */}
        <div style={{ borderTop: '2px dashed #e2e8f0', margin: '12px 0' }} />

        {/* Receipt rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ReceiptRow label="Ticket ID" value={ticket.ticket_id?.slice(0, 8).toUpperCase()} mono />
          <ReceiptRow label="Bus" value={ticket.bus_number || ticket.bus_id} />
          <ReceiptRow label="From" value={STOP_NAMES[ticket.origin_stop_id] || ticket.origin_stop_id} />
          <ReceiptRow label="To" value={STOP_NAMES[ticket.destination_stop_id] || ticket.destination_stop_id} />
          <ReceiptRow label="Passengers" value={ticket.passenger_count} />
        </div>

        <div style={{ borderTop: '2px dashed #e2e8f0', margin: '12px 0' }} />

        {/* Fare */}
        <div
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: '#f0fdf4', borderRadius: 10, padding: '12px 16px',
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>Total Fare</span>
          <span style={{ fontWeight: 800, fontSize: 22, color: '#16a34a' }}>₹{ticket.fare_paid}</span>
        </div>

        {/* Seats remaining */}
        {ticket.free_seats !== undefined && (
          <p style={{ textAlign: 'center', fontSize: 12, color: '#64748b', marginTop: 12 }}>
            {ticket.free_seats} seats remaining on this bus
          </p>
        )}

        <button
          id="close-receipt-btn"
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
          onClick={onClose}
        >
          ✓ Done
        </button>
      </div>
    </div>
  );
}

function ReceiptRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: '#64748b' }}>{label}</span>
      <span
        style={{
          fontSize: 13, fontWeight: 600, color: '#1e293b',
          fontFamily: mono ? 'monospace' : 'inherit',
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RECENT TICKET ROW
// ---------------------------------------------------------------------------
function TicketRow({ ticket, busNumber }) {
  const timeAgo = (() => {
    const diff = Date.now() - new Date(ticket.issued_at).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  })();

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 0', borderBottom: '1px solid #f1f5f9',
      }}
    >
      <div
        style={{
          width: 36, height: 36, background: '#f0fdf4', border: '1.5px solid #bbf7d0',
          borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, flexShrink: 0,
        }}
      >
        🎫
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
          {STOP_NAMES[ticket.origin_stop_id]} → {STOP_NAMES[ticket.destination_stop_id]}
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
          {ticket.passenger_count} pax · {timeAgo}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>₹{ticket.fare_paid}</div>
        <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>
          #{ticket.ticket_id?.slice(0, 6).toUpperCase()}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN CONDUCTOR DASHBOARD
// ---------------------------------------------------------------------------
export default function ConductorDashboard() {
  const [buses, setBuses] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState('');
  const [selectedBus, setSelectedBus] = useState(null);
  const [originStopId, setOriginStopId] = useState('');
  const [destStopId, setDestStopId] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);
  const [issuing, setIssuing] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [currentPassengers, setCurrentPassengers] = useState(0);

  const { busUpdates } = useSocket();

  // Load all buses on mount
  useEffect(() => {
    fetchAllBuses().then((res) => {
      setBuses(res.data);
      if (res.data.length > 0) {
        setSelectedBusId(res.data[0].bus_id);
      }
    });
  }, []);

  // When bus selection changes, update selectedBus state
  useEffect(() => {
    const bus = buses.find((b) => b.bus_id === selectedBusId);
    setSelectedBus(bus || null);
    setOriginStopId('');
    setDestStopId('');
  }, [selectedBusId, buses]);

  // Fetch recent tickets for selected bus
  const fetchRecentTickets = useCallback(async () => {
    if (!selectedBusId) return;
    setLoadingTickets(true);
    try {
      const res = await axios.get('/api/tickets');
      const busTickets = res.data
        .filter((t) => t.bus_id === selectedBusId)
        .slice(0, 20);
      setRecentTickets(busTickets);
    } catch (_) {}
    setLoadingTickets(false);
  }, [selectedBusId]);

  useEffect(() => {
    fetchRecentTickets();
  }, [fetchRecentTickets, receipt]);

  // Live occupancy from socket
  useEffect(() => {
    if (busUpdates[selectedBusId]) {
      setCurrentPassengers(busUpdates[selectedBusId].current_passengers ?? 0);
    }
  }, [busUpdates, selectedBusId]);

  // Compute valid destination stops (only stops after origin in sequence)
  const routeStops = selectedBus?.route_stops?.slice().sort((a, b) => a.sequence - b.sequence) || [];
  const originSequence = routeStops.find((rs) => rs.stop_id === Number(originStopId))?.sequence ?? -1;
  const validDestStops = routeStops.filter((rs) => rs.sequence > originSequence);

  // Fare preview
  const destSequence = routeStops.find((rs) => rs.stop_id === Number(destStopId))?.sequence ?? -1;
  const stopCount = destSequence > originSequence ? destSequence - originSequence : 0;
  const farePreview = stopCount > 0 ? calculateFare(stopCount) * passengerCount : 0;

  // Occupancy
  const capacity = selectedBus?.seating_capacity || 40;
  const liveData = busUpdates[selectedBusId];
  const occupancy = liveData?.current_passengers ?? currentPassengers;
  const freeSeats = liveData?.free_seats ?? Math.max(0, capacity - occupancy);
  const fillPct = Math.min(100, (occupancy / capacity) * 100);
  const fillColor = fillPct < 60 ? '#16a34a' : fillPct < 85 ? '#f59e0b' : '#ef4444';

  // Issue ticket
  const handleIssueTicket = async () => {
    if (!selectedBusId || !originStopId || !destStopId) return;
    setIssuing(true);
    try {
      const res = await issueTicket({
        bus_id: selectedBusId,
        origin_stop_id: Number(originStopId),
        destination_stop_id: Number(destStopId),
        passenger_count: passengerCount,
        timestamp: new Date().toISOString(),
      });
      setReceipt({
        ticket_id: res.data.ticket_id,
        bus_id: selectedBusId,
        bus_number: selectedBus?.bus_number,
        origin_stop_id: Number(originStopId),
        destination_stop_id: Number(destStopId),
        passenger_count: passengerCount,
        fare_paid: res.data.fare_paid,
        free_seats: res.data.free_seats,
      });
      // Reset form
      setOriginStopId('');
      setDestStopId('');
      setPassengerCount(1);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to issue ticket. Is the server running?');
    }
    setIssuing(false);
  };

  const canIssue = selectedBusId && originStopId && destStopId && !issuing;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── LEFT: POS TERMINAL ─────────────────────────────────────── */}
      <div
        style={{
          width: 420, background: '#f8fafc',
          borderRight: '1px solid #e2e8f0',
          overflowY: 'auto', padding: 20,
          display: 'flex', flexDirection: 'column', gap: 16,
        }}
      >
        {/* POS header */}
        <div
          style={{
            background: '#16a34a', borderRadius: 12, padding: '16px 18px',
            color: '#fff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 22 }}>💳</span>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Pine Labs POS Terminal</span>
          </div>
          <p style={{ fontSize: 12, opacity: 0.85 }}>Conductor · Ticket Issuance System</p>
        </div>

        {/* Bus selector */}
        <div className="card" style={{ padding: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
            SELECT BUS
          </label>
          <select
            id="conductor-bus-select"
            className="input-field"
            value={selectedBusId}
            onChange={(e) => setSelectedBusId(e.target.value)}
          >
            {buses.map((b) => (
              <option key={b.bus_id} value={b.bus_id}>
                Route {b.bus_number} — {b.route_name}
              </option>
            ))}
          </select>

          {/* Occupancy pill */}
          {selectedBus && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Current Occupancy</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: fillColor }}>
                  {occupancy}/{capacity} · {freeSeats} free
                </span>
              </div>
              <div className="seat-bar">
                <div
                  className="seat-bar__fill"
                  style={{ width: `${fillPct}%`, background: fillColor, transition: 'width 0.5s ease' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Journey form */}
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: '#1e293b' }}>
            Journey Details
          </h3>

          {/* Origin */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
              BOARDING STOP (FROM)
            </label>
            <select
              id="conductor-origin-select"
              className="input-field"
              value={originStopId}
              onChange={(e) => { setOriginStopId(e.target.value); setDestStopId(''); }}
              disabled={!selectedBus}
            >
              <option value="">Select boarding stop...</option>
              {routeStops.map((rs) => (
                <option key={rs.stop_id} value={rs.stop_id}>
                  {rs.sequence + 1}. {STOP_NAMES[rs.stop_id] || `Stop ${rs.stop_id}`}
                </option>
              ))}
            </select>
          </div>

          {/* Destination */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
              ALIGHTING STOP (TO)
            </label>
            <select
              id="conductor-dest-select"
              className="input-field"
              value={destStopId}
              onChange={(e) => setDestStopId(e.target.value)}
              disabled={!originStopId}
            >
              <option value="">Select destination...</option>
              {validDestStops.map((rs) => (
                <option key={rs.stop_id} value={rs.stop_id}>
                  {rs.sequence + 1}. {STOP_NAMES[rs.stop_id] || `Stop ${rs.stop_id}`}
                </option>
              ))}
            </select>
          </div>

          {/* Passenger count */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
              PASSENGERS
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1.5px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              <button
                id="decrease-pax-btn"
                onClick={() => setPassengerCount((p) => Math.max(1, p - 1))}
                style={{
                  width: 44, height: 42, background: '#f8fafc', border: 'none',
                  fontSize: 18, cursor: 'pointer', color: '#16a34a', fontWeight: 700,
                  borderRight: '1px solid #e2e8f0',
                }}
              >
                −
              </button>
              <span
                style={{
                  flex: 1, textAlign: 'center', fontSize: 16,
                  fontWeight: 700, color: '#1e293b',
                }}
              >
                {passengerCount}
              </span>
              <button
                id="increase-pax-btn"
                onClick={() => setPassengerCount((p) => Math.min(10, p + 1))}
                style={{
                  width: 44, height: 42, background: '#f8fafc', border: 'none',
                  fontSize: 18, cursor: 'pointer', color: '#16a34a', fontWeight: 700,
                  borderLeft: '1px solid #e2e8f0',
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Fare preview */}
          {farePreview > 0 && (
            <div
              style={{
                background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
                padding: '12px 14px', marginBottom: 14,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Fare (₹2 × {stopCount} stops × {passengerCount} pax)</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>TNSTC Stage Formula</div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>₹{farePreview}</div>
            </div>
          )}

          {/* Issue button */}
          <button
            id="issue-ticket-btn"
            className="btn-primary"
            style={{
              width: '100%', justifyContent: 'center',
              fontSize: 15, padding: '12px 20px',
              opacity: canIssue ? 1 : 0.5,
              cursor: canIssue ? 'pointer' : 'not-allowed',
            }}
            onClick={handleIssueTicket}
            disabled={!canIssue}
          >
            {issuing ? <span className="spinner" /> : '🎫'}
            {issuing ? 'Issuing...' : 'Issue Ticket'}
          </button>
        </div>

        {/* Quick stats */}
        {selectedBus && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <QuickStat
              icon="🚌"
              label="Route"
              value={selectedBus.bus_number}
              color="#16a34a"
            />
            <QuickStat
              icon="💺"
              label="Capacity"
              value={`${capacity} seats`}
              color="#1e293b"
            />
            <QuickStat
              icon="✅"
              label="Free Seats"
              value={freeSeats}
              color={freeSeats > 10 ? '#16a34a' : '#f59e0b'}
            />
            <QuickStat
              icon="👥"
              label="On Board"
              value={occupancy}
              color="#475569"
            />
          </div>
        )}
      </div>

      {/* ── RIGHT: TICKET HISTORY ───────────────────────────────────── */}
      <div
        style={{
          flex: 1, overflowY: 'auto', padding: 24,
          background: '#fff',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b' }}>Ticket Log</h2>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
              {selectedBus
                ? `Route ${selectedBus.bus_number} · ${selectedBus.route_name}`
                : 'Select a bus to view ticket history'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              id="refresh-tickets-btn"
              className="btn-outline"
              onClick={fetchRecentTickets}
              style={{ fontSize: 13, padding: '7px 14px' }}
            >
              ↺ Refresh
            </button>
          </div>
        </div>

        {/* Daily summary */}
        {recentTickets.length > 0 && (
          <div
            style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
              marginBottom: 20,
            }}
          >
            <SummaryCard
              icon="🎫"
              label="Tickets Issued"
              value={recentTickets.length}
            />
            <SummaryCard
              icon="👥"
              label="Total Passengers"
              value={recentTickets.reduce((s, t) => s + t.passenger_count, 0)}
            />
            <SummaryCard
              icon="💰"
              label="Total Revenue"
              value={`₹${recentTickets.reduce((s, t) => s + t.fare_paid, 0)}`}
            />
          </div>
        )}

        {/* Ticket list */}
        {loadingTickets ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#64748b', padding: 20 }}>
            <span className="spinner" /> Loading tickets...
          </div>
        ) : recentTickets.length === 0 ? (
          <div
            style={{
              textAlign: 'center', padding: '60px 20px', color: '#64748b',
              border: '2px dashed #e2e8f0', borderRadius: 12,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎫</div>
            <p style={{ fontWeight: 600, fontSize: 15 }}>No tickets yet</p>
            <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
              Issue a ticket using the POS terminal on the left
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: '4px 16px' }}>
            {recentTickets.map((ticket) => (
              <TicketRow
                key={ticket.ticket_id || ticket._id}
                ticket={ticket}
                busNumber={selectedBus?.bus_number}
              />
            ))}
          </div>
        )}

        {/* Route stops overview */}
        {selectedBus && routeStops.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>
              Route Stops — {selectedBus.bus_number}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {routeStops.map((rs, idx) => (
                <div
                  key={rs.stop_id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                    borderRadius: 8, padding: '6px 12px',
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      width: 20, height: 20, background: idx === 0 ? '#16a34a' : idx === routeStops.length - 1 ? '#1e293b' : '#e2e8f0',
                      color: idx === 0 || idx === routeStops.length - 1 ? '#fff' : '#64748b',
                      borderRadius: '50%', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0,
                    }}
                  >
                    {rs.sequence + 1}
                  </span>
                  <span style={{ fontWeight: 500, color: '#1e293b' }}>
                    {STOP_NAMES[rs.stop_id] || `Stop ${rs.stop_id}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ticket receipt modal */}
      <TicketReceipt ticket={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}

function QuickStat({ icon, label, value, color }) {
  return (
    <div
      className="card"
      style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color }}>{value}</div>
        <div style={{ fontSize: 10, color: '#94a3b8' }}>{label}</div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value }) {
  return (
    <div
      className="card"
      style={{
        padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: 4,
        alignItems: 'flex-start',
      }}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
    </div>
  );
}
