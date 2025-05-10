const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const EHR = require('../models/EHR');
const { protect } = require('../middleware/auth');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Default availability schedule for doctors and nurses
const defaultAvailability = [
  { day: 1, startTime: "09:00", endTime: "17:00" }, // Monday
  { day: 2, startTime: "09:00", endTime: "17:00" }, // Tuesday
  { day: 3, startTime: "09:00", endTime: "17:00" }, // Wednesday
  { day: 4, startTime: "09:00", endTime: "17:00" }, // Thursday
  { day: 5, startTime: "09:00", endTime: "17:00" }, // Friday
  { day: 6, startTime: "09:00", endTime: "13:00" }, // Saturday
  { day: 7, startTime: "10:00", endTime: "14:00" }  // Sunday
];

// @route   POST /api/auth/register
router.post(
  '/register',
  [
    check('firstName', 'First name is required').not().isEmpty(),
    check('lastName', 'Last name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
    check('role', 'Role must be patient, doctor, or nurse').isIn(['patient', 'doctor', 'nurse']),
    // Add validation for specialization and yearsOfExperience for doctors and nurses
    check('specialization', 'Specialization is required for doctors and nurses')
      .if((value, { req }) => ['doctor', 'nurse'].includes(req.body.role))
      .not()
      .isEmpty(),
    check('yearsOfExperience', 'Years of experience is required for doctors and nurses')
      .if((value, { req }) => ['doctor', 'nurse'].includes(req.body.role))
      .isInt({ min: 0 }),
    // Add validation for dateOfBirth and gender
    check('dateOfBirth', 'Date of birth is required').not().isEmpty(),
    check('dateOfBirth', 'Date of birth must be a valid date').isISO8601(),
    check('gender', 'Gender is required').not().isEmpty(),
    check('gender', 'Gender must be male, female, or other').isIn(['male', 'female', 'other'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, password, role, specialization, yearsOfExperience, dateOfBirth, gender, phone } = req.body;

    try {
      // Validate age (must be at least 18 years old)
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();
      const isUnderAge = age < 18 || (age === 18 && (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)));
      if (isUnderAge) {
        return res.status(400).json({ message: 'You must be at least 18 years old to register' });
      }

      let user = await User.findOne({ email });
      if (user) return res.status(400).json({ message: 'User already exists' });

      user = new User({
        firstName,
        lastName,
        email,
        password: await bcrypt.hash(password, 10),
        role,
        isApproved: role === 'patient',
        dateOfBirth: new Date(dateOfBirth), // Save dateOfBirth
        gender // Save gender
      });
      await user.save();

      if (role === 'doctor') {
        const doctor = new Doctor({
          user: user._id,
          specialization: specialization || 'General Practice',
          yearsOfExperience: parseInt(yearsOfExperience) || 0,
          availability: defaultAvailability,
          appointmentDuration: 30,
          telemedicineEnabled: true,
          status: 'pending'
        });
        await doctor.save();
      } else if (role === 'nurse') {
        const nurse = new Nurse({
          user: user._id,
          specialization: specialization || 'General Nursing',
          yearsOfExperience: parseInt(yearsOfExperience) || 0,
          availability: defaultAvailability,
          phone: phone || '',
          status: 'pending'
        });
        await nurse.save();
      }

      const token = generateToken(user._id);
      res.status(201).json({
        success: true,
        token,
        userId: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isApproved: user.isApproved
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      let user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      console.log('User found:', user);
      console.log('Password from request:', password);
      console.log('Stored password:', user.password);

      if (!user.password) {
        return res.status(500).json({ message: 'User password not set in database' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const token = generateToken(user._id);
      res.status(200).json({
        success: true,
        token,
        userId: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isApproved: user.isApproved
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current authenticated user
// @access  Private
router.get('/me', protect, async (req, res) => {
  res.status(200).json({ data: req.user });
});

// @route   GET /api/auth/my-ehr
// @desc    Get EHR for the logged-in patient
// @access  Private (Patient only)
router.get('/my-ehr', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user || user.role !== 'patient') {
      return res.status(403).json({ message: 'Only patients can access their EHR' });
    }
    const ehr = await EHR.findOne({ patient: userId })
      .populate('patient', 'firstName lastName email')
      .populate('pastVisits.doctor', 'specialization');
    if (!ehr) {
      return res.status(404).json({ message: 'EHR not found' });
    }
    res.json(ehr);
  } catch (error) {
    console.error('Error fetching EHR:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/users
// @desc    Get users (for searching patients by email)
// @access  Private (Doctor/Admin)
router.get('/users', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!['doctor', 'admin'].includes(user.role)) {
      return res.status(403).json({ message: 'Access denied: Doctors and Admins only' });
    }
    const email = req.query.email;
    const users = await User.find(email ? { email: new RegExp(email, 'i') } : {});
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;