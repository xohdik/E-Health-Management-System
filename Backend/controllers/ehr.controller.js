// backend/controllers/ehr.controller.js - Real implementation

const blockchainService = require('../services/blockchain.service');
const EncryptionKey = require('../models/EncryptionKey');
const { validationResult } = require('express-validator');

// Create a health record
exports.createRecord = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { patientId, recordType, data, accessControlList } = req.body;
  const doctorId = req.user.id;

  try {
    // Create record on blockchain
    const result = await blockchainService.createHealthRecord(
      patientId,
      doctorId,
      recordType,
      data,
      accessControlList
    );
    
    // Store encryption key safely
    const encryptionKeyRecord = new EncryptionKey({
      recordId: result.recordId,
      patientId,
      key: result.encryptionKey
    });
    
    await encryptionKeyRecord.save();
    
    res.status(201).json({
      recordId: result.recordId,
      message: 'Health record created successfully'
    });
  } catch (error) {
    console.error('Error creating health record:', error);
    res.status(500).json({ message: 'Failed to create health record' });
  }
};

// Get a health record
exports.getRecord = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    // Get encryption key if user has access
    let encryptionKey;
    const keyRecord = await EncryptionKey.findOne({ recordId: id });
    
    if (keyRecord) {
      if (userRole === 'admin' || userId === keyRecord.patientId.toString() || 
          req.user.permissions.includes('read:patient-records')) {
        encryptionKey = keyRecord.getDecryptedKey();
      }
    }
    
    // Get record from blockchain
    const record = await blockchainService.getHealthRecord(
      id,
      userId,
      userRole,
      encryptionKey
    );
    
    res.json(record);
  } catch (error) {
    console.error('Error getting health record:', error);
    if (error.response && error.response.status === 403) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: 'Record not found' });
    }
    res.status(500).json({ message: 'Failed to retrieve health record' });
  }
};

// Get all records for a patient
exports.getPatientRecords = async (req, res) => {
  const { patientId } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  // Check authorization
  if (userRole !== 'admin' && userId !== patientId && 
      !req.user.permissions.includes('read:patient-records')) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  try {
    // Get records from blockchain
    const records = await blockchainService.getPatientRecords(
      patientId,
      userId,
      userRole
    );
    
    res.json(records);
  } catch (error) {
    console.error('Error getting patient records:', error);
    res.status(500).json({ message: 'Failed to retrieve patient records' });
  }
};