const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const doctorController = require('../controllers/doctor.controller');

router.get(
  '/doctors', 
  auth,  // Ensure only authenticated users can access
  doctorController.getAllDoctors
);

module.exports = router;