import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const AdminApprovals = () => {
  const navigate = useNavigate();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }

    const fetchPendingUsers = async () => {
      try {
        const response = await axios.get('/admin/users', { params: { status: 'pending' } });
        setPendingUsers(response.data.data.filter(user => !user.isApproved) || []);
      } catch (error) {
        console.error('Error fetching pending users:', error);
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    };
    fetchPendingUsers();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <h1 className="loading-logo">E-Health</h1>
          <div className="loading-bar"></div>
          <p className="loading-text">Checking Approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h1>Pending Approvals</h1>
      <div className="dashboard-grid">
        {pendingUsers.length === 0 ? (
          <div className="no-approvals">No pending approvals</div>
        ) : (
          pendingUsers.map(user => (
            <div key={user._id} className="dashboard-card">
              <p>{user.firstName} {user.lastName} ({user.role})</p>
              <button onClick={() => navigate(`/admin/users/${user._id}`)} className="btn btn-primary">
                Review
              </button>
            </div>
          ))
        )}
      </div>
      <button onClick={() => navigate('/admin-dashboard')} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
        Back to Dashboard
      </button>
    </div>
  );
};

export default AdminApprovals;