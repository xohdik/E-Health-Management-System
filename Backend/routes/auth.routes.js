const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Nurse = require('../models/Nurse');
const { protect } = require('../middleware/auth');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @route   POST /api/auth/register
router.post(
  '/register',
  [
    check('firstName', 'First name is required').not().isEmpty(),
    check('lastName', 'Last name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
    check('role', 'Role must be patient, doctor, or nurse').isIn(['patient', 'doctor', 'nurse']),
    check('specialization', 'Specialization is required for doctors and nurses')
      .if((value, { req }) => ['doctor', 'nurse'].includes(req.body.role))
      .not()
      .isEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, password, role, specialization, availability, phone } = req.body;

    try {
      let user = await User.findOne({ email });
      if (user) return res.status(400).json({ message: 'User already exists' });

      user = new User({
        firstName,
        lastName,
        email,
        password: await bcrypt.hash(password, 10),
        role,
        isApproved: role === 'patient'
      });
      await user.save();

      if (role === 'doctor') {
        const doctor = new Doctor({
          user: user._id,
          specialization: specialization || 'General Practice',
          availability: availability || [],
          appointmentDuration: 30,
          telemedicineEnabled: true,
          status: 'pending'
        });
        await doctor.save();
      } else if (role === 'nurse') {
        const nurse = new Nurse({
          user: user._id,
          specialization: specialization || 'General',
          availability: availability || [],
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
      // Explicitly select the password field
      let user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      console.log('User found:', user); // Debug: Should include password
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

module.exports = router;