/**
 * GST Export Controller
 * Handles GSTR-1, GSTR-3B, HSN Summary, and CDNR exports
 */

import oracledb from 'oracledb';
import { getConnection } from '../db.js';
import { 
  validateGSTIN, 
  classifyInvoice, 
  getTaxType,
  calculateRoundOff,
  getFinancialYear,
  getReturnPeriod,
  formatCurrency,
  STATE_CODES
} from '../utils/gstUtils.js';
import { Parser } from 'json2csv';
import ExcelJS from 'exceljs';

/**
 * Generate GSTR-1 Data
 * @param {Object} params - Query parameters
 * @returns {Object} - GSTR-1 sections
 */
export const generateGSTR1 = async (params) => {
  const { startDate, endDate, invoiceType, userId } = params;
  const connection = await getConnection();
  
  try {
    // Check if GST columns exist by trying a simple query first
    let hasGSTColumns = true;
    try {
      await connection.execute(
        `SELECT invoice_type FROM sales WHERE ROWNUM = 1`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
    } catch (colError) {
      hasGSTColumns = false;
    }

    let query;
    if (hasGSTColumns) {
      // Full GST query
      query = `
        SELECT 
          s.sale_id,
          s.invoice_number,
          s.invoice_date,
          s.invoice_type,
          s.pos_state_code,
          s.is_reverse_charge,
          s.total_taxable_value,
          s.total_cgst,
          s.total_sgst,
          s.total_igst,
          s.round_off,
          s.total_invoice_value,
          c.customer_id,
          c.customer_name,
          c.gst_number as customer_gstin,
          NULL as customer_state
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.customer_id AND c.user_id = s.user_id
        WHERE s.invoice_date BETWEEN TO_DATE(:startDate, 'YYYY-MM-DD') 
          AND TO_DATE(:endDate, 'YYYY-MM-DD')
          AND NVL(s.is_active, 1) = 1
          AND s.user_id = :userId
      `;
    } else {
      // Fallback query without GST columns
      query = `
        SELECT 
          s.sale_id,
          s.invoice_number,
          s.invoice_date,
          'B2B' as invoice_type,
          NULL as pos_state_code,
          0 as is_reverse_charge,
          0 as total_taxable_value,
          0 as total_cgst,
          0 as total_sgst,
          0 as total_igst,
          0 as round_off,
          0 as total_invoice_value,
          c.customer_id,
          c.customer_name,
          c.gst_number as customer_gstin,
          NULL as customer_state
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.customer_id AND c.user_id = s.user_id
        WHERE s.invoice_date BETWEEN TO_DATE(:startDate, 'YYYY-MM-DD') 
          AND TO_DATE(:endDate, 'YYYY-MM-DD')
          AND s.user_id = :userId
      `;
    }
    
    const binds = { startDate, endDate, userId };
    
    if (hasGSTColumns && invoiceType && invoiceType !== 'ALL') {
      query += ` AND s.invoice_type = :invoiceType`;
      binds.invoiceType = invoiceType;
    }
    
    query += ` ORDER BY s.invoice_date, s.invoice_number`;
    
    const result = await connection.execute(
      query,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    const invoices = result.rows || [];
    
    // Categorize invoices
    const gstr1 = {
      b2b: [],
      b2cl: [],
      b2cs: [],
      exp: [],
      cdnr: []
    };
    
    for (const inv of invoices) {
      const invoiceData = {
        ...inv,
        CUSTOMER_GSTIN: inv.CUSTOMER_GSTIN || '',
        CUSTOMER_STATE: inv.CUSTOMER_STATE || inv.POS_STATE_CODE
      };
      
      switch (inv.INVOICE_TYPE) {
        case 'B2B':
          gstr1.b2b.push(invoiceData);
          break;
        case 'B2CL':
          gstr1.b2cl.push(invoiceData);
          break;
        case 'B2CS':
          gstr1.b2cs.push(invoiceData);
          break;
        case 'EXP':
          gstr1.exp.push(invoiceData);
          break;
        case 'CDNR':
          gstr1.cdnr.push(invoiceData);
          break;
      }
    }
    
    return {
      success: true,
      period: `${startDate} to ${endDate}`,
      hasGSTColumns,
      warning: hasGSTColumns ? null : 'GST columns not found in database. Please run schema_gst_updates.sql to enable full GST functionality. All invoices defaulting to B2B with zero tax values.',
      summary: {
        totalInvoices: invoices.length,
        b2bCount: gstr1.b2b.length,
        b2clCount: gstr1.b2cl.length,
        b2csCount: gstr1.b2cs.length,
        expCount: gstr1.exp.length,
        cdnrCount: gstr1.cdnr.length
      },
      data: gstr1
    };
  } finally {
    if (connection) await connection.close();
  }
};

/**
 * Generate GSTR-3B Summary
 * @param {Object} params - Query parameters
 * @returns {Object} - GSTR-3B calculations
 */
export const generateGSTR3B = async (params) => {
  const { startDate, endDate, userId } = params;
  const connection = await getConnection();
  
  try {
    // Check if GST columns exist
    let hasGSTColumns = true;
    try {
      await connection.execute(
        `SELECT invoice_type FROM sales WHERE ROWNUM = 1`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
    } catch (colError) {
      hasGSTColumns = false;
    }

    let outwardSupplies, interStateSupplies, itcAvailable, itcRCM, rcmLiability;

    if (hasGSTColumns) {
      // 3.1 Tax on outward supplies
      try {
        outwardSupplies = await connection.execute(
          `SELECT 
            SUM(CASE WHEN invoice_type = 'B2B' THEN total_taxable_value ELSE 0 END) as b2b_value,
            SUM(CASE WHEN invoice_type IN ('B2CL', 'B2CS') THEN total_taxable_value ELSE 0 END) as b2c_value,
            SUM(CASE WHEN invoice_type = 'EXP' THEN total_taxable_value ELSE 0 END) as exp_value,
            SUM(total_cgst) as total_cgst,
            SUM(total_sgst) as total_sgst,
            SUM(total_igst) as total_igst
          FROM sales
          WHERE invoice_date BETWEEN TO_DATE(:startDate, 'YYYY-MM-DD') 
            AND TO_DATE(:endDate, 'YYYY-MM-DD')
            AND NVL(is_active, 1) = 1
            AND user_id = :userId`,
          { startDate, endDate, userId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
      } catch (err) {
        console.error('Error in outwardSupplies query:', err.message);
        outwardSupplies = { rows: [{}] };
      }
      
      // 3.2 Inter-state supplies
      try {
        interStateSupplies = await connection.execute(
          `SELECT 
            SUM(total_taxable_value) as interstate_value,
            SUM(total_igst) as interstate_igst
          FROM sales
          WHERE invoice_date BETWEEN TO_DATE(:startDate, 'YYYY-MM-DD') 
            AND TO_DATE(:endDate, 'YYYY-MM-DD')
            AND NVL(is_active, 1) = 1
            AND user_id = :userId
            AND pos_state_code != (SELECT NVL(MAX(setting_value), '00') FROM settings WHERE setting_key = 'business_state' AND user_id = :userId)`,
          { startDate, endDate, userId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
      } catch (err) {
        console.error('Error in interStateSupplies query:', err.message);
        interStateSupplies = { rows: [{}] };
      }
      
      // 4. ITC Available
      try {
        itcAvailable = await connection.execute(
          `SELECT 
            SUM(CASE WHEN is_reverse_charge = 0 THEN total_cgst ELSE 0 END) as itc_cgst,
            SUM(CASE WHEN is_reverse_charge = 0 THEN total_sgst ELSE 0 END) as itc_sgst,
            SUM(CASE WHEN is_reverse_charge = 0 THEN total_igst ELSE 0 END) as itc_igst
          FROM purchases
          WHERE invoice_date BETWEEN TO_DATE(:startDate, 'YYYY-MM-DD') 
            AND TO_DATE(:endDate, 'YYYY-MM-DD')
            AND NVL(is_active, 1) = 1
            AND user_id = :userId`,
          { startDate, endDate, userId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
      } catch (err) {
        console.error('Error in itcAvailable query:', err.message);
        itcAvailable = { rows: [{}] };
      }
      
      // 4A. ITC on RCM
      try {
        itcRCM = await connection.execute(
          `SELECT 
            SUM(total_cgst) as rcm_cgst,
            SUM(total_sgst) as rcm_sgst,
            SUM(total_igst) as rcm_igst
          FROM purchases
          WHERE invoice_date BETWEEN TO_DATE(:startDate, 'YYYY-MM-DD') 
            AND TO_DATE(:endDate, 'YYYY-MM-DD')
            AND NVL(is_active, 1) = 1
            AND is_reverse_charge = 1
            AND user_id = :userId`,
          { startDate, endDate, userId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
      } catch (err) {
        console.error('Error in itcRCM query:', err.message);
        itcRCM = { rows: [{}] };
      }
      
      // 3.1.1 RCM Liability
      try {
        rcmLiability = await connection.execute(
          `SELECT 
            SUM(total_cgst) as liability_cgst,
            SUM(total_sgst) as liability_sgst,
            SUM(total_igst) as liability_igst
          FROM expenses
          WHERE invoice_date BETWEEN TO_DATE(:startDate, 'YYYY-MM-DD') 
            AND TO_DATE(:endDate, 'YYYY-MM-DD')
            AND NVL(is_active, 1) = 1
            AND is_reverse_charge = 1
            AND user_id = :userId`,
          { startDate, endDate, userId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
      } catch (err) {
        console.error('Error in rcmLiability query (expenses table):', err.message);
        rcmLiability = { rows: [{}] };
      }
    } else {
      // Return empty data if GST columns don't exist
      outwardSupplies = { rows: [{}] };
      interStateSupplies = { rows: [{}] };
      itcAvailable = { rows: [{}] };
      itcRCM = { rows: [{}] };
      rcmLiability = { rows: [{}] };
    }
    
    const outward = outwardSupplies.rows[0] || {};
    const interstate = interStateSupplies.rows[0] || {};
    const itc = itcAvailable.rows[0] || {};
    const rcm = itcRCM.rows[0] || {};
    const liability = rcmLiability.rows[0] || {};
    
    // Calculate net tax payable
    const totalTaxPayable = 
      (parseFloat(outward.TOTAL_CGST) || 0) +
      (parseFloat(outward.TOTAL_SGST) || 0) +
      (parseFloat(outward.TOTAL_IGST) || 0) +
      (parseFloat(liability.LIABILITY_CGST) || 0) +
      (parseFloat(liability.LIABILITY_SGST) || 0) +
      (parseFloat(liability.LIABILITY_IGST) || 0);
    
    const totalITC = 
      (parseFloat(itc.ITC_CGST) || 0) +
      (parseFloat(itc.ITC_SGST) || 0) +
      (parseFloat(itc.ITC_IGST) || 0) +
      (parseFloat(rcm.RCM_CGST) || 0) +
      (parseFloat(rcm.RCM_SGST) || 0) +
      (parseFloat(rcm.RCM_IGST) || 0);
    
    const netTaxPayable = totalTaxPayable - totalITC;
    
    return {
      success: true,
      period: `${startDate} to ${endDate}`,
      data: {
        // 3.1 Tax on outward supplies
        outwardSupplies: {
          b2b: parseFloat(outward.B2B_VALUE) || 0,
          b2c: parseFloat(outward.B2C_VALUE) || 0,
          export: parseFloat(outward.EXP_VALUE) || 0,
          cgst: parseFloat(outward.TOTAL_CGST) || 0,
          sgst: parseFloat(outward.TOTAL_SGST) || 0,
          igst: parseFloat(outward.TOTAL_IGST) || 0
        },
        // 3.2 Inter-state supplies
        interStateSupplies: {
          value: parseFloat(interstate.INTERSTATE_VALUE) || 0,
          igst: parseFloat(interstate.INTERSTATE_IGST) || 0
        },
        // 4. ITC Available
        itcAvailable: {
          cgst: parseFloat(itc.ITC_CGST) || 0,
          sgst: parseFloat(itc.ITC_SGST) || 0,
          igst: parseFloat(itc.ITC_IGST) || 0
        },
        // 4A. ITC on RCM
        itcRCM: {
          cgst: parseFloat(rcm.RCM_CGST) || 0,
          sgst: parseFloat(rcm.RCM_SGST) || 0,
          igst: parseFloat(rcm.RCM_IGST) || 0
        },
        // 3.1.1 RCM Liability
        rcmLiability: {
          cgst: parseFloat(liability.LIABILITY_CGST) || 0,
          sgst: parseFloat(liability.LIABILITY_SGST) || 0,
          igst: parseFloat(liability.LIABILITY_IGST) || 0
        },
        // Net Tax Payable
        netTaxPayable: {
          total: netTaxPayable,
          cgst: (parseFloat(outward.TOTAL_CGST) || 0) + (parseFloat(liability.LIABILITY_CGST) || 0) - (parseFloat(itc.ITC_CGST) || 0) - (parseFloat(rcm.RCM_CGST) || 0),
          sgst: (parseFloat(outward.TOTAL_SGST) || 0) + (parseFloat(liability.LIABILITY_SGST) || 0) - (parseFloat(itc.ITC_SGST) || 0) - (parseFloat(rcm.RCM_SGST) || 0),
          igst: (parseFloat(outward.TOTAL_IGST) || 0) + (parseFloat(liability.LIABILITY_IGST) || 0) - (parseFloat(itc.ITC_IGST) || 0) - (parseFloat(rcm.RCM_IGST) || 0)
        }
      }
    };
  } finally {
    if (connection) await connection.close();
  }
};

/**
 * Generate HSN Summary (Table 12 of GSTR-1)
 * @param {Object} params - Query parameters
 * @returns {Object} - HSN-wise summary
 */
export const generateHSNSummary = async (params) => {
  const { startDate, endDate, userId } = params;
  const connection = await getConnection();
  
  try {
    // Check if GST columns exist
    let hasGSTColumns = true;
    try {
      await connection.execute(
        `SELECT taxable_amount FROM sale_items WHERE ROWNUM = 1`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
    } catch (colError) {
      hasGSTColumns = false;
    }

    let result;
    if (hasGSTColumns) {
      result = await connection.execute(
        `SELECT 
          p.hsn_code,
          SUM(si.quantity) as total_quantity,
          SUM(si.taxable_amount) as total_taxable_value,
          SUM(si.cgst_amount) as total_cgst,
          SUM(si.sgst_amount) as total_sgst,
          SUM(si.igst_amount) as total_igst,
          p.gst_rate
        FROM sale_items si
        JOIN products p ON si.product_id = p.product_id AND p.user_id = si.user_id
        JOIN sales s ON si.sale_id = s.sale_id AND s.user_id = si.user_id
        WHERE s.invoice_date BETWEEN TO_DATE(:startDate, 'YYYY-MM-DD') 
          AND TO_DATE(:endDate, 'YYYY-MM-DD')
          AND NVL(s.is_active, 1) = 1
          AND p.hsn_code IS NOT NULL
          AND si.user_id = :userId
        GROUP BY p.hsn_code, p.gst_rate
        ORDER BY p.hsn_code`,
        { startDate, endDate, userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
    } else {
      // Return empty data if GST columns don't exist
      return {
        success: true,
        period: `${startDate} to ${endDate}`,
        count: 0,
        data: [],
        totals: {
          totalValue: 0,
          taxableValue: 0,
          integratedTax: 0,
          centralTax: 0,
          stateUtTax: 0,
          cess: 0
        }
      };
    }
    
    const hsnData = (result.rows || []).map(row => ({
      hsnCode: row.HSN_CODE,
      description: '', // Can be fetched from HSN master if available
      uqc: 'NOS', // Unit Quantity Code
      totalQuantity: parseFloat(row.TOTAL_QUANTITY) || 0,
      totalValue: parseFloat(row.TOTAL_TAXABLE_VALUE) || 0,
      taxableValue: parseFloat(row.TOTAL_TAXABLE_VALUE) || 0,
      integratedTax: parseFloat(row.TOTAL_IGST) || 0,
      centralTax: parseFloat(row.TOTAL_CGST) || 0,
      stateUtTax: parseFloat(row.TOTAL_SGST) || 0,
      cess: 0 // Cess not implemented yet
    }));
    
    // Calculate totals
    const totals = hsnData.reduce((acc, item) => ({
      totalValue: acc.totalValue + item.totalValue,
      taxableValue: acc.taxableValue + item.taxableValue,
      integratedTax: acc.integratedTax + item.integratedTax,
      centralTax: acc.centralTax + item.centralTax,
      stateUtTax: acc.stateUtTax + item.stateUtTax,
      cess: acc.cess + item.cess
    }), {
      totalValue: 0,
      taxableValue: 0,
      integratedTax: 0,
      centralTax: 0,
      stateUtTax: 0,
      cess: 0
    });
    
    return {
      success: true,
      period: `${startDate} to ${endDate}`,
      count: hsnData.length,
      data: hsnData,
      totals
    };
  } finally {
    if (connection) await connection.close();
  }
};

/**
 * Generate Credit/Debit Notes Register
 * @param {Object} params - Query parameters
 * @returns {Object} - CDNR data
 */
export const generateCDNR = async (params) => {
  const { startDate, endDate, noteType, userId } = params;
  const connection = await getConnection();
  
  try {
    // 1. Fetch Sales Returns (Credit Notes for customers)
    let salesNotesQuery = `
      SELECT 
        'credit' as note_type,
        sr.return_number as note_number,
        sr.return_date as note_date,
        s.invoice_number as original_invoice_number,
        c.customer_name as party_name,
        c.gst_number as party_gstin,
        agg.taxable_value,
        agg.cgst_amount,
        agg.sgst_amount,
        agg.igst_amount,
        sr.total_refund as total_amount,
        sr.notes as reason
      FROM sale_returns sr
      JOIN sales s ON sr.sale_id = s.sale_id AND s.user_id = sr.user_id
      LEFT JOIN customers c ON s.customer_id = c.customer_id AND c.user_id = s.user_id
      LEFT JOIN (
        SELECT 
          return_id,
          SUM(taxable_amount) as taxable_value,
          SUM(cgst_amount) as cgst_amount,
          SUM(sgst_amount) as sgst_amount,
          SUM(igst_amount) as igst_amount
        FROM sale_return_items
        WHERE user_id = :userId
        GROUP BY return_id
      ) agg ON sr.return_id = agg.return_id
      WHERE sr.return_date BETWEEN TO_DATE(:startDate, 'YYYY-MM-DD') 
        AND TO_DATE(:endDate, 'YYYY-MM-DD')
        AND sr.user_id = :userId
    `;

    // 2. Fetch Purchase Returns (Debit Notes for suppliers)
    let purchaseNotesQuery = `
      SELECT 
        'debit' as note_type,
        pr.return_number as note_number,
        pr.return_date as note_date,
        p.invoice_number as original_invoice_number,
        sup.supplier_name as party_name,
        sup.gst_number as party_gstin,
        agg.taxable_value,
        agg.cgst_amount,
        agg.sgst_amount,
        agg.igst_amount,
        pr.total_refund as total_amount,
        pr.notes as reason
      FROM purchase_returns pr
      JOIN purchases p ON pr.purchase_id = p.purchase_id AND p.user_id = pr.user_id
      LEFT JOIN suppliers sup ON p.supplier_id = sup.supplier_id AND sup.user_id = p.user_id
      LEFT JOIN (
        SELECT 
          return_id,
          SUM(refund_amount) as taxable_value,
          SUM(CASE WHEN igst_amount > 0 THEN 0 ELSE tax_amount/2 END) as cgst_amount,
          SUM(CASE WHEN igst_amount > 0 THEN 0 ELSE tax_amount/2 END) as sgst_amount,
          SUM(igst_amount) as igst_amount
        FROM (
          SELECT 
            pri.return_id,
            pri.refund_amount,
            pri.tax_amount,
            -- Determine if it's IGST from the original purchase via join
            NVL(pi.igst_amount, 0) as igst_ref,
            CASE WHEN NVL(pi.igst_amount, 0) > 0 THEN pri.tax_amount ELSE 0 END as igst_amount
          FROM purchase_return_items pri
          JOIN purchase_returns pr_inner ON pri.return_id = pr_inner.return_id
          JOIN purchase_items pi ON pr_inner.purchase_id = pi.purchase_id AND pri.product_id = pi.product_id
          WHERE pri.user_id = :userId
        )
        GROUP BY return_id
      ) agg ON pr.return_id = agg.return_id
      WHERE pr.return_date BETWEEN TO_DATE(:startDate, 'YYYY-MM-DD') 
        AND TO_DATE(:endDate, 'YYYY-MM-DD')
        AND pr.user_id = :userId
    `;

    let finalQuery = "";
    if (!noteType || noteType === 'credit') {
      finalQuery += salesNotesQuery;
    }
    if (!noteType) {
      finalQuery += " UNION ALL ";
    }
    if (!noteType || noteType === 'debit') {
      finalQuery += purchaseNotesQuery;
    }
    
    finalQuery += " ORDER BY note_date DESC, note_number DESC";
    
    const result = await connection.execute(
      finalQuery,
      { startDate, endDate, userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    const notes = (result.rows || []).map(row => ({
      noteType: row.NOTE_TYPE,
      noteNumber: row.NOTE_NUMBER,
      noteDate: row.NOTE_DATE,
      originalInvoiceNumber: row.ORIGINAL_INVOICE_NUMBER,
      customerName: row.PARTY_NAME,
      customerGSTIN: row.PARTY_GSTIN,
      taxableValue: parseFloat(row.TAXABLE_VALUE) || 0,
      cgst: parseFloat(row.CGST_AMOUNT) || 0,
      sgst: parseFloat(row.SGST_AMOUNT) || 0,
      igst: parseFloat(row.IGST_AMOUNT) || 0,
      totalAmount: parseFloat(row.TOTAL_AMOUNT) || 0,
      reason: row.REASON
    }));
    
    const totals = notes.reduce((acc, note) => ({
      taxableValue: acc.taxableValue + note.taxableValue,
      cgst: acc.cgst + note.cgst,
      sgst: acc.sgst + note.sgst,
      igst: acc.igst + note.igst,
      totalAmount: acc.totalAmount + note.totalAmount
    }), {
      taxableValue: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalAmount: 0
    });
    
    return {
      success: true,
      period: `${startDate} to ${endDate}`,
      count: notes.length,
      data: notes,
      totals
    };
  } finally {
    if (connection) await connection.close();
  }
};

/**
 * Generate GSTN-compliant JSON for GSTR-1
 * @param {Object} params - Query parameters
 * @returns {Object} - JSON structure for GST portal
 */
export const generateGSTR1JSON = async (params) => {
  const gstr1 = await generateGSTR1(params);
  const hsnSummary = await generateHSNSummary(params);
  const cdnr = await generateCDNR(params);
  
  const { startDate } = params;
  const fp = getReturnPeriod(startDate); // MMYYYY format
  
  // Build GSTN JSON structure
  const gstnJson = {
    gstin: '', // To be filled from business details
    fp: fp,
    gt: 0, // Gross Turnover
    cur_gt: 0, // Current Gross Turnover
    
    // B2B Invoices
    b2b: gstr1.data.b2b.map(inv => ({
      ctin: inv.CUSTOMER_GSTIN,
      inv: [{
        inum: inv.INVOICE_NUMBER,
        idt: inv.INVOICE_DATE,
        val: inv.TOTAL_INVOICE_VALUE,
        pos: inv.POS_STATE_CODE,
        rchrg: inv.IS_REVERSE_CHARGE === 1 ? 'Y' : 'N',
        inv_typ: 'R', // Regular
        itms: [] // Item details would be fetched separately
      }]
    })),
    
    // B2CL Invoices
    b2cl: gstr1.data.b2cl.map(inv => ({
      pos: inv.POS_STATE_CODE,
      inv: [{
        inum: inv.INVOICE_NUMBER,
        idt: inv.INVOICE_DATE,
        val: inv.TOTAL_INVOICE_VALUE,
        itms: []
      }]
    })),
    
    // B2CS Invoices
    b2cs: gstr1.data.b2cs.map(inv => ({
      sply_ty: inv.POS_STATE_CODE === inv.CUSTOMER_STATE ? 'INTRA' : 'INTER',
      pos: inv.POS_STATE_CODE,
      typ: 'OE', // Others
      txval: inv.TOTAL_TAXABLE_VALUE,
      rt: 18, // GST Rate - should come from items
      camt: inv.TOTAL_CGST,
      samt: inv.TOTAL_SGST,
      iamt: inv.TOTAL_IGST
    })),
    
    // Export Invoices
    exp: gstr1.data.exp.map(inv => ({
      exp_typ: 'WOP', // Without Payment
      inv: [{
        inum: inv.INVOICE_NUMBER,
        idt: inv.INVOICE_DATE,
        val: inv.TOTAL_INVOICE_VALUE,
        sbpcode: '', // Shipping Bill Port Code
        sbnum: '', // Shipping Bill Number
        sbdt: '', // Shipping Bill Date
        itms: []
      }]
    })),
    
    // Credit/Debit Notes
    cdnr: cdnr.data
      .filter(note => note.noteType === 'credit')
      .map(note => ({
        ctin: note.customerGSTIN,
        nt: [{
          ntty: 'C', // Credit Note
          nt_num: note.noteNumber,
          nt_dt: note.noteDate,
          rsn: note.reason,
          p_gst: 'N',
          inum: note.originalInvoiceNumber,
          idt: '', // Original invoice date
          val: note.totalAmount,
          itms: []
        }]
      })),
    
    // HSN Summary
    hsnsum: {
      det: hsnSummary.data.map(hsn => ({
        hsn_sc: hsn.hsnCode,
        desc: hsn.description,
        uqc: hsn.uqc,
        qty: hsn.totalQuantity,
        val: hsn.totalValue,
        txval: hsn.taxableValue,
        iamt: hsn.integratedTax,
        camt: hsn.centralTax,
        samt: hsn.stateUtTax,
        csamt: hsn.cess
      }))
    }
  };
  
  return {
    success: true,
    fp,
    data: gstnJson
  };
};

/**
 * Export data to CSV
 * @param {Array} data - Data to export
 * @param {Array} fields - Field definitions
 * @returns {string} - CSV string
 */
export const exportToCSV = (data, fields) => {
  const parser = new Parser({ fields });
  return parser.parse(data);
};

/**
 * Export data to Excel
 * @param {Array} data - Data to export
 * @param {Array} columns - Column definitions
 * @param {string} sheetName - Sheet name
 * @returns {Buffer} - Excel buffer
 */
export const exportToExcel = async (data, columns, sheetName = 'Sheet1') => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  
  // Add columns
  worksheet.columns = columns.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width || 15
  }));
  
  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  // Add data
  data.forEach(row => {
    worksheet.addRow(row);
  });
  
  // Format numbers
  columns.forEach((col, index) => {
    if (col.type === 'number') {
      const column = worksheet.getColumn(index + 1);
      column.numFmt = '#,##0.00';
    }
  });
  
  return await workbook.xlsx.writeBuffer();
};

export default {
  generateGSTR1,
  generateGSTR3B,
  generateHSNSummary,
  generateCDNR,
  generateGSTR1JSON,
  exportToCSV,
  exportToExcel
};
