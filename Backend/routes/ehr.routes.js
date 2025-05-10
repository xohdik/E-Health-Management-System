const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const EHR = require('../models/EHR');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

console.log("✅ EHR routes loaded");

// @route   GET /api/ehr/auth/my-ehr
// @desc    Get authenticated patient's EHR
// @access  Private (Patient only)
router.get('/auth/my-ehr', protect, async (req, res) => {
  try {
    console.log('GET /api/ehr/auth/my-ehr called');
    const user = req.user;
    console.log('User:', user);

    if (user.role !== 'patient') {
      console.log('User is not a patient, role:', user.role);
      return res.status(403).json({ message: 'Not authorized, patient only' });
    }

    const patientId = user._id;
    console.log('Looking for EHR with patient:', patientId);

    let ehr = await EHR.findOne({ patient: patientId })
      .populate('patient', 'firstName lastName email')
      .populate('pastVisits.doctor', 'specialization');

    if (!ehr) {
      console.log('No EHR found, creating a new one for patient:', patientId);
      ehr = new EHR({
        patient: patientId,
        medicalConditions: [], // Updated to match schema
        allergies: [],
        medications: [], // Added to match schema
        pastVisits: [],
      });
      await ehr.save();
      console.log('New EHR created:', ehr);

      // Re-fetch with populated fields
      ehr = await EHR.findOne({ patient: patientId })
        .populate('patient', 'firstName lastName email')
        .populate('pastVisits.doctor', 'specialization');
      console.log('Re-fetched EHR with populated fields:', ehr);
    }

    res.json(ehr);
  } catch (error) {
    console.error('Error in GET /api/ehr/auth/my-ehr:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/ehr/auth/my-ehr
// @desc    Update authenticated patient's EHR
// @access  Private (Patient only)
router.put('/auth/my-ehr', protect, async (req, res) => {
  try {
    console.log('PUT /api/ehr/auth/my-ehr called');
    const user = req.user;
    console.log('User:', user);

    if (user.role !== 'patient') {
      console.log('User is not a patient, role:', user.role);
      return res.status(403).json({ message: 'Not authorized, patient only' });
    }

    const patientId = user._id;
    console.log('Looking for EHR with patient:', patientId);

    let ehr = await EHR.findOne({ patient: patientId });
    if (!ehr) {
      console.log('No EHR found, creating a new one for patient:', patientId);
      ehr = new EHR({
        patient: patientId,
        medicalConditions: [],
        allergies: [],
        medications: [],
        pastVisits: [],
      });
    }

    ehr.medicalConditions = req.body.medicalConditions || ehr.medicalConditions; // Updated to match schema
    ehr.allergies = req.body.allergies || ehr.allergies;
    ehr.medications = req.body.medications || ehr.medications; // Added to match schema
    await ehr.save();
    console.log('EHR updated:', ehr);

    res.json(ehr);
  } catch (error) {
    console.error('Error in PUT /api/ehr/auth/my-ehr:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/ehr/admin/ehrs
// @desc    Get all EHRs (Admin only)
// @access  Private (Admin only)
router.get('/admin/ehrs', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('GET /api/ehr/admin/ehrs called');
    const ehrs = await EHR.find()
      .populate('patient', 'firstName lastName email')
      .populate('pastVisits.doctor', 'specialization');
    console.log('EHRs found:', ehrs);
    res.json(ehrs);
  } catch (error) {
    console.error('Error in GET /api/ehr/admin/ehrs:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/ehr/admin/ehrs/patient/:patientId
// @desc    Get EHR by patient ID (Admin only)
// @access  Private (Admin only)
router.get('/admin/ehrs/patient/:patientId', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('GET /api/ehr/admin/ehrs/patient/:patientId called');
    const patientId = req.params.patientId;
    console.log('patientId from params:', patientId);

    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      console.log('Invalid patientId format:', patientId);
      return res.status(400).json({ message: 'Invalid patient ID' });
    }

    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') {
      console.log('Patient not found or not a patient:', patient);
      return res.status(404).json({ message: 'Patient not found' });
    }
    console.log('Patient found:', patient);

    let ehr = await EHR.findOne({ patient: patientId })
      .populate('patient', 'firstName lastName email')
      .populate('pastVisits.doctor', 'specialization');
    console.log('EHR found:', ehr);

    if (!ehr) {
      console.log('No EHR found, creating a new one for patient:', patientId);
      ehr = new EHR({
        patient: patientId,
        medicalConditions: [],
        allergies: [],
        medications: [],
        pastVisits: [],
      });
      await ehr.save();
      console.log('New EHR created:', ehr);

      // Re-fetch with populated fields
      ehr = await EHR.findOne({ patient: patientId })
        .populate('patient', 'firstName lastName email')
        .populate('pastVisits.doctor', 'specialization');
      console.log('Re-fetched EHR with populated fields:', ehr);
    }

    res.json(ehr);
  } catch (error) {
    console.error('Error in GET /api/ehr/admin/ehrs/patient/:patientId:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/ehr/admin/ehrs/:id
// @desc    Get EHR by EHR ID (Admin only)
// @access  Private (Admin only)
router.get('/admin/ehrs/:id', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('GET /api/ehr/admin/ehrs/:id called');
    const ehr = await EHR.findById(req.params.id)
      .populate('patient', 'firstName lastName email')
      .populate('pastVisits.doctor', 'specialization');
    console.log('EHR found:', ehr);
    if (!ehr) {
      return res.status(404).json({ message: 'EHR not found' });
    }
    res.json(ehr);
  } catch (error) {
    console.error('Error in GET /api/ehr/admin/ehrs/:id:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/ehr/admin/ehrs/:id
// @desc    Update EHR by EHR ID (Admin only)
// @access  Private (Admin only)
router.put('/admin/ehrs/:id', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('PUT /api/ehr/admin/ehrs/:id called');
    const ehr = await EHR.findById(req.params.id);
    console.log('EHR found:', ehr);
    if (!ehr) {
      return res.status(404).json({ message: 'EHR not found' });
    }

    ehr.medicalConditions = req.body.medicalConditions || ehr.medicalConditions;
    ehr.allergies = req.body.allergies || ehr.allergies;
    ehr.medications = req.body.medications || ehr.medications;
    await ehr.save();
    console.log('EHR updated:', ehr);

    res.json(ehr);
  } catch (error) {
    console.error('Error in PUT /api/ehr/admin/ehrs/:id:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/ehr/doctor/ehrs/patient/:patientId
// @desc    Get EHR by patient ID (Doctor only)
// @access  Private (Doctor only)
router.get('/doctor/ehrs/patient/:patientId', protect, authorize('doctor'), async (req, res) => {
  try {
    console.log('GET /api/ehr/doctor/ehrs/patient/:patientId called');
    const patientId = req.params.patientId;
    console.log('patientId from params:', patientId);

    const ehr = await EHR.findOne({ patient: patientId })
      .populate('patient', 'firstName lastName email')
      .populate('pastVisits.doctor', 'specialization');
    console.log('EHR found:', ehr);
    if (!ehr) {
      return res.status(404).json({ message: 'EHR not found' });
    }
    res.json(ehr);
  } catch (error) {
    console.error('Error in GET /api/ehr/doctor/ehrs/patient/:patientId:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;