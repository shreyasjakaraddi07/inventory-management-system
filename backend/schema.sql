-- ============================================================
-- ORACLE DATABASE SCHEMA FOR INVENTORY MANAGEMENT SYSTEM
-- Connection: shreyas/1234@localhost:1521/XEPDB1
-- ============================================================

-- Drop existing tables (if needed)
-- DROP TABLE purchase_return_items;
-- DROP TABLE sale_return_items;
-- DROP TABLE purchase_returns;
-- DROP TABLE sale_returns;
-- DROP TABLE purchase_items;
-- DROP TABLE sale_items;
-- DROP TABLE purchases;
-- DROP TABLE sales;
-- DROP TABLE products;
-- DROP TABLE suppliers;
-- DROP TABLE customers;

-- ============================================================
-- SUPPLIERS TABLE
-- ============================================================
CREATE TABLE suppliers (
  supplier_id NUMBER PRIMARY KEY,
  supplier_name VARCHAR2(100) NOT NULL UNIQUE,
  gst_number VARCHAR2(15) UNIQUE,
  phone_number VARCHAR2(15),
  email_id VARCHAR2(100),
  address VARCHAR2(255),
  city VARCHAR2(50),
  state VARCHAR2(50),
  pincode VARCHAR2(10),
  is_active NUMBER DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at DATE DEFAULT SYSDATE,
  updated_at DATE DEFAULT SYSDATE
);

-- Create sequence for supplier_id
CREATE SEQUENCE supplier_seq START WITH 1 INCREMENT BY 1;

-- Create trigger for supplier_id
CREATE OR REPLACE TRIGGER supplier_trigger
BEFORE INSERT ON suppliers
FOR EACH ROW
BEGIN
  IF :NEW.supplier_id IS NULL THEN
    SELECT supplier_seq.NEXTVAL INTO :NEW.supplier_id FROM dual;
  END IF;
END;
/

-- ============================================================
-- CUSTOMERS TABLE
-- ============================================================
CREATE TABLE customers (
  customer_id NUMBER PRIMARY KEY,
  customer_name VARCHAR2(100) NOT NULL,
  phone_number VARCHAR2(15) UNIQUE,
  email_id VARCHAR2(100),
  gst_number VARCHAR2(15),
  address VARCHAR2(255),
  city VARCHAR2(50),
  state VARCHAR2(50),
  pincode VARCHAR2(10),
  is_active NUMBER DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at DATE DEFAULT SYSDATE,
  updated_at DATE DEFAULT SYSDATE
);

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE users (
  user_id NUMBER PRIMARY KEY,
  name VARCHAR2(100) NOT NULL,
  email_id VARCHAR2(100) NOT NULL UNIQUE,
  password_hash VARCHAR2(255) NOT NULL,
  role VARCHAR2(20) DEFAULT 'Staff' NOT NULL,
  is_active NUMBER DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at DATE DEFAULT SYSDATE,
  updated_at DATE DEFAULT SYSDATE
);

CREATE SEQUENCE user_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE TRIGGER user_trigger
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
  IF :NEW.user_id IS NULL THEN
    SELECT user_seq.NEXTVAL INTO :NEW.user_id FROM dual;
  END IF;
END;
/

-- Create sequence for customer_id
CREATE SEQUENCE customer_seq START WITH 1 INCREMENT BY 1;

-- Create trigger for customer_id
CREATE OR REPLACE TRIGGER customer_trigger
BEFORE INSERT ON customers
FOR EACH ROW
BEGIN
  IF :NEW.customer_id IS NULL THEN
    SELECT customer_seq.NEXTVAL INTO :NEW.customer_id FROM dual;
  END IF;
END;
/

