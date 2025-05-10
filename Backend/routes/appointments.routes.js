const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { sendPatientNotification, sendDoctorNotification } = require('../services/notification');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const User = require('../models/User');

// Helper function to format date consistently
const formatAppointmentDate = (date) => {
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// @route   GET /api/appointments
// @desc    Get all appointments for the current user (for dashboard)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let appointments;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === 'patient') {
      appointments = await Appointment.find({ patient: userId })
        .populate({
          path: 'doctor',
          select: '_id specialization appointmentDuration',
          populate: {
            path: 'user',
            select: 'firstName lastName email'
          }
        })
        .populate('patient', 'firstName lastName email')
        .sort({ date: 1 });
    } else if (userRole === 'doctor') {
      const doctorProfile = await Doctor.findOne({ user: userId });
      if (!doctorProfile) {
        return res.status(404).json({ message: 'Doctor profile not found' });
      }
      appointments = await Appointment.find({ doctor: doctorProfile._id })
        .populate({
          path: 'patient',
          select: 'firstName lastName email'
        })
        .populate({
          path: 'doctor',
          select: '_id specialization appointmentDuration',
          populate: {
            path: 'user',
            select: 'firstName lastName email'
          }
        })
        .sort({ date: 1 });
    } else if (userRole === 'admin' || userRole === 'nurse') {
      appointments = await Appointment.find()
        .populate({
          path: 'doctor',
          select: '_id specialization appointmentDuration',
          populate: {
            path: 'user',
            select: 'firstName lastName email'
          }
        })
        .populate('patient', 'firstName lastName email')
        .sort({ date: 1 });
    } else {
      return res.status(403).json({ message: 'Not authorized to view appointments' });
    }

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/appointments/user
// @desc    Get all appointments for the current user
// @access  Private
router.get('/user', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    let appointments;

    if (userRole === 'patient') {
      appointments = await Appointment.find({ patient: userId })
        .populate({
          path: 'doctor',
          select: '_id specialization appointmentDuration',
          populate: {
            path: 'user',
            select: 'firstName lastName email'
          }
        })
        .sort({ date: 1 });
    } else if (userRole === 'doctor') {
      const doctorProfile = await Doctor.findOne({ user: userId });
      if (!doctorProfile) {
        return res.status(404).json({ message: 'Doctor profile not found' });
      }
      appointments = await Appointment.find({ doctor: doctorProfile._id })
        .populate({
          path: 'patient',
          select: 'firstName lastName email'
        })
        .sort({ date: 1 });
    } else if (userRole === 'admin' || userRole === 'nurse') {
      appointments = await Appointment.find()
        .populate({
          path: 'doctor',
          select: '_id specialization appointmentDuration',
          populate: {
            path: 'user',
            select: 'firstName lastName email'
          }
        })
        .populate('patient', 'firstName lastName email')
        .sort({ date: 1 });
    } else {
      return res.status(403).json({ message: 'Not authorized to view appointments' });
    }

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching user appointments:', error);
    res.status(500).json({ 
      message: 'Server error fetching appointments', 
      error: error.message 
    });
  }
});

// @route   GET /api/appointments/slots
// @desc    Get available appointment slots for a doctor on a specific date
// @access  Private
router.get('/slots', protect, async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    
    if (!doctorId || !date) {
      return res.status(400).json({ message: 'Doctor ID and date are required' });
    }
    
    const selectedDate = new Date(date);
    if (isNaN(selectedDate)) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    
    const dayOfWeek = selectedDate.getDay();
    const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    const dayAvailability = doctor.availability.find(a => a.day === adjustedDayOfWeek);
    if (!dayAvailability) {
      return res.status(200).json([]);
    }
    
    const startTime = dayAvailability.startTime.split(':').map(Number);
    const endTime = dayAvailability.endTime.split(':').map(Number);
    const startHour = startTime[0];
    const endHour = endTime[0];
    
    const existingAppointments = await Appointment.find({
      doctor: doctorId,
      date: {
        $gte: new Date(selectedDate.setHours(0, 0, 0, 0)),
        $lt: new Date(selectedDate.setHours(23, 59, 59, 999))
      },
      status: { $in: ['scheduled', 'confirmed'] }
    });
    
    const appointmentDuration = doctor.appointmentDuration || 30;
    const slots = [];
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += appointmentDuration) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push({
          time: timeString,
          available: true
        });
      }
    }
    
    existingAppointments.forEach(appointment => {
      const apptHour = appointment.date.getHours();
      const apptMinute = appointment.date.getMinutes();
      const apptTimeString = `${apptHour.toString().padStart(2, '0')}:${apptMinute.toString().padStart(2, '0')}`;
      const slotIndex = slots.findIndex(slot => slot.time === apptTimeString);
      if (slotIndex !== -1) {
        slots[slotIndex].available = false;
      }
    });
    
    res.json(slots);
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ 
      message: 'Server error fetching available slots', 
      error: error.message 
    });
  }
});

