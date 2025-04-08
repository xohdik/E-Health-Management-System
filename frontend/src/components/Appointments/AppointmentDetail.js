import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

axios.defaults.baseURL = 'http://localhost:5000/api';

const AppointmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await axios.get(`/appointments/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Appointment data:', JSON.stringify(res.data, null, 2));
        setAppointment(res.data);
        setLoading(false);
      } catch (err) {
        setError('You dont have any appointment yet, please book an appointment!');
        setLoading(false);
        console.error('Error fetching appointment:', err);
      }
    };

    fetchAppointment();
  }, [id]);

  const handleReschedule = () => {
    navigate(`/appointments/book?reschedule=${id}`);
  };

  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.put(
          `/appointments/${id}/status`,
          { status: 'canceled' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('Cancel Response:', response.data);
        setAppointment(response.data); // Update with server response
        alert('Appointment cancelled successfully');
      } catch (error) {
        console.error('Error canceling appointment:', error);
        if (error.response) {
          console.error('Server responded with:', error.response.data);
          if (error.response.data.errors) {
            console.error('Validation errors:', error.response.data.errors);
          }
          alert(`Failed to cancel appointment: ${error.response.data.message || 'Server error'}`);
        } else {
          alert('Failed to cancel appointment');
        }
      }
    }
  };

  const formatDoctorInfo = (doctor) => {
    if (!doctor) return 'Not assigned';
    if (doctor.user?.firstName) {
      return `Dr. ${doctor.user.firstName} ${doctor.user.lastName}`;
    }
    if (doctor.firstName) {
      return `Dr. ${doctor.firstName} ${doctor.lastName}`;
    }
    return `Dr. ${doctor.specialization} (${doctor.hospitalAffiliation || 'Unknown'})`;
  };

  if (loading) return <div className="loading">Loading appointment details...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!appointment) return <div className="error">Appointment not found</div>;

  return (
    <div className="appointment-detail-container">
      <h2>Appointment Details</h2>
      <div className="appointment-card">
        <div className="appointment-header">
          <h3>Appointment on {new Date(appointment.date).toLocaleDateString()}</h3>
          <span className={`status ${appointment.status.toLowerCase()}`}>
            {appointment.status}
          </span>
        </div>

        <div className="appointment-info">
          <p><strong>Time:</strong> {new Date(appointment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          <p>
            <strong>Doctor:</strong> {formatDoctorInfo(appointment.doctor)}
            {appointment.doctor && (
              <span className="doctor-specialization">({appointment.doctor.specialization})</span>
            )}
          </p>
          <p><strong>Patient:</strong> {appointment.patient?.firstName} {appointment.patient?.lastName}</p>
          <p><strong>Type:</strong> {appointment.type === 'in-person' ? 'In-Person' : 'Telemedicine'}</p>
          <p><strong>Reason:</strong> {appointment.reason}</p>
          <p><strong>Duration:</strong> {appointment.duration} minutes</p>
          {appointment.notes && (
            <div className="notes-section">
              <h4>Notes</h4>
              <p>{appointment.notes}</p>
            </div>
          )}
        </div>

        <div className="appointment-actions">
          {appointment.status === 'scheduled' && (
            <>
              <button className="btn btn-primary" onClick={handleReschedule}>Reschedule</button>
              <button className="btn btn-danger" onClick={handleCancel}>Cancel Appointment</button>
            </>
          )}
          {appointment.status === 'canceled' && (
            <p className="canceled-message">This appointment has been canceled.</p>
          )}
          {appointment.status === 'completed' && (
            <p className="completed-message">This appointment has been completed.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetail;