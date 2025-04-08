// controllers/authController.js
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const jwt = require('jsonwebtoken');

exports.register = async (req, res, next) => {
  const { firstName, lastName, email, password, role } = req.body;

  try {
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role,
      isApproved: role === 'doctor' || role === 'nurse' ? false : true // Only approve patient/admin automatically
    });

    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email and password', 400));
  }

  try {
    // Find user by email and include password for verification
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Key Change: Check approval status for doctors and nurses
    if ((user.role === 'doctor' || user.role === 'nurse') && !user.isApproved) {
      return next(new ErrorResponse('Account not approved. Please contact the administrator.', 403));
    }

    // Generate JWT token using the model's method
    const token = user.getSignedJwtToken();

    // Send response with token and user data
    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved, // Include approval status
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    next(err);
  }
};

exports.getMe = async (req, res, next) => {
  res.status(200).json({ success: true, data: req.user });
};

exports.logout = async (req, res, next) => {
  res.status(200).json({ success: true, data: 'Logged out' });
};