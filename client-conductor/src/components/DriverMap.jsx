import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bus, Ambulance, User } from 'lucide-react';
import { renderToString } from 'react-dom/server';

// Fix Leaflet's default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom icons using Lucide
const createCustomIcon = (IconComponent, color) => {
  const iconHtml = renderToString(<IconComponent size={24} color={color} />);
  return L.divIcon({
    html: `<div style="background: white; border: 2px solid ${color}; border-radius: 50%; padding: 4px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); width: 32px; height: 32px;">${iconHtml}</div>`,
    className: 'custom-leaflet-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const busIcon = createCustomIcon(Bus, '#2563eb');
const ambulanceIcon = createCustomIcon(Ambulance, '#dc2626');
const patientIcon = createCustomIcon(User, '#d97706');
const driverIcon = createCustomIcon(User, '#16a34a'); // for current driver

// Helper component to recenter map
function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

export default function DriverMap({
  driverRole,
  driverLocation, // [lng, lat]
  allBuses = [],
  allAmbulances = [],
  busPositions = {},
  ambulancePositions = {},
  activeDispatch = null
}) {
  const [routePolyline, setRoutePolyline] = useState(null);

  const defaultCenter = [11.0168, 76.9558]; // Coimbatore
  const center = driverLocation ? [driverLocation[1], driverLocation[0]] : defaultCenter;

  // Fetch OSRM route if active dispatch exists
  useEffect(() => {
    if (driverRole === 'ambulance_driver' && activeDispatch && driverLocation) {
      const isTransporting = activeDispatch.status === 'transporting';
      const destinationCoords = isTransporting
        ? activeDispatch.destination_hospital?.coordinates
        : activeDispatch.pickup_location?.coordinates;

      if (destinationCoords) {
        const url = `https://router.project-osrm.org/route/v1/driving/${driverLocation[0]},${driverLocation[1]};${destinationCoords[0]},${destinationCoords[1]}?overview=full&geometries=geojson`;
        fetch(url)
          .then(res => res.json())
          .then(data => {
            if (data.routes && data.routes.length > 0) {
              // OSRM returns [lng, lat], Leaflet polyline expects [lat, lng]
              const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
              setRoutePolyline(coords);
            }
          })
          .catch(err => console.error('Failed to fetch OSRM route:', err));
      }
    } else {
      setRoutePolyline(null);
    }
  }, [driverRole, activeDispatch, driverLocation]);

  return (
    <div style={{ height: '300px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1', marginBottom: '20px' }}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <MapRecenter center={center} />

        {/* Current Driver Marker */}
        {driverLocation && (
          <Marker position={[driverLocation[1], driverLocation[0]]} icon={driverRole === 'conductor' ? busIcon : ambulanceIcon}>
            <Popup><strong>You are Here</strong></Popup>
          </Marker>
        )}

        {/* All Buses */}
        {allBuses.map((bus) => {
          const coords = busPositions[bus.bus_id] || bus.current_location?.coordinates;
          if (!coords) return null;
          // Don't duplicate self if driver is conductor
          if (driverRole === 'conductor' && coords[0] === driverLocation?.[0] && coords[1] === driverLocation?.[1]) return null;
          return (
            <Marker key={bus.bus_id} position={[coords[1], coords[0]]} icon={busIcon}>
              <Popup>
                <strong>{bus.bus_id}</strong><br />
                Route: {bus.route_id}
              </Popup>
            </Marker>
          );
        })}

        {/* All Ambulances */}
        {allAmbulances.map((amb) => {
          const coords = ambulancePositions[amb.ambulance_id] || amb.current_location?.coordinates;
          if (!coords) return null;
          // Don't duplicate self if driver is ambulance driver
          if (driverRole === 'ambulance_driver' && coords[0] === driverLocation?.[0] && coords[1] === driverLocation?.[1]) return null;
          return (
            <Marker key={amb.ambulance_id} position={[coords[1], coords[0]]} icon={ambulanceIcon}>
              <Popup>
                <strong>{amb.ambulance_id}</strong><br />
                Status: {amb.status}
              </Popup>
            </Marker>
          );
        })}

        {/* Routing Destination Marker */}
        {driverRole === 'ambulance_driver' && activeDispatch && (
          activeDispatch.status === 'transporting' ? (
            activeDispatch.destination_hospital?.coordinates && (
              <Marker position={[activeDispatch.destination_hospital.coordinates[1], activeDispatch.destination_hospital.coordinates[0]]} icon={createCustomIcon(Bus, '#7c3aed')}>
                <Popup>
                  <strong>Destination Hospital</strong><br />
                  {activeDispatch.destination_hospital.name}
                </Popup>
              </Marker>
            )
          ) : (
            activeDispatch.pickup_location?.coordinates && (
              <Marker position={[activeDispatch.pickup_location.coordinates[1], activeDispatch.pickup_location.coordinates[0]]} icon={patientIcon}>
                <Popup>
                  <strong>Patient Pickup</strong><br />
                  {activeDispatch.patient_name}
                </Popup>
              </Marker>
            )
          )
        )}

        {/* Route Polyline */}
        {routePolyline && (
          <Polyline positions={routePolyline} color="#dc2626" weight={5} opacity={0.7} dashArray="10, 10" />
        )}
      </MapContainer>
    </div>
  );
}
