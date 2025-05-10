const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const Appointment = require('../models/Appointment');

// Log that routes are loaded
console.log("✅ User routes loaded");

// @route   GET /api/users/doctors
// @desc    Get all doctors
// @access  Public
router.get('/doctors', async (req, res) => {
  try {
    const doctors = await Doctor.find().populate('user', 'firstName lastName email');
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
    const doctor = await Doctor.findById(req.params.id).populate('user', 'firstName lastName email');
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

    const pendingDoctors = await Doctor.find({ status: 'pending' }).populate('user', 'firstName lastName email');
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
    const patients = await User.find({ role: 'patient' }).select('firstName lastName email createdAt');
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
    const patient = await User.findOne({ _id: req.params.id, role: 'patient' }).select('firstName lastName email createdAt');
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

// ✅ ✅ ✅ ADD THIS ABOVE /:id ROUTE!
// @route   GET /api/users/patient-details
// @desc    Get logged-in patient details
// @access  Private (patients only)
router.get('/patient-details', protect, async (req, res) => {
  try {
    const patient = await User.findOne({ _id: req.user.id, role: 'patient' }).select('-password');
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Fetch the patient's appointments to calculate previousNoShowRate and appointmentCount
    const appointments = await Appointment.find({ patient: req.user.id });
    const noShows = appointments.filter(apt => apt.status === 'no-show').length;
    const totalAppointments = appointments.length;

    // Construct the patientDetails object with all required fields
    const patientDetails = {
      age: patient.age || 30, // Default to 30 if age is not in the schema
      gender: patient.gender || 'Unknown', // Default to 'Unknown' if gender is not in the schema
      previousNoShowRate: totalAppointments > 0 ? noShows / totalAppointments : 0,
      appointmentCount: totalAppointments,
      firstName: patient.firstName, // Include other fields if needed
      lastName: patient.lastName,
      email: patient.email,
      role: patient.role
    };

    console.log('Returning patientDetails:', patientDetails); // Add this log for debugging

    res.status(200).json(patientDetails);
  } catch (error) {
    console.error('Error fetching patient details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private (Admin only)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/users/:id
// @desc    Get user details by ID
// @access  Private (authenticated users)
router.get('/:id', protect, async (req, res) => {
  try {
    const userId = req.params.id;
    const requestingUser = req.user;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (
      requestingUser.role !== 'admin' &&
      requestingUser.role !== 'doctor' &&
      requestingUser._id.toString() !== userId
    ) {
      return res.status(403).json({ message: 'Not authorized to access this user’s details' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
