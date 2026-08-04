import React, { useState, useEffect } from 'react';
import { Activity, AlertCircle, AlertTriangle, Ambulance, ArrowRight, Banknote, BarChart, Bus, CheckCircle, CheckCircle2, ChevronDown, ChevronUp, Circle, Clock, Coins, Compass, CreditCard, DollarSign, Edit, Edit2, Edit3, Flame, Hospital, LogOut, Map, MapPin, Navigation, Phone, PhoneCall, Play, Plus, PlusCircle, Radio, RefreshCw, RotateCcw, Search, ShieldAlert, Siren, Smartphone, StopCircle, Ticket, TrafficCone, Trash2, TrendingUp, User, Users, UserSquare2, X, XCircle } from 'lucide-react';
import { getIntersections, overrideSignal, resetSignal } from '../services/api';
export default function TrafficControlPage() {
  const [intersections, setIntersections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedIntersection, setSelectedIntersection] = useState(null);

  // Form states
  const [signalState, setSignalState] = useState('manual_override');
  const [reason, setReason] = useState('Admin traffic override');
  const [duration, setDuration] = useState(15);
  const [submitting, setSubmitting] = useState(false);

  const loadIntersections = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getIntersections();
      setIntersections(res.data);
      if (selectedIntersection) {
        // Refresh selected intersection data
        const updated = res.data.find(i => i.intersection_id === selectedIntersection.intersection_id);
        if (updated) setSelectedIntersection(updated);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch intersections data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntersections();
  }, []);

  const handleOverride = async (e) => {
    e.preventDefault();
    if (!selectedIntersection) return;
    setSubmitting(true);
    setError('');
    try {
      await overrideSignal({
        intersection_id: selectedIntersection.intersection_id,
        signal_state: signalState,
        reason,
        duration_minutes: Number(duration),
      });
      await loadIntersections();
      alert('Signal override successfully applied!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to apply signal override');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (intersectionId) => {
    if (!window.confirm('Are you sure you want to reset this signal to automated normal scheduling?')) return;
    setSubmitting(true);
    setError('');
    try {
      await resetSignal(intersectionId);
      await loadIntersections();
      alert('Signal reset to automated mode.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset signal');
    } finally {
      setSubmitting(false);
    }
  };

  const getSignalBadgeColor = (state) => {
    switch (state) {
      case 'normal': return { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd', label: 'Automated' };
      case 'green_corridor_override': return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0', label: '🟢 Green Corridor Active' };
      case 'manual_override': return { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', label: '🟠 Manual Override' };
      case 'emergency_flash': return { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', label: '🔴 Emergency Flash' };
      default: return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0', label: state };
    }
  };

  return (
    <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {error && (
        <div className="card" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedIntersection ? '2fr 1fr' : '1fr', gap: 20, alignItems: 'flex-start' }}>
        {/* Intersections list table */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', display: 'flex', gap: 6, alignItems: 'center' }}>
              <Radio size={18} className="live-dot" style={{ animation: 'pulse 2s infinite' }} />
              Coimbatore Intersections Traffic Status
            </h2>
            <button onClick={loadIntersections} className="btn-outline" style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '8px 12px' }}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
            </button>
          </div>

          {loading && intersections.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              Loading intersections and signals...
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                    <th style={{ padding: '12px 10px', fontSize: 12, fontWeight: 700, color: '#475569' }}>Junction Name</th>
                    <th style={{ padding: '12px 10px', fontSize: 12, fontWeight: 700, color: '#475569' }}>Connected Roads</th>
                    <th style={{ padding: '12px 10px', fontSize: 12, fontWeight: 700, color: '#475569' }}>Signal Mode</th>
                    <th style={{ padding: '12px 10px', fontSize: 12, fontWeight: 700, color: '#475569' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {intersections.map((inter) => {
                    const badge = getSignalBadgeColor(inter.current_signal_state);
                    const isSelected = selectedIntersection?.intersection_id === inter.intersection_id;
                    return (
                      <tr
                        key={inter.intersection_id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: isSelected ? '#f8fafc' : 'transparent',
                          cursor: 'pointer',
                        }}
                        onClick={() => setSelectedIntersection(inter)}
                      >
                        <td style={{ padding: '14px 10px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{inter.name}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', marginTop: 2 }}>{inter.intersection_id}</div>
                        </td>
                        <td style={{ padding: '14px 10px', fontSize: 12, color: '#64748b' }}>
                          {inter.roads?.join(', ')}
                        </td>
                        <td style={{ padding: '14px 10px' }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '4px 10px',
                              borderRadius: 99,
                              background: badge.bg,
                              color: badge.text,
                              border: `1.5px solid ${badge.border}`,
                            }}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '14px 10px' }}>
                          <button
                            className="btn-outline"
                            style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedIntersection(inter);
                            }}
                          >
                            Configure
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Override controls panel */}
        {selectedIntersection && (
          <div className="card" style={{ padding: 20, border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Configure Junction</h3>
              <button
                onClick={() => setSelectedIntersection(null)}
                style={{ background: 'none', border: 'none', fontSize: 18, color: '#94a3b8', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{selectedIntersection.name}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                Active State: <strong>{selectedIntersection.current_signal_state.toUpperCase()}</strong>
              </div>
              {selectedIntersection.manual_override_active && (
                <div style={{ fontSize: 11, color: '#c2410c', marginTop: 6, background: '#fff7ed', padding: '6px 10px', borderRadius: 6, border: '1px solid #fed7aa' }}>
                  <AlertTriangle size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> Reason: {selectedIntersection.override_reason}
                </div>
              )}
            </div>

            <form onSubmit={handleOverride} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                  MANUAL SIGNAL STATE OVERRIDE
                </label>
                <select
                  value={signalState}
                  onChange={(e) => setSignalState(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', padding: '10px 12px' }}
                >
                  <option value="manual_override">Manual Override (Set Phase)</option>
                  <option value="green_corridor_override">Force Green Corridor Override</option>
                  <option value="emergency_flash">Emergency Caution Flash</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                  DURATION (MINUTES)
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', padding: '10px 12px' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                  REASON / JUSTIFICATION
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', padding: '10px 12px', minHeight: 60, fontFamily: 'inherit', resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center', background: '#c2410c' }}
                >
                  <Play size={14} /> Override Signal
                </button>

                {selectedIntersection.manual_override_active && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleReset(selectedIntersection.intersection_id)}
                    className="btn-outline"
                    style={{ padding: '10px 16px', display: 'inline-flex', gap: 4, alignItems: 'center', borderColor: '#cbd5e1' }}
                  >
                    <RotateCcw size={14} /> Reset
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
