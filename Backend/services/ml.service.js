// Backend/services/ml.service.js
const axios = require('axios');
const Appointment = require('../models/Appointment');
const User = require('../models/User');

// ML Service configuration
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

// Predict no-show probability using ML service
exports.predictNoShow = async (appointmentData) => {
  try {
    // Get patient history
    const patient = await User.findById(appointmentData.patient);
    
    // Get patient's past appointments
    const pastAppointments = await Appointment.find({
      patient: appointmentData.patient,
      date: { $lt: new Date() }
    });
    
    // Calculate historical no-show rate
    const noShowCount = pastAppointments.filter(
      app => app.status === 'no-show'
    ).length;
    
    const noShowRate = pastAppointments.length > 0 
      ? noShowCount / pastAppointments.length 
      : 0;
    
    // Calculate patient age
    const patientAge = patient.dateOfBirth 
      ? Math.floor((new Date() - new Date(patient.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
      : 30; // Default age if not available
    
    // Prepare data for ML model
    const requestData = {
      patientAge: patientAge,
      patientGender: patient.gender || 'unknown',
      appointmentType: appointmentData.type,
      appointmentHour: new Date(appointmentData.date).getHours(),
      appointmentDay: new Date(appointmentData.date).getDay(),
      daysUntilAppointment: Math.floor(
        (new Date(appointmentData.date) - new Date()) / (1000 * 60 * 60 * 24)
      ),
      previousNoShowRate: noShowRate,
      appointmentCount: pastAppointments.length
    };
    
    console.log('Sending ML prediction request:', requestData);
    
    // Call ML service
    const response = await axios.post(`${ML_SERVICE_URL}/predict/no-show`, requestData);
    
    console.log('ML prediction response:', response.data);
    
    return response.data.probability;
  } catch (error) {
    console.error('Error predicting no-show probability:', error);
    // Default to 0.1 if prediction fails
    return 0.1;
  }
};

// Optimize doctor schedule using ML service
exports.optimizeDoctorSchedule = async (doctorId, date, existingAppointments) => {
  try {
    // Format existing appointments for the ML service
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
    
    // Call ML service
    const response = await axios.post(`${ML_SERVICE_URL}/optimize/schedule`, requestData);
    
    console.log('Schedule optimization response:', response.data);
    
    return response.data.availableSlots;
  } catch (error) {
    console.error('Error optimizing doctor schedule:', error);
    
    // If ML service fails, return basic time slots
    return generateBasicTimeSlots();
  }
};

// Fallback function to generate basic time slots if ML service fails
function generateBasicTimeSlots() {
  const slots = [];
  
  // Generate slots from 9 AM to 5 PM with 30-minute intervals
  for (let hour = 9; hour < 17; hour++) {
    for (let minute of [0, 30]) {
      const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const optimalityScore = 0.7; // Default score
      
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