// components/EHR/PatientRecords.js
import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';

const PatientRecords = () => {
  const { patientId } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  
  // Check if viewing own records
  const userId = localStorage.getItem('userId');
  const isOwnRecords = userId === patientId;
  const userRole = localStorage.getItem('userRole');
  
  useEffect(() => {
    const fetchPatientRecords = async () => {
      try {
        // Get patient info
        const patientRes = await axios.get(`/users/${patientId}`);
        setPatient(patientRes.data);
        
        // Get patient records from blockchain
        const recordsRes = await axios.get(`/ehr/patient/${patientId}`);
        setRecords(recordsRes.data);
        setFilteredRecords(recordsRes.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching patient records:', err);
        setError('Failed to load patient records');
        setLoading(false);
      }
    };
    
    fetchPatientRecords();
  }, [patientId]);
  
  // Filter records
  useEffect(() => {
    let filtered = records;
    
    // Filter by type
    if (activeTab !== 'all') {
      filtered = filtered.filter(record => record.recordType === activeTab);
    }
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(record => 
        record.recordType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.data && JSON.stringify(record.data).toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    setFilteredRecords(filtered);
  }, [records, activeTab, searchTerm]);
  
  // Extract record types for tabs
  const recordTypes = ['all', ...new Set(records.map(record => record.recordType))];
  
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
        
        {/* Create new record button (for doctors only) */}
        {userRole === 'doctor' && (
          <Link to={`/create-record/${patientId}`} className="btn btn-primary">
            <i className="fas fa-plus"></i> Add New Record
          </Link>
        )}
      </div>
      
      {/* Search and filters */}
      <div className="records-filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <i className="fas fa-search"></i>
        </div>
        
        <div className="record-tabs">
          {recordTypes.map(type => (
            <button
              key={type}
              className={`tab-btn ${activeTab === type ? 'active' : ''}`}
              onClick={() => setActiveTab(type)}
            >
              {type === 'all' ? 'All Records' : type}
            </button>
          ))}
        </div>
      </div>
      
      {/* Records list */}
      {filteredRecords.length === 0 ? (
        <div className="no-records">
          <p>No records found.</p>
        </div>
      ) : (
        <div className="records-list">
          {filteredRecords.map(record => (
            <div key={record.recordId} className="record-card">
              <div className="record-header">
                <span className="record-type">{record.recordType}</span>
                <span className="record-date">
                  {new Date(record.timestamps.created).toLocaleDateString()}
                </span>
              </div>
              <div className="record-body">
                {record.data ? (
                  <div className="record-preview">
                    {Object.entries(record.data).slice(0, 3).map(([key, value]) => (
                      <div key={key} className="record-field">
                        <span className="field-name">{key}:</span>
                        <span className="field-value">
                          {typeof value === 'object' ? JSON.stringify(value).slice(0, 50) + '...' : String(value).slice(0, 50)}
                        </span>
                      </div>
                    ))}
                    {Object.keys(record.data).length > 3 && <div className="more-fields">+ more fields</div>}
                  </div>
                ) : (
                  <p className="encrypted-message">Content is encrypted</p>
                )}
              </div>
              <div className="record-footer">
                <span className="doctor-name">
                  Dr. {record.doctorId?.firstName || 'Unknown'} {record.doctorId?.lastName || ''}
                </span>
                <Link to={`/records/${record.recordId}`} className="btn btn-sm">
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientRecords;