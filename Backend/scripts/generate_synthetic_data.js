require('dotenv').config();
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const EHR = require('../models/EHR');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ehealth')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Arrays of common first and last names
const firstNames = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Susan', 'Joseph', 'Jessica', 'Charles', 'Sarah',
  'Thomas', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty',
  'Andrew', 'Margaret', 'Mark', 'Dorothy', 'Paul', 'Helen', 'Steven', 'Barbara',
  'Richard', 'Kimberly', 'Edward', 'Donna', 'George', 'Michelle', 'Kenneth', 'Carol'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Walker', 'Hall',
  'Allen', 'Young', 'King', 'Wright', 'Scott', 'Green', 'Baker', 'Adams', 'Nelson'
];

// Arrays for EHR data
const medicalConditions = [
  'Hypertension', 'Diabetes Type 2', 'Asthma', 'Hypothyroidism', 'Arthritis',
  'Chronic Back Pain', 'Migraine', 'Allergic Rhinitis', 'Gastritis', 'Anemia'
];

const allergens = [
  'Peanuts', 'Shellfish', 'Pollen', 'Dust Mites', 'Penicillin', 'Latex',
  'Eggs', 'Milk', 'Soy', 'Wheat'
];

const medications = [
  'Lisinopril', 'Metformin', 'Albuterol', 'Levothyroxine', 'Ibuprofen',
  'Amitriptyline', 'Cetirizine', 'Omeprazole', 'Ferrous Sulfate', 'Aspirin'
];

const dosages = ['5 mg', '10 mg', '20 mg', '50 mg', '100 mg'];
const frequencies = ['once daily', 'twice daily', 'as needed', 'every 6 hours'];

// Track used name combinations
const usedNames = new Set();

// Function to generate a unique name
const getUniqueName = () => {
  let firstName, lastName, name, attempt = 0;

  do {
    firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    name = `${firstName} ${lastName}${attempt > 0 ? attempt : ''}`;
    attempt++;
  } while (usedNames.has(name) && attempt < 100);

  if (usedNames.has(name)) {
    throw new Error('Unable to generate a unique name after 100 attempts. Please expand the name lists.');
  }

  usedNames.add(name);
  return { firstName, lastName: attempt > 1 ? `${lastName}${attempt - 1}` : lastName };
};