// @route   GET /api/appointments/:id
// @desc    Get single appointment by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate({
        path: 'doctor',
        select: '_id specialization appointmentDuration',
        populate: {
          path: 'user',
          select: 'firstName lastName email'
        }
      })
      .populate('patient', 'firstName lastName email');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (userRole === 'patient' && appointment.patient._id.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to view this appointment' });
    }

    if (userRole === 'doctor') {
      const doctorProfile = await Doctor.findOne({ user: userId });
      if (!doctorProfile || appointment.doctor._id.toString() !== doctorProfile._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to view this appointment' });
      }
    }

    res.json(appointment);
  } catch (error) {
    console.error('Error fetching appointment:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/appointments/book
// @desc    Create a new appointment with email notification
// @access  Private (Patient only)
router.post(
  '/book',
  [
    protect,
    [
      check('doctorId', 'Doctor ID is required').isMongoId(),
      check('date', 'Valid date is required').isISO8601(),
      check('duration', 'Duration must be a number').optional().isInt({ min: 15 }),
      check('type', 'Valid appointment type is required').isIn(['in-person', 'telemedicine']),
      check('reason', 'Reason must be at least 5 characters').isLength({ min: 5 }),
      check('symptoms', 'Symptoms must be at least 5 characters if provided').optional().isLength({ min: 5 }),
      check('noShowProbability', 'No-show probability must be a number between 0 and 1').optional().isFloat({ min: 0, max: 1 }) // Add validation for noShowProbability
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id);
      if (!user || user.role !== 'patient') {
        return res.status(403).json({ message: 'Only patients can book appointments' });
      }

      const { doctorId, date, duration, type, reason, symptoms, notes, noShowProbability } = req.body; // Add noShowProbability
      const patientId = req.user.id;

      // Get doctor with populated user data
      const doctor = await Doctor.findById(doctorId)
        .populate('user', 'firstName lastName email');
      
      if (!doctor || !doctor.user) {
        return res.status(404).json({ message: 'Doctor not found' });
      }

      const patient = await User.findById(patientId);
      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }

      // Parse appointment datetime
      const appointmentDate = new Date(date);
      if (isNaN(appointmentDate)) {
        return res.status(400).json({ message: 'Invalid date format' });
      }

      // Check availability
      const existingAppointment = await Appointment.findOne({
        doctor: doctorId,
        date: appointmentDate,
        status: { $in: ['scheduled', 'confirmed'] }
      });
      
      if (existingAppointment) {
        return res.status(400).json({ message: 'Time slot already booked' });
      }

      // Create new appointment
      const newAppointment = new Appointment({
        doctor: doctorId,
        patient: patientId,
        date: appointmentDate,
        duration: duration || (doctor.appointmentDuration || 30),
        type,
        reason,
        symptoms,
        notes,
        noShowProbability: noShowProbability || 0, // Include noShowProbability, default to 0 if not provided
        status: 'scheduled'
      });

      await newAppointment.save();

      // Format date for emails
      const formattedDate = formatAppointmentDate(appointmentDate);
      
      // Send notifications
      try {
        // To patient
        await sendPatientNotification(
          patient.email,
          'PATIENT_BOOKED',
          [patient.firstName, doctor.user.lastName, formattedDate, type]
        );

        // To doctor
        await sendDoctorNotification(
          doctor.user.email,
          'DOCTOR_NEW_BOOKING',
          [doctor.user.lastName, patient.firstName, formattedDate, reason]
        );
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        // Don't fail the request if emails fail
      }

      res.status(201).json(newAppointment);
    } catch (error) {
      console.error('Booking error:', error);
      res.status(500).json({ 
        message: 'Appointment booking failed',
        error: error.message
      });
    }
  }
);

