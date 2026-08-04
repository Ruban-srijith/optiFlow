import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { useSocket } from '../hooks/useSocket';
import {
  fetchAllBuses,
  issueTicket,
  fetchTickets,
  updateBusOccupancy,
  registerAmbulance,
  updateAmbulanceStatus,
  toggleGreenCorridor,
  getMyDispatches,
  getTurnByTurn,
  fetchAmbulances,
} from '../services/api';
import DriverMap from './DriverMap';
import { ShieldAlert, RefreshCw, Radio, AlertCircle, Play, CheckCircle2, RotateCcw, Navigation, Compass, Users, TrendingUp, MapPin, Map, PlusCircle, CheckCircle, Ticket, Bus, Ambulance, User, Banknote, Smartphone, Siren, Hospital, Flame, TrafficCone } from 'lucide-react';

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

function PaymentQRModal({ qrDetails, onCancel, onSuccess }) {
  const [verifying, setVerifying] = useState(false);

  if (!qrDetails) return null;

  const handleSimulatePayment = async () => {
    setVerifying(true);
    try {
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
      </div>
    </div>
  );
}

// ─── Ticket Receipt Modal ──────────────────────────────────────────────────
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
      <div
        onClick={(e) => e.stopPropagation()}
        id="thermal-receipt-printable"
        style={{
          background: '#fff', borderRadius: 16, padding: 24, maxWidth: 360, width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: '2px solid #16a34a',
        }}
        className="fade-in"
      >
        <div className="printable-content">
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
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

        <div className="hide-on-print" style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button
            type="button"
            className="btn-outline"
            style={{ flex: 1, justifyContent: 'center', borderColor: '#16a34a', color: '#16a34a', padding: '10px 0', fontSize: 13, fontWeight: 700 }}
            onClick={handlePrint}
          >
            🖨️ Print Ticket
          </button>
          <button
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
        <Ticket size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} />
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
  const [driverRole, setDriverRole] = useState(conductor?.role === 'ambulance_driver' ? 'ambulance_driver' : 'conductor'); // 'conductor' | 'ambulance_driver'
  
  // Ambulance terminal state
  const [ambulanceId, setAmbulanceId] = useState(localStorage.getItem('assigned_ambulance_id') || '');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('ALS');
  const [hospitalName, setHospitalName] = useState('');
  const [dispatchData, setDispatchData] = useState(null);
  const [turnSteps, setTurnSteps] = useState([]);
  const [routeSummary, setRouteSummary] = useState(null);
  const [loadingDispatch, setLoadingDispatch] = useState(false);
  const [updatingAmb, setUpdatingAmb] = useState(false);
  const [allAmbulances, setAllAmbulances] = useState([]);
  const [driverLocation, setDriverLocation] = useState(null);

  // Bus terminal state
  const [buses, setBuses] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState(conductor?.assigned_bus_id || '');
  const [selectedBus, setSelectedBus] = useState(null);
  const [originStopId, setOriginStopId] = useState('');
  const [destStopId, setDestStopId] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [issuing, setIssuing] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);
  const [gpsActive, setGpsActive] = useState(false);
  const [acceptedDispatchId, setAcceptedDispatchId] = useState(null);
  
  // Occupancy override state
  const [seatedOverride, setSeatedOverride] = useState(0);
  const [standingOverride, setStandingOverride] = useState(0);
  const [savingOccupancy, setSavingOccupancy] = useState(false);

  const { busPositions, busUpdates, ambulancePositions, connected, socketRef } = useSocket();

  // Load Bus details
  useEffect(() => {
    fetchAllBuses().then((res) => {
      setBuses(res.data);
      const assignedId = conductor?.assigned_bus_id;
      if (assignedId) {
        setSelectedBusId(assignedId);
      } else if (res.data.length > 0) {
        setSelectedBusId(res.data[0].bus_id);
      }
    });
    fetchAmbulances().then((res) => setAllAmbulances(res.data)).catch(() => {});
  }, [conductor]);

  useEffect(() => {
    const bus = buses.find((b) => b.bus_id === selectedBusId);
    setSelectedBus(bus || null);
    if (bus) {
      setSeatedOverride(bus.current_occupancy_seated || 0);
      setStandingOverride(bus.current_occupancy_standing || 0);
      if (bus.route_stops && bus.route_stops.length > 0) {
        setOriginStopId(String(bus.route_stops[0].stop_id));
      }
    }
  }, [selectedBusId, buses]);

  const loadTickets = useCallback(async () => {
    try {
      const res = await fetchTickets();
      setRecentTickets(res.data.filter((t) => t.bus_id === selectedBusId).slice(0, 20));
    } catch (_) {}
  }, [selectedBusId]);

  useEffect(() => { loadTickets(); }, [loadTickets, receipt]);

  // GPS watch tracking for Bus location
  useEffect(() => {
    if (driverRole !== 'conductor' || !selectedBusId || !connected) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setGpsActive(true);
        const { latitude, longitude } = position.coords;
        setDriverLocation([longitude, latitude]);
        socketRef.current?.emit('bus_location_update', {
          bus_id: selectedBusId,
          coordinates: [longitude, latitude],
        });

        // Auto-detect closest stop on conductor's assigned route
        if (selectedBus?.route_stops?.length) {
          const STOP_COORDS_MAP = {
            101: { lat: 11.0020, lng: 77.0500 }, 102: { lat: 10.9980, lng: 77.0320 },
            103: { lat: 10.9990, lng: 76.9850 }, 104: { lat: 11.0080, lng: 76.9720 },
            105: { lat: 11.0168, lng: 76.9558 }, 106: { lat: 11.0120, lng: 76.9380 },
            107: { lat: 11.0140, lng: 76.9030 }, 108: { lat: 11.0450, lng: 76.8520 },
            201: { lat: 11.0360, lng: 76.9710 }, 202: { lat: 11.0210, lng: 76.9580 },
            203: { lat: 10.9960, lng: 76.9620 }, 204: { lat: 10.9910, lng: 76.9610 },
            205: { lat: 10.9460, lng: 76.9330 }, 301: { lat: 10.9980, lng: 76.9680 },
            302: { lat: 11.0260, lng: 76.9460 }, 303: { lat: 11.0780, lng: 76.9400 },
          };

          let closest = null;
          let minDist = Infinity;
          selectedBus.route_stops.forEach((rs) => {
            const coords = STOP_COORDS_MAP[rs.stop_id];
            if (coords) {
              const dist = Math.hypot(latitude - coords.lat, longitude - coords.lng);
              if (dist < minDist) {
                minDist = dist;
                closest = rs;
              }
            }
          });
          if (closest) {
            setOriginStopId((prev) => prev || String(closest.stop_id));
          }
        }
      },
      (error) => {
        console.error('Bus GPS tracking error:', error.message);
        setGpsActive(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setGpsActive(false);
    };
  }, [selectedBusId, connected, driverRole]);

  // GPS tracking & Dispatch loop for Ambulance
  useEffect(() => {
    if (driverRole !== 'ambulance_driver' || !connected) return;

    // Load initial dispatches
    setLoadingDispatch(true);
    getMyDispatches()
      .then((res) => {
        setDispatchData(res.data);
        if (res.data.ambulance) {
          setAmbulanceId(res.data.ambulance.ambulance_id);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDispatch(false));

    // Live dispatch polling loop
    const dispatchInterval = setInterval(async () => {
      try {
        const res = await getMyDispatches();
        setDispatchData(res.data);
        if (res.data.ambulance) {
          setAmbulanceId(res.data.ambulance.ambulance_id);
        }
      } catch (err) {
        console.error(err);
      }
    }, 5000);

    // Watch position to update live ambulance location in DB + sockets
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        if (!ambulanceId) return;
        const { latitude, longitude } = pos.coords;
        setDriverLocation([longitude, latitude]);
        
        // Sockets emit
        socketRef.current?.emit('ambulance_location_update', {
          ambulance_id: ambulanceId,
          coordinates: [longitude, latitude],
        });

        // Backend save
        try {
          await updateAmbulanceStatus({
            ambulance_id: ambulanceId,
            latitude,
            longitude,
          });
        } catch (_) {}
      },
      (err) => console.error('Ambulance GPS tracking warning:', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      clearInterval(dispatchInterval);
      navigator.geolocation.clearWatch(watchId);
    };
  }, [driverRole, connected, ambulanceId]);

  // Load turn-by-turn routing instructions when dispatch active
  useEffect(() => {
    const active = dispatchData?.active_dispatch;
    if (active && active.pickup_location?.coordinates && active.destination_hospital?.coordinates) {
      getTurnByTurn({
        pickup_lat: active.pickup_location.coordinates[1],
        pickup_lng: active.pickup_location.coordinates[0],
        dest_lat: active.destination_hospital.coordinates[1],
        dest_lng: active.destination_hospital.coordinates[0],
      })
        .then((res) => {
          setTurnSteps(res.data.steps || []);
          setRouteSummary({
            distance: res.data.total_distance,
            duration: res.data.total_duration,
          });
        })
        .catch(() => {});
    } else {
      setTurnSteps([]);
      setRouteSummary(null);
    }
  }, [dispatchData?.active_dispatch]);

  // POS Ticketing handlers
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
    if (standing > 30) return '#dc2626';
    if (standing > 0) return '#ea580c';
    if (fillPct < 60) return '#16a34a';
    return '#f59e0b';
  };
  const fillColor = getFillColor();

  const handleIssue = async () => {
    if (!selectedBusId || !originStopId || !destStopId) return;
    setIssuing(true);

    if (paymentMode === 'online') {
      try {
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

  // Bus occupancy overrides
  const handleSaveOccupancy = async () => {
    setSavingOccupancy(true);
    try {
      await updateBusOccupancy({
        bus_id: selectedBusId,
        seated_passengers: seatedOverride,
        standing_passengers: standingOverride,
      });
      alert('Occupancy count successfully updated!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update occupancy overrides');
    } finally {
      setSavingOccupancy(false);
    }
  };

  // Ambulance self-registration handler
  const handleSelfRegister = async (e) => {
    e.preventDefault();
    if (!vehicleNumber) return;
    setUpdatingAmb(true);
    try {
      const res = await registerAmbulance({
        vehicle_number: vehicleNumber,
        vehicle_type: vehicleType,
        hospital_name: hospitalName,
      });
      const registeredId = res.data.ambulance.ambulance_id;
      setAmbulanceId(registeredId);
      localStorage.setItem('assigned_ambulance_id', registeredId);
      alert(`Ambulance registered successfully! ID: ${registeredId}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Self-registration failed.');
    } finally {
      setUpdatingAmb(false);
    }
  };

  // Ambulance status update
  const handleAmbStatusChange = async (statusVal) => {
    setUpdatingAmb(true);
    try {
      await updateAmbulanceStatus({
        ambulance_id: ambulanceId,
        status: statusVal,
      });
      // Refresh dispatches immediately
      const res = await getMyDispatches();
      setDispatchData(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdatingAmb(false);
    }
  };

  // Toggle Green Corridor override
  const handleCorridorToggle = async (activeState) => {
    setUpdatingAmb(true);
    try {
      const activeCall = dispatchData?.active_dispatch;
      if (activeCall) {
        await toggleGreenCorridor({
          request_id: activeCall.request_id,
          active: activeState,
        });
        const res = await getMyDispatches();
        setDispatchData(res.data);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to toggle corridor');
    } finally {
      setUpdatingAmb(false);
    }
  };

  const todayStats = {
    tickets: recentTickets.length,
    passengers: recentTickets.reduce((s, t) => s + t.passenger_count, 0),
    revenue: recentTickets.reduce((s, t) => s + t.fare_paid, 0),
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {dispatchData?.ambulance?.status === 'en_route' && acceptedDispatchId !== dispatchData?.active_dispatch?.request_id && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ padding: 30, background: '#fff', borderRadius: 12, textAlign: 'center', maxWidth: 400, width: '90%' }}>
            <Siren size={48} color="#dc2626" style={{ margin: '0 auto 16px', display: 'block' }} />
            <h2 style={{ fontSize: 24, fontWeight: 900, color: '#dc2626', margin: '0 0 8px 0' }}>EMERGENCY DISPATCH</h2>
            <p style={{ fontSize: 14, color: '#475569', marginBottom: 20 }}>
              You have been assigned a new emergency call. Please accept to proceed.
            </p>
            <button onClick={() => setAcceptedDispatchId(dispatchData.active_dispatch.request_id)} style={{ width: '100%', padding: '16px 0', fontSize: 18, fontWeight: 800, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              ACCEPT PATIENT
            </button>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="navbar" style={{ background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', padding: '10px 20px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 20 }}>{driverRole === 'conductor' ? <Bus size={16} /> : <Ambulance size={16} />}</span>
          <span className="hide-on-mobile" style={{ fontWeight: 800, fontSize: 16, color: '#f8fafc' }}>Opti</span>
          <span className="hide-on-mobile" style={{ fontWeight: 800, fontSize: 16, color: driverRole === 'conductor' ? '#16a34a' : '#ef4444' }}>Flow</span>
        </div>



        <div style={{ flex: 1 }} />

        {/* User Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 32, height: 32, background: '#334155', border: '1.5px solid #475569',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}
            title={conductor?.full_name}
          >
            <User size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} />
          </div>
          <div className="hide-on-mobile">
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap' }}>
              {conductor?.full_name || 'Driver Terminal'}
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>
              {driverRole === 'conductor' ? conductor?.employee_id : 'Emergency Unit'}
            </div>
          </div>
        </div>

        <div className="hide-on-mobile" style={{ height: 20, width: 1, background: '#334155', margin: '0 12px' }} />

        {/* Live sync status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span className="live-dot" style={{ background: connected ? '#16a34a' : '#ef4444' }} />
          <span className="hide-on-mobile" style={{ fontSize: 11, color: '#94a3b8' }}>{connected ? 'Live' : 'Offline'}</span>
        </div>

        <div className="hide-on-mobile" style={{ height: 20, width: 1, background: '#334155', margin: '0 12px' }} />

        {/* GPS tracking status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 13 }}><MapPin size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /></span>
          <span className="hide-on-mobile" style={{ fontSize: 11, color: '#94a3b8' }}>GPS Tracking</span>
        </div>

        <div className="hide-on-mobile" style={{ height: 20, width: 1, background: '#334155', margin: '0 12px' }} />

        <button className="btn-danger" onClick={onLogout} style={{ padding: '6px 12px', fontSize: 12, background: '#dc2626', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          Sign Out
        </button>
      </nav>

      {/* Body Layout */}
      <div className="dashboard-layout" style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
        <DriverMap
          driverRole={driverRole}
          driverLocation={driverLocation}
          allBuses={buses}
          allAmbulances={allAmbulances}
          busPositions={busPositions}
          ambulancePositions={ambulancePositions}
          activeDispatch={dispatchData?.active_dispatch}
        />

        {driverRole === 'conductor' ? (
          /* ─── CONDUCTOR APP VIEW ─── */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 20, alignItems: 'flex-start' }}>
            
            {/* LEFT: Ticket issuer POS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* POS Terminal Card */}
              <div style={{ background: '#16a34a', borderRadius: 12, padding: '14px 18px', color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 18 }}>💳</span>
                  <span style={{ fontWeight: 800, fontSize: 14 }}>OptiFlow Bus POS Terminal</span>
                </div>
                <p style={{ fontSize: 11, opacity: 0.85 }}>Issue passenger tickets · Real-time occupancy sync</p>
              </div>

              {/* Journey details forms */}
              <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', margin: 0 }}>Issue Ticket</h3>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>FROM (BOARDING STOP)</label>
                    <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 700 }}>📍 Auto-detected from live location</span>
                  </div>
                  <select
                    className="input-field"
                    value={originStopId}
                    onChange={(e) => { setOriginStopId(e.target.value); setDestStopId(''); }}
                    disabled={!selectedBus}
                    style={{ padding: 10 }}
                  >
                    <option value="">Select boarding stop...</option>
                    {routeStops.map((rs) => (
                      <option key={rs.stop_id} value={rs.stop_id}>
                        {rs.sequence + 1}. {STOP_NAMES[rs.stop_id] || `Stop ${rs.stop_id}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>TO</label>
                  <select
                    className="input-field"
                    value={destStopId}
                    onChange={(e) => setDestStopId(e.target.value)}
                    disabled={!originStopId}
                    style={{ padding: 10 }}
                  >
                    <option value="">Select destination...</option>
                    {validDest.map((rs) => (
                      <option key={rs.stop_id} value={rs.stop_id}>
                        {rs.sequence + 1}. {STOP_NAMES[rs.stop_id] || `Stop ${rs.stop_id}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>PASSENGERS</label>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #cbd5e1', borderRadius: 8, overflow: 'hidden' }}>
                    <button
                      onClick={() => setPassengerCount((p) => Math.max(1, p - 1))}
                      style={{ width: 40, height: 40, background: '#f8fafc', border: 'none', cursor: 'pointer', fontSize: 18, color: '#16a34a', fontWeight: 700, borderRight: '1px solid #cbd5e1' }}
                    >−</button>
                    <span style={{ flex: 1, textAlign: 'center', fontWeight: 800, fontSize: 14 }}>{passengerCount}</span>
                    <button
                      onClick={() => setPassengerCount((p) => Math.min(10, p + 1))}
                      style={{ width: 40, height: 40, background: '#f8fafc', border: 'none', cursor: 'pointer', fontSize: 18, color: '#16a34a', fontWeight: 700, borderLeft: '1px solid #cbd5e1' }}
                    >+</button>
                  </div>
                </div>

                {/* Cash/Online mode selector */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>PAYMENT METHOD</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setPaymentMode('cash')}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        border: paymentMode === 'cash' ? '2.5px solid #16a34a' : '1.5px solid #cbd5e1',
                        background: paymentMode === 'cash' ? '#f0fdf4' : '#fff',
                        color: paymentMode === 'cash' ? '#16a34a' : '#64748b',
                        cursor: 'pointer',
                      }}
                    >
                      <Banknote size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode('online')}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        border: paymentMode === 'online' ? '2.5px solid #7c3aed' : '1.5px solid #cbd5e1',
                        background: paymentMode === 'online' ? '#f5f3ff' : '#fff',
                        color: paymentMode === 'online' ? '#7c3aed' : '#64748b',
                        cursor: 'pointer',
                      }}
                    >
                      <Smartphone size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> Online (QR)
                    </button>
                  </div>
                </div>

                {farePreview > 0 && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Estimated Fare:</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: '#16a34a' }}>₹{farePreview}</span>
                  </div>
                )}

                <button
                  className="btn-primary"
                  style={{
                    width: '100%', justifyContent: 'center', padding: '12px 0', fontSize: 13,
                    background: paymentMode === 'online' ? '#7c3aed' : '#16a34a',
                  }}
                  onClick={handleIssue}
                  disabled={!selectedBusId || !originStopId || !destStopId || issuing}
                >
                  {issuing ? <span className="spinner" /> : null}
                  {issuing ? 'Processing...' : paymentMode === 'online' ? 'Show QR Code' : 'Issue Ticket'}
                </button>
              </div>

              {/* Bus Settings & Occupancy Overrides widget */}
              <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', margin: 0 }}>Bus Information & Occupancy</h3>
                
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>SELECTED BUS</label>
                  <select
                    className="input-field"
                    value={selectedBusId}
                    onChange={(e) => setSelectedBusId(e.target.value)}
                    style={{ padding: 10 }}
                  >
                    {buses.map((b) => (
                      <option key={b.bus_id} value={b.bus_id}>
                        Route {b.bus_number} — {b.route_name} {b.bus_id === conductor?.assigned_bus_id ? ' ★' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedBus && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginTop: 4 }}>
                      <span>Live Occupancy:</span>
                      <span style={{ fontWeight: 700, color: fillColor }}>{occupancy}/{capacity} Seats</span>
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 9, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>SEATED COUNT</label>
                        <input
                          type="number"
                          min={0}
                          max={capacity}
                          value={seatedOverride}
                          onChange={(e) => setSeatedOverride(Number(e.target.value))}
                          className="input-field"
                          style={{ padding: 6, fontSize: 12, textAlign: 'center' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 9, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>STANDING COUNT</label>
                        <input
                          type="number"
                          min={0}
                          value={standingOverride}
                          onChange={(e) => setStandingOverride(Number(e.target.value))}
                          className="input-field"
                          style={{ padding: 6, fontSize: 12, textAlign: 'center' }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleSaveOccupancy}
                      disabled={savingOccupancy}
                      className="btn-outline"
                      style={{ width: '100%', fontSize: 11, padding: '8px 0', justifyContent: 'center', borderColor: '#16a34a', color: '#16a34a' }}
                    >
                      {savingOccupancy ? 'Updating overrides...' : 'Save Occupancy Overrides'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* RIGHT: Ticket log & stops */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>POS Ticket Log</h2>
                    <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      {selectedBus ? `Route ${selectedBus.bus_number} · ${selectedBus.route_name}` : 'Select a bus'}
                    </p>
                  </div>
                  <button onClick={loadTickets} className="btn-outline" style={{ fontSize: 11, padding: '6px 12px', display: 'flex', gap: 4, alignItems: 'center' }}>
                    <RefreshCw size={12} /> Sync Log
                  </button>
                </div>

                {recentTickets.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', border: '2px dashed #cbd5e1', borderRadius: 12 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}><Ticket size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /></div>
                    <p style={{ fontWeight: 700, margin: 0 }}>No tickets issued today</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0 0' }}>Tickets printed or verified on POS will appear here.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 360, overflowY: 'auto' }}>
                    {recentTickets.map((t) => (
                      <TicketRow key={t.ticket_id || t._id} ticket={t} />
                    ))}
                  </div>
                )}
              </div>

              {/* Stops list visual track */}
              {selectedBus && routeStops.length > 0 && (
                <div className="card" style={{ padding: 16 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>Route Stations Track</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {routeStops.map((rs, idx) => {
                      const isCurrent = idx === selectedBus.current_stop_sequence;
                      return (
                        <div key={rs.stop_id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span
                            style={{
                              width: 22, height: 22, borderRadius: '50%',
                              background: isCurrent ? '#16a34a' : '#f1f5f9',
                              color: isCurrent ? '#fff' : '#64748b',
                              fontSize: 10, fontWeight: 800,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              border: isCurrent ? 'none' : '1px solid #cbd5e1',
                            }}
                          >
                            {rs.sequence + 1}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: isCurrent ? 800 : 500, color: isCurrent ? '#16a34a' : '#334155' }}>
                            {STOP_NAMES[rs.stop_id] || `Stop ${rs.stop_id}`} {isCurrent ? ' (Current Stop)' : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>
        ) : (
          /* ─── AMBULANCE DRIVER APP VIEW ─── */
          <div style={{ display: 'grid', gridTemplateColumns: ambulanceId ? '1fr 1.2fr' : '1fr', gap: 20, alignItems: 'flex-start' }}>
            
            {/* LEFT: Registry / Status control */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {!ambulanceId ? (
                /* Registration needed */
                <div className="card" style={{ padding: 20, border: '1px solid #fca5a5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <ShieldAlert size={24} color="#dc2626" />
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>Verify Ambulance Registration</h3>
                  </div>
                  
                  <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                    Your account is not registered to an active 108 Emergency Response ambulance. Register below to activate emergency GPS and receive priority corridor clearances.
                  </p>

                  <form onSubmit={handleSelfRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>VEHICLE NUMBER</label>
                      <input
                        type="text"
                        placeholder="e.g. TN-38-AM-1081"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        className="input-field"
                        style={{ padding: 10 }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>AMBULANCE TYPE</label>
                      <select
                        className="input-field"
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                        style={{ padding: 10 }}
                      >
                        <option value="ALS">Advanced Life Support (ALS)</option>
                        <option value="BLS">Basic Life Support (BLS)</option>
                        <option value="ICU">Critical Mobile ICU</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>HOSPITAL STATIONED</label>
                      <input
                        type="text"
                        placeholder="e.g. Kovai Medical Center & Hospital"
                        value={hospitalName}
                        onChange={(e) => setHospitalName(e.target.value)}
                        className="input-field"
                        style={{ padding: 10 }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={updatingAmb}
                      className="btn-primary"
                      style={{ width: '100%', justifyContent: 'center', background: '#dc2626', padding: '12px 0' }}
                    >
                      {updatingAmb ? <span className="spinner" /> : <PlusCircle size={16} />}
                      {updatingAmb ? 'Registering...' : 'Register Ambulance'}
                    </button>
                  </form>
                </div>
              ) : (
                /* Ambulance registered and active controls */
                <>
                  <div className="card" style={{ padding: 20 }}>
                    <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 12, marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>VEHICLE VERIFIED</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', marginTop: 2 }}>{ambulanceId}</div>
                      {dispatchData?.ambulance?.hospital_name && (dispatchData?.ambulance?.status !== 'offline') && (
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Stationed: {dispatchData.ambulance.hospital_name}</div>
                      )}
                    </div>

                    <label style={{ fontSize: 10, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>EMERGENCY STATUS</label>
                    
                    {(() => {
                      const currentStatus = dispatchData?.ambulance?.status || 'available';
                      
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {/* Availability Toggle - Only when no active dispatch */}
                          {(!dispatchData?.active_dispatch || currentStatus === 'available' || currentStatus === 'offline') && (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                onClick={() => handleAmbStatusChange('available')}
                                disabled={updatingAmb}
                                style={{ flex: 1, padding: '12px 0', borderRadius: 8, background: currentStatus === 'available' ? '#16a34a' : '#f8fafc', color: currentStatus === 'available' ? '#fff' : '#64748b', fontWeight: 700, border: currentStatus === 'available' ? 'none' : '1px solid #cbd5e1', cursor: 'pointer' }}
                              >
                                ✅ Available
                              </button>
                              <button
                                onClick={() => handleAmbStatusChange('offline')}
                                disabled={updatingAmb}
                                style={{ flex: 1, padding: '12px 0', borderRadius: 8, background: currentStatus === 'offline' ? '#ef4444' : '#f8fafc', color: currentStatus === 'offline' ? '#fff' : '#64748b', fontWeight: 700, border: currentStatus === 'offline' ? 'none' : '1px solid #cbd5e1', cursor: 'pointer' }}
                              >
                                🛑 Offline
                              </button>
                            </div>
                          )}

                          {/* Active Dispatch Action Buttons */}
                          {currentStatus === 'en_route' && (
                            <button onClick={() => handleAmbStatusChange('on_scene')} disabled={updatingAmb} className="btn-primary" style={{ width: '100%', padding: '16px 0', fontSize: 16, background: '#d97706', justifyContent: 'center' }}>
                              📍 Arrived Pickup
                            </button>
                          )}
                          {currentStatus === 'on_scene' && (
                            <button onClick={() => handleAmbStatusChange('transporting')} disabled={updatingAmb} className="btn-primary" style={{ width: '100%', padding: '16px 0', fontSize: 16, background: '#7c3aed', justifyContent: 'center' }}>
                              🏥 Transporting
                            </button>
                          )}
                          {currentStatus === 'transporting' && (
                            <button onClick={() => handleAmbStatusChange('available')} disabled={updatingAmb} className="btn-primary" style={{ width: '100%', padding: '16px 0', fontSize: 16, background: '#16a34a', justifyContent: 'center' }}>
                              ✅ Reached Hospital / Free
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="card" style={{ padding: 16, background: '#f8fafc' }}>
                    <h4 style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>💡 GPS Tracking Active</h4>
                    <p style={{ fontSize: 11, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                      Ambulance GPS beacon is actively broadcasting coordinates to Central Traffic Control. Keep this page open to ensure green corridors route clears properly.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* RIGHT: Active Dispatch & Green Corridor & Turn-by-Turn Route */}
            {ambulanceId && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {loadingDispatch ? (
                  <div className="card" style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px' }} />
                    Syncing dispatch status...
                  </div>
                ) : dispatchData?.active_dispatch ? (
                  /* Active Dispatch Case */
                  <>
                    {/* Call Card */}
                    <div className="card" style={{ padding: 20, border: '1.5px solid #3b82f6', background: '#eff6ff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ background: '#dc2626', color: '#fff', padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
                          <Flame size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> {dispatchData.active_dispatch.priority?.toUpperCase()} CALL
                        </span>
                        <span style={{ fontSize: 11, color: '#3b82f6', fontWeight: 700, fontFamily: 'monospace' }}>
                          {dispatchData.active_dispatch.request_id}
                        </span>
                      </div>

                      <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1e3a8a', margin: '0 0 8px 0' }}>
                        Patient: {dispatchData.active_dispatch.patient_name}
                      </h3>

                      <div style={{ fontSize: 12, color: '#1e40af', marginBottom: 4 }}>
                        <MapPin size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> Pickup: <strong>{dispatchData.active_dispatch.pickup_location?.name || 'Gandhipuram Junction'}</strong>
                      </div>
                      <div style={{ fontSize: 12, color: '#1e40af', marginBottom: 4 }}>
                        <Hospital size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> Destination: <strong>{dispatchData.active_dispatch.destination_hospital?.name || dispatchData.active_dispatch.destination_hospital}</strong>
                      </div>
                      <div style={{ fontSize: 12, color: '#1e40af', marginBottom: 12 }}>
                        📞 Contact: <strong>{dispatchData.active_dispatch.contact_phone}</strong>
                      </div>

                    </div>
                  </>
                ) : (
                  /* Available / Standby Case */
                  <div className="card" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                    <div style={{ fontSize: 44, marginBottom: 12 }}>🟢</div>
                    <h3 style={{ fontWeight: 800, fontSize: 16, color: '#16a34a', margin: '0 0 4px 0' }}>Standby / Ready</h3>
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                      Waiting for emergency dispatch call alerts from 108. Stay active.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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
