import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const COIMBATORE_CENTER = [11.0168, 76.9629];

const STOP_COORDS_LATNG = {
  101: [11.0012, 77.0326], 102: [11.0067, 77.0268],
  103: [11.0157, 76.9958], 104: [11.0152, 76.9706],
  105: [11.0168, 76.9629], 106: [11.0202, 76.9564],
  107: [11.0173, 76.9268], 108: [11.0453, 76.9091],
  201: [11.0385, 76.9977], 202: [11.0317, 76.9817],
  203: [11.0046, 76.9653], 204: [10.9913, 76.9715],
  205: [10.9744, 76.9453], 301: [11.0006, 76.9642],
  302: [11.0279, 76.9496], 303: [11.0624, 76.9481],
};

function decodePolyline(encoded) {
  if (!encoded) return [];
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

function buildFallbackPath(routeStops) {
  return routeStops
    .filter((rs) => STOP_COORDS_LATNG[rs.stop_id])
    .sort((a, b) => a.sequence - b.sequence)
    .map((rs) => STOP_COORDS_LATNG[rs.stop_id]);
}

const createBusIcon = (freeSeats = 10, capacity = 40) => {
  const pct = freeSeats / capacity;
  const color = pct >= 0.4 ? '#16a34a' : pct >= 0.15 ? '#f59e0b' : '#ef4444';
  const html = `
    <div style="width: 44px; height: 44px; position: relative;">
      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36' style="width: 100%; height: 100%;">
        <circle cx='18' cy='18' r='16' fill='white' stroke='${color}' stroke-width='2'/>
        <svg x="10" y="5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
        </svg>
        <text x='18' y='26' font-size='7' font-weight='bold' text-anchor='middle' fill='${color}'>${freeSeats} free</text>
      </svg>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'custom-bus-icon',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
};

const createAmbulanceIcon = (status = 'available') => {
  const isEnRoute = status === 'en_route' || status === 'transporting';
  const color = isEnRoute ? '#dc2626' : '#2563eb';
  const html = `
    <div style="width: 46px; height: 46px; position: relative; display: flex; align-items: center; justify-content: center;">
      <div style="
        position: absolute; width: 44px; height: 44px; borderRadius: 50%;
        background: ${color}; opacity: 0.2; animation: pulse 1.2s infinite;
      "></div>
      <div style="
        width: 36px; height: 36px; borderRadius: 50%; background: #ffffff;
        border: 2px solid ${color}; display: flex; align-items: center; justify-content: center;
        boxShadow: 0 4px 10px rgba(0,0,0,0.2); font-size: 20px;
      ">
        🚑
      </div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'custom-ambulance-icon',
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    popupAnchor: [0, -23],
  });
};

