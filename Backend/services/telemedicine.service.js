// File: /backend/services/telemedicine.service.js
const TelemedicineSession = require('../models/TelemedicineSession');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

// Create a new telemedicine session for an appointment
exports.createSession = async (appointmentId) => {
  try {
    // Check if appointment exists
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      throw new Error('Appointment not found');
    }
    
    // Check if appointment is of type telemedicine
    if (appointment.type !== 'telemedicine') {
      throw new Error('Appointment is not a telemedicine appointment');
    }
    
    // Check if session already exists
    const existingSession = await TelemedicineSession.findOne({ appointment: appointmentId });
    if (existingSession) {
      return existingSession;
    }
    
    // Generate session ID for video call
    const videoSessionId = uuidv4();
    
    // Create new session
    const session = new TelemedicineSession({
      appointment: appointmentId,
      patient: appointment.patient,
      doctor: appointment.doctor,
      videoSessionId,
    });
    
    await session.save();
    return session;
  } catch (error) {
    console.error('Error creating telemedicine session:', error);
    throw error;
  }
};

// Generate access token for video session
exports.generateAccessToken = async (sessionId, userId, role) => {
  try {
    const session = await TelemedicineSession.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Check if user is part of the session
    if (session.patient.toString() !== userId && session.doctor.toString() !== userId) {
      throw new Error('User is not authorized for this session');
    }
    
    // Generate JWT token for video session
    const payload = {
      sessionId: session.videoSessionId,
      userId,
      role,
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiration
    };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET);
    
    // Update session with token
    session.videoSessionToken = token;
    await session.save();
    
    return {
      sessionId: session.videoSessionId,
      token
    };
  } catch (error) {
    console.error('Error generating access token:', error);
    throw error;
  }
};

// Start a telemedicine session
exports.startSession = async (sessionId, userId) => {
  try {
    const session = await TelemedicineSession.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Check if user is the doctor
    if (session.doctor.toString() !== userId) {
      throw new Error('Only the doctor can start the session');
    }
    
    // Update session status
    session.status = 'in-progress';
    session.startTime = new Date();
    
    await session.save();
    
    // Update appointment status
    await Appointment.findByIdAndUpdate(
      session.appointment,
      { status: 'confirmed' }
    );
    
    return session;
  } catch (error) {
    console.error('Error starting telemedicine session:', error);
    throw error;
  }
};

// End a telemedicine session
exports.endSession = async (sessionId, userId, notes, diagnosis, prescription) => {
  try {
    const session = await TelemedicineSession.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Check if user is the doctor
    if (session.doctor.toString() !== userId) {
      throw new Error('Only the doctor can end the session');
    }
    
    // Update session status
    session.status = 'completed';
    session.endTime = new Date();
    session.notes = notes || session.notes;
    session.diagnosis = diagnosis || session.diagnosis;
    session.prescription = prescription || session.prescription;
    
    // Calculate duration
    if (session.startTime) {
      const durationMs = session.endTime - session.startTime;
      session.duration = Math.floor(durationMs / (1000 * 60)); // Convert to minutes
    }
    
    await session.save();
    
    // Update appointment status
    await Appointment.findByIdAndUpdate(
      session.appointment,
      { status: 'completed' }
    );
    
    return session;
  } catch (error) {
    console.error('Error ending telemedicine session:', error);
    throw error;
  }
};

// Send a message in a telemedicine session
exports.sendMessage = async (sessionId, userId, text, attachment, attachmentType) => {
  try {
    const session = await TelemedicineSession.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Check if user is part of the session
    if (session.patient.toString() !== userId && session.doctor.toString() !== userId) {
      throw new Error('User is not authorized for this session');
    }
    
    // Create message
    const message = {
      sender: userId,
      text,
      timestamp: new Date()
    };
    
    // Add attachment if provided
    if (attachment) {
      message.attachment = attachment;
      message.attachmentType = attachmentType || 'other';
    }
    
    // Add message to session
    session.messages.push(message);
    await session.save();
    
    return message;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Get all messages for a session
exports.getMessages = async (sessionId, userId) => {
  try {
    const session = await TelemedicineSession.findById(sessionId)
      .populate('messages.sender', 'firstName lastName');
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Check if user is part of the session
    if (session.patient.toString() !== userId && session.doctor.toString() !== userId) {
      throw new Error('User is not authorized for this session');
    }
    
    // Mark unread messages as read
    if (session.messages && session.messages.length > 0) {
      session.messages.forEach(message => {
        if (message.sender.toString() !== userId && !message.read) {
          message.read = true;
        }
      });
      
      await session.save();
    }
    
    return session.messages;
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
};

// Get session details
exports.getSessionDetails = async (sessionId, userId) => {
  try {
    const session = await TelemedicineSession.findById(sessionId)
      .populate('patient', 'firstName lastName email')
      .populate('doctor', 'firstName lastName email')
      .populate('appointment');
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Check if user is part of the session
    if (session.patient._id.toString() !== userId && session.doctor._id.toString() !== userId) {
      throw new Error('User is not authorized for this session');
    }
    
    return session;
  } catch (error) {
    console.error('Error getting session details:', error);
    throw error;
  }
};

// Get all sessions for a user
exports.getUserSessions = async (userId, role, status) => {
  try {
    let query = {};
    
    // Filter by user role
    if (role === 'patient') {
      query.patient = userId;
    } else if (role === 'doctor') {
      query.doctor = userId;
    } else {
      throw new Error('Invalid role');
    }
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    const sessions = await TelemedicineSession.find(query)
      .populate('patient', 'firstName lastName email')
      .populate('doctor', 'firstName lastName email')
      .populate('appointment')
      .sort({ createdAt: -1 });
    
    return sessions;
  } catch (error) {
    console.error('Error getting user sessions:', error);
    throw error;
  }
};