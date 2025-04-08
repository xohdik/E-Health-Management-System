// backend/controllers/telemedicine.controller.js - Real implementation

const telemedicineService = require('../services/telemedicine.service');
const { validationResult } = require('express-validator');

// Create a telemedicine session
exports.createSession = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { appointmentId } = req.body;

  try {
    const session = await telemedicineService.createSession(appointmentId);
    
    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating telemedicine session:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: error.message });
  }
};

// Generate access token for video session
exports.generateAccessToken = async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const tokenData = await telemedicineService.generateAccessToken(
      sessionId,
      userId,
      role
    );
    
    res.json(tokenData);
  } catch (error) {
    console.error('Error generating access token:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    
    if (error.message.includes('not authorized')) {
      return res.status(403).json({ message: error.message });
    }
    
    res.status(500).json({ message: error.message });
  }
};

// Get user sessions
exports.getUserSessions = async (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;
  const { status } = req.query;

  try {
    const sessions = await telemedicineService.getUserSessions(userId, role, status);
    
    res.json(sessions);
  } catch (error) {
    console.error('Error getting user sessions:', error);
    res.status(500).json({ message: error.message });
  }
};