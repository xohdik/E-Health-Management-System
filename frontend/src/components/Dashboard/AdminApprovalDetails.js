import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 5000,
  withCredentials: true,
});

const AdminApprovalDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [approval, setApproval] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchApprovalDetails();
  }, [id]);

  const fetchApprovalDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching approval with ID:', id);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await api.get(`/admin/approvals/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('Approval data received:', response.data);
      setApproval(response.data.data);
    } catch (error) {
      console.error('Error fetching approval details:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        if (error.response.status === 404) {
          setError(`Approval with ID ${id} not found`);
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

  const handleAccept = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      await api.put(
        `/admin/approvals/${id}/accept`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert('Approval accepted successfully');
      navigate('/admin-dashboard');
    } catch (error) {
      console.error('Error accepting approval:', error);
      alert(error.response?.data?.message || 'Error accepting approval');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = window.prompt('Please enter rejection reason:');
    if (!reason || reason.trim().length < 10) {
      alert('Rejection reason must be at least 10 characters');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      await api.put(
        `/admin/approvals/${id}/reject`,
        { reason: reason.trim() },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert('Approval rejected successfully');
      navigate('/admin-dashboard');
    } catch (error) {
      console.error('Error rejecting approval:', error);
      alert(error.response?.data?.message || 'Error rejecting approval');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading approval details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Error</h3>
        <p>{error}</p>
        <button onClick={() => navigate('/admin-dashboard')} className="back-button">
          Back to Dashboard
        </button>
        <button onClick={fetchApprovalDetails} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="not-found-container">
        <h3>Approval Not Found</h3>
        <p>The approval with ID {id} could not be found.</p>
        <button onClick={() => navigate('/admin-dashboard')} className="back-button">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="approval-details-container">
      <h2>Approval Details</h2>

      <div className="approval-info">
        <div className="info-row">
          <strong>ID:</strong> {approval._id}
        </div>
        <div className="info-row">
          <strong>User ID:</strong> {approval.userId}
        </div>
        <div className="info-row">
          <strong>Name:</strong> {approval.firstName} {approval.lastName}
        </div>
        <div className="info-row">
          <strong>Email:</strong> {approval.email}
        </div>
        <div className="info-row">
          <strong>Role:</strong> {approval.role}
        </div>
        <div className="info-row">
          <strong>Specialization:</strong> {approval.specialization || 'N/A'}
        </div>
        <div className="info-row">
          <strong>Approval Status:</strong>
          <span className={`status-${approval.status.toLowerCase()}`}>
            {approval.status}
          </span>
        </div>
        <div className="info-row">
          <strong>Doctor Approved:</strong> {approval.isApproved ? 'Yes' : 'No'}
        </div>
        <div className="info-row">
          <strong>Doctor Status:</strong> {approval.doctorStatus}
        </div>
        <div className="info-row">
          <strong>Created:</strong> {new Date(approval.createdAt).toLocaleString()}
        </div>
        <div className="debug-section">
          <details>
            <summary>Debug Information</summary>
            <pre>{JSON.stringify(approval, null, 2)}</pre>
          </details>
        </div>
      </div>

      <div className="action-buttons">
        <button onClick={() => navigate('/admin-dashboard')} className="back-button">
          Back
        </button>
        <button
          className="accept-button"
          onClick={handleAccept}
          disabled={approval.status !== 'PENDING' || loading}
        >
          Accept
        </button>
        <button
          className="reject-button"
          onClick={handleReject}
          disabled={approval.status !== 'PENDING' || loading}
        >
          Reject
        </button>
      </div>
    </div>
  );
};

export default AdminApprovalDetails;