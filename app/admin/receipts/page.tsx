'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';

interface Receipt {
  id: string;
  user_id: string;
  gold_amount: number;
  gold_price: number;
  total_value: number;
  status: string;
  created_at: string;
  receipt_number: string;
}

export default function AdminReceipts() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/receipts');
      setReceipts(response.data || []);
    } catch (error) {
      console.error('Error loading receipts:', error);
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredReceipts = receipts.filter(receipt => {
    const receiptNumber = receipt.receipt_number || '';
    const userId = receipt.user_id || '';
    const matchesSearch = receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         userId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || receipt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: { bg: '#FFA500', color: 'white', text: 'Pending' },
      active: { bg: '#4CAF50', color: 'white', text: 'Active' },
      expired: { bg: '#f44336', color: 'white', text: 'Expired' },
      redeemed: { bg: '#9C27B0', color: 'white', text: 'Redeemed' }
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

  return (
    <AdminLayout title="Receipt Management" subtitle="Manage and track all gold receipts">
      <div className="receipts-management">
        {/* Filters */}
        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search receipts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <div className="search-icon">🔍</div>
          </div>
          
          <div className="filter-select">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-filter"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="redeemed">Redeemed</option>
            </select>
          </div>
        </div>

        {/* Receipts Table */}
        <div className="receipts-table-container">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading receipts...</p>
            </div>
          ) : (
            <div className="receipts-table">
              <div className="table-header">
                <div className="table-cell">Receipt #</div>
                <div className="table-cell">User</div>
                <div className="table-cell">Gold Amount</div>
                <div className="table-cell">Price per oz</div>
                <div className="table-cell">Total Value</div>
                <div className="table-cell">Status</div>
                <div className="table-cell">Date</div>
                <div className="table-cell">Actions</div>
              </div>
              
              {filteredReceipts.length > 0 ? (
                filteredReceipts.map((receipt) => (
                  <div key={receipt.id} className="table-row">
                    <div className="table-cell">
                      <span className="receipt-number">#{receipt.receipt_number || 'N/A'}</span>
                    </div>
                    <div className="table-cell">
                      <span className="user-id">User #{receipt.user_id ? receipt.user_id.substring(0, 8) : 'N/A'}</span>
                    </div>
                    <div className="table-cell">
                      <span className="gold-amount">{(receipt.gold_amount || 0).toFixed(4)} oz</span>
                    </div>
                    <div className="table-cell">
                      <span className="gold-price">{formatCurrency(receipt.gold_price || 0)}</span>
                    </div>
                    <div className="table-cell">
                      <span className="total-value">{formatCurrency(receipt.total_value || 0)}</span>
                    </div>
                    <div className="table-cell">
                      {getStatusBadge(receipt.status)}
                    </div>
                    <div className="table-cell">
                      <span className="date-text">{formatDate(receipt.created_at)}</span>
                    </div>
                    <div className="table-cell">
                      <div className="action-buttons">
                        <button className="action-btn view-btn">View</button>
                        <button className="action-btn edit-btn">Edit</button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-receipts">
                  <div className="no-receipts-icon">📄</div>
                  <h3>No receipts found</h3>
                  <p>No receipts match your current search criteria</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="receipts-stats">
          <div className="stat-card">
            <div className="stat-icon">📄</div>
            <div className="stat-content">
              <h3>Total Receipts</h3>
              <p>{receipts.length}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-content">
              <h3>Total Gold</h3>
              <p>{receipts.reduce((sum, r) => sum + (r.gold_amount || 0), 0).toFixed(4)} oz</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h3>Total Value</h3>
              <p>{formatCurrency(receipts.reduce((sum, r) => sum + (r.total_value || 0), 0))}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>Active Receipts</h3>
              <p>{receipts.filter(r => r.status === 'active').length}</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .receipts-management {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .filters-section {
          display: flex;
          gap: 1rem;
          align-items: center;
          background: linear-gradient(135deg, #2C2C2C, #1A1A1A);
          border: 1px solid #333;
          border-radius: 12px;
          padding: 1.5rem;
        }

        .search-box {
          position: relative;
          flex: 1;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem 3rem 0.75rem 1rem;
          background: #1A1A1A;
          border: 1px solid #444;
          border-radius: 8px;
          color: white;
          font-size: 1rem;
        }

        .search-input:focus {
          outline: none;
          border-color: #FFD700;
        }

        .search-icon {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #CCCCCC;
        }

        .filter-select {
          min-width: 150px;
        }

        .status-filter {
          width: 100%;
          padding: 0.75rem 1rem;
          background: #1A1A1A;
          border: 1px solid #444;
          border-radius: 8px;
          color: white;
          font-size: 1rem;
        }

        .status-filter:focus {
          outline: none;
          border-color: #FFD700;
        }

        .receipts-table-container {
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

        .receipts-table {
          display: flex;
          flex-direction: column;
        }

        .table-header {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1fr 1.2fr 1fr 1.5fr 1fr;
          gap: 1rem;
          padding: 1rem 1.5rem;
          background: #1A1A1A;
          border-bottom: 1px solid #333;
          font-weight: 600;
          color: #FFD700;
        }

        .table-row {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1fr 1.2fr 1fr 1.5fr 1fr;
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

        .receipt-number {
          color: #FFD700;
          font-weight: 600;
          font-family: monospace;
        }

        .user-id {
          color: #CCCCCC;
          font-family: monospace;
          font-size: 0.9rem;
        }

        .gold-amount {
          color: #4CAF50;
          font-weight: 500;
        }

        .gold-price {
          color: #FFA500;
          font-weight: 500;
        }

        .total-value {
          color: #FFD700;
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

        .view-btn {
          background: #2196F3;
          color: white;
        }

        .view-btn:hover {
          background: #1976D2;
        }

        .edit-btn {
          background: #4CAF50;
          color: white;
        }

        .edit-btn:hover {
          background: #45a049;
        }

        .no-receipts {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: #CCCCCC;
          text-align: center;
        }

        .no-receipts-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .no-receipts h3 {
          color: #FFD700;
          margin: 0 0 0.5rem 0;
        }

        .no-receipts p {
          margin: 0;
        }

        .receipts-stats {
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
          .filters-section {
            flex-direction: column;
            align-items: stretch;
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
          
          .receipts-stats {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AdminLayout>
  );
}