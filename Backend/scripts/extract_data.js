const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');
const User = require('./models/User');
const Doctor = require('./models/Doctor');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ehealth', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Function to extract data
const extractData = async () => {
  try {
    // Get all appointments
    const appointments = await Appointment.find()
      .populate('patient')
      .populate('doctor');
    
    // Prepare data for ML
    const data = [];
    
    for (const appt of appointments) {
      const patient = appt.patient;
      const doctor = appt.doctor;
      const appointmentDate = new Date(appt.date);
      
      // Calculate patient age (since dateOfBirth isn't in schema, use a placeholder)
      const patientAge = Math.floor(Math.random() * (90 - 18 + 1)) + 18; // Placeholder
      
      // Get patient's past appointments for no-show rate
      const pastAppointments = await Appointment.find({
        patient: patient._id,
        date: { $lt: appointmentDate }
      });
      
      const noShowCount = pastAppointments.filter(app => app.status === 'no-show').length;
      const noShowRate = pastAppointments.length > 0 
        ? noShowCount / pastAppointments.length 
        : 0;
      
      // Prepare data row
      data.push({
        patientAge: patientAge,
        patientGender: Math.random() < 0.48 ? 'M' : Math.random() < 0.96 ? 'F' : 'unknown', // Placeholder
        appointmentType: appt.type,
        appointmentHour: appointmentDate.getHours(),
        appointmentDay: appointmentDate.getDay(),
        daysUntilAppointment: Math.floor(
          (appointmentDate - new Date(appt.createdAt)) / (1000 * 60 * 60 * 24)
        ),
        previousNoShowRate: noShowRate,
        appointmentCount: pastAppointments.length,
        reason: appt.reason,
        doctorSpecialization: doctor.specialization,
        telemedicineEnabled: doctor.telemedicineEnabled,
        noShow: appt.status === 'no-show' ? 1 : 0
      });
    }
    
    console.log('Extracted Data:', data);
    
    // Save to a JSON file for use in Python
    const fs = require('fs');
    fs.writeFileSync('appointment_data.json', JSON.stringify(data, null, 2));
    console.log('Data saved to appointment_data.json');
    
    process.exit(0);
  } catch (error) {
    console.error('Error extracting data:', error);
    process.exit(1);
  }
};

extractData();