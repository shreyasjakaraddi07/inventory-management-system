/**
 * GST Helper Utilities
 * Frontend utilities for GST compliance and formatting
 */

// GST State Codes mapping
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

// Invoice Types
export const INVOICE_TYPES = [
  { value: 'ALL', label: 'All Types' },
  { value: 'B2B', label: 'B2B (Business to Business)' },
  { value: 'B2CL', label: 'B2CL (Large Consumer)' },
  { value: 'B2CS', label: 'B2CS (Small Consumer)' },
  { value: 'EXP', label: 'Export' },
  { value: 'CDNR', label: 'Credit/Debit Note' }
];

// Export Formats
export const EXPORT_FORMATS = [
  { value: 'excel', label: 'Excel (.xlsx)', icon: 'table' },
  { value: 'csv', label: 'CSV', icon: 'file-text' },
  { value: 'json', label: 'JSON (GST Portal)', icon: 'code' }
];

export const GST_RATE_OPTIONS = [
  { value: 'ALL', label: 'All Rates' },
  ...VALID_GST_RATES.map((rate) => ({ value: String(rate), label: `${rate}%` }))
];

export const AMOUNT_RANGE_OPTIONS = [
  { value: 'ALL', label: 'Any Amount' },
  { value: '0-10000', label: 'Up to ₹10,000' },
  { value: '10000-100000', label: '₹10,000 - ₹1,00,000' },
  { value: '100000+', label: 'Above ₹1,00,000' }
];

export const REVERSE_CHARGE_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'YES', label: 'Yes' },
  { value: 'NO', label: 'No' }
];

// GSTR-1 Sections
export const GSTR1_SECTIONS = [
  { key: 'b2b', label: 'B2B Invoices', color: 'blue' },
  { key: 'b2cl', label: 'B2CL Invoices', color: 'green' },
  { key: 'b2cs', label: 'B2CS Invoices', color: 'yellow' },
  { key: 'exp', label: 'Export Invoices', color: 'purple' },
  { key: 'cdnr', label: 'Credit/Debit Notes', color: 'red' }
];

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
 * Get state name from state code
 * @param {string} code - 2-digit state code
 * @returns {string} - State name or code itself
 */
export const getStateName = (code) => {
  return STATE_CODES[code] || code;
};

/**
 * Format GSTIN for display
 * @param {string} gstin - GSTIN
 * @returns {string} - Formatted GSTIN
 */
export const formatGSTIN = (gstin) => {
  if (!gstin || gstin.length !== 15) return gstin || '-';
  const g = gstin.toUpperCase();
  return `${g.slice(0, 2)} ${g.slice(2, 7)} ${g.slice(7, 12)} ${g.slice(12)}`;
};

/**
 * Format currency for India
 * @param {number} amount - Amount
 * @returns {string} - Formatted amount
 */
export const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

/**
 * Format number with Indian number system
 * @param {number} num - Number
 * @returns {string} - Formatted number
 */
export const formatNumber = (num) => {
  const number = parseFloat(num) || 0;
  return new Intl.NumberFormat('en-IN').format(number);
};

/**
 * Format date for display
 * @param {string} dateString - Date string
 * @returns {string} - Formatted date
 */
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
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
 * Get default date range (current month)
 * @returns {Object} - { startDate, endDate }
 */
export const getDefaultDateRange = () => {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
};

/**
 * Get previous month date range
 * @returns {Object} - { startDate, endDate }
 */
export const getPreviousMonthRange = () => {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
};

/**
 * Get current quarter date range
 * @returns {Object} - { startDate, endDate }
 */
export const getCurrentQuarterRange = () => {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3);
  const startDate = new Date(now.getFullYear(), quarter * 3, 1);
  const endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
};

/**
 * Get financial year date range
 * @returns {Object} - { startDate, endDate }
 */
export const getFinancialYearRange = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  let startDate, endDate;
  if (currentMonth >= 4) {
    startDate = new Date(currentYear, 3, 1);
    endDate = new Date(currentYear + 1, 2, 31);
  } else {
    startDate = new Date(currentYear - 1, 3, 1);
    endDate = new Date(currentYear, 2, 31);
  }
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
};

