import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Telemedicine = () => {
  const [sessions, setSessions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch telemedicine sessions
        const sessionsResponse = await axios.get('/telemedicine/sessions');
        console.log('Sessions data:', sessionsResponse.data); // For debugging
        setSessions(sessionsResponse.data);

        // Fetch appointments (for doctors to create sessions)
        if (user.role === 'doctor') {
          const appointmentsResponse = await axios.get('/appointments');
          console.log('Appointments data:', appointmentsResponse.data); // For debugging
          
          // Filter for telemedicine appointments that don't have a session yet
          setAppointments(
            appointmentsResponse.data.filter(
              appt => appt.type === 'telemedicine' && !sessionsResponse.data.some(session => 
                session.appointment && session.appointment._id === appt._id
              )
            )
          );
        }
      } catch (err) {
        setError('Failed to load data. Please try again.');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleJoinSession = async (appointmentId) => {
    try {
      // Validate the session before joining
      await axios.get(`/telemedicine/validate/${appointmentId}`);
      navigate(`/telemedicine/call/${appointmentId}`);
    } catch (err) {
      setError('Failed to join session. Please try again.');
      console.error('Error joining session:', err);
    }
  };

  const handleCreateSession = async (appointmentId) => {
    try {
      // Create a new telemedicine session
      await axios.post('/telemedicine/sessions', { appointmentId });
      // Refresh sessions
      const sessionsResponse = await axios.get('/telemedicine/sessions');
      setSessions(sessionsResponse.data);
      // Update appointments list
      setAppointments(appointments.filter(appt => appt._id !== appointmentId));
    } catch (err) {
      setError('Failed to create session. Please try again.');
      console.error('Error creating session:', err);
    }
  };

  // Helper function to safely display participant names
  const getParticipantName = (session) => {
    if (session.doctor && session.doctor.user && session.doctor.user.firstName) {
      return `${session.doctor.user.firstName} ${session.doctor.user.lastName || ''}`;
    } else if (session.patient && session.patient.firstName) {
      return `${session.patient.firstName} ${session.patient.lastName || ''}`;
    } else if (session.doctor && session.doctor.firstName) {
      // Some APIs might return doctor data directly rather than nested under user
      return `${session.doctor.firstName} ${session.doctor.lastName || ''}`;
    } else {
      return 'Unknown';
    }
  };

  if (loading) {
    return <div>Loading sessions...</div>;
  }

  return (
    <div className="telemedicine-container" style={{ padding: '20px' }}>
      <h2>Telemedicine Sessions</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* List of Sessions */}
      <h3>Your Sessions</h3>
      {sessions.length === 0 ? (
        <p>No telemedicine sessions found.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {sessions.map(session => (
            <li
              key={session._id}
              style={{
                border: '1px solid #ddd',
                padding: '10px',
                marginBottom: '10px',
                borderRadius: '5px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <strong>Session with:</strong> {getParticipantName(session)} <br />
                <strong>Date:</strong> {session.appointment && session.appointment.date 
                  ? new Date(session.appointment.date).toLocaleString() 
                  : 'Date not available'} <br />
                <strong>Status:</strong> {session.status || 'Unknown'}
              </div>
              {session.status === 'pending' && session.appointment && (
                <button
                  onClick={() => handleJoinSession(session.appointment._id)}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                >
                  Join Session
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Create Session (for Doctors) */}
      {user.role === 'doctor' && (
        <>
          <h3>Available Telemedicine Appointments</h3>
          {appointments.length === 0 ? (
            <p>No telemedicine appointments available to create a session.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {appointments.map(appt => (
                <li
                  key={appt._id}
                  style={{
                    border: '1px solid #ddd',
                    padding: '10px',
                    marginBottom: '10px',
                    borderRadius: '5px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <strong>Patient:</strong> {appt.patient && appt.patient.firstName 
                      ? `${appt.patient.firstName} ${appt.patient.lastName || ''}`
                      : 'Unknown'} <br />
                    <strong>Date:</strong> {appt.date 
                      ? new Date(appt.date).toLocaleString()
                      : 'Date not available'} <br />
                    <strong>Reason:</strong> {appt.reason || 'No reason provided'}
                  </div>
                  <button
                    onClick={() => handleCreateSession(appt._id)}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    Create Session
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default Telemedicine;