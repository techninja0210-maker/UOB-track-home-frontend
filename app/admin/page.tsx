'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';

interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

interface KPIData {
  totalUsers: number;
  totalGold: number;
  totalCryptoVolume: number;
  systemStatus: string;
}

interface ChartData {
  date: string;
  value: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  value: string;
  timestamp: string;
}

export default function AdminDashboard() {
  const [kpiData, setKpiData] = useState<KPIData>({
    totalUsers: 0,
    totalGold: 0,
    totalCryptoVolume: 0,
    systemStatus: 'Active'
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [selectedChartPeriod, setSelectedChartPeriod] = useState('7 Days');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load KPI data
      const kpiResponse = await api.get('/api/admin/kpis');
      if (kpiResponse.data) {
        setKpiData(kpiResponse.data);
      }

      // Load chart data
      const chartResponse = await api.get('/api/admin/chart-data');
      if (chartResponse.data) {
        setChartData(chartResponse.data);
      }

      // Load recent activities
      const activitiesResponse = await api.get('/api/admin/recent-activities');
      if (activitiesResponse.data) {
        setRecentActivities(activitiesResponse.data);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set mock data if API fails
      setKpiData({
        totalUsers: 1,
        totalGold: 0,
        totalCryptoVolume: 0,
        systemStatus: 'Active'
      });
      setRecentActivities([
        {
          id: '1',
          type: 'user',
          description: 'Admin user logged in',
          value: '',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user': return '👤';
      case 'transaction': return '💰';
      case 'gold': return '🏆';
      case 'crypto': return '₿';
      default: return '📊';
    }
  };

  return (
    <AdminLayout title="Admin Dashboard" subtitle="Overview of your platform">
      <div className="admin-dashboard-content">
        {/* KPI Cards */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon">👥</div>
            <div className="kpi-content">
              <h3 className="kpi-title">Total Users</h3>
              <p className="kpi-value">{kpiData.totalUsers}</p>
            </div>
          </div>
          
          <div className="kpi-card">
            <div className="kpi-icon">🏆</div>
            <div className="kpi-content">
              <h3 className="kpi-title">Gold Holdings</h3>
              <p className="kpi-value">{kpiData.totalGold.toFixed(4)} oz</p>
            </div>
          </div>
          
          <div className="kpi-card">
            <div className="kpi-icon">₿</div>
            <div className="kpi-content">
              <h3 className="kpi-title">Crypto Volume</h3>
              <p className="kpi-value">${kpiData.totalCryptoVolume.toFixed(2)}</p>
            </div>
          </div>
          
          <div className="kpi-card">
            <div className="kpi-icon">🟢</div>
            <div className="kpi-content">
              <h3 className="kpi-title">System Status</h3>
              <p className="kpi-value">{kpiData.systemStatus}</p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-section">
          <div className="section-header">
            <h2 className="section-title">Platform Analytics</h2>
            <div className="chart-period-selector">
              <select 
                value={selectedChartPeriod} 
                onChange={(e) => setSelectedChartPeriod(e.target.value)}
                className="period-select"
              >
                <option value="7 Days">Last 7 Days</option>
                <option value="30 Days">Last 30 Days</option>
                <option value="90 Days">Last 90 Days</option>
              </select>
            </div>
          </div>
          
          <div className="chart-container">
            <div className="chart-placeholder">
              <div className="chart-icon">📊</div>
              <h3>Analytics Chart</h3>
              <p>Chart data will be displayed here</p>
              <div className="mock-chart">
                <div className="chart-bar" style={{height: '60%'}}></div>
                <div className="chart-bar" style={{height: '80%'}}></div>
                <div className="chart-bar" style={{height: '40%'}}></div>
                <div className="chart-bar" style={{height: '90%'}}></div>
                <div className="chart-bar" style={{height: '70%'}}></div>
                <div className="chart-bar" style={{height: '85%'}}></div>
                <div className="chart-bar" style={{height: '95%'}}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="activities-section">
          <h2 className="section-title">Recent Activities</h2>
          <div className="activities-list">
            {loading ? (
              <div className="loading-placeholder">
                <div className="loading-spinner"></div>
                <p>Loading activities...</p>
              </div>
            ) : recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-icon">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="activity-content">
                    <p className="activity-description">{activity.description}</p>
                    <p className="activity-timestamp">{formatTimestamp(activity.timestamp)}</p>
                  </div>
                  {activity.value && (
                    <div className="activity-value">{activity.value}</div>
                  )}
                </div>
              ))
            ) : (
              <div className="no-activities">
                <p>No recent activities found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .admin-dashboard-content {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .kpi-card {
          background: linear-gradient(135deg, #2C2C2C, #1A1A1A);
          border: 1px solid #333;
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: all 0.3s ease;
        }

        .kpi-card:hover {
          border-color: #FFD700;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(255, 215, 0, 0.1);
        }

        .kpi-icon {
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

        .kpi-content {
          flex: 1;
        }

        .kpi-title {
          font-size: 0.9rem;
          color: #CCCCCC;
          margin: 0 0 0.5rem 0;
          font-weight: 500;
        }

        .kpi-value {
          font-size: 1.8rem;
          font-weight: 700;
          color: #FFD700;
          margin: 0;
        }

        .charts-section {
          background: linear-gradient(135deg, #2C2C2C, #1A1A1A);
          border: 1px solid #333;
          border-radius: 12px;
          padding: 2rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #FFD700;
          margin: 0;
        }

        .chart-period-selector {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .period-select {
          background: #1A1A1A;
          border: 1px solid #444;
          border-radius: 6px;
          color: white;
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
        }

        .chart-container {
          height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chart-placeholder {
          text-align: center;
          color: #CCCCCC;
        }

        .chart-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .chart-placeholder h3 {
          color: #FFD700;
          margin: 0 0 0.5rem 0;
        }

        .chart-placeholder p {
          margin: 0 0 2rem 0;
        }

        .mock-chart {
          display: flex;
          align-items: end;
          gap: 0.5rem;
          height: 120px;
          padding: 1rem;
        }

        .chart-bar {
          flex: 1;
          background: linear-gradient(to top, #FFD700, #FFA500);
          border-radius: 4px 4px 0 0;
          min-height: 20px;
        }

        .activities-section {
          background: linear-gradient(135deg, #2C2C2C, #1A1A1A);
          border: 1px solid #333;
          border-radius: 12px;
          padding: 2rem;
        }

        .activities-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .activity-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #1A1A1A;
          border-radius: 8px;
          border: 1px solid #333;
          transition: all 0.3s ease;
        }

        .activity-item:hover {
          border-color: #444;
          background: #222;
        }

        .activity-icon {
          width: 40px;
          height: 40px;
          background: #333;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
        }

        .activity-content {
          flex: 1;
        }

        .activity-description {
          color: white;
          margin: 0 0 0.25rem 0;
          font-weight: 500;
        }

        .activity-timestamp {
          color: #CCCCCC;
          font-size: 0.85rem;
          margin: 0;
        }

        .activity-value {
          color: #FFD700;
          font-weight: 600;
        }

        .loading-placeholder {
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

        .no-activities {
          text-align: center;
          padding: 3rem;
          color: #CCCCCC;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .kpi-grid {
            grid-template-columns: 1fr;
          }
          
          .section-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }
          
          .chart-container {
            height: 200px;
          }
          
          .mock-chart {
            height: 80px;
          }
        }
      `}</style>
    </AdminLayout>
  );
}