// @route   PUT /api/appointments/:id/confirm
// @desc    Confirm an appointment with email notification
// @access  Private (Doctor only)
router.put(
  '/:id/confirm',
  protect,
  async (req, res) => {
    try {
      const appointment = await Appointment.findById(req.params.id)
        .populate({
          path: 'doctor',
          populate: { path: 'user', select: 'firstName lastName email' }
        })
        .populate('patient', 'firstName lastName email');

      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }

      // Verify doctor is confirming their own appointment
      const doctor = await Doctor.findOne({ user: req.user.id });
      if (!doctor || !appointment.doctor._id.equals(doctor._id)) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      if (appointment.status !== 'scheduled') {
        return res.status(400).json({ 
          message: 'Only scheduled appointments can be confirmed' 
        });
      }

      // Update status
      appointment.status = 'confirmed';
      await appointment.save();

      // Send confirmation to patient
      const formattedDate = formatAppointmentDate(appointment.date);
      try {
        await sendPatientNotification(
          appointment.patient.email,
          'PATIENT_CONFIRMED',
          [appointment.patient.firstName, appointment.doctor.user.lastName, formattedDate]
        );
      } catch (emailError) {
        console.error('Confirmation email failed:', emailError);
      }

      res.json(appointment);
    } catch (error) {
      console.error('Confirmation error:', error);
      res.status(500).json({ 
        message: 'Appointment confirmation failed',
        error: error.message
      });
    }
  }
);

// @route   PUT /api/appointments/:id/cancel
// @desc    Cancel an appointment with notifications
// @access  Private
router.put(
  '/:id/cancel',
  protect,
  async (req, res) => {
    try {
      const appointment = await Appointment.findById(req.params.id)
        .populate({
          path: 'doctor',
          populate: { path: 'user', select: 'firstName lastName email' }
        })
        .populate('patient', 'firstName lastName email');

      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }

      // Verify authorization
      const isPatient = req.user.id === appointment.patient._id.toString();
      const isDoctor = await Doctor.exists({ 
        user: req.user.id, 
        _id: appointment.doctor._id 
      });
      
      if (!isPatient && !isDoctor && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized' });
      }

      // Update status
      appointment.status = 'canceled';
      await appointment.save();

      // Format date for emails
      const formattedDate = formatAppointmentDate(appointment.date);
      
      // Send cancellation notices
      try {
        // To patient (unless patient initiated the cancellation)
        if (!isPatient) {
          await sendPatientNotification(
            appointment.patient.email,
            'APPOINTMENT_CANCELED',
            [
              appointment.patient.firstName,
              appointment.doctor.user.lastName,
              formattedDate,
              true
            ]
          );
        }

        // To doctor (unless doctor initiated the cancellation)
        if (!isDoctor) {
          await sendDoctorNotification(
            appointment.doctor.user.email,
            'APPOINTMENT_CANCELED',
            [
              appointment.doctor.user.lastName,
              appointment.patient.firstName,
              formattedDate,
              false
            ]
          );
        }
      } catch (emailError) {
        console.error('Cancellation emails failed:', emailError);
      }

      res.json(appointment);
    } catch (error) {
      console.error('Cancellation error:', error);
      res.status(500).json({ 
        message: 'Appointment cancellation failed',
        error: error.message
      });
    }
  }
);

// @route   PUT /api/appointments/:id/status
// @desc    Update appointment status (admin/nurse only)
// @access  Private/Admin
router.put(
  '/:id/status',
  [
    protect,
    authorize(['admin', 'nurse']),
    check('status', 'Valid status is required').isIn(['scheduled', 'confirmed', 'completed', 'canceled', 'no-show'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { status } = req.body;
      const appointment = await Appointment.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      )
        .populate({
          path: 'doctor',
          populate: { path: 'user', select: 'firstName lastName email' }
        })
        .populate('patient', 'firstName lastName email');

      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }

      res.json(appointment);
    } catch (error) {
      console.error('Status update error:', error);
      res.status(500).json({ 
        message: 'Status update failed',
        error: error.message
      });
    }
  }
);

