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
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM format validation
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

const NurseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  specialization: {
    type: String,
    required: true,
    trim: true,
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
  phone: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'suspended', 'rejected'],
    default: 'pending',
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
NurseSchema.index({ status: 1 });
NurseSchema.index({ specialization: 1 });
NurseSchema.index({ user: 1 }, { unique: true });

// Virtual for populated user data
NurseSchema.virtual('userData', {
  ref: 'User',
  localField: 'user',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('Nurse', NurseSchema);