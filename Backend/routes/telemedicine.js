const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');

// @route   GET /api/telemedicine/validate/:appointmentId
// @desc    Validate a telemedicine appointment before joining
// @access  Private
router.get('/validate/:appointmentId', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId)
      .populate('doctor', '_id')
      .populate('patient', '_id');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.type !== 'telemedicine') {
      return res.status(400).json({ message: 'This appointment is not a telemedicine appointment' });
    }

    if (!['scheduled', 'confirmed'].includes(appointment.status)) {
      return res.status(400).json({ message: 'This appointment is not in a valid state for a call' });
    }

    const userId = req.user.id;
    const doctorProfile = await Doctor.findOne({ user: userId });

    const isDoctor = doctorProfile && appointment.doctor._id.equals(doctorProfile._id);
    const isPatient = appointment.patient._id.toString() === userId;

    if (!isDoctor && !isPatient) {
      return res.status(403).json({ message: 'Not authorized to join this call' });
    }

    res.json({
      appointment,
      role: isDoctor ? 'doctor' : 'patient',
    });
  } catch (error) {
    console.error('Error validating telemedicine appointment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;