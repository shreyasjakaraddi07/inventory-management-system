/**
 * GST Utilities Module
 * Helper functions for GST compliance and calculations
 */

// GST State Codes mapping (first 2 digits of GSTIN)
export const STATE_CODES = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman & Diu',
  '26': 'Dadra & Nagar Haveli',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh (Old)',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh (New)',
  '96': 'Other Countries (Exports)',
  '97': 'Other Territory'
};

// Valid GST Rates
export const VALID_GST_RATES = [0, 0.25, 3, 5, 12, 18, 28];

/**
 * Validate GSTIN format
 * @param {string} gstin - GST Identification Number
 * @returns {boolean} - True if valid
 */
export const validateGSTIN = (gstin) => {
  if (!gstin || typeof gstin !== 'string') return false;
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return regex.test(gstin.trim().toUpperCase());
};

/**
 * Extract state code from GSTIN
 * @param {string} gstin - GST Identification Number
 * @returns {string|null} - State code or null
 */
export const getStateCodeFromGSTIN = (gstin) => {
  if (!validateGSTIN(gstin)) return null;
  return gstin.substring(0, 2);
};

/**
 * Get state name from state code
 * @param {string} code - 2-digit state code
 * @returns {string} - State name or code itself
 */
export const getStateName = (code) => {
  return STATE_CODES[code] || code;
};

/**
 * Validate HSN Code
 * @param {string|number} hsn - HSN Code
 * @returns {boolean} - True if valid
 */
export const validateHSN = (hsn) => {
  if (!hsn) return false;
  const hsnStr = hsn.toString().trim();
  return hsnStr.length === 4 || hsnStr.length === 6 || hsnStr.length === 8;
};

/**
 * Validate GST Rate
 * @param {number} rate - GST Rate
 * @returns {boolean} - True if valid
 */
export const validateGSTRate = (rate) => {
  const rateNum = parseFloat(rate);
  return VALID_GST_RATES.includes(rateNum);
};

/**
 * Determine tax type based on Place of Supply
 * @param {string} businessStateCode - Business state code
 * @param {string} posStateCode - Place of Supply state code
 * @returns {string} - 'CGST+SGST' or 'IGST'
 */
export const getTaxType = (businessStateCode, posStateCode) => {
  return businessStateCode === posStateCode ? 'CGST+SGST' : 'IGST';
};

/**
 * Classify invoice type for GSTR-1
 * @param {string} gstin - Customer GSTIN
 * @param {number} totalValue - Total invoice value
 * @param {boolean} isExport - Is export invoice
 * @param {string} businessState - Business state code
 * @param {string} posState - Place of Supply state code
 * @returns {string} - Invoice type: B2B, B2CL, B2CS, EXP
 */
export const classifyInvoice = (gstin, totalValue, isExport = false, businessState = '', posState = '') => {
  if (isExport) return 'EXP';
  if (gstin && validateGSTIN(gstin)) return 'B2B';
  if (businessState && posState && businessState !== posState && totalValue > 250000) return 'B2CL';
  return 'B2CS';
};

/**
 * Calculate round-off amount
 * @param {number} amount - Original amount
 * @returns {Object} - { rounded, difference }
 */
export const calculateRoundOff = (amount) => {
  const numAmount = parseFloat(amount) || 0;
  const rounded = Math.round(numAmount);
  return {
    rounded,
    difference: parseFloat((rounded - numAmount).toFixed(2))
  };
};

/**
 * Calculate GST amounts
 * @param {number} taxableValue - Taxable value
 * @param {number} gstRate - GST Rate
 * @param {string} taxType - 'CGST+SGST' or 'IGST'
 * @returns {Object} - { cgst, sgst, igst, totalGST }
 */
export const calculateGST = (taxableValue, gstRate, taxType) => {
  const value = parseFloat(taxableValue) || 0;
  const rate = parseFloat(gstRate) || 0;
  const totalGST = (value * rate) / 100;
  
  if (taxType === 'IGST') {
    return {
      cgst: 0,
      sgst: 0,
      igst: parseFloat(totalGST.toFixed(2)),
      totalGST: parseFloat(totalGST.toFixed(2))
    };
  } else {
    const halfGST = totalGST / 2;
    return {
      cgst: parseFloat(halfGST.toFixed(2)),
      sgst: parseFloat(halfGST.toFixed(2)),
      igst: 0,
      totalGST: parseFloat(totalGST.toFixed(2))
    };
  }
};

