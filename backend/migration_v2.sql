-- ============================================================
-- MIGRATION V2: PURCHASE RETURNS ENHANCEMENT
-- ============================================================

-- 1. Update purchase_items to track returned quantity
ALTER TABLE purchase_items ADD (returned_qty NUMBER DEFAULT 0 CHECK (returned_qty >= 0));

-- 2. Update purchase_returns header
ALTER TABLE purchase_returns ADD (
  return_number VARCHAR2(20),
  total_refund NUMBER(12,2) DEFAULT 0,
  tax_refund NUMBER(12,2) DEFAULT 0,
  return_date DATE DEFAULT SYSDATE
);

-- 3. Update purchase_return_items logic
ALTER TABLE purchase_return_items ADD (
  unit_price NUMBER(10,2) DEFAULT 0,
  refund_amount NUMBER(12,2) DEFAULT 0,
  tax_amount NUMBER(10,2) DEFAULT 0,
  gst_rate NUMBER(5,2) DEFAULT 0
);

-- 4. Create sequence for return_number if not already exists (handled in script but here for schema completeness)
-- CREATE SEQUENCE purchase_return_num_seq START WITH 1 INCREMENT BY 1 NOCACHE;

-- 5. Mark existing fully returned purchases (if any)
-- (Run manually if needed)

-- Update status of existing purchases if needed
-- UPDATE purchases SET status = 'ACTIVE' WHERE status IS NULL;

COMMIT;
