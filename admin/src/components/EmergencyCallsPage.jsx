import React, { useState, useEffect } from 'react';
import { Activity, AlertCircle, AlertTriangle, Ambulance, ArrowRight, Banknote, BarChart, Bus, CheckCircle, CheckCircle2, ChevronDown, ChevronUp, Circle, Clock, Coins, Compass, CreditCard, DollarSign, Edit, Edit2, Edit3, Flame, Hospital, LogOut, Map, MapPin, Navigation, Phone, PhoneCall, Play, Plus, PlusCircle, Radio, RefreshCw, RotateCcw, Search, ShieldAlert, Siren, Smartphone, StopCircle, Ticket, TrafficCone, Trash2, TrendingUp, User, Users, UserSquare2, X, XCircle } from 'lucide-react';
import axios from 'axios';

export default function EmergencyCallsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCalls = () => {
    setLoading(true);
    axios
      .get('/api/ambulances/requests')
      .then((res) => setRequests(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  const handleToggleCorridor = (reqId, currentStatus) => {
    axios
      .patch(`/api/ambulances/request/${reqId}/status`, {
        green_corridor_active: !currentStatus,
      })
      .then(() => fetchCalls())
      .catch((err) => console.error(err));
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#dc2626', margin: 0 }}>
            <Siren size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> Emergency Hotline & Dispatch Calls
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
            Live emergency hotline calls, priority dispatch tracking, and Green Corridor overrides.
          </p>
        </div>
      </div>

      {loading ? (
        <div>Loading emergency calls...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {requests.map((req) => (
            <div
              key={req.request_id}
              style={{
                background: '#ffffff',
                border: '1.5px solid #fecaca',
                borderRadius: 12,
                padding: 18,
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span
                    style={{
                      background: '#fef2f2',
                      color: '#dc2626',
                      fontWeight: 800,
                      fontSize: 12,
                      padding: '2px 8px',
                      borderRadius: 6,
                    }}
                  >
                    {req.request_id}
                  </span>
                  <strong style={{ fontSize: 16, color: '#0f172a' }}>{req.patient_name}</strong>
                  <span style={{ fontSize: 12, color: '#64748b' }}>({req.contact_phone})</span>
                </div>
                <div style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>
                  <MapPin size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> Pickup: <strong>{req.pickup_location?.name}</strong> → <Hospital size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> Destination:{' '}
                  <strong>{req.destination_hospital?.name}</strong>
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Category: <span style={{ fontWeight: 600, color: '#1e293b' }}>{req.emergency_type}</span> |
                  Assigned Unit:{' '}
                  <span style={{ fontWeight: 700, color: '#dc2626' }}>
                    {req.assigned_ambulance_id || 'Awaiting Unit'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={() => handleToggleCorridor(req.request_id, req.green_corridor_active)}
                  style={{
                    background: req.green_corridor_active ? '#16a34a' : '#f1f5f9',
                    color: req.green_corridor_active ? '#ffffff' : '#475569',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 99,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🟢 Green Corridor: {req.green_corridor_active ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
