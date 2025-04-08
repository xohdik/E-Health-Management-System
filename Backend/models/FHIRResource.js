// File: /backend/models/FHIRResource.js
const mongoose = require('mongoose');

const FHIRResourceSchema = new mongoose.Schema({
  resourceType: {
    type: String,
    required: true,
    index: true
  },
  resourceId: {
    type: String,
    required: true,
    index: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  data: {
    type: Object,
    required: true
  },
  source: {
    type: String,
    required: true,
    index: true
  },
  version: {
    type: String,
    default: '1'
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'pending'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  strict: false  // Allow for flexible FHIR resource fields
});

// Create a compound index for resourceType and resourceId
FHIRResourceSchema.index({ resourceType: 1, resourceId: 1 }, { unique: true });

module.exports = mongoose.model('FHIRResource', FHIRResourceSchema);