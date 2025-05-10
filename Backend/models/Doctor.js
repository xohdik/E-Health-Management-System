const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  specialization: {
    type: String,
    required: true,
    default: 'General Practice'
  },
  yearsOfExperience: {
    type: Number,
    required: true,
    min: 0
  },
  availability: [
    {
      day: { type: Number, required: true, min: 1, max: 7 },
      startTime: { type: String, required: true },
      endTime: { type: String, required: true }
    }
  ],
  appointmentDuration: {
    type: Number,
    default: 30
  },
  telemedicineEnabled: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);