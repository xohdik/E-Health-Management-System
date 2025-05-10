import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DoctorDashboard = () => {
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, noShow: 0, canceled: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [appointmentsPerPage] = useState(2);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== 'doctor') {
      setError('Unauthorized access. Please log in as a doctor.');
      setLoading(false);
      return;
    }

    fetchAppointments();
    const interval = setInterval(fetchAppointments, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await axios.get(`/appointments`);
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

      const completedCount = appointments.filter(a => a.status === 'completed').length;
      const noShowCount = appointments.filter(a => a.status === 'no-show').length;
      const canceledCount = appointments.filter(a => a.status === 'canceled').length;
      const scheduledCount = appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length;

      setTodayAppointments(todayApts);
      setUpcomingAppointments(upcomingApts);
      setStats({
        total: appointments.length,
        completed: completedCount,
        noShow: noShowCount,
        canceled: canceledCount,
        scheduled: scheduledCount
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
      await axios.put(`/appointments/${appointmentId}/confirm`, {});
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
      const response = await axios.post(`/appointments/${appointmentId}/reminder`, {});
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
      await axios.put(`/appointments/${appointmentId}/cancel`, {});
      setSuccess('Appointment canceled successfully!');
      fetchAppointments();
    } catch (error) {
      console.error('Error canceling appointment:', error.response?.data || error.message);
      setError(error.response?.data?.message || 'Failed to cancel appointment');
    }
  };

  // Prepare chart data
  const chartData = [
    { name: 'Completed', value: stats.completed, fill: '#4CAF50' },
    { name: 'No-show', value: stats.noShow, fill: '#F44336' },
    { name: 'Canceled', value: stats.canceled, fill: '#FF9800' },
    { name: 'Scheduled', value: stats.scheduled, fill: '#2196F3' }
  ];

  // Calculate completion rate
  const completionRate = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
  
  // Get current appointments for pagination
  const indexOfLastAppointment = currentPage * appointmentsPerPage;
  const indexOfFirstAppointment = indexOfLastAppointment - appointmentsPerPage;
  const currentAppointments = upcomingAppointments.slice(indexOfFirstAppointment, indexOfLastAppointment);
  const totalPages = Math.ceil(upcomingAppointments.length / appointmentsPerPage);

  // Change page
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

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
          {error === 'Unauthorized access. Please log in as a doctor.' ? (
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
      
      <div className="dashboard-header">
        <h1>Welcome, Dr. {user.lastName}!</h1>
        <div className="dashboard-date">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="dashboard-summary">
        <div className="summary-card">
          <div className="summary-icon appointments-icon">
            <i className="fas fa-calendar-check"></i>
          </div>
          <div className="summary-content">
            <div className="summary-value">{stats.total}</div>
            <div className="summary-label">Total Appointments</div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon completed-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="summary-content">
            <div className="summary-value">{stats.completed}</div>
            <div className="summary-label">Completed</div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon no-show-icon">
            <i className="fas fa-user-times"></i>
          </div>
          <div className="summary-content">
            <div className="summary-value">{stats.noShow}</div>
            <div className="summary-label">No-shows</div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon rate-icon">
            <i className="fas fa-chart-line"></i>
          </div>
          <div className="summary-content">
            <div className="summary-value">{completionRate}%</div>
            <div className="summary-label">Completion Rate</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card stats-card">
          <h2>Appointment Statistics</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => [`${value} appointments`, '']}
                  labelStyle={{ fontWeight: 'bold', color: '#333' }}
                />
                <Bar dataKey="value" name="Appointments" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="stats-legend">
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#4CAF50' }}></div>
              <div className="legend-label">Completed</div>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#F44336' }}></div>
              <div className="legend-label">No-show</div>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#FF9800' }}></div>
              <div className="legend-label">Canceled</div>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#2196F3' }}></div>
              <div className="legend-label">Scheduled</div>
            </div>
          </div>
        </div>

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
                      <p className="symptoms">
                        Symptoms: {appointment.symptoms || 'Not specified'}
                      </p>
                    </div>
                    <div className="appointment-actions">
                      <Link to={`/appointments/${appointment._id}`} className="btn btn-sm btn-outline-secondary">
                        Details
                      </Link>
                      <button
                        onClick={() => navigate(`/patient/records/${appointment.patient._id}`)}
                        className="btn btn-sm btn-info"
                      >
                        View/Edit EHR
                      </button>
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
              <div className="empty-state">
                <i className="fas fa-calendar-day empty-icon"></i>
                <p>No appointments scheduled for today.</p>
              </div>
            </div>
          )}
        </div>

        <div className="dashboard-card upcoming-appointments">
          <div className="appointments-header">
            <h2>Upcoming Appointments</h2>
            <div className="appointments-count">
              Showing {upcomingAppointments.length > 0 ? `${indexOfFirstAppointment + 1}-${Math.min(indexOfLastAppointment, upcomingAppointments.length)} of ${upcomingAppointments.length}` : '0 appointments'}
            </div>
          </div>
          
          {upcomingAppointments.length > 0 ? (
            <>
              <div className="upcoming-appointments-grid">
                {currentAppointments.map(appointment => (
                  <div key={appointment._id} className="appointment-card">
                    <div className="appointment-date-header">
                      <div className="date-label">Date:</div>
                      <div className="date-value">{new Date(appointment.date).toLocaleDateString()}</div>
                    </div>
                    <div className="appointment-content">
                      <div className="patient-name">
                        {appointment.patient?.firstName} {appointment.patient?.lastName}
                      </div>
                      <div className="visit-type">
                        {appointment.type === 'telemedicine' ? 'Video Consultation' : 'In-person Visit'}
                      </div>
                      <div className="symptoms">
                        <span>Symptoms:</span> {appointment.symptoms || 'Not specified'}
                      </div>
                    </div>
                    <div className="appointment-action-buttons">
                      <div className="button-row">
                        <Link to={`/appointments/${appointment._id}`} className="action-btn details-btn">
                          Details
                        </Link>
                        <button
                          onClick={() => navigate(`/patient/records/${appointment.patient._id}`)}
                          className="action-btn ehr-btn"
                        >
                          View/Edit EHR
                        </button>
                      </div>
                      {(appointment.status === 'scheduled' || appointment.status === 'confirmed') && (
                        <div className="button-row">
                          <button
                            onClick={() => handleSendReminder(appointment._id)}
                            className="action-btn reminder-btn"
                          >
                            Send Reminder
                          </button>
                          <button
                            onClick={() => handleCancel(appointment._id)}
                            className="action-btn cancel-btn"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {totalPages > 1 && (
                <div className="pagination-controls">
                  <button 
                    onClick={prevPage} 
                    disabled={currentPage === 1}
                    className={`pagination-btn ${currentPage === 1 ? 'disabled' : ''}`}
                  >
                    <i className="fas fa-chevron-left"></i> Previous
                  </button>
                  <div className="page-indicator">
                    Page {currentPage} of {totalPages}
                  </div>
                  <button 
                    onClick={nextPage} 
                    disabled={currentPage === totalPages}
                    className={`pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`}
                  >
                    Next <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <i className="fas fa-calendar empty-icon"></i>
              <p>No upcoming appointments scheduled.</p>
            </div>
          )}
          
          <Link to="/appointments" className="btn btn-primary view-all-btn">
            View All Appointments
          </Link>
        </div>
      </div>

      <style jsx>{`
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        
        .dashboard-date {
          color: #6c757d;
          font-size: 1rem;
        }
        
        .dashboard-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        
        .summary-card {
          background-color: #fff;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          padding: 1.5rem;
          display: flex;
          align-items: center;
          transition: transform 0.2s;
        }
        
        .summary-card:hover {
          transform: translateY(-5px);
        }
        
        .summary-icon {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 1rem;
          font-size: 1.5rem;
          color: white;
        }
        
        .appointments-icon {
          background-color: #2196F3;
        }
        
        .completed-icon {
          background-color: #4CAF50;
        }
        
        .no-show-icon {
          background-color: #F44336;
        }
        
        .rate-icon {
          background-color: #FF9800;
        }
        
        .summary-content {
          flex: 1;
        }
        
        .summary-value {
          font-size: 1.8rem;
          font-weight: 700;
          color: #333;
          line-height: 1.2;
        }
        
        .summary-label {
          color: #6c757d;
          font-size: 0.9rem;
        }
        
        .chart-container {
          height: 300px;
          margin-bottom: 1rem;
        }
        
        .stats-legend {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 1rem;
          margin-top: 1rem;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          margin-right: 1rem;
        }
        
        .legend-color {
          width: 15px;
          height: 15px;
          border-radius: 3px;
          margin-right: 0.5rem;
        }
        
        .legend-label {
          font-size: 0.9rem;
          color: #6c757d;
        }
        
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: #6c757d;
        }
        
        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }
        
        .appointments-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        
        .appointments-count {
          font-size: 0.9rem;
          color: #6c757d;
        }
        
        .appointment-card {
          background-color: #fff;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          margin-bottom: 1rem;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .appointment-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }
        
        .appointment-date-header {
          display: flex;
          align-items: center;
          background-color: #3498db;
          color: white;
          padding: 10px 15px;
        }
        
        .date-label {
          font-weight: 500;
          margin-right: 5px;
        }
        
        .appointment-content {
          padding: 15px;
        }
        
        .patient-name {
          font-size: 1.1rem;
          font-weight: 500;
          margin-bottom: 5px;
        }
        
        .visit-type {
          font-style: italic;
          color: #555;
          margin-bottom: 5px;
        }
        
        .symptoms {
          margin-bottom: 10px;
        }
        
        .symptoms span {
          font-weight: 500;
          margin-right: 5px;
        }
        
        .appointment-action-buttons {
          padding: 0 15px 15px;
        }
        
        .button-row {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
        }
        
        .action-btn {
          flex: 1;
          padding: 8px 10px;
          border-radius: 4px;
          border: none;
          font-size: 0.9rem;
          text-align: center;
          cursor: pointer;
          text-decoration: none;
          transition: background-color 0.2s;
        }
        
        .details-btn {
          background-color: #f8f9fa;
          border: 1px solid #ddd;
          color: #333;
        }
        
        .details-btn:hover {
          background-color: #e9ecef;
        }
        
        .ehr-btn {
          background-color: #17a2b8;
          color: white;
        }
        
        .ehr-btn:hover {
          background-color: #138496;
        }
        
        .reminder-btn {
          background-color: #17a2b8;
          color: white;
        }
        
        .reminder-btn:hover {
          background-color: #138496;
        }
        
        .cancel-btn {
          background-color: #dc3545;
          color: white;
        }
        
        .cancel-btn:hover {
          background-color: #c82333;
        }
        
        .upcoming-appointments-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        
        .view-all-btn {
          margin-top: 1.5rem;
          display: inline-block;
        }
        
        .pagination-controls {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-top: 1.5rem;
          gap: 15px;
        }
        
        .pagination-btn {
          padding: 8px 15px;
          border: 1px solid #ddd;
          background-color: #f8f9fa;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: background-color 0.2s;
        }
        
        .pagination-btn:hover {
          background-color: #e9ecef;
        }
        
        .pagination-btn.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .page-indicator {
          font-size: 0.9rem;
          color: #6c757d;
        }
        
        @media (max-width: 768px) {
          .dashboard-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
          
          .dashboard-summary {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .upcoming-appointments-grid {
            grid-template-columns: 1fr;
          }
          
          .appointments-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default DoctorDashboard;