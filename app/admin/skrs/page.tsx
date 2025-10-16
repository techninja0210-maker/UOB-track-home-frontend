'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';

interface SKR {
  id: string;
  user_id: string;
  skr_number: string;
  gold_weight: number;
  gold_purity: number;
  storage_location: string;
  status: string;
  created_at: string;
  expiry_date: string;
}

export default function AdminSKRs() {
  const [skrs, setSkrs] = useState<SKR[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadSKRs();
  }, []);

  const loadSKRs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/skrs');
      setSkrs(response.data || []);
    } catch (error) {
      console.error('Error loading SKRs:', error);
      setSkrs([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredSKRs = skrs.filter(skr => {
    const skrNumber = skr.skr_number || '';
    const userId = skr.user_id || '';
    const storageLocation = skr.storage_location || '';
    const matchesSearch = skrNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         storageLocation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (skr.status || 'pending') === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatWeight = (weight: number) => {
    return `${weight.toFixed(4)} oz`;
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      active: { bg: '#4CAF50', color: 'white', text: 'Active' },
      expired: { bg: '#f44336', color: 'white', text: 'Expired' },
      redeemed: { bg: '#9C27B0', color: 'white', text: 'Redeemed' },
      suspended: { bg: '#FFA500', color: 'white', text: 'Suspended' },
      pending: { bg: '#666', color: 'white', text: 'Pending' }
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

  const getPurityBadge = (purity: number) => {
    if (purity >= 99.9) {
      return { bg: '#FFD700', color: '#1A1A1A', text: `${purity}%` };
    } else if (purity >= 99.0) {
      return { bg: '#FFA500', color: 'white', text: `${purity}%` };
    } else {
      return { bg: '#666', color: 'white', text: `${purity}%` };
    }
  };

  const isExpiringSoon = (expiryDate: string) => {
    if (!expiryDate) return false;
    try {
      const expiry = new Date(expiryDate);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    } catch (error) {
      return false;
    }
  };

    return (
    <AdminLayout title="SKR Management" subtitle="Manage Storage Keeping Receipts">
      <div className="skrs-management">
        {/* Filters */}
        <div className="filters-section">
          <div className="search-box">
                <input 
                  type="text" 
              placeholder="Search SKRs..."
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
              <option value="suspended">Suspended</option>
                </select>
              </div>
              </div>

        {/* SKRs Table */}
        <div className="skrs-table-container">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading SKRs...</p>
            </div>
          ) : (
            <div className="skrs-table">
              <div className="table-header">
                <div className="table-cell">SKR #</div>
                <div className="table-cell">User</div>
                <div className="table-cell">Gold Weight</div>
                <div className="table-cell">Purity</div>
                <div className="table-cell">Storage</div>
                <div className="table-cell">Status</div>
                <div className="table-cell">Expiry</div>
                <div className="table-cell">Actions</div>
          </div>

              {filteredSKRs.length > 0 ? (
                filteredSKRs.map((skr) => (
                  <div key={skr.id} className="table-row">
                    <div className="table-cell">
                      <span className="skr-number">#{skr.skr_number || 'N/A'}</span>
          </div>
                    <div className="table-cell">
                      <span className="user-id">User #{skr.user_id ? skr.user_id.substring(0, 8) : 'N/A'}</span>
          </div>
                    <div className="table-cell">
                      <span className="gold-weight">{formatWeight(skr.gold_weight || 0)}</span>
        </div>
                    <div className="table-cell">
                      {(() => {
                        const purityStyle = getPurityBadge(skr.gold_purity || 99.9);
                        return (
                          <span 
                            className="purity-badge"
                            style={{ backgroundColor: purityStyle.bg, color: purityStyle.color }}
                          >
                            {purityStyle.text}
                          </span>
                        );
                      })()}
      </div>
                    <div className="table-cell">
                      <span className="storage-location">{skr.storage_location || 'N/A'}</span>
            </div>
                    <div className="table-cell">
                      {getStatusBadge(skr.status || 'pending')}
                    </div>
                    <div className="table-cell">
                      <span className={`expiry-date ${isExpiringSoon(skr.expiry_date) ? 'expiring-soon' : ''}`}>
                        {formatDate(skr.expiry_date || '')}
                        {isExpiringSoon(skr.expiry_date || '') && (
                          <span className="expiry-warning">⚠️</span>
                        )}
                      </span>
                  </div>
                    <div className="table-cell">
                      <div className="action-buttons">
                        <button className="action-btn view-btn">View</button>
                        <button className="action-btn edit-btn">Edit</button>
                        <button className="action-btn renew-btn">Renew</button>
                </div>
              </div>
                  </div>
                ))
              ) : (
                <div className="no-skrs">
                  <div className="no-skrs-icon">📋</div>
                  <h3>No SKRs found</h3>
                  <p>No SKRs match your current search criteria</p>
                  </div>
              )}
                  </div>
          )}
                </div>

        {/* Stats */}
        <div className="skrs-stats">
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <h3>Total SKRs</h3>
              <p>{skrs.length}</p>
                  </div>
                  </div>
          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-content">
              <h3>Total Gold Weight</h3>
              <p>{skrs.reduce((sum, skr) => sum + (skr.gold_weight || 0), 0).toFixed(4)} oz</p>
                  </div>
                  </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>Active SKRs</h3>
              <p>{skrs.filter(skr => (skr.status || 'pending') === 'active').length}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚠️</div>
            <div className="stat-content">
              <h3>Expiring Soon</h3>
              <p>{skrs.filter(skr => isExpiringSoon(skr.expiry_date || '')).length}</p>
            </div>
          </div>
              </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h3 className="actions-title">Quick Actions</h3>
          <div className="actions-grid">
            <button className="quick-action-btn">
              <div className="action-icon">➕</div>
              <span>Create New SKR</span>
                  </button>
            <button className="quick-action-btn">
              <div className="action-icon">📊</div>
              <span>Generate Report</span>
              </button>
            <button className="quick-action-btn">
              <div className="action-icon">📧</div>
              <span>Send Notifications</span>
            </button>
            <button className="quick-action-btn">
              <div className="action-icon">🔄</div>
              <span>Bulk Renewal</span>
              </button>
            </div>
          </div>
        </div>

      <style jsx>{`
        .skrs-management {
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

        .skrs-table-container {
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

        .skrs-table {
          display: flex;
          flex-direction: column;
        }

        .table-header {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1fr 1.5fr 1fr 1.5fr 1.5fr;
          gap: 1rem;
          padding: 1rem 1.5rem;
          background: #1A1A1A;
          border-bottom: 1px solid #333;
          font-weight: 600;
          color: #FFD700;
        }

        .table-row {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1fr 1.5fr 1fr 1.5fr 1.5fr;
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

        .skr-number {
          color: #FFD700;
          font-weight: 600;
          font-family: monospace;
        }

        .user-id {
          color: #CCCCCC;
          font-family: monospace;
          font-size: 0.9rem;
        }

        .gold-weight {
          color: #4CAF50;
          font-weight: 500;
        }

        .purity-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .storage-location {
          color: #CCCCCC;
          font-size: 0.9rem;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .expiry-date {
          color: #CCCCCC;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .expiry-date.expiring-soon {
          color: #FFA500;
          font-weight: 600;
        }

        .expiry-warning {
          font-size: 1rem;
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

        .renew-btn {
          background: #FFA500;
          color: white;
        }

        .renew-btn:hover {
          background: #e6940a;
        }

        .no-skrs {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: #CCCCCC;
          text-align: center;
        }

        .no-skrs-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .no-skrs h3 {
          color: #FFD700;
          margin: 0 0 0.5rem 0;
        }

        .no-skrs p {
          margin: 0;
        }

        .skrs-stats {
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

        .quick-actions {
          background: linear-gradient(135deg, #2C2C2C, #1A1A1A);
          border: 1px solid #333;
          border-radius: 12px;
          padding: 2rem;
        }

        .actions-title {
          color: #FFD700;
          margin: 0 0 1.5rem 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .quick-action-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          padding: 1.5rem;
          background: #1A1A1A;
          border: 1px solid #444;
          border-radius: 8px;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .quick-action-btn:hover {
          border-color: #FFD700;
          background: rgba(255, 215, 0, 0.1);
          transform: translateY(-2px);
        }

        .action-icon {
          font-size: 2rem;
        }

        .quick-action-btn span {
          font-weight: 500;
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

          .skrs-stats {
            grid-template-columns: 1fr;
          }

          .actions-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AdminLayout>
  );
}