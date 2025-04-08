import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';

axios.defaults.baseURL = 'http://localhost:5000/api';

const PatientDashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [upcomingAppointment, setUpcomingAppointment] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useContext(AuthContext);
  const patientId = localStorage.getItem('userId');
  const firstName = localStorage.getItem('firstName') || 'Patient';
  const patientEmail = localStorage.getItem('email') || 'patient@example.com';

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [token]);

  const fetchDashboardData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const appointmentsRes = await axios.get(`/appointments/patient/${patientId}`, config);
      setAppointments(appointmentsRes.data);

      const upcoming = appointmentsRes.data
        .filter(apt => new Date(apt.date) > new Date() && apt.status !== 'canceled')
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
      setUpcomingAppointment(upcoming);

      const recordsRes = await axios.get(`/ehr/patient/${patientId}`, config);
      setRecentRecords(recordsRes.data.slice(0, 5));
      
      setLoading(false);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to load dashboard data');
      setLoading(false);
    }
  };

  const bookAppointment = async (doctorId, date, type) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post('/appointments/book', {
        doctorId,
        patientId,
        date,
        type,
        patientEmail
      }, config);
      fetchDashboardData();
    } catch (error) {
      setError('Failed to book appointment');
    }
  };

  if (loading) return <div className="dashboard-loading">Loading dashboard...</div>;
  if (error) return <div className="dashboard-error">{error}</div>;

  return (
    <div className="dashboard patient-dashboard">
      <h1>Welcome, {firstName}!</h1>
      <div className="dashboard-grid">
        <div className="dashboard-card upcoming-appointment">
          <h2>Upcoming Appointment</h2>
          {upcomingAppointment ? (
            <div className="appointment-preview">
              <p className="date">
                {new Date(upcomingAppointment.date).toLocaleDateString()} at{' '}
                {new Date(upcomingAppointment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="doctor">
                Dr. {upcomingAppointment.doctor?.user?.firstName} {upcomingAppointment.doctor?.user?.lastName}
              </p>
              <p className="type">
                {upcomingAppointment.type === 'telemedicine' ? 'Video Consultation' : 'In-person Visit'}
              </p>
              <p className="status">Status: {upcomingAppointment.status}</p>
              <Link to={`/appointments/${upcomingAppointment._id}`} className="btn btn-primary">
                View Details
              </Link>
            </div>
          ) : (
            <div className="no-appointments">
              <p>No upcoming appointments.</p>
              {/* Simple booking button for demo - replace with proper form */}
              <button 
                onClick={() => bookAppointment('doctor-id-here', new Date(Date.now() + 86400000), 'in-person')}
                className="btn btn-primary"
              >
                Book an Appointment
              </button>
            </div>
          )}
        </div>

        <div className="dashboard-card quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <Link to="/appointments/book" className="action-btn">
              <i className="fas fa-calendar-plus"></i>
              <span>Book Appointment</span>
            </Link>
            <Link to="/appointments" className="action-btn">
              <i className="fas fa-calendar-alt"></i>
              <span>My Appointments</span>
            </Link>
            <Link to="/telemedicine" className="action-btn">
              <i className="fas fa-video"></i>
              <span>Video Consultations</span>
            </Link>
            <Link to={`/medical-records/${patientId}`} className="action-btn">
              <i className="fas fa-file-medical-alt"></i>
              <span>Medical Records</span>
            </Link>
          </div>
        </div>

        <div className="dashboard-card recent-records">
          <h2>Recent Medical Records</h2>
          {recentRecords.length > 0 ? (
            <ul className="records-list">
              {recentRecords.map(record => (
                <li key={record.recordId} className="record-item">
                  <div className="record-info">
                    <span className="record-type">{record.recordType}</span>
                    <span className="record-date">{new Date(record.timestamps.created).toLocaleDateString()}</span>
                  </div>
                  <Link to={`/records/${record.recordId}`} className="btn btn-sm">View</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>No medical records found.</p>
          )}
          <Link to={`/medical-records/${patientId}`} className="btn btn-secondary">View All Records</Link>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;