import React, { useState } from 'react';
import { adminLogin, sendOtp, verifyOtp } from '../services/api';
import { Smartphone, Bus, Ambulance } from 'lucide-react';

export default function Login({ onLogin }) {
  const [loginMethod, setLoginMethod] = useState('otp'); // 'otp' or 'password'
  
  // Username/Password state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Phone OTP state
  const [phone, setPhone] = useState('+919876543210');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [devOtp, setDevOtp] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const res = await sendOtp(phone);
      setOtpSent(true);
      if (res.data.dev_otp) {
        setDevOtp(res.data.dev_otp);
        setOtpCode(res.data.dev_otp);
        setInfo(`Dev OTP generated: ${res.data.dev_otp}`);
      } else {
        setInfo(`OTP sent to ${phone}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP. Check phone number.');
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
      localStorage.setItem('admin_token', res.data.token);
      localStorage.setItem('admin_info', JSON.stringify(res.data.user));
      onLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await adminLogin(username.trim(), password);
      localStorage.setItem('admin_token', res.data.token);
      localStorage.setItem('admin_info', JSON.stringify(res.data.admin));
      onLogin(res.data.admin);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 440 }}>
        <div className="login-logo">⚡</div>
        <div className="login-title">OptiFlow Management Portal</div>
        <div className="login-sub">Super Admin · Transit Admin · Ambulance Admin</div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: 8, margin: '20px 0 16px 0', background: '#f1f5f9', padding: 4, borderRadius: 8 }}>
          <button
            type="button"
            className="btn"
            style={{ flex: 1, padding: '8px 0', fontSize: 13, background: loginMethod === 'otp' ? '#fff' : 'transparent', color: loginMethod === 'otp' ? '#0f172a' : '#64748b', fontWeight: loginMethod === 'otp' ? 600 : 500, boxShadow: loginMethod === 'otp' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            onClick={() => { setLoginMethod('otp'); setError(''); setInfo(''); }}
          >
            📱 Phone OTP Login
          </button>
          <button
            type="button"
            className="btn"
            style={{ flex: 1, padding: '8px 0', fontSize: 13, background: loginMethod === 'password' ? '#fff' : 'transparent', color: loginMethod === 'password' ? '#0f172a' : '#64748b', fontWeight: loginMethod === 'password' ? 600 : 500, boxShadow: loginMethod === 'password' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            onClick={() => { setLoginMethod('password'); setError(''); setInfo(''); }}
          >
            🔐 Password Login
          </button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
        {info && <div className="alert alert-info" style={{ marginBottom: 16, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>{info}</div>}

        {loginMethod === 'otp' ? (
          !otpSent ? (
            <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  className="form-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+919876543210"
                  required
                />
              </div>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
                style={{ marginTop: 4, justifyContent: 'center', padding: '11px 0' }}
              >
                {loading ? <span className="spinner" /> : <><Smartphone size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> Send OTP Code</>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Enter 6-Digit OTP Code</label>
                <input
                  className="form-input"
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  required
                  style={{ letterSpacing: 4, fontSize: 18, textAlign: 'center', fontWeight: 'bold' }}
                />
              </div>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
                style={{ marginTop: 4, justifyContent: 'center', padding: '11px 0' }}
              >
                {loading ? <span className="spinner" /> : '✅ Verify & Access Portal'}
              </button>
              <button
                type="button"
                className="btn"
                style={{ fontSize: 12, color: '#64748b', justifyContent: 'center' }}
                onClick={() => setOtpSent(false)}
              >
                ← Change Phone Number
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                className="form-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="superadmin"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ marginTop: 4, justifyContent: 'center', padding: '11px 0' }}
            >
              {loading ? <span className="spinner" /> : '🔐 Sign In'}
            </button>
          </form>
        )}

        <div style={{ marginTop: 20, padding: 12, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 11, color: '#64748b' }}>
          <div style={{ fontWeight: 600, color: '#334155', marginBottom: 4 }}>Demo Credentials & Phone Numbers:</div>
          <div>• 👑 <b>Super Admin:</b> +919876543210 (or superadmin / admin123)</div>
          <div>• <Bus size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> <b>Transit Admin:</b> +919876543211 (or transitadmin / admin123)</div>
          <div>• <Ambulance size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> <b>Ambulance Admin:</b> +919876543212 (or healthadmin / admin123)</div>
          <div style={{ marginTop: 4, color: '#0284c7' }}>Dev Mode OTP Code for all numbers: <b>123456</b></div>
        </div>
      </div>
    </div>
  );
}