-- ============================================================
-- PRODUCTS TABLE
-- ============================================================
CREATE TABLE products (
  product_id NUMBER PRIMARY KEY,
  product_name VARCHAR2(100) NOT NULL UNIQUE,
  hsn_code VARCHAR2(20),
  supplier_id NUMBER REFERENCES suppliers(supplier_id),
  quantity NUMBER DEFAULT 0 CHECK (quantity >= 0),
  purchase_price NUMBER(10,2),
  sale_price NUMBER(10,2),
  gst_rate NUMBER(5,2) DEFAULT 18,
  is_active NUMBER DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at DATE DEFAULT SYSDATE,
  updated_at DATE DEFAULT SYSDATE
);

-- Create sequence for product_id
CREATE SEQUENCE product_seq START WITH 1 INCREMENT BY 1;

-- Create trigger for product_id
CREATE OR REPLACE TRIGGER product_trigger
BEFORE INSERT ON products
FOR EACH ROW
BEGIN
  IF :NEW.product_id IS NULL THEN
    SELECT product_seq.NEXTVAL INTO :NEW.product_id FROM dual;
  END IF;
END;
/

-- Create indexes on products
CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_products_hsn ON products(hsn_code);

-- ============================================================
-- PURCHASES TABLE
-- ============================================================
CREATE TABLE purchases (
  purchase_id NUMBER PRIMARY KEY,
  supplier_id NUMBER NOT NULL REFERENCES suppliers(supplier_id),
  invoice_number VARCHAR2(50) UNIQUE,
  invoice_date DATE,
  notes VARCHAR2(500),
  created_at DATE DEFAULT SYSDATE,
  updated_at DATE DEFAULT SYSDATE
);

-- Create sequence for purchase_id
CREATE SEQUENCE purchase_seq START WITH 1 INCREMENT BY 1;

-- Create trigger for purchase_id
CREATE OR REPLACE TRIGGER purchase_trigger
BEFORE INSERT ON purchases
FOR EACH ROW
BEGIN
  IF :NEW.purchase_id IS NULL THEN
    SELECT purchase_seq.NEXTVAL INTO :NEW.purchase_id FROM dual;
  END IF;
END;
/

-- Create indexes on purchases
CREATE INDEX idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX idx_purchases_invoice ON purchases(invoice_number);

-- ============================================================
-- PURCHASE_ITEMS TABLE
-- ============================================================
CREATE TABLE purchase_items (
  item_id NUMBER PRIMARY KEY,
  purchase_id NUMBER NOT NULL REFERENCES purchases(purchase_id),
  product_id NUMBER NOT NULL REFERENCES products(product_id),
  quantity NUMBER NOT NULL CHECK (quantity > 0),
  unit_price NUMBER(10,2) NOT NULL CHECK (unit_price > 0),
  taxable_amount NUMBER(12,2),
  cgst_amount NUMBER(10,2) DEFAULT 0,
  sgst_amount NUMBER(10,2) DEFAULT 0,
  igst_amount NUMBER(10,2) DEFAULT 0,
  total_amount NUMBER(12,2),
  created_at DATE DEFAULT SYSDATE
);

-- Create sequence for purchase_items
CREATE SEQUENCE purchase_item_seq START WITH 1 INCREMENT BY 1;

-- Create trigger for purchase_items
CREATE OR REPLACE TRIGGER purchase_item_trigger
BEFORE INSERT ON purchase_items
FOR EACH ROW
BEGIN
  IF :NEW.item_id IS NULL THEN
    SELECT purchase_item_seq.NEXTVAL INTO :NEW.item_id FROM dual;
  END IF;
END;
/

-- Create indexes
CREATE INDEX idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_product ON purchase_items(product_id);

-- ============================================================
-- PURCHASE_RETURNS TABLE
-- ============================================================
CREATE TABLE purchase_returns (
  return_id NUMBER PRIMARY KEY,
  purchase_id NUMBER NOT NULL REFERENCES purchases(purchase_id),
  notes VARCHAR2(500),
  created_at DATE DEFAULT SYSDATE
);

-- Create sequence for purchase_returns
CREATE SEQUENCE purchase_return_seq START WITH 1 INCREMENT BY 1;

