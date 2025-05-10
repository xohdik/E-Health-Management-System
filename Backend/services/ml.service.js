const axios = require('axios');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Doctor = require('../models/Doctor');

// ML Service configuration
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

// Predict no-show probability using ML service
exports.predictNoShow = async (appointmentData) => {
  try {
    const patient = await User.findById(appointmentData.patient);
    if (!patient) {
      console.error('Patient not found:', appointmentData.patient);
      return 0.1;
    }
    
    const doctor = await Doctor.findById(appointmentData.doctor);
    if (!doctor) {
      console.error('Doctor not found:', appointmentData.doctor);
      return 0.1;
    }
    
    const pastAppointments = await Appointment.find({
      patient: appointmentData.patient,
      date: { $lt: new Date() }
    });
    
    const noShowCount = pastAppointments.filter(
      app => app.status === 'no-show'
    ).length;
    
    const noShowRate = pastAppointments.length > 0 
      ? noShowCount / pastAppointments.length 
      : 0;
    
    // Calculate patient age from dateOfBirth
    const patientAge = patient.dateOfBirth
      ? Math.floor((new Date() - new Date(patient.dateOfBirth)) / (1000 * 60 * 60 * 24 * 365))
      : 30; // Fallback
    
    // Map gender to 'M' or 'F' for ML model
    const patientGender = patient.gender === 'male' ? 'M' : patient.gender === 'female' ? 'F' : 'F'; // Default to 'F' if 'other'

    const requestData = {
      patientAge: patientAge,
      patientGender: patientGender,
      appointmentType: appointmentData.type,
      appointmentHour: new Date(appointmentData.date).getHours(),
      appointmentDay: new Date(appointmentData.date).getDay(),
      daysUntilAppointment: Math.floor(
        (new Date(appointmentData.date) - new Date()) / (1000 * 60 * 60 * 24)
      ),
      previousNoShowRate: noShowRate,
      appointmentCount: pastAppointments.length,
      reason: appointmentData.reason || 'Check-up',
      doctorSpecialization: doctor.specialization,
      telemedicineEnabled: doctor.telemedicineEnabled
    };
    
    console.log('Sending ML prediction request:', requestData);
    
    const response = await axios.post(`${ML_SERVICE_URL}/predict/no-show`, requestData, {
      timeout: 5000
    });
    
    console.log('ML prediction response:', response.data);
    
    return response.data.probability;
  } catch (error) {
    console.error('Error predicting no-show probability:', error.message);
    return 0.1;
  }
};

// Optimize doctor schedule using ML service
exports.optimizeDoctorSchedule = async (doctorId, date, existingAppointments) => {
  try {
    const formattedAppointments = existingAppointments.map(apt => ({
      id: apt._id.toString(),
      startTime: new Date(apt.date).toTimeString().substring(0, 5),
      duration: apt.duration,
      noShowProbability: apt.noShowProbability || 0
    }));
    
    const requestData = {
      doctorId: doctorId.toString(),
      date: date,
      existingAppointments: formattedAppointments
    };
    
    console.log('Sending schedule optimization request:', requestData);
    
    const response = await axios.post(`${ML_SERVICE_URL}/optimize/schedule`, requestData, {
      timeout: 5000
    });
    
    console.log('Schedule optimization response:', response.data);
    
    return response.data.availableSlots;
  } catch (error) {
    console.error('Error optimizing doctor schedule:', error.message);
    return generateBasicTimeSlots();
  }
};

// Fallback function to generate basic time slots if ML service fails
function generateBasicTimeSlots() {
  const slots = [];
  for (let hour = 9; hour < 17; hour++) {
    for (let minute of [0, 30]) {
      const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const optimalityScore = 0.7;
      slots.push({
        startTime,
        endTime: minute === 0 
          ? `${hour.toString().padStart(2, '0')}:30` 
          : `${(hour + 1).toString().padStart(2, '0')}:00`,
        optimalityScore
      });
    }
  }
  return slots;
}

module.exports = exports;