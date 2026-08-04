import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:5001';

/**
 * useSocket — connects to the OptiFlow Socket.io server and
 * provides real-time bus position / update events.
 *
 * @returns {{ busPositions, busUpdates, connected }}
 *   busPositions: { [bus_id]: [lng, lat] }
 *   busUpdates:   { [bus_id]: { free_seats, current_passengers, ... } }
 *   connected:    boolean
 */
export function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [busPositions, setBusPositions] = useState({});
  const [ambulancePositions, setAmbulancePositions] = useState({});
  const [busUpdates, setBusUpdates] = useState({});

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // Live GPS broadcast from simulator
    socket.on('bus_position', ({ bus_id, coordinates }) => {
      setBusPositions((prev) => ({ ...prev, [bus_id]: coordinates }));
    });

    socket.on('bus_position_update', (data) => {
      setBusPositions((prev) => ({ ...prev, [data.bus_id]: data.current_location.coordinates }));
    });

    socket.on('ambulance_position_update', (data) => {
      setAmbulancePositions((prev) => ({ ...prev, [data.ambulance_id]: data.current_location.coordinates }));
    });

    // Occupancy update after ticket issuance
    socket.on('bus_updated', (data) => {
      const { bus_id, ...rest } = data;
      setBusUpdates((prev) => ({ ...prev, [bus_id]: rest }));
      // Also update position if included
      if (data.current_location) {
        setBusPositions((prev) => ({ ...prev, [bus_id]: data.current_location }));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { busPositions, ambulancePositions, busUpdates, connected, socketRef };
}
