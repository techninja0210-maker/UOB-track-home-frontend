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
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('BTC');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalAddress, setWithdrawalAddress] = useState('');

  useEffect(() => {
    loadPoolData();
  }, []);

  const loadPoolData = async () => {
    try {
      setLoading(true);
      const [walletsRes, requestsRes] = await Promise.all([
        api.get('/api/admin/pool-wallets'),
        api.get('/api/admin/withdrawal-requests'),
      ]);
      setPoolWallets(walletsRes.data || []);
      setWithdrawalRequests(requestsRes.data || []);
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
    if (!withdrawalAmount || !withdrawalAddress) {
      notificationSocket.notifyLocal({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all fields.',
      });
      return;
    }

    setProcessing(true);
    try {
      await api.post('/api/admin/pool-withdrawal', {
        currency: selectedCurrency,
        amount: parseFloat(withdrawalAmount),
        toAddress: withdrawalAddress,
      });
      
      notificationSocket.notifyLocal({
        type: 'success',
        title: 'Success',
        message: `${selectedCurrency} withdrawal initiated.`,
      });
      
      setWithdrawalAmount('');
      setWithdrawalAddress('');
      loadPoolData(); // Reload balances
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      notificationSocket.notifyLocal({
        type: 'error',
        title: 'Error',
        message: 'Failed to process withdrawal.',
      });
    } finally {
      setProcessing(false);
    }
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

  if (loading) {
    return (
      <AdminLayout title="Pool Wallets" subtitle="Manage platform pool wallets">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
        </div>
      </AdminLayout>
    );
  }

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
                onClick={handleWithdrawal}
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
      </div>
    </AdminLayout>
  );
}