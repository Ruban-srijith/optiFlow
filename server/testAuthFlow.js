const axios = require('axios');

async function testAuth() {
  console.log('🧪 Starting Auth & Hierarchy Verification Tests...');
  const baseUrl = 'http://localhost:5000/api';

  try {
    // 1. Send OTP to Super Admin
    console.log('\n1️⃣ Testing Send OTP (+919876543210 - Super Admin)...');
    const otpRes = await axios.post(`${baseUrl}/auth/send-otp`, {
      phone_number: '+919876543210',
    });
    console.log('  Response:', otpRes.data);

    // 2. Verify OTP
    console.log('\n2️⃣ Testing Verify OTP (+919876543210)...');
    const verifyRes = await axios.post(`${baseUrl}/auth/verify-otp`, {
      phone_number: '+919876543210',
      otp: otpRes.data.dev_otp || '123456',
    });
    console.log('  Token generated for role:', verifyRes.data.user.role);
    const token = verifyRes.data.token;

    // 3. Test /me endpoint
    console.log('\n3️⃣ Testing GET /api/auth/me with Bearer Token...');
    const meRes = await axios.get(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('  Authenticated user profile:', meRes.data);

    console.log('\n✅ All Auth & Hierarchy API verification tests passed!');
  } catch (err) {
    console.error('❌ Verification test failed:', err.response?.data || err.message);
  }
}

testAuth();
