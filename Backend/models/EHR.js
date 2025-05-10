const mongoose = require('mongoose');

const ehrSchema = new mongoose.Schema({
  patient: { // Renamed from `patient` to `patientId`
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  medicalConditions: [{
    condition: { type: String, required: true },
    diagnosedDate: { type: Date, required: true },
    notes: { type: String }
  }],
  allergies: [{
    allergen: { type: String, required: true },
    reaction: { type: String },
    severity: { type: String, enum: ['mild', 'moderate', 'severe'] }
  }],
  medications: [{
    name: { type: String, required: true },
    dosage: { type: String },
    frequency: { type: String },
    startDate: { type: Date },
    endDate: { type: Date }
  }],
  pastVisits: [{
    date: { type: Date, required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    reason: { type: String },
    notes: { type: String }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware to update the updatedAt field on save
ehrSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('EHR', ehrSchema);