const mongoose = require('mongoose');

const AvailabilitySchema = new mongoose.Schema({
  day: {
    type: Number, // 0 for Sunday, 1 for Monday, etc.
    required: true,
    min: 0,
    max: 6
  },
  startTime: {
    type: String,
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format validation
  },
  endTime: {
    type: String,
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    validate: {
      validator: function(value) {
        return value > this.startTime;
      },
      message: 'End time must be after start time'
    }
  }
});

const DoctorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  specialization: {
    type: String,
    required: true,
    trim: true
  },
  availability: {
    type: [AvailabilitySchema],
    validate: {
      validator: function(v) {
        // Ensure no duplicate days
        const days = v.map(a => a.day);
        return new Set(days).size === days.length;
      },
      message: 'Duplicate days in availability'
    }
  },
  appointmentDuration: {
    type: Number,
    default: 30,
    min: 5,
    max: 120
  },
  telemedicineEnabled: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'suspended', 'rejected'],
    default: 'pending'
  },
  // ... other fields
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add index for frequently queried fields
DoctorSchema.index({ status: 1 });
DoctorSchema.index({ specialization: 1 });
DoctorSchema.index({ 'user': 1 }, { unique: true });

// Virtual for populated user data
DoctorSchema.virtual('userData', {
  ref: 'User',
  localField: 'user',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('Doctor', DoctorSchema);