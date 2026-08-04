import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { getBuses, createBus, deleteBus, getStops } from '../services/api';
import RouteBuilder from './RouteBuilder';

function CreateRouteModal({ stops, onClose, onCreated }) {
  const [form, setForm] = useState({
    bus_id: '', bus_number: '', route_name: '',
    seating_capacity: 40, standing_capacity: 20,
  });
  const [routeStops, setRouteStops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!routeStops.length || routeStops.length < 2) {
      setError('Please select at least a start and end stop.');
      return;
    }
    setLoading(true); setError('');
    try {
      await createBus({ ...form, route_stops: routeStops, seating_capacity: Number(form.seating_capacity), standing_capacity: Number(form.standing_capacity) });
      onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create route');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="modal-title"><Map size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> Create New Route</div>
        {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Bus ID (Registration)</label>
              <input className="form-input" placeholder="TN-38-N-1234" required value={form.bus_id} onChange={e => setForm(p => ({ ...p, bus_id: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Route Number</label>
              <input className="form-input" placeholder="12C" required value={form.bus_number} onChange={e => setForm(p => ({ ...p, bus_number: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Route Name</label>
            <input className="form-input" placeholder="Gandhipuram → Singanallur" required value={form.route_name} onChange={e => setForm(p => ({ ...p, route_name: e.target.value }))} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Seating Capacity</label>
              <input className="form-input" type="number" min={10} max={100} value={form.seating_capacity} onChange={e => setForm(p => ({ ...p, seating_capacity: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Standing Capacity</label>
              <input className="form-input" type="number" min={0} max={50} value={form.standing_capacity} onChange={e => setForm(p => ({ ...p, standing_capacity: e.target.value }))} />
            </div>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 12 }}><MapPin size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> ROUTE STOPS</div>
            <RouteBuilder stops={stops} value={routeStops} onChange={setRouteStops} />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : '✓ Create Route'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RoutesPage() {
  const [buses, setBuses] = useState([]);
  const [stops, setStops] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [bRes, sRes] = await Promise.all([getBuses(), getStops()]);
      setBuses(bRes.data);
      setStops(sRes.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (bus_id, bus_number) => {
    if (!confirm(`Delete Route ${bus_number}? This will also unassign its conductor.`)) return;
    try { await deleteBus(bus_id); load(); } catch (err) { alert(err.response?.data?.error || 'Delete failed'); }
  };

  const stopName = (stop_id) => stops.find((s) => s.stop_id === stop_id)?.stop_name || `Stop ${stop_id}`;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Routes</div>
          <div className="page-sub">{buses.length} route{buses.length !== 1 ? 's' : ''} in the fleet</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New Route
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, color: '#64748b', textAlign: 'center' }}>Loading routes...</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Route</th>
                <th>Bus ID</th>
                <th>Stops</th>
                <th>Capacity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {buses.map((bus) => {
                const stopsArr = Array.isArray(bus.route_stops) ? bus.route_stops : [];
                const orderedStops = [...stopsArr].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
                return (
                  <tr key={bus.bus_id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>Route {bus.bus_number}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{bus.route_name}</div>
                    </td>
                    <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: '#4f46e5' }}>{bus.bus_id}</span></td>
                    <td>
                      <div className="stops-list" style={{ maxWidth: 320 }}>
                        {orderedStops.slice(0, 1).map(s => (
                          <span key={s.stop_id} className="stop-pill start">{stopName(s.stop_id)}</span>
                        ))}
                        {orderedStops.length > 2 && (
                          <span className="stop-pill" style={{ color: '#94a3b8' }}>+{orderedStops.length - 2} stops</span>
                        )}
                        {orderedStops.slice(-1).map(s => (
                          <span key={s.stop_id} className="stop-pill end">{stopName(s.stop_id)}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12 }}>🪑 {bus.seating_capacity} seats</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>🧍 {bus.standing_capacity} standing</div>
                    </td>
                    <td>
                      <button className="btn btn-outline" style={{ fontSize: 12, color: '#dc2626', borderColor: '#fecaca' }} onClick={() => handleDelete(bus.bus_id, bus.bus_number)}>
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {buses.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: 32 }}>No routes yet. Click "New Route" to create one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateRouteModal stops={stops} onClose={() => setShowCreate(false)} onCreated={load} />
      )}
    </div>
  );
}
