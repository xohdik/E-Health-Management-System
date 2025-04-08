import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';

const DoctorDashboard = () => {
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, noShow: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  const doctorId = localStorage.getItem('userId');
  const firstName = localStorage.getItem('firstName') || 'Doctor';
  const lastName = localStorage.getItem('lastName') || 'Smith';

  useEffect(() => {
    console.log('Doctor ID from localStorage:', doctorId);
    if (!doctorId || !token) {
      setError('No doctor ID or token found. Please log in again.');
      setLoading(false);
      return;
    }

    fetchAppointments();
    const interval = setInterval(fetchAppointments, 30000);
    return () => clearInterval(interval);
  }, [doctorId, token]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const authToken = token || localStorage.getItem('token');
      if (!authToken) throw new Error('No authentication token found');

      const config = { headers: { Authorization: `Bearer ${authToken}` } };
      console.log('Fetching appointments for doctor ID:', doctorId);

      const response = await axios.get(`/appointments/doctor/${doctorId}`, config);
      console.log('Appointments response:', response.data);

      const appointments = response.data || [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayApts = appointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return (
          aptDate.getDate() === today.getDate() &&
          aptDate.getMonth() === today.getMonth() &&
          aptDate.getFullYear() === today.getFullYear() &&
          ['scheduled', 'confirmed'].includes(apt.status)
        );
      });

      const upcomingApts = appointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return (
          aptDate > today &&
          ['scheduled', 'confirmed'].includes(apt.status)
        );
      });

      setTodayAppointments(todayApts);
      setUpcomingAppointments(upcomingApts);
      setStats({
        total: appointments.length,
        completed: appointments.filter(a => a.status === 'completed').length,
        noShow: appointments.filter(a => a.status === 'no-show').length,
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching appointments:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || 'Failed to load appointments';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleConfirm = async (appointmentId) => {
    try {
      setError(null);
      setSuccess(null);
      const authToken = token || localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${authToken}` } };
      await axios.put(`/appointments/${appointmentId}/confirm`, {}, config);
      setSuccess('Appointment confirmed successfully!');
      fetchAppointments();
    } catch (error) {
      console.error('Error confirming appointment:', error.response?.data || error.message);
      setError(error.response?.data?.message || 'Failed to confirm appointment');
    }
  };

  const handleSendReminder = async (appointmentId) => {
    try {
      setError(null);
      setSuccess(null);
      const authToken = token || localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${authToken}` } };
      const response = await axios.post(`/appointments/${appointmentId}/reminder`, {}, config);
      setSuccess(response.data.message || 'Reminder sent successfully!');
    } catch (error) {
      console.error('Error sending reminder:', error.response?.data || error.message);
      setError(error.response?.data?.message || 'Failed to send reminder');
    }
  };

  const handleCancel = async (appointmentId) => {
    try {
      setError(null);
      setSuccess(null);
      const authToken = token || localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${authToken}` } };
      await axios.put(`/appointments/${appointmentId}/cancel`, {}, config);
      setSuccess('Appointment canceled successfully!');
      fetchAppointments();
    } catch (error) {
      console.error('Error canceling appointment:', error.response?.data || error.message);
      setError(error.response?.data?.message || 'Failed to cancel appointment');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <h1 className="loading-logo">E-Health</h1>
          <div className="loading-bar"></div>
          <p className="loading-text">Loading Your Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="alert alert-danger">
          <h3>Oops!</h3>
          <p>{error}</p>
          {error === 'Doctor not found' || error === 'No doctor ID or token found. Please log in again.' ? (
            <Link to="/login" className="btn btn-primary">
              Log In Again
            </Link>
          ) : (
            <button onClick={fetchAppointments} className="btn btn-primary">
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard doctor-dashboard">
      {success && (
        <div className="alert alert-success">
          <p>{success}</p>
        </div>
      )}
      <h1>Welcome, Dr. {lastName}!</h1>

      <div className="dashboard-grid">
        <div className="dashboard-card today-appointments">
          <h2>Today's Appointments</h2>
          {todayAppointments.length > 0 ? (
            <div className="appointments-timeline">
              {todayAppointments.map(appointment => (
                <div key={appointment._id} className="timeline-item">
                  <div className="time">
                    {new Date(appointment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className={`appointment-card ${appointment.status}`}>
                    <div className="patient-info">
                      <h3>
                        {appointment.patient?.firstName} {appointment.patient?.lastName}
                      </h3>
                      <p className="type">
                        {appointment.type === 'telemedicine' ? 'Video Consultation' : 'In-person Visit'}
                      </p>
                    </div>
                    <div className="appointment-actions">
                      <Link to={`/appointments/${appointment._id}`} className="btn btn-sm btn-outline-secondary">
                        Details
                      </Link>
                      {appointment.status === 'scheduled' && (
                        <button
                          onClick={() => handleConfirm(appointment._id)}
                          className="btn btn-sm btn-primary"
                        >
                          Confirm
                        </button>
                      )}
                      {(appointment.status === 'scheduled' || appointment.status === 'confirmed') && (
                        <>
                          <button
                            onClick={() => handleSendReminder(appointment._id)}
                            className="btn btn-sm btn-info"
                          >
                            Send Reminder
                          </button>
                          <button
                            onClick={() => handleCancel(appointment._id)}
                            className="btn btn-sm btn-danger"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {appointment.type === 'telemedicine' && (
                        <Link to={`/telemedicine/call/${appointment._id}`} className="btn btn-sm btn-success">
                          Start Call
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-appointments">
              <p>No appointments scheduled for today.</p>
            </div>
          )}
        </div>

        <div className="dashboard-card stats-card">
          <h2>Your Statistics</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Appointments</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.completed}</div>
              <div className="stat-label">Completed</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.noShow}</div>
              <div className="stat-label">No-shows</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">
                {stats.total ? Math.round((stats.completed / stats.total) * 100) : 0}%
              </div>
              <div className="stat-label">Completion Rate</div>
            </div>
          </div>
        </div>

        <div className="dashboard-card upcoming-appointments">
          <h2>Upcoming Appointments</h2>
          {upcomingAppointments.length > 0 ? (
            <ul className="appointments-list">
              {upcomingAppointments.map(appointment => (
                <li key={appointment._id} className="appointment-item">
                  <div className="appointment-info">
                    <span className="date">{new Date(appointment.date).toLocaleDateString()}</span>
                    <span className="patient">
                      {appointment.patient?.firstName} {appointment.patient?.lastName}
                    </span>
                    <span className="type">{appointment.type}</span>
                  </div>
                  <div className="appointment-actions">
                    <Link to={`/appointments/${appointment._id}`} className="btn btn-sm btn-outline-secondary">
                      Details
                    </Link>
                    {(appointment.status === 'scheduled' || appointment.status === 'confirmed') && (
                      <>
                        <button
                          onClick={() => handleSendReminder(appointment._id)}
                          className="btn btn-sm btn-info"
                        >
                          Send Reminder
                        </button>
                        <button
                          onClick={() => handleCancel(appointment._id)}
                          className="btn btn-sm btn-danger"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>No upcoming appointments.</p>
          )}
          <Link to="/appointments" className="btn btn-sm btn-primary">
            View All Appointments
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;