-- Create trigger for purchase_returns
CREATE OR REPLACE TRIGGER purchase_return_trigger
BEFORE INSERT ON purchase_returns
FOR EACH ROW
BEGIN
  IF :NEW.return_id IS NULL THEN
    SELECT purchase_return_seq.NEXTVAL INTO :NEW.return_id FROM dual;
  END IF;
END;
/

-- ============================================================
-- PURCHASE_RETURN_ITEMS TABLE
-- ============================================================
CREATE TABLE purchase_return_items (
  item_id NUMBER PRIMARY KEY,
  return_id NUMBER NOT NULL REFERENCES purchase_returns(return_id),
  product_id NUMBER NOT NULL REFERENCES products(product_id),
  quantity NUMBER NOT NULL CHECK (quantity > 0),
  created_at DATE DEFAULT SYSDATE
);

-- Create sequence for purchase_return_items
CREATE SEQUENCE purchase_return_item_seq START WITH 1 INCREMENT BY 1;

-- Create trigger for purchase_return_items
CREATE OR REPLACE TRIGGER purchase_return_item_trigger
BEFORE INSERT ON purchase_return_items
FOR EACH ROW
BEGIN
  IF :NEW.item_id IS NULL THEN
    SELECT purchase_return_item_seq.NEXTVAL INTO :NEW.item_id FROM dual;
  END IF;
END;
/

-- ============================================================
-- SALES TABLE
-- ============================================================
CREATE TABLE sales (
  sale_id NUMBER PRIMARY KEY,
  customer_id NUMBER NOT NULL REFERENCES customers(customer_id),
  invoice_number VARCHAR2(50) UNIQUE,
  invoice_date DATE,
  notes VARCHAR2(500),
  created_at DATE DEFAULT SYSDATE,
  updated_at DATE DEFAULT SYSDATE
);

-- Create sequence for sale_id
CREATE SEQUENCE sale_seq START WITH 1 INCREMENT BY 1;

-- Create trigger for sale_id
CREATE OR REPLACE TRIGGER sale_trigger
BEFORE INSERT ON sales
FOR EACH ROW
BEGIN
  IF :NEW.sale_id IS NULL THEN
    SELECT sale_seq.NEXTVAL INTO :NEW.sale_id FROM dual;
  END IF;
END;
/

-- Create indexes on sales
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_invoice ON sales(invoice_number);

-- ============================================================
-- SALE_ITEMS TABLE
-- ============================================================
CREATE TABLE sale_items (
  item_id NUMBER PRIMARY KEY,
  sale_id NUMBER NOT NULL REFERENCES sales(sale_id),
  product_id NUMBER NOT NULL REFERENCES products(product_id),
  quantity NUMBER NOT NULL CHECK (quantity > 0),
  unit_price NUMBER(10,2) NOT NULL CHECK (unit_price > 0),
  taxable_amount NUMBER(12,2),
  cgst_amount NUMBER(10,2) DEFAULT 0,
  sgst_amount NUMBER(10,2) DEFAULT 0,
  igst_amount NUMBER(10,2) DEFAULT 0,
  total_amount NUMBER(12,2),
  created_at DATE DEFAULT SYSDATE
);

-- Create sequence for sale_items
CREATE SEQUENCE sale_item_seq START WITH 1 INCREMENT BY 1;

-- Create trigger for sale_items
CREATE OR REPLACE TRIGGER sale_item_trigger
BEFORE INSERT ON sale_items
FOR EACH ROW
BEGIN
  IF :NEW.item_id IS NULL THEN
    SELECT sale_item_seq.NEXTVAL INTO :NEW.item_id FROM dual;
  END IF;
END;
/

-- Create indexes
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

-- ============================================================
-- SALE_RETURNS TABLE
-- ============================================================
CREATE TABLE sale_returns (
  return_id NUMBER PRIMARY KEY,
  sale_id NUMBER NOT NULL REFERENCES sales(sale_id),
  notes VARCHAR2(500),
  created_at DATE DEFAULT SYSDATE
);

