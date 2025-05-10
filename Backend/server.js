const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const WebSocket = require('ws');
const Appointment = require('./models/Appointment');
const Doctor = require('./models/Doctor');
const cors = require('cors');

dotenv.config();

const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  credentials: true
}));

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/appointments', require('./routes/appointments.routes'));
app.use('/api/telemedicine', require('./routes/telemedicine.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/ehr', require('./routes/ehr.routes'));

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
const rooms = new Map();

// Clear rooms on server start
rooms.clear();
console.log('Cleared rooms on server start');

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');

  ws.on('message', async (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (error) {
      console.error('Invalid message format:', error);
      return;
    }

    const { type, appointmentId, userId, signal, audioOnly } = data;

    if (type === 'join') {
      try {
        const appointment = await Appointment.findById(appointmentId)
          .populate('doctor', '_id')
          .populate('patient', '_id');

        if (!appointment) {
          ws.send(JSON.stringify({ type: 'error', message: 'Appointment not found' }));
          return;
        }

        console.log('Joining userId:', userId);
        console.log('Appointment doctorId:', appointment.doctor._id.toString());
        console.log('Appointment patientId:', appointment.patient._id.toString());
        console.log('Received audioOnly:', audioOnly);

        const doctorProfile = await Doctor.findOne({ user: userId });
        const isDoctor = doctorProfile && appointment.doctor._id.toString() === doctorProfile._id.toString();
        const isPatient = appointment.patient._id.toString() === userId.toString();

        console.log('Doctor Profile:', doctorProfile);
        console.log('Is Doctor:', isDoctor, 'Is Patient:', isPatient);

        if (!isDoctor && !isPatient) {
          ws.send(JSON.stringify({ type: 'error', message: 'Not authorized to join this call' }));
          return;
        }

        const role = isDoctor ? 'doctor' : 'patient';
        console.log('Assigned Role:', role);

        if (!rooms.has(appointmentId)) {
          rooms.set(appointmentId, { doctor: null, patient: null, startTime: null });
        }

        const room = rooms.get(appointmentId);
        console.log('Current Room State (Before):', room);

        // Check if the same userId is already in the room (duplicate connection)
        if (room[role] && room[role].userId === userId) {
          console.log(`Duplicate connection for ${role} (userId: ${userId}), closing old connection`);
          if (room[role].ws.readyState === WebSocket.OPEN) {
            room[role].ws.close();
          }
        } else if (room[role]) {
          ws.send(JSON.stringify({ type: 'error', message: `${role.charAt(0).toUpperCase() + role.slice(1)} already in the call` }));
          return;
        }

        room[role] = { ws, userId, audioOnly: audioOnly || false }; // Ensure audioOnly is set correctly
        ws.send(JSON.stringify({ type: 'role', role }));

        console.log('Current Room State (After):', room);

        if (room.doctor && room.patient) {
          room.startTime = Date.now();
          await Appointment.findByIdAndUpdate(appointmentId, { callStatus: 'ongoing' });
          room.doctor.ws.send(JSON.stringify({ type: 'user-joined', role: 'patient', audioOnly: room.patient.audioOnly }));
          room.patient.ws.send(JSON.stringify({ type: 'user-joined', role: 'doctor', audioOnly: room.doctor.audioOnly }));
        }
      } catch (error) {
        console.error('Error joining call:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to join call' }));
      }
    } else if (type === 'signal') {
      const room = rooms.get(appointmentId);
      if (!room) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
        return;
      }

      const target = room.doctor?.userId === userId ? room.patient : room.doctor;
      if (target) {
        console.log(`Relaying signal from userId ${userId} to target userId ${target.userId}`);
        target.ws.send(JSON.stringify({ type: 'signal', signal }));
      } else {
        console.error(`Target not found for userId ${userId} in room ${appointmentId}`);
      }
    } else if (type === 'leave') {
      const room = rooms.get(appointmentId);
      if (!room) return;

      let roleLeft;
      if (room.doctor?.userId === userId) {
        roleLeft = 'doctor';
        room.doctor = null;
        if (room.patient) {
          room.patient.ws.send(JSON.stringify({ type: 'user-left', role: 'doctor' }));
        }
      } else if (room.patient?.userId === userId) {
        roleLeft = 'patient';
        room.patient = null;
        if (room.doctor) {
          room.doctor.ws.send(JSON.stringify({ type: 'user-left', role: 'patient' }));
        }
      }

      if (!room.doctor && !room.patient) {
        if (room.startTime) {
          const duration = Math.round((Date.now() - room.startTime) / 1000);
          await Appointment.findByIdAndUpdate(appointmentId, {
            callStatus: 'completed',
            callDuration: duration,
          });
        }
        rooms.delete(appointmentId);
        console.log(`Room ${appointmentId} deleted`);
      }
    }
  });

  ws.on('close', async () => {
    console.log('WebSocket connection closed');
    for (const [appointmentId, room] of rooms.entries()) {
      let roleLeft;
      if (room.doctor?.ws === ws) {
        roleLeft = 'doctor';
        room.doctor = null;
        if (room.patient) {
          room.patient.ws.send(JSON.stringify({ type: 'user-left', role: 'doctor' }));
        }
      } else if (room.patient?.ws === ws) {
        roleLeft = 'patient';
        room.patient = null;
        if (room.doctor) {
          room.doctor.ws.send(JSON.stringify({ type: 'user-left', role: 'patient' }));
        }
      }
      if (!room.doctor && !room.patient) {
        if (room.startTime) {
          const duration = Math.round((Date.now() - room.startTime) / 1000);
          await Appointment.findByIdAndUpdate(appointmentId, {
            callStatus: 'completed',
            callDuration: duration,
          });
        }
        rooms.delete(appointmentId);
        console.log(`Room ${appointmentId} deleted`);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});