import { z } from 'zod';

// GSTIN validation regex (15 characters)
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// PAN validation regex (10 characters)
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

// Email validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation (Indian 10-digit)
const PHONE_REGEX = /^[0-9]{10}$/;

// PIN code validation (6 digits)
const PINCODE_REGEX = /^[0-9]{6}$/;

// ============================================
// Business Profile Validation
// ============================================
export const businessProfileSchema = z.object({
  businessName: z.string()
    .min(2, 'Business name must be at least 2 characters')
    .max(100, 'Business name cannot exceed 100 characters')
    .trim(),
  
  tradeName: z.string()
    .max(100, 'Trade name cannot exceed 100 characters')
    .trim()
    .optional()
    .nullable(),
  
  businessType: z.enum([
    'proprietorship',
    'partnership',
    'llp',
    'private_ltd',
    'public_ltd',
    'ngo'
  ]).optional(),
  
  gstin: z.string()
    .regex(GSTIN_REGEX, 'Invalid GSTIN format. Example: 27AABCU9603R1ZX')
    .or(z.literal(''))
    .optional()
    .nullable(),
  
  pan: z.string()
    .regex(PAN_REGEX, 'Invalid PAN format. Example: AABCU9603R')
    .or(z.literal(''))
    .optional()
    .nullable(),
  
  address: z.string().max(500).optional().nullable(),
  
  city: z.string().max(100).optional().nullable(),
  
  state: z.string().max(50).optional().nullable(),
  
  stateCode: z.string().length(2).optional().nullable(),
  
  pincode: z.string()
    .regex(PINCODE_REGEX, 'PIN code must be 6 digits')
    .or(z.literal(''))
    .optional()
    .nullable(),
  
  phone: z.string()
    .regex(PHONE_REGEX, 'Phone number must be 10 digits')
    .or(z.literal(''))
    .optional()
    .nullable(),
  
  email: z.string()
    .regex(EMAIL_REGEX, 'Invalid email address')
    .or(z.literal(''))
    .optional()
    .nullable(),
  
  website: z.string().url('Invalid website URL').or(z.literal('')).optional().nullable(),
  
  logoUrl: z.string().url('Invalid logo URL').optional().nullable()
});

// ============================================
// Tax Settings Validation
// ============================================
export const taxSettingsSchema = z.object({
  defaultGstRate: z.number()
    .min(0, 'GST rate cannot be negative')
    .max(28, 'GST rate cannot exceed 28%')
    .optional(),
  
  enableIgst: z.boolean().optional(),
  
  enableRoundOff: z.boolean().optional(),
  
  reverseChargeEnabled: z.boolean().optional(),
  
  tdsEnabled: z.boolean().optional(),
  
  tdsRate: z.number()
    .min(0, 'TDS rate cannot be negative')
    .max(100, 'TDS rate cannot exceed 100%')
    .optional(),
  
  filingFrequency: z.enum(['monthly', 'quarterly']).optional(),
  
  roundingMethod: z.enum(['2_decimals', 'nearest_rupee', 'truncate']).optional(),
  
  pricingType: z.enum(['exclusive', 'inclusive']).optional(),
  
  ewayBillEnabled: z.boolean().optional(),
  
  ewayBillThreshold: z.number().min(0).optional(),
  
  ewayBillValidityKm: z.number().min(1).optional()
});

// ============================================
// Invoice Settings Validation
// ============================================
export const invoiceSettingsSchema = z.object({
  invoicePrefix: z.string()
    .max(10, 'Invoice prefix cannot exceed 10 characters')
    .optional(),
  
  purchasePrefix: z.string()
    .max(10, 'Purchase prefix cannot exceed 10 characters')
    .optional(),
  
  creditNotePrefix: z.string()
    .max(10, 'Credit note prefix cannot exceed 10 characters')
    .optional(),
  
  debitNotePrefix: z.string()
    .max(10, 'Debit note prefix cannot exceed 10 characters')
    .optional(),
  
  invoiceSuffix: z.string()
    .max(10, 'Invoice suffix cannot exceed 10 characters')
    .optional(),
  
  startingNumber: z.number()
    .int('Starting number must be an integer')
    .min(1, 'Starting number must be at least 1')
    .optional(),
  
  fyResetEnabled: z.boolean().optional(),
  
  showHsn: z.boolean().optional(),
  
  showGstBreakup: z.boolean().optional(),
  
  showDiscount: z.boolean().optional(),
  
  showDescription: z.boolean().optional(),
  
  showBatchExpiry: z.boolean().optional(),
  
  printLogo: z.boolean().optional(),
  
  digitalSignatureEnabled: z.boolean().optional(),
  
  digitalSignatureUrl: z.string().url('Invalid signature URL').optional().nullable(),
  
  invoiceTerms: z.string().max(2000).optional().nullable(),
  
  footerNotes: z.string().max(1000).optional().nullable()
});

