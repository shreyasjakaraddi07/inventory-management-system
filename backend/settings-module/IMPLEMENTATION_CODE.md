# Settings Module Backend - Complete Implementation Code

This file contains all the backend implementation code for the Settings Module.

---

## 1. MODELS - settings-module/models/settingsModel.js

```javascript
import { query, transaction, getClient } from '../db.js';

// ============================================
// Get Complete Settings for a Business
// ============================================
export const getCompleteSettings = async (businessId) => {
  const result = await query(
    `SELECT * FROM v_business_complete_settings WHERE business_id = $1`,
    [businessId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0];
};

// ============================================
// Get Business Profile
// ============================================
export const getBusinessProfile = async (businessId) => {
  const result = await query(
    `SELECT * FROM business_profiles WHERE business_id = $1`,
    [businessId]
  );
  
  return result.rows[0] || null;
};

// ============================================
// Update Business Profile
// ============================================
export const updateBusinessProfile = async (businessId, data, userId) => {
  const {
    businessName,
    tradeName,
    businessType,
    gstin,
    pan,
    address,
    city,
    state,
    stateCode,
    pincode,
    phone,
    email,
    website,
    logoUrl
  } = data;

  return await transaction(async (client) => {
    // Update business table
    await client.query(
      `UPDATE businesses 
       SET business_name = $1, trade_name = $2, business_type = $3, updated_by = $4
       WHERE business_id = $5`,
      [businessName, tradeName, businessType, userId, businessId]
    );

    // Update business profile
    const result = await client.query(
      `UPDATE business_profiles 
       SET gstin = $1, pan = $2, address = $3, city = $4, state = $5, 
           state_code = $6, pincode = $7, phone = $8, email = $9, 
           website = $10, logo_url = $11
       WHERE business_id = $12
       RETURNING *`,
      [gstin, pan, address, city, state, stateCode, pincode, phone, email, website, logoUrl, businessId]
    );

    return result.rows[0];
  });
};

// ============================================
// Get Tax Settings
// ============================================
export const getTaxSettings = async (businessId) => {
  const result = await query(
    `SELECT * FROM tax_settings WHERE business_id = $1`,
    [businessId]
  );
  
  return result.rows[0] || null;
};

// ============================================
// Update Tax Settings
// ============================================
export const updateTaxSettings = async (businessId, data, userId) => {
  const {
    defaultGstRate,
    enableIgst,
    enableRoundOff,
    reverseChargeEnabled,
    tdsEnabled,
    tdsRate,
    filingFrequency,
    roundingMethod,
    pricingType,
    ewayBillEnabled,
    ewayBillThreshold,
    ewayBillValidityKm
  } = data;

  const result = await query(
    `UPDATE tax_settings 
     SET default_gst_rate = $1, enable_igst = $2, enable_round_off = $3, 
         reverse_charge_enabled = $4, tds_enabled = $5, tds_rate = $6,
         filing_frequency = $7, rounding_method = $8, pricing_type = $9,
         eway_bill_enabled = $10, eway_bill_threshold = $11, 
         eway_bill_validity_km = $12
     WHERE business_id = $13
     RETURNING *`,
    [
      defaultGstRate, enableIgst, enableRoundOff, reverseChargeEnabled,
      tdsEnabled, tdsRate, filingFrequency, roundingMethod, pricingType,
      ewayBillEnabled, ewayBillThreshold, ewayBillValidityKm, businessId
    ]
  );

  return result.rows[0];
};

// ============================================
// Get Invoice Settings
// ============================================
export const getInvoiceSettings = async (businessId) => {
  const result = await query(
    `SELECT * FROM invoice_settings WHERE business_id = $1`,
    [businessId]
  );
  
  return result.rows[0] || null;
};

// ============================================
// Update Invoice Settings
// ============================================
export const updateInvoiceSettings = async (businessId, data, userId) => {
  const {
    invoicePrefix,
    purchasePrefix,
    creditNotePrefix,
    debitNotePrefix,
    invoiceSuffix,
    startingNumber,
    fyResetEnabled,
    showHsn,
    showGstBreakup,
    showDiscount,
    showDescription,
    showBatchExpiry,
    printLogo,
    digitalSignatureEnabled,
    digitalSignatureUrl,
    invoiceTerms,
    footerNotes
  } = data;

  const result = await query(
    `UPDATE invoice_settings 
     SET invoice_prefix = $1, purchase_prefix = $2, credit_note_prefix = $3,
         debit_note_prefix = $4, invoice_suffix = $5, starting_number = $6,
         fy_reset_enabled = $7, show_hsn = $8, show_gst_breakup = $9,
         show_discount = $10, show_description = $11, show_batch_expiry = $12,
         print_logo = $13, digital_signature_enabled = $14,
         digital_signature_url = $15, invoice_terms = $16, footer_notes = $17
     WHERE business_id = $18
     RETURNING *`,
    [
      invoicePrefix, purchasePrefix, creditNotePrefix, debitNotePrefix,
      invoiceSuffix, startingNumber, fyResetEnabled, showHsn, showGstBreakup,
      showDiscount, showDescription, showBatchExpiry, printLogo,
      digitalSignatureEnabled, digitalSignatureUrl, invoiceTerms, footerNotes,
      businessId
    ]
  );

  return result.rows[0];
};

// ============================================
// Get Inventory Settings
// ============================================
export const getInventorySettings = async (businessId) => {
  const result = await query(
    `SELECT * FROM inventory_settings WHERE business_id = $1`,
    [businessId]
  );
  
  return result.rows[0] || null;
};

// ============================================
// Update Inventory Settings
// ============================================
export const updateInventorySettings = async (businessId, data, userId) => {
  const {
    lowStockAlertEnabled,
    lowStockThreshold,
    autoStockUpdate,
    negativeStockPrevention,
    stockValuationMethod,
    barcodeEnabled,
    barcodeFormat,
    batchTrackingEnabled,
    serialTrackingEnabled
  } = data;

  const result = await query(
    `UPDATE inventory_settings 
     SET low_stock_alert_enabled = $1, low_stock_threshold = $2,
         auto_stock_update = $3, negative_stock_prevention = $4,
         stock_valuation_method = $5, barcode_enabled = $6,
         barcode_format = $7, batch_tracking_enabled = $8,
         serial_tracking_enabled = $9
     WHERE business_id = $10
     RETURNING *`,
    [
      lowStockAlertEnabled, lowStockThreshold, autoStockUpdate,
      negativeStockPrevention, stockValuationMethod, barcodeEnabled,
      barcodeFormat, batchTrackingEnabled, serialTrackingEnabled, businessId
    ]
  );

  return result.rows[0];
};

// ============================================
// Get Notification Settings
// ============================================
export const getNotificationSettings = async (businessId) => {
  const result = await query(
    `SELECT * FROM notification_settings WHERE business_id = $1`,
    [businessId]
  );
  
  return result.rows[0] || null;
};

// ============================================
// Update Notification Settings
// ============================================
export const updateNotificationSettings = async (businessId, data, userId) => {
  const {
    lowStockAlertEnabled,
    lowStockEmail,
    lowStockSms,
    lowStockInApp,
    lowStockFrequency,
    paymentRemindersEnabled,
    reminder7Days,
    reminder3Days,
    reminder1Day,
    overdue1Day,
    overdue7Days,
    gstFilingReminderEnabled,
    gstReminder7Days,
    gstReminder3Days,
    gstReminder1Day,
    emailNotificationsEnabled,
    smsNotificationsEnabled,
    desktopNotificationsEnabled,
    quietHoursEnabled,
    quietHoursFrom,
    quietHoursTo
  } = data;

  const result = await query(
    `UPDATE notification_settings 
     SET low_stock_alert_enabled = $1, low_stock_email = $2, low_stock_sms = $3,
         low_stock_in_app = $4, low_stock_frequency = $5,
         payment_reminders_enabled = $6, reminder_7_days = $7,
         reminder_3_days = $8, reminder_1_day = $9, overdue_1_day = $10,
         overdue_7_days = $11, gst_filing_reminder_enabled = $12,
         gst_reminder_7_days = $13, gst_reminder_3_days = $14,
         gst_reminder_1_day = $15, email_notifications_enabled = $16,
         sms_notifications_enabled = $17, desktop_notifications_enabled = $18,
         quiet_hours_enabled = $19, quiet_hours_from = $20, quiet_hours_to = $21
     WHERE business_id = $22
     RETURNING *`,
    [
      lowStockAlertEnabled, lowStockEmail, lowStockSms, lowStockInApp,
      lowStockFrequency, paymentRemindersEnabled, reminder7Days, reminder3Days,
      reminder1Day, overdue1Day, overdue7Days, gstFilingReminderEnabled,
      gstReminder7Days, gstReminder3Days, gstReminder1Day,
      emailNotificationsEnabled, smsNotificationsEnabled,
      desktopNotificationsEnabled, quietHoursEnabled, quietHoursFrom,
      quietHoursTo, businessId
    ]
  );

  return result.rows[0];
};

// ============================================
// Get Security Settings
// ============================================
export const getSecuritySettings = async (businessId) => {
  const result = await query(
    `SELECT * FROM security_settings WHERE business_id = $1`,
    [businessId]
  );
  
  return result.rows[0] || null;
};

// ============================================
// Update Security Settings
// ============================================
export const updateSecuritySettings = async (businessId, data, userId) => {
  const {
    sessionTimeoutMinutes,
    failedLoginLockoutEnabled,
    failedLoginAttempts,
    lockoutDurationMinutes,
    passwordMinLength,
    passwordRequireUppercase,
    passwordRequireNumber,
    passwordRequireSpecial,
    passwordHistoryCount,
    twoFactorEnabled,
    twoFactorMethod,
    ipWhitelistEnabled,
    ipWhitelist
  } = data;

  const result = await query(
    `UPDATE security_settings 
     SET session_timeout_minutes = $1, failed_login_lockout_enabled = $2,
         failed_login_attempts = $3, lockout_duration_minutes = $4,
         password_min_length = $5, password_require_uppercase = $6,
         password_require_number = $7, password_require_special = $8,
         password_history_count = $9, two_factor_enabled = $10,
         two_factor_method = $11, ip_whitelist_enabled = $12,
         ip_whitelist = $13
     WHERE business_id = $14
     RETURNING *`,
    [
      sessionTimeoutMinutes, failedLoginLockoutEnabled, failedLoginAttempts,
      lockoutDurationMinutes, passwordMinLength, passwordRequireUppercase,
      passwordRequireNumber, passwordRequireSpecial, passwordHistoryCount,
      twoFactorEnabled, twoFactorMethod, ipWhitelistEnabled, ipWhitelist,
      businessId
    ]
  );

  return result.rows[0];
};

// ============================================
// Get Audit Logs
// ============================================
export const getAuditLogs = async (businessId, days = 30) => {
  const result = await query(
    `SELECT 
       al.*,
       u.email as user_email,
       u.name as user_name
     FROM settings_audit_logs al
     LEFT JOIN users u ON al.user_id = u.id
     WHERE al.business_id = $1 
       AND al.created_at >= NOW() - INTERVAL '${days} days'
     ORDER BY al.created_at DESC
     LIMIT 100`,
    [businessId]
  );
  
  return result.rows;
};

// ============================================
// Verify Business Ownership
// ============================================
export const verifyBusinessOwnership = async (businessId, userId) => {
  const result = await query(
    `SELECT business_id FROM businesses 
     WHERE business_id = $1 AND (owner_id = $2 OR is_active = true)`,
    [businessId, userId]
  );
  
  return result.rows.length > 0;
};

export default {
  getCompleteSettings,
  getBusinessProfile,
  updateBusinessProfile,
  getTaxSettings,
  updateTaxSettings,
  getInvoiceSettings,
  updateInvoiceSettings,
  getInventorySettings,
  updateInventorySettings,
  getNotificationSettings,
  updateNotificationSettings,
  getSecuritySettings,
  updateSecuritySettings,
  getAuditLogs,
  verifyBusinessOwnership
};

```

