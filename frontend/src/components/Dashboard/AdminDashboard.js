import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const AdminDashboard = () => {
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    doctors: 0,
    patients: 0,
    pendingApprovals: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (!user || user.role !== 'admin') {
          throw new Error('Unauthorized access. Please log in as an admin.');
        }

        // Fetch pending approvals (doctor/nurse)
        try {
          const approvalsRes = await axios.get('/admin/approvals');
          const approvalsData = approvalsRes.data?.data || approvalsRes.data || [];
          setPendingApprovals(Array.isArray(approvalsData) ? approvalsData : []);
        } catch (approvalError) {
          console.error('Error fetching approvals:', approvalError);
          setPendingApprovals([]);
        }

        // Fetch all users for management
        try {
          const usersRes = await axios.get('/admin/users');
          const usersData = usersRes.data?.data || usersRes.data || [];
          const usersList = Array.isArray(usersData) ? usersData : [];
          setUsers(usersList);
          
          // Calculate stats
          const totalUsers = usersList.length;
          const doctors = usersList.filter(u => u.role === 'doctor').length;
          const patients = usersList.filter(u => u.role === 'patient').length;
          const pendingCount = usersList.filter(u => !u.isApproved).length;
          
          setStats({
            totalUsers,
            doctors,
            patients,
            pendingApprovals: pendingCount
          });
          
        } catch (userError) {
          console.error('Error fetching users:', userError);
          setUsers([]);
        }

        setTimeout(() => setLoading(false), 500);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError(error.response?.data?.message || error.message || 'Failed to load dashboard data');
        setLoading(false);
        setPendingApprovals([]);
        setUsers([]);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <h1 className="loading-logo">E-Health</h1>
          <div className="loading-bar"></div>
          <p className="loading-text">Loading Your Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="alert alert-danger">
          <h3>Oops!</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard admin-dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {user.firstName}!</h1>
        <div className="dashboard-date">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Dashboard Summary */}
      <div className="dashboard-summary">
        <div className="summary-card">
          <div className="summary-icon users-icon">
            <i className="fas fa-users"></i>
          </div>
          <div className="summary-content">
            <div className="summary-value">{stats.totalUsers}</div>
            <div className="summary-label">Total Users</div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon doctors-icon">
            <i className="fas fa-user-md"></i>
          </div>
          <div className="summary-content">
            <div className="summary-value">{stats.doctors}</div>
            <div className="summary-label">Doctors</div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon patients-icon">
            <i className="fas fa-procedures"></i>
          </div>
          <div className="summary-content">
            <div className="summary-value">{stats.patients}</div>
            <div className="summary-label">Patients</div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon pending-icon">
            <i className="fas fa-user-clock"></i>
          </div>
          <div className="summary-content">
            <div className="summary-value">{pendingApprovals.length}</div>
            <div className="summary-label">Pending Approvals</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Pending Approvals Card */}
        <div className="dashboard-card pending-approvals">
          <div className="card-header">
            <h2>
              <i className="fas fa-user-check"></i> Pending Approvals
            </h2>
            <Link to="/admin/approvals" className="view-all-link">
              View All <i className="fas fa-chevron-right"></i>
            </Link>
          </div>
          
          {pendingApprovals.length > 0 ? (
            <div className="clean-list">
              {pendingApprovals.slice(0, 3).map(approval => (
                <div key={approval._id} className="list-item">
                  <div className="user-avatar">
                    <i className="fas fa-user"></i>
                  </div>
                  <div className="user-info">
                    <div className="main-info">
                      <div className="user-name">{approval.firstName} {approval.lastName}</div>
                      <div className="user-email">{approval.email}</div>
                    </div>
                    <div className="tags">
                      <span className="role-tag">{approval.role}</span>
                      <span className="status-tag pending">Pending</span>
                    </div>
                  </div>
                  <div className="action-container">
                    <Link to={`/admin/users/${approval._id}`} className="btn-manage">
                      Manage
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <i className="fas fa-check-circle empty-icon"></i>
              <p>No pending approvals at this time.</p>
            </div>
          )}
        </div>

        {/* User Management Card */}
        <div className="dashboard-card user-management">
          <div className="card-header">
            <h2>
              <i className="fas fa-user-cog"></i> Recent Users
            </h2>
            <Link to="/admin/users" className="view-all-link">
              View All <i className="fas fa-chevron-right"></i>
            </Link>
          </div>
          
          {users.length > 0 ? (
            <div className="clean-list">
              {users.slice(0, 3).map(user => (
                <div key={user._id} className="list-item">
                  <div className="user-avatar">
                    <i className="fas fa-user"></i>
                  </div>
                  <div className="user-info">
                    <div className="main-info">
                      <div className="user-name">{user.firstName} {user.lastName}</div>
                      <div className="user-email">{user.email}</div>
                    </div>
                    <div className="tags">
                      <span className="role-tag">{user.role}</span>
                      <span className={`status-tag ${user.isApproved ? 'approved' : 'pending'}`}>
                        {user.isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  <div className="action-container">
                    <Link to={`/admin/users/${user._id}`} className="btn-manage">
                      Manage
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <i className="fas fa-users empty-icon"></i>
              <p>No users available.</p>
            </div>
          )}
        </div>

        {/* Quick Actions Card */}
        <div className="dashboard-card quick-actions">
          <div className="card-header">
            <h2>
              <i className="fas fa-bolt"></i> Quick Actions
            </h2>
          </div>
          
          <div className="actions-grid">
            <Link to="/admin/approvals" className="action-card">
              <div className="action-icon approvals-action">
                <i className="fas fa-user-check"></i>
              </div>
              <div className="action-label">Manage Approvals</div>
              <div className="action-description">Review and approve user registrations</div>
            </Link>
            
            <Link to="/admin/users" className="action-card">
              <div className="action-icon users-action">
                <i className="fas fa-users"></i>
              </div>
              <div className="action-label">Manage Users</div>
              <div className="action-description">Add, edit or deactivate system users</div>
            </Link>
            
            <Link to="/admin/ehrs" className="action-card">
              <div className="action-icon ehr-action">
                <i className="fas fa-file-medical-alt"></i>
              </div>
              <div className="action-label">Manage EHRs</div>
              <div className="action-description">View and manage electronic health records</div>
            </Link>
            
            <Link to="/admin/settings" className="action-card">
              <div className="action-icon settings-action">
                <i className="fas fa-cogs"></i>
              </div>
              <div className="action-label">Settings</div>
              <div className="action-description">Configure system settings and preferences</div>
            </Link>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        
        .dashboard-date {
          color: #6c757d;
          font-size: 1rem;
        }
        
        .dashboard-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        
        .summary-card {
          background-color: #fff;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          padding: 1.5rem;
          display: flex;
          align-items: center;
          transition: transform 0.2s;
        }
        
        .summary-card:hover {
          transform: translateY(-5px);
        }
        
        .summary-icon {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 1rem;
          font-size: 1.5rem;
          color: white;
        }
        
        .users-icon {
          background-color: #3498db;
        }
        
        .doctors-icon {
          background-color: #9b59b6;
        }
        
        .patients-icon {
          background-color: #2ecc71;
        }
        
        .pending-icon {
          background-color: #f39c12;
        }
        
        .summary-content {
          flex: 1;
        }
        
        .summary-value {
          font-size: 1.8rem;
          font-weight: 700;
          color: #333;
          line-height: 1.2;
        }
        
        .summary-label {
          color: #6c757d;
          font-size: 0.9rem;
        }
        
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 1.5rem;
        }
        
        .dashboard-card {
          background-color: #fff;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        
        .card-header h2 {
          font-size: 1.25rem;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .view-all-link {
          color: #3498db;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        
        /* Clean List Style */
        .clean-list {
          padding: 0;
          margin: 0;
        }
        
        .list-item {
          display: flex;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #eee;
        }
        
        .user-avatar {
          width: 40px;
          height: 40px;
          background-color: #f0f0f0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          color: #555;
          margin-right: 15px;
        }
        
        .user-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .main-info {
          margin-bottom: 5px;
        }
        
        .user-name {
          font-weight: 500;
          color: #333;
        }
        
        .user-email {
          color: #666;
          font-size: 0.9rem;
        }
        
        .tags {
          display: flex;
          gap: 8px;
        }
        
        .role-tag {
          display: inline-block;
          padding: 3px 8px;
          background-color: #f0f0f0;
          border-radius: 4px;
          font-size: 0.75rem;
          color: #555;
        }
        
        .status-tag {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
        }
        
        .status-tag.approved {
          background-color: #d4edda;
          color: #155724;
        }
        
        .status-tag.pending {
          background-color: #fff3cd;
          color: #856404;
        }
        
        .action-container {
          margin-left: 15px;
        }
        
        .btn-manage {
          display: inline-block;
          padding: 6px 16px;
          background-color: #6c757d;
          color: white;
          border-radius: 4px;
          font-size: 0.9rem;
          text-decoration: none;
          transition: background-color 0.2s;
        }
        
        .btn-manage:hover {
          background-color: #5a6268;
        }
        
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: #6c757d;
        }
        
        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }
        
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
          padding: 1.5rem;
        }
        
        .action-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 1.5rem 1rem;
          border-radius: 8px;
          background-color: #f8f9fa;
          text-decoration: none;
          color: #343a40;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .action-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }
        
        .action-icon {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          font-size: 1.5rem;
          color: white;
        }
        
        .approvals-action {
          background-color: #3498db;
        }
        
        .users-action {
          background-color: #9b59b6;
        }
        
        .ehr-action {
          background-color: #2ecc71;
        }
        
        .settings-action {
          background-color: #f39c12;
        }
        
        .action-label {
          font-weight: 500;
          margin-bottom: 0.5rem;
        }
        
        .action-description {
          font-size: 0.85rem;
          color: #6c757d;
        }
        
        @media (max-width: 768px) {
          .dashboard-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
          
          .dashboard-summary {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
          
          .actions-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;