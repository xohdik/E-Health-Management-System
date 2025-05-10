// src/components/Patients.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Patients = () => {
  const [patients, setPatients] = useState([]);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        // Fetch appointments for the logged-in doctor
        const response = await axios.get('/appointments');
        const appointments = response.data;

        // Extract unique patients from appointments
        const patientMap = new Map();
        appointments.forEach(appointment => {
          const patient = appointment.patient;
          if (patient && !patientMap.has(patient._id)) {
            patientMap.set(patient._id, {
              id: patient._id,
              firstName: patient.firstName,
              lastName: patient.lastName,
              email: patient.email,
              appointments: []
            });
          }
          if (patient) {
            patientMap.get(patient._id).appointments.push({
              id: appointment._id,
              date: new Date(appointment.date).toLocaleString(),
              reason: appointment.reason,
              status: appointment.status,
              type: appointment.type
            });
          }
        });

        // Convert map to array for rendering
        const patientList = Array.from(patientMap.values());
        setPatients(patientList);
      } catch (err) {
        setError('Failed to load patients. Please try again.');
        console.error('Error fetching patients:', err);
      }
    };

    fetchPatients();
  }, []);

  return (
    <div className="patients-container" style={{ padding: '20px' }}>
      <h2>My Patients</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {patients.length === 0 ? (
        <p>No patients found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f4f4f4' }}>
              <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Name</th>
              <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Email</th>
              <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Appointments</th>
            </tr>
          </thead>
          <tbody>
            {patients.map(patient => (
              <tr key={patient.id}>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                  {patient.firstName} {patient.lastName}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>{patient.email}</td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                  {patient.appointments.length === 0 ? (
                    <p>No appointments</p>
                  ) : (
                    <ul style={{ paddingLeft: '20px', margin: 0 }}>
                      {patient.appointments.map(appt => (
                        <li key={appt.id}>
                          {appt.date} - {appt.reason} ({appt.type}, {appt.status})
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Patients;