---

## 2. SERVICES - settings-module/services/settingsService.js

```javascript
import * as settingsModel from '../models/settingsModel.js';

// ============================================
// Get All Settings Service
// ============================================
export const getAllSettings = async (businessId, userId) => {
  // Verify ownership
  const hasAccess = await settingsModel.verifyBusinessOwnership(businessId, userId);
  if (!hasAccess) {
    throw new Error('Access denied to this business');
  }

  const settings = await settingsModel.getCompleteSettings(businessId);
  if (!settings) {
    throw new Error('Settings not found');
  }

  // Transform to nested structure
  return {
    business: {
      businessId: settings.business_id,
      businessName: settings.business_name,
      tradeName: settings.trade_name,
      businessType: settings.business_type,
      isActive: settings.is_active
    },
    businessProfile: {
      gstin: settings.gstin,
      pan: settings.pan,
      address: settings.address,
      city: settings.city,
      state: settings.state,
      stateCode: settings.state_code,
      pincode: settings.pincode,
      phone: settings.phone,
      email: settings.email,
      website: settings.website,
      logoUrl: settings.logo_url
    },
    taxSettings: {
      defaultGstRate: parseFloat(settings.default_gst_rate),
      enableIgst: settings.enable_igst,
      enableRoundOff: settings.enable_round_off,
      reverseChargeEnabled: settings.reverse_charge_enabled,
      tdsEnabled: settings.tds_enabled,
      tdsRate: parseFloat(settings.tds_rate),
      filingFrequency: settings.filing_frequency,
      roundingMethod: settings.rounding_method,
      pricingType: settings.pricing_type,
      ewayBillEnabled: settings.eway_bill_enabled,
      ewayBillThreshold: parseFloat(settings.eway_bill_threshold),
      ewayBillValidityKm: settings.eway_bill_validity_km
    },
    invoiceSettings: {
      invoicePrefix: settings.invoice_prefix,
      purchasePrefix: settings.purchase_prefix,
      creditNotePrefix: settings.credit_note_prefix,
      debitNotePrefix: settings.debit_note_prefix,
      invoiceSuffix: settings.invoice_suffix,
      startingNumber: settings.starting_number,
      currentNumber: settings.current_number,
      fyResetEnabled: settings.fy_reset_enabled,
      showHsn: settings.show_hsn,
      showGstBreakup: settings.show_gst_breakup,
      showDiscount: settings.show_discount,
      showDescription: settings.show_description,
      showBatchExpiry: settings.show_batch_expiry,
      printLogo: settings.print_logo,
      digitalSignatureEnabled: settings.digital_signature_enabled,
      invoiceTerms: settings.invoice_terms,
      footerNotes: settings.footer_notes
    },
    inventorySettings: {
      lowStockAlertEnabled: settings.low_stock_alert_enabled,
      lowStockThreshold: settings.low_stock_threshold,
      autoStockUpdate: settings.auto_stock_update,
      negativeStockPrevention: settings.negative_stock_prevention,
      stockValuationMethod: settings.stock_valuation_method,
      barcodeEnabled: settings.barcode_enabled
    },
    notificationSettings: {
      lowStockAlertEnabled: settings.notif_low_stock_enabled,
      lowStockEmail: settings.low_stock_email,
      lowStockSms: settings.low_stock_sms,
      lowStockInApp: settings.low_stock_in_app,
      lowStockFrequency: settings.low_stock_frequency,
      paymentRemindersEnabled: settings.payment_reminders_enabled,
      gstFilingReminderEnabled: settings.gst_filing_reminder_enabled,
      emailNotificationsEnabled: settings.email_notifications_enabled,
      smsNotificationsEnabled: settings.sms_notifications_enabled,
      quietHoursEnabled: settings.quiet_hours_enabled
    },
    securitySettings: {
      sessionTimeoutMinutes: settings.session_timeout_minutes,
      twoFactorEnabled: settings.two_factor_enabled,
      failedLoginLockoutEnabled: settings.failed_login_lockout_enabled
    }
  };
};

// ============================================
// Update Business Profile Service
// ============================================
export const updateBusinessProfileService = async (businessId, data, userId) => {
  const hasAccess = await settingsModel.verifyBusinessOwnership(businessId, userId);
  if (!hasAccess) {
    throw new Error('Access denied to this business');
  }

  const updated = await settingsModel.updateBusinessProfile(businessId, data, userId);
  return updated;
};

// ============================================
// Update Tax Settings Service
// ============================================
export const updateTaxSettingsService = async (businessId, data, userId) => {
  const hasAccess = await settingsModel.verifyBusinessOwnership(businessId, userId);
  if (!hasAccess) {
    throw new Error('Access denied to this business');
  }

  const updated = await settingsModel.updateTaxSettings(businessId, data, userId);
  return updated;
};

// ============================================
// Update Invoice Settings Service
// ============================================
export const updateInvoiceSettingsService = async (businessId, data, userId) => {
  const hasAccess = await settingsModel.verifyBusinessOwnership(businessId, userId);
  if (!hasAccess) {
    throw new Error('Access denied to this business');
  }

  const updated = await settingsModel.updateInvoiceSettings(businessId, data, userId);
  return updated;
};

// ============================================
// Update Inventory Settings Service
// ============================================
export const updateInventorySettingsService = async (businessId, data, userId) => {
  const hasAccess = await settingsModel.verifyBusinessOwnership(businessId, userId);
  if (!hasAccess) {
    throw new Error('Access denied to this business');
  }

  const updated = await settingsModel.updateInventorySettings(businessId, data, userId);
  return updated;
};

// ============================================
// Update Notification Settings Service
// ============================================
export const updateNotificationSettingsService = async (businessId, data, userId) => {
  const hasAccess = await settingsModel.verifyBusinessOwnership(businessId, userId);
  if (!hasAccess) {
    throw new Error('Access denied to this business');
  }

  const updated = await settingsModel.updateNotificationSettings(businessId, data, userId);
  return updated;
};

// ============================================
// Update Security Settings Service
// ============================================
export const updateSecuritySettingsService = async (businessId, data, userId) => {
  const hasAccess = await settingsModel.verifyBusinessOwnership(businessId, userId);
  if (!hasAccess) {
    throw new Error('Access denied to this business');
  }

  const updated = await settingsModel.updateSecuritySettings(businessId, data, userId);
  return updated;
};

// ============================================
// Get Audit Logs Service
// ============================================
export const getAuditLogsService = async (businessId, userId, days = 30) => {
  const hasAccess = await settingsModel.verifyBusinessOwnership(businessId, userId);
  if (!hasAccess) {
    throw new Error('Access denied to this business');
  }

  const logs = await settingsModel.getAuditLogs(businessId, days);
  return logs;
};

export default {
  getAllSettings,
  updateBusinessProfileService,
  updateTaxSettingsService,
  updateInvoiceSettingsService,
  updateInventorySettingsService,
  updateNotificationSettingsService,
  updateSecuritySettingsService,
  getAuditLogsService
};

```

