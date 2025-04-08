// File: /backend/services/fhir.service.js
const axios = require('axios');
const FHIRResource = require('../models/FHIRResource');
const User = require('../models/User');

// Configuration for FHIR server (could be external or internal)
const FHIR_SERVER_URL = process.env.FHIR_SERVER_URL || 'http://localhost:8080/fhir';
const SYSTEM_ID = process.env.SYSTEM_ID || 'e-health-management-system';

// FHIR resource validator
const validateResource = async (resource) => {
  // Check mandatory fields based on resource type
  if (!resource.resourceType) {
    throw new Error('Resource type is required');
  }
  
  // Patient resource validation
  if (resource.resourceType === 'Patient') {
    if (!resource.identifier || resource.identifier.length === 0) {
      throw new Error('Patient resource must have at least one identifier');
    }
  }
  
  // Observation resource validation
  if (resource.resourceType === 'Observation') {
    if (!resource.subject || !resource.subject.reference) {
      throw new Error('Observation must have a subject reference');
    }
    if (!resource.code) {
      throw new Error('Observation must have a code');
    }
  }
  
  // Additional validation could be performed by calling a FHIR validator
  // For complex validation, a proper FHIR validator API would be used
  
  return true;
};

// Map internal user to FHIR Patient
exports.mapUserToFHIRPatient = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Create FHIR Patient resource
    const patientResource = {
      resourceType: 'Patient',
      id: `patient-${userId}`,
      identifier: [
        {
          system: `${SYSTEM_ID}/users`,
          value: userId
        }
      ],
      active: true,
      name: [
        {
          use: 'official',
          family: user.lastName,
          given: [user.firstName]
        }
      ],
      telecom: [
        {
          system: 'email',
          value: user.email,
          use: 'home'
        }
      ],
      gender: user.gender || 'unknown',
      birthDate: user.dateOfBirth,
      managingOrganization: {
        reference: `Organization/${SYSTEM_ID}`
      }
    };
    
    return patientResource;
  } catch (error) {
    console.error('Error mapping user to FHIR Patient:', error);
    throw error;
  }
};

// Create or update a FHIR resource
exports.createOrUpdateResource = async (resourceData, patientId) => {
  try {
    // Validate resource
    await validateResource(resourceData);
    
    // Check if resource already exists
    const existingResource = await FHIRResource.findOne({
      resourceType: resourceData.resourceType,
      resourceId: resourceData.id
    });
    
    if (existingResource) {
      // Update existing resource
      existingResource.data = resourceData;
      existingResource.version = (parseInt(existingResource.version) + 1).toString();
      existingResource.updatedAt = new Date();
      
      await existingResource.save();
      return existingResource;
    } else {
      // Create new resource
      const newResource = new FHIRResource({
        resourceType: resourceData.resourceType,
        resourceId: resourceData.id,
        patientId,
        data: resourceData,
        source: SYSTEM_ID,
        version: '1'
      });
      
      await newResource.save();
      return newResource;
    }
  } catch (error) {
    console.error('Error creating/updating FHIR resource:', error);
    throw error;
  }
};

// Get a FHIR resource by type and ID
exports.getResource = async (resourceType, resourceId) => {
  try {
    const resource = await FHIRResource.findOne({
      resourceType,
      resourceId
    });
    
    if (!resource) {
      throw new Error(`Resource ${resourceType}/${resourceId} not found`);
    }
    
    return resource.data;
  } catch (error) {
    console.error('Error getting FHIR resource:', error);
    throw error;
  }
};

// Search for FHIR resources
exports.searchResources = async (params) => {
  try {
    const { resourceType, patientId, _count, _sort, ...searchParams } = params;
    
    // Build query
    const query = {};
    
    if (resourceType) {
      query.resourceType = resourceType;
    }
    
    if (patientId) {
      query.patientId = patientId;
    }
    
    // Handle search parameters
    for (const [key, value] of Object.entries(searchParams)) {
      // For simplicity, we're doing basic string matching
      // A full implementation would handle FHIR search parameters more robustly
      query[`data.${key}`] = value;
    }
    
    // Build options for pagination and sorting
    const options = {};
    
    if (_count) {
      options.limit = parseInt(_count);
    }
    
    if (_sort) {
      options.sort = {};
      const sortFields = _sort.split(',');
      
      for (const field of sortFields) {
        const order = field.startsWith('-') ? -1 : 1;
        const fieldName = field.startsWith('-') ? field.substring(1) : field;
        
        options.sort[`data.${fieldName}`] = order;
      }
    }
    
    // Execute query
    const resources = await FHIRResource.find(query, null, options);
    
    return resources.map(resource => resource.data);
  } catch (error) {
    console.error('Error searching FHIR resources:', error);
    throw error;
  }
};

