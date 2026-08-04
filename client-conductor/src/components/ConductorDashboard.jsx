import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { useSocket } from '../hooks/useSocket';
import { fetchAllBuses, issueTicket, fetchTickets } from '../services/api';

const STOP_NAMES = {
  101: 'Ondipudur',     102: 'Singanallur',     103: 'Ramanathapuram',
  104: 'Lakshmi Mills', 105: 'Gandhipuram',      106: 'Lawley Road',
  107: 'Vadavalli',     108: 'Maruthamalai',
  201: 'Ganapathy',     202: 'Sivananda Colony', 203: 'Town Hall',
  204: 'Ukkadam',       205: 'Kovaipudur',
  301: 'Railway Station', 302: 'Saibaba Colony', 303: 'Thudiyalur',
};

function calculateFare(stopCount, passengers) {
  return Math.max(5, stopCount * 2) * passengers;
}

// ─── Online Payment QR Modal ──────────────────────────────────────────────
function PaymentQRModal({ qrDetails, onCancel, onSuccess }) {
  const [verifying, setVerifying] = useState(false);

  if (!qrDetails) return null;

  const handleSimulatePayment = async () => {
    setVerifying(true);
    try {
      // Send verification to backend
      const res = await axios.post('/api/payments/verify', {
        razorpay_order_id: qrDetails.order_id,
        razorpay_payment_id: `pay_qr_${Date.now()}`,
        razorpay_signature: 'mock_signature',
        merchant_transaction_id: qrDetails.merchant_transaction_id,
      });

      if (res.data?.success) {
        onSuccess(res.data);
      } else {
        alert('Payment verification failed');
      }
    } catch (err) {
      console.error(err);
      alert('Error verifying online payment');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 250, padding: 16,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 20, padding: 28, maxWidth: 380, width: '100%',
          boxShadow: '0 24px 64px rgba(0,0,0,0.25)', textAlign: 'center',
        }}
        className="fade-in"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>📱</span>
            <span style={{ fontWeight: 800, fontSize: 16, color: '#1e293b' }}>Scan & Pay</span>
          </div>
          <button
            onClick={onCancel}
            style={{
              background: '#f1f5f9', border: 'none', borderRadius: '50%',
              width: 28, height: 28, cursor: 'pointer', fontSize: 16, color: '#64748b',
            }}
          >
            ×
          </button>
        </div>

        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
          Show this QR code to the passenger to pay <b>₹{qrDetails.amount_inr}</b>
        </p>

        {/* QR CODE CONTAINER */}
        <div
          style={{
            background: '#f8fafc', border: '2px solid #e2e8f0',
            borderRadius: 16, padding: 20, display: 'inline-block',
            marginBottom: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          }}
        >
          <QRCodeSVG value={qrDetails.upiPayload} size={200} level="H" includeMargin={true} />
        </div>

        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>RAZORPAY UPI QR</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a', marginTop: 2 }}>₹{qrDetails.amount_inr}</div>
          <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace', marginTop: 4 }}>
            Order: {qrDetails.order_id}
          </div>
        </div>

        <button
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '12px 0', fontSize: 14 }}
          onClick={handleSimulatePayment}
          disabled={verifying}
        >
          {verifying ? <span className="spinner" /> : '✅ Received Payment'}
        </button>

        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 10 }}>
          Click "Received Payment" after passenger completes UPI scan
        </p>
      </div>
    </div>
  );
}

