'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Cookies from 'js-cookie';

export default function TestWalletPage() {
  const [addresses, setAddresses] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [withdrawalData, setWithdrawalData] = useState({
    currency: 'BTC',
    amount: '',
    destinationAddress: ''
  });
  const router = useRouter();

  // Check authentication
  useEffect(() => {
    const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
    }
  }, []);

  // Fetch deposit address for a currency
  const getDepositAddress = async (currency: string) => {
    try {
      setLoading(true);
      setError('');
      
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      const response = await api.get(`/api/wallet/deposit-address/${currency}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAddresses((prev: any) => ({
        ...prev,
        [currency]: response.data
      }));
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch address');
      console.error('Error fetching address:', err);
    } finally {
      setLoading(false);
    }
  };

  // Request withdrawal
  const requestWithdrawal = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      const response = await api.post('/api/wallet/withdrawal', withdrawalData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(`Withdrawal requested!\nID: ${response.data.withdrawalId}\nFee: ${response.data.fee}\nNet Amount: ${response.data.netAmount}\nStatus: ${response.data.status}`);
      
      // Reset form
      setWithdrawalData({
        currency: 'BTC',
        amount: '',
        destinationAddress: ''
      });
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to request withdrawal');
      console.error('Error requesting withdrawal:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#1A1A1A', 
      color: 'white',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '2rem', color: '#FFD700' }}>
          🔗 Blockchain Wallet Test Page
        </h1>

        {error && (
          <div style={{
            background: '#FF5722',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '2rem'
          }}>
            ❌ {error}
          </div>
        )}

        {/* Deposit Addresses Section */}
        <div style={{
          background: '#2C2C2C',
          padding: '2rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          border: '1px solid #444'
        }}>
          <h2 style={{ color: '#FFD700', marginBottom: '1.5rem' }}>
            💰 Get Deposit Addresses
          </h2>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <button
              onClick={() => getDepositAddress('BTC')}
              disabled={loading}
              style={{
                background: '#FF9800',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Get BTC Address
            </button>
            
            <button
              onClick={() => getDepositAddress('ETH')}
              disabled={loading}
              style={{
                background: '#627EEA',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Get ETH Address
            </button>
            
            <button
              onClick={() => getDepositAddress('USDT')}
              disabled={loading}
              style={{
                background: '#26A17B',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Get USDT Address
            </button>
          </div>

          {/* Display Addresses */}
          {Object.keys(addresses).map((currency) => (
            <div key={currency} style={{
              background: '#3A3A3A',
              padding: '1.5rem',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <h3 style={{ color: '#FFD700', marginBottom: '1rem' }}>
                {currency} Deposit Address
              </h3>
              
              <div style={{ marginBottom: '1rem' }}>
                <strong>Address:</strong>
                <div style={{
                  background: '#2C2C2C',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  wordBreak: 'break-all',
                  marginTop: '0.5rem'
                }}>
                  {addresses[currency].address}
                </div>
              </div>

              {addresses[currency].qrCode && (
                <div style={{ marginTop: '1rem' }}>
                  <strong>QR Code:</strong>
                  <div style={{ marginTop: '0.5rem' }}>
                    <img 
                      src={addresses[currency].qrCode} 
                      alt={`${currency} QR Code`}
                      style={{ 
                        maxWidth: '200px', 
                        border: '2px solid #FFD700',
                        borderRadius: '8px'
                      }}
                    />
                  </div>
                </div>
              )}

              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: '#4CAF50',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}>
                ℹ️ {addresses[currency].message}
              </div>
            </div>
          ))}
        </div>

        {/* Withdrawal Section */}
        <div style={{
          background: '#2C2C2C',
          padding: '2rem',
          borderRadius: '12px',
          border: '1px solid #444'
        }}>
          <h2 style={{ color: '#FFD700', marginBottom: '1.5rem' }}>
            💸 Request Withdrawal
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                Currency:
              </label>
              <select
                value={withdrawalData.currency}
                onChange={(e) => setWithdrawalData({ ...withdrawalData, currency: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#3A3A3A',
                  border: '1px solid #555',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '1rem'
                }}
              >
                <option value="BTC">Bitcoin (BTC)</option>
                <option value="ETH">Ethereum (ETH)</option>
                <option value="USDT">Tether (USDT)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                Amount:
              </label>
              <input
                type="number"
                step="0.00000001"
                value={withdrawalData.amount}
                onChange={(e) => setWithdrawalData({ ...withdrawalData, amount: e.target.value })}
                placeholder="0.001"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#3A3A3A',
                  border: '1px solid #555',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                Destination Address:
              </label>
              <input
                type="text"
                value={withdrawalData.destinationAddress}
                onChange={(e) => setWithdrawalData({ ...withdrawalData, destinationAddress: e.target.value })}
                placeholder="Enter destination address"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#3A3A3A',
                  border: '1px solid #555',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '1rem',
                  fontFamily: 'monospace'
                }}
              />
            </div>

            <button
              onClick={requestWithdrawal}
              disabled={loading || !withdrawalData.amount || !withdrawalData.destinationAddress}
              style={{
                background: '#FF5722',
                color: 'white',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem',
                marginTop: '1rem',
                opacity: (loading || !withdrawalData.amount || !withdrawalData.destinationAddress) ? 0.5 : 1
              }}
            >
              {loading ? 'Processing...' : 'Request Withdrawal'}
            </button>

            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: '#FFC107',
              color: '#333',
              borderRadius: '8px',
              fontSize: '0.9rem'
            }}>
              ⚠️ <strong>Note:</strong> Withdrawal requests require admin approval.
              You will be notified once your request is processed.
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: '#2C2C2C',
          borderRadius: '12px',
          border: '1px solid #4CAF50'
        }}>
          <h3 style={{ color: '#4CAF50', marginBottom: '1rem' }}>
            ✅ How to Test
          </h3>
          <ol style={{ lineHeight: '1.8' }}>
            <li>Click "Get BTC/ETH/USDT Address" to see your deposit addresses</li>
            <li>Copy the address or scan the QR code</li>
            <li>Send crypto from your external wallet (e.g., MetaMask, Binance)</li>
            <li>Wait for confirmations (BTC: 6 blocks, ETH: 12 blocks)</li>
            <li>Your balance will be automatically credited</li>
            <li>Use the withdrawal form to request withdrawals</li>
          </ol>
        </div>

        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          style={{
            marginTop: '2rem',
            background: '#3A3A3A',
            color: 'white',
            border: '1px solid #555',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}



