/**
 * GST Export Service
 * API calls for GST export functionality
 */

import axios from 'axios';

const API = 'http://localhost:8080/api';

/**
 * Get auth headers
 * @returns {Object} - Headers with authorization token
 */
const getHeaders = () => {
  const userInfo = localStorage.getItem('userInfo');
  const token = userInfo ? JSON.parse(userInfo).token : '';
  return {
    headers: { Authorization: `Bearer ${token}` }
  };
};

export const gstExportService = {
  getBusinesses: () => {
    return axios.get(`${API}/exports/businesses`, {
      ...getHeaders()
    });
  },
  /**
   * Get GSTR-1 data
   * @param {Object} params - { startDate, endDate, invoiceType }
   * @returns {Promise} - API response
   */
  getGSTR1: (params) => {
    return axios.get(`${API}/exports/gstr1`, { 
      params,
      ...getHeaders()
    });
  },

  /**
   * Export GSTR-1 as CSV
   * @param {Object} params - { startDate, endDate, invoiceType }
   * @returns {Promise} - File download
   */
  exportGSTR1CSV: (params) => {
    return axios.get(`${API}/exports/gstr1`, { 
      params: { ...params, format: 'csv' },
      ...getHeaders(),
      responseType: 'blob'
    });
  },

  /**
   * Export GSTR-1 as Excel
   * @param {Object} params - { startDate, endDate, invoiceType }
   * @returns {Promise} - File download
   */
  exportGSTR1Excel: (params) => {
    return axios.get(`${API}/exports/gstr1`, { 
      params: { ...params, format: 'excel' },
      ...getHeaders(),
      responseType: 'blob'
    });
  },

  /**
   * Get GSTN-compliant JSON for GSTR-1
   * @param {Object} params - { startDate, endDate }
   * @returns {Promise} - JSON file download
   */
  exportGSTR1JSON: (params) => {
    return axios.get(`${API}/exports/gstr1-json`, { 
      params,
      ...getHeaders(),
      responseType: 'blob'
    });
  },

  /**
   * Get GSTR-3B summary
   * @param {Object} params - { startDate, endDate }
   * @returns {Promise} - API response
   */
  getGSTR3B: (params) => {
    return axios.get(`${API}/exports/gstr3b-summary`, { 
      params,
      ...getHeaders()
    });
  },

  /**
   * Export GSTR-3B as CSV
   * @param {Object} params - { startDate, endDate }
   * @returns {Promise} - File download
   */
  exportGSTR3BCSV: (params) => {
    return axios.get(`${API}/exports/gstr3b-summary`, { 
      params: { ...params, format: 'csv' },
      ...getHeaders(),
      responseType: 'blob'
    });
  },

  /**
   * Get HSN Summary
   * @param {Object} params - { startDate, endDate }
   * @returns {Promise} - API response
   */
  getHSNSummary: (params) => {
    return axios.get(`${API}/exports/hsn-summary`, { 
      params,
      ...getHeaders()
    });
  },

  /**
   * Export HSN Summary as CSV
   * @param {Object} params - { startDate, endDate }
   * @returns {Promise} - File download
   */
  exportHSNCSV: (params) => {
    return axios.get(`${API}/exports/hsn-summary`, { 
      params: { ...params, format: 'csv' },
      ...getHeaders(),
      responseType: 'blob'
    });
  },

  /**
   * Export HSN Summary as Excel
   * @param {Object} params - { startDate, endDate }
   * @returns {Promise} - File download
   */
  exportHSNExcel: (params) => {
    return axios.get(`${API}/exports/hsn-summary`, { 
      params: { ...params, format: 'excel' },
      ...getHeaders(),
      responseType: 'blob'
    });
  },

  /**
   * Get Credit/Debit Notes
   * @param {Object} params - { startDate, endDate, noteType }
   * @returns {Promise} - API response
   */
  getCDNR: (params) => {
    return axios.get(`${API}/exports/credit-debit-notes`, { 
      params,
      ...getHeaders()
    });
  },

  /**
   * Export Credit/Debit Notes as CSV
   * @param {Object} params - { startDate, endDate, noteType }
   * @returns {Promise} - File download
   */
  exportCDNRCSV: (params) => {
    return axios.get(`${API}/exports/credit-debit-notes`, { 
      params: { ...params, format: 'csv' },
      ...getHeaders(),
      responseType: 'blob'
    });
  },

  /**
   * Export Credit/Debit Notes as Excel
   * @param {Object} params - { startDate, endDate, noteType }
   * @returns {Promise} - File download
   */
  exportCDNRExcel: (params) => {
    return axios.get(`${API}/exports/credit-debit-notes`, { 
      params: { ...params, format: 'excel' },
      ...getHeaders(),
      responseType: 'blob'
    });
  },

  /**
   * Get detailed sales export
   * @param {Object} params - { startDate, endDate, invoiceType }
   * @returns {Promise} - API response
   */
  getSalesExport: (params) => {
    return axios.get(`${API}/exports/sales`, { 
      params,
      ...getHeaders()
    });
  },

  exportSalesCSV: (params) => {
    return axios.get(`${API}/exports/sales`, {
      params: { ...params, format: 'csv' },
      ...getHeaders(),
      responseType: 'blob'
    });
  },

  /**
   * Get detailed purchase export
   * @param {Object} params - { startDate, endDate }
   * @returns {Promise} - API response
   */
  getPurchaseExport: (params) => {
    return axios.get(`${API}/exports/purchases`, { 
      params,
      ...getHeaders()
    });
  },

  exportPurchaseCSV: (params) => {
    return axios.get(`${API}/exports/purchases`, {
      params: { ...params, format: 'csv' },
      ...getHeaders(),
      responseType: 'blob'
    });
  }
};

export default gstExportService;
