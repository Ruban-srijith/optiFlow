import React, { useState, useEffect } from 'react';
import { ShieldAlert, Zap, MapPin, Hospital, Check, Ambulance, Bed, Circle } from 'lucide-react';
import AmbulanceCard from './AmbulanceCard';
import EmergencyRequestModal from './EmergencyRequestModal';
import { fetchAmbulances, fetchHospitals, fetchEmergencyRequests, updateEmergencyStatus } from '../services/api';

export default function AmbulancePortal({
  selectedAmbulance,
  onSelectAmbulance,
  socketUpdates,
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
          background: 'linear-[#991b1b], linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
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
            padding: 16,
            marginBottom: 16,
            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, color: '#dc2626' }}>
                ID: {activeEmergency.request_id}
              </span>
              <strong style={{ fontSize: 14, color: '#0f172a' }}>{activeEmergency.patient_name}</strong>
              <span style={{ fontSize: 12, color: '#64748b' }}>({activeEmergency.emergency_type})</span>
            </div>

            <button
              onClick={handleToggleGreenCorridor}
              style={{
                background: activeEmergency.green_corridor_active ? '#16a34a' : '#f1f5f9',
                color: activeEmergency.green_corridor_active ? '#ffffff' : '#475569',
                border: 'none',
                padding: '4px 12px',
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Circle size={12} color={activeEmergency.green_corridor_active ? '#ffffff' : '#16a34a'} fill="currentColor" /> Green Corridor: {activeEmergency.green_corridor_active ? 'ACTIVE' : 'OFF'}
            </button>
          </div>

          <div style={{ fontSize: 13, color: '#334155', marginBottom: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={14} /> <span><strong>Pickup:</strong> {activeEmergency.pickup_location?.name}</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Hospital size={14} /> <span><strong>Hospital:</strong> {activeEmergency.destination_hospital?.name}</span></div>
          </div>

          {/* Step Tracker */}
          <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', padding: '10px 14px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: ['requested', 'dispatched', 'en_route', 'arrived'].includes(activeEmergency.status) ? '#dc2626' : '#94a3b8' }}>
              1. Call Received <Check size={12} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: ['dispatched', 'en_route', 'arrived'].includes(activeEmergency.status) ? '#dc2626' : '#94a3b8' }}>
              2. Unit Dispatched <Check size={12} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: ['en_route', 'arrived'].includes(activeEmergency.status) ? '#dc2626' : '#94a3b8' }}>
              3. En-Route <Ambulance size={12} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: activeEmergency.status === 'arrived' ? '#dc2626' : '#94a3b8' }}>
              4. Hospital Arrival <Hospital size={12} />
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