// ============================================
// Inventory Settings Validation
// ============================================
export const inventorySettingsSchema = z.object({
  lowStockAlertEnabled: z.boolean().optional(),
  
  lowStockThreshold: z.number()
    .int('Threshold must be an integer')
    .min(1, 'Threshold must be at least 1')
    .optional(),
  
  autoStockUpdate: z.boolean().optional(),
  
  negativeStockPrevention: z.boolean().optional(),
  
  stockValuationMethod: z.enum(['fifo', 'lifo', 'weighted_average']).optional(),
  
  barcodeEnabled: z.boolean().optional(),
  
  barcodeFormat: z.enum(['EAN-13', 'Code-128', 'QR']).optional(),
  
  batchTrackingEnabled: z.boolean().optional(),
  
  serialTrackingEnabled: z.boolean().optional()
});

// ============================================
// Notification Settings Validation
// ============================================
export const notificationSettingsSchema = z.object({
  lowStockAlertEnabled: z.boolean().optional(),
  
  lowStockEmail: z.boolean().optional(),
  
  lowStockSms: z.boolean().optional(),
  
  lowStockInApp: z.boolean().optional(),
  
  lowStockFrequency: z.enum(['realtime', 'daily', 'weekly']).optional(),
  
  paymentRemindersEnabled: z.boolean().optional(),
  
  reminder7Days: z.boolean().optional(),
  
  reminder3Days: z.boolean().optional(),
  
  reminder1Day: z.boolean().optional(),
  
  overdue1Day: z.boolean().optional(),
  
  overdue7Days: z.boolean().optional(),
  
  gstFilingReminderEnabled: z.boolean().optional(),
  
  gstReminder7Days: z.boolean().optional(),
  
  gstReminder3Days: z.boolean().optional(),
  
  gstReminder1Day: z.boolean().optional(),
  
  emailNotificationsEnabled: z.boolean().optional(),
  
  smsNotificationsEnabled: z.boolean().optional(),
  
  desktopNotificationsEnabled: z.boolean().optional(),
  
  quietHoursEnabled: z.boolean().optional(),
  
  quietHoursFrom: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/, 'Invalid time format (HH:MM:SS)').optional(),
  
  quietHoursTo: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/, 'Invalid time format (HH:MM:SS)').optional()
});

// ============================================
// Security Settings Validation
// ============================================
export const securitySettingsSchema = z.object({
  sessionTimeoutMinutes: z.number()
    .int('Timeout must be an integer')
    .min(1, 'Timeout must be at least 1 minute')
    .optional(),
  
  failedLoginLockoutEnabled: z.boolean().optional(),
  
  failedLoginAttempts: z.number()
    .int('Attempts must be an integer')
    .min(1, 'Must be at least 1 attempt')
    .optional(),
  
  lockoutDurationMinutes: z.number()
    .int('Duration must be an integer')
    .min(1, 'Must be at least 1 minute')
    .optional(),
  
  passwordMinLength: z.number()
    .int('Length must be an integer')
    .min(6, 'Minimum length is 6 characters')
    .optional(),
  
  passwordRequireUppercase: z.boolean().optional(),
  
  passwordRequireNumber: z.boolean().optional(),
  
  passwordRequireSpecial: z.boolean().optional(),
  
  passwordHistoryCount: z.number()
    .int('Count must be an integer')
    .min(0, 'Cannot be negative')
    .optional(),
  
  twoFactorEnabled: z.boolean().optional(),
  
  twoFactorMethod: z.enum(['email', 'sms', 'authenticator']).optional(),
  
  ipWhitelistEnabled: z.boolean().optional(),
  
  ipWhitelist: z.string().optional().nullable()
});

// Export all schemas
export const validationSchemas = {
  businessProfile: businessProfileSchema,
  taxSettings: taxSettingsSchema,
  invoiceSettings: invoiceSettingsSchema,
  inventorySettings: inventorySettingsSchema,
  notificationSettings: notificationSettingsSchema,
  securitySettings: securitySettingsSchema
};

// Validation helper function
export const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
};

export default validationSchemas;
