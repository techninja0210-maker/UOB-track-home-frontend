'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';

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
  transaction_hash?: string;
}

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const loadWithdrawals = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/withdrawals');
      setWithdrawals(response.data || []);
    } catch (error) {
      console.error('Error loading withdrawals:', error);
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      await api.post(`/api/admin/withdrawals/${id}/approve`);
      await loadWithdrawals();
      alert('Withdrawal approved successfully!');
    } catch (error: any) {
      console.error('Error approving withdrawal:', error);
      alert(`Failed to approve withdrawal: ${error.response?.data?.message || 'Unknown error'}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedWithdrawal || !rejectReason.trim()) {
      alert('Please provide a rejection reason.');
      return;
    }

    try {
      setProcessingId(selectedWithdrawal.id);
      await api.post(`/api/admin/withdrawals/${selectedWithdrawal.id}/reject`, {
        reason: rejectReason
      });
      await loadWithdrawals();
      setShowRejectModal(false);
      setSelectedWithdrawal(null);
      setRejectReason('');
      alert('Withdrawal rejected successfully!');
    } catch (error: any) {
      console.error('Error rejecting withdrawal:', error);
      alert(`Failed to reject withdrawal: ${error.response?.data?.message || 'Unknown error'}`);
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setShowRejectModal(true);
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
      approved: { bg: '#4CAF50', color: 'white', text: 'Approved' },
      rejected: { bg: '#f44336', color: 'white', text: 'Rejected' },
      completed: { bg: '#2196F3', color: 'white', text: 'Completed' },
      failed: { bg: '#666', color: 'white', text: 'Failed' }
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

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const completedWithdrawals = withdrawals.filter(w => w.status === 'completed');

  return (
    <AdminLayout title="Withdrawal Management" subtitle="Review and approve withdrawal requests">
      <div className="withdrawals-management">
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">💸</div>
            <div className="stat-content">
              <h3>Pending Withdrawals</h3>
              <p>{pendingWithdrawals.length}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>Completed Today</h3>
              <p>{completedWithdrawals.length}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h3>Total Value</h3>
              <p>${withdrawals.reduce((sum, w) => sum + (w.amount || 0), 0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Withdrawals Table */}
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
                          <span className="amount-text">{formatAmount(withdrawal.amount || 0, withdrawal.currency || 'USD')}</span>
                        </div>
                        <div className="table-cell">
                          <span className="fee-text">{formatAmount(withdrawal.fee || 0, withdrawal.currency || 'USD')}</span>
                        </div>
                        <div className="table-cell">
                          <span className="net-amount-text">{formatAmount(withdrawal.net_amount || 0, withdrawal.currency || 'USD')}</span>
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
                            onClick={() => handleApprove(withdrawal.id)}
                            disabled={processingId === withdrawal.id}
                          >
                            {processingId === withdrawal.id ? 'Processing...' : 'Approve'}
                          </button>
                          <button 
                            className="action-btn reject-btn"
                            onClick={() => openRejectModal(withdrawal)}
                            disabled={processingId === withdrawal.id}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {withdrawal.status === 'completed' && withdrawal.transaction_hash && (
                        <div className="transaction-info">
                          <span className="tx-hash">
                            {withdrawal.transaction_hash.substring(0, 10)}...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-withdrawals">
                  <div className="no-withdrawals-icon">💸</div>
                  <h3>No withdrawal requests</h3>
                  <p>No withdrawal requests found</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3 className="modal-title">Reject Withdrawal</h3>
              <p className="modal-subtitle">
                Reject withdrawal request for User #{selectedWithdrawal?.user_id?.substring(0, 8)}
              </p>
              
              <div className="form-group">
                <label className="form-label">Rejection Reason</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="form-textarea"
                  placeholder="Please provide a reason for rejecting this withdrawal..."
                  rows={4}
                />
              </div>
              
              <div className="modal-actions">
                <button 
                  className="action-btn cancel-btn"
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedWithdrawal(null);
                    setRejectReason('');
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="action-btn confirm-reject-btn"
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || processingId === selectedWithdrawal?.id}
                >
                  {processingId === selectedWithdrawal?.id ? 'Processing...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .withdrawals-management {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .stats-grid {
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

        .withdrawals-table-container {
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

        .withdrawals-table {
          display: flex;
          flex-direction: column;
        }

        .table-header {
          display: grid;
          grid-template-columns: 1fr 1fr 1.2fr 1fr 1.2fr 1.5fr 1fr 1.5fr 1.5fr;
          gap: 1rem;
          padding: 1rem 1.5rem;
          background: #1A1A1A;
          border-bottom: 1px solid #333;
          font-weight: 600;
          color: #FFD700;
        }

        .table-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1.2fr 1fr 1.2fr 1.5fr 1fr 1.5fr 1.5fr;
          gap: 1rem;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #333;
          align-items: center;
          transition: background 0.3s ease;
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

        .user-id {
          color: #CCCCCC;
          font-family: monospace;
          font-size: 0.9rem;
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

        .address-text {
          color: #4CAF50;
          font-family: monospace;
          font-size: 0.85rem;
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

        .transaction-info {
          display: flex;
          align-items: center;
        }

        .tx-hash {
          color: #4CAF50;
          font-family: monospace;
          font-size: 0.85rem;
        }

        .no-withdrawals {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: #CCCCCC;
          text-align: center;
        }

        .no-withdrawals-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .no-withdrawals h3 {
          color: #FFD700;
          margin: 0 0 0.5rem 0;
        }

        .no-withdrawals p {
          margin: 0;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: linear-gradient(135deg, #2C2C2C, #1A1A1A);
          border: 1px solid #333;
          border-radius: 12px;
          padding: 2rem;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal-title {
          color: #FFD700;
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .modal-subtitle {
          color: #CCCCCC;
          margin: 0 0 2rem 0;
          font-size: 1rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: block;
          color: #CCCCCC;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }

        .form-textarea {
          width: 100%;
          padding: 0.75rem 1rem;
          background: #1A1A1A;
          border: 1px solid #444;
          border-radius: 8px;
          color: white;
          font-size: 1rem;
          resize: vertical;
          min-height: 100px;
        }

        .form-textarea:focus {
          outline: none;
          border-color: #FFD700;
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }

        .cancel-btn {
          background: #666;
          color: white;
        }

        .cancel-btn:hover {
          background: #777;
        }

        .confirm-reject-btn {
          background: #f44336;
          color: white;
        }

        .confirm-reject-btn:hover:not(:disabled) {
          background: #da190b;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
          
          .table-header,
          .table-row {
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
          
          .modal-content {
            margin: 1rem;
            width: calc(100% - 2rem);
          }
          
          .modal-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </AdminLayout>
  );
}