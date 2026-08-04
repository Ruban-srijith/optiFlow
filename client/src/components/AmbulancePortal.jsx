import React, { useState, useEffect } from 'react';
import { ShieldAlert, Zap, MapPin, Hospital, Check, Ambulance, Bed, Circle } from 'lucide-react';
import AmbulanceCard from './AmbulanceCard';
import EmergencyRequestModal from './EmergencyRequestModal';
import { fetchAmbulances, fetchHospitals, fetchEmergencyRequests, updateEmergencyStatus } from '../services/api';

export default function AmbulancePortal({
  selectedAmbulance,
  onSelectAmbulance,
  socketUpdates,
  passengerUser,
}) {
  const [ambulances, setAmbulances] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ambRes, hospRes, reqRes] = await Promise.all([
        fetchAmbulances(),
        fetchHospitals(),
        fetchEmergencyRequests(),
      ]);
      setAmbulances(ambRes.data);
      setHospitals(hospRes.data);
      if (reqRes.data && reqRes.data.length > 0) {
        // Pick the latest non-completed request or first
        const active = reqRes.data.find((r) => ['requested', 'dispatched', 'en_route'].includes(r.status)) || reqRes.data[0];
        setActiveEmergency(active);
      }
    } catch (err) {
      console.error('Failed to load ambulance portal data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleGreenCorridor = async () => {
    if (!activeEmergency) return;
    const newStatus = !activeEmergency.green_corridor_active;
    try {
      const res = await updateEmergencyStatus(activeEmergency.request_id, {
        green_corridor_active: newStatus,
      });
      setActiveEmergency(res.data);
    } catch (err) {
      console.error('Failed to toggle green corridor', err);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc', padding: 16, overflowY: 'auto' }}>
      {/* ── EMERGENCY HOTLINE BANNER ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
          color: '#ffffff',
          borderRadius: 14,
          padding: '16px 20px',
          marginBottom: 16,
          boxShadow: '0 8px 20px rgba(220, 38, 38, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'flex', animation: 'pulse 1.5s infinite' }}><ShieldAlert size={24} /></span>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Coimbatore 108 Emergency Dispatch
            </h2>
          </div>
          <p style={{ fontSize: 12, opacity: 0.9, margin: '4px 0 0 0' }}>
            Priority Green Corridor & Real-Time Ambulance Network
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          style={{
            background: '#ffffff',
            color: '#dc2626',
            border: 'none',
            padding: '10px 18px',
            borderRadius: 99,
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Zap size={16} /> REQUEST AMBULANCE NOW
        </button>
      </div>

      {/* ── ACTIVE EMERGENCY MONITOR ── */}
      {activeEmergency && (
        <div
          style={{
            background: '#ffffff',
            border: '1.5px solid #fecaca',
            borderRadius: 14,
            padding: 20,
            marginBottom: 16,
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.08)',
          }}
        >
          {/* Header Row: ID and Status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fef2f2', border: '1px solid #fecaca', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 800, color: '#dc2626', width: 'fit-content' }}>
                <Flame size={14} /> ID: {activeEmergency.request_id}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <strong style={{ fontSize: 16, color: '#0f172a', lineHeight: 1.2 }}>{activeEmergency.patient_name}</strong>
                <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                  {activeEmergency.emergency_type}
                </span>
              </div>
            </div>

            <button
              onClick={handleToggleGreenCorridor}
              style={{
                background: activeEmergency.green_corridor_active ? '#16a34a' : '#f1f5f9',
                color: activeEmergency.green_corridor_active ? '#ffffff' : '#475569',
                border: 'none',
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: activeEmergency.green_corridor_active ? '0 2px 8px rgba(22,163,74,0.4)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <TrafficCone size={14} /> Green Corridor: {activeEmergency.green_corridor_active ? 'ACTIVE' : 'OFF'}
            </button>
          </div>

          {/* Location details */}
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: '#334155', fontSize: 13 }}>
              <MapPin size={16} color="#ef4444" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <strong style={{ display: 'block', color: '#64748b', fontSize: 11, textTransform: 'uppercase', marginBottom: 2 }}>Pickup Location</strong>
                {activeEmergency.pickup_location?.name || activeEmergency.pickup_location?.address}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: '#334155', fontSize: 13 }}>
              <Hospital size={16} color="#3b82f6" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <strong style={{ display: 'block', color: '#64748b', fontSize: 11, textTransform: 'uppercase', marginBottom: 2 }}>Destination Hospital</strong>
                {activeEmergency.destination_hospital?.name || activeEmergency.destination_hospital}
              </div>
            </div>
          </div>

          {/* Step Tracker */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 10, fontWeight: 700, textAlign: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: ['requested', 'dispatched', 'en_route', 'arrived'].includes(activeEmergency.status) ? '#dc2626' : '#cbd5e1' }}>
              <div style={{ background: ['requested', 'dispatched', 'en_route', 'arrived'].includes(activeEmergency.status) ? '#fef2f2' : '#f8fafc', padding: 6, borderRadius: '50%' }}>
                <ShieldAlert size={16} />
              </div>
              <span>Call Rx'd</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: ['dispatched', 'en_route', 'arrived'].includes(activeEmergency.status) ? '#dc2626' : '#cbd5e1' }}>
              <div style={{ background: ['dispatched', 'en_route', 'arrived'].includes(activeEmergency.status) ? '#fef2f2' : '#f8fafc', padding: 6, borderRadius: '50%' }}>
                <Ambulance size={16} />
              </div>
              <span>Dispatched</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: ['en_route', 'arrived'].includes(activeEmergency.status) ? '#dc2626' : '#cbd5e1' }}>
              <div style={{ background: ['en_route', 'arrived'].includes(activeEmergency.status) ? '#fef2f2' : '#f8fafc', padding: 6, borderRadius: '50%' }}>
                <Zap size={16} />
              </div>
              <span>En-Route</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: activeEmergency.status === 'arrived' ? '#dc2626' : '#cbd5e1' }}>
              <div style={{ background: activeEmergency.status === 'arrived' ? '#fef2f2' : '#f8fafc', padding: 6, borderRadius: '50%' }}>
                <Hospital size={16} />
              </div>
              <span>Arrived</span>
            </div>
          </div>
        </div>
      )}

      {/* ── HOSPITALS STATUS ── */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#334155', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Hospital size={16} /> Emergency Trauma Centers ({hospitals.length})
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          {hospitals.map((h) => (
            <div
              key={h.hospital_id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: 12,
                fontSize: 12,
              }}
            >
              <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{h.name}</div>
              <div style={{ color: '#64748b', fontSize: 11, marginBottom: 6 }}>{h.trauma_center_level}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 600 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Bed size={12} /> ICU Beds: {h.icu_beds_available} free</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Ambulance size={12} /> Stationed: {h.ambulances_stationed}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── AMBULANCES LIST ── */}
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#334155', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Ambulance size={16} /> Active Emergency Fleet ({ambulances.length})
        </h3>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>Loading ambulances...</div>
        ) : (
          ambulances.map((amb) => (
            <AmbulanceCard
              key={amb.ambulance_id}
              ambulance={amb}
              isSelected={selectedAmbulance?.ambulance_id === amb.ambulance_id}
              onSelect={onSelectAmbulance}
            />
          ))
        )}
      </div>

      {/* Modal dialog for emergency request */}
      {showModal && (
        <EmergencyRequestModal
          hospitals={hospitals}
          passengerUser={passengerUser}
          onClose={() => setShowModal(false)}
          onRequestCreated={(req) => {
            setActiveEmergency(req);
            loadData();
          }}
        />
      )}
    </div>
  );
}
