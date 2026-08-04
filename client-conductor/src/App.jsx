import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import ConductorDashboard from './components/ConductorDashboard';
import { getMe } from './services/api';

export default function App() {
  const [conductor, setConductor] = useState(null);
  const [checking, setChecking] = useState(true); // checking stored token on load

  // On mount: try restoring session from localStorage
  useEffect(() => {
    const token = localStorage.getItem('conductor_token');
    const stored = localStorage.getItem('conductor_info');
    if (token && stored) {
      // Verify token is still valid with the server
      getMe()
        .then((res) => {
          setConductor(res.data);
        })
        .catch(() => {
          // Token invalid/expired - clear
          localStorage.removeItem('conductor_token');
          localStorage.removeItem('conductor_info');
        })
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  const handleLogin = (conductorData) => {
    setConductor(conductorData);
  };

  const handleLogout = () => {
    localStorage.removeItem('conductor_token');
    localStorage.removeItem('conductor_info');
    setConductor(null);
  };

  // Loading state while verifying token
  if (checking) {
    return (
      <div
        style={{
          height: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexDirection: 'column', gap: 16, color: '#64748b',
        }}
      >
        <span className="spinner" style={{ width: 32, height: 32 }} />
        <p style={{ fontSize: 14 }}>Verifying session...</p>
      </div>
    );
  }

  if (!conductor) {
    return <Login onLogin={handleLogin} />;
  }

  return <ConductorDashboard conductor={conductor} onLogout={handleLogout} />;
}
