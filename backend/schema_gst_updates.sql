-- ============================================================
-- GST EXPORT & REPORTING MODULE - DATABASE SCHEMA UPDATES
-- For India GST Compliance (GSTR-1, GSTR-3B, HSN Summary)
-- ============================================================

-- ============================================================
-- 1. NEW TABLES FOR GST COMPLIANCE
-- ============================================================

-- Businesses table for GST registration details
CREATE TABLE businesses (
  business_id NUMBER PRIMARY KEY,
  gstin VARCHAR2(15) UNIQUE NOT NULL,
  legal_name VARCHAR2(200) NOT NULL,
  trade_name VARCHAR2(200),
  address VARCHAR2(500),
  state_code VARCHAR2(2) NOT NULL,
  registration_type VARCHAR2(20) DEFAULT 'regular' CHECK (registration_type IN ('regular', 'composition')),
  is_active NUMBER DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at DATE DEFAULT SYSDATE,
  updated_at DATE DEFAULT SYSDATE
);

-- Credit/Debit Notes table for GST returns
CREATE TABLE credit_debit_notes (
  note_id NUMBER PRIMARY KEY,
  note_type VARCHAR2(10) CHECK (note_type IN ('credit', 'debit')),
  original_invoice_id NUMBER NOT NULL,
  note_number VARCHAR2(50) UNIQUE NOT NULL,
  note_date DATE NOT NULL,
  customer_id NUMBER REFERENCES customers(customer_id),
  supplier_id NUMBER REFERENCES suppliers(supplier_id),
  taxable_value NUMBER(12,2) DEFAULT 0,
  cgst_amount NUMBER(10,2) DEFAULT 0,
  sgst_amount NUMBER(10,2) DEFAULT 0,
  igst_amount NUMBER(10,2) DEFAULT 0,
  total_amount NUMBER(12,2) DEFAULT 0,
  reason VARCHAR2(255),
  is_active NUMBER DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at DATE DEFAULT SYSDATE
);

-- Expenses table for reverse charge and other expenses
CREATE TABLE expenses (
  expense_id NUMBER PRIMARY KEY,
  expense_type VARCHAR2(50) NOT NULL,
  vendor_name VARCHAR2(100),
  gstin VARCHAR2(15),
  invoice_number VARCHAR2(50),
  invoice_date DATE,
  is_reverse_charge NUMBER DEFAULT 0 CHECK (is_reverse_charge IN (0, 1)),
  taxable_value NUMBER(12,2) DEFAULT 0,
  gst_rate NUMBER(5,2) DEFAULT 0,
  cgst_amount NUMBER(10,2) DEFAULT 0,
  sgst_amount NUMBER(10,2) DEFAULT 0,
  igst_amount NUMBER(10,2) DEFAULT 0,
  total_amount NUMBER(12,2) DEFAULT 0,
  is_active NUMBER DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at DATE DEFAULT SYSDATE
);

-- GST Audit Log table for tracking changes
CREATE TABLE gst_audit_log (
  log_id NUMBER PRIMARY KEY,
  table_name VARCHAR2(50),
  record_id NUMBER,
  action VARCHAR2(20),
  old_values CLOB,
  new_values CLOB,
  created_by NUMBER,
  created_at DATE DEFAULT SYSDATE
);

-- ============================================================
-- 2. ENHANCE EXISTING TABLES WITH GST-SPECIFIC COLUMNS
-- ============================================================

-- Add GST-specific columns to sales table
ALTER TABLE sales ADD (
  invoice_type VARCHAR2(10) DEFAULT 'B2B' CHECK (invoice_type IN ('B2B', 'B2CL', 'B2CS', 'EXP', 'CDNR')),
  pos_state_code VARCHAR2(2),
  is_reverse_charge NUMBER DEFAULT 0 CHECK (is_reverse_charge IN (0, 1)),
  total_taxable_value NUMBER(12,2) DEFAULT 0,
  total_cgst NUMBER(10,2) DEFAULT 0,
  total_sgst NUMBER(10,2) DEFAULT 0,
  total_igst NUMBER(10,2) DEFAULT 0,
  round_off NUMBER(5,2) DEFAULT 0,
  total_invoice_value NUMBER(12,2) DEFAULT 0,
  is_active NUMBER DEFAULT 1 CHECK (is_active IN (0, 1))
);

-- Add GST-specific columns to purchases table
ALTER TABLE purchases ADD (
  is_reverse_charge NUMBER DEFAULT 0 CHECK (is_reverse_charge IN (0, 1)),
  total_taxable_value NUMBER(12,2) DEFAULT 0,
  total_cgst NUMBER(10,2) DEFAULT 0,
  total_sgst NUMBER(10,2) DEFAULT 0,
  total_igst NUMBER(10,2) DEFAULT 0,
  total_value NUMBER(12,2) DEFAULT 0,
  is_active NUMBER DEFAULT 1 CHECK (is_active IN (0, 1))
);

