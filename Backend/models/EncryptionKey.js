// File: /backend/models/EncryptionKey.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const EncryptionKeySchema = new mongoose.Schema({
  recordId: {
    type: String,
    required: true,
    unique: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  key: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt the key before saving
EncryptionKeySchema.pre('save', function(next) {
  if (!this.isModified('key')) {
    return next();
  }
  
  // In a production environment, this would use a more secure key management system
  // For demo purposes, we're using a simple encryption with an environment variable as key
  const algorithm = 'aes-256-cbc';
  const iv = crypto.randomBytes(16);
  const encKey = crypto.createHash('sha256').update(process.env.KEY_ENCRYPTION_KEY || 'default-key').digest();
  const cipher = crypto.createCipheriv(algorithm, encKey, iv);
  
  let encrypted = cipher.update(this.key, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  this.key = `${iv.toString('hex')}:${encrypted}`;
  next();
});

// Method to decrypt the key
EncryptionKeySchema.methods.getDecryptedKey = function() {
  const [ivHex, encryptedKey] = this.key.split(':');
  
  const algorithm = 'aes-256-cbc';
  const iv = Buffer.from(ivHex, 'hex');
  const encKey = crypto.createHash('sha256').update(process.env.KEY_ENCRYPTION_KEY || 'default-key').digest();
  const decipher = crypto.createDecipheriv(algorithm, encKey, iv);
  
  let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

module.exports = mongoose.model('EncryptionKey', EncryptionKeySchema);

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
    // Get encryption key
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

// Update a health record
exports.updateRecord = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { data } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    // Get encryption key
    const keyRecord = await EncryptionKey.findOne({ recordId: id });
    if (!keyRecord) {
      return res.status(404).json({ message: 'Encryption key not found' });
    }
    
    const encryptionKey = keyRecord.getDecryptedKey();
    
    // Update record on blockchain
    const result = await blockchainService.updateHealthRecord(
      id,
      userId,
      userRole,
      data,
      encryptionKey
    );
    
    res.json({
      recordId: id,
      version: result.version,
      message: 'Health record updated successfully'
    });
  } catch (error) {
    console.error('Error updating health record:', error);
    if (error.response && error.response.status === 403) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: 'Record not found' });
    }
    res.status(500).json({ message: 'Failed to update health record' });
  }
};

// Update access control for a record
exports.updateAccessControl = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { accessControlList } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    // Update access control on blockchain
    const result = await blockchainService.updateAccessControl(
      id,
      userId,
      userRole,
      accessControlList
    );
    
    res.json({
      recordId: id,
      message: 'Access control updated successfully'
    });
  } catch (error) {
    console.error('Error updating access control:', error);
    if (error.response && error.response.status === 403) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: 'Record not found' });
    }
    res.status(500).json({ message: 'Failed to update access control' });
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
    
    // Get encryption keys for accessible records
    const recordIds = records.map(record => record.recordId);
    const encryptionKeys = await EncryptionKey.find({
      recordId: { $in: recordIds }
    });
    
    // Decrypt records if possible
    const decryptedRecords = records.map(record => {
      const keyRecord = encryptionKeys.find(
        key => key.recordId === record.recordId
      );
      
      if (keyRecord && 
          (userRole === 'admin' || userId === patientId || 
           req.user.permissions.includes('read:patient-records'))) {
        try {
          const encryptionKey = keyRecord.getDecryptedKey();
          const encryptedObj = JSON.parse(record.encryptedData);
          record.data = blockchainService.decryptData(
            encryptedObj.encryptedData,
            encryptedObj.iv,
            encryptionKey
          );
          delete record.encryptedData;
        } catch (err) {
          console.error(`Error decrypting record ${record.recordId}:`, err);
        }
      }
      
      return record;
    });
    
    res.json(decryptedRecords);
  } catch (error) {
    console.error('Error getting patient records:', error);
    res.status(500).json({ message: 'Failed to retrieve patient records' });
  }
};

// Get audit trail for a record
exports.getAuditTrail = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    // Get audit trail from blockchain
    const auditTrail = await blockchainService.getAuditTrail(
      id,
      userId,
      userRole
    );
    
    res.json(auditTrail);
  } catch (error) {
    console.error('Error getting audit trail:', error);
    if (error.response && error.response.status === 403) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: 'Record not found' });
    }
    res.status(500).json({ message: 'Failed to retrieve audit trail' });
  }
};