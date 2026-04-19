-- Migration: Add payment_method column to purchases table
-- Run this script once to update the database schema

ALTER TABLE purchases ADD (payment_method VARCHAR2(20) DEFAULT 'CASH');

COMMIT;
