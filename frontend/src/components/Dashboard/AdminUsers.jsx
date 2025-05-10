import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const AdminUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }

    const fetchUsers = async () => {
      try {
        const response = await axios.get('/admin/users');
        setUsers(response.data.data || response.data);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    };
    fetchUsers();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <h1 className="loading-logo">E-Health</h1>
          <div className="loading-bar"></div>
          <p className="loading-text">Fetching Users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h1>All Users</h1>
      <div className="dashboard-grid">
        {users.map(user => (
          <div key={user._id} className="dashboard-card">
            <p>{user.firstName} {user.lastName} ({user.role})</p>
            <p>Status: {user.isApproved ? 'Approved' : 'Pending'}</p>
            <button
              onClick={() => navigate(`/admin/users/${user._id}`)}
              className="btn btn-primary me-2"
            >
              View Details
            </button>
            {user.role === 'patient' && (
              <button
                onClick={() => navigate(`/patient/records/${user._id}`)}
                className="btn btn-secondary"
              >
                Manage EHR
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={() => navigate('/admin-dashboard')}
        className="btn btn-secondary"
        style={{ marginTop: '1rem' }}
      >
        Back to Dashboard
      </button>
    </div>
  );
};

export default AdminUsers;