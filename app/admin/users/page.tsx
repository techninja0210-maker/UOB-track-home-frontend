'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  last_login: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/users');
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      // Mock data for development
      setUsers([
        {
          id: '1',
          full_name: 'Admin User',
          email: 'admin@uobsecurity.com',
          role: 'admin',
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const fullName = user.full_name || '';
    const email = user.email || '';
    const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getRoleBadge = (role: string) => {
    const roleStyles = {
      admin: { bg: '#FFD700', color: '#1A1A1A', text: 'Admin' },
      user: { bg: '#4CAF50', color: 'white', text: 'User' }
    };
    
    const style = roleStyles[role as keyof typeof roleStyles] || roleStyles.user;
    
    return (
      <span 
        className="role-badge"
        style={{ backgroundColor: style.bg, color: style.color }}
      >
        {style.text}
      </span>
    );
  };

  return (
    <AdminLayout title="User Management" subtitle="Manage platform users and their roles">
      <div className="users-management">
        {/* Filters */}
        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <div className="search-icon">🔍</div>
          </div>
          
          <div className="filter-select">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="role-filter"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="users-table-container">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading users...</p>
            </div>
          ) : (
            <div className="users-table">
              <div className="table-header">
                <div className="table-cell">Name</div>
                <div className="table-cell">Email</div>
                <div className="table-cell">Role</div>
                <div className="table-cell">Joined</div>
                <div className="table-cell">Last Login</div>
                <div className="table-cell">Actions</div>
              </div>
              
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <div key={user.id} className="table-row">
                    <div className="table-cell">
                      <div className="user-info">
                        <div className="user-avatar">👤</div>
                        <span className="user-name">{user.full_name || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="table-cell">
                      <span className="user-email">{user.email || 'N/A'}</span>
                    </div>
                    <div className="table-cell">
                      {getRoleBadge(user.role)}
                    </div>
                    <div className="table-cell">
                      <span className="date-text">{formatDate(user.created_at)}</span>
                    </div>
                    <div className="table-cell">
                      <span className="date-text">{formatDate(user.last_login)}</span>
                    </div>
                    <div className="table-cell">
                      <div className="action-buttons">
                        <button className="action-btn edit-btn">Edit</button>
                        <button className="action-btn delete-btn">Delete</button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-users">
                  <div className="no-users-icon">👥</div>
                  <h3>No users found</h3>
                  <p>No users match your current search criteria</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="users-stats">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <h3>Total Users</h3>
              <p>{users.length}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👑</div>
            <div className="stat-content">
              <h3>Admins</h3>
              <p>{users.filter(u => u.role === 'admin').length}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👤</div>
            <div className="stat-content">
              <h3>Regular Users</h3>
              <p>{users.filter(u => u.role === 'user').length}</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .users-management {
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

        .role-filter {
          width: 100%;
          padding: 0.75rem 1rem;
          background: #1A1A1A;
          border: 1px solid #444;
          border-radius: 8px;
          color: white;
          font-size: 1rem;
        }

        .role-filter:focus {
          outline: none;
          border-color: #FFD700;
        }

        .users-table-container {
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

        .users-table {
          display: flex;
          flex-direction: column;
        }

        .table-header {
          display: grid;
          grid-template-columns: 2fr 2fr 1fr 1fr 1fr 1.5fr;
          gap: 1rem;
          padding: 1rem 1.5rem;
          background: #1A1A1A;
          border-bottom: 1px solid #333;
          font-weight: 600;
          color: #FFD700;
        }

        .table-row {
          display: grid;
          grid-template-columns: 2fr 2fr 1fr 1fr 1fr 1.5fr;
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

        .user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          background: #FFD700;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1A1A1A;
          font-weight: bold;
        }

        .user-name {
          font-weight: 500;
          color: white;
        }

        .user-email {
          color: #CCCCCC;
        }

        .role-badge {
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

        .edit-btn {
          background: #4CAF50;
          color: white;
        }

        .edit-btn:hover {
          background: #45a049;
        }

        .delete-btn {
          background: #f44336;
          color: white;
        }

        .delete-btn:hover {
          background: #da190b;
        }

        .no-users {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: #CCCCCC;
          text-align: center;
        }

        .no-users-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .no-users h3 {
          color: #FFD700;
          margin: 0 0 0.5rem 0;
        }

        .no-users p {
          margin: 0;
        }

        .users-stats {
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
          
          .users-stats {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AdminLayout>
  );
}