/**
 * Calculate GST amounts
 * @param {number} taxableValue - Taxable value
 * @param {number} gstRate - GST Rate
 * @param {string} taxType - 'intra' or 'inter'
 * @returns {Object} - { cgst, sgst, igst, totalGST }
 */
export const calculateGST = (taxableValue, gstRate, taxType) => {
  const value = parseFloat(taxableValue) || 0;
  const rate = parseFloat(gstRate) || 0;
  const totalGST = (value * rate) / 100;
  
  if (taxType === 'inter') {
    return {
      cgst: 0,
      sgst: 0,
      igst: totalGST,
      totalGST
    };
  } else {
    const halfGST = totalGST / 2;
    return {
      cgst: halfGST,
      sgst: halfGST,
      igst: 0,
      totalGST
    };
  }
};

/**
 * Get invoice type label
 * @param {string} type - Invoice type code
 * @returns {string} - Label
 */
export const getInvoiceTypeLabel = (type) => {
  const found = INVOICE_TYPES.find(t => t.value === type);
  return found ? found.label : type;
};

/**
 * Get invoice type color
 * @param {string} type - Invoice type code
 * @returns {string} - Color class
 */
export const getInvoiceTypeColor = (type) => {
  const colors = {
    'B2B': 'bg-blue-100 text-blue-800',
    'B2CL': 'bg-green-100 text-green-800',
    'B2CS': 'bg-yellow-100 text-yellow-800',
    'EXP': 'bg-purple-100 text-purple-800',
    'CDNR': 'bg-red-100 text-red-800'
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
};

export const applyAmountRange = (value, range) => {
  const amount = parseFloat(value) || 0;

  if (!range || range === 'ALL') return true;
  if (range === '0-10000') return amount <= 10000;
  if (range === '10000-100000') return amount > 10000 && amount <= 100000;
  if (range === '100000+') return amount > 100000;

  return true;
};

export const buildValidationIssues = ({ salesRows = [], hsnRows = [], businessGSTIN = '' }) => {
  const missingGSTINRows = salesRows.filter((row) => row.INVOICE_TYPE === 'B2B' && !row.CUSTOMER_GSTIN);
  const invalidGSTINRows = salesRows.filter((row) => row.CUSTOMER_GSTIN && !validateGSTIN(row.CUSTOMER_GSTIN));
  const missingHSNRows = salesRows.filter((row) => !row.HSN_CODE);
  const invalidGSTRateRows = salesRows.filter((row) => row.GST_RATE !== undefined && row.GST_RATE !== null && !VALID_GST_RATES.includes(parseFloat(row.GST_RATE)));
  const missingBusinessGSTIN = businessGSTIN ? !validateGSTIN(businessGSTIN) : true;
  const missingHSNSummaryCodes = hsnRows.filter((row) => !row.hsnCode);

  const issues = [];

  if (missingBusinessGSTIN) {
    issues.push({ type: 'warning', code: 'BUSINESS_GSTIN', message: 'Business GSTIN is not configured or is invalid.', count: 1 });
  }
  if (missingGSTINRows.length) {
    issues.push({ type: 'warning', code: 'MISSING_GSTIN', message: `Missing GSTIN in ${missingGSTINRows.length} invoice(s).`, count: missingGSTINRows.length });
  }
  if (invalidGSTINRows.length) {
    issues.push({ type: 'warning', code: 'INVALID_GSTIN', message: `Invalid GSTIN in ${invalidGSTINRows.length} invoice(s).`, count: invalidGSTINRows.length });
  }
  if (missingHSNRows.length || missingHSNSummaryCodes.length) {
    const totalMissingHSN = missingHSNRows.length + missingHSNSummaryCodes.length;
    issues.push({ type: 'warning', code: 'MISSING_HSN', message: `Missing HSN in ${totalMissingHSN} item(s).`, count: totalMissingHSN });
  }
  if (invalidGSTRateRows.length) {
    issues.push({ type: 'warning', code: 'INVALID_GST_RATE', message: `Invalid GST rate in ${invalidGSTRateRows.length} entry(s).`, count: invalidGSTRateRows.length });
  }

  return {
    issues,
    flaggedInvoices: {
      missingGSTIN: new Set(missingGSTINRows.map((row) => row.INVOICE_NUMBER)),
      invalidGSTIN: new Set(invalidGSTINRows.map((row) => row.INVOICE_NUMBER)),
      missingHSN: new Set(missingHSNRows.map((row) => `${row.INVOICE_NUMBER}-${row.PRODUCT_NAME}`)),
      invalidGSTRate: new Set(invalidGSTRateRows.map((row) => `${row.INVOICE_NUMBER}-${row.PRODUCT_NAME}`))
    }
  };
};

export const sortRows = (rows, sortConfig) => {
  if (!Array.isArray(rows)) return [];
  if (!sortConfig?.key) return rows;

  return [...rows].sort((left, right) => {
    const leftValue = left?.[sortConfig.key] ?? left?.[sortConfig.key?.toLowerCase()] ?? '';
    const rightValue = right?.[sortConfig.key] ?? right?.[sortConfig.key?.toLowerCase()] ?? '';

    if (typeof leftValue === 'number' || typeof rightValue === 'number') {
      const numberDiff = (parseFloat(leftValue) || 0) - (parseFloat(rightValue) || 0);
      return sortConfig.direction === 'asc' ? numberDiff : -numberDiff;
    }

    const compare = String(leftValue).localeCompare(String(rightValue));
    return sortConfig.direction === 'asc' ? compare : -compare;
  });
};

export const paginateRows = (rows, page, pageSize) => {
  const safePage = Math.max(page, 1);
  const safeSize = Math.max(pageSize, 1);
  const start = (safePage - 1) * safeSize;
  return rows.slice(start, start + safeSize);
};

export const formatPeriodLabel = (startDate, endDate) => {
  if (!startDate || !endDate) return 'Period not selected';
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};

export const getReturnStatusMeta = (status) => {
  const normalized = status === 'FILED' ? 'FILED' : 'DRAFT';
  return normalized === 'FILED'
    ? { label: 'Filed (Locked)', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' }
    : { label: 'Draft', className: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
};

/**
 * Download blob as file
 * @param {Blob} blob - Blob data
 * @param {string} filename - File name
 */
export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Validate date range
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {boolean} - True if valid
 */
export const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return false;
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start <= end;
};

/**
 * Get GSTR-1 due date
 * @param {number} month - Month (0-11)
 * @param {number} year - Year
 * @returns {Date} - Due date
 */
export const getGSTR1DueDate = (month, year) => {
  // GSTR-1 is due on 11th of next month
  const dueDate = new Date(year, month + 1, 11);
  return dueDate;
};

/**
 * Get GSTR-3B due date
 * @param {number} month - Month (0-11)
 * @param {number} year - Year
 * @returns {Date} - Due date
 */
export const getGSTR3BDueDate = (month, year) => {
  // GSTR-3B is due on 20th of next month
  const dueDate = new Date(year, month + 1, 20);
  return dueDate;
};

/**
 * Check if GSTIN is valid and show error
 * @param {string} gstin - GSTIN
 * @returns {Object} - { isValid, error }
 */
export const checkGSTIN = (gstin) => {
  if (!gstin) {
    return { isValid: false, error: 'GSTIN is required' };
  }
  if (gstin.length !== 15) {
    return { isValid: false, error: 'GSTIN must be 15 characters' };
  }
  if (!validateGSTIN(gstin)) {
    return { isValid: false, error: 'Invalid GSTIN format' };
  }
  return { isValid: true, error: null };
};

export default {
  STATE_CODES,
  VALID_GST_RATES,
  INVOICE_TYPES,
  EXPORT_FORMATS,
  GST_RATE_OPTIONS,
  AMOUNT_RANGE_OPTIONS,
  REVERSE_CHARGE_OPTIONS,
  GSTR1_SECTIONS,
  validateGSTIN,
  getStateName,
  formatGSTIN,
  formatCurrency,
  formatNumber,
  formatDate,
  getFinancialYear,
  getDefaultDateRange,
  getPreviousMonthRange,
  getCurrentQuarterRange,
  getFinancialYearRange,
  calculateGST,
  getInvoiceTypeLabel,
  getInvoiceTypeColor,
  applyAmountRange,
  buildValidationIssues,
  sortRows,
  paginateRows,
  formatPeriodLabel,
  getReturnStatusMeta,
  downloadFile,
  validateDateRange,
  getGSTR1DueDate,
  getGSTR3BDueDate,
  checkGSTIN
};
