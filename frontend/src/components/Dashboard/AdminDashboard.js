import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';

// Set Axios base URL (already set globally in App.js, but keeping for clarity)
axios.defaults.baseURL = 'http://localhost:5000/api';

const AdminDashboard = () => {
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useContext(AuthContext);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const authToken = token || localStorage.getItem('token');
        console.log('Auth Token in Dashboard:', authToken); // Debug
        if (!authToken) {
          throw new Error('No authentication token found. Please log in.');
        }

        const config = {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        };

        // Fetch pending approvals (doctor/nurse)
        try {
          const approvalsRes = await axios.get('/admin/approvals', config);
          const approvalsData = approvalsRes.data?.data || approvalsRes.data || [];
          setPendingApprovals(Array.isArray(approvalsData) ? approvalsData : []);
        } catch (approvalError) {
          console.error('Error fetching approvals:', approvalError);
          setPendingApprovals([]); // Set to empty array on error
        }

        // Fetch all users for management
        try {
          const usersRes = await axios.get('/admin/users', config);
          const usersData = usersRes.data?.data || usersRes.data || [];
          setUsers(Array.isArray(usersData) ? usersData : []);
        } catch (userError) {
          console.error('Error fetching users:', userError);
          setUsers([]); // Set to empty array on error
        }

        // Add a slight delay to make the loading animation more noticeable
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
  }, [token]);

  const firstName = localStorage.getItem('firstName') || 'Admin';

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
      <h1>Welcome, {firstName}!</h1>

      <div className="dashboard-grid">
        {/* Pending Approvals Card */}
        <div className="dashboard-card pending-approvals">
          <h2>Pending Approvals</h2>
          {pendingApprovals.length > 0 ? (
            <ul className="approvals-list">
              {pendingApprovals.map(approval => (
                <li key={approval._id} className="approval-item">
                  <p><strong>{approval.firstName} {approval.lastName}</strong></p>
                  <p>Email: {approval.email}</p>
                  <p>Role: {approval.role}</p>
                  <Link to={`/admin/users/${approval._id}`} className="btn btn-primary">
                    Approve / Reject
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>No pending approvals.</p>
          )}
        </div>

        {/* User Management Card */}
        <div className="dashboard-card user-management">
          <h2>User Management</h2>
          {users.length > 0 ? (
            <ul className="users-list">
              {users.map(user => (
                <li key={user._id} className="user-item">
                  <p><strong>{user.firstName} {user.lastName}</strong></p>
                  <p>Email: {user.email}</p>
                  <p>Role: {user.role}</p>
                  <p>Status: {user.isApproved ? 'Approved' : 'Pending'}</p>
                  <Link to={`/admin/users/${user._id}`} className="btn btn-primary">
                    Manage User
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>No users available.</p>
          )}
        </div>

        {/* Quick Actions Card */}
        <div className="dashboard-card quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <Link to="/admin/approvals" className="action-btn">
              <i className="fas fa-user-check"></i><span>Manage Approvals</span>
            </Link>
            <Link to="/admin/users" className="action-btn">
              <i className="fas fa-users"></i><span>Manage Users</span>
            </Link>
            <Link to="/admin/reports" className="action-btn">
              <i className="fas fa-chart-line"></i><span>View Reports</span>
            </Link>
            <Link to="/admin/settings" className="action-btn">
              <i className="fas fa-cogs"></i><span>Settings</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;