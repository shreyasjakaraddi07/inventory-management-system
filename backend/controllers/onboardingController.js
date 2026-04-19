import oracledb from 'oracledb';
import { getConnection } from '../db.js';

/**
 * Complete onboarding - Create/update business profile, tax settings, and invoice settings
 */
export const completeOnboarding = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const {
    // Business Profile
    businessName,
    tradeName,
    gstin,
    pan,
    phone,
    email,
    address,
    city,
    state,
    stateCode,
    pincode,
    logoUrl,
    
    // Tax Settings
    defaultGstRate,
    enableIgst,
    enableRoundOff,
    filingFrequency,
    
    // Invoice Settings
    invoicePrefix,
    purchasePrefix,
    startingNumber,
    showHsn,
    showGstBreakup,
    invoiceTerms
  } = req.body;

  let connection;

  try {
    // Validate required fields
    if (!businessName || !businessName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Business name is required'
      });
    }

    if (!phone || phone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Valid phone number is required'
      });
    }

    // Validate GSTIN format if provided
    if (gstin) {
      // Clean and uppercase the GSTIN
      const cleanGstin = gstin.trim().toUpperCase();
      
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(cleanGstin)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid GSTIN format. Example: 27AABCU9603R1ZX'
        });
      }
      
      // Update the gstin variable with cleaned version
      req.body.gstin = cleanGstin;
    }

    // Validate PAN format if provided
    if (pan) {
      // Clean and uppercase the PAN
      const cleanPan = pan.trim().toUpperCase();
      
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(cleanPan)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid PAN format. Example: AABCU9603R'
        });
      }
      
      // Update the pan variable with cleaned version
      req.body.pan = cleanPan;
    }

    // Get database connection
    connection = await getConnection();

    // Check if business already exists for this user PER USER
    const existingBusiness = await connection.execute(
      `SELECT * FROM businesses WHERE user_id = :userId`,
      { userId },
      { outFormat: oracledb.OBJECT }
    );

    let businessId;

    if (existingBusiness.rows && existingBusiness.rows.length > 0) {
      // Update existing business
      businessId = existingBusiness.rows[0].ID;

      // Update business_profiles
      await connection.execute(
        `UPDATE business_profiles 
         SET business_name = :businessName, 
             trade_name = :tradeName,
             gstin = :gstin, 
             pan = :pan,
             phone = :phone,
             email = :email,
             address = :address,
             city = :city,
             state = :state,
             state_code = :stateCode,
             pincode = :pincode,
             logo_url = :logoUrl,
             is_complete = 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE business_id = :businessId`,
        {
          businessName,
          tradeName: tradeName || null,
          gstin: gstin || null,
          pan: pan || null,
          phone,
          email: email || null,
          address: address || null,
          city: city || null,
          state: state || null,
          stateCode: stateCode || null,
          pincode: pincode || null,
          logoUrl: logoUrl || null,
          businessId
        }
      );
    } else {
      // Create new business PER USER
      const newBusiness = await connection.execute(
        `INSERT INTO businesses (user_id, name) 
         VALUES (:userId, :businessName) 
         RETURNING id INTO :businessId`,
        {
          userId,
          businessName,
          businessId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        }
      );

      businessId = newBusiness.outBinds.businessId;

      // Insert business profile
      await connection.execute(
        `INSERT INTO business_profiles (
          business_id, 
          business_name, 
          trade_name,
          gstin, 
          pan,
          phone,
          email,
          address,
          city,
          state,
          state_code,
          pincode,
          logo_url,
          is_complete
        ) VALUES (
          :businessId,
          :businessName,
          :tradeName,
          :gstin,
          :pan,
          :phone,
          :email,
          :address,
          :city,
          :state,
          :stateCode,
          :pincode,
          :logoUrl,
          1
        )`,
        {
          businessId,
          businessName,
          tradeName: tradeName || null,
          gstin: gstin || null,
          pan: pan || null,
          phone,
          email: email || null,
          address: address || null,
          city: city || null,
          state: state || null,
          stateCode: stateCode || null,
          pincode: pincode || null,
          logoUrl: logoUrl || null
        }
      );
    }

    // Update or insert tax settings
    await connection.execute(
      `MERGE INTO tax_settings t
       USING (SELECT :businessId AS business_id FROM dual) s
       ON (t.business_id = s.business_id)
       WHEN MATCHED THEN
         UPDATE SET 
           default_gst_rate = :defaultGstRate,
           enable_igst = :enableIgst,
           enable_round_off = :enableRoundOff,
           filing_frequency = :filingFrequency,
           updated_at = CURRENT_TIMESTAMP
       WHEN NOT MATCHED THEN
         INSERT (business_id, default_gst_rate, enable_igst, enable_round_off, filing_frequency)
         VALUES (:businessId, :defaultGstRate, :enableIgst, :enableRoundOff, :filingFrequency)`,
      {
        businessId,
        defaultGstRate: defaultGstRate || 18,
        enableIgst: enableIgst ? 1 : 0,
        enableRoundOff: enableRoundOff ? 1 : 0,
        filingFrequency: filingFrequency || 'monthly'
      }
    );

    // Update or insert invoice settings
    await connection.execute(
      `MERGE INTO invoice_settings i
       USING (SELECT :businessId AS business_id FROM dual) s
       ON (i.business_id = s.business_id)
       WHEN MATCHED THEN
         UPDATE SET 
           invoice_prefix = :invoicePrefix,
           purchase_prefix = :purchasePrefix,
           starting_number = :startingNumber,
           show_hsn = :showHsn,
           show_gst_breakup = :showGstBreakup,
           terms_and_conditions = :invoiceTerms,
           updated_at = CURRENT_TIMESTAMP
       WHEN NOT MATCHED THEN
         INSERT (
           business_id, 
           invoice_prefix, 
           purchase_prefix, 
           starting_number,
           show_hsn,
           show_gst_breakup,
           terms_and_conditions
         )
         VALUES (
           :businessId,
           :invoicePrefix,
           :purchasePrefix,
           :startingNumber,
           :showHsn,
           :showGstBreakup,
           :invoiceTerms
         )`,
      {
        businessId,
        invoicePrefix: invoicePrefix || 'INV-',
        purchasePrefix: purchasePrefix || 'PUR-',
        startingNumber: startingNumber || 1,
        showHsn: showHsn ? 1 : 0,
        showGstBreakup: showGstBreakup ? 1 : 0,
        invoiceTerms: invoiceTerms || 'Goods once sold cannot be returned.'
      }
    );

    // Commit the transaction
    await connection.commit();

    res.json({
      success: true,
      message: 'Onboarding completed successfully',
      data: {
        businessId
      }
    });

  } catch (error) {
    console.error('Onboarding error:', error);
    
    // Rollback on error
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError);
      }
    }
    
    // Handle duplicate GSTIN (Oracle error code)
    if (error.errorNum === 1 || error.message.includes('unique constraint')) {
      return res.status(400).json({
        success: false,
        message: 'This GSTIN is already registered with another business'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to complete onboarding',
      error: error.message
    });
  } finally {
    // Release connection
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
  }
};
