const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { protect } = require('../middleware/auth');
const { checkPermission, authorize } = require('../middleware/rbac');

console.log("✅ Full ehr.routes.js loaded");

// Simple test route
router.get('/test', (req, res) => {
  res.send('EHR routes are working!');
});

// @route   GET /api/ehr/patient/:id
// @desc    Get patient's medical records
// @access  Private
router.get('/patient/:id', protect, async (req, res) => {
  try {
    const patientId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Authorization check - users can only access their own records
    // unless they have doctor or admin role
    if (userRole !== 'admin' && userRole !== 'doctor' && patientId !== userId) {
      return res.status(403).json({ message: 'Not authorized to access these records' });
    }
    
    // Find medical records for this patient
    // This is where you would add your database query
    // Replace this with actual database query when ready
    const mockRecords = [
      {
        recordId: '60a1b2c3d4e5f6a7b8c9d0e1',
        recordType: 'Lab Results',
        notes: 'Blood test results normal',
        timestamps: {
          created: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        }
      },
      {
        recordId: '60a1b2c3d4e5f6a7b8c9d0e2',
        recordType: 'Prescription',
        notes: 'Amoxicillin 500mg, 3 times daily for 10 days',
        timestamps: {
          created: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        }
      },
      {
        recordId: '60a1b2c3d4e5f6a7b8c9d0e3',
        recordType: 'Vital Signs',
        notes: 'BP: 120/80, Heart rate: 78bpm, Temperature: 98.6F',
        timestamps: {
          created: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        }
      }
    ];
    
    res.status(200).json(mockRecords);
  } catch (error) {
    console.error('Error fetching patient records:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/ehr/records
// @desc    Create a new medical record
// @access  Private (Doctors only)
router.post(
  '/records',
  [
    protect,
    authorize('doctor', 'admin'), // Role-based check
    checkPermission('write:patient-records'), // Permission-based check
    [
      check('patientId', 'Patient ID is required').not().isEmpty(),
      check('recordType', 'Record type is required').not().isEmpty(),
      check('notes', 'Notes are required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    try {
      // This is where you would add the record to the database
      // For now, just return a success message
      res.status(201).json({ 
        message: 'Record created successfully',
        record: {
          id: 'new-record-id',
          ...req.body,
          createdBy: req.user.id,
          createdAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error creating medical record:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// You can add more routes for updating and deleting records as needed

module.exports = router;