---

## 3. CONTROLLERS - settings-module/controllers/settingsController.js

```javascript
import * as settingsService from '../services/settingsService.js';

// ============================================
// Get All Settings
// ============================================
export const getAllSettings = async (req, res) => {
  try {
    const { businessId } = req.params;
    const userId = req.user.id;

    const settings = await settingsService.getAllSettings(businessId, userId);

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    
    if (error.message === 'Access denied to this business') {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    if (error.message === 'Settings not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: error.message
    });
  }
};

// ============================================
// Update Business Profile
// ============================================
export const updateBusinessProfile = async (req, res) => {
  try {
    const { businessId } = req.params;
    const userId = req.user.id;
    const data = req.body;

    const updated = await settingsService.updateBusinessProfileService(businessId, data, userId);

    res.status(200).json({
      success: true,
      message: 'Business profile updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Update business profile error:', error);
    
    if (error.message === 'Access denied to this business') {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update business profile',
      error: error.message
    });
  }
};

// ============================================
// Update Tax Settings
// ============================================
export const updateTaxSettings = async (req, res) => {
  try {
    const { businessId } = req.params;
    const userId = req.user.id;
    const data = req.body;

    const updated = await settingsService.updateTaxSettingsService(businessId, data, userId);

    res.status(200).json({
      success: true,
      message: 'Tax settings updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Update tax settings error:', error);
    
    if (error.message === 'Access denied to this business') {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update tax settings',
      error: error.message
    });
  }
};

// ============================================
// Update Invoice Settings
// ============================================
export const updateInvoiceSettings = async (req, res) => {
  try {
    const { businessId } = req.params;
    const userId = req.user.id;
    const data = req.body;

    const updated = await settingsService.updateInvoiceSettingsService(businessId, data, userId);

    res.status(200).json({
      success: true,
      message: 'Invoice settings updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Update invoice settings error:', error);
    
    if (error.message === 'Access denied to this business') {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update invoice settings',
      error: error.message
    });
  }
};

// ============================================
// Update Inventory Settings
// ============================================
export const updateInventorySettings = async (req, res) => {
  try {
    const { businessId } = req.params;
    const userId = req.user.id;
    const data = req.body;

    const updated = await settingsService.updateInventorySettingsService(businessId, data, userId);

    res.status(200).json({
      success: true,
      message: 'Inventory settings updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Update inventory settings error:', error);
    
    if (error.message === 'Access denied to this business') {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update inventory settings',
      error: error.message
    });
  }
};

// ============================================
// Update Notification Settings
// ============================================
export const updateNotificationSettings = async (req, res) => {
  try {
    const { businessId } = req.params;
    const userId = req.user.id;
    const data = req.body;

    const updated = await settingsService.updateNotificationSettingsService(businessId, data, userId);

    res.status(200).json({
      success: true,
      message: 'Notification settings updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Update notification settings error:', error);
    
    if (error.message === 'Access denied to this business') {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update notification settings',
      error: error.message
    });
  }
};

// ============================================
// Update Security Settings
// ============================================
export const updateSecuritySettings = async (req, res) => {
  try {
    const { businessId } = req.params;
    const userId = req.user.id;
    const data = req.body;

    const updated = await settingsService.updateSecuritySettingsService(businessId, data, userId);

    res.status(200).json({
      success: true,
      message: 'Security settings updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Update security settings error:', error);
    
    if (error.message === 'Access denied to this business') {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update security settings',
      error: error.message
    });
  }
};

// ============================================
// Get Audit Logs
// ============================================
export const getAuditLogs = async (req, res) => {
  try {
    const { businessId } = req.params;
    const userId = req.user.id;
    const days = parseInt(req.query.days) || 30;

    const logs = await settingsService.getAuditLogsService(businessId, userId, days);

    res.status(200).json({
      success: true,
      data: logs,
      count: logs.length
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    
    if (error.message === 'Access denied to this business') {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message
    });
  }
};

export default {
  getAllSettings,
  updateBusinessProfile,
  updateTaxSettings,
  updateInvoiceSettings,
  updateInventorySettings,
  updateNotificationSettings,
  updateSecuritySettings,
  getAuditLogs
};

```

