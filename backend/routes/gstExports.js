/**
 * GST Export Routes
 * API endpoints for GSTR-1, GSTR-3B, HSN Summary, and CDNR exports
 */

import express from 'express';
import oracledb from 'oracledb';
import { getConnection } from '../db.js';
import { 
  generateGSTR1, 
  generateGSTR3B, 
  generateHSNSummary, 
  generateCDNR,
  generateGSTR1JSON,
  exportToCSV,
  exportToExcel
} from '../controllers/gstExportController.js';

const router = express.Router();

// Field definitions for CSV/Excel exports
const GSTR1_FIELDS = [
  { label: 'Invoice Number', value: 'INVOICE_NUMBER' },
  { label: 'Invoice Date', value: 'INVOICE_DATE' },
  { label: 'Invoice Type', value: 'INVOICE_TYPE' },
  { label: 'Customer Name', value: 'CUSTOMER_NAME' },
  { label: 'Customer GSTIN', value: 'CUSTOMER_GSTIN' },
  { label: 'POS State', value: 'POS_STATE_CODE' },
  { label: 'Taxable Value', value: 'TOTAL_TAXABLE_VALUE' },
  { label: 'CGST', value: 'TOTAL_CGST' },
  { label: 'SGST', value: 'TOTAL_SGST' },
  { label: 'IGST', value: 'TOTAL_IGST' },
  { label: 'Round Off', value: 'ROUND_OFF' },
  { label: 'Total Value', value: 'TOTAL_INVOICE_VALUE' }
];

const HSN_FIELDS = [
  { label: 'HSN Code', value: 'hsnCode' },
  { label: 'Description', value: 'description' },
  { label: 'GST Rate', value: 'gstRate' },
  { label: 'UQC', value: 'uqc' },
  { label: 'Total Quantity', value: 'totalQuantity' },
  { label: 'Total Value', value: 'totalValue' },
  { label: 'Taxable Value', value: 'taxableValue' },
  { label: 'Integrated Tax', value: 'integratedTax' },
  { label: 'Central Tax', value: 'centralTax' },
  { label: 'State/UT Tax', value: 'stateUtTax' },
  { label: 'Cess', value: 'cess' }
];

const CDNR_FIELDS = [
  { label: 'Note Type', value: 'noteType' },
  { label: 'Note Number', value: 'noteNumber' },
  { label: 'Note Date', value: 'noteDate' },
  { label: 'Original Invoice', value: 'originalInvoiceNumber' },
  { label: 'Customer Name', value: 'customerName' },
  { label: 'Customer GSTIN', value: 'customerGSTIN' },
  { label: 'Taxable Value', value: 'taxableValue' },
  { label: 'CGST', value: 'cgst' },
  { label: 'SGST', value: 'sgst' },
  { label: 'IGST', value: 'igst' },
  { label: 'Total Amount', value: 'totalAmount' },
  { label: 'Reason', value: 'reason' }
];

router.get('/businesses', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT business_id, gstin, legal_name, trade_name, state_code, registration_type
       FROM businesses
       WHERE is_active = 1
       ORDER BY legal_name`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({ success: true, data: result.rows || [] });
  } catch (error) {
    if (error.errorNum === 942) {
      return res.json({ success: true, data: [] });
    }

    console.error('Businesses fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch businesses',
      details: error.message
    });
  } finally {
    if (connection) await connection.close();
  }
});

/**
 * GET /api/exports/gstr1
 * Get GSTR-1 data with optional filtering
 */
router.get('/gstr1', async (req, res) => {
  try {
    const { startDate, endDate, invoiceType, format } = req.query;
    
    // Validate required parameters
    const userId = req.user.id;
    const result = await generateGSTR1({ startDate, endDate, invoiceType, userId });
    
    // Handle different export formats
    if (format === 'csv') {
      // Flatten data for CSV
      const allInvoices = [
        ...result.data.b2b,
        ...result.data.b2cl,
        ...result.data.b2cs,
        ...result.data.exp,
        ...result.data.cdnr
      ];
      
      const csv = exportToCSV(allInvoices, GSTR1_FIELDS);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=GSTR1_${startDate}_${endDate}.csv`);
      return res.send(csv);
    }
    
    if (format === 'excel') {
      const allInvoices = [
        ...result.data.b2b,
        ...result.data.b2cl,
        ...result.data.b2cs,
        ...result.data.exp,
        ...result.data.cdnr
      ];
      
      const excelColumns = GSTR1_FIELDS.map(f => ({
        header: f.label,
        key: f.value,
        width: 15,
        type: f.value.includes('VALUE') || f.value.includes('CGST') || f.value.includes('SGST') || f.value.includes('IGST') ? 'number' : 'string'
      }));
      
      const buffer = await exportToExcel(allInvoices, excelColumns, 'GSTR-1');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=GSTR1_${startDate}_${endDate}.xlsx`);
      return res.send(buffer);
    }
    
    // Default JSON response
    res.json(result);
  } catch (error) {
    console.error('GSTR-1 Export Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate GSTR-1', 
      details: error.message 
    });
  }
});

/**
 * GET /api/exports/gstr1-json
 * Get GSTN-compliant JSON for GSTR-1 filing
 */
router.get('/gstr1-json', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const userId = req.user.id;
    const result = await generateGSTR1JSON({ startDate, endDate, userId });
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=GSTR1_JSON_${startDate}_${endDate}.json`);
    res.json(result.data);
  } catch (error) {
    console.error('GSTR-1 JSON Export Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate GSTR-1 JSON', 
      details: error.message 
    });
  }
});

