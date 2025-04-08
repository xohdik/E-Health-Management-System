const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const WebSocket = require('ws');

dotenv.config();

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/notifications', require('./routes/notifications'));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Create HTTP server and WebSocket server
const server = app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});

const wss = new WebSocket.Server({ server });

// WebSocket signaling for telemedicine
const rooms = new Map(); // Map to store room data (appointmentId -> { doctor, patient })

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');

  ws.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (error) {
      console.error('Invalid message format:', error);
      return;
    }

    const { type, appointmentId, userId, signal } = data;

    if (type === 'join') {
      // Handle user joining a telemedicine call
      if (!rooms.has(appointmentId)) {
        rooms.set(appointmentId, { doctor: null, patient: null });
      }

      const room = rooms.get(appointmentId);

      // Determine if the user is the doctor or patient
      // This will be validated by the frontend, but we can add additional checks here
      if (room.doctor && room.patient) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
        return;
      }

      if (!room.doctor) {
        room.doctor = { ws, userId };
        ws.send(JSON.stringify({ type: 'role', role: 'doctor' }));
      } else if (!room.patient) {
        room.patient = { ws, userId };
        ws.send(JSON.stringify({ type: 'role', role: 'patient' }));
      }

      // Notify the other participant if both are present
      if (room.doctor && room.patient) {
        room.doctor.ws.send(JSON.stringify({ type: 'user-joined', role: 'patient' }));
        room.patient.ws.send(JSON.stringify({ type: 'user-joined', role: 'doctor' }));
      }
    } else if (type === 'signal') {
      // Handle WebRTC signaling (offer, answer, ICE candidates)
      const room = rooms.get(appointmentId);
      if (!room) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
        return;
      }

      const target = room.doctor?.userId === userId ? room.patient : room.doctor;
      if (target) {
        target.ws.send(JSON.stringify({ type: 'signal', signal }));
      }
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    // Clean up rooms
    for (const [appointmentId, room] of rooms.entries()) {
      if (room.doctor?.ws === ws) {
        room.doctor = null;
        if (room.patient) {
          room.patient.ws.send(JSON.stringify({ type: 'user-left', role: 'doctor' }));
        }
      } else if (room.patient?.ws === ws) {
        room.patient = null;
        if (room.doctor) {
          room.doctor.ws.send(JSON.stringify({ type: 'user-left', role: 'patient' }));
        }
      }
      if (!room.doctor && !room.patient) {
        rooms.delete(appointmentId);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});