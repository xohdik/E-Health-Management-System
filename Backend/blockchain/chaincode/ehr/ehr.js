// File: /blockchain/chaincode/ehr/ehr.js
'use strict';

const { Contract } = require('fabric-contract-api');
const crypto = require('crypto');

// Helper function to generate uuid
const generateUUID = () => {
  return crypto.randomUUID();
};

class EHRContract extends Contract {
  // Initialize the ledger
  async initLedger(ctx) {
    console.log('Initialized EHR ledger');
    return { status: 'success', message: 'Initialized EHR ledger' };
  }

  // Create a new health record
  async createRecord(ctx, patientId, doctorId, recordType, encryptedData, accessControlList) {
    // Generate unique record ID
    const recordId = generateUUID();
    const timestamp = new Date().toISOString();

    // Parse access control list
    let acl;
    try {
      acl = JSON.parse(accessControlList);
    } catch (err) {
      throw new Error('Invalid access control list format');
    }

    // Create record object
    const record = {
      recordId,
      patientId,
      doctorId,
      recordType,
      encryptedData,
      accessControlList: acl,
      timestamps: {
        created: timestamp,
        lastModified: timestamp
      },
      status: 'active',
      version: 1,
      transactionHistory: [{
        action: 'created',
        timestamp,
        userId: doctorId
      }]
    };

    // Store record on the ledger
    await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(record)));

    // Create a composite key for patient-record index
    const patientRecordIndexKey = ctx.stub.createCompositeKey('patient-record', [patientId, recordId]);
    await ctx.stub.putState(patientRecordIndexKey, Buffer.from('\u0000'));

    // Return record ID
    return { status: 'success', recordId };
  }

  // Retrieve a health record by ID
  async getRecord(ctx, recordId, userId, userRole) {
    // Get record from ledger
    const recordBuffer = await ctx.stub.getState(recordId);
    if (!recordBuffer || recordBuffer.length === 0) {
      throw new Error(`Record ${recordId} not found`);
    }

    const record = JSON.parse(recordBuffer.toString());

    // Check access control
    const hasAccess = this._checkAccess(record, userId, userRole);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    // Add access to transaction history
    record.transactionHistory.push({
      action: 'accessed',
      timestamp: new Date().toISOString(),
      userId
    });

    // Update record
    await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(record)));

    return record;
  }

  // Update a health record
  async updateRecord(ctx, recordId, userId, userRole, encryptedData) {
    // Get record from ledger
    const recordBuffer = await ctx.stub.getState(recordId);
    if (!recordBuffer || recordBuffer.length === 0) {
      throw new Error(`Record ${recordId} not found`);
    }

    const record = JSON.parse(recordBuffer.toString());

    // Check access control for update permission
    const hasAccess = this._checkAccess(record, userId, userRole, 'write');
    if (!hasAccess) {
      throw new Error('Access denied for update operation');
    }

    // Update record
    const timestamp = new Date().toISOString();
    record.encryptedData = encryptedData;
    record.timestamps.lastModified = timestamp;
    record.version += 1;
    record.transactionHistory.push({
      action: 'updated',
      timestamp,
      userId
    });

    // Store updated record
    await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(record)));

    return { status: 'success', recordId, version: record.version };
  }

  // Update access control list for a record
  async updateAccessControl(ctx, recordId, userId, userRole, accessControlList) {
    // Get record from ledger
    const recordBuffer = await ctx.stub.getState(recordId);
    if (!recordBuffer || recordBuffer.length === 0) {
      throw new Error(`Record ${recordId} not found`);
    }

    const record = JSON.parse(recordBuffer.toString());

    // Only patient or admin can update access control
    if (userId !== record.patientId && userRole !== 'admin') {
      throw new Error('Only patient or admin can update access control');
    }

    // Parse new access control list
    let acl;
    try {
      acl = JSON.parse(accessControlList);
    } catch (err) {
      throw new Error('Invalid access control list format');
    }

    // Update record
    const timestamp = new Date().toISOString();
    record.accessControlList = acl;
    record.timestamps.lastModified = timestamp;
    record.transactionHistory.push({
      action: 'accessControlUpdated',
      timestamp,
      userId
    });

    // Store updated record
    await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(record)));

    return { status: 'success', recordId };
  }

  // Get all records for a patient
  async getPatientRecords(ctx, patientId, userId, userRole) {
    // Get all composite keys for patient-record index
    const iterator = await ctx.stub.getStateByPartialCompositeKey('patient-record', [patientId]);
    
    const records = [];
    let result = await iterator.next();
    
    while (!result.done) {
      // Extract record ID from composite key
      const compositeKey = result.value.key;
      const attributes = ctx.stub.splitCompositeKey(compositeKey);
      const recordId = attributes.attributes[1];
      
      // Get record
      try {
        const record = await this.getRecord(ctx, recordId, userId, userRole);
        records.push(record);
      } catch (err) {
        // Skip records that user doesn't have access to
        console.log(`User ${userId} does not have access to record ${recordId}`);
      }
      
      result = await iterator.next();
    }
    
    return records;
  }

  // Audit trail for a record
  async getAuditTrail(ctx, recordId, userId, userRole) {
    // Get record from ledger
    const recordBuffer = await ctx.stub.getState(recordId);
    if (!recordBuffer || recordBuffer.length === 0) {
      throw new Error(`Record ${recordId} not found`);
    }

    const record = JSON.parse(recordBuffer.toString());

    // Check access control
    const hasAccess = this._checkAccess(record, userId, userRole, 'audit');
    if (!hasAccess) {
      throw new Error('Access denied for audit operation');
    }

    // Return transaction history
    return {
      recordId,
      patientId: record.patientId,
      transactionHistory: record.transactionHistory
    };
  }

  // Helper function to check access control
  _checkAccess(record, userId, userRole, operation = 'read') {
    // Patient always has full access to their own records
    if (userId === record.patientId) {
      return true;
    }

    // Check access control list
    const acl = record.accessControlList;
    
    // Check for user-specific permissions
    if (acl.users && acl.users[userId]) {
      const userPermissions = acl.users[userId];
      if (operation === 'read' && userPermissions.read) {
        return true;
      }
      if (operation === 'write' && userPermissions.write) {
        return true;
      }
      if (operation === 'audit' && userPermissions.audit) {
        return true;
      }
    }

    // Check for role-based permissions
    if (acl.roles && acl.roles[userRole]) {
      const rolePermissions = acl.roles[userRole];
      if (operation === 'read' && rolePermissions.read) {
        return true;
      }
      if (operation === 'write' && rolePermissions.write) {
        return true;
      }
      if (operation === 'audit' && rolePermissions.audit) {
        return true;
      }
    }

    return false;
  }
}

module.exports = EHRContract;