/**
 * GET /api/exports/gstr3b-summary
 * Get GSTR-3B summary data
 */
router.get('/gstr3b-summary', async (req, res) => {
  try {
    const { startDate, endDate, format } = req.query;
    
    const userId = req.user.id;
    const result = await generateGSTR3B({ startDate, endDate, userId });
    
    if (format === 'csv') {
      // Convert nested data to flat structure for CSV
      const flatData = [{
        'Outward B2B Value': result.data.outwardSupplies.b2b,
        'Outward B2C Value': result.data.outwardSupplies.b2c,
        'Export Value': result.data.outwardSupplies.export,
        'Outward CGST': result.data.outwardSupplies.cgst,
        'Outward SGST': result.data.outwardSupplies.sgst,
        'Outward IGST': result.data.outwardSupplies.igst,
        'Interstate Value': result.data.interStateSupplies.value,
        'Interstate IGST': result.data.interStateSupplies.igst,
        'ITC CGST': result.data.itcAvailable.cgst,
        'ITC SGST': result.data.itcAvailable.sgst,
        'ITC IGST': result.data.itcAvailable.igst,
        'RCM CGST': result.data.itcRCM.cgst,
        'RCM SGST': result.data.itcRCM.sgst,
        'RCM IGST': result.data.itcRCM.igst,
        'RCM Liability CGST': result.data.rcmLiability.cgst,
        'RCM Liability SGST': result.data.rcmLiability.sgst,
        'RCM Liability IGST': result.data.rcmLiability.igst,
        'Net Tax Payable': result.data.netTaxPayable.total,
        'Net CGST': result.data.netTaxPayable.cgst,
        'Net SGST': result.data.netTaxPayable.sgst,
        'Net IGST': result.data.netTaxPayable.igst
      }];
      
      const csv = exportToCSV(flatData, Object.keys(flatData[0]).map(k => ({ label: k, value: k })));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=GSTR3B_${startDate}_${endDate}.csv`);
      return res.send(csv);
    }
    
    res.json(result);
  } catch (error) {
    console.error('GSTR-3B Export Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate GSTR-3B summary', 
      details: error.message 
    });
  }
});

/**
 * GET /api/exports/hsn-summary
 * Get HSN-wise summary (Table 12 of GSTR-1)
 */
router.get('/hsn-summary', async (req, res) => {
  try {
    const { startDate, endDate, format } = req.query;
    
    const userId = req.user.id;
    const result = await generateHSNSummary({ startDate, endDate, userId });
    
    if (format === 'csv') {
      const csv = exportToCSV(result.data, HSN_FIELDS);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=HSN_Summary_${startDate}_${endDate}.csv`);
      return res.send(csv);
    }
    
    if (format === 'excel') {
      const excelColumns = HSN_FIELDS.map(f => ({
        header: f.label,
        key: f.value,
        width: 15,
        type: ['totalQuantity', 'totalValue', 'taxableValue', 'integratedTax', 'centralTax', 'stateUtTax', 'cess'].includes(f.value) ? 'number' : 'string'
      }));
      
      const buffer = await exportToExcel(result.data, excelColumns, 'HSN Summary');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=HSN_Summary_${startDate}_${endDate}.xlsx`);
      return res.send(buffer);
    }
    
    res.json(result);
  } catch (error) {
    console.error('HSN Summary Export Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate HSN summary', 
      details: error.message 
    });
  }
});

/**
 * GET /api/exports/credit-debit-notes
 * Get Credit/Debit Notes register
 */
router.get('/credit-debit-notes', async (req, res) => {
  try {
    const { startDate, endDate, noteType, format } = req.query;
    
    const userId = req.user.id;
    const result = await generateCDNR({ startDate, endDate, noteType, userId });
    
    if (format === 'csv') {
      const csv = exportToCSV(result.data, CDNR_FIELDS);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=CDNR_${startDate}_${endDate}.csv`);
      return res.send(csv);
    }
    
    if (format === 'excel') {
      const excelColumns = CDNR_FIELDS.map(f => ({
        header: f.label,
        key: f.value,
        width: 15,
        type: ['taxableValue', 'cgst', 'sgst', 'igst', 'totalAmount'].includes(f.value) ? 'number' : 'string'
      }));
      
      const buffer = await exportToExcel(result.data, excelColumns, 'Credit/Debit Notes');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=CDNR_${startDate}_${endDate}.xlsx`);
      return res.send(buffer);
    }
    
    res.json(result);
  } catch (error) {
    console.error('CDNR Export Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate Credit/Debit Notes', 
      details: error.message 
    });
  }
});

/**
 * GET /api/exports/sales
 * Get detailed sales export
 */
router.get('/sales', async (req, res) => {
  try {
    const { startDate, endDate, invoiceType, format } = req.query;
    const connection = await getConnection();
    
    try {
      const userId = req.user.id;
      let query = `
        SELECT 
          s.invoice_number,
          s.invoice_date,
          s.invoice_type,
          s.is_reverse_charge,
          c.customer_name,
          c.gst_number as customer_gstin,
          s.pos_state_code,
          p.product_name,
          p.hsn_code,
          p.gst_rate,
          si.quantity,
          si.unit_price,
          si.taxable_amount,
          si.cgst_amount,
          si.sgst_amount,
          si.igst_amount,
          si.total_amount,
          s.total_invoice_value
        FROM sales s
        JOIN customers c ON s.customer_id = c.customer_id AND c.user_id = s.user_id
        JOIN sale_items si ON s.sale_id = si.sale_id AND si.user_id = s.user_id
        JOIN products p ON si.product_id = p.product_id AND p.user_id = si.user_id
        WHERE s.invoice_date BETWEEN TO_DATE(:startDate, 'YYYY-MM-DD') 
          AND TO_DATE(:endDate, 'YYYY-MM-DD')
          AND s.is_active = 1
          AND s.user_id = :userId
      `;
      
      const binds = { startDate, endDate, userId };
      
      if (invoiceType && invoiceType !== 'ALL') {
        query += ` AND s.invoice_type = :invoiceType`;
        binds.invoiceType = invoiceType;
      }
      
      query += ` ORDER BY s.invoice_date, s.invoice_number`;
      
      const result = await connection.execute(query, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      
      const data = result.rows || [];
      
      if (format === 'csv') {
        const fields = Object.keys(data[0] || {}).map(k => ({ label: k, value: k }));
        const csv = exportToCSV(data, fields);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=Sales_Export_${startDate}_${endDate}.csv`);
        return res.send(csv);
      }
      
      res.json({ success: true, count: data.length, data });
    } finally {
      if (connection) await connection.close();
    }
  } catch (error) {
    console.error('Sales Export Error:', error);
    res.status(500).json({ error: 'Failed to export sales', details: error.message });
  }
});

