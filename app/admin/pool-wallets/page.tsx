'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';

export default function AdminPoolWallets() {
  const [btc, setBtc] = useState('');
  const [eth, setEth] = useState('');
  const [usdt, setUsdt] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Optional: fetch current pool addresses from public endpoint
    (async () => {
      try {
        const [btcRes, ethRes, usdtRes] = await Promise.all([
          api.get('/api/wallet/pool-address/BTC'),
          api.get('/api/wallet/pool-address/ETH'),
          api.get('/api/wallet/pool-address/USDT'),
        ]);
        setBtc(btcRes.data?.address || '');
        setEth(ethRes.data?.address || '');
        setUsdt(usdtRes.data?.address || '');
      } catch {}
    })();
  }, []);

  const isEthLike = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr.trim());
  const isBtcLike = (addr: string) => /^([13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[0-9a-zA-Z]{11,71})$/.test(addr.trim());

  const saveAddress = async (currency: 'BTC' | 'ETH' | 'USDT', address: string) => {
    try {
      setSaving(true);
      setMessage(null);
      if (currency === 'BTC' && !isBtcLike(address)) throw new Error('Invalid BTC address');
      if ((currency === 'ETH' || currency === 'USDT') && !isEthLike(address)) throw new Error('Invalid EVM address');

      await api.post('/api/admin/pool-address', { currency, address });
      setMessage({ type: 'success', text: `${currency} pool address saved` });
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.response?.data?.message || e?.message || 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pool Wallets</h1>
          <p className="mt-2 text-gray-600">Set the BTC and EVM (ETH/USDT) pool addresses used for deposits</p>
        </div>

        {message && (
          <div className={`mb-6 rounded-lg p-4 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">BTC Pool Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">BTC Address</label>
                <input
                  value={btc}
                  onChange={e => setBtc(e.target.value)}
                  placeholder="bc1... or 1..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <div className="mt-3">
                  <button
                    disabled={saving}
                    onClick={() => saveAddress('BTC', btc)}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300"
                  >
                    {saving ? 'Saving...' : 'Save BTC Address'}
                  </button>
                </div>
              </div>
              <div className="flex justify-center">
                {btc && (
                  <img
                    alt="BTC QR"
                    className="h-32 w-32 rounded bg-white border"
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=bitcoin:${encodeURIComponent(btc)}`}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">ETH / USDT Pool Address (EVM)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ETH Pool Address</label>
                <input
                  value={eth}
                  onChange={e => setEth(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <div className="mt-3">
                  <button
                    disabled={saving}
                    onClick={() => saveAddress('ETH', eth)}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300"
                  >
                    {saving ? 'Saving...' : 'Save ETH Address'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">USDT Pool Address</label>
                <input
                  value={usdt}
                  onChange={e => setUsdt(e.target.value)}
                  placeholder="0x... (same as ETH recommended)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <div className="mt-3">
                  <button
                    disabled={saving}
                    onClick={() => saveAddress('USDT', usdt)}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300"
                  >
                    {saving ? 'Saving...' : 'Save USDT Address'}
                  </button>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Tip: For EVM networks, USDT can share the same address as ETH.</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}


