import React, { useState, useEffect } from 'react';
import { ShieldAlert, X, AlertTriangle, Info, Smartphone, CheckCircle, Lightbulb, Flame, MapPin, Hospital, Phone, TrafficCone, Ambulance } from 'lucide-react';
import axios from 'axios';
import io from 'socket.io-client';

const socket = io('http://localhost:5001');

export default function AmbulanceDriverPortal({ onClose }) {
  const [driver, setDriver] = useState(null);
  const [phone, setPhone] = useState('+919876543214');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Dispatch state
  const [dispatchData, setDispatchData] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Restore session
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

  // Fetch active dispatches when logged in
  const fetchMyDispatches = async (token) => {
    try {
      const res = await axios.get('/api/driver/my-dispatches', {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('driver_token')}` },
      });
      setDispatchData(res.data);
    } catch (err) {
      console.error('Fetch dispatches error:', err);
    }
  };

  useEffect(() => {
    if (driver) {
      fetchMyDispatches();
      const interval = setInterval(() => fetchMyDispatches(), 5000);
      return () => clearInterval(interval);
    }
  }, [driver]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/send-otp', {
        phone_number: phone,
        requested_role: 'ambulance_driver',
      });
      setOtpSent(true);
      if (res.data.dev_otp) {
        setOtpCode(res.data.dev_otp);
        setInfo(`Dev OTP: ${res.data.dev_otp}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/verify-otp', {
        phone_number: phone,
        otp: otpCode,
      });
      const { token, user } = res.data;
      localStorage.setItem('driver_token', token);
      localStorage.setItem('driver_info', JSON.stringify(user));
      setDriver(user);
      fetchMyDispatches(token);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP code');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus, greenCorridor) => {
    setUpdating(true);
    try {
      const activeCall = dispatchData?.active_dispatch;
      const res = await axios.patch(
        '/api/driver/status',
        {
          status: newStatus,
          request_id: activeCall?.request_id,
          green_corridor_active: greenCorridor,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('driver_token')}` } }
      );

      // Emit position & status update over socket
      const coords = res.data.ambulance?.current_location?.coordinates || [76.9629, 11.0168];
      socket.emit('ambulance_location_update', {
        ambulance_id: res.data.ambulance?.ambulance_id || 'TN-38-AM-1081',
        coordinates: coords,
        status: newStatus,
      });

      fetchMyDispatches();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('driver_token');
    localStorage.removeItem('driver_info');
    setDriver(null);
    setOtpSent(false);
  };

  const activeCall = dispatchData?.active_dispatch;
  const ambulance = dispatchData?.ambulance;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, width: 480, maxWidth: '100%', color: '#f8fafc', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center' }}><ShieldAlert size={24} color="#f87171" /></span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#f87171' }}>Ambulance Driver Terminal</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>108 Emergency Response Unit</div>
            </div>
          </div>
          <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ padding: 24 }}>
          {!driver ? (
            /* LOGIN FLOW */
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 18 }}>Driver Authentication</h3>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 20px 0' }}>
                Sign in with your registered mobile number to receive live 108 emergency call dispatches.
              </p>

              {error && <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#450a0a', border: '1px solid #991b1b', color: '#fca5a5', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}><AlertTriangle size={14} /> {error}</div>}
              {info && <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#172554', border: '1px solid #1e40af', color: '#93c5fd', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}><Info size={14} /> {info}</div>}

              {!otpSent ? (
                <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>MOBILE NUMBER</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: 15 }}
                      placeholder="+919876543214"
                      required
                    />
                  </div>
                  <button type="submit" disabled={loading} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '12px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                    {loading ? 'Sending OTP...' : <><Smartphone size={18} /> Send Driver OTP</>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>ENTER OTP CODE</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: 20, textAlign: 'center', letterSpacing: 6, fontWeight: 700 }}
                      placeholder="123456"
                      required
                    />
                  </div>
                  <button type="submit" disabled={loading} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '12px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                    {loading ? 'Verifying...' : <><CheckCircle size={18} /> Confirm Driver Sign In</>}
                  </button>
                </form>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 20, padding: 12, borderRadius: 8, background: '#1e293b', fontSize: 12, color: '#94a3b8' }}>
                <Lightbulb size={14} color="#fbbf24" /> <span><b>Demo Driver Account:</b> <code>+919876543214</code> (OTP: <code>123456</code>)</span>
              </div>
            </div>
          ) : (
            /* DRIVER DASHBOARD */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, pb: 16, borderBottom: '1px solid #334155' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#f8fafc' }}>{driver.full_name}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Vehicle: <b style={{ color: '#38bdf8' }}>{ambulance?.ambulance_id || driver.assigned_ambulance_id || 'TN-38-AM-1081'}</b></div>
                </div>
                <button onClick={handleLogout} style={{ padding: '6px 12px', background: '#334155', border: 'none', borderRadius: 6, color: '#fca5a5', fontSize: 12, cursor: 'pointer' }}>
                  Sign Out
                </button>
              </div>

              {/* Active Emergency Card */}
              {activeCall ? (
                <div style={{ background: '#1e1b4b', border: '1px solid #4338ca', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#dc2626', color: '#fff', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                      <Flame size={12} /> {activeCall.priority} Dispatch
                    </span>
                    <span style={{ fontSize: 12, color: '#a5b4fc', fontFamily: 'monospace' }}>{activeCall.request_id}</span>
                  </div>

                  <h4 style={{ margin: '0 0 6px 0', fontSize: 16, color: '#fff' }}>Patient: {activeCall.patient_name}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#cbd5e1', marginBottom: 4 }}><MapPin size={14} /> <span>Pickup: <b>{activeCall.pickup_location?.address || 'Gandhipuram Signal'}</b></span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#cbd5e1', marginBottom: 4 }}><Hospital size={14} /> <span>Hospital: <b>{activeCall.destination_hospital}</b></span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#cbd5e1', marginBottom: 12 }}><Phone size={14} /> <span>Phone: <a href={`tel:${activeCall.contact_phone}`} style={{ color: '#38bdf8' }}>{activeCall.contact_phone}</a></span></div>

                  {/* Green Corridor Status */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, background: activeCall.green_corridor_active ? '#064e3b' : '#312e81', borderRadius: 8, marginBottom: 16, border: '1px solid ' + (activeCall.green_corridor_active ? '#059669' : '#4f46e5') }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ display: 'flex', alignItems: 'center' }}><TrafficCone size={20} color={activeCall.green_corridor_active ? '#6ee7b7' : '#c7d2fe'} /></span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: activeCall.green_corridor_active ? '#6ee7b7' : '#c7d2fe' }}>
                          GREEN CORRIDOR {activeCall.green_corridor_active ? 'ACTIVE' : 'OFF'}
                        </div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>Signals automatically set to green</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUpdateStatus(null, !activeCall.green_corridor_active)}
                      disabled={updating}
                      style={{ padding: '6px 12px', background: activeCall.green_corridor_active ? '#dc2626' : '#16a34a', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}
                    >
                      {activeCall.green_corridor_active ? 'Deactivate' : 'Activate Corridor'}
                    </button>
                  </div>

                  {/* Status Action Buttons */}
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' }}>Update Response Status:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button onClick={() => handleUpdateStatus('en_route')} disabled={updating} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', background: activeCall.status === 'dispatched' ? '#2563eb' : '#1e293b', border: '1px solid #3b82f6', color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                      <Ambulance size={14} /> En Route
                    </button>
                    <button onClick={() => handleUpdateStatus('on_scene')} disabled={updating} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', background: activeCall.status === 'on_scene' ? '#d97706' : '#1e293b', border: '1px solid #f59e0b', color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                      <MapPin size={14} /> On Scene
                    </button>
                    <button onClick={() => handleUpdateStatus('transporting')} disabled={updating} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', background: activeCall.status === 'transporting' ? '#9333ea' : '#1e293b', border: '1px solid #a855f7', color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                      <Hospital size={14} /> Transporting
                    </button>
                    <button onClick={() => handleUpdateStatus('available')} disabled={updating} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', background: '#16a34a', border: 'none', color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                      <CheckCircle size={14} /> Call Completed
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 24, textAlign: 'center', background: '#1e293b', borderRadius: 12, marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><CheckCircle size={36} color="#4ade80" /></div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#4ade80' }}>Ambulance Ready & Available</div>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Standing by for emergency 108 calls. GPS tracking active.</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
