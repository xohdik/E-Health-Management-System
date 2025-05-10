const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const AdminApprovalDetails = require('../models/AdminApprovalDetails');
const sendEmail = require('../services/email');
const mongoose = require('mongoose');

mongoose.connection.on('connected', () => console.log('MongoDB connected'));
mongoose.connection.on('error', err => console.error('MongoDB connection error:', err));

const handleError = (res, error, defaultMessage) => {
  console.error(error);
  return res.status(500).json({
    success: false,
    message: error.response?.data?.message || error.message || defaultMessage,
  });
};

// @route   GET /api/admin/users
router.get('/users', [protect, authorize('admin')], async (req, res) => {
  try {
    const users = await User.find();
    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    return handleError(res, error, 'Failed to fetch users');
  }
});

// @route   GET /api/admin/users/:id
router.get('/users/:id', [protect, authorize('admin')], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    const formattedUser = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
    return res.status(200).json({
      success: true,
      data: formattedUser,
    });
  } catch (error) {
    return handleError(res, error, 'Failed to fetch user details');
  }
});

// @route   PUT /api/admin/users/:id/approve
router.put('/users/:id/approve', [protect, authorize('admin')], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.isApproved) {
      return res.status(400).json({ success: false, message: 'User already approved' });
    }

    user.isApproved = true;
    user.updatedAt = Date.now();
    await user.save();

    let professionalDetails = {};
    if (user.role === 'doctor') {
      const doctor = await Doctor.findOneAndUpdate(
        { user: user._id },
        { status: 'approved' },
        { upsert: true, new: true } // Create if missing
      );
      professionalDetails = { specialization: doctor.specialization || 'General Practice' };
    } else if (user.role === 'nurse') {
      const nurse = await Nurse.findOneAndUpdate(
        { user: user._id },
        { status: 'approved', specialization: 'General' }, // Fallback if missing
        { upsert: true, new: true } // Create if missing
      );
      professionalDetails = { specialization: nurse.specialization || 'General' };
    }

    const approvalDate = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #2c3e50;">Account Approval Notification</h2>
        <p style="font-size: 16px; color: #333;">
          Dear ${user.firstName} ${user.lastName},
        </p>
        <p style="font-size: 16px; color: #333;">
          We are pleased to inform you that your account as a <strong>${user.role}</strong> has been approved on ${approvalDate}.
        </p>
        ${professionalDetails.specialization ? `
          <p style="font-size: 16px; color: #333;">
            Your specialization is registered as: <strong>${professionalDetails.specialization}</strong>.
          </p>
        ` : ''}
        <p style="font-size: 16px; color: #333;">
          You can now log in to the E-Health Management System to access your account and begin using our services.
        </p>
        <a href="http://localhost:3000/login" style="display: inline-block; padding: 10px 20px; background-color: #3498db; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">
          Log In Now
        </a>
        <p style="font-size: 14px; color: #777; margin-top: 20px;">
          If you have any questions, please contact our support team at support@ehealthsystem.com.
        </p>
        <p style="font-size: 14px; color: #777;">
          Best regards,<br>The E-Health Management Team
        </p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: 'Account Approved - E-Health Management System',
      html: emailHtml,
    });

    return res.status(200).json({
      success: true,
      data: user,
      message: 'User approved successfully',
    });
  } catch (error) {
    return handleError(res, error, 'Failed to approve user');
  }
});

// @route   PUT /api/admin/users/:id/reject
router.put('/users/:id/reject', [protect, authorize('admin')], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (!user.isApproved) {
      return res.status(400).json({ success: false, message: 'User not approved' });
    }

    user.isApproved = false;
    user.updatedAt = Date.now();
    await user.save();

    if (user.role === 'doctor') {
      await Doctor.findOneAndUpdate(
        { user: user._id },
        { status: 'rejected' },
        { upsert: true, new: true }
      );
    } else if (user.role === 'nurse') {
      await Nurse.findOneAndUpdate(
        { user: user._id },
        { status: 'rejected', specialization: 'General' },
        { upsert: true, new: true }
      );
    }

    const rejectionDate = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #c0392b;">Account Approval Revoked</h2>
        <p style="font-size: 16px; color: #333;">
          Dear ${user.firstName} ${user.lastName},
        </p>
        <p style="font-size: 16px; color: #333;">
          We regret to inform you that your account approval as a <strong>${user.role}</strong> has been revoked on ${rejectionDate}.
        </p>
        <p style="font-size: 16px; color: #333;">
          For further assistance or clarification, please contact our support team at support@ehealthsystem.com.
        </p>
        <p style="font-size: 14px; color: #777; margin-top: 20px;">
          Best regards,<br>The E-Health Management Team
        </p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: 'Account Approval Revoked - E-Health Management System',
      html: emailHtml,
    });

    return res.status(200).json({
      success: true,
      data: user,
      message: 'User approval revoked successfully',
    });
  } catch (error) {
    return handleError(res, error, 'Failed to reject user');
  }
});

// @route   GET /api/admin/approvals
router.get('/approvals', [protect, authorize('admin')], async (req, res) => {
  try {
    const approvals = await AdminApprovalDetails.find({ status: 'PENDING' })
      .populate('userId', 'firstName lastName email role');
    const formattedApprovals = approvals.map(approval => ({
      _id: approval._id,
      firstName: approval.userId.firstName,
      lastName: approval.userId.lastName,
      email: approval.userId.email,
      role: approval.userId.role,
      type: approval.type,
    }));
    return res.status(200).json({
      success: true,
      count: formattedApprovals.length,
      data: formattedApprovals,
    });
  } catch (error) {
    return handleError(res, error, 'Failed to fetch pending approvals');
  }
});

module.exports = router;