// ─── Ticket Receipt Modal (with Thermal Printing support) ─────────────────
function TicketReceipt({ ticket, onClose }) {
  if (!ticket) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200, padding: 16,
      }}
      onClick={onClose}
    >
      {/* Printable thermal receipt wrapper */}
      <div
        onClick={(e) => e.stopPropagation()}
        id="thermal-receipt-printable"
        style={{
          background: '#fff', borderRadius: 16, padding: 24, maxWidth: 360, width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: '2px solid #16a34a',
        }}
        className="fade-in"
      >
        {/* Printable section */}
        <div className="printable-content">
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 4 }} className="hide-on-print">🎫</div>
            <h3 style={{ fontWeight: 800, fontSize: 18, color: '#16a34a', margin: 0 }}>TNSTC - OPTIFLOW</h3>
            <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0 0' }}>Coimbatore City Transit POS</p>
          </div>

          <div style={{ borderTop: '2px dashed #94a3b8', margin: '10px 0' }} />

          {[
            ['TICKET ID', ticket.ticket_id?.slice(0, 8).toUpperCase(), true],
            ['DATE & TIME', new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })],
            ['BUS ROUTE', ticket.bus_number || ticket.bus_id],
            ['ORIGIN', STOP_NAMES[ticket.origin_stop_id] || ticket.origin_stop_id],
            ['DESTINATION', STOP_NAMES[ticket.destination_stop_id] || ticket.destination_stop_id],
            ['PASSENGERS', ticket.passenger_count],
            ['PAYMENT MODE', ticket.payment_method?.toUpperCase() || 'CASH'],
          ].map(([label, value, mono]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
            </div>
          ))}

          <div style={{ borderTop: '2px dashed #94a3b8', margin: '10px 0' }} />

          <div
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#f0fdf4', borderRadius: 8, padding: '10px 14px',
              border: '1px solid #bbf7d0',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 13, color: '#15803d' }}>TOTAL FARE</span>
            <span style={{ fontWeight: 800, fontSize: 20, color: '#16a34a' }}>₹{ticket.fare_paid}</span>
          </div>

          <div style={{ textAlign: 'center', marginTop: 12, fontSize: 10, color: '#64748b' }}>
            *** Wish You A Happy & Safe Journey ***<br />
            Keep ticket until journey ends
          </div>
        </div>

        {/* Action Buttons (Hidden during printing) */}
        <div className="hide-on-print" style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button
            id="print-receipt-btn"
            type="button"
            className="btn-outline"
            style={{ flex: 1, justifyContent: 'center', borderColor: '#16a34a', color: '#16a34a', padding: '10px 0', fontSize: 13, fontWeight: 700 }}
            onClick={handlePrint}
          >
            🖨️ Print Ticket
          </button>
          <button
            id="close-receipt-btn"
            type="button"
            className="btn-primary"
            style={{ flex: 1, justifyContent: 'center', padding: '10px 0', fontSize: 13 }}
            onClick={onClose}
          >
            ✓ Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Recent Ticket Row ─────────────────────────────────────────────────────
