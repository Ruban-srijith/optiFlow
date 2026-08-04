import React, { useState, useEffect, useRef } from 'react';
import { Siren } from 'lucide-react';
import {
  ShieldAlert, X, AlertTriangle, Info, Smartphone, CheckCircle,
  Lightbulb, Flame, MapPin, Hospital, Phone, TrafficCone,
  Ambulance, Navigation, Clock, ChevronRight, Bell, BellRing,
  Check, XCircle, Siren, Activity, Zap, Star
} from 'lucide-react';
import axios from 'axios';
import io from 'socket.io-client';

const socket = io('http://localhost:5001');

// ─── Workflow steps ──────────────────────────────────────────────────────────
// standby → incoming → en_route → arrived → transporting → completed
// ────────────────────────────────────────────────────────────────────────────

const STEP_CONFIG = {
  standby:     { color: '#22c55e', bg: '#052e16', border: '#16a34a', label: 'Standby / Ready' },
  incoming:    { color: '#f59e0b', bg: '#451a03', border: '#d97706', label: 'Incoming Dispatch!' },
  en_route:    { color: '#3b82f6', bg: '#172554', border: '#2563eb', label: 'En Route to Pickup' },
  arrived:     { color: '#a855f7', bg: '#2e1065', border: '#7c3aed', label: 'Arrived at Patient' },
  transporting:{ color: '#ec4899', bg: '#500724', border: '#db2777', label: 'Transporting to Hospital' },
  completed:   { color: '#22c55e', bg: '#052e16', border: '#16a34a', label: 'Trip Completed!' },
};

