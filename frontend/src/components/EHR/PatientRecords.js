import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

const PatientRecordsTable = ({ ehr }) => {
  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MM/dd/yyyy');
    } catch (e) {
      return 'Invalid Date';
    }
  };

  return (
    <div className="ehr-tables">
      {/* Medical Conditions Table */}
      <div className="ehr-section">
        <h3>Medical Conditions</h3>
        {ehr.medicalConditions && ehr.medicalConditions.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Condition</th>
                  <th>Diagnosed Date</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {ehr.medicalConditions.map((condition, index) => (
                  <tr key={index}>
                    <td>{condition.condition}</td>
                    <td>{formatDate(condition.diagnosedDate)}</td>
                    <td>{condition.notes || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="no-data">No medical conditions recorded.</p>
        )}
      </div>

      {/* Allergies Table */}
      <div className="ehr-section">
        <h3>Allergies</h3>
        {ehr.allergies && ehr.allergies.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Allergen</th>
                  <th>Reaction</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {ehr.allergies.map((allergy, index) => (
                  <tr key={index}>
                    <td>{allergy.allergen}</td>
                    <td>{allergy.reaction || 'N/A'}</td>
                    <td>
                      <span className={`severity-badge severity-${allergy.severity}`}>
                        {allergy.severity || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="no-data">No allergies recorded.</p>
        )}
      </div>

      {/* Medications Table */}
      <div className="ehr-section">
        <h3>Medications</h3>
        {ehr.medications && ehr.medications.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Medication</th>
                  <th>Dosage</th>
                  <th>Frequency</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                </tr>
              </thead>
              <tbody>
                {ehr.medications.map((medication, index) => (
                  <tr key={index}>
                    <td>{medication.name}</td>
                    <td>{medication.dosage || 'N/A'}</td>
                    <td>{medication.frequency || 'N/A'}</td>
                    <td>{formatDate(medication.startDate)}</td>
                    <td>{formatDate(medication.endDate) || 'Ongoing'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="no-data">No medications recorded.</p>
        )}
      </div>

      {/* Past Visits Table */}
      <div className="ehr-section">
        <h3>Past Visits</h3>
        {ehr.pastVisits && ehr.pastVisits.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Doctor</th>
                  <th>Reason</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {ehr.pastVisits.map((visit, index) => (
                  <tr key={index}>
                    <td>{formatDate(visit.date)}</td>
                    <td>{visit.doctor?.specialization || 'Unknown'}</td>
                    <td>{visit.reason || 'N/A'}</td>
                    <td>{visit.notes || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="no-data">No past visits recorded.</p>
        )}
      </div>
    </div>
  );
};

const PatientRecords = () => {
  const { patientId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [ehr, setEhr] = useState(null);
  const [formData, setFormData] = useState({
    medicalConditions: [],
    allergies: [],
    medications: [],
  });
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);

  const isOwnRecords = user && user._id === patientId;
  const userRole = user ? user.role : null;
  const canEdit = userRole === 'admin' || userRole === 'doctor'; // Allow both admin and doctor to edit

  useEffect(() => {
    const fetchPatientRecords = async () => {
      try {
        try {
          const patientRes = await axios.get(`/users/${patientId}`);
          setPatient(patientRes.data);
        } catch (err) {
          console.warn('Failed to fetch patient info:', err);
          setPatient({ firstName: 'Unknown', lastName: 'Patient', dateOfBirth: null });
        }

        let ehrEndpoint = isOwnRecords ? '/ehr/auth/my-ehr' : `/ehr/admin/ehrs/patient/${patientId}`;
        if (userRole === 'admin') {
          ehrEndpoint = `/ehr/admin/ehrs/patient/${patientId}`;
        } else if (userRole === 'doctor') {
          ehrEndpoint = `/ehr/doctor/ehrs/patient/${patientId}`;
        }
        const ehrRes = await axios.get(ehrEndpoint);
        setEhr(ehrRes.data);
        setFormData({
          medicalConditions: ehrRes.data.medicalConditions || [],
          allergies: ehrRes.data.allergies || [],
          medications: ehrRes.data.medications || [],
        });

        setLoading(false);
      } catch (err) {
        console.error('Error fetching patient records:', err);
        setError(err.response?.data?.message || 'Failed to load patient records');
        setLoading(false);
      }
    };

    if (user) {
      fetchPatientRecords();
    } else {
      setError('Please log in to view records');
      setLoading(false);
    }
  }, [patientId, user, isOwnRecords, userRole]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'allergies') {
      setFormData({
        ...formData,
        allergies: value.split(',').map(item => ({
          allergen: item.trim(),
          reaction: '',
          severity: 'mild',
        })),
      });
    } else if (name === 'medicalConditions') {
      setFormData({
        ...formData,
        medicalConditions: value.split(',').map(item => ({
          condition: item.trim(),
          diagnosedDate: new Date(),
          notes: '',
        })),
      });
    } else if (name === 'medications') {
      setFormData({
        ...formData,
        medications: value.split(',').map(item => ({
          name: item.trim(),
          dosage: '',
          frequency: '',
        })),
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const updateEndpoint = `/ehr/admin/ehrs/${ehr._id}`;
      const response = await axios.put(updateEndpoint, formData);
      setEhr(response.data);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update EHR');
    }
  };

  const toggleEdit = () => {
    setEditing(!editing);
  };

  const createEHR = async () => {
    try {
      const createEndpoint = `/ehr/admin/ehrs/patient/${patientId}`;
      const response = await axios.post(createEndpoint, {
        medicalConditions: [],
        allergies: [],
        medications: [],
        pastVisits: [],
      });
      setEhr(response.data);
      setFormData({
        medicalConditions: response.data.medicalConditions || [],
        allergies: response.data.allergies || [],
        medications: response.data.medications || [],
      });
      setEditing(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create EHR');
    }
  };

  if (loading) {
    return <div className="loading">Loading records...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="patient-records-container">
      <div className="records-header">
        <div className="patient-info">
          <h1>
            {isOwnRecords ? 'My Medical Records' : `Medical Records: ${patient.firstName} ${patient.lastName}`}
          </h1>
          {!isOwnRecords && (
            <div className="patient-details">
              <p>DOB: {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
              <p>Patient ID: {patientId}</p>
            </div>
          )}
        </div>

        {/* Only show Edit button for admins */}
        {canEdit && !editing && ehr && (
          <button className="btn btn-primary" onClick={toggleEdit}>
            <i className="fas fa-edit"></i> Edit EHR
          </button>
        )}
      </div>

      {editing && canEdit ? (
        <div className="edit-ehr-form">
          <h2>Edit EHR</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="medicalConditions" className="form-label">Medical Conditions (comma-separated)</label>
              <input
                type="text"
                className="form-control"
                id="medicalConditions"
                name="medicalConditions"
                value={formData.medicalConditions.map(c => c.condition).join(', ')}
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
                value={formData.allergies.map(a => a.allergen).join(', ')}
                onChange={handleChange}
              />
            </div>
            <div className="mb-3">
              <label htmlFor="medications" className="form-label">Medications (comma-separated)</label>
              <input
                type="text"
                className="form-control"
                id="medications"
                name="medications"
                value={formData.medications.map(m => m.name).join(', ')}
                onChange={handleChange}
              />
            </div>
            <button type="submit" className="btn btn-primary me-2">Save</button>
            <button type="button" className="btn btn-secondary" onClick={toggleEdit}>Cancel</button>
          </form>
        </div>
      ) : (
        <div className="ehr-details">
          <h2>EHR Details</h2>
          {ehr ? (
            <PatientRecordsTable ehr={ehr} />
          ) : (
            <div>
              <p>No EHR found.</p>
              {canEdit && (
                <button className="btn btn-primary" onClick={createEHR}>
                  Create EHR
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .patient-records-container {
          background-color: #f9f9f9;
          border-radius: 8px;
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .records-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #eaeaea;
        }
        
        .patient-info h1 {
          margin-bottom: 5px;
          color: #2c3e50;
        }
        
        .patient-details {
          display: flex;
          gap: 20px;
          color: #6c757d;
          font-size: 0.9em;
        }
        
        .ehr-details {
          background-color: #fff;
          border-radius: 5px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .ehr-details h2 {
          margin-top: 0;
          margin-bottom: 20px;
          color: #2c3e50;
        }
        
        .edit-ehr-form {
          background-color: #fff;
          border-radius: 5px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .edit-ehr-form h2 {
          margin-top: 0;
          margin-bottom: 20px;
          color: #2c3e50;
        }
        
        .loading, .error-message {
          text-align: center;
          padding: 40px;
          font-size: 1.2em;
          background-color: #fff;
          border-radius: 5px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .error-message {
          color: #dc3545;
        }
        
        .ehr-tables {
          margin-top: 20px;
        }
        
        .ehr-section {
          margin-bottom: 30px;
          border: 1px solid #e0e0e0;
          border-radius: 5px;
          padding: 15px;
          background-color: #fff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        
        .ehr-section h3 {
          margin-top: 0;
          padding-bottom: 10px;
          border-bottom: 1px solid #eee;
          color: #2c3e50;
        }
        
        .table-responsive {
          overflow-x: auto;
        }
        
        .table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .table th {
          background-color: #f8f9fa;
          text-align: left;
          padding: 12px;
          font-weight: 600;
        }
        
        .table td {
          padding: 12px;
          border-top: 1px solid #dee2e6;
        }
        
        .table-striped tbody tr:nth-of-type(odd) {
          background-color: rgba(0, 0, 0, 0.02);
        }
        
        .no-data {
          color: #6c757d;
          font-style: italic;
        }
        
        .severity-badge {
          padding: 3px 8px;
          border-radius: 3px;
          font-size: 0.85em;
          font-weight: 500;
        }
        
        .severity-mild {
          background-color: #cff4fc;
          color: #055160;
        }
        
        .severity-moderate {
          background-color: #fff3cd;
          color: #664d03;
        }
        
        .severity-severe {
          background-color: #f8d7da;
          color: #842029;
        }
      `}</style>
    </div>
  );
};

export default PatientRecords;