// Export patient data as FHIR Bundle
exports.exportPatientData = async (patientId) => {
  try {
    // Get all resources for the patient
    const resources = await FHIRResource.find({ patientId });
    
    // Create FHIR Bundle
    const bundle = {
      resourceType: 'Bundle',
      type: 'collection',
      entry: resources.map(resource => ({
        resource: resource.data
      }))
    };
    
    return bundle;
  } catch (error) {
    console.error('Error exporting patient data:', error);
    throw error;
  }
};

// Import FHIR Bundle
exports.importFHIRBundle = async (bundle, patientId) => {
  try {
    if (bundle.resourceType !== 'Bundle') {
      throw new Error('Invalid resource: not a FHIR Bundle');
    }
    
    const results = {
      processed: 0,
      success: 0,
      errors: []
    };
    
    // Process each entry in the bundle
    for (const entry of bundle.entry || []) {
      if (!entry.resource) continue;
      
      results.processed++;
      
      try {
        // Create or update the resource
        await this.createOrUpdateResource(entry.resource, patientId);
        results.success++;
      } catch (error) {
        console.error('Error processing bundle entry:', error);
        results.errors.push({
          resourceType: entry.resource.resourceType,
          id: entry.resource.id,
          error: error.message
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error importing FHIR bundle:', error);
    throw error;
  }
};

// Synchronize with external FHIR server
exports.syncWithExternalFHIR = async (patientId, externalFHIRUrl, authToken) => {
  try {
    // Get patient FHIR ID
    const patient = await this.mapUserToFHIRPatient(patientId);
    const patientFHIRId = patient.id;
    
    // Fetch patient data from external FHIR server
    const headers = {
      Accept: 'application/fhir+json',
      'Content-Type': 'application/fhir+json'
    };
    
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    
    // Search for patient-related resources
    const response = await axios.get(
      `${externalFHIRUrl}/Patient/${patientFHIRId}/$everything`,
      { headers }
    );
    
    // Process the bundle
    if (response.data.resourceType === 'Bundle') {
      return await this.importFHIRBundle(response.data, patientId);
    } else {
      throw new Error('Unexpected response format from external FHIR server');
    }
  } catch (error) {
    console.error('Error syncing with external FHIR server:', error);
    throw error;
  }
};

// Translate HL7 v2 message to FHIR
exports.translateHL7toFHIR = async (hl7Message, patientId) => {
  // In a real implementation, this would use a proper HL7 to FHIR converter
  // For demonstration purposes, we're implementing a simplified version
  
  try {
    // Parse HL7 message
    const segments = hl7Message.split('\r\n');
    const parsedMessage = {};
    
    // Extract message type from MSH segment
    const mshSegment = segments.find(seg => seg.startsWith('MSH|'));
    if (!mshSegment) {
      throw new Error('Invalid HL7 message: MSH segment not found');
    }
    
    const mshFields = mshSegment.split('|');
    const messageType = mshFields[9].split('^')[0];
    
    // Handle different message types
    switch (messageType) {
      case 'ADT': // Admission, Discharge, Transfer
        // Extract patient info from PID segment
        const pidSegment = segments.find(seg => seg.startsWith('PID|'));
        if (!pidSegment) {
          throw new Error('Invalid HL7 ADT message: PID segment not found');
        }
        
        const pidFields = pidSegment.split('|');
        
        // Create/update Patient resource
        const patientResource = {
          resourceType: 'Patient',
          id: `patient-${patientId}`,
          identifier: [
            {
              system: `${SYSTEM_ID}/mrn`,
              value: pidFields[3]
            }
          ],
          name: [
            {
              family: pidFields[5].split('^')[0],
              given: [pidFields[5].split('^')[1]]
            }
          ],
          gender: pidFields[8].toLowerCase()
        };
        
        await this.createOrUpdateResource(patientResource, patientId);
        return patientResource;
        
      case 'ORU': // Observation Result
        // Extract observation info from OBX segment
        const obxSegments = segments.filter(seg => seg.startsWith('OBX|'));
        
        const observations = [];
        
        for (const obxSegment of obxSegments) {
          const obxFields = obxSegment.split('|');
          
          // Create Observation resource
          const observationResource = {
            resourceType: 'Observation',
            id: `observation-${obxFields[1]}-${Date.now()}`,
            status: 'final',
            code: {
              coding: [
                {
                  system: 'http://loinc.org',
                  code: obxFields[3].split('^')[0],
                  display: obxFields[3].split('^')[1]
                }
              ]
            },
            subject: {
              reference: `Patient/patient-${patientId}`
            },
            valueQuantity: {
              value: parseFloat(obxFields[5]),
              unit: obxFields[6],
              system: 'http://unitsofmeasure.org',
              code: obxFields[6]
            },
            effectiveDateTime: new Date().toISOString()
          };
          
          await this.createOrUpdateResource(observationResource, patientId);
          observations.push(observationResource);
        }
        
        return observations;
        
      default:
        throw new Error(`Unsupported HL7 message type: ${messageType}`);
    }
  } catch (error) {
    console.error('Error translating HL7 to FHIR:', error);
    throw error;
  }
};