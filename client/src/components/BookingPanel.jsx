import React, { useState, useEffect } from 'react';
import { Ticket, Calendar, Trash2, Edit3, XCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { fetchMyBookings, cancelBooking, modifyBooking } from '../services/api';

export default function BookingPanel({ refreshTrigger, onBookingUpdate }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingBooking, setEditingBooking] = useState(null);
  const [newSeatCount, setNewSeatCount] = useState(1);

  const loadBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchMyBookings();
      setBookings(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [refreshTrigger]);

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await cancelBooking(bookingId, 'Cancelled by user');
      loadBookings();
      if (onBookingUpdate) onBookingUpdate();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel booking');
    }
  };

  const handleModify = async (bookingId) => {
    try {
      await modifyBooking(bookingId, { seat_count: newSeatCount });
      setEditingBooking(null);
      loadBookings();
      if (onBookingUpdate) onBookingUpdate();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to modify booking');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'booked': return { bg: '#e0f2fe', text: '#0369a1', label: 'Booked' };
      case 'cancelled': return { bg: '#fef2f2', text: '#b91c1c', label: 'Cancelled' };
      case 'completed': return { bg: '#f0fdf4', text: '#15803d', label: 'Completed' };
      default: return { bg: '#f1f5f9', text: '#475569', label: status };
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Ticket size={18} color="#15803d" />
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>
          My Seat Bookings
        </h2>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '8px 12px', borderRadius: 8, fontSize: 12, display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {loading && <div style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: '12px 0' }}>Loading your tickets...</div>}

      {!loading && bookings.length === 0 && (
        <div style={{ padding: '24px 16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12, textAlign: 'center', color: '#64748b' }}>
          <p style={{ margin: 0, fontSize: 13 }}>No active seat bookings found.</p>
          <p style={{ margin: '4px 0 0 0', fontSize: 11, color: '#94a3b8' }}>Search buses above to book a seat.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {bookings.map((booking) => {
          const status = getStatusColor(booking.status);
          const isBooked = booking.status === 'booked';
          const isEditing = editingBooking === booking.booking_id;

          return (
            <div
              key={booking.booking_id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 14,
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                position: 'relative',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                  {booking.booking_id}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: status.bg,
                    color: status.text,
                    textTransform: 'uppercase',
                  }}
                >
                  {status.label}
                </span>
              </div>

              {/* Route */}
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>
                Bus {booking.bus_number}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                {booking.origin_stop_name} → {booking.destination_stop_name}
              </div>

              {/* Details */}
              <div style={{ display: 'flex', gap: 16, borderTop: '1px solid #f1f5f9', paddingTop: 8, fontSize: 11, color: '#64748b' }}>
                <div>
                  Seats: <span style={{ fontWeight: 700, color: '#0f172a' }}>{booking.seat_count}</span>
                </div>
                <div>
                  Fare: <span style={{ fontWeight: 700, color: '#15803d' }}>₹{booking.fare}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Calendar size={11} />
                  {new Date(booking.createdAt).toLocaleDateString()}
                </div>
              </div>

              {/* Inline Modify Form */}
              {isEditing && (
                <div style={{ marginTop: 10, background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                    Modify Number of Seats:
                  </label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="number"
                      min={1}
                      max={6}
                      value={newSeatCount}
                      onChange={(e) => setNewSeatCount(Number(e.target.value))}
                      style={{
                        width: 60,
                        padding: '6px 8px',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 700,
                        textAlign: 'center',
                      }}
                    />
                    <button
                      onClick={() => handleModify(booking.booking_id)}
                      style={{
                        background: '#16a34a',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingBooking(null)}
                      style={{
                        background: '#e2e8f0',
                        color: '#475569',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              {isBooked && !isEditing && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                  <button
                    onClick={() => {
                      setEditingBooking(booking.booking_id);
                      setNewSeatCount(booking.seat_count);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0284c7',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Edit3 size={12} /> Modify
                  </button>
                  <button
                    onClick={() => handleCancel(booking.booking_id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Trash2 size={12} /> Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
