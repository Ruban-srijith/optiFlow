import React, { useState } from 'react';
import { login, sendOtp, verifyOtp } from '../services/api';

/**
 * Login page for the Conductor App with Phone OTP & Password options.
 */
export default function Login({ onLogin }) {
  const [mode, setMode] = useState('otp'); // 'otp' or 'password'
  
  // Username/Password state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // OTP state
  const [phone, setPhone] = useState('+919876543213');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [info, setInfo] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const res = await sendOtp(phone, 'conductor');
      setOtpSent(true);
      if (res.data.dev_otp) {
        setOtpCode(res.data.dev_otp);
        setInfo(`Dev OTP generated: ${res.data.dev_otp}`);
      } else {
        setInfo(`OTP sent to ${phone}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await verifyOtp(phone, otpCode);
      const { token, user } = res.data;
      localStorage.setItem('conductor_token', token);
      localStorage.setItem('conductor_info', JSON.stringify(user));
      onLogin(user);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
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
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}><Bus size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /></div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1e293b' }}>
            Opti<span style={{ color: '#16a34a' }}>Flow</span>
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
            Conductor Mobile & POS Portal
          </p>
        </div>

        {/* Login card */}
        <div className="card fade-in" style={{ padding: 28 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: '#f1f5f9', padding: 4, borderRadius: 8 }}>
            <button
              type="button"
              style={{
                flex: 1, padding: '8px 0', fontSize: 13, border: 'none', borderRadius: 6, cursor: 'pointer',
                background: mode === 'otp' ? '#fff' : 'transparent',
                fontWeight: mode === 'otp' ? 700 : 500,
                color: mode === 'otp' ? '#16a34a' : '#64748b',
                boxShadow: mode === 'otp' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
              onClick={() => { setMode('otp'); setError(''); setInfo(''); }}
            >
              📱 Phone OTP
            </button>
            <button
              type="button"
              style={{
                flex: 1, padding: '8px 0', fontSize: 13, border: 'none', borderRadius: 6, cursor: 'pointer',
                background: mode === 'password' ? '#fff' : 'transparent',
                fontWeight: mode === 'password' ? 700 : 500,
                color: mode === 'password' ? '#16a34a' : '#64748b',
                boxShadow: mode === 'password' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
              onClick={() => { setMode('password'); setError(''); setInfo(''); }}
            >
              🔐 Username
            </button>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
              <AlertTriangle size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> {error}
            </div>
          )}

          {info && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#1d4ed8' }}>
              ℹ️ {info}
            </div>
          )}

          {mode === 'otp' ? (
            !otpSent ? (
              <form onSubmit={handleSendOtp}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
                    CONDUCTOR PHONE NUMBER
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#94a3b8' }}>
                      📱
                    </span>
                    <input
                      className="input-field"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+919876543213"
                      style={{ paddingLeft: 36 }}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', fontSize: 15 }} disabled={loading}>
                  {loading ? <span className="spinner" /> : '<Smartphone size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> Send OTP Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
                    ENTER 6-DIGIT OTP CODE
                  </label>
                  <input
                    className="input-field"
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    style={{ letterSpacing: 6, fontSize: 20, textAlign: 'center', fontWeight: 'bold' }}
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', fontSize: 15 }} disabled={loading}>
                  {loading ? <span className="spinner" /> : '✅ Verify & Login'}
                </button>
                <button
                  type="button"
                  style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer' }}
                  onClick={() => setOtpSent(false)}
                >
                  ← Change Phone Number
                </button>
              </form>
            )
          ) : (
            <form onSubmit={handlePasswordSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="login-username" style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
                  USERNAME
                </label>
                <input
                  id="login-username"
                  className="input-field"
                  type="text"
                  placeholder="conductor1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label htmlFor="login-password" style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
                  PASSWORD
                </label>
                <input
                  id="login-password"
                  className="input-field"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', fontSize: 15 }} disabled={loading}>
                {loading ? <span className="spinner" /> : '🔑 Sign In'}
              </button>
            </form>
          )}

          {/* Demo Hint */}
          <div style={{ marginTop: 20, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px' }}>
            <p style={{ fontSize: 12, color: '#15803d', fontWeight: 600, marginBottom: 4 }}>
              Demo Phone Accounts
            </p>
            <p style={{ fontSize: 12, color: '#166534' }}>📱 Conductor Phone: <b>+919876543213</b> (OTP: <b>123456</b>)</p>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 20 }}>
          OptiFlow Conductor v2.0 · TNSTC · Coimbatore
        </p>
      </div>
    </div>
  );
}