/**
 * Check if ITC (Input Tax Credit) is eligible
 * @param {string} supplierGSTIN - Supplier GSTIN
 * @param {number} gstAmount - GST Amount
 * @param {boolean} isBlocked - Is credit blocked
 * @returns {boolean} - True if eligible
 */
export const isITCEligible = (supplierGSTIN, gstAmount, isBlocked = false) => {
  if (isBlocked) return false;
  if (!validateGSTIN(supplierGSTIN)) return false;
  if (parseFloat(gstAmount) <= 0) return false;
  return true;
};

/**
 * Format currency for India
 * @param {number} amount - Amount
 * @returns {string} - Formatted amount
 */
export const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

/**
 * Format GSTIN for display
 * @param {string} gstin - GSTIN
 * @returns {string} - Formatted GSTIN
 */
export const formatGSTIN = (gstin) => {
  if (!gstin || gstin.length !== 15) return gstin;
  const g = gstin.toUpperCase();
  return `${g.slice(0, 2)} ${g.slice(2, 7)} ${g.slice(7, 12)} ${g.slice(12)}`;
};

/**
 * Get financial year from date
 * @param {Date} date - Date object
 * @returns {string} - Financial year (e.g., "2023-24")
 */
export const getFinancialYear = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  
  if (month >= 4) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
};

/**
 * Get return period in MMYYYY format
 * @param {Date} date - Date object
 * @returns {string} - Return period (e.g., "042023")
 */
export const getReturnPeriod = (date) => {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}${year}`;
};

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} - True if valid
 */
export const validateEmail = (email) => {
  if (!email) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Validate phone number (Indian)
 * @param {string} phone - Phone number
 * @returns {boolean} - True if valid
 */
export const validatePhone = (phone) => {
  if (!phone) return false;
  const regex = /^[6-9]\d{9}$/;
  return regex.test(phone.toString().replace(/\D/g, ''));
};

/**
 * Parse date to ISO format
 * @param {string|Date} date - Date
 * @returns {string} - ISO date string
 */
export const parseDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
};

/**
 * Calculate total invoice value with round-off
 * @param {number} taxableValue - Taxable value
 * @param {number} cgst - CGST amount
 * @param {number} sgst - SGST amount
 * @param {number} igst - IGST amount
 * @returns {Object} - { totalValue, roundOff }
 */
export const calculateInvoiceValue = (taxableValue, cgst, sgst, igst) => {
  const value = parseFloat(taxableValue) || 0;
  const c = parseFloat(cgst) || 0;
  const s = parseFloat(sgst) || 0;
  const i = parseFloat(igst) || 0;
  
  const totalBeforeRound = value + c + s + i;
  const { rounded, difference } = calculateRoundOff(totalBeforeRound);
  
  return {
    totalValue: rounded,
    roundOff: difference,
    totalBeforeRound
  };
};

/**
 * Generate unique invoice number
 * @param {string} prefix - Invoice prefix
 * @param {number} sequence - Sequence number
 * @returns {string} - Invoice number
 */
export const generateInvoiceNumber = (prefix = 'INV', sequence = null) => {
  const seq = sequence || Date.now();
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${prefix}-${year}${month}-${String(seq).padStart(6, '0')}`;
};

export default {
  validateGSTIN,
  getStateCodeFromGSTIN,
  getStateName,
  validateHSN,
  validateGSTRate,
  getTaxType,
  classifyInvoice,
  calculateRoundOff,
  calculateGST,
  isITCEligible,
  formatCurrency,
  formatGSTIN,
  getFinancialYear,
  getReturnPeriod,
  validateEmail,
  validatePhone,
  parseDate,
  calculateInvoiceValue,
  generateInvoiceNumber,
  STATE_CODES,
  VALID_GST_RATES
};
