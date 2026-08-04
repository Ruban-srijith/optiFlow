import React, { useState, useEffect } from 'react';
import { ShieldAlert, X, AlertTriangle, Zap, MapPin, Crosshair } from 'lucide-react';
import { createEmergencyRequest } from '../services/api';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { renderToString } from 'react-dom/server';

const createCustomIcon = (color) => {
  const iconHtml = renderToString(<MapPin size={28} color={color} fill="white" />);
  return L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">${iconHtml}</div>`,
    className: 'custom-leaflet-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
};
const pinIcon = createCustomIcon('#dc2626');

function LocationPickerMap({ coords, onCoordsChange }) {
  useMapEvents({
    click(e) {
      onCoordsChange([e.latlng.lng, e.latlng.lat]);
    }
  });
  const map = useMap();
  useEffect(() => {
    if (coords) map.setView([coords[1], coords[0]], map.getZoom());
  }, [coords, map]);
  return coords ? <Marker position={[coords[1], coords[0]]} icon={pinIcon} /> : null;
}

export default function EmergencyRequestModal({ hospitals, onClose, onRequestCreated, passengerUser }) {
  const [patientName, setPatientName] = useState(passengerUser?.full_name || '');
  const [contactPhone, setContactPhone] = useState(passengerUser?.phone_number || '');
  const [emergencyType, setEmergencyType] = useState('');
  const [priority, setPriority] = useState('');
  const [pickupType, setPickupType] = useState('current'); // 'current' | 'map'
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null); // [lng, lat]
  const [locating, setLocating] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch current location on mount if 'current'
  useEffect(() => {
    if (pickupType === 'current') {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPickupCoords([pos.coords.longitude, pos.coords.latitude]);
          if (!pickupAddress) setPickupAddress('Current GPS Location');
          setLocating(false);
        },
        (err) => {
          console.error(err);
          setLocating(false);
          setPickupType('map'); // fallback
          setPickupCoords([76.9629, 11.0168]); // Coimbatore default
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [pickupType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientName || !contactPhone || !pickupCoords) {
      setError('Please fill in patient name, phone, and ensure a pickup location is selected.');
      return;
    }

    setSubmitting(true);
    setError('');

    const targetHosp = hospitals.find((h) => h.name === selectedHospital) || {
      name: selectedHospital || 'Nearest Available Hospital',
      location: { coordinates: [77.0425, 11.0345] },
    };

    try {
      const res = await createEmergencyRequest({
        patient_name: patientName,
        contact_phone: contactPhone,
        emergency_type: emergencyType || 'other',
        priority: priority || 'high',
        pickup_location: {
          name: pickupAddress || 'Selected Map Location',
          coordinates: pickupCoords,
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
          maxWidth: 600,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
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
                  color: priority === 'critical' ? '#dc2626' : (priority === '' ? '#64748b' : '#2563eb'),
                }}
              >
                <option value="">-- Let Operator Decide --</option>
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
                  color: emergencyType === '' ? '#64748b' : '#0f172a',
                }}
              >
                <option value="">-- Not Sure --</option>
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
                  color: selectedHospital === '' ? '#64748b' : '#0f172a',
                }}
              >
                <option value="">-- Nearest Available --</option>
                {hospitals.map((h) => (
                  <option key={h.hospital_id || h.name} value={h.name}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block' }}>
              Patient Pickup Location *
            </label>
            
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setPickupType('current')}
                style={{
                  flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  border: pickupType === 'current' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: pickupType === 'current' ? '#eff6ff' : '#fff',
                  color: pickupType === 'current' ? '#1d4ed8' : '#475569',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}
              >
                <Crosshair size={16} /> Use Current GPS
              </button>
              <button
                type="button"
                onClick={() => { setPickupType('map'); if (!pickupCoords) setPickupCoords([76.9629, 11.0168]); }}
                style={{
                  flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  border: pickupType === 'map' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: pickupType === 'map' ? '#eff6ff' : '#fff',
                  color: pickupType === 'map' ? '#1d4ed8' : '#475569',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}
              >
                <MapPin size={16} /> Choose on Map
              </button>
            </div>

            {pickupType === 'current' ? (
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#334155' }}>
                {locating ? 'Fetching GPS location...' : (
                  pickupCoords ? `<MapPin size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> Location Found: [${pickupCoords[1].toFixed(4)}, ${pickupCoords[0].toFixed(4)}]` : 'GPS Failed. Please use Map.'
                )}
              </div>
            ) : (
              <div style={{ height: 200, width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                <MapContainer center={pickupCoords ? [pickupCoords[1], pickupCoords[0]] : [11.0168, 76.9558]} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                  <LocationPickerMap coords={pickupCoords} onCoordsChange={setPickupCoords} />
                </MapContainer>
              </div>
            )}

            <input
              type="text"
              placeholder="Landmark / Address Details (Optional)"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 14,
              }}
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
