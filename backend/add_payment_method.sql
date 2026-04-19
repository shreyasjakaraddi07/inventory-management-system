-- Add payment_method column to sales table
-- Run this once against Oracle DB:
-- sqlplus shreyas/1234@localhost:1521/XEPDB1 @add_payment_method.sql

ALTER TABLE sales ADD (payment_method VARCHAR2(20) DEFAULT 'CASH');

COMMIT;

-- Verify
SELECT column_name, data_type, data_length, data_default
FROM user_tab_columns
WHERE table_name = 'SALES'
ORDER BY column_id;