export default function AmbulanceDriverPortal({ onClose, inline = false }) {
  const [driver, setDriver] = useState(null);
  const [phone, setPhone] = useState('+919876543214');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Workflow state
  const [workflowStep, setWorkflowStep] = useState('standby'); // standby | incoming | en_route | arrived | transporting | completed
  const [activeRequest, setActiveRequest] = useState(null);
  const [ambulanceInfo, setAmbulanceInfo] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [etaSeconds, setEtaSeconds] = useState(0);
  const [greenCorridor, setGreenCorridor] = useState(false);
  const [incomingRinging, setIncomingRinging] = useState(false);
  const etaTimerRef = useRef(null);
  const completedTimerRef = useRef(null);

  // ── Restore session ────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem('driver_token');
      const user = localStorage.getItem('driver_info');
      if (stored && user && user !== 'undefined') {
        const parsed = JSON.parse(user);
        setDriver(parsed);
      }
    } catch (e) {
      console.warn('Error reading driver_info:', e);
    }
  }, []);

  // ── Join socket room + listen for dispatch_call ────────────────────────────
  useEffect(() => {
    if (!driver) return;
    const ambulanceId = driver.assigned_ambulance_id;
    if (ambulanceId) {
      socket.emit('join_driver_room', { ambulance_id: ambulanceId });
    }

    const handleDispatch = (request) => {
      // Only trigger if we're standby
      if (!activeRequest || workflowStep === 'standby') {
        setActiveRequest(request);
        setWorkflowStep('incoming');
        setIncomingRinging(true);
        setGreenCorridor(false);
      }
    };

    socket.on('dispatch_call', handleDispatch);
    return () => socket.off('dispatch_call', handleDispatch);
  }, [driver, workflowStep, activeRequest]);

  // ── Stop ringing after 3s ──────────────────────────────────────────────────
  useEffect(() => {
    if (incomingRinging) {
      const t = setTimeout(() => setIncomingRinging(false), 3000);
      return () => clearTimeout(t);
    }
  }, [incomingRinging]);

  // ── ETA countdown when en_route ────────────────────────────────────────────
  useEffect(() => {
    if (workflowStep === 'en_route' && activeRequest?.eta_minutes) {
      setEtaSeconds(activeRequest.eta_minutes * 60);
      etaTimerRef.current = setInterval(() => {
        setEtaSeconds((s) => {
          if (s <= 1) { clearInterval(etaTimerRef.current); return 0; }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(etaTimerRef.current);
  }, [workflowStep, activeRequest]);

  // ── Auto-reset completed screen ────────────────────────────────────────────
  useEffect(() => {
    if (workflowStep === 'completed') {
      completedTimerRef.current = setTimeout(() => {
        setWorkflowStep('standby');
        setActiveRequest(null);
        setGreenCorridor(false);
        setEtaSeconds(0);
      }, 4000);
    }
    return () => clearTimeout(completedTimerRef.current);
  }, [workflowStep]);

  // ── Fetch dispatches on login ──────────────────────────────────────────────
  const fetchMyDispatches = async (token) => {
    try {
      const res = await axios.get('/api/driver/my-dispatches', {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('driver_token')}` },
      });
      const { active_dispatch, ambulance } = res.data;
      if (ambulance) setAmbulanceInfo(ambulance);
      if (active_dispatch) {
        setActiveRequest(active_dispatch);
        // Map DB status back to UI workflow step
        const s = active_dispatch.status;
        if (s === 'pending')       setWorkflowStep('incoming');
        else if (s === 'en_route') setWorkflowStep('en_route');
        else if (s === 'arrived')  setWorkflowStep('arrived');
        else if (s === 'transporting') setWorkflowStep('transporting');
        else setWorkflowStep('standby');
      } else {
        setWorkflowStep('standby');
      }
    } catch (err) {
      console.error('Fetch dispatches error:', err);
    }
  };

  useEffect(() => {
    if (driver) {
      fetchMyDispatches();
      const interval = setInterval(() => fetchMyDispatches(), 6000);
      return () => clearInterval(interval);
    }
  }, [driver]);

  // ── Auth handlers ──────────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res = await axios.post('/api/auth/send-otp', { phone_number: phone, requested_role: 'ambulance_driver' });
      setOtpSent(true);
      if (res.data.dev_otp) { setOtpCode(res.data.dev_otp); setInfo(`Dev OTP: ${res.data.dev_otp}`); }
    } catch (err) { setError(err.response?.data?.error || 'Failed to send OTP'); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res = await axios.post('/api/auth/verify-otp', { phone_number: phone, otp: otpCode });
      const { token, user } = res.data;
      localStorage.setItem('driver_token', token);
      localStorage.setItem('driver_info', JSON.stringify(user));
      setDriver(user);
      fetchMyDispatches(token);
    } catch (err) { setError(err.response?.data?.error || 'Invalid OTP code'); }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('driver_token');
    localStorage.removeItem('driver_info');
    setDriver(null); setOtpSent(false);
    setWorkflowStep('standby'); setActiveRequest(null);
  };

  // ── Workflow action handlers ────────────────────────────────────────────────
  const handleAccept = async () => {
    if (!activeRequest) return;
    setUpdating(true);
    try {
      await axios.post(
        `/api/ambulances/request/${activeRequest.request_id}/accept`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('driver_token')}` } }
      );
      setWorkflowStep('en_route');
      setGreenCorridor(activeRequest.priority === 'critical');
      // Start ETA from server value
      setEtaSeconds((activeRequest.eta_minutes || 8) * 60);
    } catch (err) { alert(err.response?.data?.error || 'Failed to accept dispatch'); }
    finally { setUpdating(false); }
  };

  const handleDecline = async () => {
    if (!activeRequest) return;
    setUpdating(true);
    try {
      await axios.post(
        `/api/ambulances/request/${activeRequest.request_id}/decline`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('driver_token')}` } }
      );
      setWorkflowStep('standby');
      setActiveRequest(null);
    } catch (err) { alert(err.response?.data?.error || 'Failed to decline dispatch'); }
    finally { setUpdating(false); }
  };

  const handleStatusUpdate = async (newStatus, extraPayload = {}) => {
    setUpdating(true);
    try {
      await axios.patch(
        '/api/driver/status',
        {
          status: newStatus,
          request_id: activeRequest?.request_id,
          green_corridor_active: greenCorridor,
          ...extraPayload,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('driver_token')}` } }
      );
      if (newStatus === 'arrived_pickup') setWorkflowStep('arrived');
      if (newStatus === 'transporting')   setWorkflowStep('transporting');
      if (newStatus === 'completed')      setWorkflowStep('completed');
    } catch (err) { alert(err.response?.data?.error || 'Failed to update status'); }
    finally { setUpdating(false); }
  };

  const toggleGreenCorridor = async () => {
    const next = !greenCorridor;
    setGreenCorridor(next);
    try {
      await axios.patch(
        '/api/driver/status',
        { green_corridor_active: next, request_id: activeRequest?.request_id },
        { headers: { Authorization: `Bearer ${localStorage.getItem('driver_token')}` } }
      );
    } catch (_) {}
  };

  // ── Format ETA ────────────────────────────────────────────────────────────
  const fmtEta = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const stepCfg = STEP_CONFIG[workflowStep] || STEP_CONFIG.standby;

  // ── Extracted inner content (shared between modal + inline renders) ───────
  const renderContent = () => (
    <div style={{ padding: 20, overflowY: 'auto' }}>
      {/* ── LOGIN FLOW ── */}
      {!driver ? (
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 18, color: '#f8fafc' }}>Driver Authentication</h3>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 20px 0' }}>
            Sign in with your registered mobile to receive live 108 emergency dispatches.
          </p>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#450a0a', border: '1px solid #991b1b', color: '#fca5a5', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}
          {info && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#172554', border: '1px solid #1e40af', color: '#93c5fd', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              <Info size={14} /> {info}
            </div>
          )}
          {!otpSent ? (
            <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>MOBILE NUMBER</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: 15, boxSizing: 'border-box' }}
                  placeholder="+919876543214" required />
              </div>
              <button type="submit" disabled={loading}
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '12px', borderRadius: 10, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                {loading ? 'Sending OTP...' : <><Smartphone size={18} /> Send Driver OTP</>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>ENTER OTP CODE</label>
                <input type="text" maxLength={6} value={otpCode} onChange={(e) => setOtpCode(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: 24, textAlign: 'center', letterSpacing: 8, fontWeight: 700, boxSizing: 'border-box' }}
                  placeholder="123456" required />
              </div>
              <button type="submit" disabled={loading}
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '12px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                {loading ? 'Verifying...' : <><CheckCircle size={18} /> Confirm Driver Sign In</>}
              </button>
            </form>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 20, padding: 12, borderRadius: 8, background: '#1e293b', fontSize: 12, color: '#94a3b8' }}>
            <Lightbulb size={14} color="#fbbf24" />
            <span><b>Demo:</b> <code>+919876543214</code> → OTP: <code>123456</code></span>
          </div>
        </div>

      ) : (
        /* ── DRIVER DASHBOARD ── */
        <div>
          {/* Driver info header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#f8fafc' }}>{driver.full_name}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{ambulanceInfo?.ambulance_id || driver.assigned_ambulance_id || 'Unassigned'}</span>
                {ambulanceInfo?.type && <span style={{ marginLeft: 6, color: '#94a3b8' }}>· {ambulanceInfo.type}</span>}
              </div>
            </div>
            <button onClick={handleLogout} style={{ padding: '6px 14px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f87171', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
              Sign Out
            </button>
          </div>

          {/* STANDBY */}
          {workflowStep === 'standby' && (
            <div style={{ textAlign: 'center', padding: '32px 20px', background: '#052e16', border: '1px solid #166534', borderRadius: 16 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 0 0 12px #16a34a22, 0 0 0 24px #16a34a11' }}>
                <Activity size={32} color="#fff" />
              </div>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#22c55e', marginBottom: 6 }}>Standby / Ready</div>
              <div style={{ fontSize: 13, color: '#86efac' }}>Waiting for emergency dispatch call alerts from 108. Stay active.</div>
              <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, color: '#4ade80' }}>
                <Zap size={13} />
                <span>GPS Beacon Active · Broadcasting to Traffic Control</span>
              </div>
            </div>
          )}

          {/* INCOMING DISPATCH */}
          {workflowStep === 'incoming' && activeRequest && (
            <div>
              <div style={{ background: '#451a03', border: '2px solid #d97706', borderRadius: 14, padding: 16, marginBottom: 16, animation: 'pulse 1s ease-in-out infinite' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ background: '#dc2626', borderRadius: 8, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: '#fff', textTransform: 'uppercase' }}>
                    <BellRing size={14} /> Incoming Dispatch
                  </div>
                  <span style={{ background: '#dc262688', color: '#fca5a5', padding: '3px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                    {(activeRequest.priority || 'critical').toUpperCase()}
                  </span>
                </div>
                <h3 style={{ margin: '0 0 10px 0', fontSize: 17, color: '#fff', fontWeight: 800 }}><Siren size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> {activeRequest.patient_name}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#fde68a' }}><Flame size={14} /><span><b>Emergency:</b> {activeRequest.emergency_type}</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#fed7aa' }}><MapPin size={14} /><span><b>Pickup:</b> {activeRequest.pickup_location?.name || activeRequest.pickup_location?.address || 'See map'}</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#bfdbfe' }}><Hospital size={14} /><span><b>Hospital:</b> {activeRequest.destination_hospital?.name || activeRequest.destination_hospital}</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#a5f3fc' }}><Phone size={14} /><a href={`tel:${activeRequest.contact_phone}`} style={{ color: '#38bdf8' }}>{activeRequest.contact_phone}</a></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#86efac' }}><Clock size={14} /><span><b>ETA to pickup:</b> ~{activeRequest.eta_minutes || 8} min</span></div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button onClick={handleDecline} disabled={updating}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px', background: '#1e293b', border: '2px solid #dc2626', borderRadius: 12, color: '#f87171', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                  <XCircle size={20} /> Decline
                </button>
                <button onClick={handleAccept} disabled={updating}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px', background: 'linear-gradient(135deg, #16a34a, #15803d)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 15px rgba(22,163,74,0.4)' }}>
                  <Check size={20} /> {updating ? 'Accepting...' : 'Accept Call'}
                </button>
              </div>
            </div>
          )}

          {/* EN ROUTE */}
          {workflowStep === 'en_route' && activeRequest && (
            <div>
              <PatientCard request={activeRequest} />
              <div style={{ background: '#172554', border: '1px solid #2563eb', borderRadius: 12, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Navigation size={22} color="#60a5fa" />
                  <div>
                    <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>ETA to Pickup</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#93c5fd', fontFamily: 'monospace' }}>{etaSeconds > 0 ? fmtEta(etaSeconds) : 'Arriving'}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#60a5fa', textAlign: 'right' }}>
                  <div style={{ fontWeight: 700 }}>En Route</div>
                  <div>{activeRequest.pickup_location?.name || 'Pickup Location'}</div>
                </div>
              </div>
              <GreenCorridorToggle active={greenCorridor} onToggle={toggleGreenCorridor} />
              <button onClick={() => handleStatusUpdate('arrived_pickup')} disabled={updating}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '18px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,58,237,0.4)', marginTop: 8 }}>
                <MapPin size={20} /> {updating ? 'Updating...' : 'Arrived at Pickup'} <ChevronRight size={20} style={{ marginLeft: 'auto' }} />
              </button>
            </div>
          )}

          {/* ARRIVED AT PATIENT */}
          {workflowStep === 'arrived' && activeRequest && (
            <div>
              <div style={{ background: '#2e1065', border: '1px solid #7c3aed', borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ background: '#7c3aed', borderRadius: '50%', padding: 10, display: 'flex' }}><MapPin size={20} color="#fff" /></div>
                <div>
                  <div style={{ fontWeight: 700, color: '#c4b5fd', fontSize: 14 }}>On Scene — Patient Located</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Stabilize and load patient for transport</div>
                </div>
              </div>
              <PatientCard request={activeRequest} />
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>DESTINATION HOSPITAL</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f8fafc', fontWeight: 700 }}>
                  <Hospital size={16} color="#60a5fa" />
                  {activeRequest.destination_hospital?.name || activeRequest.destination_hospital}
                </div>
              </div>
              <button onClick={() => handleStatusUpdate('transporting')} disabled={updating}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '18px', background: 'linear-gradient(135deg, #db2777, #be185d)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 20px rgba(219,39,119,0.4)' }}>
                <Ambulance size={20} /> {updating ? 'Updating...' : 'Start Transporting'} <ChevronRight size={20} style={{ marginLeft: 'auto' }} />
              </button>
            </div>
          )}

          {/* TRANSPORTING */}
          {workflowStep === 'transporting' && activeRequest && (
            <div>
              <div style={{ background: '#500724', border: '1px solid #db2777', borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ background: '#db2777', borderRadius: '50%', padding: 10, display: 'flex' }}><Ambulance size={20} color="#fff" style={{ animation: 'bounce 0.6s infinite' }} /></div>
                <div>
                  <div style={{ fontWeight: 700, color: '#fbcfe8', fontSize: 14 }}>Transporting to Hospital</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Patient onboard · En route to emergency department</div>
                </div>
              </div>
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 6 }}>PATIENT</div>
                <div style={{ fontWeight: 700, color: '#f8fafc', marginBottom: 2 }}>{activeRequest.patient_name}</div>
                <div style={{ fontSize: 12, color: '#f87171' }}>{activeRequest.emergency_type} · {activeRequest.priority?.toUpperCase()}</div>
              </div>
              <div style={{ background: '#172554', border: '1px solid #2563eb', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 6 }}>DESTINATION</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#93c5fd', fontWeight: 700 }}>
                  <Hospital size={16} color="#60a5fa" />
                  {activeRequest.destination_hospital?.name || activeRequest.destination_hospital}
                </div>
              </div>
              <GreenCorridorToggle active={greenCorridor} onToggle={toggleGreenCorridor} />
              <button onClick={() => handleStatusUpdate('completed')} disabled={updating}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '18px', background: 'linear-gradient(135deg, #16a34a, #15803d)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 20px rgba(22,163,74,0.4)', marginTop: 8 }}>
                <Hospital size={20} /> {updating ? 'Updating...' : 'Reached Hospital — Done'} <ChevronRight size={20} style={{ marginLeft: 'auto' }} />
              </button>
            </div>
          )}

          {/* COMPLETED */}
          {workflowStep === 'completed' && (
            <div style={{ textAlign: 'center', padding: '36px 20px', background: '#052e16', border: '1px solid #16a34a', borderRadius: 16 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #16a34a, #15803d)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 0 0 16px #16a34a22' }}>
                <CheckCircle size={40} color="#fff" />
              </div>
              <div style={{ fontWeight: 900, fontSize: 20, color: '#22c55e', marginBottom: 8 }}>Mission Complete!</div>
              <div style={{ fontSize: 13, color: '#86efac', marginBottom: 4 }}>Patient safely delivered to hospital.</div>
              <div style={{ fontSize: 12, color: '#4ade80', marginTop: 16 }}>Returning to standby in a moment…</div>
            </div>
          )}

          {/* GPS strip */}
          {!['standby', 'completed', 'incoming'].includes(workflowStep) && (
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, fontSize: 12, color: '#4ade80' }}>
              <Zap size={13} />
              <span>GPS beacon actively broadcasting to Traffic Control · Green corridors route clears</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── Inline card wrapper (embedded in ConductorDashboard) ─────────────────
  if (inline) {
    return (
      <div style={{ background: '#0f172a', border: `1px solid ${stepCfg.border}`, borderRadius: 20, color: '#f8fafc', overflow: 'hidden', boxShadow: `0 4px 24px rgba(0,0,0,0.4)` }}>
        <div style={{ padding: '14px 18px', background: '#1e293b', borderBottom: `1px solid ${stepCfg.border}44`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', padding: 8, background: `${stepCfg.color}22`, borderRadius: 10 }}>
            {workflowStep === 'incoming' ? <BellRing size={20} color={stepCfg.color} /> : workflowStep === 'completed' ? <Star size={20} color={stepCfg.color} /> : <ShieldAlert size={20} color={stepCfg.color} />}
          </span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: stepCfg.color }}>{stepCfg.label}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{ambulanceInfo?.ambulance_id || driver?.assigned_ambulance_id || 'AMB Terminal'} · 108 Emergency</div>
          </div>
        </div>
        {renderContent()}
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.85}}@keyframes bounce{0%,100%{transform:translateX(0)}50%{transform:translateX(4px)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>

      <div style={{ background: '#0f172a', border: `1px solid ${stepCfg.border}`, borderRadius: 20, width: 500, maxWidth: '100%', color: '#f8fafc', overflow: 'hidden', boxShadow: `0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px ${stepCfg.border}33` }}>

        {/* ── Header ── */}
        <div style={{ padding: '16px 20px', background: '#1e293b', borderBottom: `1px solid ${stepCfg.border}44`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', padding: 8, background: `${stepCfg.color}22`, borderRadius: 10 }}>
              {workflowStep === 'incoming' ? (
                <BellRing size={22} color={stepCfg.color} style={{ animation: incomingRinging ? 'spin 0.3s linear infinite' : 'none' }} />
              ) : workflowStep === 'completed' ? (
                <Star size={22} color={stepCfg.color} />
              ) : (
                <ShieldAlert size={22} color={stepCfg.color} />
              )}
            </span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: stepCfg.color }}>{stepCfg.label}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                {ambulanceInfo?.ambulance_id || driver?.assigned_ambulance_id || 'AMB Terminal'} · 108 Emergency
              </div>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}>
              <X size={20} />
            </button>
          )}
        </div>

        {renderContent()}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PatientCard({ request }) {
  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Patient Info</span>
        <span style={{ background: '#dc2626', color: '#fff', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 800 }}>
          {(request.priority || 'critical').toUpperCase()}
        </span>
      </div>
      <div style={{ fontWeight: 800, fontSize: 15, color: '#f8fafc', marginBottom: 6 }}>{request.patient_name}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 12, color: '#f87171' }}><b>Emergency:</b> {request.emergency_type}</div>
        <div style={{ fontSize: 12, color: '#cbd5e1' }}>
          <b>Pickup:</b> {request.pickup_location?.name || request.pickup_location?.address || 'See map'}
        </div>
        <div style={{ fontSize: 12, color: '#cbd5e1' }}>
          <b>Contact:</b> <a href={`tel:${request.contact_phone}`} style={{ color: '#38bdf8' }}>{request.contact_phone}</a>
        </div>
      </div>
    </div>
  );
}

function GreenCorridorToggle({ active, onToggle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: active ? '#064e3b' : '#1e293b', borderRadius: 12, border: `1px solid ${active ? '#059669' : '#334155'}`, marginBottom: 12, transition: 'all 0.3s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <TrafficCone size={20} color={active ? '#6ee7b7' : '#64748b'} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: active ? '#6ee7b7' : '#94a3b8' }}>
            Green Corridor {active ? 'ACTIVE' : 'OFF'}
          </div>
          <div style={{ fontSize: 11, color: active ? '#a7f3d0' : '#64748b' }}>
            {active ? 'Traffic signals clearing ahead' : 'Tap to activate signal override'}
          </div>
        </div>
      </div>
      <button onClick={onToggle}
        style={{ padding: '7px 14px', background: active ? '#dc2626' : '#16a34a', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'background 0.2s' }}>
        {active ? 'Deactivate' : 'Activate'}
      </button>
    </div>
  );
}
