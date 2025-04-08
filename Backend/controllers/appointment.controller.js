const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const { validationResult } = require('express-validator');

// Create an appointment
exports.createAppointment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { doctorId, date, type, reason } = req.body;
  const patientId = req.user.id;

  try {
    const doctor = await Doctor.findOne({ _id: doctorId });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const appointmentDate = new Date(date);
    const slotEnd = new Date(appointmentDate.getTime() + (doctor.appointmentDuration * 60000));

    const conflictingAppointment = await Appointment.findOne({
      doctor: doctorId,
      date: {
        $lt: slotEnd,
        $gte: appointmentDate
      },
      status: { $nin: ['canceled', 'no-show'] }
    });

    if (conflictingAppointment) {
      return res.status(400).json({
        message: 'Time slot not available',
        conflictingSlot: conflictingAppointment.date
      });
    }

    const newAppointment = new Appointment({
      patient: patientId,
      doctor: doctorId,
      date: appointmentDate,
      duration: doctor.appointmentDuration,
      type,
      reason,
      status: 'scheduled'
    });

    await newAppointment.save();

    await newAppointment.populate('patient', 'firstName lastName email');
    await newAppointment.populate({
      path: 'doctor',
      populate: {
        path: 'user',
        select: 'firstName lastName email'
      }
    });

    res.status(201).json(newAppointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get available slots
exports.getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return res.status(400).json({ message: 'Doctor ID and date are required' });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.getDay();

    const todayAvailability = doctor.availability.find(
      avail => avail.day === dayOfWeek
    );

    if (!todayAvailability) {
      return res.json([]);
    }

    const slots = [];
    let [startHour, startMinute] = todayAvailability.startTime.split(':').map(Number);
    const [endHour, endMinute] = todayAvailability.endTime.split(':').map(Number);

    let currentHour = startHour;
    let currentMinute = startMinute;

    while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
      const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
      slots.push(timeString);

      currentMinute += doctor.appointmentDuration;
      if (currentMinute >= 60) {
        currentHour += 1;
        currentMinute -= 60;
      }
    }

    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      doctor: doctorId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ['canceled', 'no-show'] }
    });

    const bookedSlots = appointments.map(appt =>
      appt.date.toTimeString().substring(0, 5)
    );

    const availableSlots = slots.filter(
      slot => !bookedSlots.includes(slot)
    );

    res.json(availableSlots);
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user appointments
exports.getUserAppointments = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let filter = {};

    if (userRole === 'patient') {
      filter.patient = userId;
    } else if (userRole === 'doctor') {
      const doctor = await Doctor.findOne({ user: userId });
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor profile not found' });
      }
      filter.doctor = doctor._id;
    } else {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const appointments = await Appointment.find(filter)
      .populate('patient', 'firstName lastName')
      .populate({
        path: 'doctor',
        populate: {
          path: 'user',
          select: 'firstName lastName email'
        }
      })
      .sort({ date: 1 });

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching user appointments:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update appointment
exports.updateAppointment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { date, type, reason } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    const appointment = await Appointment.findById(id)
      .populate('patient', 'id')
      .populate('doctor', 'user');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Authorization checks
    if (userRole === 'patient' && appointment.patient.id.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    } else if (userRole === 'doctor' && appointment.doctor.user.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update fields if provided
    if (date) {
      const newDate = new Date(date);
      const doctor = await Doctor.findById(appointment.doctor._id);
      const slotEnd = new Date(newDate.getTime() + (doctor.appointmentDuration * 60000));

      const conflictingAppointment = await Appointment.findOne({
        _id: { $ne: id }, // Exclude the current appointment
        doctor: appointment.doctor._id,
        date: {
          $lt: slotEnd,
          $gte: newDate
        },
        status: { $nin: ['canceled', 'no-show'] }
      });

      if (conflictingAppointment) {
        return res.status(400).json({
          message: 'Time slot not available',
          conflictingSlot: conflictingAppointment.date
        });
      }
      appointment.date = newDate;
    }
    if (type) appointment.type = type;
    if (reason) appointment.reason = reason;

    await appointment.save();

    await appointment.populate('patient', 'firstName lastName email');
    await appointment.populate({
      path: 'doctor',
      populate: { path: 'user', select: 'firstName lastName email' }
    });

    res.json(appointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid appointment ID' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete appointment
exports.deleteAppointment = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    const appointment = await Appointment.findById(id)
      .populate('patient', 'id')
      .populate('doctor', 'user');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Authorization checks
    if (userRole === 'patient' && appointment.patient.id.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    } else if (userRole === 'doctor' && appointment.doctor.user.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await appointment.deleteOne();

    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid appointment ID' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get appointment by ID (optional, not used in routes but included for completeness)
exports.getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const appointment = await Appointment.findById(id)
      .populate('patient', 'firstName lastName email')
      .populate({
        path: 'doctor',
        populate: {
          path: 'user',
          select: 'firstName lastName email specialization'
        }
      });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (userRole === 'patient' && appointment.patient._id.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    } else if (userRole === 'doctor') {
      const doctor = await Doctor.findOne({ user: userId });
      if (!doctor || appointment.doctor._id.toString() !== doctor._id.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    }

    res.json(appointment);
  } catch (error) {
    console.error('Error fetching appointment by ID:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid appointment ID' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update appointment status (optional, not used in routes but included for completeness)
exports.updateAppointmentStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    const appointment = await Appointment.findById(id)
      .populate('patient', 'id')
      .populate('doctor', 'user');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (userRole === 'patient') {
      if (appointment.patient.id.toString() !== userId) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      if (status !== 'canceled') {
        return res.status(403).json({ message: 'Patients can only cancel appointments' });
      }
    } else if (userRole === 'doctor' && appointment.doctor.user.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const now = new Date();
    const appointmentDate = new Date(appointment.date);
    if (status === 'canceled' && appointmentDate < now) {
      return res.status(400).json({ message: 'Cannot cancel past appointments' });
    }

    appointment.status = status;
    await appointment.save();

    res.json({
      message: 'Appointment status updated successfully',
      appointment: {
        id: appointment._id,
        status: appointment.status,
        date: appointment.date
      }
    });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid appointment ID' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};