// Function to generate a unique email
const generateUniqueEmail = async (firstName, lastName, attempt = 0) => {
  let email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${attempt > 0 ? attempt : ''}@example.com`;
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return generateUniqueEmail(firstName, lastName, attempt + 1);
  }
  return email;
};

// Function to generate random dates
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Function to generate a random date of birth based on age range
const generateDateOfBirth = (minAge, maxAge) => {
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - (Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge);
  const birthMonth = Math.floor(Math.random() * 12);
  const birthDay = Math.floor(Math.random() * 28) + 1; // Simplified to avoid month/day issues
  return new Date(birthYear, birthMonth, birthDay);
};

// Function to generate a synthetic EHR for a patient
const generateEHR = async (patientId, appointments) => {
  const patientAppointments = appointments.filter(appt => appt.patient.toString() === patientId.toString());

  // Generate medical conditions (0-3 conditions)
  const numConditions = Math.floor(Math.random() * 4);
  const medicalConditionsData = [];
  const usedConditions = new Set();
  for (let i = 0; i < numConditions; i++) {
    let condition;
    do {
      condition = medicalConditions[Math.floor(Math.random() * medicalConditions.length)];
    } while (usedConditions.has(condition));
    usedConditions.add(condition);

    const diagnosedDate = randomDate(new Date('2015-01-01'), new Date('2024-01-01'));
    medicalConditionsData.push({
      condition,
      diagnosedDate,
      notes: Math.random() < 0.5 ? `Diagnosed during routine checkup.` : null
    });
  }

  // Generate allergies (0-2 allergies)
  const numAllergies = Math.floor(Math.random() * 3);
  const allergiesData = [];
  const usedAllergens = new Set();
  for (let i = 0; i < numAllergies; i++) {
    let allergen;
    do {
      allergen = allergens[Math.floor(Math.random() * allergens.length)];
    } while (usedAllergens.has(allergen));
    usedAllergens.add(allergen);

    allergiesData.push({
      allergen,
      reaction: Math.random() < 0.7 ? 'Rash' : 'Anaphylaxis',
      severity: ['mild', 'moderate', 'severe'][Math.floor(Math.random() * 3)]
    });
  }

  // Generate medications (0-3 medications)
  const numMedications = Math.floor(Math.random() * 4);
  const medicationsData = [];
  const usedMedications = new Set();
  for (let i = 0; i < numMedications; i++) {
    let medication;
    do {
      medication = medications[Math.floor(Math.random() * medications.length)];
    } while (usedMedications.has(medication));
    usedMedications.add(medication);

    const startDate = randomDate(new Date('2020-01-01'), new Date('2024-01-01'));
    const endDate = Math.random() < 0.3 ? randomDate(startDate, new Date('2025-04-10')) : null;

    medicationsData.push({
      name: medication,
      dosage: dosages[Math.floor(Math.random() * dosages.length)],
      frequency: frequencies[Math.floor(Math.random() * frequencies.length)],
      startDate,
      endDate
    });
  }

  // Generate past visits from appointments
  const pastVisitsData = patientAppointments
    .filter(appt => appt.status === 'completed')
    .map(appt => ({
      date: appt.date,
      doctor: appt.doctor,
      reason: appt.reason,
      notes: appt.notes
    }));

  const ehr = new EHR({
    patient: patientId,
    medicalConditions: medicalConditionsData,
    allergies: allergiesData,
    medications: medicationsData,
    pastVisits: pastVisitsData,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await ehr.save();
  console.log(`Generated EHR for patient ID: ${patientId}`);
};

// Function to generate synthetic data and populate the database
const generateSyntheticData = async () => {
  try {
    // Delete only synthetic patients, doctors, and their EHRs, preserve other users
    const syntheticPatients = await User.find({ email: { $regex: /^patient\d+@example\.com$/ } });
    const syntheticDoctors = await User.find({ email: { $regex: /^doctor\d+@example\.com$/ } });
    const newSyntheticPatients = await User.find({ email: { $regex: /^[a-z]+\.[a-z]+[0-9]*@example\.com$/ } });
    const newSyntheticDoctors = await User.find({ email: { $regex: /^[a-z]+\.[a-z]+[0-9]*@example\.com$/ } });

    // Combine old and new synthetic users
    const allSyntheticPatients = [...syntheticPatients, ...newSyntheticPatients.filter(user => !user.email.match(/^(admin|patient|nurse)@example\.com$/))];
    const allSyntheticDoctors = [...syntheticDoctors, ...newSyntheticDoctors.filter(user => !user.email.match(/^(admin|patient|nurse)@example\.com$/))];

    // Delete associated doctors
    const syntheticDoctorIds = allSyntheticDoctors.map(doc => doc._id);
    await Doctor.deleteMany({ user: { $in: syntheticDoctorIds } });

    // Delete EHRs for synthetic patients
    const syntheticPatientIds = allSyntheticPatients.map(patient => patient._id);
    await EHR.deleteMany({ patient: { $in: syntheticPatientIds } });

    // Delete synthetic users
    await User.deleteMany({
      email: { $regex: /^[a-z]+\.[a-z]+[0-9]*@example\.com$|^patient\d+@example\.com$|^doctor\d+@example\.com$/ },
      $nor: [
        { email: 'admin@example.com' },
        { email: 'patient@example.com' },
        { email: 'nurse@example.com' }
      ]
    });

    console.log(`Deleted ${allSyntheticPatients.length} synthetic patients and ${allSyntheticDoctors.length} synthetic doctors`);

    // Clear used names set
    usedNames.clear();

    // Generate admin user
    const saltRounds = 10;
    const adminPassword = 'admin123'; // Password for the admin user
    const hashedAdminPassword = await bcrypt.hash(adminPassword, saltRounds);

    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    if (!existingAdmin) {
      const admin = new User({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        password: hashedAdminPassword,
        role: 'admin',
        isApproved: true,
        dateOfBirth: generateDateOfBirth(30, 50),  // Admin age between 30 and 50
        gender: Math.random() < 0.5 ? 'male' : 'female',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await admin.save();
      usedNames.add('Admin User'); // Add admin name to used names
      console.log('Created admin user: admin@example.com with password: admin123');
    } else {
      // Update existing admin with dateOfBirth and gender if missing
      await User.updateOne(
        { email: 'admin@example.com' },
        {
          $set: {
            dateOfBirth: existingAdmin.dateOfBirth || generateDateOfBirth(30, 50),
            gender: existingAdmin.gender || (Math.random() < 0.5 ? 'male' : 'female')
          }
        }
      );
      usedNames.add(`${existingAdmin.firstName} ${existingAdmin.lastName}`);
      console.log('Admin user already exists: admin@example.com');
    }

    // Add existing users to usedNames to avoid duplicates
    const existingUsers = await User.find({ email: { $in: ['patient@example.com', 'nurse@example.com'] } });
    existingUsers.forEach(user => {
      usedNames.add(`${user.firstName} ${user.lastName}`);
      // Update existing users with dateOfBirth and gender if missing
      User.updateOne(
        { _id: user._id },
        {
          $set: {
            dateOfBirth: user.dateOfBirth || generateDateOfBirth(18, 90),
            gender: user.gender || (Math.random() < 0.5 ? 'male' : 'female')
          }
        }
      );
    });

    // Generate synthetic patients
    const patients = [];
    const defaultPassword = 'password123'; // Default password for all synthetic users
    const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

    for (let i = 0; i < 200; i++) { // 200 patients
      const { firstName, lastName } = getUniqueName();
      const email = await generateUniqueEmail(firstName, lastName);

      const patient = new User({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role: 'patient',
        isApproved: true,
        dateOfBirth: generateDateOfBirth(18, 90),  // Patient age between 18 and 90
        gender: Math.random() < 0.5 ? 'male' : 'female',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await patient.save();
      patients.push(patient);
      console.log(`Added patient: ${firstName} ${lastName} (${email})`);
    }

    // Generate synthetic doctors
    const doctors = [];
    for (let i = 0; i < 10; i++) { // 10 doctors
      const { firstName, lastName } = getUniqueName();
      const email = await generateUniqueEmail(firstName, lastName);

      const doctorUser = new User({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role: 'doctor',
        isApproved: true,
        dateOfBirth: generateDateOfBirth(30, 70),  // Doctor age between 30 and 70
        gender: Math.random() < 0.5 ? 'male' : 'female',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await doctorUser.save();

      const doctor = new Doctor({
        user: doctorUser._id,
        specialization: ['General Practice', 'Cardiology', 'Pediatrics'][Math.floor(Math.random() * 3)],
        yearsOfExperience: Math.floor(Math.random() * 30),
        availability: [
          { day: 1, startTime: '09:00', endTime: '17:00' },
          { day: 2, startTime: '09:00', endTime: '17:00' },
          { day: 3, startTime: '09:00', endTime: '17:00' },
          { day: 4, startTime: '09:00', endTime: '17:00' },
          { day: 5, startTime: '09:00', endTime: '17:00' }
        ],
        appointmentDuration: 30,
        telemedicineEnabled: Math.random() < 0.8,
        status: 'approved'
      });
      await doctor.save();
      doctors.push(doctor);
      console.log(`Added doctor: ${firstName} ${lastName} (${email})`);
    }

    // Generate synthetic appointments
    await Appointment.deleteMany({}); // Delete all appointments since users have changed
    const appointments = [];
    for (let i = 0; i < 1000; i++) {
      const patient = patients[Math.floor(Math.random() * patients.length)];
      const doctor = doctors[Math.floor(Math.random() * doctors.length)];

      const apptDate = randomDate(new Date('2024-10-09'), new Date('2025-06-09'));
      apptDate.setHours(Math.floor(Math.random() * (17 - 8 + 1)) + 8);

      const createdAt = new Date(apptDate.getTime() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000);
      const daysUntilAppointment = Math.floor((apptDate - createdAt) / (1000 * 60 * 60 * 24));

      const pastAppointments = appointments.filter(
        appt => appt.patient.toString() === patient._id.toString() && appt.date < apptDate
      );
      const noShowCount = pastAppointments.filter(appt => appt.status === 'no-show').length;
      const previousNoShowRate = pastAppointments.length > 0 ? noShowCount / pastAppointments.length : 0;

      let noShowProb = 0.1;
      if (previousNoShowRate > 0.3) noShowProb += 0.2;
      if (daysUntilAppointment > 15) noShowProb += 0.1;
      if (apptDate.getHours() < 9 || apptDate.getHours() > 16) noShowProb += 0.1;
      if (apptDate.getDay() === 0 || apptDate.getDay() === 6) noShowProb += 0.1;
      if (pastAppointments.length < 2) noShowProb += 0.1;
      if (doctor.telemedicineEnabled && Math.random() < 0.5) noShowProb -= 0.05;
      noShowProb = Math.min(noShowProb, 1);

      const isPast = apptDate < new Date();
      let status;
      if (!isPast) {
        status = Math.random() < 0.9 ? 'scheduled' : 'confirmed';
      } else {
        if (Math.random() < noShowProb) {
          status = 'no-show';
        } else if (Math.random() < 0.2) {
          status = 'canceled';
        } else {
          status = 'completed';
        }
      }

      const appointmentType = doctor.telemedicineEnabled && Math.random() < 0.5 ? 'telemedicine' : 'in-person';

      const appointment = new Appointment({
        patient: patient._id,
        doctor: doctor._id,
        date: apptDate,
        duration: 30,
        type: appointmentType,
        status: status,
        reason: ['Check-up', 'Follow-up', 'Consultation'][Math.floor(Math.random() * 3)],
        notes: Math.random() < 0.5 ? 'Patient requested morning slot' : null,
        noShowProbability: noShowProb,
        callStatus: status === 'completed' && appointmentType === 'telemedicine' ? 'completed' : 'pending',
        callDuration: status === 'completed' && appointmentType === 'telemedicine' ? Math.floor(Math.random() * 1800) : null,
        createdAt: createdAt
      });

      await appointment.save();
      appointments.push(appointment);
      console.log(`Added appointment ${i + 1}/1000`);
    }

    // Generate EHRs for each patient
    for (const patient of patients) {
      await generateEHR(patient._id, appointments);
    }

    console.log('Database populated with synthetic data and EHRs');
    process.exit(0);
  } catch (error) {
    console.error('Error generating synthetic data:', error);
    process.exit(1);
  }
};

generateSyntheticData();