const createHospitalIcon = (name) => {
  const html = `
    <div style="
      width: 34px; height: 34px; borderRadius: 8px; background: #dc2626;
      border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center;
      boxShadow: 0 4px 12px rgba(220,38,38,0.3); font-weight: 800; color: #ffffff; font-size: 16px;
    ">
      🏥
    </div>
  `;
  return L.divIcon({
    html,
    className: 'custom-hospital-icon',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
};

const createMarkerIcon = (label, color) => {
  const html = `
    <div style="position: relative; width: 32px; height: 32px;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="white" stroke-width="1.5"/>
        <text x="12" y="10" font-size="8" fill="white" font-weight="bold" text-anchor="middle" dominant-baseline="middle">${label}</text>
      </svg>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'custom-marker-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      if (map) map.invalidateSize();
    }, 200);

    const handleResize = () => {
      if (map) map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [map]);
  return null;
}

export default function MapView({
  portalMode = 'bus',
  selectedBus,
  busPositions = {},
  allBuses = [],
  busUpdates = {},
  originStop,
  destinationStop,
  ambulances = [],
  hospitals = [],
  activeEmergency,
}) {
  const [activeMarker, setActiveMarker] = useState(null);
  const mapRef = useRef(null);

  // Build polyline path for bus
  let polylinePath = [];
  if (selectedBus) {
    if (selectedBus.polyline) {
      polylinePath = decodePolyline(selectedBus.polyline);
    } else if (selectedBus.route_stops) {
      polylinePath = buildFallbackPath(selectedBus.route_stops);
    }
  }

  // Green Corridor emergency path between Gandhipuram and KMCH Hospital
  const greenCorridorPath = [
    [11.0168, 76.9629], // Gandhipuram
    [11.0264, 77.0084], // Peelamedu
    [11.0345, 77.0425], // KMCH Hospital
  ];

  // Pan map when selection changes
  useEffect(() => {
    if (!mapRef.current) return;
    if (portalMode === 'bus' && selectedBus) {
      const pos = busPositions[selectedBus.bus_id];
      if (pos) mapRef.current.flyTo([pos[1], pos[0]], 15, { animate: true });
    }
  }, [selectedBus, busPositions, portalMode]);

  return (
    <MapContainer
      center={COIMBATORE_CENTER}
      zoom={13}
      style={{ width: '100%', height: '100%', zIndex: 0 }}
      ref={mapRef}
      zoomControl={false}
    >
      <MapResizer />
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* Route polyline for buses */}
      {portalMode === 'bus' && polylinePath.length > 0 && (
        <Polyline
          positions={polylinePath}
          pathOptions={{ color: '#16a34a', weight: 5, opacity: 0.9 }}
        />
      )}

      {/* Priority Green Corridor Polyline for Ambulance */}
      {portalMode === 'ambulance' && activeEmergency?.green_corridor_active && (
        <Polyline
          positions={greenCorridorPath}
          pathOptions={{ color: '#22c55e', weight: 8, opacity: 0.9, dashArray: '10, 10' }}
        />
      )}

      {/* Bus Stops / Origin / Destination */}
      {portalMode === 'bus' && originStop && (
        <Marker
          position={[originStop.location.coordinates[1], originStop.location.coordinates[0]]}
          icon={createMarkerIcon('A', '#16a34a')}
        />
      )}
      {portalMode === 'bus' && destinationStop && (
        <Marker
          position={[destinationStop.location.coordinates[1], destinationStop.location.coordinates[0]]}
          icon={createMarkerIcon('B', '#1e293b')}
        />
      )}

      {/* Hospital Markers */}
      {portalMode === 'ambulance' &&
        hospitals.map((h) => (
          <Marker
            key={h.hospital_id || h.name}
            position={[h.location.coordinates[1], h.location.coordinates[0]]}
            icon={createHospitalIcon(h.name)}
          >
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif', padding: 4 }}>
                <strong style={{ color: '#dc2626', fontSize: 13 }}>🏥 {h.name}</strong>
                <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0' }}>{h.address}</p>
                <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                  ICU Beds Available: {h.icu_beds_available}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

      {/* Ambulance Markers */}
      {portalMode === 'ambulance' &&
        ambulances.map((amb) => {
          const coords = amb.current_location?.coordinates || [76.9629, 11.0168];
          return (
            <Marker
              key={amb.ambulance_id}
              position={[coords[1], coords[0]]}
              icon={createAmbulanceIcon(amb.status)}
            >
              <Popup>
                <div style={{ fontFamily: 'Inter, sans-serif', padding: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#dc2626' }}>
                    🚑 {amb.vehicle_number}
                  </div>
                  <div style={{ fontSize: 12, color: '#475569' }}>{amb.hospital_name}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    Driver: {amb.driver_name} ({amb.driver_phone})
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>
                    Status: {amb.status.toUpperCase()}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

      {/* Live bus markers */}
      {portalMode === 'bus' &&
        allBuses.map((bus) => {
          const livePos = busPositions[bus.bus_id];
          const liveData = busUpdates?.[bus.bus_id];
          const freeSeats = liveData?.free_seats ?? bus.free_seats ?? 20;
          if (!livePos) return null;

          const position = [livePos[1], livePos[0]];

          return (
            <Marker
              key={bus.bus_id}
              position={position}
              icon={createBusIcon(freeSeats, bus.seating_capacity)}
              eventHandlers={{ click: () => setActiveMarker(bus.bus_id) }}
              zIndexOffset={100}
            >
              <Popup onClose={() => setActiveMarker(null)}>
                <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 160, padding: '4px 0', margin: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', margin: '0 0 6px 0' }}>
                    🚌 Route {bus.bus_number}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', margin: '0 0 8px 0' }}>
                    {bus.route_name}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <InfoStat label="Free Seats" value={freeSeats} color="#16a34a" />
                    <InfoStat label="Passengers" value={liveData?.current_passengers ?? '—'} color="#1e293b" />
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
    </MapContainer>
  );
}

function InfoStat({ label, value, color }) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color, margin: 0 }}>{value}</div>
      <div style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>{label}</div>
    </div>
  );
}
