import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const AdminEHRDetails = () => {
  const { id } = useParams();
  const [ehr, setEHR] = useState(null);
  const [formData, setFormData] = useState({
    bloodType: '',
    allergies: [],
    conditions: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEHR = async () => {
      try {
        const response = await axios.get(`/ehr/admin/ehrs/${id}`);
        setEHR(response.data);
        setFormData({
          bloodType: response.data.bloodType || '',
          allergies: response.data.allergies || [],
          conditions: response.data.conditions || [],
        });
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load EHR');
        setLoading(false);
      }
    };

    if (user && user.role === 'admin') {
      fetchEHR();
    } else {
      setError('Unauthorized access');
      setLoading(false);
    }
  }, [id, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'allergies' || name === 'conditions') {
      setFormData({ ...formData, [name]: value.split(',').map(item => item.trim()) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/ehr/admin/ehrs/${id}`, formData);
      navigate('/admin/ehrs');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update EHR');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="admin-ehr-details container mt-4">
      <h1>Edit EHR</h1>
      {ehr && (
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">
              EHR for {ehr.patientId.firstName} {ehr.patientId.lastName}
            </h5>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="bloodType" className="form-label">Blood Type</label>
                <input
                  type="text"
                  className="form-control"
                  id="bloodType"
                  name="bloodType"
                  value={formData.bloodType}
                  onChange={handleChange}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="allergies" className="form-label">Allergies (comma-separated)</label>
                <input
                  type="text"
                  className="form-control"
                  id="allergies"
                  name="allergies"
                  value={formData.allergies.join(', ')}
                  onChange={handleChange}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="conditions" className="form-label">Conditions (comma-separated)</label>
                <input
                  type="text"
                  className="form-control"
                  id="conditions"
                  name="conditions"
                  value={formData.conditions.join(', ')}
                  onChange={handleChange}
                />
              </div>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEHRDetails;