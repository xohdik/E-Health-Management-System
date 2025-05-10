const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  attachment: {
    type: String
  },
  attachmentType: {
    type: String,
    enum: ['image', 'document', 'other']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  }
});

const TelemedicineSessionSchema = new mongoose.Schema({
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
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
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'active', 'in-progress', 'ended', 'completed', 'canceled', 'cancelled'],
    default: 'pending'
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number 
  },
  messages: [MessageSchema],
  notes: {
    type: String
  },
  diagnosis: {
    type: String
  },
  prescription: {
    type: String
  },
  videoSessionId: {
    type: String
  },
  videoSessionToken: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('TelemedicineSession', TelemedicineSessionSchema);