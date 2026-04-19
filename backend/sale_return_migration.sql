-- ============================================================
-- SALES RETURN SYSTEM — DATABASE MIGRATION
-- Run: sqlplus "shreyas/1234@localhost:1521/XEPDB1" "@sale_return_migration.sql"
-- ============================================================

-- 1. Add status column to sales table
ALTER TABLE sales ADD (status VARCHAR2(20) DEFAULT 'ACTIVE');

-- 2. Add return_number, return_date, totals to sale_returns
ALTER TABLE sale_returns ADD (
  return_number  VARCHAR2(20),
  return_date    DATE,
  total_refund   NUMBER(12,2) DEFAULT 0,
  is_igst        NUMBER(1)    DEFAULT 0
);

-- 3. Add financial columns to sale_return_items
ALTER TABLE sale_return_items ADD (
  unit_price     NUMBER(10,2),
  taxable_amount NUMBER(12,2),
  cgst_amount    NUMBER(10,2) DEFAULT 0,
  sgst_amount    NUMBER(10,2) DEFAULT 0,
  igst_amount    NUMBER(10,2) DEFAULT 0,
  total_amount   NUMBER(12,2)
);

-- 4. Sequence for auto-numbered return IDs (RET-2026-0001)
CREATE SEQUENCE sale_return_num_seq START WITH 1 INCREMENT BY 1 NOCACHE;

-- 5. Update all existing sales status to ACTIVE
UPDATE sales SET status = 'ACTIVE' WHERE status IS NULL;

COMMIT;

-- Verify
SELECT 'sales columns' AS tbl, column_name, data_type FROM user_tab_columns
WHERE table_name = 'SALES' AND column_name = 'STATUS'
UNION ALL
SELECT 'sale_returns', column_name, data_type FROM user_tab_columns
WHERE table_name = 'SALE_RETURNS' AND column_name IN ('RETURN_NUMBER','RETURN_DATE','TOTAL_REFUND','IS_IGST')
UNION ALL
SELECT 'sale_return_items', column_name, data_type FROM user_tab_columns
WHERE table_name = 'SALE_RETURN_ITEMS' AND column_name IN ('UNIT_PRICE','TAXABLE_AMOUNT','CGST_AMOUNT','SGST_AMOUNT','IGST_AMOUNT','TOTAL_AMOUNT')
ORDER BY 1, 2;
