import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const AdminUserDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const { user: authUser } = useAuth();

  useEffect(() => {
    if (!authUser || authUser.role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchUserDetails();
  }, [id, authUser, navigate]);

  const fetchUserDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/admin/users/${id}`);
      setUser(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching user details:', error);
      if (error.response) {
        if (error.response.status === 404) {
          setError(`User with ID ${id} not found`);
        } else if (error.response.status === 401) {
          setError('Unauthorized. Please log in again.');
          navigate('/login');
        } else {
          setError(error.response.data.message || 'An error occurred');
        }
      } else {
        setError('Network error. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setLoading(true);
      setError(null);
      await axios.put(`/admin/users/${id}/approve`, {});
      fetchUserDetails();
      setSuccessMessage('User has been approved successfully');
    } catch (error) {
      console.error('Error approving user:', error);
      if (error.code === 'ECONNABORTED') {
        setSuccessMessage('Approval may have succeeded, but the response timed out. Please verify the user status.');
        fetchUserDetails();
      } else {
        setError(error.response?.data?.message || 'Error approving user');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setLoading(true);
      setError(null);
      await axios.put(`/admin/users/${id}/reject`, {});
      fetchUserDetails();
      setSuccessMessage('User has been rejected');
    } catch (error) {
      console.error('Error rejecting user:', error);
      if (error.code === 'ECONNABORTED') {
        setSuccessMessage('Rejection may have succeeded, but the response timed out. Please verify the user status.');
        fetchUserDetails();
      } else {
        setError(error.response?.data?.message || 'Error rejecting user');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <h1 className="loading-logo">E-Health</h1>
          <div className="loading-bar"></div>
          <p className="loading-text">Processing...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="alert alert-danger">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={() => navigate('/admin-dashboard')} className="btn btn-secondary">
            Back to Dashboard
          </button>
          <button onClick={fetchUserDetails} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="dashboard">
        <div className="alert alert-warning">
          <h3>User Not Found</h3>
          <p>The user with ID {id} could not be found.</p>
          <button onClick={() => navigate('/admin-dashboard')} className="btn btn-secondary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h1>User Management</h1>
      {successMessage && <div className="alert alert-success">{successMessage}</div>}
      <div className="dashboard-card">
        <h2>User Details</h2>
        <div className="user-info">
          <p><strong>Name:</strong> {user.firstName} {user.lastName}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> {user.role}</p>
          <p><strong>Approval Status:</strong> {user.isApproved ? 'Approved' : 'Pending Approval'}</p>
          <p><strong>Date Registered:</strong> {user.createdAt && new Date(user.createdAt).toLocaleString()}</p>
        </div>
        {(user.role === 'doctor' || user.role === 'nurse') && (
          <div className="form-actions" style={{ marginTop: '1rem' }}>
            {!user.isApproved && (
              <button className="btn btn-success" onClick={handleApprove} disabled={loading}>
                Approve
              </button>
            )}
            {user.isApproved && (
              <button className="btn btn-danger" onClick={handleReject} disabled={loading} style={{ marginLeft: '0.5rem' }}>
                Revoke Approval
              </button>
            )}
          </div>
        )}
        <button onClick={() => navigate('/admin-dashboard')} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default AdminUserDetails;