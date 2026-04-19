-- Multi-Tenant Migration Script v2
-- Adds USER_ID to all core tables and establishes data isolation

-- 1. Suppliers
ALTER TABLE suppliers ADD "USER_ID" NUMBER;
CREATE INDEX idx_suppliers_user ON suppliers("USER_ID");
CREATE UNIQUE INDEX idx_suppliers_user_name ON suppliers(supplier_name, "USER_ID");

-- 2. Products
ALTER TABLE products ADD "USER_ID" NUMBER;
CREATE INDEX idx_products_user ON products("USER_ID");
CREATE UNIQUE INDEX idx_products_user_name ON products(product_name, "USER_ID");

-- 3. Customers
ALTER TABLE customers ADD "USER_ID" NUMBER;
CREATE INDEX idx_customers_user ON customers("USER_ID");
CREATE UNIQUE INDEX idx_customers_user_name ON customers(customer_name, "USER_ID");

-- 4. Purchases & Purchase Items
ALTER TABLE purchases ADD "USER_ID" NUMBER;
CREATE INDEX idx_purchases_user ON purchases("USER_ID");
ALTER TABLE purchase_items ADD "USER_ID" NUMBER;
CREATE INDEX idx_purchase_items_user ON purchase_items("USER_ID");

-- 5. Sales & Sale Items
ALTER TABLE sales ADD "USER_ID" NUMBER;
CREATE INDEX idx_sales_user ON sales("USER_ID");
ALTER TABLE sale_items ADD "USER_ID" NUMBER;
CREATE INDEX idx_sale_items_user ON sale_items("USER_ID");

-- 6. Returns
ALTER TABLE purchase_returns ADD "USER_ID" NUMBER;
CREATE INDEX idx_pr_user ON purchase_returns("USER_ID");
ALTER TABLE purchase_return_items ADD "USER_ID" NUMBER;
CREATE INDEX idx_pri_user ON purchase_return_items("USER_ID");
ALTER TABLE sale_returns ADD "USER_ID" NUMBER;
CREATE INDEX idx_sr_user ON sale_returns("USER_ID");
ALTER TABLE sale_return_items ADD "USER_ID" NUMBER;
CREATE INDEX idx_sri_user ON sale_return_items("USER_ID");

-- 7. Credit/Debit Notes
ALTER TABLE credit_debit_notes ADD "USER_ID" NUMBER;
CREATE INDEX idx_cdn_user ON credit_debit_notes("USER_ID");

-- 8. Onboarding & Business Profiles
ALTER TABLE businesses ADD "USER_ID" NUMBER;
CREATE INDEX idx_bus_user ON businesses("USER_ID");
ALTER TABLE business_profile ADD "USER_ID" NUMBER;
CREATE INDEX idx_bp_user ON business_profile("USER_ID");

-- 9. Settings Blocks
ALTER TABLE settings ADD "USER_ID" NUMBER;
CREATE INDEX idx_settings_user ON settings("USER_ID");
CREATE UNIQUE INDEX idx_settings_user_key ON settings(setting_key, "USER_ID");

ALTER TABLE invoice_settings ADD "USER_ID" NUMBER;
CREATE INDEX idx_invs_user ON invoice_settings("USER_ID");
ALTER TABLE tax_settings ADD "USER_ID" NUMBER;
CREATE INDEX idx_taxs_user ON tax_settings("USER_ID");
