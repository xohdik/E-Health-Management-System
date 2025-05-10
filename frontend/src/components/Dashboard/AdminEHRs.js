import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const AdminEHRs = () => {
  const [ehrs, setEHRs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchEHRs = async () => {
      try {
        const response = await axios.get('/ehr/admin/ehrs');
        setEHRs(response.data);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load EHRs');
        setLoading(false);
      }
    };

    if (user && user.role === 'admin') {
      fetchEHRs();
    } else {
      setError('Unauthorized access');
      setLoading(false);
    }
  }, [user]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="admin-ehrs container mt-4">
      <h1>EHR Management</h1>
      {ehrs.length > 0 ? (
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Patient Name</th>
              <th>Blood Type</th>
              <th>Allergies</th>
              <th>Conditions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ehrs.map(ehr => (
              <tr key={ehr._id}>
                <td>{ehr.patientId.firstName} {ehr.patientId.lastName}</td>
                <td>{ehr.bloodType}</td>
                <td>{ehr.allergies.join(', ')}</td>
                <td>{ehr.conditions.join(', ')}</td>
                <td>
                  <Link to={`/admin/ehrs/${ehr._id}`} className="btn btn-sm btn-primary">View/Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No EHRs found.</p>
      )}
    </div>
  );
};

export default AdminEHRs;