const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const TelemedicineSession = require('../models/TelemedicineSession');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendPatientNotification, sendDoctorNotification } = require('../services/notification');

// @route   GET /api/telemedicine/validate/:appointmentId
// @desc    Validate a telemedicine appointment before joining
// @access  Private
router.get('/validate/:appointmentId', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId)
      .populate('doctor', '_id')
      .populate('patient', '_id');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.type !== 'telemedicine') {
      return res.status(400).json({ message: 'This appointment is not a telemedicine appointment' });
    }

    if (!['scheduled', 'confirmed'].includes(appointment.status)) {
      return res.status(400).json({ message: 'This appointment is not in a valid state for a call' });
    }

    const userId = req.user.id;
    console.log('Validate Endpoint - User ID:', userId);
    console.log('Validate Endpoint - Appointment Doctor ID:', appointment.doctor._id.toString());
    console.log('Validate Endpoint - Appointment Patient ID:', appointment.patient._id.toString());

    const doctorProfile = await Doctor.findOne({ user: userId });
    const isDoctor = doctorProfile && appointment.doctor._id.toString() === doctorProfile._id.toString();
    const isPatient = appointment.patient._id.toString() === userId.toString();

    console.log('Validate Endpoint - Doctor Profile:', doctorProfile);
    console.log('Validate Endpoint - Is Doctor:', isDoctor, 'Is Patient:', isPatient);

    if (!isDoctor && !isPatient) {
      return res.status(403).json({ message: 'Not authorized to join this call' });
    }

    const role = isDoctor ? 'doctor' : 'patient';
    console.log('Validate Endpoint - Assigned Role:', role);

    res.json({
      appointment,
      role,
    });
  } catch (error) {
    console.error('Error validating telemedicine appointment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/telemedicine/sessions
// @desc    Create a new telemedicine session
// @access  Private (Doctors)
router.post(
  '/sessions',
  [
    protect,
    authorize('doctor'),
    [
      check('appointmentId', 'Appointment ID is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    try {
      const { appointmentId } = req.body;
      const userId = req.user.id;

      const appointment = await Appointment.findById(appointmentId)
        .populate('doctor', '_id')
        .populate('patient', '_id');

      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }

      if (appointment.type !== 'telemedicine') {
        return res.status(400).json({ message: 'This appointment is not a telemedicine appointment' });
      }

      if (!['scheduled', 'confirmed'].includes(appointment.status)) {
        return res.status(400).json({ message: 'This appointment is not in a valid state for a call' });
      }

      const doctorProfile = await Doctor.findOne({ user: userId });
      if (!doctorProfile || !appointment.doctor._id.equals(doctorProfile._id)) {
        return res.status(403).json({ message: 'Not authorized to create this session' });
      }

      const existingSession = await TelemedicineSession.findOne({ appointment: appointmentId });
      if (existingSession) {
        return res.status(400).json({ message: 'A telemedicine session already exists for this appointment' });
      }

      const session = new TelemedicineSession({
        appointment: appointmentId,
        doctor: appointment.doctor._id,
        patient: appointment.patient._id,
        status: 'pending',
      });

      await session.save();

      res.status(201).json({
        message: 'Telemedicine session created successfully',
        session,
      });
    } catch (error) {
      console.error('Error creating telemedicine session:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// @route   GET /api/telemedicine/sessions/:sessionId/token
// @desc    Generate access token for video session
// @access  Private (Session participants)
router.get(
  '/sessions/:sessionId/token',
  protect,
  async (req, res) => {
    try {
      const session = await TelemedicineSession.findById(req.params.sessionId)
        .populate('appointment')
        .populate('doctor')
        .populate('patient');

      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }

      const userId = req.user.id;
      const doctorProfile = await Doctor.findOne({ user: userId });
      const isDoctor = doctorProfile && session.doctor._id.equals(doctorProfile._id);
      const isPatient = session.patient._id.toString() === userId;

      if (!isDoctor && !isPatient) {
        return res.status(403).json({ message: 'Not authorized to access this session' });
      }

      const token = jwt.sign(
        { sessionId: session._id, userId, role: isDoctor ? 'doctor' : 'patient' },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '1h' }
      );

      res.json({ token });
    } catch (error) {
      console.error('Error generating access token:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// @route   PUT /api/telemedicine/sessions/:sessionId/start
// @desc    Start a telemedicine session
// @access  Private (Doctors)
router.put(
  '/sessions/:sessionId/start',
  [protect, authorize('doctor')],
  async (req, res) => {
    try {
      const session = await TelemedicineSession.findById(req.params.sessionId)
        .populate({
          path: 'appointment',
          populate: [
            { path: 'patient', select: 'firstName lastName email' },
            { path: 'doctor', populate: { path: 'user', select: 'firstName lastName email' } }
          ]
        });

      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }

      const userId = req.user.id;
      const doctorProfile = await Doctor.findOne({ user: userId });
      if (!doctorProfile || !session.doctor._id.equals(doctorProfile._id)) {
        return res.status(403).json({ message: 'Not authorized to start this session' });
      }

      if (session.status !== 'pending') {
        return res.status(400).json({ message: 'Session is not in a pending state' });
      }

      session.status = 'active';
      session.startTime = new Date();
      await session.save();

      await Appointment.findByIdAndUpdate(session.appointment._id, { callStatus: 'ongoing' });

      const patientEmail = session.appointment.patient.email;
      const doctorEmail = session.appointment.doctor.user.email;
      const patientName = `${session.appointment.patient.firstName} ${session.appointment.patient.lastName}`;
      const doctorName = `${session.appointment.doctor.user.firstName} ${session.appointment.doctor.user.lastName}`;
      const appointmentDate = session.appointment.date.toISOString();

      await sendPatientNotification(
        patientEmail,
        'TELEMEDICINE_SESSION_STARTED',
        [patientName, doctorName, appointmentDate, true]
      );

      await sendDoctorNotification(
        doctorEmail,
        'TELEMEDICINE_SESSION_STARTED',
        [doctorName, patientName, appointmentDate, false]
      );

      res.json({ message: 'Session started successfully', session });
    } catch (error) {
      console.error('Error starting telemedicine session:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// @route   PUT /api/telemedicine/sessions/:sessionId/end
// @desc    End a telemedicine session
// @access  Private (Doctors)
router.put(
  '/sessions/:sessionId/end',
  protect, authorize('doctor'),
  async (req, res) => {
    try {
      const session = await TelemedicineSession.findById(req.params.sessionId)
        .populate({
          path: 'appointment',
          populate: [
            { path: 'patient', select: 'firstName lastName email' },
            { path: 'doctor', populate: { path: 'user', select: 'firstName lastName email' } }
          ]
        });

      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }

      const userId = req.user.id;
      const doctorProfile = await Doctor.findOne({ user: userId });
      if (!doctorProfile || !session.doctor._id.equals(doctorProfile._id)) {
        return res.status(403).json({ message: 'Not authorized to end this session' });
      }

      if (session.status !== 'active') {
        return res.status(400).json({ message: 'Session is not active' });
      }

      session.status = 'ended';
      session.endTime = new Date();
      await session.save();

      const duration = Math.round((session.endTime - session.startTime) / 1000);
      await Appointment.findByIdAndUpdate(session.appointment._id, {
        callStatus: 'completed',
        callDuration: duration,
      });

      const patientEmail = session.appointment.patient.email;
      const doctorEmail = session.appointment.doctor.user.email;
      const patientName = `${session.appointment.patient.firstName} ${session.appointment.patient.lastName}`;
      const doctorName = `${session.appointment.doctor.user.firstName} ${session.appointment.doctor.user.lastName}`;
      const appointmentDate = session.appointment.date.toISOString();

      await sendPatientNotification(
        patientEmail,
        'TELEMEDICINE_SESSION_ENDED',
        [patientName, doctorName, appointmentDate, duration, true]
      );

      await sendDoctorNotification(
        doctorEmail,
        'TELEMEDICINE_SESSION_ENDED',
        [doctorName, patientName, appointmentDate, duration, false]
      );

      res.json({ message: 'Session ended successfully', session });
    } catch (error) {
      console.error('Error ending telemedicine session:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// @route   POST /api/telemedicine/sessions/:sessionId/messages
// @desc    Send a message in a telemedicine session
// @access  Private (Session participants)
router.post(
  '/sessions/:sessionId/messages',
  [
    protect,
    [
      check('text', 'Message text is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    try {
      const { text } = req.body;
      const session = await TelemedicineSession.findById(req.params.sessionId)
        .populate('doctor')
        .populate('patient');

      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }

      const userId = req.user.id;
      const doctorProfile = await Doctor.findOne({ user: userId });
      const isDoctor = doctorProfile && session.doctor._id.equals(doctorProfile._id);
      const isPatient = session.patient._id.toString() === userId;

      if (!isDoctor && !isPatient) {
        return res.status(403).json({ message: 'Not authorized to send messages in this session' });
      }

      if (session.status !== 'active') {
        return res.status(400).json({ message: 'Session is not active' });
      }

      const message = {
        sender: userId,
        text,
        timestamp: new Date(),
      };

      session.messages.push(message);
      await session.save();

      res.status(201).json({ message: 'Message sent successfully', message });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// @route   GET /api/telemedicine/sessions/:sessionId/messages
// @desc    Get all messages for a session
// @access  Private (Session participants)
router.get(
  '/sessions/:sessionId/messages',
  protect,
  async (req, res) => {
    try {
      const session = await TelemedicineSession.findById(req.params.sessionId)
        .populate('doctor')
        .populate('patient')
        .populate('messages.sender', 'firstName lastName');

      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }

      const userId = req.user.id;
      const doctorProfile = await Doctor.findOne({ user: userId });
      const isDoctor = doctorProfile && session.doctor._id.equals(doctorProfile._id);
      const isPatient = session.patient._id.toString() === userId;

      if (!isDoctor && !isPatient) {
        return res.status(403).json({ message: 'Not authorized to view messages in this session' });
      }

      res.json(session.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// @route   GET /api/telemedicine/sessions/:sessionId
// @desc    Get session details
// @access  Private (Session participants)
router.get(
  '/sessions/:sessionId',
  protect,
  async (req, res) => {
    try {
      const session = await TelemedicineSession.findById(req.params.sessionId)
        .populate('appointment')
        .populate('doctor')
        .populate('patient');

      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }

      const userId = req.user.id;
      const doctorProfile = await Doctor.findOne({ user: userId });
      const isDoctor = doctorProfile && session.doctor._id.equals(doctorProfile._id);
      const isPatient = session.patient._id.toString() === userId;

      if (!isDoctor && !isPatient) {
        return res.status(403).json({ message: 'Not authorized to view this session' });
      }

      res.json(session);
    } catch (error) {
      console.error('Error fetching session details:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// @route   GET /api/telemedicine/sessions
// @desc    Get all sessions for a user
// @access  Private
router.get(
  '/sessions',
  protect,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const doctorProfile = await Doctor.findOne({ user: userId });
      const isDoctor = !!doctorProfile;

      let sessions;
      if (isDoctor) {
        sessions = await TelemedicineSession.find({ doctor: doctorProfile._id })
          .populate('appointment')
          .populate('patient')
          .sort({ createdAt: -1 });
      } else {
        sessions = await TelemedicineSession.find({ patient: userId })
          .populate('appointment')
          .populate('doctor')
          .sort({ createdAt: -1 });
      }

      res.json(sessions);
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

module.exports = router;