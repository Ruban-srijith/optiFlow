import React, { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, getBuses } from '../services/api';

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [form, setForm] = useState({
    phone_number: '+91',
    full_name: '',
    role: 'passenger',
    assigned_bus_id: '',
    assigned_ambulance_id: '',
  });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [uRes, bRes] = await Promise.all([getUsers(), getBuses()]);
      setUsers(uRes.data);
      setBuses(bRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setForm({
      phone_number: '+91',
      full_name: '',
      role: 'passenger',
      assigned_bus_id: '',
      assigned_ambulance_id: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setForm({
      phone_number: u.phone_number,
      full_name: u.full_name || '',
      role: u.role || 'passenger',
      assigned_bus_id: u.assigned_bus_id || '',
      assigned_ambulance_id: u.assigned_ambulance_id || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await updateUser(editingUser._id, form);
      } else {
        await createUser(form);
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Operation failed');
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'superadmin':
        return <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>👑 Super Admin</span>;
      case 'transit_admin':
        return <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>🚌 Transit Admin</span>;
      case 'ambulance_admin':
        return <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>🚑 Health Admin</span>;
      case 'conductor':
        return <span style={{ background: '#f3e8ff', color: '#6b21a8', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>👨‍✈️ Bus Conductor</span>;
      case 'ambulance_driver':
        return <span style={{ background: '#ffedd5', color: '#c2410c', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>🚨 Ambulance Driver</span>;
      default:
        return <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>👤 Passenger</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>System Users & Hierarchy Management</h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
            Manage phone accounts, system permissions, and assignment mappings.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          ➕ Add System Account
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '12px 16px' }}>Phone Number</th>
              <th style={{ padding: '12px 16px' }}>Full Name</th>
              <th style={{ padding: '12px 16px' }}>Role / Permission</th>
              <th style={{ padding: '12px 16px' }}>Assigned Vehicle</th>
              <th style={{ padding: '12px 16px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                  Loading user hierarchy...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                  No accounts found. Click "Add System Account" to create one.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, fontFamily: 'monospace' }}>{u.phone_number}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{u.full_name || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>{getRoleBadge(u.role)}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>
                    {u.assigned_bus_id ? `🚌 Bus ${u.assigned_bus_id}` : u.assigned_ambulance_id ? `🚑 Ambulance ${u.assigned_ambulance_id}` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button className="btn" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => openEditModal(u)}>
                      ✏️ Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 12, width: 440, maxWidth: '90%' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>{editingUser ? 'Edit System User' : 'Create System Account'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  className="form-input"
                  type="text"
                  value={form.phone_number}
                  onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                  placeholder="+919876543210"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Officer / Driver Name"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">System Role</label>
                <select
                  className="form-input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="superadmin">👑 Super Admin (Full Governance)</option>
                  <option value="transit_admin">🚌 Transit Admin (Bus Fleet)</option>
                  <option value="ambulance_admin">🚑 Health Admin (Ambulance Fleet)</option>
                  <option value="conductor">👨‍✈️ Bus Conductor</option>
                  <option value="ambulance_driver">🚨 Ambulance Driver</option>
                  <option value="passenger">👤 Passenger / Citizen</option>
                </select>
              </div>

              {form.role === 'conductor' && (
                <div className="form-group">
                  <label className="form-label">Assigned Bus ID</label>
                  <select
                    className="form-input"
                    value={form.assigned_bus_id}
                    onChange={(e) => setForm({ ...form, assigned_bus_id: e.target.value })}
                  >
                    <option value="">-- Select Bus --</option>
                    {buses.map((b) => (
                      <option key={b.bus_id} value={b.bus_id}>
                        {b.bus_number} ({b.route_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {form.role === 'ambulance_driver' && (
                <div className="form-group">
                  <label className="form-label">Assigned Ambulance ID</label>
                  <input
                    className="form-input"
                    type="text"
                    value={form.assigned_ambulance_id}
                    onChange={(e) => setForm({ ...form, assigned_ambulance_id: e.target.value })}
                    placeholder="TN-38-AM-1081"
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn btn-primary" type="submit" style={{ flex: 1 }}>
                  Save User
                </button>
                <button className="btn" type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