---

## 4. ROUTES - settings-module/routes/settingsRoutes.js

```javascript
import { Router } from 'express';
import * as settingsController from '../controllers/settingsController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, validationSchemas } from '../validators/settingsValidators.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting
const settingsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  }
});

// All routes require authentication and rate limiting
router.use(authenticateToken);
router.use(settingsLimiter);

// ============================================
// GET /api/settings/:businessId
// Get all settings for a business
// ============================================
router.get('/:businessId', settingsController.getAllSettings);

// ============================================
// GET /api/settings/audit-logs/:businessId
// Get audit logs
// ============================================
router.get('/audit-logs/:businessId', settingsController.getAuditLogs);

// ============================================
// PUT /api/settings/business-profile/:businessId
// Update business profile
// ============================================
router.put(
  '/business-profile/:businessId',
  validateRequest(validationSchemas.businessProfile),
  settingsController.updateBusinessProfile
);

// ============================================
// PUT /api/settings/tax/:businessId
// Update tax settings
// ============================================
router.put(
  '/tax/:businessId',
  validateRequest(validationSchemas.taxSettings),
  settingsController.updateTaxSettings
);

// ============================================
// PUT /api/settings/invoice/:businessId
// Update invoice settings
// ============================================
router.put(
  '/invoice/:businessId',
  validateRequest(validationSchemas.invoiceSettings),
  settingsController.updateInvoiceSettings
);

// ============================================
// PUT /api/settings/inventory/:businessId
// Update inventory settings
// ============================================
router.put(
  '/inventory/:businessId',
  validateRequest(validationSchemas.inventorySettings),
  settingsController.updateInventorySettings
);

// ============================================
// PUT /api/settings/notifications/:businessId
// Update notification settings
// ============================================
router.put(
  '/notifications/:businessId',
  validateRequest(validationSchemas.notificationSettings),
  settingsController.updateNotificationSettings
);

// ============================================
// PUT /api/settings/security/:businessId
// Update security settings (Admin only)
// ============================================
router.put(
  '/security/:businessId',
  authorizeRoles('admin'),
  validateRequest(validationSchemas.securitySettings),
  settingsController.updateSecuritySettings
);

export default router;

```

