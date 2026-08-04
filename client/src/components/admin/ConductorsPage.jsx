import React, { useState, useEffect } from 'react';
import { Activity, AlertCircle, AlertTriangle, Ambulance, ArrowRight, Banknote, BarChart, Bus, CheckCircle, CheckCircle2, ChevronDown, ChevronUp, Circle, Clock, Coins, Compass, CreditCard, DollarSign, Edit, Edit2, Edit3, Flame, Hospital, LogOut, Map, MapPin, Navigation, Phone, PhoneCall, Play, Plus, PlusCircle, Radio, RefreshCw, RotateCcw, Search, ShieldAlert, Siren, Smartphone, StopCircle, Ticket, TrafficCone, Trash2, TrendingUp, User, Users, UserSquare2, X, XCircle } from 'lucide-react';
import { getConductors, getBuses, createConductor, updateConductor, deleteConductor } from '../../services/api';

function ConductorModal({ conductor, buses, onClose, onSaved }) {
  const isEdit = !!conductor;
  const [form, setForm] = useState({
    full_name: conductor?.full_name || '',
    username: conductor?.username || '',
    employee_id: conductor?.employee_id || '',
    password: '',
    assigned_bus_id: conductor?.assigned_bus_id || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const payload = { ...form, assigned_bus_id: form.assigned_bus_id || null };
      if (!isEdit) {
        if (!payload.password) { setError('Password is required'); setLoading(false); return; }
        await createConductor(payload);
      } else {
        const updates = { ...payload };
        if (!updates.password) delete updates.password;
        await updateConductor(conductor._id, updates);
      }
      onSaved(); onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-title">{isEdit ? '✏️ Edit Conductor' : <><UserSquare2 size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> Add Conductor</>}</div>
        {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" required placeholder="John Doe" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Employee ID</label>
              <input className="form-input" required placeholder="EMP-1004" value={form.employee_id} onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))} />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-input" required placeholder="john_doe" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">{isEdit ? 'New Password (leave blank to keep)' : 'Password'}</label>
              <input className="form-input" type="password" placeholder={isEdit ? '(unchanged)' : '••••••••'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Assign to Route</label>
            <select className="form-select" value={form.assigned_bus_id} onChange={e => setForm(p => ({ ...p, assigned_bus_id: e.target.value }))}>
              <option value="">— Unassigned —</option>
              {buses.map((b) => (
                <option key={b.bus_id} value={b.bus_id}>Route {b.bus_number} — {b.route_name}</option>
              ))}
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : '✓ Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ConductorsPage() {
  const [conductors, setConductors] = useState([]);
  const [buses, setBuses] = useState([]);
  const [modal, setModal] = useState(null); // null | 'create' | conductor object
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [cRes, bRes] = await Promise.all([getConductors(), getBuses()]);
      setConductors(cRes.data);
      setBuses(bRes.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDeactivate = async (id, name) => {
    if (!confirm(`Deactivate ${name}? They will not be able to log in.`)) return;
    try { await deleteConductor(id); load(); } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const busName = (bus_id) => {
    const b = buses.find((b) => b.bus_id === bus_id);
    return b ? `Route ${b.bus_number} — ${b.route_name}` : null;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Conductors</div>
          <div className="page-sub">{conductors.filter(c => c.is_active).length} active conductor{conductors.filter(c => c.is_active).length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('create')}>
          + Add Conductor
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, color: '#64748b', textAlign: 'center' }}>Loading conductors...</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Conductor</th>
                <th>Employee ID</th>
                <th>Username</th>
                <th>Assigned Route</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {conductors.map((c) => (
                <tr key={c._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}><User size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /></div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{c.full_name}</div>
                    </div>
                  </td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.employee_id}</span></td>
                  <td style={{ color: '#4f46e5', fontWeight: 500 }}>{c.username}</td>
                  <td>
                    {c.assigned_bus_id ? (
                      <span className="badge badge-green">{busName(c.assigned_bus_id) || c.assigned_bus_id}</span>
                    ) : (
                      <span className="badge badge-gray">Unassigned</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${c.is_active ? 'badge-green' : 'badge-red'}`}>
                      {c.is_active ? '● Active' : '● Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline" style={{ fontSize: 12 }} onClick={() => setModal(c)}>Edit</button>
                      {c.is_active && (
                        <button className="btn btn-outline" style={{ fontSize: 12, color: '#dc2626', borderColor: '#fecaca' }} onClick={() => handleDeactivate(c._id, c.full_name)}>Deactivate</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {conductors.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: 32 }}>No conductors yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <ConductorModal
          conductor={modal === 'create' ? null : modal}
          buses={buses}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
