-- ============================================================
-- ONBOARDING TABLES FOR INVENTORY + GST MANAGEMENT SYSTEM
-- Creates: businesses, business_profiles, tax_settings, invoice_settings
-- ============================================================

-- Drop existing tables if they exist (uncomment if needed)
-- DROP TABLE invoice_settings;
-- DROP TABLE tax_settings;
-- DROP TABLE business_profiles;
-- DROP TABLE businesses;

-- ============================================================
-- BUSINESSES TABLE
-- ============================================================
CREATE TABLE businesses (
  id NUMBER PRIMARY KEY,
  owner_id NUMBER NOT NULL,
  name VARCHAR2(100) NOT NULL,
  is_active NUMBER DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at DATE DEFAULT SYSDATE,
  updated_at DATE DEFAULT SYSDATE
);

CREATE SEQUENCE business_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE TRIGGER business_trigger
BEFORE INSERT ON businesses
FOR EACH ROW
BEGIN
  IF :NEW.id IS NULL THEN
    SELECT business_seq.NEXTVAL INTO :NEW.id FROM dual;
  END IF;
END;
/

-- ============================================================
-- BUSINESS PROFILES TABLE
-- ============================================================
CREATE TABLE business_profiles (
  id NUMBER PRIMARY KEY,
  business_id NUMBER NOT NULL UNIQUE,
  business_name VARCHAR2(100),
  trade_name VARCHAR2(100),
  gstin VARCHAR2(15) UNIQUE,
  pan VARCHAR2(10),
  phone VARCHAR2(15),
  email VARCHAR2(100),
  address VARCHAR2(255),
  city VARCHAR2(50),
  state VARCHAR2(50),
  state_code VARCHAR2(2),
  pincode VARCHAR2(10),
  logo_url CLOB,
  is_complete NUMBER DEFAULT 0 CHECK (is_complete IN (0, 1)),
  created_at DATE DEFAULT SYSDATE,
  updated_at DATE DEFAULT SYSDATE
);

CREATE SEQUENCE business_profile_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE TRIGGER business_profile_trigger
BEFORE INSERT ON business_profiles
FOR EACH ROW
BEGIN
  IF :NEW.id IS NULL THEN
    SELECT business_profile_seq.NEXTVAL INTO :NEW.id FROM dual;
  END IF;
  :NEW.updated_at := SYSDATE;
END;
/

-- ============================================================
-- TAX SETTINGS TABLE
-- ============================================================
CREATE TABLE tax_settings (
  id NUMBER PRIMARY KEY,
  business_id NUMBER NOT NULL UNIQUE,
  default_gst_rate NUMBER DEFAULT 18 CHECK (default_gst_rate IN (0, 5, 12, 18, 28)),
  enable_igst NUMBER DEFAULT 1 CHECK (enable_igst IN (0, 1)),
  enable_round_off NUMBER DEFAULT 1 CHECK (enable_round_off IN (0, 1)),
  filing_frequency VARCHAR2(20) DEFAULT 'monthly' CHECK (filing_frequency IN ('monthly', 'quarterly')),
  created_at DATE DEFAULT SYSDATE,
  updated_at DATE DEFAULT SYSDATE
);

CREATE SEQUENCE tax_settings_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE TRIGGER tax_settings_trigger
BEFORE INSERT OR UPDATE ON tax_settings
FOR EACH ROW
BEGIN
  IF :NEW.id IS NULL THEN
    SELECT tax_settings_seq.NEXTVAL INTO :NEW.id FROM dual;
  END IF;
  :NEW.updated_at := SYSDATE;
END;
/

-- ============================================================
-- INVOICE SETTINGS TABLE
-- ============================================================
CREATE TABLE invoice_settings (
  id NUMBER PRIMARY KEY,
  business_id NUMBER NOT NULL UNIQUE,
  invoice_prefix VARCHAR2(10) DEFAULT 'INV-',
  purchase_prefix VARCHAR2(10) DEFAULT 'PUR-',
  starting_number NUMBER DEFAULT 1,
  show_hsn NUMBER DEFAULT 1 CHECK (show_hsn IN (0, 1)),
  show_gst_breakup NUMBER DEFAULT 1 CHECK (show_gst_breakup IN (0, 1)),
  terms_and_conditions VARCHAR2(500) DEFAULT 'Goods once sold cannot be returned.',
  created_at DATE DEFAULT SYSDATE,
  updated_at DATE DEFAULT SYSDATE
);

CREATE SEQUENCE invoice_settings_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE TRIGGER invoice_settings_trigger
BEFORE INSERT OR UPDATE ON invoice_settings
FOR EACH ROW
BEGIN
  IF :NEW.id IS NULL THEN
    SELECT invoice_settings_seq.NEXTVAL INTO :NEW.id FROM dual;
  END IF;
  :NEW.updated_at := SYSDATE;
END;
/

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX idx_business_owner ON businesses(owner_id);
CREATE INDEX idx_business_gstin ON business_profiles(gstin);
CREATE INDEX idx_business_pan ON business_profiles(pan);
CREATE INDEX idx_business_state ON business_profiles(state_code);

-- ============================================================
-- COMPLETION MESSAGE
-- ============================================================
SELECT '✅ Onboarding tables created successfully!' AS status FROM dual;