-- Add state_code to customers table
ALTER TABLE customers ADD (state_code VARCHAR2(2));

-- Add state_code to suppliers table
ALTER TABLE suppliers ADD (state_code VARCHAR2(2));

-- ============================================================
-- 3. SEQUENCES FOR NEW TABLES
-- ============================================================

CREATE SEQUENCE business_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE credit_debit_note_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE expense_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE gst_audit_log_seq START WITH 1 INCREMENT BY 1;

-- ============================================================
-- 4. TRIGGERS FOR AUTO-INCREMENT
-- ============================================================

CREATE OR REPLACE TRIGGER business_trigger
BEFORE INSERT ON businesses
FOR EACH ROW
BEGIN
  IF :NEW.business_id IS NULL THEN
    SELECT business_seq.NEXTVAL INTO :NEW.business_id FROM dual;
  END IF;
END;
/

CREATE OR REPLACE TRIGGER credit_debit_note_trigger
BEFORE INSERT ON credit_debit_notes
FOR EACH ROW
BEGIN
  IF :NEW.note_id IS NULL THEN
    SELECT credit_debit_note_seq.NEXTVAL INTO :NEW.note_id FROM dual;
  END IF;
END;
/

CREATE OR REPLACE TRIGGER expense_trigger
BEFORE INSERT ON expenses
FOR EACH ROW
BEGIN
  IF :NEW.expense_id IS NULL THEN
    SELECT expense_seq.NEXTVAL INTO :NEW.expense_id FROM dual;
  END IF;
END;
/

CREATE OR REPLACE TRIGGER gst_audit_log_trigger
BEFORE INSERT ON gst_audit_log
FOR EACH ROW
BEGIN
  IF :NEW.log_id IS NULL THEN
    SELECT gst_audit_log_seq.NEXTVAL INTO :NEW.log_id FROM dual;
  END IF;
END;
/

-- ============================================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================================

-- Indexes for businesses table
CREATE INDEX idx_businesses_gstin ON businesses(gstin);
CREATE INDEX idx_businesses_state ON businesses(state_code);

-- Indexes for credit_debit_notes table
CREATE INDEX idx_cdn_customer ON credit_debit_notes(customer_id);
CREATE INDEX idx_cdn_supplier ON credit_debit_notes(supplier_id);
CREATE INDEX idx_cdn_date ON credit_debit_notes(note_date);
CREATE INDEX idx_cdn_type ON credit_debit_notes(note_type);

-- Indexes for expenses table
CREATE INDEX idx_expenses_type ON expenses(expense_type);
CREATE INDEX idx_expenses_date ON expenses(invoice_date);
CREATE INDEX idx_expenses_rcm ON expenses(is_reverse_charge);

-- Indexes for enhanced sales table
CREATE INDEX idx_sales_invoice_type ON sales(invoice_type);
CREATE INDEX idx_sales_pos_state ON sales(pos_state_code);
CREATE INDEX idx_sales_rcm ON sales(is_reverse_charge);

-- Indexes for enhanced purchases table
CREATE INDEX idx_purchases_rcm ON purchases(is_reverse_charge);

-- ============================================================
-- 6. DEFAULT BUSINESS RECORD (OPTIONAL)
-- ============================================================

-- Insert a default business record (modify as per actual business details)
-- INSERT INTO businesses (gstin, legal_name, trade_name, address, state_code, registration_type)
-- VALUES ('00AAAAA0000A1Z5', 'Your Business Name', 'Trade Name', 'Business Address', '00', 'regular');

-- ============================================================
-- 7. MIGRATION: UPDATE EXISTING DATA
-- ============================================================

-- Update existing sales records with invoice_type based on customer GSTIN
-- B2B: Customer has GSTIN
-- B2CS: No GSTIN and intra-state or value <= 250000
-- B2CL: No GSTIN, inter-state, and value > 250000

-- Note: Run this after ensuring customers table has gst_number populated
-- UPDATE sales s
-- SET invoice_type = CASE
--   WHEN c.gst_number IS NOT NULL AND LENGTH(c.gst_number) = 15 THEN 'B2B'
--   WHEN s.total_invoice_value > 250000 AND s.pos_state_code != (SELECT state_code FROM businesses WHERE ROWNUM = 1) THEN 'B2CL'
--   ELSE 'B2CS'
-- END
-- FROM customers c
-- WHERE s.customer_id = c.customer_id;

COMMIT;
