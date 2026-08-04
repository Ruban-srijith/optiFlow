import React, { useState } from 'react';
import { login } from '../services/api';

/**
 * Login page for the Conductor App.
 * On success, stores JWT + conductor info in localStorage and calls onLogin().
 */
export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter your username and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await login(username.trim(), password);
      const { token, conductor } = res.data;
      localStorage.setItem('conductor_token', token);
      localStorage.setItem('conductor_info', JSON.stringify(conductor));
      onLogin(conductor);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: 16,
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🚌</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1e293b' }}>
            Opti<span style={{ color: '#16a34a' }}>Flow</span>
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
            Conductor Portal — Pine Labs POS
          </p>
        </div>

        {/* Login card */}
        <div
          className="card fade-in"
          style={{ padding: 32 }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: '#1e293b' }}>
            Sign In
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>
            Enter your conductor credentials to access the dashboard.
          </p>

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="login-username"
                style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}
              >
                USERNAME
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 15, color: '#94a3b8',
                  }}
                >
                  👤
                </span>
                <input
                  id="login-username"
                  className="input-field"
                  type="text"
                  placeholder="e.g. conductor1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ paddingLeft: 36 }}
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label
                htmlFor="login-password"
                style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}
              >
                PASSWORD
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 15, color: '#94a3b8',
                  }}
                >
                  🔒
                </span>
                <input
                  id="login-password"
                  className="input-field"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: 36, paddingRight: 44 }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#94a3b8',
                  }}
                  tabIndex={-1}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
                  padding: '10px 14px', marginBottom: 16,
                  fontSize: 13, color: '#dc2626',
                }}
              >
                ⚠️ {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit-btn"
              type="submit"
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', fontSize: 15 }}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : '🔑'}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Hint for demo */}
          <div
            style={{
              marginTop: 20, background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: 8, padding: '10px 14px',
            }}
          >
            <p style={{ fontSize: 12, color: '#15803d', fontWeight: 600, marginBottom: 4 }}>
              Demo Credentials
            </p>
            <p style={{ fontSize: 12, color: '#166534' }}>conductor1 / conductor123 (Route 1D)</p>
            <p style={{ fontSize: 12, color: '#166534' }}>conductor2 / conductor456 (Route 3D)</p>
            <p style={{ fontSize: 12, color: '#166534' }}>conductor3 / conductor789 (Route 11A)</p>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 20 }}>
          OptiFlow Conductor v2.0 · TNSTC · Coimbatore
        </p>
      </div>
    </div>
  );
}