/**
 * GET /api/exports/purchases
 * Get detailed purchase export
 */
router.get('/purchases', async (req, res) => {
  try {
    const { startDate, endDate, format } = req.query;
    const connection = await getConnection();
    
    try {
      const userId = req.user.id;
      const query = `
        SELECT 
          p.invoice_number,
          p.invoice_date,
          'B2B' as invoice_type,
          s.supplier_name,
          s.gst_number as supplier_gstin,
          p.is_reverse_charge,
          p.total_taxable_value,
          p.total_cgst,
          p.total_sgst,
          p.total_igst,
          p.total_value as total_invoice_value
        FROM purchases p
        JOIN suppliers s ON p.supplier_id = s.supplier_id AND s.user_id = p.user_id
        WHERE p.invoice_date BETWEEN TO_DATE(:startDate, 'YYYY-MM-DD') 
          AND TO_DATE(:endDate, 'YYYY-MM-DD')
          AND p.is_active = 1
          AND p.user_id = :userId
        ORDER BY p.invoice_date
      `;
      
      const result = await connection.execute(
        query,
        { startDate, endDate, userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      
      const data = result.rows || [];
      
      if (format === 'csv') {
        const fields = Object.keys(data[0] || {}).map(k => ({ label: k, value: k }));
        const csv = exportToCSV(data, fields);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=Purchase_Export_${startDate}_${endDate}.csv`);
        return res.send(csv);
      }
      
      res.json({ success: true, count: data.length, data });
    } finally {
      if (connection) await connection.close();
    }
  } catch (error) {
    console.error('Purchase Export Error:', error);
    res.status(500).json({ error: 'Failed to export purchases', details: error.message });
  }
});

export default router;
