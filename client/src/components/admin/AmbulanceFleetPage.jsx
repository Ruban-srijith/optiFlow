import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AmbulanceFleetPage() {
  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get('/api/ambulances')
      .then((res) => setAmbulances(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>
            <Ambulance size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> Emergency Ambulance Fleet Management
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
            Monitor and manage emergency ambulance status, assigned hospitals, and ALS/ICU equipment.
          </p>
        </div>
      </div>

      {loading ? (
        <div>Loading fleet data...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {ambulances.map((amb) => (
            <div
              key={amb.ambulance_id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 18,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontWeight: 800, fontSize: 16, color: '#dc2626' }}>
                  <Ambulance size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> {amb.vehicle_number}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 99,
                    background: amb.status === 'available' ? '#f0fdf4' : '#fef2f2',
                    color: amb.status === 'available' ? '#16a34a' : '#dc2626',
                    border: `1px solid ${amb.status === 'available' ? '#bbf7d0' : '#fecaca'}`,
                    textTransform: 'uppercase',
                  }}
                >
                  {amb.status}
                </span>
              </div>

              <div style={{ fontSize: 13, color: '#334155', marginBottom: 6 }}>
                <strong>Hospital:</strong> {amb.hospital_name}
              </div>
              <div style={{ fontSize: 13, color: '#334155', marginBottom: 6 }}>
                <strong>Driver:</strong> {amb.driver_name} ({amb.driver_phone})
              </div>
              <div style={{ fontSize: 13, color: '#334155', marginBottom: 10 }}>
                <strong>Unit Type:</strong> {amb.type} | ⚡ Battery: {amb.battery_level}%
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {amb.equipment?.map((eq, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 10,
                      background: '#f1f5f9',
                      padding: '2px 8px',
                      borderRadius: 4,
                      color: '#475569',
                    }}
                  >
                    ✓ {eq}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