-- Create sequence for sale_returns
CREATE SEQUENCE sale_return_seq START WITH 1 INCREMENT BY 1;

-- Create trigger for sale_returns
CREATE OR REPLACE TRIGGER sale_return_trigger
BEFORE INSERT ON sale_returns
FOR EACH ROW
BEGIN
  IF :NEW.return_id IS NULL THEN
    SELECT sale_return_seq.NEXTVAL INTO :NEW.return_id FROM dual;
  END IF;
END;
/

-- ============================================================
-- SALE_RETURN_ITEMS TABLE
-- ============================================================
CREATE TABLE sale_return_items (
  item_id NUMBER PRIMARY KEY,
  return_id NUMBER NOT NULL REFERENCES sale_returns(return_id),
  product_id NUMBER NOT NULL REFERENCES products(product_id),
  quantity NUMBER NOT NULL CHECK (quantity > 0),
  created_at DATE DEFAULT SYSDATE
);

-- Create sequence for sale_return_items
CREATE SEQUENCE sale_return_item_seq START WITH 1 INCREMENT BY 1;

-- Create trigger for sale_return_items
CREATE OR REPLACE TRIGGER sale_return_item_trigger
BEFORE INSERT ON sale_return_items
FOR EACH ROW
BEGIN
  IF :NEW.item_id IS NULL THEN
    SELECT sale_return_item_seq.NEXTVAL INTO :NEW.item_id FROM dual;
  END IF;
END;
/

-- ============================================================
-- SAMPLE DATA (for testing)
-- ============================================================

-- Sample Suppliers
INSERT INTO suppliers (supplier_name, gst_number, phone_number, email_id, city, state) 
VALUES ('ABC Enterprises', '18AABCT1234A1Z5', '9876543210', 'contact@abc.com', 'Mumbai', 'Maharashtra');

INSERT INTO suppliers (supplier_name, gst_number, phone_number, email_id, city, state) 
VALUES ('XYZ Industries', '27AABCT5678B2Z9', '9876543211', 'contact@xyz.com', 'Bangalore', 'Karnataka');

-- Sample Customers
INSERT INTO customers (customer_name, phone_number, email_id, city, state) 
VALUES ('Retail Store A', '8765432109', 'retail@a.com', 'Delhi', 'Delhi');

INSERT INTO customers (customer_name, phone_number, email_id, city, state) 
VALUES ('Online Seller B', '8765432108', 'seller@b.com', 'Pune', 'Maharashtra');

-- Sample Products
INSERT INTO products (product_name, hsn_code, supplier_id, purchase_price, sale_price, gst_rate, quantity) 
VALUES ('Laptop', '8471.30', 1, 35000, 42000, 18, 10);

INSERT INTO products (product_name, hsn_code, supplier_id, purchase_price, sale_price, gst_rate, quantity) 
VALUES ('Mouse', '8517.62', 1, 300, 500, 18, 50);

INSERT INTO products (product_name, hsn_code, supplier_id, purchase_price, sale_price, gst_rate, quantity) 
VALUES ('Keyboard', '8471.60', 2, 800, 1200, 18, 30);

-- Settings table for application configuration
CREATE TABLE settings (
  setting_id NUMBER PRIMARY KEY,
  setting_key VARCHAR2(100) UNIQUE NOT NULL,
  setting_value CLOB,
  setting_group VARCHAR2(50) DEFAULT 'general',
  updated_at DATE DEFAULT SYSDATE,
  updated_by NUMBER
);

-- Create sequence for settings
CREATE SEQUENCE settings_seq START WITH 1 INCREMENT BY 1;

-- Create trigger for settings
CREATE OR REPLACE TRIGGER settings_trigger
BEFORE INSERT ON settings
FOR EACH ROW
BEGIN
  IF :NEW.setting_id IS NULL THEN
    SELECT settings_seq.NEXTVAL INTO :NEW.setting_id FROM dual;
  END IF;
END;
/

COMMIT;
