import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5001';

export function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [busPositions, setBusPositions] = useState({});
  const [ambulancePositions, setAmbulancePositions] = useState({});
  const [busUpdates, setBusUpdates] = useState({});

  useEffect(() => {
    const socket = io(WS_URL, { transports: ['websocket'], reconnectionAttempts: 10 });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('bus_position_update', (data) => {
      setBusPositions((p) => ({ ...p, [data.bus_id]: data.current_location.coordinates }));
    });

    socket.on('ambulance_position_update', (data) => {
      setAmbulancePositions((p) => ({ ...p, [data.ambulance_id]: data.current_location.coordinates }));
    });

    socket.on('bus_updated', (data) => {
      setBusUpdates((p) => ({ ...p, [data.bus_id]: data }));
    });

    return () => socket.disconnect();
  }, []);

  return { busPositions, ambulancePositions, busUpdates, connected, socketRef };
}
