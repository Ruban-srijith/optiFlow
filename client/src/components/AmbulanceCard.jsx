import React from 'react';

export default function AmbulanceCard({ ambulance, onSelect, isSelected }) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'available':
        return { label: 'Available', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
      case 'en_route':
        return { label: 'En-Route', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
      case 'on_scene':
        return { label: 'On Scene', color: '#ea580c', bg: '#fff7ed', border: '#ffedd5' };
      case 'transporting':
        return { label: 'Transporting', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };
      default:
        return { label: status, color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' };
    }
  };

  const badge = getStatusBadge(ambulance.status);

  return (
    <div
      onClick={() => onSelect && onSelect(ambulance)}
      style={{
        background: '#ffffff',
        border: isSelected ? '2px solid #dc2626' : '1px solid #e2e8f0',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        cursor: 'pointer',
        boxShadow: isSelected ? '0 4px 16px rgba(220, 38, 38, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 24 }}>🚑</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
              {ambulance.vehicle_number}
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{ambulance.hospital_name}</div>
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: badge.color,
            background: badge.bg,
            border: `1px solid ${badge.border}`,
            padding: '3px 10px',
            borderRadius: 99,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {badge.label}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12, fontSize: 12, color: '#475569' }}>
        <div>
          <span style={{ color: '#94a3b8' }}>Driver:</span>{' '}
          <strong style={{ color: '#1e293b' }}>{ambulance.driver_name}</strong>
        </div>
        <div>
          <span style={{ color: '#94a3b8' }}>Contact:</span>{' '}
          <a href={`tel:${ambulance.driver_phone}`} style={{ color: '#dc2626', fontWeight: 600, textDecoration: 'none' }}>
            {ambulance.driver_phone}
          </a>
        </div>
        <div>
          <span style={{ color: '#94a3b8' }}>Unit Type:</span>{' '}
          <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
            {ambulance.type || 'ALS'}
          </span>
        </div>
        <div>
          <span style={{ color: '#94a3b8' }}>Battery:</span> ⚡ {ambulance.battery_level || 98}%
        </div>
      </div>

      {ambulance.equipment && ambulance.equipment.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {ambulance.equipment.map((eq, i) => (
            <span
              key={i}
              style={{
                fontSize: 10,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 4,
                padding: '2px 6px',
                color: '#64748b',
              }}
            >
              ✓ {eq}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
