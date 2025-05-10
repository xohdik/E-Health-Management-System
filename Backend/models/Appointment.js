const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    default: 30, // Duration in minutes
    required: true
  },
  type: {
    type: String,
    enum: ['in-person', 'telemedicine'],
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'completed', 'canceled', 'no-show'],
    default: 'scheduled'
  },
  reason: {
    type: String,
    required: true
  },
  symptoms: { // Add symptoms field
    type: String,
    required: false // Optional field
  },
  notes: {
    type: String
  },
  noShowProbability: {
    type: Number,
    default: 0
  },
  callStatus: { 
    type: String, 
    enum: ['pending', 'ongoing', 'completed'], 
    default: 'pending' 
  },
  callDuration: { 
    type: Number 
  }, // In seconds
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Appointment', AppointmentSchema);