import React, { useState, useEffect } from 'react';
import { getBookings, deleteBooking, patchBooking } from '../../services/api';
import { Ticket, Calendar, Trash2, Edit3, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editingBooking, setEditingBooking] = useState(null);
  const [newSeatCount, setNewSeatCount] = useState(1);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingBooking, setCancellingBooking] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await getBookings(params);
      setBookings(res.data.bookings || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancellingBooking) return;
    try {
      await deleteBooking(cancellingBooking, reason || 'Cancelled by admin');
      setCancellingBooking(null);
      setCancelReason('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel booking');
    }
  };

  const handleModifySubmit = async (bookingId) => {
    try {
      await patchBooking(bookingId, { seat_count: newSeatCount });
      setEditingBooking(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to modify booking');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'booked': return 'badge badge-green';
      case 'cancelled': return 'badge badge-red';
      case 'completed': return 'badge badge-blue';
      default: return 'badge';
    }
  };

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Filter by Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
            style={{ width: 160, padding: '8px 12px' }}
          >
            <option value="">All Bookings</option>
            <option value="booked">Booked</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        
        <button
          onClick={loadData}
          className="btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="card" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: 14, marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          Loading bookings database...
        </div>
      ) : bookings.length === 0 ? (
        <div className="card" style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
          <Ticket size={48} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
          <h3>No Bookings Found</h3>
          <p style={{ fontSize: 13, marginTop: 4 }}>There are no bookings matching the current filters.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {bookings.map((booking) => {
            const isBooked = booking.status === 'booked';
            const isEditing = editingBooking === booking.booking_id;
            const isCancelling = cancellingBooking === booking.booking_id;

            return (
              <div key={booking.booking_id} className="card" style={{ padding: 18, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                      Booking ID
                    </span>
                    <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: 1 }}>
                      {booking.booking_id}
                    </h3>
                  </div>
                  <span className={getStatusBadgeClass(booking.status)}>{booking.status}</span>
                </div>

                {/* Commuter Detail */}
                <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, fontSize: 12 }}>
                  <div style={{ fontWeight: 700, color: '#1e293b' }}>{booking.user_name || 'Passenger'}</div>
                  <div style={{ color: '#64748b', marginTop: 2 }}>Phone: {booking.user_phone || 'None'}</div>
                </div>

                {/* Route detail */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                    Bus {booking.bus_number} <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>({booking.route_name})</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>
                    {booking.origin_stop_name} → {booking.destination_stop_name}
                  </div>
                </div>

                {/* Seat and Fare info */}
                <div style={{ display: 'flex', gap: 16, fontSize: 12, borderTop: '1px solid #f1f5f9', paddingTop: 10, marginTop: 4 }}>
                  <div>
                    Seats booked: <strong style={{ color: '#0f172a' }}>{booking.seat_count}</strong>
                  </div>
                  <div>
                    Revenue collected: <strong style={{ color: '#16a34a' }}>₹{booking.fare}</strong>
                  </div>
                </div>

                {/* Inline Editing */}
                {isEditing && (
                  <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', padding: 12, borderRadius: 8, marginTop: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                      Change Seats Count:
                    </label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="number"
                        min={1}
                        max={6}
                        value={newSeatCount}
                        onChange={(e) => setNewSeatCount(Number(e.target.value))}
                        className="input-field"
                        style={{ width: 60, padding: 6, textAlign: 'center' }}
                      />
                      <button onClick={() => handleModifySubmit(booking.booking_id)} className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>
                        Save
                      </button>
                      <button onClick={() => setEditingBooking(null)} className="btn-outline" style={{ padding: '6px 12px', fontSize: 12 }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline Cancellation Form */}
                {isCancelling && (
                  <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', padding: 12, borderRadius: 8, marginTop: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#991b1b', display: 'block', marginBottom: 6 }}>
                      Cancellation Reason:
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <input
                        type="text"
                        placeholder="e.g. Bus breakdown, User request"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="input-field"
                        style={{ padding: 6, fontSize: 12 }}
                      />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={async () => {
                            try {
                              await deleteBooking(booking.booking_id, cancelReason || 'Cancelled by administrator');
                              setCancellingBooking(null);
                              setCancelReason('');
                              loadData();
                            } catch (err) {
                              alert('Failed to cancel: ' + err.message);
                            }
                          }}
                          className="btn-danger"
                          style={{ padding: '6px 12px', fontSize: 12, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                        >
                          Confirm Cancel
                        </button>
                        <button onClick={() => setCancellingBooking(null)} className="btn-outline" style={{ padding: '6px 12px', fontSize: 12 }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {isBooked && !isEditing && !isCancelling && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 10, marginTop: 'auto' }}>
                    <button
                      onClick={() => {
                        setEditingBooking(booking.booking_id);
                        setNewSeatCount(booking.seat_count);
                      }}
                      className="btn-outline"
                      style={{ padding: '6px 12px', display: 'inline-flex', gap: 4, alignItems: 'center', fontSize: 11 }}
                    >
                      <Edit3 size={12} /> Modify Seats
                    </button>
                    <button
                      onClick={() => setCancellingBooking(booking.booking_id)}
                      className="btn-outline"
                      style={{ padding: '6px 12px', display: 'inline-flex', gap: 4, alignItems: 'center', fontSize: 11, borderColor: '#fca5a5', color: '#ef4444' }}
                    >
                      <XCircle size={12} /> Cancel Ticket
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
