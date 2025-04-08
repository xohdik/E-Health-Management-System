const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const { protect } = require('../middleware/auth');

// Log that routes are loaded
console.log("✅ User routes loaded");

// @route   GET /api/users/doctors
// @desc    Get all doctors
// @access  Public
router.get('/doctors', async (req, res) => {
  try {
    const doctors = await Doctor.find()
      .populate('user', 'firstName lastName email');
    res.json(doctors);
  } catch (err) {
    console.error('Error fetching doctors:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/doctors/:id
// @desc    Get single doctor by ID
// @access  Public
router.get('/doctors/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('user', 'firstName lastName email');
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    res.json(doctor);
  } catch (err) {
    console.error('Error fetching doctor:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/doctors/pending
// @desc    Get all pending doctors
// @access  Private (Admin only)
router.get('/doctors/pending', protect, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized, admin only' });
    }

    const pendingDoctors = await Doctor.find({ status: 'pending' })
      .populate('user', 'firstName lastName email');
    res.json(pendingDoctors);
  } catch (err) {
    console.error('Error fetching pending doctors:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route   PUT /api/users/doctors/approve/:id
// @desc    Approve a doctor's account
// @access  Private (Admin only)
router.put('/doctors/approve/:id', protect, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized, admin only' });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    doctor.status = 'active';
    await doctor.save();

    const user = await User.findById(doctor.user);
    if (!user) {
      return res.status(404).json({ message: 'Associated user not found' });
    }
    user.isApproved = true;
    await user.save();

    res.json({ 
      message: 'Doctor approved successfully', 
      doctor: {
        _id: doctor._id,
        user: doctor.user,
        status: doctor.status,
        isApproved: user.isApproved
      }
    });
  } catch (err) {
    console.error('Error approving doctor:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route   GET /api/users/patients
// @desc    Get all patients
// @access  Public
router.get('/patients', async (req, res) => {
  try {
    const patients = await User.find({ role: 'patient' })
      .select('firstName lastName email createdAt');
    res.json(patients);
  } catch (err) {
    console.error('Error fetching patients:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/patients/:id
// @desc    Get single patient by ID
// @access  Public
router.get('/patients/:id', async (req, res) => {
  try {
    const patient = await User.findOne({ 
      _id: req.params.id, 
      role: 'patient' 
    }).select('firstName lastName email createdAt');
    
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    res.json(patient);
  } catch (err) {
    console.error('Error fetching patient:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Patient not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;