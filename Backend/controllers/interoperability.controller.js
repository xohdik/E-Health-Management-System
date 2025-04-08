// backend/controllers/interoperability.controller.js - Real implementation

const fhirService = require('../services/fhir.service');
const { validationResult } = require('express-validator');

// Search FHIR resources
exports.searchResources = async (req, res) => {
  try {
    const results = await fhirService.searchResources(req.query);
    res.json({
      resourceType: 'Bundle',
      type: 'searchset',
      total: results.length,
      entry: results.map(resource => ({
        resource
      }))
    });
  } catch (error) {
    console.error('Error searching FHIR resources:', error);
    res.status(500).json({ message: error.message });
  }
};

// Export patient data as FHIR Bundle
exports.exportPatientData = async (req, res) => {
  const { patientId } = req.params;

  try {
    const bundle = await fhirService.exportPatientData(patientId);
    res.json(bundle);
  } catch (error) {
    console.error('Error exporting patient data:', error);
    res.status(500).json({ message: error.message });
  }
};

// Import FHIR Bundle
exports.importFHIRBundle = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { patientId } = req.params;
  const bundle = req.body;

  try {
    const results = await fhirService.importFHIRBundle(bundle, patientId);
    res.json(results);
  } catch (error) {
    console.error('Error importing FHIR bundle:', error);
    res.status(500).json({ message: error.message });
  }
};