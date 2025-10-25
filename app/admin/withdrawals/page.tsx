'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { getTransactionUrl } from '@/lib/blockchain';

interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

interface WithdrawalRequest {
  id: number;
  userId: number;
  currency: string;
  amount: number;
  destinationAddress: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  adminId?: number;
  adminNotes?: string;
  transactionHash?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  fullName?: string;
  email?: string;
  phone?: string;
}

export default function AdminWithdrawalsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuthentication();
    loadWithdrawals();
    loadStats();
  }, [selectedStatus]);

  const checkAuthentication = async () => {
    const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
    
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await api.get('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const userData = response.data.user;
      
      if (userData.role !== 'admin') {
        router.push('/');
        return;
      }
      
      setUser(userData);
    } catch (error) {
      console.error('Authentication error:', error);
      Cookies.remove('authToken');
      sessionStorage.removeItem('authToken');
      router.push('/login');
    }
  };

  const loadWithdrawals = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      const params = selectedStatus ? `?status=${selectedStatus}` : '';
      const response = await api.get(`/api/withdrawals/admin${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWithdrawals(response.data.data || []);
    } catch (error) {
      console.error('Error loading withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      const response = await api.get('/api/withdrawals/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleApprove = async (withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal);
    setAdminNotes('');
    setShowModal(true);
  };

  const handleReject = async (withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal);
    setAdminNotes('');
    setShowModal(true);
  };

  const handleComplete = async (withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal);
    setTransactionHash('');
    setAdminNotes('');
    setShowModal(true);
  };

  const submitAction = async (action: 'approve' | 'reject' | 'complete') => {
    if (!selectedWithdrawal) return;

    setActionLoading(true);
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      
      if (action === 'complete') {
        await api.post(`/api/withdrawals/admin/${selectedWithdrawal.id}/complete`, {
          transactionHash: transactionHash
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await api.post(`/api/withdrawals/admin/${selectedWithdrawal.id}/${action}`, {
          adminNotes: adminNotes
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setShowModal(false);
      setSelectedWithdrawal(null);
      setAdminNotes('');
      setTransactionHash('');
      loadWithdrawals();
      loadStats();
    } catch (error) {
      console.error(`Error ${action}ing withdrawal:`, error);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'failed': return 'error';
      case 'pending': return 'warning';
      default: return 'neutral';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };


  return (
    <AdminLayout title="Withdrawal Management" subtitle="Manage user withdrawal requests">
      <div className="admin-withdrawals">
        {/* Stats Cards */}
        {stats && (
          <div className="stats-grid">
            {stats.map((stat: any) => (
              <div key={stat.status} className="stat-card">
                <div className="stat-value">{stat.count}</div>
                <div className="stat-label">{stat.status.toUpperCase()}</div>
                <div className="stat-amount">
                  {stat.total_amount ? `${stat.total_amount} ${stat.currency || ''}` : '-'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-group">
            <label>Filter by Status:</label>
            <select 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <button 
            className="btn-refresh"
            onClick={() => {
              loadWithdrawals();
              loadStats();
            }}
          >
            🔄 Refresh
          </button>
        </div>

        {/* Withdrawals Table */}
        <div className="withdrawals-table-container">
          <table className="withdrawals-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Currency</th>
                <th>Amount</th>
                <th>Destination</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center">
                    No withdrawal requests found
                  </td>
                </tr>
              ) : (
                withdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id}>
                    <td>#{withdrawal.id}</td>
                    <td>
                      <div className="user-info">
                        <div className="user-name">{withdrawal.fullName || 'Unknown User'}</div>
                        <div className="user-email">{withdrawal.email || `User ID: ${withdrawal.userId}`}</div>
                      </div>
                    </td>
                    <td>{withdrawal.currency}</td>
                    <td>{withdrawal.amount}</td>
                    <td className="truncate" title={withdrawal.destinationAddress}>
                      {truncateAddress(withdrawal.destinationAddress)}
                    </td>
                    <td>
                      <span className={`status-pill ${getStatusColor(withdrawal.status)}`}>
                        {withdrawal.status}
                      </span>
                    </td>
                    <td>{formatDate(withdrawal.createdAt)}</td>
                    <td>
                      <div className="action-buttons">
                        {withdrawal.status === 'pending' && (
                          <>
                            <button 
                              className="btn-approve"
                              onClick={() => handleApprove(withdrawal)}
                            >
                              ✓ Approve
                            </button>
                            <button 
                              className="btn-reject"
                              onClick={() => handleReject(withdrawal)}
                            >
                              ✗ Reject
                            </button>
                          </>
                        )}
                        {withdrawal.status === 'approved' && (
                          <button 
                            className="btn-complete"
                            onClick={() => handleComplete(withdrawal)}
                          >
                            ✓ Complete
                          </button>
                        )}
                        {withdrawal.transactionHash && (
                          <a 
                            href={getTransactionUrl(withdrawal.transactionHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-view-tx"
                          >
                            🔗 View TX
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Action Modal */}
        {showModal && selectedWithdrawal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  {selectedWithdrawal.status === 'pending' ? 'Approve/Reject' : 'Complete'} 
                  Withdrawal #{selectedWithdrawal.id}
                </h2>
                <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="withdrawal-details">
                  <p><strong>User:</strong> {selectedWithdrawal.fullName || 'Unknown User'} ({selectedWithdrawal.email || `User ID: ${selectedWithdrawal.userId}`})</p>
                  <p><strong>Amount:</strong> {selectedWithdrawal.amount} {selectedWithdrawal.currency}</p>
                  <p><strong>Destination:</strong> {selectedWithdrawal.destinationAddress}</p>
                </div>

                <div className="form-group">
                  <label>Admin Notes:</label>
                  <textarea 
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this action..."
                    className="form-textarea"
                    rows={3}
                  />
                </div>

                {selectedWithdrawal.status === 'approved' && (
                  <div className="form-group">
                    <label>Transaction Hash:</label>
                    <input 
                      type="text"
                      value={transactionHash}
                      onChange={(e) => setTransactionHash(e.target.value)}
                      placeholder="Enter blockchain transaction hash"
                      className="form-input"
                    />
                  </div>
                )}

                <div className="modal-actions">
                  {selectedWithdrawal.status === 'pending' && (
                    <>
                      <button 
                        className="btn-approve"
                        onClick={() => submitAction('approve')}
                        disabled={actionLoading}
                      >
                        {actionLoading ? 'Processing...' : '✓ Approve'}
                      </button>
                      <button 
                        className="btn-reject"
                        onClick={() => submitAction('reject')}
                        disabled={actionLoading}
                      >
                        {actionLoading ? 'Processing...' : '✗ Reject'}
                      </button>
                    </>
                  )}
                  {selectedWithdrawal.status === 'approved' && (
                    <button 
                      className="btn-complete"
                      onClick={() => submitAction('complete')}
                      disabled={actionLoading || !transactionHash}
                    >
                      {actionLoading ? 'Processing...' : '✓ Complete Transaction'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .admin-withdrawals {
          padding: 20px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          text-align: center;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: bold;
          color: #2563eb;
        }

        .stat-label {
          color: #6b7280;
          margin: 5px 0;
        }

        .stat-amount {
          color: #059669;
          font-weight: 500;
        }

        .filters-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 15px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .filter-select {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
        }

        .btn-refresh {
          padding: 8px 16px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .withdrawals-table-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          overflow: hidden;
        }

        .withdrawals-table {
          width: 100%;
          border-collapse: collapse;
        }

        .withdrawals-table th,
        .withdrawals-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }

        .withdrawals-table th {
          background: #f9fafb;
          font-weight: 600;
        }

        .user-info {
          display: flex;
          flex-direction: column;
        }

        .user-name {
          font-weight: 500;
        }

        .user-email {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .status-pill {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
        }

        .status-pill.success {
          background: #dcfce7;
          color: #166534;
        }

        .status-pill.error {
          background: #fef2f2;
          color: #dc2626;
        }

        .status-pill.warning {
          background: #fef3c7;
          color: #d97706;
        }

        .status-pill.neutral {
          background: #f3f4f6;
          color: #6b7280;
        }

        .action-buttons {
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
        }

        .btn-approve, .btn-complete {
          padding: 4px 8px;
          background: #059669;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.75rem;
          cursor: pointer;
        }

        .btn-reject {
          padding: 4px 8px;
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.75rem;
          cursor: pointer;
        }

        .btn-view-tx {
          padding: 4px 8px;
          background: #2563eb;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          font-size: 0.75rem;
        }

        .truncate {
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
        }

        .modal-body {
          padding: 20px;
        }

        .withdrawal-details {
          background: #f9fafb;
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 20px;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }

        .form-textarea, .form-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-family: inherit;
        }

        .form-textarea {
          resize: vertical;
        }

        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .modal-actions button {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }

        .modal-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .text-center {
          text-align: center;
        }

      `}</style>
    </AdminLayout>
  );
}