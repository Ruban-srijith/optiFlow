import React, { useState } from 'react';
import { ShieldAlert, X, AlertTriangle, Zap } from 'lucide-react';
import { createEmergencyRequest } from '../services/api';

export default function EmergencyRequestModal({ hospitals, onClose, onRequestCreated }) {
  const [patientName, setPatientName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [emergencyType, setEmergencyType] = useState('cardiac');
  const [priority, setPriority] = useState('critical');
  const [pickupLocation, setPickupLocation] = useState('Gandhipuram Sector 2');
  const [selectedHospital, setSelectedHospital] = useState(hospitals[0]?.name || 'KMCH Hospital');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientName || !contactPhone || !pickupLocation) {
      setError('Please fill in patient name, phone, and pickup location.');
      return;
    }

    setSubmitting(true);
    setError('');

    const targetHosp = hospitals.find((h) => h.name === selectedHospital) || {
      name: selectedHospital,
      location: { coordinates: [77.0425, 11.0345] },
    };

    try {
      const res = await createEmergencyRequest({
        patient_name: patientName,
        contact_phone: contactPhone,
        emergency_type: emergencyType,
        priority: priority,
        pickup_location: {
          name: pickupLocation,
          coordinates: [76.9629, 11.0168],
        },
        destination_hospital: {
          name: targetHosp.name,
          coordinates: targetHosp.location?.coordinates || [77.0425, 11.0345],
        },
        notes: notes,
      });

      if (onRequestCreated) onRequestCreated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to trigger emergency dispatch call');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          maxWidth: 520,
          width: '100%',
          padding: 24,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '2px solid #ef4444',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center' }}><ShieldAlert size={28} color="#dc2626" /></span>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#dc2626', margin: 0 }}>
                Emergency Ambulance Hotline Dispatch
              </h2>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                Instant Green Corridor & 108 Emergency Response
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#f1f5f9',
              border: 'none',
              borderRadius: 99,
              width: 32,
              height: 32,
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: 13,
              padding: '10px 14px',
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
              Patient Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Anand Sharma"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 14,
              }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                Contact Number *
              </label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 14,
                }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                Emergency Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 14,
                  fontWeight: 600,
                  color: priority === 'critical' ? '#dc2626' : '#2563eb',
                }}
              >
                <option value="critical">Critical (Green Corridor Active)</option>
                <option value="high">High Priority</option>
                <option value="moderate">Moderate Priority</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                Emergency Category
              </label>
              <select
                value={emergencyType}
                onChange={(e) => setEmergencyType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 14,
                }}
              >
                <option value="cardiac">Cardiac Emergency</option>
                <option value="trauma">Road Accident / Trauma</option>
                <option value="stroke">Acute Stroke</option>
                <option value="organ_transport">Organ Transport</option>
                <option value="maternity">Maternity Care</option>
                <option value="other">Other Emergency</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                Destination Hospital
              </label>
              <select
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 14,
                }}
              >
                {hospitals.map((h) => (
                  <option key={h.hospital_id || h.name} value={h.name}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
              Patient Pickup Location / Address *
            </label>
            <input
              type="text"
              placeholder="Address / Landmark in Coimbatore"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 14,
              }}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
              Medical Notes / Symptoms
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Conscious, severe breathing difficulty, requires oxygen."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                resize: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: 8,
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              padding: '12px 18px',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
            }}
          >
            {submitting ? 'Dispatching Ambulance...' : <><Zap size={18} /> DISPATCH EMERGENCY AMBULANCE</>}
          </button>
        </form>
      </div>
    </div>
  );
}
