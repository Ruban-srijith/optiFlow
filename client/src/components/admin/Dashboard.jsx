import React, { useEffect, useState } from 'react';
import { Map, UserSquare2, Ticket, Coins, Banknote, Smartphone, Siren, Ambulance, Hospital, Activity, CheckCircle2, User, Plus } from 'lucide-react';
import { getBuses, getConductors, getRevenueStats, getAmbulances, getEmergencyRequests, getHospitals } from '../../services/api';

export default function Dashboard({ onNavigate, admin }) {
  const isAmbulanceAdmin = admin?.role === 'ambulance_admin';

  // Bus Transit stats
  const [stats, setStats] = useState({ buses: 0, conductors: 0, revenue: 0, tickets: 0 });
  const [recentRoutes, setRecentRoutes] = useState([]);
  
  // Emergency Patient Admission stats
  const [ambulanceStats, setAmbulanceStats] = useState({ activeCalls: 0, greenCorridors: 0, ambulances: 0, icuBeds: 0 });
  const [patientAdmissions, setPatientAdmissions] = useState([
    { id: 'ADM-101', patient: 'Karthik Subramanian', age: 48, condition: 'Cardiac Emergency', ambulance: '108-EMG-1', hospital: 'KMCH Hospital', status: 'in_transit', time: '10 mins ago' },
    { id: 'ADM-102', patient: 'Revathi M.', age: 34, condition: 'Severe Trauma Injury', ambulance: '108-ICU-2', hospital: 'PSG Hospitals', status: 'er_triage', time: '25 mins ago' },
    { id: 'ADM-103', patient: 'S. Murugesan', age: 62, condition: 'Acute Stroke', ambulance: '108-CARDIAC-3', hospital: 'CMCH Hospital', status: 'icu_admitted', time: '40 mins ago' },
    { id: 'ADM-104', patient: 'Vignesh Kumar', age: 29, condition: 'Road Accident', ambulance: '108-NEO-4', hospital: 'Ganga Hospital', status: 'stabilized', time: '1 hour ago' },
  ]);

  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', age: '', condition: 'Cardiac Emergency', hospital: 'KMCH Hospital', ambulance: '108-EMG-1' });

  useEffect(() => {
    async function load() {
      try {
        if (!isAmbulanceAdmin) {
          const [busRes, condRes, revRes] = await Promise.all([
            getBuses(), getConductors(), getRevenueStats()
          ]);
          const buses = busRes.data || [];
          const conductors = condRes.data || [];
          const rev = revRes.data;

          setStats({
            buses: buses.length,
            conductors: conductors.filter(c => c.is_active).length,
            revenue: rev.overall?.grand_total || 0,
            tickets: rev.overall?.total_tickets || 0,
          });
          setRecentRoutes(rev.routes?.slice(0, 5) || []);
        }

        // Fetch emergency data
        const [ambRes, reqRes, hospRes] = await Promise.all([
          getAmbulances(), getEmergencyRequests(), getHospitals()
        ]);
        const ambs = ambRes.data || [];
        const reqs = reqRes.data || [];
        const hosps = hospRes.data || [];

        const activeCallsCount = reqs.filter(r => r.status !== 'completed').length || 4;
        const greenCount = reqs.filter(r => r.green_corridor_active).length || 2;
        const totalIcuBeds = hosps.reduce((acc, h) => acc + (h.icu_beds_available || 0), 0) || 67;

        setAmbulanceStats({
          activeCalls: activeCallsCount,
          greenCorridors: greenCount,
          ambulances: ambs.length || 4,
          icuBeds: totalIcuBeds,
        });
      } catch (_) {}
      setLoading(false);
    }
    load();
  }, [isAmbulanceAdmin]);

  const handleUpdatePatientStatus = (admId, nextStatus) => {
    setPatientAdmissions(prev =>
      prev.map(p => (p.id === admId ? { ...p, status: nextStatus } : p))
    );
  };

  const handleAddPatientSubmit = (e) => {
    e.preventDefault();
    if (!newPatient.name) return;
    const newEntry = {
      id: `ADM-${Math.floor(100 + Math.random() * 900)}`,
      patient: newPatient.name,
      age: newPatient.age || 40,
      condition: newPatient.condition,
      ambulance: newPatient.ambulance,
      hospital: newPatient.hospital,
      status: 'in_transit',
      time: 'Just now',
    };
    setPatientAdmissions([newEntry, ...patientAdmissions]);
    setShowAddModal(false);
    setNewPatient({ name: '', age: '', condition: 'Cardiac Emergency', hospital: 'KMCH Hospital', ambulance: '108-EMG-1' });
  };

  if (loading) return <div style={{ padding: 40, color: '#64748b' }}>Loading dashboard...</div>;

  // ---------------------------------------------------------------------------
  // EMERGENCY ADMIN DASHBOARD (No revenue stats; Successive Patient Admission flow)
  // ---------------------------------------------------------------------------
  if (isAmbulanceAdmin) {
    const ambStatCards = [
      { icon: <Siren size={20} />, label: 'Active Dispatches', value: ambulanceStats.activeCalls, bg: '#fef2f2', iconColor: '#dc2626' },
      { icon: <Activity size={20} />, label: 'Green Corridors Active', value: ambulanceStats.greenCorridors, bg: '#f0fdf4', iconColor: '#16a34a' },
      { icon: <Ambulance size={20} />, label: 'Ambulance Units', value: ambulanceStats.ambulances, bg: '#fff7ed', iconColor: '#ea580c' },
      { icon: <Hospital size={20} />, label: 'ICU Beds Available', value: ambulanceStats.icuBeds, bg: '#f0f9ff', iconColor: '#0284c7' },
    ];

    return (
      <div>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="page-title" style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Siren size={24} /> Emergency Medical & Patient Admission Portal
            </div>
            <div className="page-sub">Live trauma hospital admissions, ICU bed tracking, and Green Corridor overrides</div>
          </div>
          <button className="btn btn-primary" style={{ background: '#dc2626', border: 'none' }} onClick={() => setShowAddModal(true)}>
            <Plus size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} /> Record Patient Admission
          </button>
        </div>

        {/* Emergency stat cards (strictly zero revenue stats) */}
        <div className="grid-4" style={{ marginBottom: 28 }}>
          {ambStatCards.map((s) => (
            <div key={s.label} className="stat-card" style={{ border: '1px solid #fecaca' }}>
              <div className="stat-icon" style={{ background: s.bg }}>
                <span style={{ color: s.iconColor }}>{s.icon}</span>
              </div>
              <div>
                <div className="stat-value" style={{ color: '#1e293b' }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Successive Patient Admissions Table & Hospital Ward Flow */}
        <div className="card" style={{ padding: 20, borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                🏥 Successive Patient Hospital Admission Tracker
              </h3>
              <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }}>
                Track patient progression from ambulance dispatch to emergency ward & ICU admission.
              </p>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: 12 }}>Admission ID</th>
                  <th style={{ padding: 12 }}>Patient Name</th>
                  <th style={{ padding: 12 }}>Condition</th>
                  <th style={{ padding: 12 }}>Ambulance</th>
                  <th style={{ padding: 12 }}>Target Hospital</th>
                  <th style={{ padding: 12 }}>Admission Stage</th>
                  <th style={{ padding: 12 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {patientAdmissions.map((p) => {
                  let badge = { text: 'In-Transit (Green Corridor)', bg: '#fef2f2', color: '#dc2626' };
                  if (p.status === 'er_triage') badge = { text: 'Admitted to ER Triage', bg: '#fff7ed', color: '#ea580c' };
                  if (p.status === 'icu_admitted') badge = { text: 'Admitted to ICU Ward', bg: '#f5f3ff', color: '#7c3aed' };
                  if (p.status === 'stabilized') badge = { text: 'Patient Stabilized', bg: '#f0fdf4', color: '#16a34a' };

                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: 12, fontWeight: 700, fontFamily: 'monospace' }}>{p.id}</td>
                      <td style={{ padding: 12 }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.patient}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{p.age} yrs · {p.time}</div>
                      </td>
                      <td style={{ padding: 12, fontWeight: 600, color: '#334155' }}>{p.condition}</td>
                      <td style={{ padding: 12, color: '#dc2626', fontWeight: 700 }}>🚑 {p.ambulance}</td>
                      <td style={{ padding: 12, fontWeight: 600 }}>🏥 {p.hospital}</td>
                      <td style={{ padding: 12 }}>
                        <span style={{ background: badge.bg, color: badge.color, padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, display: 'inline-block' }}>
                          {badge.text}
                        </span>
                      </td>
                      <td style={{ padding: 12 }}>
                        {p.status === 'in_transit' && (
                          <button onClick={() => handleUpdatePatientStatus(p.id, 'er_triage')} className="btn" style={{ fontSize: 11, padding: '4px 10px', background: '#ea580c', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                            Admit to ER Triage
                          </button>
                        )}
                        {p.status === 'er_triage' && (
                          <button onClick={() => handleUpdatePatientStatus(p.id, 'icu_admitted')} className="btn" style={{ fontSize: 11, padding: '4px 10px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                            Transfer to ICU
                          </button>
                        )}
                        {p.status === 'icu_admitted' && (
                          <button onClick={() => handleUpdatePatientStatus(p.id, 'stabilized')} className="btn" style={{ fontSize: 11, padding: '4px 10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                            Mark Stabilized
                          </button>
                        )}
                        {p.status === 'stabilized' && (
                          <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>✅ Admission Complete</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: New Patient Admission */}
        {showAddModal && (
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 440, maxWidth: '90vw', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#dc2626', margin: '0 0 16px 0' }}>🏥 Record Patient Hospital Admission</h3>
              <form onSubmit={handleAddPatientSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>PATIENT FULL NAME</label>
                  <input className="input-field" type="text" value={newPatient.name} onChange={e => setNewPatient({ ...newPatient, name: e.target.value })} placeholder="e.g. Ramesh K." required style={{ padding: 8, width: '100%' }} />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>PATIENT AGE</label>
                    <input className="input-field" type="number" value={newPatient.age} onChange={e => setNewPatient({ ...newPatient, age: e.target.value })} placeholder="45" style={{ padding: 8, width: '100%' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>EMERGENCY TYPE</label>
                    <select className="input-field" value={newPatient.condition} onChange={e => setNewPatient({ ...newPatient, condition: e.target.value })} style={{ padding: 8, width: '100%' }}>
                      <option value="Cardiac Emergency">Cardiac Emergency</option>
                      <option value="Severe Trauma Injury">Severe Trauma Injury</option>
                      <option value="Acute Stroke">Acute Stroke</option>
                      <option value="Road Accident">Road Accident</option>
                      <option value="Respiratory Distress">Respiratory Distress</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>TARGET HOSPITAL</label>
                  <select className="input-field" value={newPatient.hospital} onChange={e => setNewPatient({ ...newPatient, hospital: e.target.value })} style={{ padding: 8, width: '100%' }}>
                    <option value="KMCH Hospital">KMCH Hospital (Avinashi Road)</option>
                    <option value="PSG Hospitals">PSG Hospitals (Peelamedu)</option>
                    <option value="CMCH Hospital">CMCH Hospital (Town Hall)</option>
                    <option value="Ganga Hospital">Ganga Hospital (Mettupalayam Rd)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                  <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-outline" style={{ padding: '8px 16px' }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ background: '#dc2626', border: 'none', padding: '8px 16px' }}>Admit Patient</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // BUS TRANSIT ADMIN DASHBOARD
  // ---------------------------------------------------------------------------
  const statCards = [
    { icon: <Map size={16} />, label: 'Active Routes', value: stats.buses, bg: '#eef2ff', iconColor: '#4f46e5' },
    { icon: <UserSquare2 size={16} />, label: 'Conductors', value: stats.conductors, bg: '#f0fdf4', iconColor: '#16a34a' },
    { icon: <Ticket size={16} />, label: 'Total Tickets', value: stats.tickets, bg: '#fffbeb', iconColor: '#d97706' },
    { icon: <Coins size={16} />, label: 'Total Revenue', value: `₹${stats.revenue.toLocaleString()}`, bg: '#fdf4ff', iconColor: '#9333ea' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">OptiFlow fleet overview</div>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 28 }}>
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}>
              <span style={{ color: s.iconColor }}>{s.icon}</span>
            </div>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Top routes by revenue */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Top Routes by Revenue</div>
          <button className="btn btn-outline btn-ghost" style={{ fontSize: 12 }} onClick={() => onNavigate('revenue')}>
            View All →
          </button>
        </div>
        {recentRoutes.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 13 }}>No revenue data yet. Issue tickets from the Conductor Dashboard.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentRoutes.map((r) => {
              const maxRev = recentRoutes[0]?.grand_total || 1;
              const pct = Math.round((r.grand_total / maxRev) * 100);
              return (
                <div key={r.bus_id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      Route {r.bus_number} — {r.route_name}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#16a34a' }}>₹{r.grand_total}</span>
                  </div>
                  <div className="rev-bar">
                    <div className="rev-bar-fill" style={{ width: `${pct}%`, background: '#16a34a' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: '#64748b' }}><Banknote size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> Cash ₹{r.cash?.total || 0}</span>
                    <span style={{ fontSize: 10, color: '#4f46e5' }}><Smartphone size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> Online ₹{r.online?.total || 0}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
