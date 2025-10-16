'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import Cookies from 'js-cookie';

interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

interface SKRRecord {
  id: string;
  referenceNumber: string;
  goldAmount: number;
  purchaseDate: string;
  purchasePrice: number;
  currentPrice: number;
  profitLoss: number;
  profitLossPercent: number;
  status: 'holding' | 'sold' | 'pending';
  checked: boolean;
}

export default function SKRsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [skrRecords, setSkrRecords] = useState<SKRRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [selectedSKR, setSelectedSKR] = useState<SKRRecord | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const router = useRouter();

  useEffect(() => {
    checkAuthentication();
    loadSKRData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.user-profile')) {
        setShowProfileDropdown(false);
      }
    };

    if (showProfileDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

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
      
      // Redirect admin users to admin panel
      if (userData.role === 'admin') {
        router.push('/admin');
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

  const loadSKRData = async () => {
    try {
      // Load SKR data from backend
      const response = await api.get('/api/skrs');
      const holdings = response.data || [];
      
      // Transform to SKR records format
      const records: SKRRecord[] = holdings.map((holding: any, index: number) => ({
        id: holding.id || index.toString(),
        referenceNumber: holding.skr_reference || `SKR${(100000 + index).toString().slice(-6)}`,
        goldAmount: parseFloat(holding.weight_grams || 0),
        purchaseDate: new Date(holding.purchase_date || Date.now()).toLocaleDateString(),
        purchasePrice: parseFloat(holding.purchase_price_per_gram || 0),
        currentPrice: parseFloat(holding.current_price_per_gram || 70),
        profitLoss: parseFloat(holding.profit_loss || 0),
        profitLossPercent: parseFloat(holding.profit_loss_percentage || 0),
        status: holding.status || 'holding',
        checked: false
      }));

      setSkrRecords(records);
    } catch (error) {
      console.error('Error loading SKR data:', error);
      // Set fallback mock data
      setSkrRecords([
        {
          id: '1',
          referenceNumber: 'SKR001234',
          goldAmount: 2.5,
          purchaseDate: '2024-01-15',
          purchasePrice: 65.50,
          currentPrice: 70.25,
          profitLoss: 11.88,
          profitLossPercent: 7.25,
          status: 'holding',
          checked: false
        },
        {
          id: '2',
          referenceNumber: 'SKR001235',
          goldAmount: 1.8,
          purchaseDate: '2024-02-20',
          purchasePrice: 68.75,
          currentPrice: 70.25,
          profitLoss: 2.70,
          profitLossPercent: 2.18,
          status: 'holding',
          checked: false
        },
        {
          id: '3',
          referenceNumber: 'SKR001236',
          goldAmount: 3.2,
          purchaseDate: '2024-03-10',
          purchasePrice: 69.20,
          currentPrice: 70.25,
          profitLoss: 3.36,
          profitLossPercent: 1.52,
          status: 'holding',
          checked: false
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      await api.post('/api/auth/logout', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      Cookies.remove('authToken');
      sessionStorage.removeItem('authToken');
      router.push('/login');
    }
  };

  const handleCheckboxChange = (id: string) => {
    setSkrRecords(prev => prev.map(record => 
      record.id === id ? { ...record, checked: !record.checked } : record
    ));
  };

  const handleActionClick = (record: SKRRecord) => {
    setSelectedSKR(record);
    setShowModal(true);
  };

  const handleHold = async () => {
    if (selectedSKR) {
      try {
        await api.post(`/api/skrs/${selectedSKR.id}/hold`);
        setShowModal(false);
        loadSKRData(); // Refresh data
      } catch (error) {
        console.error('Error holding SKR:', error);
      }
    }
  };

  const handleSell = async () => {
    if (selectedSKR) {
      try {
        await api.post(`/api/skrs/${selectedSKR.id}/sell`);
        setShowModal(false);
        loadSKRData(); // Refresh data
      } catch (error) {
        console.error('Error selling SKR:', error);
      }
    }
  };

  const downloadPDF = async () => {
    try {
      const response = await api.get('/api/skrs/pdf', {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'skr-receipts.pdf';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  const filteredRecords = skrRecords.filter(record =>
    record.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.purchaseDate.includes(searchQuery) ||
    record.goldAmount.toString().includes(searchQuery)
  );

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRecords = filteredRecords.slice(startIndex, endIndex);

  if (!user) {
    return (
      <div className="skr-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="skr-page">
      {/* Sidebar Navigation */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">GC</div>
            <span className="logo-text">UOB Security House</span>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <Link href="/" className="nav-item">
            <div className="nav-icon">🏠</div>
            <span>Dashboard</span>
          </Link>
          <Link href="/wallet" className="nav-item">
            <div className="nav-icon">💰</div>
            <span>Wallet</span>
          </Link>
          <Link href="/exchange" className="nav-item">
            <div className="nav-icon">🔁</div>
            <span>Exchange</span>
          </Link>
          <Link href="/skrs" className="nav-item active">
            <div className="nav-icon">📄</div>
            <span>SKRs</span>
          </Link>
          <Link href="/transactions" className="nav-item">
            <div className="nav-icon">📊</div>
            <span>Transactions</span>
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <div className="header">
          <div className="header-left">
            <div className="logo-small">
              <div className="logo-shield">GC</div>
            </div>
            <h1 className="page-title">Cryotrisortionie to Gold</h1>
          </div>
          <div className="header-right">
            <div className="header-icons">
              <div className="icon notification">🔔</div>
              <div className="icon">👤</div>
              <span className="user-text">Design</span>
            </div>
            <div 
              className="user-profile"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            >
              <div className="profile-pic">{user.fullName.charAt(0)}</div>
              <span>{user.fullName}</span>
              <div className="dropdown">▼</div>
              
              {showProfileDropdown && (
                <div className="profile-dropdown">
                  <div className="dropdown-item">
                    <span>👤</span> Profile
                  </div>
                  <div className="dropdown-item">
                    <span>⚙️</span> Settings
                  </div>
                  <div className="dropdown-item">
                    <span>📊</span> Analytics
                  </div>
                  <div className="dropdown-divider"></div>
                  <div className="dropdown-item" onClick={logout}>
                    <span>🚪</span> Logout
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SKR Content */}
        <div className="skr-content">
          {/* Filter and Search */}
          <div className="filter-section">
            <label className="filter-label">Filter</label>
            <div className="search-container">
              <div className="search-icon">🔍</div>
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search SKRs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* SKR Table */}
          <div className="table-container">
            <table className="skr-table">
              <thead>
                <tr>
                  <th className="checkbox-col">
                    <input type="checkbox" className="select-all" />
                  </th>
                  <th>SKR</th>
                  <th>Reference Number</th>
                  <th>Gold Amount</th>
                  <th>Purchase Date</th>
                  <th>Purchase Price</th>
                  <th>Current Price</th>
                  <th>Profit/Loss</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="checkbox-col">
                      <input 
                        type="checkbox" 
                        checked={record.checked}
                        onChange={() => handleCheckboxChange(record.id)}
                      />
                    </td>
                    <td className="skr-col">
                      <div className="skr-badge">SKR</div>
                    </td>
                    <td className="reference-col">{record.referenceNumber}</td>
                    <td className="amount-col">{record.goldAmount.toFixed(3)}g</td>
                    <td className="date-col">{record.purchaseDate}</td>
                    <td className="price-col">${record.purchasePrice.toFixed(2)}</td>
                    <td className="price-col">${record.currentPrice.toFixed(2)}</td>
                    <td className="profit-col">
                      <div className="profit-indicator">
                        <div className={`profit-circle ${record.profitLoss >= 0 ? 'profit' : 'loss'}`}>
                          {record.profitLoss >= 0 ? '✓' : '✗'}
                        </div>
                        <span className={`profit-amount ${record.profitLoss >= 0 ? 'profit' : 'loss'}`}>
                          ${record.profitLoss.toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td className="action-col">
                      <button 
                        className="action-btn"
                        onClick={() => handleActionClick(record)}
                      >
                        Action
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <div className="pagination-info">
              <span>#111112</span>
              <span>#1211 12</span>
            </div>
            <div className="pagination-controls">
              <button 
                className="pagination-btn"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                ←
              </button>
              <button 
                className="pagination-btn"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                →
              </button>
              <div className="pagination-arrow">↕</div>
            </div>
          </div>

          {/* Download PDF Button */}
          <div className="download-section">
            <button className="download-btn" onClick={downloadPDF}>
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Detailed View Modal */}
      {showModal && selectedSKR && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Detailed View Syn lick</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-section">
                <h4 className="modal-subtitle">Gold Price at Purchase</h4>
                <p className="modal-text">${selectedSKR.purchasePrice.toFixed(2)} per gram</p>
              </div>
              <div className="modal-section">
                <h4 className="modal-subtitle">Current Price</h4>
                <p className="modal-text">${selectedSKR.currentPrice.toFixed(2)} per gram</p>
              </div>
              <div className="modal-section">
                <h4 className="modal-subtitle">Profit/Loss Calculation</h4>
                <p className="modal-text">
                  Inter font: in on finibandslal tere afiarantiories norfoliorters clest ccan forrester piluremias, mor financiale texit.
                </p>
                <div className="profit-details">
                  <div className="profit-item">
                    <span>Gold Amount:</span>
                    <span>{selectedSKR.goldAmount.toFixed(3)}g</span>
                  </div>
                  <div className="profit-item">
                    <span>Purchase Value:</span>
                    <span>${(selectedSKR.goldAmount * selectedSKR.purchasePrice).toFixed(2)}</span>
                  </div>
                  <div className="profit-item">
                    <span>Current Value:</span>
                    <span>${(selectedSKR.goldAmount * selectedSKR.currentPrice).toFixed(2)}</span>
                  </div>
                  <div className="profit-item total">
                    <span>Profit/Loss:</span>
                    <span className={selectedSKR.profitLoss >= 0 ? 'profit' : 'loss'}>
                      ${selectedSKR.profitLoss.toFixed(2)} ({selectedSKR.profitLossPercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="hold-btn" onClick={handleHold}>
                Hold
              </button>
              <button className="sell-btn" onClick={handleSell}>
                Sell
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .skr-page {
          display: flex;
          min-height: 100vh;
          background: #1A1A1A;
          color: white;
          font-family: 'Arial', sans-serif;
        }

        .sidebar {
          width: 250px;
          background: #2C2C2C;
          padding: 2rem 0;
          border-right: 1px solid #444;
        }

        .sidebar-header {
          padding: 0 2rem 2rem;
          border-bottom: 1px solid #444;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .logo-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(45deg, #FFD700, #B8860B);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1.2rem;
          color: white;
        }

        .logo-text {
          font-size: 1.1rem;
          font-weight: bold;
          color: #FFD700;
        }

        .sidebar-nav {
          padding: 2rem 0;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 2rem;
          color: white;
          text-decoration: none;
          transition: all 0.3s ease;
          border-left: 4px solid transparent;
        }

        .nav-item:hover {
          background: #3A3A3A;
        }

        .nav-item.active {
          background: linear-gradient(90deg, #00C853, #2C2C2C);
          border-left-color: #00C853;
          color: white;
        }

        .nav-icon {
          font-size: 1.2rem;
          width: 24px;
          text-align: center;
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .header {
          background: #2C2C2C;
          padding: 1rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #444;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .logo-small {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .logo-shield {
          width: 32px;
          height: 32px;
          background: linear-gradient(45deg, #FFD700, #B8860B);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 0.9rem;
          color: white;
        }

        .page-title {
          font-size: 1.5rem;
          font-weight: bold;
          color: #FFD700;
          margin: 0;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-icons {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .icon {
          width: 32px;
          height: 32px;
          background: #3A3A3A;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.3s ease;
          position: relative;
        }

        .icon.notification::after {
          content: '';
          position: absolute;
          top: 5px;
          right: 5px;
          width: 8px;
          height: 8px;
          background: #FF0000;
          border-radius: 50%;
        }

        .icon:hover {
          background: #4A4A4A;
        }

        .user-text {
          color: #888;
          font-size: 0.9rem;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          position: relative;
        }

        .profile-pic {
          width: 32px;
          height: 32px;
          background: #FFD700;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          color: white;
          font-weight: bold;
        }

        .dropdown {
          color: #888;
          font-size: 0.8rem;
        }

        .profile-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          background: #2C2C2C;
          border: 1px solid #444;
          border-radius: 8px;
          padding: 0.5rem 0;
          min-width: 200px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          z-index: 1000;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          color: white;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .dropdown-item:hover {
          background: #3A3A3A;
        }

        .dropdown-item span {
          font-size: 1rem;
        }

        .dropdown-divider {
          height: 1px;
          background: #444;
          margin: 0.5rem 0;
        }

        .skr-content {
          flex: 1;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .filter-section {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .filter-label {
          color: #FFD700;
          font-weight: bold;
          font-size: 1.1rem;
        }

        .search-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          color: #888;
          z-index: 1;
        }

        .search-input {
          background: #3A3A3A;
          border: 1px solid #555;
          border-radius: 8px;
          padding: 0.75rem 1rem 0.75rem 3rem;
          color: white;
          width: 300px;
          font-size: 1rem;
        }

        .search-input::placeholder {
          color: #888;
        }

        .table-container {
          background: #2C2C2C;
          border-radius: 15px;
          padding: 1.5rem;
          border: 1px solid #444;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          overflow-x: auto;
        }

        .skr-table {
          width: 100%;
          border-collapse: collapse;
        }

        .skr-table th,
        .skr-table td {
          padding: 1rem 0.75rem;
          text-align: left;
          border-bottom: 1px solid #444;
        }

        .skr-table th {
          color: #FFD700;
          font-weight: bold;
          font-size: 1rem;
          background: #3A3A3A;
        }

        .skr-table td {
          color: white;
          font-size: 0.9rem;
        }

        .checkbox-col {
          width: 50px;
          text-align: center;
        }

        .select-all {
          width: 18px;
          height: 18px;
          accent-color: #FFD700;
        }

        .skr-badge {
          background: #00C853;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: bold;
          display: inline-block;
        }

        .profit-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .profit-circle {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .profit-circle.profit {
          background: #00C853;
          color: white;
        }

        .profit-circle.loss {
          background: #FF5722;
          color: white;
        }

        .profit-amount.profit {
          color: #00C853;
          font-weight: bold;
        }

        .profit-amount.loss {
          color: #FF5722;
          font-weight: bold;
        }

        .action-btn {
          background: #00C853;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.5rem 1rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .action-btn:hover {
          background: #00E676;
          transform: translateY(-2px);
        }

        .pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 1rem;
        }

        .pagination-info {
          display: flex;
          gap: 1rem;
          color: #888;
          font-size: 0.9rem;
        }

        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .pagination-btn {
          background: #3A3A3A;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.5rem 0.75rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .pagination-btn:hover:not(:disabled) {
          background: #4A4A4A;
        }

        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination-arrow {
          color: #888;
          font-size: 1.2rem;
          margin-left: 0.5rem;
        }

        .download-section {
          display: flex;
          justify-content: center;
          margin-top: 2rem;
        }

        .download-btn {
          background: transparent;
          color: white;
          border: 2px solid #333;
          border-radius: 8px;
          padding: 1rem 2rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .download-btn:hover {
          border-color: #FFD700;
          color: #FFD700;
        }

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
          z-index: 2000;
        }

        .modal-content {
          background: #2C2C2C;
          border-radius: 15px;
          padding: 2rem;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          border: 1px solid #444;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid #444;
          padding-bottom: 1rem;
        }

        .modal-title {
          color: #FFD700;
          font-size: 1.3rem;
          font-weight: bold;
          margin: 0;
        }

        .modal-close {
          background: none;
          border: none;
          color: #888;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-close:hover {
          color: white;
        }

        .modal-section {
          margin-bottom: 1.5rem;
        }

        .modal-subtitle {
          color: #FFD700;
          font-size: 1.1rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }

        .modal-text {
          color: white;
          line-height: 1.6;
          margin-bottom: 1rem;
        }

        .profit-details {
          background: #3A3A3A;
          border-radius: 8px;
          padding: 1rem;
          margin-top: 1rem;
        }

        .profit-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid #444;
        }

        .profit-item:last-child {
          border-bottom: none;
        }

        .profit-item.total {
          font-weight: bold;
          color: #FFD700;
        }

        .modal-footer {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid #444;
        }

        .hold-btn {
          flex: 1;
          background: #FFD700;
          color: #1A1A1A;
          border: none;
          border-radius: 8px;
          padding: 1rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .hold-btn:hover {
          background: #FFE55C;
          transform: translateY(-2px);
        }

        .sell-btn {
          flex: 1;
          background: #00C853;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 1rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .sell-btn:hover {
          background: #00E676;
          transform: translateY(-2px);
        }

        .skr-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #1A1A1A;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #333;
          border-top: 4px solid #FFD700;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Mobile-First Responsive Design */
        @media (max-width: 768px) {
          .skrs-page {
            flex-direction: column;
          }
          
          .sidebar {
            width: 100%;
            height: auto;
            padding: 1rem 0;
            border-right: none;
            border-bottom: 1px solid #444;
          }
          
          .sidebar-nav {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            padding: 1rem 0;
          }
          
          .nav-item {
            padding: 0.75rem 1rem;
            border-left: none;
            border-bottom: 3px solid transparent;
            min-width: 120px;
            justify-content: center;
          }
          
          .nav-item.active {
            background: transparent;
            border-bottom-color: #00C853;
            border-left: none;
          }
          
          .main-content {
            flex: 1;
          }
          
          .header {
            flex-direction: column;
            gap: 1rem;
            padding: 1rem;
          }
          
          .header-left,
          .header-center,
          .header-right {
            width: 100%;
          }
          
          .search-input {
            width: 100%;
          }
          
          .header-icons {
            justify-content: center;
          }
          
          .user-profile {
            justify-content: center;
            margin-top: 1rem;
          }
          
          .skrs-content {
            padding: 1rem;
          }
          
          .skr-table {
            font-size: 0.8rem;
          }

          .modal-content {
            width: 95%;
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
