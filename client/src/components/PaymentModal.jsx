import React, { useState } from 'react';
import axios from 'axios';
import { CreditCard, AlertTriangle, Lock, CheckCircle2, XCircle } from 'lucide-react';

/**
 * PaymentModal - Razorpay online payment flow for passengers.
 *
 * Props:
 *   bus             - selected bus object with bus_id, free_seats, fare
 *   originStop      - { stop_id, stop_name }
 *   destinationStop - { stop_id, stop_name }
 *   onClose         - callback
 */
export default function PaymentModal({ bus, originStop, destinationStop, onClose }) {
  const [mobile, setMobile] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('form'); // 'form' | 'processing' | 'success' | 'failed'
  const [txnData, setTxnData] = useState(null);

  const fare = bus.fare * passengers;

  const handlePay = async () => {
    if (mobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!originStop || !destinationStop) {
      setError('Origin/destination stop information missing');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Create Razorpay order on backend
      const res = await axios.post('/api/payments/create-order', {
        bus_id: bus.bus_id,
        origin_stop_id: originStop.stop_id,
        destination_stop_id: destinationStop.stop_id,
        passenger_count: passengers,
        mobile_number: `91${mobile}`,
      });

      const {
        key_id,
        order_id,
        merchant_transaction_id,
        amount_inr,
        amount_paise,
        currency,
      } = res.data;

      setTxnData({ merchant_transaction_id, amount_inr, order_id });

      // Check if standard Razorpay checkout is available in window
      if (window.Razorpay && key_id && !key_id.includes('mockKey')) {
        const options = {
          key: key_id,
          amount: amount_paise,
          currency: currency || 'INR',
          name: 'OptiFlow Transit',
          description: `Bus ${bus.bus_number} Ticket (${passengers} Pax)`,
          order_id: order_id,
          prefill: {
            contact: mobile,
          },
          theme: {
            color: '#16a34a',
          },
          handler: async function (response) {
            setStep('processing');
            try {
              const verifyRes = await axios.post('/api/payments/verify', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                merchant_transaction_id,
              });

              if (verifyRes.data?.success) {
                setTxnData((prev) => ({ ...prev, ticket_id: verifyRes.data.ticket_id }));
                setStep('success');
              } else {
                setStep('failed');
              }
            } catch (vErr) {
              console.error('Verification failed', vErr);
              setStep('failed');
            }
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          console.error('Razorpay payment failed', response.error);
          setStep('failed');
        });
        rzp.open();
        setLoading(false);
      } else {
        // Test / Mock mode checkout logic
        setStep('processing');
        setLoading(false);

        setTimeout(async () => {
          try {
            const verifyRes = await axios.post('/api/payments/verify', {
              razorpay_order_id: order_id,
              razorpay_payment_id: `pay_mock_${Date.now()}`,
              razorpay_signature: 'mock_signature',
              merchant_transaction_id,
            });

            if (verifyRes.data?.success) {
              setTxnData((prev) => ({ ...prev, ticket_id: verifyRes.data.ticket_id }));
              setStep('success');
            } else {
              setStep('failed');
            }
          } catch (_) {
            setStep('failed');
          }
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Payment order creation failed. Try again.');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 300, padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420,
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: '#16a34a', padding: '18px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}>
            <span style={{ display: 'flex', alignItems: 'center' }}><CreditCard size={22} /></span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Pay Online</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Powered by Razorpay</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%',
              width: 30, height: 30, color: '#fff', cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {/* ── FORM STEP ── */}
          {step === 'form' && (
            <>
              {/* Journey summary */}
              <div
                style={{
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: 10, padding: '12px 16px', marginBottom: 20,
                }}
              >
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>JOURNEY SUMMARY</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                  {originStop?.stop_name} → {destinationStop?.stop_name}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Route {bus.bus_number} · {bus.intermediate_stops} stops
                </div>
              </div>

              {/* Passenger count */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
                  PASSENGERS
                </label>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 0,
                    border: '1.5px solid #e2e8f0', borderRadius: 8, overflow: 'hidden',
                  }}
                >
                  <button
                    id="pay-pax-minus"
                    onClick={() => setPassengers((p) => Math.max(1, p - 1))}
                    style={{
                      width: 44, height: 44, background: '#f8fafc', border: 'none',
                      fontSize: 18, cursor: 'pointer', color: '#16a34a', fontWeight: 700,
                      borderRight: '1px solid #e2e8f0',
                    }}
                  >
                    −
                  </button>
                  <span style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                    {passengers}
                  </span>
                  <button
                    id="pay-pax-plus"
                    onClick={() => setPassengers((p) => Math.min(10, p + 1))}
                    style={{
                      width: 44, height: 44, background: '#f8fafc', border: 'none',
                      fontSize: 18, cursor: 'pointer', color: '#16a34a', fontWeight: 700,
                      borderLeft: '1px solid #e2e8f0',
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Mobile number */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
                  MOBILE NUMBER (for Razorpay Receipt)
                </label>
                <div style={{ display: 'flex', gap: 0, border: '1.5px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                  <span
                    style={{
                      padding: '10px 12px', background: '#f8fafc',
                      borderRight: '1px solid #e2e8f0', fontSize: 13,
                      color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap',
                    }}
                  >
                    +91
                  </span>
                  <input
                    id="mobile-input"
                    className="input-field"
                    style={{ border: 'none', borderRadius: 0 }}
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>

              {/* Fare */}
              <div
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: '#f8fafc', borderRadius: 10, padding: '14px 16px',
                  border: '1px solid #e2e8f0', marginBottom: 20,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>Total Amount</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    ₹{bus.fare} × {passengers} passengers
                  </div>
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a' }}>₹{fare}</div>
              </div>

              {error && (
                <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: '#ef4444', marginBottom: 12, textAlign: 'center' }}>
                  <AlertTriangle size={14} /> {error}
                </p>
              )}

              <button
                id="razorpay-pay-btn"
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '13px 20px' }}
                onClick={handlePay}
                disabled={loading}
              >
                {loading ? <span className="spinner" /> : <CreditCard size={18} style={{ marginRight: 6 }} />}
                {loading ? 'Processing...' : `Pay ₹${fare} via Razorpay`}
              </button>

              <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 10 }}>
                <Lock size={12} /> Secured by Razorpay · UPI · Cards · NetBanking · Wallets
              </p>
            </>
          )}

          {/* ── PROCESSING STEP ── */}
          {step === 'processing' && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <span className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }} />
              <p style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>Verifying payment...</p>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
                Please wait while we verify your transaction and issue your ticket.
              </p>
            </div>
          )}

          {/* ── SUCCESS STEP ── */}
          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><CheckCircle2 size={52} color="#16a34a" /></div>
              <h3 style={{ fontWeight: 800, fontSize: 18, color: '#16a34a', marginBottom: 6 }}>
                Payment Successful!
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                Your ticket has been issued via Razorpay. Show this to the conductor.
              </p>
              {txnData?.merchant_transaction_id && (
                <div
                  style={{
                    background: '#f0fdf4', border: '1px solid #bbf7d0',
                    borderRadius: 10, padding: '12px 16px', marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: 11, color: '#64748b' }}>Transaction ID</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
                    {txnData.merchant_transaction_id}
                  </div>
                  {txnData.order_id && (
                    <>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>Razorpay Order ID</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#334155' }}>
                        {txnData.order_id}
                      </div>
                    </>
                  )}
                  {txnData.ticket_id && (
                    <>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>Ticket ID</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>
                        {txnData.ticket_id?.slice(0, 8).toUpperCase()}
                      </div>
                    </>
                  )}
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#16a34a', marginTop: 10 }}>
                    ₹{txnData.amount_inr} paid
                  </div>
                </div>
              )}
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={onClose}>
                Done
              </button>
            </div>
          )}

          {/* ── FAILED STEP ── */}
          {step === 'failed' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><XCircle size={52} color="#ef4444" /></div>
              <h3 style={{ fontWeight: 800, fontSize: 18, color: '#ef4444', marginBottom: 6 }}>
                Payment Failed
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                Your payment signature could not be verified or transaction was canceled.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setStep('form')}
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

