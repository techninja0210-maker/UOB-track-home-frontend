'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';

interface Transaction {
  id: string;
  user_id: string;
  type: string;
  currency: string;
  amount: number;
  status: string;
  created_at: string;
  transaction_hash?: string;
}

interface Withdrawal {
  id: string;
  user_id: string;
  currency: string;
  amount: number;
  destination_address: string;
  status: string;
  created_at: string;
  fee: number;
  net_amount: number;
}

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transactions' | 'withdrawals'>('transactions');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadTransactions(),
        loadWithdrawals()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await api.get('/api/admin/transactions');
      setTransactions(response.data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    }
  };

  const loadWithdrawals = async () => {
    try {
      const response = await api.get('/api/admin/withdrawals');
      setWithdrawals(response.data || []);
    } catch (error) {
      console.error('Error loading withdrawals:', error);
      setWithdrawals([]);
    }
  };

  const handleApproveWithdrawal = async (id: string) => {
    try {
      setProcessingId(id);
      await api.post(`/api/admin/withdrawals/${id}/approve`);
      await loadWithdrawals();
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      alert('Failed to approve withdrawal');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectWithdrawal = async (id: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      setProcessingId(id);
      await api.post(`/api/admin/withdrawals/${id}/reject`, { reason });
      await loadWithdrawals();
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      alert('Failed to reject withdrawal');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatAmount = (amount: number, currency: string) => {
    return `${amount.toFixed(8)} ${currency}`;
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: { bg: '#FFA500', color: 'white', text: 'Pending' },
      completed: { bg: '#4CAF50', color: 'white', text: 'Completed' },
      failed: { bg: '#f44336', color: 'white', text: 'Failed' },
      rejected: { bg: '#f44336', color: 'white', text: 'Rejected' }
    };
    
    const style = statusStyles[status as keyof typeof statusStyles] || statusStyles.pending;
    
    return (
      <span 
        className="status-badge"
        style={{ backgroundColor: style.bg, color: style.color }}
      >
        {style.text}
      </span>
    );
  };

  const getTransactionIcon = (type: string, currency: string) => {
    if (type === 'deposit') return '📥';
    if (type === 'withdrawal') return '📤';
    if (currency === 'BTC') return '₿';
    if (currency === 'ETH') return 'Ξ';
    if (currency === 'USDT') return '💵';
    return '💰';
  };

  return (
    <AdminLayout title="Transaction Management" subtitle="Monitor and manage all platform transactions">
      <div className="transactions-management">
        {/* Tabs */}
        <div className="tabs-section">
          <button 
            className={`tab-button ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            📊 All Transactions
          </button>
          <button 
            className={`tab-button ${activeTab === 'withdrawals' ? 'active' : ''}`}
            onClick={() => setActiveTab('withdrawals')}
          >
            💸 Withdrawal Requests
          </button>
        </div>

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="tab-content">
            <div className="transactions-table-container">
              {loading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>Loading transactions...</p>
                </div>
              ) : (
                <div className="transactions-table">
                  <div className="table-header">
                    <div className="table-cell">Type</div>
                    <div className="table-cell">Currency</div>
                    <div className="table-cell">Amount</div>
                    <div className="table-cell">Status</div>
                    <div className="table-cell">Date</div>
                    <div className="table-cell">Hash</div>
                  </div>
                  
                  {transactions.length > 0 ? (
                    transactions.map((transaction) => (
                      <div key={transaction.id} className="table-row">
                        <div className="table-cell">
                          <div className="transaction-type">
                            <span className="type-icon">
                              {getTransactionIcon(transaction.type, transaction.currency)}
                            </span>
                            <span className="type-text">{transaction.type}</span>
                          </div>
                        </div>
                        <div className="table-cell">
                          <span className="currency-badge">{transaction.currency}</span>
                        </div>
                        <div className="table-cell">
                          <span className="amount-text">
                            {formatAmount(transaction.amount, transaction.currency)}
                          </span>
                        </div>
                        <div className="table-cell">
                          {getStatusBadge(transaction.status)}
                        </div>
                        <div className="table-cell">
                          <span className="date-text">{formatDate(transaction.created_at)}</span>
                        </div>
                        <div className="table-cell">
                          {transaction.transaction_hash ? (
                            <span className="hash-text">
                              {transaction.transaction_hash.substring(0, 10)}...
                            </span>
                          ) : (
                            <span className="no-hash">-</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-data">
                      <div className="no-data-icon">📊</div>
                      <h3>No transactions found</h3>
                      <p>No transactions have been recorded yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Withdrawals Tab */}
        {activeTab === 'withdrawals' && (
          <div className="tab-content">
            <div className="withdrawals-table-container">
              {loading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>Loading withdrawal requests...</p>
                </div>
              ) : (
                <div className="withdrawals-table">
                  <div className="table-header">
                    <div className="table-cell">User</div>
                    <div className="table-cell">Currency</div>
                    <div className="table-cell">Amount</div>
                    <div className="table-cell">Fee</div>
                    <div className="table-cell">Net Amount</div>
                    <div className="table-cell">Destination</div>
                    <div className="table-cell">Status</div>
                    <div className="table-cell">Date</div>
                    <div className="table-cell">Actions</div>
                  </div>
                  
                  {withdrawals.length > 0 ? (
                    withdrawals.map((withdrawal) => (
                      <div key={withdrawal.id} className="table-row">
                        <div className="table-cell">
                          <span className="user-id">User #{withdrawal.user_id ? withdrawal.user_id.substring(0, 8) : 'N/A'}</span>
                        </div>
                        <div className="table-cell">
                          <span className="currency-badge">{withdrawal.currency}</span>
                        </div>
                        <div className="table-cell">
                          <span className="amount-text">
                            {formatAmount(withdrawal.amount || 0, withdrawal.currency || 'USD')}
                          </span>
                        </div>
                        <div className="table-cell">
                          <span className="fee-text">
                            {formatAmount(withdrawal.fee || 0, withdrawal.currency || 'USD')}
                          </span>
                        </div>
                        <div className="table-cell">
                          <span className="net-amount-text">
                            {formatAmount(withdrawal.net_amount || 0, withdrawal.currency || 'USD')}
                          </span>
                        </div>
                        <div className="table-cell">
                          <span className="address-text">
                            {withdrawal.destination_address ? withdrawal.destination_address.substring(0, 12) + '...' : 'N/A'}
                          </span>
                        </div>
                        <div className="table-cell">
                          {getStatusBadge(withdrawal.status)}
                        </div>
                        <div className="table-cell">
                          <span className="date-text">{formatDate(withdrawal.created_at)}</span>
                        </div>
                        <div className="table-cell">
                          {withdrawal.status === 'pending' && (
                            <div className="action-buttons">
                              <button 
                                className="action-btn approve-btn"
                                onClick={() => handleApproveWithdrawal(withdrawal.id)}
                                disabled={processingId === withdrawal.id}
                              >
                                {processingId === withdrawal.id ? 'Processing...' : 'Approve'}
                              </button>
                              <button 
                                className="action-btn reject-btn"
                                onClick={() => handleRejectWithdrawal(withdrawal.id)}
                                disabled={processingId === withdrawal.id}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-data">
                      <div className="no-data-icon">💸</div>
                      <h3>No withdrawal requests</h3>
                      <p>No pending withdrawal requests found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="stats-section">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>Total Transactions</h3>
              <p>{transactions.length}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💸</div>
            <div className="stat-content">
              <h3>Pending Withdrawals</h3>
              <p>{withdrawals.filter(w => w.status === 'pending').length}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>Completed Today</h3>
              <p>{transactions.filter(t => t.status === 'completed').length}</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .transactions-management {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .tabs-section {
          display: flex;
          gap: 0.5rem;
          background: linear-gradient(135deg, #2C2C2C, #1A1A1A);
          border: 1px solid #333;
          border-radius: 12px;
          padding: 0.5rem;
        }

        .tab-button {
          flex: 1;
          padding: 1rem 1.5rem;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: #CCCCCC;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .tab-button:hover {
          background: rgba(255, 215, 0, 0.1);
          color: #FFD700;
        }

        .tab-button.active {
          background: linear-gradient(135deg, #FFD700, #FFA500);
          color: #1A1A1A;
          font-weight: 600;
        }

        .tab-content {
          background: linear-gradient(135deg, #2C2C2C, #1A1A1A);
          border: 1px solid #333;
          border-radius: 12px;
          overflow: hidden;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: #CCCCCC;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #333;
          border-top: 3px solid #FFD700;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        .transactions-table,
        .withdrawals-table {
          display: flex;
          flex-direction: column;
        }

        .table-header {
          display: grid;
          gap: 1rem;
          padding: 1rem 1.5rem;
          background: #1A1A1A;
          border-bottom: 1px solid #333;
          font-weight: 600;
          color: #FFD700;
        }

        .transactions-table .table-header {
          grid-template-columns: 1.5fr 1fr 1.5fr 1fr 1.5fr 1.5fr;
        }

        .withdrawals-table .table-header {
          grid-template-columns: 1fr 1fr 1.2fr 1fr 1.2fr 1.5fr 1fr 1.5fr 1.5fr;
        }

        .table-row {
          display: grid;
          gap: 1rem;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #333;
          align-items: center;
          transition: background 0.3s ease;
        }

        .transactions-table .table-row {
          grid-template-columns: 1.5fr 1fr 1.5fr 1fr 1.5fr 1.5fr;
        }

        .withdrawals-table .table-row {
          grid-template-columns: 1fr 1fr 1.2fr 1fr 1.2fr 1.5fr 1fr 1.5fr 1.5fr;
        }

        .table-row:hover {
          background: rgba(255, 215, 0, 0.05);
        }

        .table-row:last-child {
          border-bottom: none;
        }

        .table-cell {
          display: flex;
          align-items: center;
        }

        .transaction-type {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .type-icon {
          font-size: 1.2rem;
        }

        .type-text {
          font-weight: 500;
          color: white;
          text-transform: capitalize;
        }

        .currency-badge {
          background: #333;
          color: #FFD700;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .amount-text {
          color: white;
          font-weight: 500;
        }

        .fee-text {
          color: #FFA500;
          font-weight: 500;
        }

        .net-amount-text {
          color: #4CAF50;
          font-weight: 600;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .date-text {
          color: #CCCCCC;
          font-size: 0.9rem;
        }

        .hash-text {
          color: #4CAF50;
          font-family: monospace;
          font-size: 0.85rem;
        }

        .no-hash {
          color: #666;
          font-style: italic;
        }

        .user-id {
          color: #CCCCCC;
          font-family: monospace;
          font-size: 0.9rem;
        }

        .address-text {
          color: #4CAF50;
          font-family: monospace;
          font-size: 0.85rem;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .approve-btn {
          background: #4CAF50;
          color: white;
        }

        .approve-btn:hover:not(:disabled) {
          background: #45a049;
        }

        .reject-btn {
          background: #f44336;
          color: white;
        }

        .reject-btn:hover:not(:disabled) {
          background: #da190b;
        }

        .no-data {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: #CCCCCC;
          text-align: center;
        }

        .no-data-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .no-data h3 {
          color: #FFD700;
          margin: 0 0 0.5rem 0;
        }

        .no-data p {
          margin: 0;
        }

        .stats-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .stat-card {
          background: linear-gradient(135deg, #2C2C2C, #1A1A1A);
          border: 1px solid #333;
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .stat-icon {
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #FFD700, #FFA500);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          color: #1A1A1A;
        }

        .stat-content h3 {
          font-size: 0.9rem;
          color: #CCCCCC;
          margin: 0 0 0.5rem 0;
          font-weight: 500;
        }

        .stat-content p {
          font-size: 1.8rem;
          font-weight: 700;
          color: #FFD700;
          margin: 0;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .tabs-section {
            flex-direction: column;
          }
          
          .transactions-table .table-header,
          .transactions-table .table-row,
          .withdrawals-table .table-header,
          .withdrawals-table .table-row {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }
          
          .table-cell {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }
          
          .action-buttons {
            flex-direction: column;
          }
          
          .stats-section {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AdminLayout>
  );
}