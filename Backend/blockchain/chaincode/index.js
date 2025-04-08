// File: /blockchain/chaincode/index.js
'use strict';

const EHRContract = require('./ehr/ehr');
module.exports.EHRContract = EHRContract;
module.exports.contracts = [EHRContract];