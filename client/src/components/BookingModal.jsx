import React, { useState } from 'react';
import { createBooking } from '../services/api';
import { Ticket, Users, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function BookingModal({ bus, originStop, destinationStop, onClose, onBookingSuccess }) {
  const [seats, setSeats] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);

  const handleBook = async () => {
    if (!originStop || !destinationStop) {
      setError('Origin/destination stop information missing');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await createBooking({
        bus_id: bus.bus_id,
        origin_stop_id: originStop.stop_id,
        origin_stop_name: originStop.stop_name,
        destination_stop_id: destinationStop.stop_id,
        destination_stop_name: destinationStop.stop_name,
        seat_count: seats,
      });

      setSuccessData(res.data);
      if (onBookingSuccess) onBookingSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 300, padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400,
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
            padding: '16px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            color: '#fff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ticket size={20} />
            <span style={{ fontWeight: 800, fontSize: 16 }}>Reserve Seat</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%',
              width: 28, height: 28, color: '#fff', cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {!successData ? (
            <>
              {/* Journey summary */}
              <div
                style={{
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: 10, padding: '12px 14px', marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginBottom: 4 }}>
                  JOURNEY
                </div>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#1e293b' }}>
                  {originStop?.stop_name} → {destinationStop?.stop_name}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  Bus {bus.bus_number} · Route {bus.route_name}
                </div>
              </div>

              {/* Seats selector */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                  NUMBER OF SEATS
                </label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #cbd5e1', borderRadius: 8, overflow: 'hidden' }}>
                  <button
                    onClick={() => setSeats((s) => Math.max(1, s - 1))}
                    style={{ width: 40, height: 40, background: '#f8fafc', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, borderRight: '1px solid #cbd5e1', color: '#15803d' }}
                  >
                    −
                  </button>
                  <span style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                    {seats}
                  </span>
                  <button
                    onClick={() => setSeats((s) => Math.min(6, s + 1))}
                    style={{ width: 40, height: 40, background: '#f8fafc', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, borderLeft: '1px solid #cbd5e1', color: '#15803d' }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Fare calculation */}
              <div
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: '#f8fafc', borderRadius: 10, padding: '12px 14px',
                  border: '1px solid #e2e8f0', marginBottom: 20,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Estimated Fare</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>₹{bus.fare} per seat</div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#15803d' }}>
                  ₹{bus.fare * seats}
                </div>
              </div>

              {error && (
                <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '10px', borderRadius: 8, fontSize: 12, display: 'flex', gap: 6, alignItems: 'center', marginBottom: 16 }}>
                  <ShieldAlert size={14} /> {error}
                </div>
              )}

              <button
                className="btn-primary"
                onClick={handleBook}
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '12px 16px', fontSize: 14 }}
              >
                {loading ? <span className="spinner" /> : null}
                {loading ? 'Reserving...' : 'Reserve Seat'}
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <CheckCircle2 size={48} color="#16a34a" />
              </div>
              <h3 style={{ fontWeight: 800, fontSize: 16, color: '#15803d', margin: '0 0 4px 0' }}>
                Reservation Successful!
              </h3>
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 16px 0' }}>
                Your booking ID is <strong style={{ color: '#0f172a' }}>{successData.booking_id}</strong>. You can view or cancel it in the bookings panel.
              </p>
              <button
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={onClose}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
