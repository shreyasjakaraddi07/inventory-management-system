-- Drop existing tables first
BEGIN
  FOR rec IN (SELECT table_name FROM user_tables WHERE table_name IN ('SUPPLIERS', 'CUSTOMERS', 'PRODUCTS', 'PURCHASES', 'PURCHASE_ITEMS', 'PURCHASE_RETURNS', 'PURCHASE_RETURN_ITEMS', 'SALES', 'SALE_ITEMS', 'SALE_RETURNS', 'SALE_RETURN_ITEMS'))
  LOOP
    EXECUTE IMMEDIATE 'DROP TABLE ' || rec.table_name || ' CASCADE CONSTRAINTS';
    DBMS_OUTPUT.PUT_LINE('Dropped table: ' || rec.table_name);
  END LOOP;
END;
/

-- Drop sequences
BEGIN
  FOR rec IN (SELECT sequence_name FROM user_sequences WHERE sequence_name LIKE '%_SEQ')
  LOOP
    EXECUTE IMMEDIATE 'DROP SEQUENCE ' || rec.sequence_name;
    DBMS_OUTPUT.PUT_LINE('Dropped sequence: ' || rec.sequence_name);
  END LOOP;
END;
/

COMMIT;
