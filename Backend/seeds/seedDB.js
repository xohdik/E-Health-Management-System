// File: seeds/seedDB.js
const mongoose = require('mongoose');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const seedDatabase = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Doctor.deleteMany({});
    
    console.log('Creating test users...');
    
    // Create test users
    const patient = await User.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'patient@example.com',
      password: 'password123',
      role: 'patient'
    });
    
    const doctor = await User.create({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'doctor@example.com',
      password: 'password123',
      role: 'doctor'
    });
    
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin'
    });
    
    console.log('Creating doctor profile...');
    
    // Create doctor profile
    await Doctor.create({
      user: doctor._id,
      specialization: 'Cardiology',
      availability: [
        { day: 1, startTime: '09:00', endTime: '17:00' },
        { day: 2, startTime: '09:00', endTime: '17:00' },
        { day: 3, startTime: '09:00', endTime: '17:00' },
        { day: 4, startTime: '09:00', endTime: '17:00' },
        { day: 5, startTime: '09:00', endTime: '17:00' }
      ],
      appointmentDuration: 30,
      telemedicineEnabled: true,
      hospitalAffiliation: 'General Hospital',
      yearsOfExperience: 10,
      rating: 4.8
    });
    
    console.log('Database seeded successfully!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding database:', error);
    mongoose.connection.close();
  }
};

seedDatabase();