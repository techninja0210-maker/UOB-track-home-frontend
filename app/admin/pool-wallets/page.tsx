'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import Image from 'next/image';
import notificationSocket from '@/lib/notificationSocket';
import NotificationCenter from '@/components/NotificationCenter';

interface PoolWallet {
  currency: string;
  address: string;
  balance: number;
  pending: number;
}

interface WithdrawalRequest {
  id: string;
  userId: string;
  currency: string;
  amount: number;
  toAddress: string;
  status: string;
  createdAt: string;
}

export default function AdminPoolWallets() {
  const [poolWallets, setPoolWallets] = useState<PoolWallet[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('BTC');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalAddress, setWithdrawalAddress] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    loadPoolData();
  }, []);

  const loadPoolData = async () => {
    try {
      setLoading(true);
      const [walletsRes, requestsRes] = await Promise.all([
        api.get('/api/admin/pool-wallets'),
        api.get('/api/withdrawals/admin'),
      ]);
      setPoolWallets(walletsRes.data || []);
      setWithdrawalRequests(requestsRes.data.data || []);
    } catch (error) {
      console.error('Error loading pool data:', error);
      notificationSocket.notifyLocal({
        type: 'error',
        title: 'Error',
        message: 'Failed to load pool wallet data.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async () => {
    // Validate inputs
    if (!withdrawalAmount || !withdrawalAddress) {
      notificationSocket.notifyLocal({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all fields.',
      });
      return;
    }

    const amount = parseFloat(withdrawalAmount);
    if (isNaN(amount) || amount <= 0) {
      notificationSocket.notifyLocal({
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter a valid amount greater than 0.',
      });
      return;
    }

    // Validate address format
    if (selectedCurrency === 'BTC' && !withdrawalAddress.match(/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/)) {
      notificationSocket.notifyLocal({
        type: 'error',
        title: 'Validation Error',
        message: 'Invalid Bitcoin address format.',
      });
      return;
    }

    if (['ETH', 'USDT'].includes(selectedCurrency) && !withdrawalAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      notificationSocket.notifyLocal({
        type: 'error',
        title: 'Validation Error',
        message: 'Invalid Ethereum address format.',
      });
      return;
    }

    // Check if amount exceeds pool balance
    const poolWallet = poolWallets.find(w => w.currency === selectedCurrency);
    if (poolWallet && amount > poolWallet.balance) {
      notificationSocket.notifyLocal({
        type: 'error',
        title: 'Insufficient Balance',
        message: `Pool only has ${poolWallet.balance.toFixed(6)} ${selectedCurrency} available.`,
      });
      return;
    }

    setProcessing(true);
    try {
      console.log('🚀 Processing admin withdrawal:', {
        currency: selectedCurrency,
        amount: amount,
        toAddress: withdrawalAddress
      });

      const response = await api.post('/api/admin/pool-withdrawal', {
        currency: selectedCurrency,
        amount: amount,
        toAddress: withdrawalAddress,
      });
      
      console.log('✅ Withdrawal response:', response.data);
      
      notificationSocket.notifyLocal({
        type: 'success',
        title: 'Withdrawal Successful',
        message: `${selectedCurrency} withdrawal sent! TX: ${response.data.txHash.substring(0, 10)}...`,
      });
      
      setWithdrawalAmount('');
      setWithdrawalAddress('');
      loadPoolData(); // Reload balances
    } catch (error: any) {
      console.error('❌ Error processing withdrawal:', error);
      
      let errorMessage = 'Failed to process withdrawal.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      notificationSocket.notifyLocal({
        type: 'error',
        title: 'Withdrawal Failed',
        message: errorMessage,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdrawalClick = () => {
    // Validate inputs first
    if (!withdrawalAmount || !withdrawalAddress) {
      notificationSocket.notifyLocal({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all fields.',
      });
      return;
    }

    const amount = parseFloat(withdrawalAmount);
    if (isNaN(amount) || amount <= 0) {
      notificationSocket.notifyLocal({
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter a valid amount greater than 0.',
      });
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const confirmWithdrawal = () => {
    setShowConfirmDialog(false);
    handleWithdrawal();
  };

  const cancelWithdrawal = () => {
    setShowConfirmDialog(false);
  };

  const handleApproveWithdrawal = async (requestId: string) => {
    setProcessing(true);
    try {
      await api.post(`/api/admin/approve-withdrawal/${requestId}`);
      
      notificationSocket.notifyLocal({
        type: 'success',
        title: 'Success',
        message: 'Withdrawal request approved.',
      });
      
      loadPoolData(); // Reload data
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      notificationSocket.notifyLocal({
        type: 'error',
        title: 'Error',
        message: 'Failed to approve withdrawal.',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getQrCodeUrl = (address: string, currency: string) => {
    if (!address) return '';
    const data = currency === 'BTC' ? `bitcoin:${address}` : `ethereum:${address}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${data}`;
  };

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
    }).format(balance);
  };


  return (
    <AdminLayout title="Pool Wallets" subtitle="Manage platform pool wallets">
      <NotificationCenter userId="admin" />
      <div className="space-y-8">
        {/* Pool Wallet Balances */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {poolWallets.map((wallet) => (
            <div key={wallet.currency} className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {wallet.currency} Pool Wallet
                </h3>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                  Active
                </span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Address:</p>
                  <p className="font-mono text-sm bg-gray-50 p-2 rounded break-all">
                    {wallet.address}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Balance:</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatBalance(wallet.balance)} {wallet.currency}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Pending:</p>
                    <p className="text-lg font-semibold text-orange-600">
                      {formatBalance(wallet.pending)} {wallet.currency}
                    </p>
                  </div>
                </div>

                {wallet.address && (
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">QR Code:</p>
                    <Image
                      src={getQrCodeUrl(wallet.address, wallet.currency)}
                      alt={`${wallet.currency} QR Code`}
                      width={120}
                      height={120}
                      className="mx-auto border border-gray-200 rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Admin Withdrawal */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Admin Withdrawal</h3>
          <p className="text-gray-600 mb-4">
            Send crypto from pool wallet to external addresses.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
                <option value="USDT">USDT</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount
              </label>
              <input
                type="number"
                step="0.000001"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                placeholder="0.000000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Address
              </label>
              <input
                type="text"
                value={withdrawalAddress}
                onChange={(e) => setWithdrawalAddress(e.target.value)}
                placeholder="Enter destination address"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={handleWithdrawalClick}
                disabled={processing}
                className="w-full bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors duration-200 disabled:bg-gray-300"
              >
                {processing ? 'Processing...' : 'Send'}
              </button>
            </div>
          </div>
        </div>

        {/* Pending Withdrawal Requests */}
        {withdrawalRequests.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Pending Withdrawal Requests</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Currency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      To Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {withdrawalRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.userId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatBalance(request.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-mono">
                        {request.toAddress}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleApproveWithdrawal(request.id)}
                          disabled={processing}
                          className="text-primary-600 hover:text-primary-900 disabled:text-gray-400"
                        >
                          Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Confirm Withdrawal</h3>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Are you sure you want to send <strong>{withdrawalAmount} {selectedCurrency}</strong> to:
                </p>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-mono text-sm break-all">{withdrawalAddress}</p>
                </div>
                <p className="text-sm text-red-600 mt-2">
                  ⚠️ This action cannot be undone. Please double-check the address.
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={cancelWithdrawal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmWithdrawal}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 transition-colors"
                >
                  {processing ? 'Processing...' : 'Confirm Withdrawal'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}