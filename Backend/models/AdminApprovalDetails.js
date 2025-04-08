// models/AdminApprovalDetails.js
const mongoose = require('mongoose');

const AdminApprovalDetailsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
    default: 'PENDING'
  },
  type: {
    type: String,
    required: true,
    enum: ['DOCTOR_REGISTRATION', 'PRESCRIPTION', 'REFERRAL', 'OTHER']
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AdminApprovalDetails', AdminApprovalDetailsSchema);