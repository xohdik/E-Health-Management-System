import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const PatientDashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [upcomingAppointment, setUpcomingAppointment] = useState(null);
  const [ehr, setEhr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch appointments
      const appointmentsRes = await axios.get('/appointments');
      setAppointments(appointmentsRes.data);

      const upcoming = appointmentsRes.data
        .filter(apt => new Date(apt.date) > new Date() && apt.status !== 'canceled')
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
      setUpcomingAppointment(upcoming);

      // Fetch EHR
      const ehrRes = await axios.get('/ehr/auth/my-ehr');
      setEhr(ehrRes.data);

      setLoading(false);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to load dashboard data');
      setLoading(false);
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
          <button onClick={fetchDashboardData} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Count total past visits and upcoming appointments
  const pastVisitsCount = ehr?.pastVisits?.length || 0;
  const upcomingAppointmentsCount = appointments.filter(apt => 
    new Date(apt.date) > new Date() && apt.status !== 'canceled'
  ).length;

  return (
    <div className="dashboard patient-dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {user.firstName}!</h1>
        <div className="dashboard-date">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Dashboard Summary */}
      <div className="dashboard-summary">
        <div className="summary-card">
          <div className="summary-icon appointments-icon">
            <i className="fas fa-calendar-check"></i>
          </div>
          <div className="summary-content">
            <div className="summary-value">{upcomingAppointmentsCount}</div>
            <div className="summary-label">Upcoming Appointments</div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon visits-icon">
            <i className="fas fa-stethoscope"></i>
          </div>
          <div className="summary-content">
            <div className="summary-value">{pastVisitsCount}</div>
            <div className="summary-label">Past Visits</div>
          </div>
        </div>
        
        {upcomingAppointment && (
          <div className="summary-card next-apt">
            <div className="summary-icon clock-icon">
              <i className="fas fa-clock"></i>
            </div>
            <div className="summary-content">
              <div className="summary-value">
                {new Date(upcomingAppointment.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </div>
              <div className="summary-label">Next Appointment</div>
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card upcoming-appointment">
          <div className="card-header">
            <h2>
              <i className="fas fa-calendar-day"></i> Upcoming Appointment
            </h2>
          </div>
          
          {upcomingAppointment ? (
            <div className="appointment-preview">
              <div className="appointment-header">
                <div className="appointment-date">
                  <div className="date-box">
                    <div className="date-month">
                      {new Date(upcomingAppointment.date).toLocaleDateString([], { month: 'short' })}
                    </div>
                    <div className="date-day">
                      {new Date(upcomingAppointment.date).getDate()}
                    </div>
                    <div className="date-year">
                      {new Date(upcomingAppointment.date).getFullYear()}
                    </div>
                  </div>
                  <div className="date-time">
                    {new Date(upcomingAppointment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
              
              <div className="appointment-details">
                <div className="appointment-detail">
                  <div className="detail-label">
                    <i className="fas fa-user-md"></i> Doctor:
                  </div>
                  <div className="detail-value">
                    Dr. {upcomingAppointment.doctor?.user?.firstName} {upcomingAppointment.doctor?.user?.lastName}
                  </div>
                </div>
                
                <div className="appointment-detail">
                  <div className="detail-label">
                    <i className={upcomingAppointment.type === 'telemedicine' ? 'fas fa-video' : 'fas fa-hospital'}></i> Type:
                  </div>
                  <div className="detail-value">
                    {upcomingAppointment.type === 'telemedicine' ? 'Video Consultation' : 'In-person Visit'}
                  </div>
                </div>
                
                <div className="appointment-detail">
                  <div className="detail-label">
                    <i className="fas fa-comment-medical"></i> Symptoms:
                  </div>
                  <div className="detail-value">
                    {upcomingAppointment.symptoms || 'Not specified'}
                  </div>
                </div>
                
                <div className="appointment-detail">
                  <div className="detail-label">
                    <i className="fas fa-info-circle"></i> Status:
                  </div>
                  <div className="detail-value status-value">
                    <span className={`status-badge status-${upcomingAppointment.status}`}>
                      {upcomingAppointment.status}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="appointment-actions">
                <Link to={`/appointments/${upcomingAppointment._id}`} className="btn btn-primary">
                  <i className="fas fa-eye"></i> View Details
                </Link>
                {upcomingAppointment.type === 'telemedicine' && (
                  <Link to={`/telemedicine/call/${upcomingAppointment._id}`} className="btn btn-success">
                    <i className="fas fa-video"></i> Join Call
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <i className="fas fa-calendar-times empty-icon"></i>
              <p>No upcoming appointments scheduled.</p>
              <Link to="/appointments/book" className="btn btn-primary">
                <i className="fas fa-plus-circle"></i> Book an Appointment
              </Link>
            </div>
          )}
        </div>

        <div className="dashboard-card quick-actions">
          <div className="card-header">
            <h2>
              <i className="fas fa-bolt"></i> Quick Actions
            </h2>
          </div>
          
          <div className="actions-grid">
            <Link to="/appointments/book" className="action-card">
              <div className="action-icon book-action">
                <i className="fas fa-calendar-plus"></i>
              </div>
              <div className="action-label">Book Appointment</div>
              <div className="action-description">Schedule a new appointment with a doctor</div>
            </Link>
            
            <Link to="/appointments" className="action-card">
              <div className="action-icon view-action">
                <i className="fas fa-calendar-alt"></i>
              </div>
              <div className="action-label">My Appointments</div>
              <div className="action-description">View and manage your appointments</div>
            </Link>
            
            <Link to="/telemedicine" className="action-card">
              <div className="action-icon tele-action">
                <i className="fas fa-video"></i>
              </div>
              <div className="action-label">Video Consultations</div>
              <div className="action-description">Manage your telemedicine appointments</div>
            </Link>
            
            <Link to={`/patient/records/${user._id}`} className="action-card">
              <div className="action-icon record-action">
                <i className="fas fa-file-medical-alt"></i>
              </div>
              <div className="action-label">Medical Records</div>
              <div className="action-description">Access your health records and history</div>
            </Link>
          </div>
        </div>

        <div className="dashboard-card recent-records">
          <div className="card-header">
            <h2>
              <i className="fas fa-history"></i> Recent Medical Records
            </h2>
            <Link to={`/patient/records/${user._id}`} className="view-all-link">
              View All <i className="fas fa-chevron-right"></i>
            </Link>
          </div>
          
          {ehr && ehr.pastVisits.length > 0 ? (
            <ul className="records-list">
              {ehr.pastVisits.slice(0, 5).map((visit, index) => (
                <li key={index} className="record-item">
                  <div className="record-date-box">
                    <span className="record-month">
                      {new Date(visit.date).toLocaleDateString([], { month: 'short' })}
                    </span>
                    <span className="record-day">
                      {new Date(visit.date).getDate()}
                    </span>
                  </div>
                  <div className="record-info">
                    <div className="record-title">
                      Visit with <span className="doctor-specialization">{visit.doctor?.specialization || 'Doctor'}</span>
                    </div>
                    <div className="record-details">
                      {visit.reason || 'General checkup'}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <i className="fas fa-notes-medical empty-icon"></i>
              <p>No recent medical records found.</p>
            </div>
          )}
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
          background-color: #3498db;
        }
        
        .visits-icon {
          background-color: #2ecc71;
        }
        
        .clock-icon {
          background-color: #f39c12;
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
        
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 1.5rem;
        }
        
        .dashboard-card {
          background-color: #fff;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        
        .card-header h2 {
          font-size: 1.25rem;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .view-all-link {
          color: #3498db;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        
        /* Appointment Preview */
        .appointment-preview {
          padding: 1.5rem;
        }
        
        .appointment-header {
          display: flex;
          justify-content: center;
          margin-bottom: 1.5rem;
        }
        
        .appointment-date {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .date-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1rem;
          background-color: #3498db;
          color: white;
          border-radius: 10px;
          width: 100px;
          margin-bottom: 0.5rem;
        }
        
        .date-month {
          font-size: 1rem;
          text-transform: uppercase;
          font-weight: 500;
        }
        
        .date-day {
          font-size: 2rem;
          font-weight: 700;
          line-height: 1.2;
        }
        
        .date-year {
          font-size: 0.9rem;
        }
        
        .date-time {
          font-size: 1.1rem;
          font-weight: 500;
          color: #333;
        }
        
        .appointment-details {
          margin-bottom: 1.5rem;
        }
        
        .appointment-detail {
          display: flex;
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        
        .appointment-detail:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        
        .detail-label {
          width: 120px;
          font-weight: 500;
          color: #555;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .detail-value {
          flex: 1;
        }
        
        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 500;
          text-transform: capitalize;
        }
        
        .status-scheduled {
          background-color: #ffeaa7;
          color: #d68910;
        }
        
        .status-confirmed {
          background-color: #d6eaf8;
          color: #2874a6;
        }
        
        .appointment-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
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
        
        /* Quick Actions */
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 1rem;
          padding: 1.5rem;
        }
        
        .action-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 1.5rem 1rem;
          border-radius: 8px;
          background-color: #f8f9fa;
          text-decoration: none;
          color: #343a40;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .action-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }
        
        .action-icon {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          font-size: 1.5rem;
          color: white;
        }
        
        .book-action {
          background-color: #3498db;
        }
        
        .view-action {
          background-color: #f39c12;
        }
        
        .tele-action {
          background-color: #9b59b6;
        }
        
        .record-action {
          background-color: #2ecc71;
        }
        
        .action-label {
          font-weight: 500;
          margin-bottom: 0.5rem;
        }
        
        .action-description {
          font-size: 0.85rem;
          color: #6c757d;
        }
        
        /* Recent Records */
        .records-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .record-item {
          display: flex;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          transition: background-color 0.2s;
        }
        
        .record-item:hover {
          background-color: #f8f9fa;
        }
        
        .record-item:last-child {
          border-bottom: none;
        }
        
        .record-date-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-right: 1rem;
          min-width: 60px;
        }
        
        .record-month {
          font-size: 0.8rem;
          color: #6c757d;
          text-transform: uppercase;
        }
        
        .record-day {
          font-size: 1.5rem;
          font-weight: 700;
          color: #333;
        }
        
        .record-info {
          flex: 1;
        }
        
        .record-title {
          font-weight: 500;
          margin-bottom: 0.25rem;
          color: #333;
        }
        
        .doctor-specialization {
          color: #3498db;
        }
        
        .record-details {
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
          
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
          
          .actions-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .appointment-detail {
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .detail-label {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default PatientDashboard;