-- ============================================
-- Settings Module Database Schema
-- Inventory Management System with GST (India)
-- PostgreSQL
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. BUSINESSES TABLE
-- Core business entity
-- ============================================
CREATE TABLE businesses (
    business_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name VARCHAR(100) NOT NULL,
    trade_name VARCHAR(100),
    business_type VARCHAR(50) CHECK (business_type IN ('proprietorship', 'partnership', 'llp', 'private_ltd', 'public_ltd', 'ngo')),
    owner_id UUID NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

CREATE INDEX idx_businesses_owner ON businesses(owner_id);
CREATE INDEX idx_businesses_active ON businesses(is_active);

-- ============================================
-- 2. BUSINESS PROFILES TABLE
-- Detailed business information
-- ============================================
CREATE TABLE business_profiles (
    profile_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID UNIQUE NOT NULL REFERENCES businesses(business_id) ON DELETE CASCADE,
    gstin VARCHAR(15) UNIQUE,
    pan VARCHAR(10),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    state_code VARCHAR(2),
    pincode VARCHAR(6),
    country VARCHAR(50) DEFAULT 'India',
    phone VARCHAR(20),
    email VARCHAR(100),
    website VARCHAR(200),
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_gstin_format CHECK (gstin IS NULL OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'),
    CONSTRAINT chk_pan_format CHECK (pan IS NULL OR pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$'),
    CONSTRAINT chk_pincode_format CHECK (pincode IS NULL OR pincode ~ '^[0-9]{6}$')
);

CREATE INDEX idx_business_profiles_gstin ON business_profiles(gstin);
CREATE INDEX idx_business_profiles_state ON business_profiles(state_code);

-- ============================================
-- 3. TAX SETTINGS TABLE
-- GST and tax configuration
-- ============================================
CREATE TABLE tax_settings (
    tax_setting_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID UNIQUE NOT NULL REFERENCES businesses(business_id) ON DELETE CASCADE,
    default_gst_rate DECIMAL(5,2) DEFAULT 18.00 CHECK (default_gst_rate >= 0 AND default_gst_rate <= 28),
    enable_igst BOOLEAN DEFAULT true,
    enable_round_off BOOLEAN DEFAULT true,
    reverse_charge_enabled BOOLEAN DEFAULT false,
    tds_enabled BOOLEAN DEFAULT false,
    tds_rate DECIMAL(5,2) DEFAULT 0 CHECK (tds_rate >= 0 AND tds_rate <= 100),
    filing_frequency VARCHAR(20) DEFAULT 'monthly' CHECK (filing_frequency IN ('monthly', 'quarterly')),
    rounding_method VARCHAR(20) DEFAULT '2_decimals' CHECK (rounding_method IN ('2_decimals', 'nearest_rupee', 'truncate')),
    pricing_type VARCHAR(20) DEFAULT 'exclusive' CHECK (pricing_type IN ('exclusive', 'inclusive')),
    eway_bill_enabled BOOLEAN DEFAULT false,
    eway_bill_threshold DECIMAL(12,2) DEFAULT 50000.00,
    eway_bill_validity_km INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tax_settings_business ON tax_settings(business_id);

-- ============================================
-- 4. GST RATES TABLE
-- Available GST rate configurations
-- ============================================
CREATE TABLE gst_rates (
    gst_rate_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rate DECIMAL(5,2) NOT NULL CHECK (rate >= 0 AND rate <= 28),
    description VARCHAR(100),
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_gst_rate UNIQUE (rate, effective_from)
);

CREATE INDEX idx_gst_rates_active ON gst_rates(is_active);
CREATE INDEX idx_gst_rates_default ON gst_rates(is_default);

-- Insert default GST rates
INSERT INTO gst_rates (rate, description, is_default) VALUES
(0, 'Nil Rated', false),
(5, 'GST Rate 5%', false),
(12, 'GST Rate 12%', false),
(18, 'GST Rate 18%', true),
(28, 'GST Rate 28%', false);

-- ============================================
-- 5. HSN CODES TABLE
-- HSN/SAC code master
-- ============================================
CREATE TABLE hsn_codes (
    hsn_code_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(business_id) ON DELETE CASCADE,
    hsn_code VARCHAR(8) NOT NULL,
    description TEXT,
    gst_rate_id UUID REFERENCES gst_rates(gst_rate_id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_hsn_business UNIQUE (business_id, hsn_code)
);

CREATE INDEX idx_hsn_codes_business ON hsn_codes(business_id);
CREATE INDEX idx_hsn_codes_active ON hsn_codes(is_active);

-- ============================================
-- 6. INVOICE SETTINGS TABLE
-- Invoice configuration
-- ============================================
CREATE TABLE invoice_settings (
    invoice_setting_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID UNIQUE NOT NULL REFERENCES businesses(business_id) ON DELETE CASCADE,
    invoice_prefix VARCHAR(10) DEFAULT 'INV-',
    purchase_prefix VARCHAR(10) DEFAULT 'PUR-',
    credit_note_prefix VARCHAR(10) DEFAULT 'CN-',
    debit_note_prefix VARCHAR(10) DEFAULT 'DN-',
    invoice_suffix VARCHAR(10) DEFAULT '',
    starting_number INTEGER DEFAULT 1 CHECK (starting_number > 0),
    current_number INTEGER DEFAULT 1,
    fy_reset_enabled BOOLEAN DEFAULT false,
    show_hsn BOOLEAN DEFAULT true,
    show_gst_breakup BOOLEAN DEFAULT true,
    show_discount BOOLEAN DEFAULT false,
    show_description BOOLEAN DEFAULT true,
    show_batch_expiry BOOLEAN DEFAULT false,
    print_logo BOOLEAN DEFAULT true,
    digital_signature_enabled BOOLEAN DEFAULT false,
    digital_signature_url TEXT,
    invoice_terms TEXT,
    footer_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoice_settings_business ON invoice_settings(business_id);

-- ============================================
-- 7. INVENTORY SETTINGS TABLE
-- Product and inventory configuration
-- ============================================
CREATE TABLE inventory_settings (
    inventory_setting_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID UNIQUE NOT NULL REFERENCES businesses(business_id) ON DELETE CASCADE,
    low_stock_alert_enabled BOOLEAN DEFAULT true,
    low_stock_threshold INTEGER DEFAULT 10 CHECK (low_stock_threshold > 0),
    auto_stock_update BOOLEAN DEFAULT true,
    negative_stock_prevention BOOLEAN DEFAULT false,
    stock_valuation_method VARCHAR(20) DEFAULT 'fifo' CHECK (stock_valuation_method IN ('fifo', 'lifo', 'weighted_average')),
    barcode_enabled BOOLEAN DEFAULT false,
    barcode_format VARCHAR(20) DEFAULT 'EAN-13' CHECK (barcode_format IN ('EAN-13', 'Code-128', 'QR')),
    batch_tracking_enabled BOOLEAN DEFAULT false,
    serial_tracking_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_settings_business ON inventory_settings(business_id);

-- ============================================
-- 8. UNITS TABLE
-- Units of measurement
-- ============================================
CREATE TABLE units (
    unit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(business_id) ON DELETE CASCADE,
    unit_name VARCHAR(50) NOT NULL,
    unit_abbreviation VARCHAR(10) NOT NULL,
    unit_type VARCHAR(20) CHECK (unit_type IN ('quantity', 'weight', 'volume', 'length', 'area')),
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_unit_business UNIQUE (business_id, unit_abbreviation)
);

CREATE INDEX idx_units_business ON units(business_id);
CREATE INDEX idx_units_active ON units(is_active);

-- Insert default units
INSERT INTO units (unit_name, unit_abbreviation, unit_type, is_default) VALUES
('Pieces', 'PCS', 'quantity', true),
('Kilograms', 'KG', 'weight', false),
('Liters', 'LTR', 'volume', false),
('Meters', 'MTR', 'length', false),
('Boxes', 'BOX', 'quantity', false),
('Dozens', 'DOZ', 'quantity', false),
('Numbers', 'NOS', 'quantity', false);

-- ============================================
-- 9. CATEGORIES TABLE
-- Product categories
-- ============================================
CREATE TABLE categories (
    category_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(business_id) ON DELETE CASCADE,
    category_name VARCHAR(100) NOT NULL,
    parent_category_id UUID REFERENCES categories(category_id) ON DELETE SET NULL,
    default_gst_rate_id UUID REFERENCES gst_rates(gst_rate_id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_category_business UNIQUE (business_id, category_name)
);

CREATE INDEX idx_categories_business ON categories(business_id);
CREATE INDEX idx_categories_parent ON categories(parent_category_id);
CREATE INDEX idx_categories_active ON categories(is_active);

-- ============================================
-- 10. NOTIFICATION SETTINGS TABLE
-- Notification configuration
-- ============================================
CREATE TABLE notification_settings (
    notification_setting_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID UNIQUE NOT NULL REFERENCES businesses(business_id) ON DELETE CASCADE,
    
    -- Stock alerts
    low_stock_alert_enabled BOOLEAN DEFAULT true,
    low_stock_email BOOLEAN DEFAULT true,
    low_stock_sms BOOLEAN DEFAULT false,
    low_stock_in_app BOOLEAN DEFAULT true,
    low_stock_frequency VARCHAR(20) DEFAULT 'realtime' CHECK (low_stock_frequency IN ('realtime', 'daily', 'weekly')),
    
    -- Payment reminders
    payment_reminders_enabled BOOLEAN DEFAULT true,
    reminder_7_days BOOLEAN DEFAULT true,
    reminder_3_days BOOLEAN DEFAULT true,
    reminder_1_day BOOLEAN DEFAULT false,
    overdue_1_day BOOLEAN DEFAULT true,
    overdue_7_days BOOLEAN DEFAULT true,
    
    -- GST reminders
    gst_filing_reminder_enabled BOOLEAN DEFAULT true,
    gst_reminder_7_days BOOLEAN DEFAULT true,
    gst_reminder_3_days BOOLEAN DEFAULT true,
    gst_reminder_1_day BOOLEAN DEFAULT true,
    
    -- Channels
    email_notifications_enabled BOOLEAN DEFAULT true,
    sms_notifications_enabled BOOLEAN DEFAULT false,
    desktop_notifications_enabled BOOLEAN DEFAULT false,
    
    -- Do not disturb
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_from TIME DEFAULT '22:00:00',
    quiet_hours_to TIME DEFAULT '08:00:00',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notification_settings_business ON notification_settings(business_id);

-- ============================================
-- 11. SECURITY SETTINGS TABLE
-- Security configuration
-- ============================================
CREATE TABLE security_settings (
    security_setting_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID UNIQUE NOT NULL REFERENCES businesses(business_id) ON DELETE CASCADE,
    session_timeout_minutes INTEGER DEFAULT 30 CHECK (session_timeout_minutes > 0),
    failed_login_lockout_enabled BOOLEAN DEFAULT true,
    failed_login_attempts INTEGER DEFAULT 5 CHECK (failed_login_attempts > 0),
    lockout_duration_minutes INTEGER DEFAULT 30,
    password_min_length INTEGER DEFAULT 8 CHECK (password_min_length >= 6),
    password_require_uppercase BOOLEAN DEFAULT true,
    password_require_number BOOLEAN DEFAULT true,
    password_require_special BOOLEAN DEFAULT true,
    password_history_count INTEGER DEFAULT 5,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_method VARCHAR(20) DEFAULT 'email' CHECK (two_factor_method IN ('email', 'sms', 'authenticator')),
    ip_whitelist_enabled BOOLEAN DEFAULT false,
    ip_whitelist TEXT, -- JSON array of IPs/CIDRs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_security_settings_business ON security_settings(business_id);

-- ============================================
-- 12. AUDIT LOGS TABLE
-- Track all settings changes
-- ============================================
CREATE TABLE settings_audit_logs (
    audit_log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(business_id) ON DELETE SET NULL,
    user_id UUID NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_business ON settings_audit_logs(business_id);
CREATE INDEX idx_audit_logs_user ON settings_audit_logs(user_id);
CREATE INDEX idx_audit_logs_table ON settings_audit_logs(table_name);
CREATE INDEX idx_audit_logs_created ON settings_audit_logs(created_at);

-- ============================================
-- 13. DEFAULT SETTINGS FUNCTION
-- Auto-create default settings for new business
-- ============================================
CREATE OR REPLACE FUNCTION create_default_settings()
RETURNS TRIGGER AS $$
BEGIN
    -- Business Profile
    INSERT INTO business_profiles (business_id) VALUES (NEW.business_id);
    
    -- Tax Settings
    INSERT INTO tax_settings (business_id) VALUES (NEW.business_id);
    
    -- Invoice Settings
    INSERT INTO invoice_settings (business_id) VALUES (NEW.business_id);
    
    -- Inventory Settings
    INSERT INTO inventory_settings (business_id) VALUES (NEW.business_id);
    
    -- Notification Settings
    INSERT INTO notification_settings (business_id) VALUES (NEW.business_id);
    
    -- Security Settings
    INSERT INTO security_settings (business_id) VALUES (NEW.business_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-creating default settings
CREATE TRIGGER trg_create_default_settings
    AFTER INSERT ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION create_default_settings();

-- ============================================
-- 14. AUDIT LOGGING FUNCTION
-- Auto-log settings changes
-- ============================================
CREATE OR REPLACE FUNCTION log_settings_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO settings_audit_logs (business_id, user_id, table_name, record_id, action, new_values)
        VALUES (
            NEW.business_id,
            COALESCE(NEW.updated_by, NEW.created_by, '00000000-0000-0000-0000-000000000000'),
            TG_TABLE_NAME,
            NEW.business_id,
            'INSERT',
            to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO settings_audit_logs (business_id, user_id, table_name, record_id, action, old_values, new_values)
        VALUES (
            NEW.business_id,
            NEW.updated_by,
            TG_TABLE_NAME,
            NEW.business_id,
            'UPDATE',
            to_jsonb(OLD),
            to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO settings_audit_logs (business_id, user_id, table_name, record_id, action, old_values)
        VALUES (
            OLD.business_id,
            '00000000-0000-0000-0000-000000000000',
            TG_TABLE_NAME,
            OLD.business_id,
            'DELETE',
            to_jsonb(OLD)
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers for all settings tables
CREATE TRIGGER trg_audit_business_profiles
    AFTER INSERT OR UPDATE OR DELETE ON business_profiles
    FOR EACH ROW EXECUTE FUNCTION log_settings_changes();

CREATE TRIGGER trg_audit_tax_settings
    AFTER INSERT OR UPDATE OR DELETE ON tax_settings
    FOR EACH ROW EXECUTE FUNCTION log_settings_changes();

CREATE TRIGGER trg_audit_invoice_settings
    AFTER INSERT OR UPDATE OR DELETE ON invoice_settings
    FOR EACH ROW EXECUTE FUNCTION log_settings_changes();

CREATE TRIGGER trg_audit_inventory_settings
    AFTER INSERT OR UPDATE OR DELETE ON inventory_settings
    FOR EACH ROW EXECUTE FUNCTION log_settings_changes();

CREATE TRIGGER trg_audit_notification_settings
    AFTER INSERT OR UPDATE OR DELETE ON notification_settings
    FOR EACH ROW EXECUTE FUNCTION log_settings_changes();

CREATE TRIGGER trg_audit_security_settings
    AFTER INSERT OR UPDATE OR DELETE ON security_settings
    FOR EACH ROW EXECUTE FUNCTION log_settings_changes();

-- ============================================
-- 15. UPDATED_AT TRIGGER FUNCTION
-- Auto-update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all settings tables
CREATE TRIGGER trg_updated_at_businesses
    BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_updated_at_business_profiles
    BEFORE UPDATE ON business_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_updated_at_tax_settings
    BEFORE UPDATE ON tax_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_updated_at_invoice_settings
    BEFORE UPDATE ON invoice_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_updated_at_inventory_settings
    BEFORE UPDATE ON inventory_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_updated_at_notification_settings
    BEFORE UPDATE ON notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_updated_at_security_settings
    BEFORE UPDATE ON security_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 16. VIEWS
-- Get complete settings for a business
-- ============================================
CREATE OR REPLACE VIEW v_business_complete_settings AS
SELECT 
    b.business_id,
    b.business_name,
    b.trade_name,
    b.business_type,
    b.is_active,
    bp.gstin,
    bp.pan,
    bp.address,
    bp.city,
    bp.state,
    bp.state_code,
    bp.pincode,
    bp.phone,
    bp.email,
    bp.website,
    bp.logo_url,
    ts.default_gst_rate,
    ts.enable_igst,
    ts.enable_round_off,
    ts.reverse_charge_enabled,
    ts.tds_enabled,
    ts.tds_rate,
    ts.filing_frequency,
    ts.rounding_method,
    ts.pricing_type,
    ts.eway_bill_enabled,
    ts.eway_bill_threshold,
    ts.eway_bill_validity_km,
    ins.invoice_prefix,
    ins.purchase_prefix,
    ins.credit_note_prefix,
    ins.debit_note_prefix,
    ins.invoice_suffix,
    ins.starting_number,
    ins.current_number,
    ins.fy_reset_enabled,
    ins.show_hsn,
    ins.show_gst_breakup,
    ins.show_discount,
    ins.show_description,
    ins.show_batch_expiry,
    ins.print_logo,
    ins.digital_signature_enabled,
    ins.invoice_terms,
    ins.footer_notes,
    invs.low_stock_alert_enabled,
    invs.low_stock_threshold,
    invs.auto_stock_update,
    invs.negative_stock_prevention,
    invs.stock_valuation_method,
    invs.barcode_enabled,
    ns.low_stock_alert_enabled as notif_low_stock_enabled,
    ns.low_stock_email,
    ns.low_stock_sms,
    ns.low_stock_in_app,
    ns.low_stock_frequency,
    ns.payment_reminders_enabled,
    ns.gst_filing_reminder_enabled,
    ns.email_notifications_enabled,
    ns.sms_notifications_enabled,
    ns.quiet_hours_enabled,
    ss.session_timeout_minutes,
    ss.two_factor_enabled,
    ss.failed_login_lockout_enabled
FROM businesses b
LEFT JOIN business_profiles bp ON b.business_id = bp.business_id
LEFT JOIN tax_settings ts ON b.business_id = ts.business_id
LEFT JOIN invoice_settings ins ON b.business_id = ins.business_id
LEFT JOIN inventory_settings invs ON b.business_id = invs.business_id
LEFT JOIN notification_settings ns ON b.business_id = ns.business_id
LEFT JOIN security_settings ss ON b.business_id = ss.business_id;

-- ============================================
-- 17. INDEXES FOR PERFORMANCE
-- ============================================
-- Composite indexes for common queries
CREATE INDEX idx_businesses_owner_active ON businesses(owner_id, is_active);
CREATE INDEX idx_audit_logs_business_date ON settings_audit_logs(business_id, created_at DESC);

-- ============================================
-- 18. GRANTS (Adjust based on your setup)
-- ============================================
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_user;