// @route   DELETE /api/appointments/:id
// @desc    Delete an appointment (admin only)
// @access  Private/Admin
router.delete('/:id', [protect, authorize('admin')], async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Deletion error:', error);
    res.status(500).json({ 
      message: 'Appointment deletion failed',
      error: error.message
    });
  }
});

// Additional routes for doctor/patient specific views
router.get('/doctor/:doctorId', protect, async (req, res) => {
  try {
    // Find the doctor profile in the doctors collection using the user ID
    const doctorProfile = await Doctor.findOne({ user: req.params.doctorId });
    if (!doctorProfile) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Fetch appointments using the doctor's _id (from the doctors collection)
    const appointments = await Appointment.find({ doctor: doctorProfile._id })
      .populate('patient', 'firstName lastName email')
      .sort({ date: 1 });

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/patient/:patientId', [protect, authorize(['admin', 'nurse'])], async (req, res) => {
  try {
    const appointments = await Appointment.find({ patient: req.params.patientId })
      .populate({
        path: 'doctor',
        select: '_id specialization appointmentDuration',
        populate: {
          path: 'user',
          select: 'firstName lastName email'
        }
      })
      .sort({ date: 1 });
    
    res.json(appointments);
  } catch (error) {
    console.error('Error fetching patient appointments:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/appointments/upcoming
// @desc    Get upcoming appointments for current user
// @access  Private
router.get('/upcoming', protect, async (req, res) => {
  try {
    let upcomingAppointments;
    const userId = req.user.id;
    const userRole = req.user.role;
    const now = new Date();

    if (userRole === 'patient') {
      upcomingAppointments = await Appointment.find({
        patient: userId,
        date: { $gte: now },
        status: { $in: ['scheduled', 'confirmed'] }
      })
      .populate({
        path: 'doctor',
        select: '_id specialization appointmentDuration',
        populate: {
          path: 'user',
          select: 'firstName lastName email'
        }
      })
      .sort({ date: 1 })
      .limit(5);
    } else if (userRole === 'doctor') {
      const doctorProfile = await Doctor.findOne({ user: userId });
      if (!doctorProfile) {
        return res.status(404).json({ message: 'Doctor profile not found' });
      }
      upcomingAppointments = await Appointment.find({
        doctor: doctorProfile._id,
        date: { $gte: now },
        status: { $in: ['scheduled', 'confirmed'] }
      })
      .populate('patient', 'firstName lastName email')
      .sort({ date: 1 })
      .limit(5);
    } else {
      upcomingAppointments = await Appointment.find({
        date: { $gte: now },
        status: { $in: ['scheduled', 'confirmed'] }
      })
      .populate({
        path: 'doctor',
        select: '_id specialization appointmentDuration',
        populate: {
          path: 'user',
          select: 'firstName lastName email'
        }
      })
      .populate('patient', 'firstName lastName email')
      .sort({ date: 1 })
      .limit(5);
    }

    res.json(upcomingAppointments);
  } catch (error) {
    console.error('Error fetching upcoming appointments:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/appointments/:id/reminder
// @desc    Send reminder for an appointment
// @access  Private (Doctor/Admin)
router.post('/:id/reminder', [protect, authorize(['doctor', 'admin'])], async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'firstName lastName email' }
      })
      .populate('patient', 'firstName lastName email');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Verify doctor is sending reminder for their own appointment
    if (req.user.role === 'doctor') {
      const doctorProfile = await Doctor.findOne({ user: req.user.id });
      if (!doctorProfile || !appointment.doctor._id.equals(doctorProfile._id)) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    }

    const formattedDate = formatAppointmentDate(appointment.date);

    // Send reminder to patient
    try {
      await sendPatientNotification(
        appointment.patient.email,
        'APPOINTMENT_REMINDER',
        [
          appointment.patient.firstName,
          appointment.doctor.user.lastName,
          formattedDate,
          appointment.type
        ]
      );
      res.json({ message: 'Reminder sent successfully' });
    } catch (emailError) {
      console.error('Reminder email failed:', emailError);
      res.status(500).json({ message: 'Failed to send reminder', error: emailError.message });
    }
  } catch (error) {
    console.error('Reminder error:', error);
    res.status(500).json({ 
      message: 'Failed to send reminder',
      error: error.message
    });
  }
});

module.exports = router;