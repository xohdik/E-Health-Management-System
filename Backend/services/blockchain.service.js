// File: /backend/services/blockchain.service.js
const axios = require('axios');
const crypto = require('crypto');

// Configuration for Hyperledger Fabric gateway
const FABRIC_GATEWAY_URL = process.env.FABRIC_GATEWAY_URL || 'http://localhost:4000';
const CHANNEL_NAME = process.env.CHANNEL_NAME || 'healthcare-channel';
const CHAINCODE_NAME = process.env.CHAINCODE_NAME || 'ehr-chaincode';

// Encryption helpers
const generateEncryptionKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

const encryptData = (data, encryptionKey) => {
  const algorithm = 'aes-256-cbc';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(encryptionKey, 'hex'), iv);
  
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted
  };
};

const decryptData = (encryptedData, iv, encryptionKey) => {
  const algorithm = 'aes-256-cbc';
  const decipher = crypto.createDecipheriv(
    algorithm, 
    Buffer.from(encryptionKey, 'hex'), 
    Buffer.from(iv, 'hex')
  );
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return JSON.parse(decrypted);
};

// Blockchain service functions
exports.createHealthRecord = async (patientId, doctorId, recordType, data, accessControlList) => {
  try {
    // Generate encryption key
    const encryptionKey = generateEncryptionKey();
    
    // Encrypt health record data
    const { iv, encryptedData } = encryptData(data, encryptionKey);
    
    // Store encryption key securely (this would typically be stored in a secure key vault)
    // For demo purposes, we'll assume this is handled separately
    
    // Create default access control if not provided
    const acl = accessControlList || {
      users: {
        [doctorId]: { read: true, write: true, audit: true }
      },
      roles: {
        'doctor': { read: true, write: false, audit: false },
        'admin': { read: false, write: false, audit: true }
      }
    };
    
    // Call chaincode function via REST API
    const response = await axios.post(`${FABRIC_GATEWAY_URL}/invoke`, {
      channelName: CHANNEL_NAME,
      chaincodeName: CHAINCODE_NAME,
      function: 'createRecord',
      args: [
        patientId,
        doctorId,
        recordType,
        JSON.stringify({ iv, encryptedData }),
        JSON.stringify(acl)
      ]
    });
    
    // Return record ID and encryption key
    return {
      ...response.data,
      encryptionKey
    };
  } catch (error) {
    console.error('Error creating health record:', error);
    throw error;
  }
};

exports.getHealthRecord = async (recordId, userId, userRole, encryptionKey) => {
  try {
    // Call chaincode function via REST API
    const response = await axios.post(`${FABRIC_GATEWAY_URL}/invoke`, {
      channelName: CHANNEL_NAME,
      chaincodeName: CHAINCODE_NAME,
      function: 'getRecord',
      args: [recordId, userId, userRole]
    });
    
    const record = response.data;
    
    // Decrypt data if encryption key is provided
    if (encryptionKey) {
      const encryptedObj = JSON.parse(record.encryptedData);
      record.data = decryptData(
        encryptedObj.encryptedData,
        encryptedObj.iv,
        encryptionKey
      );
      delete record.encryptedData;
    }
    
    return record;
  } catch (error) {
    console.error('Error getting health record:', error);
    throw error;
  }
};

exports.updateHealthRecord = async (recordId, userId, userRole, data, encryptionKey) => {
  try {
    // Encrypt updated health record data
    const { iv, encryptedData } = encryptData(data, encryptionKey);
    
    // Call chaincode function via REST API
    const response = await axios.post(`${FABRIC_GATEWAY_URL}/invoke`, {
      channelName: CHANNEL_NAME,
      chaincodeName: CHAINCODE_NAME,
      function: 'updateRecord',
      args: [
        recordId,
        userId,
        userRole,
        JSON.stringify({ iv, encryptedData })
      ]
    });
    
    return response.data;
  } catch (error) {
    console.error('Error updating health record:', error);
    throw error;
  }
};

exports.updateAccessControl = async (recordId, userId, userRole, accessControlList) => {
  try {
    // Call chaincode function via REST API
    const response = await axios.post(`${FABRIC_GATEWAY_URL}/invoke`, {
      channelName: CHANNEL_NAME,
      chaincodeName: CHAINCODE_NAME,
      function: 'updateAccessControl',
      args: [
        recordId,
        userId,
        userRole,
        JSON.stringify(accessControlList)
      ]
    });
    
    return response.data;
  } catch (error) {
    console.error('Error updating access control:', error);
    throw error;
  }
};

exports.getPatientRecords = async (patientId, userId, userRole) => {
  try {
    // Call chaincode function via REST API
    const response = await axios.post(`${FABRIC_GATEWAY_URL}/invoke`, {
      channelName: CHANNEL_NAME,
      chaincodeName: CHAINCODE_NAME,
      function: 'getPatientRecords',
      args: [patientId, userId, userRole]
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting patient records:', error);
    throw error;
  }
};

exports.getAuditTrail = async (recordId, userId, userRole) => {
  try {
    // Call chaincode function via REST API
    const response = await axios.post(`${FABRIC_GATEWAY_URL}/invoke`, {
      channelName: CHANNEL_NAME,
      chaincodeName: CHAINCODE_NAME,
      function: 'getAuditTrail',
      args: [recordId, userId, userRole]
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting audit trail:', error);
    throw error;
  }
};