function TicketRow({ ticket }) {
  const timeAgo = (() => {
    const diff = Date.now() - new Date(ticket.issued_at || ticket.createdAt).getTime();
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
          borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
        }}
      >
        🎫
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          {STOP_NAMES[ticket.origin_stop_id]} → {STOP_NAMES[ticket.destination_stop_id]}
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
          {ticket.passenger_count} pax · {timeAgo}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>₹{ticket.fare_paid}</div>
        <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>
          #{ticket.ticket_id?.slice(0, 6).toUpperCase()}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────
export default function ConductorDashboard({ conductor, onLogout }) {
  const [buses, setBuses] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState(conductor?.assigned_bus_id || '');
  const [selectedBus, setSelectedBus] = useState(null);
  const [originStopId, setOriginStopId] = useState('');
  const [destStopId, setDestStopId] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);
  const [paymentMode, setPaymentMode] = useState('cash'); // 'cash' | 'online'
  const [issuing, setIssuing] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);

  const { busUpdates, connected, socketRef } = useSocket();
  const [gpsActive, setGpsActive] = useState(false);

  useEffect(() => {
    // Only start tracking once the socket is connected and a bus is selected
    if (!selectedBusId || !connected) return;

    // Start tracking GPS
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setGpsActive(true);
        const { latitude, longitude } = position.coords;
        // Use socketRef.current inside the callback to always get the live socket
        socketRef.current?.emit('bus_location_update', {
          bus_id: selectedBusId,
          coordinates: [longitude, latitude],
        });
      },
      (error) => {
        console.error('GPS tracking error:', error.message);
        setGpsActive(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setGpsActive(false);
    };
  }, [selectedBusId, connected]); // re-run when socket connects or bus changes

  useEffect(() => {
    fetchAllBuses().then((res) => {
      setBuses(res.data);
      // Default to assigned bus
      const assignedId = conductor?.assigned_bus_id;
      if (assignedId) {
        setSelectedBusId(assignedId);
      } else if (res.data.length > 0) {
        setSelectedBusId(res.data[0].bus_id);
      }
    });
  }, [conductor]);

  useEffect(() => {
    const bus = buses.find((b) => b.bus_id === selectedBusId);
    setSelectedBus(bus || null);
    setOriginStopId('');
    setDestStopId('');
  }, [selectedBusId, buses]);

  const loadTickets = useCallback(async () => {
    try {
      const res = await fetchTickets();
      setRecentTickets(res.data.filter((t) => t.bus_id === selectedBusId).slice(0, 20));
    } catch (_) {}
  }, [selectedBusId]);

  useEffect(() => { loadTickets(); }, [loadTickets, receipt]);

  const routeStops = selectedBus?.route_stops?.slice().sort((a, b) => a.sequence - b.sequence) || [];
  const originSeq = routeStops.find((rs) => rs.stop_id === Number(originStopId))?.sequence ?? -1;
  const validDest = routeStops.filter((rs) => rs.sequence > originSeq);
  const destSeq = routeStops.find((rs) => rs.stop_id === Number(destStopId))?.sequence ?? -1;
  const stopCount = destSeq > originSeq ? destSeq - originSeq : 0;
  const farePreview = stopCount > 0 ? calculateFare(stopCount, passengerCount) : 0;

  const capacity = selectedBus?.seating_capacity || 40;
  const liveData = busUpdates[selectedBusId];
  const occupancy = liveData?.current_passengers ?? 0;
  const standing = Math.max(0, occupancy - capacity);
  const freeSeats = Math.max(0, capacity - occupancy);
  const fillPct = Math.min(100, (occupancy / capacity) * 100);

  const getFillColor = () => {
    if (standing > 30) return '#dc2626'; // Overcrowded
    if (standing > 0) return '#ea580c';  // Moderate Crowd
    if (fillPct < 60) return '#16a34a';  // Available
    return '#f59e0b';                    // Filling up
  };
  const fillColor = getFillColor();

  const handleIssue = async () => {
    if (!selectedBusId || !originStopId || !destStopId) return;
    setIssuing(true);

    if (paymentMode === 'online') {
      try {
        // Create Razorpay Order for QR
        const res = await axios.post('/api/payments/create-order', {
          bus_id: selectedBusId,
          origin_stop_id: Number(originStopId),
          destination_stop_id: Number(destStopId),
          passenger_count: passengerCount,
        });

        const { order_id, merchant_transaction_id, amount_inr } = res.data;
        const upiPayload = `upi://pay?pa=optiflow.razorpay@icici&pn=OptiFlow%20Transit&am=${amount_inr}&tr=${order_id}&cu=INR`;

        setQrData({
          order_id,
          merchant_transaction_id,
          amount_inr,
          upiPayload,
        });
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to generate Online Payment QR');
      } finally {
        setIssuing(false);
      }
      return;
    }

    // CASH payment mode
    try {
      const res = await issueTicket({
        bus_id: selectedBusId,
        origin_stop_id: Number(originStopId),
        destination_stop_id: Number(destStopId),
        passenger_count: passengerCount,
        payment_mode: 'cash',
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
        payment_method: 'cash',
      });
      setOriginStopId('');
      setDestStopId('');
      setPassengerCount(1);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to issue ticket.');
    }
    setIssuing(false);
  };

  const handleOnlineSuccess = (verifyData) => {
    setQrData(null);
    setReceipt({
      ticket_id: verifyData.ticket_id,
      bus_id: selectedBusId,
      bus_number: selectedBus?.bus_number,
      origin_stop_id: Number(originStopId),
      destination_stop_id: Number(destStopId),
      passenger_count: passengerCount,
      fare_paid: verifyData.payment?.amount_inr || farePreview,
      payment_method: 'online',
    });
    setOriginStopId('');
    setDestStopId('');
    setPassengerCount(1);
  };

  const todayStats = {
    tickets: recentTickets.length,
    passengers: recentTickets.reduce((s, t) => s + t.passenger_count, 0),
    revenue: recentTickets.reduce((s, t) => s + t.fare_paid, 0),
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <nav className="navbar">
        <span style={{ fontSize: 20 }}>🚌</span>
        <span className="hide-on-mobile" style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>Opti</span>
        <span className="hide-on-mobile" style={{ fontWeight: 700, fontSize: 16, color: '#16a34a' }}>Flow</span>
        <span
          style={{
            fontSize: 10, fontWeight: 600, color: '#fff', background: '#16a34a',
            borderRadius: 99, padding: '2px 8px', letterSpacing: '0.05em',
          }}
        >
          CONDUCTOR
        </span>

        <div style={{ flex: 1 }} />

        {/* Conductor info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 32, height: 32, background: '#f0fdf4', border: '1.5px solid #bbf7d0',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}
            title={conductor?.full_name}
          >
            👤
          </div>
          <div className="hide-on-mobile">
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>{conductor?.full_name}</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>{conductor?.employee_id}</div>
          </div>
        </div>

        <div className="hide-on-mobile" style={{ height: 20, width: 1, background: '#e2e8f0', margin: '0 8px' }} />

        {/* Live status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span className="live-dot" style={{ background: connected ? '#16a34a' : '#ef4444' }} />
          <span className="hide-on-mobile" style={{ fontSize: 11, color: '#64748b' }}>{connected ? 'Live' : 'Offline'}</span>
        </div>

        <div className="hide-on-mobile" style={{ height: 20, width: 1, background: '#e2e8f0', margin: '0 8px' }} />

        {/* GPS status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }} title={gpsActive ? 'GPS is actively tracking' : 'GPS is inactive or permission denied'}>
          <span style={{ fontSize: 14, opacity: gpsActive ? 1 : 0.4 }}>📍</span>
          <span className="hide-on-mobile" style={{ fontSize: 11, color: gpsActive ? '#16a34a' : '#94a3b8' }}>
            {gpsActive ? 'GPS On' : 'No GPS'}
          </span>
        </div>

        <div className="hide-on-mobile" style={{ height: 20, width: 1, background: '#e2e8f0', margin: '0 8px' }} />

        <button className="btn-danger" onClick={onLogout} style={{ padding: '6px 10px', fontSize: 12 }}>
          Sign Out
        </button>
      </nav>

      {/* Body */}
      <div className="dashboard-layout">
        {/* ── LEFT: POS TERMINAL ── */}
        <div className="pos-terminal">
          {/* POS Header */}
          <div
            style={{
              background: '#16a34a', borderRadius: 12, padding: '14px 18px', color: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 20 }}>💳</span>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Pine Labs POS Terminal</span>
            </div>
            <p style={{ fontSize: 11, opacity: 0.8 }}>Issue tickets · Cash/Online UPI QR · Real-time sync</p>
          </div>

          {/* Journey form */}
          <div className="card" style={{ padding: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Issue Ticket</h3>

            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
              FROM
            </label>
            <select
              id="origin-select"
              className="input-field"
              value={originStopId}
              onChange={(e) => { setOriginStopId(e.target.value); setDestStopId(''); }}
              disabled={!selectedBus}
              style={{ marginBottom: 10 }}
            >
              <option value="">Select boarding stop...</option>
              {routeStops.map((rs) => (
                <option key={rs.stop_id} value={rs.stop_id}>
                  {rs.sequence + 1}. {STOP_NAMES[rs.stop_id] || `Stop ${rs.stop_id}`}
                </option>
              ))}
            </select>

            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
              TO
            </label>
            <select
              id="dest-select"
              className="input-field"
              value={destStopId}
              onChange={(e) => setDestStopId(e.target.value)}
              disabled={!originStopId}
              style={{ marginBottom: 10 }}
            >
              <option value="">Select destination...</option>
              {validDest.map((rs) => (
                <option key={rs.stop_id} value={rs.stop_id}>
                  {rs.sequence + 1}. {STOP_NAMES[rs.stop_id] || `Stop ${rs.stop_id}`}
                </option>
              ))}
            </select>

            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
              PASSENGERS
            </label>
            <div
              style={{
                display: 'flex', alignItems: 'center',
                border: '1.5px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', marginBottom: 12,
              }}
            >
              <button
                id="pax-minus"
                onClick={() => setPassengerCount((p) => Math.max(1, p - 1))}
                style={{
                  width: 42, height: 40, background: '#f8fafc', border: 'none',
                  fontSize: 18, color: '#16a34a', cursor: 'pointer', borderRight: '1px solid #e2e8f0',
                }}
              >−</button>
              <span style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 15 }}>{passengerCount}</span>
              <button
                id="pax-plus"
                onClick={() => setPassengerCount((p) => Math.min(10, p + 1))}
                style={{
                  width: 42, height: 40, background: '#f8fafc', border: 'none',
                  fontSize: 18, color: '#16a34a', cursor: 'pointer', borderLeft: '1px solid #e2e8f0',
                }}
              >+</button>
            </div>

            {/* PAYMENT MODE SELECTOR */}
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
              PAYMENT METHOD
            </label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => setPaymentMode('cash')}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: paymentMode === 'cash' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                  background: paymentMode === 'cash' ? '#f0fdf4' : '#fff',
                  color: paymentMode === 'cash' ? '#16a34a' : '#64748b',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                💵 Cash
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('online')}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: paymentMode === 'online' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                  background: paymentMode === 'online' ? '#f5f3ff' : '#fff',
                  color: paymentMode === 'online' ? '#7c3aed' : '#64748b',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                📲 Online (QR)
              </button>
            </div>

            {farePreview > 0 && (
              <div
                style={{
                  background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
                  padding: '10px 14px', marginBottom: 12,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  ₹{Math.max(5, stopCount * 2)} × {passengerCount} pax
                </span>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#16a34a' }}>₹{farePreview}</span>
              </div>
            )}

            <button
              id="issue-ticket-btn"
              className="btn-primary"
              style={{
                width: '100%', justifyContent: 'center', padding: '11px 0',
                background: paymentMode === 'online' ? '#7c3aed' : '#16a34a',
                opacity: (!selectedBusId || !originStopId || !destStopId || issuing) ? 0.5 : 1,
              }}
              onClick={handleIssue}
              disabled={!selectedBusId || !originStopId || !destStopId || issuing}
            >
              {issuing ? <span className="spinner" /> : paymentMode === 'online' ? '📲' : '🎫'}
              {issuing ? 'Processing...' : paymentMode === 'online' ? 'Show QR Code' : 'Issue Ticket'}
            </button>
          </div>

          {/* Daily stats */}
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {[
              { label: 'Tickets', value: todayStats.tickets, icon: '🎫' },
              { label: 'Pax', value: todayStats.passengers, icon: '👥' },
              { label: 'Revenue', value: `₹${todayStats.revenue}`, icon: '💰' },
            ].map(({ label, value, icon }) => (
              <div
                key={label}
                className="card"
                style={{ padding: '10px 12px', textAlign: 'center' }}
              >
                <div style={{ fontSize: 16 }}>{icon}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{value}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Bus selector */}
          <div className="card" style={{ padding: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
              BUS
            </label>
            <select
              id="bus-select"
              className="input-field"
              value={selectedBusId}
              onChange={(e) => setSelectedBusId(e.target.value)}
            >
              {buses.map((b) => (
                <option key={b.bus_id} value={b.bus_id}>
                  Route {b.bus_number} — {b.route_name}
                  {b.bus_id === conductor?.assigned_bus_id ? ' ★' : ''}
                </option>
              ))}
            </select>

            {selectedBus && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    Occupancy ({occupancy} total)
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: fillColor }}>
                    {standing > 30
                      ? `Overcrowded (${standing} standing)`
                      : standing > 0
                      ? `Moderate Crowd (${standing} standing)`
                      : `${occupancy}/${capacity} · ${freeSeats} free`}
                  </span>
                </div>
                <div className="seat-bar">
                  <div className="seat-bar__fill" style={{ width: `${fillPct}%`, background: fillColor }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: TICKET LOG ── */}
        <div className="ticket-log">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Ticket Log</h2>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                {selectedBus ? `Route ${selectedBus.bus_number} · ${selectedBus.route_name}` : 'Select a bus'}
              </p>
            </div>
            <button className="btn-outline" onClick={loadTickets} style={{ fontSize: 12, padding: '6px 12px' }}>
              ↺ Refresh
            </button>
          </div>

          {recentTickets.length === 0 ? (
            <div
              style={{
                textAlign: 'center', padding: '60px 20px', color: '#64748b',
                border: '2px dashed #e2e8f0', borderRadius: 12,
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 10 }}>🎫</div>
              <p style={{ fontWeight: 600 }}>No tickets yet</p>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Issue a ticket using the POS on the left</p>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
                {[
                  { icon: '🎫', label: 'Tickets', value: todayStats.tickets },
                  { icon: '👥', label: 'Passengers', value: todayStats.passengers },
                  { icon: '💰', label: 'Revenue', value: `₹${todayStats.revenue}` },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="card" style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 18 }}>{icon}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{value}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
                  </div>
                ))}
              </div>

              <div className="card" style={{ padding: '4px 16px' }}>
                {recentTickets.map((t) => (
                  <TicketRow key={t.ticket_id || t._id} ticket={t} />
                ))}
              </div>
            </>
          )}

          {/* Route stops */}
          {selectedBus && routeStops.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                Route {selectedBus.bus_number} Stops
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {routeStops.map((rs, idx) => (
                  <div
                    key={rs.stop_id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: 8, padding: '5px 10px', fontSize: 12,
                    }}
                  >
                    <span
                      style={{
                        width: 18, height: 18,
                        background: idx === 0 ? '#16a34a' : idx === routeStops.length - 1 ? '#1e293b' : '#e2e8f0',
                        color: idx === 0 || idx === routeStops.length - 1 ? '#fff' : '#64748b',
                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 8, fontWeight: 700,
                      }}
                    >
                      {rs.sequence + 1}
                    </span>
                    {STOP_NAMES[rs.stop_id] || `Stop ${rs.stop_id}`}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <PaymentQRModal
        qrDetails={qrData}
        onCancel={() => setQrData(null)}
        onSuccess={handleOnlineSuccess}
      />

      <TicketReceipt ticket={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}

