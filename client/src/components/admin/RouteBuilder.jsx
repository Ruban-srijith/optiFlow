import React, { useState, useEffect } from 'react';
import { Activity, AlertCircle, AlertTriangle, Ambulance, ArrowRight, Banknote, BarChart, Bus, CheckCircle, CheckCircle2, ChevronDown, ChevronUp, Circle, Clock, Coins, Compass, CreditCard, DollarSign, Edit, Edit2, Edit3, Flame, Hospital, LogOut, Map, MapPin, Navigation, Phone, PhoneCall, Play, Plus, PlusCircle, Radio, RefreshCw, RotateCcw, Search, ShieldAlert, Siren, Smartphone, StopCircle, Ticket, TrafficCone, Trash2, TrendingUp, User, Users, UserSquare2, X, XCircle } from 'lucide-react';
import { getStops } from '../../services/api';


function dist(c1, c2) {
  const dx = c1[0] - c2[0], dy = c1[1] - c2[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Given start and end stop_ids, find all stops that lie "between" them
 * along the straight-line path, ordered by proximity to start.
 */
function getMiddleStops(allStops, startId, endId) {
  const getCoord = (id) => allStops.find(s => s.stop_id === id)?.location?.coordinates;
  const start = getCoord(startId);
  const end = getCoord(endId);
  if (!start || !end) return [];

  const totalDist = dist(start, end);

  return allStops
    .filter((s) => s.stop_id !== startId && s.stop_id !== endId)
    .filter((s) => {
      const c = s.location?.coordinates;
      if (!c) return false;
      const d1 = dist(start, c);
      const d2 = dist(end, c);
      return d1 < totalDist && d2 < totalDist;
    })
    .sort((a, b) => {
      const ca = a.location?.coordinates;
      const cb = b.location?.coordinates;
      return dist(start, ca) - dist(start, cb);
    });
}

/**
 * RouteBuilder — lets admin select start + end, auto-suggests middle stops,
 * and returns a final ordered list of stop_ids.
 */
export default function RouteBuilder({ stops, value, onChange }) {
  const [startId, setStartId] = useState('');
  const [endId, setEndId] = useState('');
  const [selectedMiddle, setSelectedMiddle] = useState([]);
  const [suggestedMiddle, setSuggestedMiddle] = useState([]);

  // When start/end changes, auto-suggest middle stops
  useEffect(() => {
    if (!startId || !endId || startId === endId) {
      setSuggestedMiddle([]);
      return;
    }
    const middle = getMiddleStops(stops, Number(startId), Number(endId));
    setSuggestedMiddle(middle);
    setSelectedMiddle(middle); // auto-select all
  }, [startId, endId, stops]);

  // Propagate changes upward
  useEffect(() => {
    if (!startId || !endId) return;
    const ordered = [
      { stop_id: Number(startId), sequence: 0 },
      ...selectedMiddle.map((s, i) => ({ stop_id: s.stop_id, sequence: i + 1 })),
      { stop_id: Number(endId), sequence: selectedMiddle.length + 1 },
    ];
    onChange(ordered);
  }, [startId, endId, selectedMiddle]);

  const stopName = (id) => stops.find((s) => s.stop_id === Number(id))?.stop_name || id;

  const toggleMiddle = (stop) => {
    const getCoord = (id) => stops.find(s => s.stop_id === Number(id))?.location?.coordinates;
    const startCoord = getCoord(startId);
    setSelectedMiddle((prev) =>
      prev.find((s) => s.stop_id === stop.stop_id)
        ? prev.filter((s) => s.stop_id !== stop.stop_id)
        : [...prev, stop].sort((a, b) => {
            const ca = a.location?.coordinates;
            const cb = b.location?.coordinates;
            if (!startCoord || !ca || !cb) return 0;
            return dist(startCoord, ca) - dist(startCoord, cb);
          })
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Start Stop</label>
          <select
            className="form-select"
            value={startId}
            onChange={(e) => { setStartId(e.target.value); setEndId(''); setSelectedMiddle([]); }}
          >
            <option value="">Select start...</option>
            {stops.map((s) => (
              <option key={s.stop_id} value={s.stop_id}>{s.stop_name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">End Stop</label>
          <select
            className="form-select"
            value={endId}
            onChange={(e) => setEndId(e.target.value)}
            disabled={!startId}
          >
            <option value="">Select end...</option>
            {stops.filter((s) => s.stop_id !== Number(startId)).map((s) => (
              <option key={s.stop_id} value={s.stop_id}>{s.stop_name}</option>
            ))}
          </select>
        </div>
      </div>

      {startId && endId && (
        <div>
          <label className="form-label" style={{ display: 'block', marginBottom: 8 }}>
            Middle Stops (auto-suggested — click to toggle)
          </label>
          {suggestedMiddle.length === 0 ? (
            <p style={{ fontSize: 12, color: '#94a3b8' }}>No intermediate stops detected between these two points.</p>
          ) : (
            <div className="stops-list">
              {suggestedMiddle.map((s) => {
                const isSelected = selectedMiddle.find((m) => m.stop_id === s.stop_id);
                return (
                  <button
                    key={s.stop_id}
                    type="button"
                    onClick={() => toggleMiddle(s)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 500,
                      cursor: 'pointer', transition: 'all 0.15s',
                      background: isSelected ? '#f0fdf4' : '#f1f5f9',
                      border: isSelected ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                      color: isSelected ? '#16a34a' : '#64748b',
                    }}
                  >
                    {isSelected ? '✓' : '+'} {s.stop_name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Preview of full route */}
      {startId && endId && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>ROUTE PREVIEW</div>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
            <span className="stop-pill start">{stopName(startId)}</span>
            {selectedMiddle.map((s, i) => (
              <React.Fragment key={s.stop_id}>
                <span style={{ color: '#94a3b8', fontSize: 12 }}>→</span>
                <span className="stop-pill">{s.stop_name}</span>
              </React.Fragment>
            ))}
            <span style={{ color: '#94a3b8', fontSize: 12 }}>→</span>
            <span className="stop-pill end">{stopName(endId)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
