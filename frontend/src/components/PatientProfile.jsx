import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const PatientProfile = () => {
  const [ehr, setEhr] = useState(null);
  const [formData, setFormData] = useState({
    bloodType: '',
    allergies: [],
    conditions: [],
  });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchEHR = async () => {
      try {
        const response = await axios.get('/auth/my-ehr');
        setEhr(response.data);
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

    if (user && user.role === 'patient') {
      fetchEHR();
    } else {
      setError('Unauthorized access');
      setLoading(false);
    }
  }, [user]);

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
      const response = await axios.put('/auth/my-ehr', formData);
      setEhr(response.data);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update EHR');
    }
  };

  const toggleEdit = () => {
    setEditing(!editing);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="patient-profile container mt-4">
      <h1>My Health Record</h1>
      {ehr ? (
        <div className="ehr-details">
          {editing ? (
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
              <button type="submit" className="btn btn-primary me-2">Save</button>
              <button type="button" className="btn btn-secondary" onClick={toggleEdit}>Cancel</button>
            </form>
          ) : (
            <>
              <h2>Personal Information</h2>
              <p><strong>Patient ID:</strong> {ehr.patientId}</p>
              <p><strong>Blood Type:</strong> {ehr.bloodType || 'Not specified'}</p>
              <p><strong>Allergies:</strong> {ehr.allergies.length > 0 ? ehr.allergies.join(', ') : 'None'}</p>
              <p><strong>Conditions:</strong> {ehr.conditions.length > 0 ? ehr.conditions.join(', ') : 'None'}</p>
              <button className="btn btn-primary mb-3" onClick={toggleEdit}>Edit EHR</button>

              <h2>Past Visits</h2>
              {ehr.pastVisits.length > 0 ? (
                <ul className="list-group">
                  {ehr.pastVisits.map((visit, index) => (
                    <li key={index} className="list-group-item">
                      <p><strong>Date:</strong> {new Date(visit.date).toLocaleDateString()}</p>
                      <p><strong>Doctor:</strong> {visit.doctor?.specialization || 'Unknown'}</p>
                      <p><strong>Diagnosis:</strong> {visit.diagnosis || 'Not specified'}</p>
                      <p><strong>Treatment:</strong> {visit.treatment || 'Not specified'}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No past visits recorded.</p>
              )}
            </>
          )}
        </div>
      ) : (
        <p>No EHR found.</p>
      )}
    </div>
  );
};

export default PatientProfile;