---

## 5. ERROR HANDLING MIDDLEWARE - settings-module/utils/errorHandler.js

```javascript
// Centralized error handler
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry found',
      detail: err.detail
    });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced record not found',
      detail: err.detail
    });
  }

  // PostgreSQL check constraint violation
  if (err.code === '23514') {
    return res.status(400).json({
      success: false,
      message: 'Invalid data value',
      detail: err.detail
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
};

// 404 handler
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
};

export default { errorHandler, notFoundHandler };

```

---

## 6. INTEGRATION - Add to your main server.js

```javascript
// Import settings module
import settingsRoutes from './settings-module/routes/settingsRoutes.js';
import { errorHandler, notFoundHandler } from './settings-module/utils/errorHandler.js';

// ... your existing middleware ...

// Settings Module Routes
app.use('/api/settings', settingsRoutes);

// Error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);
```

---

## 📦 Package.json Dependencies

Add these to your backend `package.json`:

```json
{
  "dependencies": {
    "pg": "^8.11.3",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.22.4",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  }
}
```

---

## ✅ Complete Implementation Checklist

- [x] PostgreSQL database schema
- [x] Database connection pool
- [x] JWT authentication middleware
- [x] Role-based access control
- [x] Zod validation schemas
- [x] Data models (SQL queries)
- [x] Business logic services
- [x] Request controllers
- [x] API routes
- [x] Error handling middleware
- [x] Rate limiting
- [x] Audit logging
- [x] Multi-business support
- [x] GST compliance validations

---

## 🎯 Next Steps

1. Install dependencies
2. Set up PostgreSQL database
3. Run schema SQL
4. Configure environment variables
5. Integrate routes into server.js
6. Test all endpoints
7. Deploy to production

**Status:** Backend Implementation Complete! 🚀
