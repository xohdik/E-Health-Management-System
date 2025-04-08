import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const AppointmentCalendar = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  const userRole = localStorage.getItem('userRole');
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        // Changed to use the main appointments endpoint instead of /user
        const res = await axios.get('/appointments', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAppointments(res.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching appointments:', err);
        
        // More detailed error handling
        if (err.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error('Server response:', err.response.data);
          setError(`Error: ${err.response.data.message || 'Failed to load appointments'}`);
        } else if (err.request) {
          // The request was made but no response was received
          setError('Network error: Server not responding');
        } else {
          // Something happened in setting up the request
          setError('Failed to load appointments. Please try again later.');
        }
        
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [token]);

  const filteredAppointments = appointments.filter((apt) => {
    if (filter === 'all') return true;
    if (filter === 'upcoming')
      return new Date(apt.date) > new Date() && apt.status !== 'canceled';
    if (filter === 'past')
      return new Date(apt.date) < new Date() ||
        apt.status === 'completed' ||
        apt.status === 'canceled';
    return apt.status === filter;
  });

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      setError(null);
      const response = await axios.put(
        `/appointments/${appointmentId}/confirm`,
        { status: newStatus },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setAppointments(prev =>
        prev.map(apt =>
          apt._id === appointmentId 
            ? { ...apt, status: newStatus } 
            : apt
        )
      );
    } catch (err) {
      console.error('Error updating appointment status:', err);
      setError(
        err.response?.data?.message || 
        'Failed to update appointment status. Please try again.'
      );
    }
  };

  if (loading) return <div className="loading">Loading appointments...</div>;

  return (
    <div className="appointments-container">
      <div className="appointments-header">
        <h1>Appointments</h1>
        {userRole === 'patient' && (
          <Link to="/appointments/book" className="btn btn-primary">
            <i className="fas fa-plus"></i> Book New Appointment
          </Link>
        )}
      </div>

      <div className="filters">
        {['all', 'upcoming', 'past', 'confirmed', 'canceled'].map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {filteredAppointments.length === 0 ? (
        <div className="no-appointments">
          <p>No appointments found.</p>
        </div>
      ) : (
        <div className="appointments-list">
          {filteredAppointments.map((appointment) => {
            const isFuture = new Date(appointment.date) > new Date();
            const isPatient = userRole === 'patient';
            const isDoctor = userRole === 'doctor';

            return (
              <div
                key={appointment._id}
                className={`appointment-card ${appointment.status}`}
              >
                <div className="appointment-date">
                  <div className="date">
                    {new Date(appointment.date).toLocaleDateString()}
                  </div>
                  <div className="time">
                    {new Date(appointment.date).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                <div className="appointment-details">
                  {isPatient ? (
                    <h3>
                      Dr. {appointment.doctor?.user?.firstName}{' '}
                      {appointment.doctor?.user?.lastName}
                    </h3>
                  ) : (
                    <h3>
                      {appointment.patient?.firstName}{' '}
                      {appointment.patient?.lastName}
                    </h3>
                  )}
                  <p className="type">
                    <i
                      className={`fas fa-${
                        appointment.type === 'telemedicine'
                          ? 'video'
                          : 'user-md'
                      }`}
                    ></i>
                    {appointment.type === 'telemedicine'
                      ? 'Video Consultation'
                      : 'In-person Visit'}
                  </p>
                  <p className="reason">{appointment.reason}</p>
                  <div className={`status ${appointment.status}`}>
                    {appointment.status}
                  </div>
                </div>

                <div className="appointment-actions">
                  <Link
                    to={`/appointments/${appointment._id}`}
                    className="btn btn-sm"
                  >
                    View Details
                  </Link>

                  {/* Doctor can confirm scheduled appointments */}
                  {isDoctor && appointment.status === 'scheduled' && isFuture && (
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() =>
                        handleStatusChange(appointment._id, 'confirmed')
                      }
                    >
                      Confirm
                    </button>
                  )}

                  {/* Cancel button */}
                  {isFuture && 
                    appointment.status !== 'canceled' && 
                    appointment.status !== 'completed' && 
                    ((isPatient && appointment.patient._id === userId) || isDoctor) && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() =>
                          handleStatusChange(appointment._id, 'canceled')
                        }
                      >
                        Cancel
                      </button>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AppointmentCalendar;