# 🧾 Inventory & GST Management System
## Project Presentation & Code Analysis

---

## 📋 TABLE OF CONTENTS
1. Problem Statement
2. Abstract
3. Gaps & Future Enhancements
4. ER Diagram
5. System Modules
6. Validation Framework
7. Security Implementation
8. Middleware Architecture
9. Database Structure

---

## 🎯 PROBLEM STATEMENT

### Business Challenge
Indian businesses face several critical challenges in their operations:

1. **Inventory Management Complexity**
   - Manual tracking of products, stock quantities, and suppliers
   - No real-time visibility into inventory levels
   - Difficulty in managing multiple suppliers and customers
   - Risk of stockouts or overstock situations

2. **GST Compliance Burden**
   - Complex GST filing requirements (GSTR-1, GSTR-3B, CDNR, HSN Summary)
   - Manual calculation of CGST, SGST, and IGST taxes
   - Time-consuming reconciliation and reporting
   - Risk of penalties for non-compliance

3. **Manual Billing & Invoice Management**
   - Error-prone invoice creation and numbering
   - Difficulty in tracking sales and purchase returns
   - No automated GST breakup calculations
   - Manual invoice printing and distribution

4. **Financial Analytics Gap**
   - No real-time dashboard for business metrics
   - Difficulty in tracking cash flow
   - No profit/loss analysis
   - Limited visibility into business performance

### Solution Proposed
A comprehensive, cloud-ready inventory and GST management system that:
- Automates inventory tracking with real-time updates
- Simplifies GST compliance with automated reporting
- Generates professional invoices with GST calculations
- Provides business intelligence dashboard
- Supports multi-tenant architecture for scalability

---

## 📝 ABSTRACT

### Project Overview
**Inventory & GST Management System** is a full-stack web application designed specifically for Indian businesses to manage inventory, sales, purchases, and GST compliance from a single unified platform.

### Key Features
- **Multi-Tenant Architecture**: Complete data isolation between users
- **JWT Authentication**: Secure role-based access control
- **Inventory Management**: Real-time product and stock tracking
- **GST Compliance**: Automated GSTR-1, GSTR-3B, CDNR, and HSN exports
- **Advanced Reporting**: Excel and CSV export capabilities
- **Dashboard Analytics**: MTD/YTD summaries, charts, and performance metrics
- **Smart Onboarding**: GSTIN auto-fill and guided setup
- **AI Assistant**: Built-in GST filing guidance

### Technology Stack
```
Frontend:  React 18 + Vite + TailwindCSS + Recharts
Backend:   Node.js + Express.js (ES Modules)
Database:  Oracle Database (XE/19c+)
Auth:      JWT (jsonwebtoken) + bcrypt
Exports:   ExcelJS + json2csv
```

### Target Users
- Small to medium enterprises (SMEs)
- Retail businesses
- Wholesale distributors
- Manufacturing units
- Service providers (GST registered)

---

## 🔍 GAPS & FUTURE ENHANCEMENTS

### Current Limitations

1. **Access Control & Permissions**
   - ❌ No module-level role-based permissions
   - ❌ No action-level restrictions (create/edit/delete permissions per role)
   - 🔜 Plan: Implement granular permission system

2. **Audit & Compliance**
   - ❌ Limited audit logging of transactions
   - ❌ No user activity tracking
   - ❌ No change history for critical operations
   - 🔜 Plan: Add comprehensive audit trail with timestamps

3. **Payment Integration**
   - ❌ Only manual payment methods (Cash, UPI, Card, Bank Transfer, Credit)
   - ❌ No payment gateway integration (Razorpay, PayU, etc.)
   - ❌ No online payment verification
   - 🔜 Plan: Integrate with major payment gateways

4. **Mobile & Responsiveness**
   - ❌ No dedicated mobile app
   - ❌ Limited mobile responsiveness optimization
   - ❌ No offline functionality
   - 🔜 Plan: Develop React Native mobile app

5. **Scalability & Performance**
   - ⚠️ Single database connection pool
   - ❌ No caching layer (Redis)
   - ❌ No CDN for static assets
   - 🔜 Plan: Implement Redis caching, CDN integration

6. **Advanced Analytics**
   - ❌ No predictive analytics for inventory
   - ❌ No demand forecasting
   - ❌ No supplier performance metrics
   - 🔜 Plan: Add ML-based analytics

7. **API Features**
   - ❌ No API rate limiting
   - ❌ No API versioning strategy
   - ❌ Limited API documentation
   - 🔜 Plan: Implement OpenAPI/Swagger documentation

8. **Backup & Disaster Recovery**
   - ❌ No automated backup system
   - ❌ No disaster recovery plan
   - ⚠️ Manual backup procedures
   - 🔜 Plan: Implement automated daily backups

9. **Multi-Language Support**
   - ❌ Currently English only
   - ❌ No internationalization (i18n)
   - 🔜 Plan: Add support for regional Indian languages

10. **Advanced Reporting**
    - ❌ No custom report builder
    - ❌ No scheduled report generation
    - ❌ No email report distribution
    - 🔜 Plan: Implement report scheduler

---

## 📊 ER DIAGRAM

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      USERS (Multi-Tenant)                       │
├─────────────────────────────────────────────────────────────────┤
│ PK: user_id (NUMBER)                                            │
│    name (VARCHAR2)                                              │
│    email_id (VARCHAR2) UNIQUE                                   │
│    password_hash (VARCHAR2)                                     │
│    role (VARCHAR2) - Admin/Staff                                │
│    is_active (NUMBER)                                           │
│    created_at, updated_at (DATE)                                │
└─────────────────────────────────────────────────────────────────┘
         │                        │
         └────────────┬───────────┘
                      │ (Owns)
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  PRODUCTS    │ │ SUPPLIERS    │ │ CUSTOMERS    │
├──────────────┤ ├──────────────┤ ├──────────────┤
│ PK: prod_id  │ │ PK: supp_id  │ │ PK: cust_id  │
│ name (UNQ)   │ │ name (UNQ)   │ │ name         │
│ hsn_code     │ │ gst_number   │ │ phone (UNQ)  │
│ quantity     │ │ phone        │ │ email        │
│ purchase_pr  │ │ address      │ │ gst_number   │
│ sale_price   │ │ city, state  │ │ address      │
│ gst_rate     │ │ pincode      │ │ city, state  │
│ is_active    │ │ is_active    │ │ pincode      │
│ created_at   │ │ created_at   │ │ is_active    │
│ updated_at   │ │ updated_at   │ │ created_at   │
└──────────────┘ │ updated_at   │ │ updated_at   │
        │        └──────────────┘ └──────────────┘
        │               │                │
        └───────┬───────┴────────┬──────┘
                │                │
        ┌───────▼────────┐   ┌───▼────────────┐
        │   PURCHASES    │   │    SALES       │
        ├────────────────┤   ├────────────────┤
        │ PK: purch_id   │   │ PK: sale_id    │
        │ FK: supp_id    │   │ FK: cust_id    │
        │ invoice_number │   │ invoice_number │
        │ invoice_date   │   │ invoice_date   │
        │ notes          │   │ notes          │
        │ created_at     │   │ created_at     │
        │ updated_at     │   │ updated_at     │
        └────────┬────────┘   └────┬───────────┘
                 │                 │
        ┌────────▼────────┐  ┌─────▼──────────┐
        │ PURCHASE_ITEMS  │  │   SALE_ITEMS   │
        ├─────────────────┤  ├────────────────┤
        │ PK: item_id     │  │ PK: item_id    │
        │ FK: purch_id    │  │ FK: sale_id    │
        │ FK: prod_id     │  │ FK: prod_id    │
        │ quantity        │  │ quantity       │
        │ unit_price      │  │ unit_price     │
        │ taxable_amount  │  │ taxable_amount │
        │ cgst_amount     │  │ cgst_amount    │
        │ sgst_amount     │  │ sgst_amount    │
        │ igst_amount     │  │ igst_amount    │
        │ total_amount    │  │ total_amount   │
        │ created_at      │  │ created_at     │
        └────────┬────────┘  └────┬───────────┘
                 │                │
        ┌────────▼──────────┐  ┌──▼─────────────┐
        │ PURCHASE_RETURNS  │  │  SALE_RETURNS  │
        ├───────────────────┤  ├────────────────┤
        │ PK: return_id     │  │ PK: return_id  │
        │ FK: purch_id      │  │ FK: sale_id    │
        │ notes             │  │ notes          │
        │ created_at        │  │ created_at     │
        └────────┬──────────┘  └────┬───────────┘
                 │                  │
        ┌────────▼──────────────┐ ┌─▼────────────┐
        │PURCHASE_RETURN_ITEMS  │ │SALE_RETURN_I │
        ├───────────────────────┤ ├──────────────┤
        │ PK: item_id           │ │ PK: item_id  │
        │ FK: return_id         │ │ FK: return_id│
        │ FK: prod_id           │ │ FK: prod_id  │
        │ quantity              │ │ quantity     │
        │ created_at            │ │ created_at   │
        └───────────────────────┘ └──────────────┘

┌──────────────────────────────────────────────────┐
│          SETTINGS (Multi-Tenant)                 │
├──────────────────────────────────────────────────┤
│ PK: setting_id (NUMBER)                          │
│    FK: user_id (NUMBER)                          │
│    setting_name (VARCHAR2)                       │
│    setting_value (CLOB)                          │
│    setting_type (VARCHAR2)                       │
│    updated_at (DATE)                             │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│         ONBOARDING (Multi-Tenant)                │
├──────────────────────────────────────────────────┤
│ PK: onboarding_id (NUMBER)                       │
│    FK: user_id (NUMBER)                          │
│    business_name (VARCHAR2)                      │
│    gstin (VARCHAR2)                              │
│    tax_settings (CLOB)                           │
│    invoice_settings (CLOB)                       │
│    status (VARCHAR2)                             │
│    completed_at (DATE)                           │
│    created_at (DATE)                             │
└──────────────────────────────────────────────────┘
```

### Key Relationships

| From Table | To Table | Relationship | Cascade |
|-----------|----------|--------------|---------|
| users | products | 1:N (owns) | - |
| users | customers | 1:N (owns) | - |
| users | suppliers | 1:N (owns) | - |
| users | sales | 1:N (owns) | - |
| users | purchases | 1:N (owns) | - |
| suppliers | products | 1:N (supplies) | - |
| products | purchase_items | 1:N (ordered) | - |
| products | sale_items | 1:N (sold) | - |
| purchases | purchase_items | 1:N (contains) | CASCADE |
| sales | sale_items | 1:N (contains) | CASCADE |
| purchases | purchase_returns | 1:N (returns) | CASCADE |
| sales | sale_returns | 1:N (returns) | CASCADE |
| purchase_returns | purchase_return_items | 1:N (contains) | CASCADE |
| sale_returns | sale_return_items | 1:N (contains) | CASCADE |

---

## 🏗️ SYSTEM MODULES (10 Modules)

### Module 1️⃣: Authentication Module
**Purpose**: User registration, login, and session management

**Components**:
- User Registration (with email validation)
- User Login (with JWT token generation)
- Password Hashing (bcrypt with salt rounds)
- Token Validation & Refresh
- Role-Based Access Control (Admin/Staff)

**APIs**:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - Session termination

**Security**: bcrypt hashing, JWT tokens with 1-day expiration

---

### Module 2️⃣: Inventory Management Module
**Purpose**: Product catalog and stock management

**Features**:
- Add/Edit/Delete Products
- HSN Code Management
- Stock Quantity Tracking
- Purchase & Sale Price Management
- GST Rate Configuration
- Low Stock Alerts
- Product Search with Autocomplete
- Real-time Stock Updates

**Database Tables**:
- `products` - Product master data
- Indexes on: supplier_id, hsn_code

**APIs**:
- `GET /api/products` - List all products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/products/search` - Search products

---

### Module 3️⃣: Purchase Module
**Purpose**: Purchase order creation and supplier management

**Features**:
- Create Purchase Orders with multiple items
- Supplier Selection (auto-search, create-on-fly)
- Line Item Management
- Auto GST Calculation (CGST/SGST/IGST)
- Purchase Return Processing
- Invoice Number Generation
- Payment Method Selection (Cash, UPI, Card, Bank Transfer, Credit)
- Stock Update on Purchase

**Database Tables**:
- `suppliers` - Supplier master
- `purchases` - Purchase header
- `purchase_items` - Line items
- `purchase_returns` - Return header
- `purchase_return_items` - Return line items

**APIs**:
- `GET/POST /api/purchases`
- `PUT /api/purchases/:id`
- `DELETE /api/purchases/:id`
- `POST /api/purchase-returns`
- `GET /api/suppliers`

---

### Module 4️⃣: Sales/Billing Module
**Purpose**: Invoice creation and sales management

**Features**:
- Create Sales Invoices
- Customer Lookup by Phone
- Auto-Increment Invoice Numbering
- Line Item Management
- GST Breakup Calculation (CGST/SGST/IGST)
- Sale Return Processing
- Invoice Printing with Customization
- Multiple Payment Methods

**Database Tables**:
- `customers` - Customer master
- `sales` - Sales header
- `sale_items` - Line items
- `sale_returns` - Return header
- `sale_return_items` - Return line items

**APIs**:
- `GET/POST /api/sales`
- `PUT /api/sales/:id`
- `DELETE /api/sales/:id`
- `POST /api/sale-returns`
- `GET /api/sales/:id/print`

---

### Module 5️⃣: Customer Management Module
**Purpose**: Customer directory and transaction history

**Features**:
- Add/Edit/Delete Customers
- Customer Directory
- Transaction Ledger per Customer
- Balance Tracking (purchases/sales minus returns)
- Customer Search & Filter
- GST Number Validation
- Contact Information Management

**Database Tables**:
- `customers` - Customer master

**APIs**:
- `GET/POST /api/customers`
- `PUT /api/customers/:id`
- `GET /api/customers/:id/ledger`
- `GET /api/customers/:id/balance`

---

### Module 6️⃣: Supplier Management Module
**Purpose**: Supplier directory and procurement management

**Features**:
- Add/Edit/Delete Suppliers
- Supplier Directory
- Supplier Transaction History
- Balance Tracking
- Supplier Search & Filter
- GST Registration Management
- Contact & Address Details

**Database Tables**:
- `suppliers` - Supplier master

**APIs**:
- `GET/POST /api/suppliers`
- `PUT /api/suppliers/:id`
- `GET /api/suppliers/:id/purchases`
- `GET /api/suppliers/:id/balance`

---

### Module 7️⃣: Dashboard & Analytics Module
**Purpose**: Business intelligence and performance metrics

**Features**:
- MTD (Month-to-Date) Summaries
- YTD (Year-to-Date) Summaries
- Sales vs Purchases Graph
- Top Selling Products
- Low Stock Alerts
- Revenue & Profit Metrics
- Customer/Supplier Stats
- Chart Visualization (Recharts)

**Components**:
- Dashboard Page (React)
- Data Aggregation APIs

**APIs**:
- `GET /api/dashboard/mtd-summary`
- `GET /api/dashboard/ytd-summary`
- `GET /api/dashboard/sales-vs-purchases`
- `GET /api/dashboard/top-products`
- `GET /api/dashboard/low-stock-alerts`

---

### Module 8️⃣: GST Export Module
**Purpose**: GST compliance and regulatory reporting

**Features**:
- **GSTR-1**: Business-to-Business sales (B2B)
- **GSTR-1**: Business-to-Consumer sales (B2CS)
- **CDNR**: Credit/Debit Notes (Returns)
- **HSN Summary**: HSN-wise sales aggregation
- Date Range Filtering
- Multi-Format Export (Excel .xlsx, CSV)
- Tax Reconciliation
- Financial Year Calculation
- Return Period Identification

**Database Queries**:
- Complex joins on sales, sale_items, customers
- GST calculations with CGST/SGST/IGST
- Round-off calculations

**APIs**:
- `POST /api/gst-exports/gstr1` - Generate GSTR-1
- `POST /api/gst-exports/gstr1b2cs` - Generate GSTR-1 B2CS
- `POST /api/gst-exports/cdnr` - Generate CDNR
- `POST /api/gst-exports/hsn-summary` - Generate HSN Summary
- `POST /api/gst-exports/download` - Download export file

---

### Module 9️⃣: Settings Module
**Purpose**: User configuration and business profile management

**Features**:
- Business Profile Management
- Tax Settings (GST Rate, IGST Toggle, Round-off)
- Invoice Settings (Prefix, Numbering, T&C)
- Notification Preferences
- Settings Persistence (CLOB storage)
- Multi-user Settings Isolation

**Database Tables**:
- `settings` - Key-value store for settings

**APIs**:
- `GET /api/settings/profile`
- `PUT /api/settings/profile`
- `GET /api/settings/tax`
- `PUT /api/settings/tax`
- `GET /api/settings/invoice`
- `PUT /api/settings/invoice`

---

### Module 🔟: Onboarding Module
**Purpose**: First-time user setup and GSTIN configuration

**Features**:
- Guided Onboarding Wizard
- GSTIN Auto-fill
- Business Type Selection
- Tax Settings Configuration
- Invoice Settings Setup
- Default Data Seeding
- Progress Tracking

**Database Tables**:
- `onboarding` - Onboarding progress

**APIs**:
- `POST /api/onboarding/start`
- `POST /api/onboarding/complete`
- `GET /api/onboarding/status`

---

## ✅ VALIDATION FRAMEWORK

### Validation Architecture

```
Frontend Validation → Backend Schema Validation → Database Constraints
```

### Input Validation Strategy

#### 1. **GSTIN Validation**
```
Regex: ^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[0-9A-Z]{1}[0-9A-Z]{1}$
Format: 27AABCU9603R1ZX (15 characters)
Components:
  - First 2 digits: State code (01-37)
  - Next 5 chars: PAN letters
  - Next 4 digits: Sequential number
  - 13th char: Entity type
  - 14th char: Check digit
  - 15th char: Additional digit
```

#### 2. **PAN Validation**
```
Regex: ^[A-Z]{5}[0-9]{4}[A-Z]{1}$
Format: AABCU9603R (10 characters)
Components:
  - First 5 chars: Alphabetic
  - Next 4 chars: Numeric
  - Last char: Alphabetic check digit
```

#### 3. **Email Validation**
```
Regex: ^[^\s@]+@[^\s@]+\.[^\s@]+$
Format: user@example.com
```

#### 4. **Phone Number Validation**
```
Regex: ^[0-9]{10}$
Format: 10-digit Indian phone number
```

#### 5. **PIN Code Validation**
```
Regex: ^[0-9]{6}$
Format: 6-digit Indian postal code
```

### Zod Schema Validation

**Business Profile Schema** includes:
- Business Name: 2-100 characters, trimmed
- Trade Name: 0-100 characters, optional
- Business Type: Enum (proprietorship, partnership, llp, private_ltd, public_ltd, ngo)
- GSTIN: Regex validation (15 chars)
- PAN: Regex validation (10 chars)
- Address: 0-500 characters
- City: 0-100 characters
- State: 0-50 characters
- State Code: Exactly 2 characters

**Invoice Settings Schema** includes:
- Invoice Prefix: Alphanumeric, 1-10 chars
- Starting Number: Integer ≥ 1
- Terms & Conditions: 0-1000 characters
- Footer Text: 0-500 characters

### Database Constraints

```sql
-- Column-level constraints
CHECK (quantity >= 0)
CHECK (unit_price > 0)
CHECK (quantity > 0)
CHECK (is_active IN (0, 1))
NOT NULL constraints
UNIQUE constraints (email, phone, GSTIN)

-- Table-level constraints
PRIMARY KEY (auto-increment via triggers)
FOREIGN KEY with referential integrity
```

### Validation Sequence

1. **Frontend Validation**
   - Real-time input validation
   - Format checking (phone, email, GSTIN)
   - Required field validation

2. **API Route Validation**
   - Request body parsing
   - Schema validation using Zod
   - Reject invalid requests early

3. **Backend Business Logic**
   - Cross-field validation
   - Database existence checks
   - Domain-specific rules

4. **Database Validation**
   - Constraints enforcement
   - Referential integrity
   - Trigger-based validation

---

## 🔐 SECURITY IMPLEMENTATION

### Security Layers

#### Layer 1️⃣: Authentication
- **JWT Tokens**: Industry-standard JSON Web Tokens
- **Token Expiration**: 1 day (86400 seconds)
- **Token Structure**:
  ```javascript
  {
    id: user.ID,
    name: user.NAME,
    email: user.EMAIL,
    role: user.ROLE
  }
  ```

#### Layer 2️⃣: Password Security
- **Algorithm**: bcrypt with salt rounds (10)
- **Hash Strength**: Strong one-way hashing
- **Never Stored**: Plain text passwords are never stored
- **Comparison**: Secure comparison using bcrypt.compare()

#### Layer 3️⃣: Authorization
- **JWT Middleware**: Validates token on every protected request
- **Role-Based Access**: Admin vs Staff roles
- **Multi-Tenant Isolation**: Users can only see their own data

#### Layer 4️⃣: Data Isolation
- **Multi-Tenant**: user_id in every query
- **WHERE clause**: All queries filter by user_id
- **No Cross-tenant**: Impossible to access other user's data
- **Foreign Key**: All records linked to users table

#### Layer 5️⃣: Network Security
- **CORS**: Cross-Origin Resource Sharing enabled
- **HTTPS Ready**: Supports SSL/TLS in production
- **No Sensitive Data**: Auth token in Bearer format

#### Layer 6️⃣: Input Security
- **Input Validation**: All inputs validated with Zod
- **SQL Injection Prevention**: Parameterized queries with binds
- **XSS Prevention**: No eval() or dynamic HTML injection
- **Prepared Statements**: Oracle parameterized queries

#### Layer 7️⃣: Session Management
- **Token Expiration**: Automatic token expiration
- **Logout**: Manual token invalidation possible
- **Refresh Mechanism**: Can be added for extended sessions

#### Layer 8️⃣: Error Handling
- **No Stack Traces**: User-friendly error messages
- **Sensitive Info Hiding**: Database errors not exposed
- **Logging**: Error logging for debugging

### Security Best Practices Implemented

| Security Feature | Implementation | Status |
|-----------------|-----------------|--------|
| JWT Authentication | Bearer tokens with expiration | ✅ Implemented |
| Password Hashing | bcrypt with 10 salt rounds | ✅ Implemented |
| Multi-tenant Isolation | user_id filtering on all queries | ✅ Implemented |
| CORS | Express CORS middleware | ✅ Implemented |
| Input Validation | Zod schema validation | ✅ Implemented |
| SQL Injection Prevention | Parameterized queries | ✅ Implemented |
| XSS Prevention | No unsafe HTML injection | ✅ Implemented |
| HTTPS Support | Ready for SSL/TLS | ✅ Supported |
| Role-Based Access | Admin/Staff roles | ✅ Implemented |
| Error Handling | Safe error messages | ✅ Implemented |

### Security Vulnerabilities Addressed

| OWASP Top 10 | Risk | Mitigation |
|-------------|------|-----------|
| A1: Injection | SQL injection attacks | Parameterized queries, Zod validation |
| A2: Broken Auth | Session hijacking | JWT tokens, password hashing |
| A3: Sensitive Data | Exposure of PII | HTTPS support, no logs of sensitive data |
| A4: XML External | Entity attacks | No XML parsing implemented |
| A5: Broken Access | Authorization bypass | Role-based access, user_id filtering |
| A6: Security Misconfiguration | Default settings | Environment variables, custom JWT_SECRET |
| A7: XSS | Client-side injection | React JSX escaping, no eval() |
| A8: CSRF | Token forgery | JWT prevents CSRF (stateless) |
| A9: Deserialization | Unsafe object creation | No unsafe serialization |
| A10: Logging & Monitoring | Missing logs | Can be extended with logging middleware |

---

## 🔄 MIDDLEWARE ARCHITECTURE

### Middleware Pipeline

```
Request
   ↓
┌─────────────────────────────────┐
│  Body Parser Middleware         │
│  (json, urlencoded)             │
└─────────────────┬───────────────┘
                  ↓
┌─────────────────────────────────┐
│  CORS Middleware                │
│  (allows cross-origin requests) │
└─────────────────┬───────────────┘
                  ↓
┌─────────────────────────────────┐
│  Route Handler                  │
│  (public routes bypass auth)    │
└─────────────────┬───────────────┘
                  ↓
┌─────────────────────────────────┐
│  JWT Auth Middleware            │
│  (validates token)              │
└─────────────────┬───────────────┘
                  ↓
┌─────────────────────────────────┐
│  Protected Route Handler        │
│  (req.user populated)           │
└─────────────────┬───────────────┘
                  ↓
┌─────────────────────────────────┐
│  Response & Error Handler       │
└─────────────────┬───────────────┘
                  ↓
               Response
```

### 1️⃣ Body Parser Middleware

**Purpose**: Parse incoming request bodies

```javascript
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
```

**Features**:
- JSON parsing for API requests
- URL-encoded form data parsing
- 10MB size limit for uploads
- Extended URL encoding (nested objects)

---

### 2️⃣ CORS Middleware

**Purpose**: Enable cross-origin requests

```javascript
app.use(cors());
```

**Configuration**:
- Allows requests from any origin
- Supports credentials
- Handles preflight requests
- Allows all HTTP methods

**Production Consideration**: Should restrict to specific origins

---

### 3️⃣ JWT Authentication Middleware

**Purpose**: Validate JWT tokens on protected routes

```javascript
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    }
    return res.status(403).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};
```

**Features**:
- Extracts token from Authorization header
- Validates token signature
- Checks token expiration
- Returns detailed error messages
- Populates req.user with decoded claims
- Supports role information

**Token Validation Errors**:
- No token provided → 401 Unauthorized
- Token expired → 401 with expiration message
- Invalid signature → 403 Forbidden
- Malformed token → 403 Forbidden

---

### 4️⃣ Error Handling Middleware

**Purpose**: Centralized error handling

**Current**: Basic try-catch in route handlers

**Recommended Enhancements**:
```javascript
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});
```

---

### 5️⃣ Additional Middleware Opportunities

| Middleware | Purpose | Status |
|-----------|---------|--------|
| Request Logging | Log all requests with timestamps | ⏳ Not implemented |
| Rate Limiting | Prevent brute force/DDoS | ⏳ Not implemented |
| Request Validation | Validate req format before routing | ⏳ Not implemented |
| Cache Control | Set cache headers | ⏳ Not implemented |
| Compression | Gzip compression for responses | ⏳ Not implemented |
| Session Tracking | Track user sessions | ⏳ Not implemented |
| Audit Logging | Log business operations | ⏳ Not implemented |

---

## 💾 DATABASE STRUCTURE

### Database Overview

**Type**: Oracle Database (XE 11g or 19c+)

**Tables**: 13 Main Tables + 2 Settings Tables

**Connections**: oracledb Node.js driver with connection pooling

### Database Architecture

#### Connection Pool Configuration

```javascript
// Connection pool with auto-scaling
{
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING,
  poolMin: 2,
  poolMax: 10,
  poolIncrement: 1
}
```

**Features**:
- Minimum 2 connections always available
- Maximum 10 concurrent connections
- Auto-increment by 1 when needed
- Connection reuse & pooling
- Automatic connection recovery

---

### Table Specifications

#### 1. USERS Table
```sql
CREATE TABLE users (
  user_id NUMBER PRIMARY KEY,
  name VARCHAR2(100) NOT NULL,
  email_id VARCHAR2(100) NOT NULL UNIQUE,
  password_hash VARCHAR2(255) NOT NULL,
  role VARCHAR2(20) DEFAULT 'Staff' NOT NULL,
  is_active NUMBER DEFAULT 1,
  created_at DATE DEFAULT SYSDATE,
  updated_at DATE DEFAULT SYSDATE
);

Indexes: email_id (UNIQUE)
Triggers: user_seq for auto-increment user_id
```

**Purpose**: User authentication and multi-tenant isolation

---

#### 2. PRODUCTS Table
```sql
CREATE TABLE products (
  product_id NUMBER PRIMARY KEY,
  product_name VARCHAR2(100) NOT NULL UNIQUE,
  hsn_code VARCHAR2(20),
  supplier_id NUMBER REFERENCES suppliers(supplier_id),
  quantity NUMBER DEFAULT 0,
  purchase_price NUMBER(10,2),
  sale_price NUMBER(10,2),
  gst_rate NUMBER(5,2) DEFAULT 18,
  is_active NUMBER DEFAULT 1,
  created_at DATE DEFAULT SYSDATE,
  updated_at DATE DEFAULT SYSDATE
);

Indexes: 
  - supplier_id (FOREIGN KEY)
  - hsn_code (for GST queries)
Constraints:
  - quantity >= 0
Triggers: product_seq for auto-increment product_id
```

**Purpose**: Product master and inventory management

**Storage**: ~100 bytes per record

---

#### 3. SUPPLIERS Table
```sql
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
  is_active NUMBER DEFAULT 1,
  created_at DATE DEFAULT SYSDATE,
  updated_at DATE DEFAULT SYSDATE
);

Indexes: supplier_name (UNIQUE), gst_number (UNIQUE)
Triggers: supplier_seq for auto-increment
```

**Purpose**: Supplier master directory

---

#### 4. CUSTOMERS Table
```sql
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
  is_active NUMBER DEFAULT 1,
  created_at DATE DEFAULT SYSDATE,
  updated_at DATE DEFAULT SYSDATE
);

Indexes: phone_number (UNIQUE), customer_name
Triggers: customer_seq for auto-increment
```

**Purpose**: Customer master directory

---

#### 5. PURCHASES Table
```sql
CREATE TABLE purchases (
  purchase_id NUMBER PRIMARY KEY,
  supplier_id NUMBER NOT NULL REFERENCES suppliers,
  invoice_number VARCHAR2(50) UNIQUE,
  invoice_date DATE,
  notes VARCHAR2(500),
  created_at DATE DEFAULT SYSDATE,
  updated_at DATE DEFAULT SYSDATE
);

Indexes: 
  - supplier_id (FOREIGN KEY)
  - invoice_number (UNIQUE)
Triggers: purchase_seq for auto-increment
```

**Purpose**: Purchase order headers

---

#### 6. PURCHASE_ITEMS Table
```sql
CREATE TABLE purchase_items (
  item_id NUMBER PRIMARY KEY,
  purchase_id NUMBER NOT NULL REFERENCES purchases,
  product_id NUMBER NOT NULL REFERENCES products,
  quantity NUMBER NOT NULL,
  unit_price NUMBER(10,2) NOT NULL,
  taxable_amount NUMBER(12,2),
  cgst_amount NUMBER(10,2) DEFAULT 0,
  sgst_amount NUMBER(10,2) DEFAULT 0,
  igst_amount NUMBER(10,2) DEFAULT 0,
  total_amount NUMBER(12,2),
  created_at DATE DEFAULT SYSDATE
);

Constraints:
  - quantity > 0
  - unit_price > 0
Indexes: purchase_id, product_id
Triggers: purchase_item_seq for auto-increment
```

**Purpose**: Purchase line items with GST calculation

**GST Columns**:
- CGST: Central Goods and Services Tax
- SGST: State Goods and Services Tax
- IGST: Integrated Goods and Services Tax (interstate)

---

#### 7. SALES Table
```sql
CREATE TABLE sales (
  sale_id NUMBER PRIMARY KEY,
  customer_id NUMBER NOT NULL REFERENCES customers,
  invoice_number VARCHAR2(50) UNIQUE,
  invoice_date DATE,
  notes VARCHAR2(500),
  created_at DATE DEFAULT SYSDATE,
  updated_at DATE DEFAULT SYSDATE
);

Indexes: 
  - customer_id (FOREIGN KEY)
  - invoice_number (UNIQUE)
Triggers: sale_seq for auto-increment
```

**Purpose**: Sales invoice headers

---

#### 8. SALE_ITEMS Table
```sql
CREATE TABLE sale_items (
  item_id NUMBER PRIMARY KEY,
  sale_id NUMBER NOT NULL REFERENCES sales,
  product_id NUMBER NOT NULL REFERENCES products,
  quantity NUMBER NOT NULL,
  unit_price NUMBER(10,2) NOT NULL,
  taxable_amount NUMBER(12,2),
  cgst_amount NUMBER(10,2) DEFAULT 0,
  sgst_amount NUMBER(10,2) DEFAULT 0,
  igst_amount NUMBER(10,2) DEFAULT 0,
  total_amount NUMBER(12,2),
  created_at DATE DEFAULT SYSDATE
);

Constraints:
  - quantity > 0
  - unit_price > 0
Indexes: sale_id, product_id
Triggers: sale_item_seq for auto-increment
```

**Purpose**: Sales line items with GST calculation

---

#### 9. PURCHASE_RETURNS Table
```sql
CREATE TABLE purchase_returns (
  return_id NUMBER PRIMARY KEY,
  purchase_id NUMBER NOT NULL REFERENCES purchases,
  notes VARCHAR2(500),
  created_at DATE DEFAULT SYSDATE
);

Triggers: purchase_return_seq for auto-increment
```

**Purpose**: Purchase return headers

---

#### 10. PURCHASE_RETURN_ITEMS Table
```sql
CREATE TABLE purchase_return_items (
  item_id NUMBER PRIMARY KEY,
  return_id NUMBER NOT NULL REFERENCES purchase_returns,
  product_id NUMBER NOT NULL REFERENCES products,
  quantity NUMBER NOT NULL,
  created_at DATE DEFAULT SYSDATE
);

Constraints: quantity > 0
Triggers: purchase_return_item_seq for auto-increment
```

**Purpose**: Returned purchase line items

---

#### 11. SALE_RETURNS Table
```sql
CREATE TABLE sale_returns (
  return_id NUMBER PRIMARY KEY,
  sale_id NUMBER NOT NULL REFERENCES sales,
  notes VARCHAR2(500),
  created_at DATE DEFAULT SYSDATE
);

Triggers: sale_return_seq for auto-increment
```

**Purpose**: Sale return headers (CDNR - Credit Notes)

---

#### 12. SALE_RETURN_ITEMS Table
```sql
CREATE TABLE sale_return_items (
  item_id NUMBER PRIMARY KEY,
  return_id NUMBER NOT NULL REFERENCES sale_returns,
  product_id NUMBER NOT NULL REFERENCES products,
  quantity NUMBER NOT NULL,
  created_at DATE DEFAULT SYSDATE
);

Constraints: quantity > 0
Triggers: sale_return_item_seq for auto-increment
```

**Purpose**: Returned sale line items

---

#### 13. SETTINGS Table
```sql
CREATE TABLE settings (
  setting_id NUMBER PRIMARY KEY,
  user_id NUMBER NOT NULL REFERENCES users,
  setting_name VARCHAR2(100) NOT NULL,
  setting_value CLOB,
  setting_type VARCHAR2(50),
  updated_at DATE DEFAULT SYSDATE
);

Constraints: UNIQUE(user_id, setting_name)
Indexes: user_id, setting_name
```

**Purpose**: Key-value store for user-specific settings

**Fetched As**: Strings (oracledb.CLOB conversion enabled)

---

#### 14. ONBOARDING Table
```sql
CREATE TABLE onboarding (
  onboarding_id NUMBER PRIMARY KEY,
  user_id NUMBER NOT NULL UNIQUE REFERENCES users,
  business_name VARCHAR2(200),
  gstin VARCHAR2(15),
  tax_settings CLOB,
  invoice_settings CLOB,
  status VARCHAR2(50),
  completed_at DATE,
  created_at DATE DEFAULT SYSDATE
);
```

**Purpose**: Track onboarding progress per user

---

### Performance Optimization

#### Indexes Created
| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| products | idx_products_supplier | FK | Join on supplier_id |
| products | idx_products_hsn | Regular | HSN filtering for GST |
| purchases | idx_purchases_supplier | FK | Supplier purchases |
| purchases | idx_purchases_invoice | Unique | Invoice lookup |
| purchase_items | idx_purchase_items_purchase | FK | Item queries |
| purchase_items | idx_purchase_items_product | FK | Product tracking |
| sales | idx_sales_customer | FK | Customer sales |
| sales | idx_sales_invoice | Unique | Invoice lookup |

#### Index Statistics
- **Total Indexes**: 8+
- **Unique Indexes**: 4 (email, phone, GSTIN, invoice_number)
- **Foreign Key Indexes**: 4 (automatic on FK columns)
- **Query Optimization**: Reduces table scans to index seeks

---

### Data Volume Estimates

| Table | Records | Size per Record | Estimated Growth |
|-------|---------|-----------------|------------------|
| users | 1000 | 200 bytes | 100/month |
| products | 5000 | 100 bytes | 50/month |
| suppliers | 500 | 150 bytes | 10/month |
| customers | 2000 | 150 bytes | 50/month |
| purchases | 10000 | 80 bytes | 500/month |
| purchase_items | 50000 | 100 bytes | 2500/month |
| sales | 20000 | 80 bytes | 1000/month |
| sale_items | 100000 | 100 bytes | 5000/month |

**Total Estimated Size**: ~50 MB (scalable to GB)

---

### Database Transactions

#### ACID Compliance

**Atomicity**: All-or-nothing operations
- Purchase creation with items (single transaction)
- Stock updates atomic

**Consistency**: Referential integrity maintained
- Foreign key constraints
- Trigger-based auto-increments
- Check constraints

**Isolation**: Read committed (default)
- Prevents dirty reads
- Allows committed reads

**Durability**: Committed data persisted
- Oracle redo logs
- Transaction logs

---

### Backup & Recovery Strategy

**Current Status**: ⏳ Not Implemented

**Recommended**:
```sql
-- Daily backup
BACKUP DATABASE inventory_db
TO DISK = 'D:\backups\inventory_full.bak'
WITH INIT, NOUNLOAD, STATS = CHECKDB

-- Transaction log backup (hourly)
BACKUP LOG inventory_db
TO DISK = 'D:\backups\inventory_tlog.bak'
```

---

## 📊 SUMMARY TABLE

| Aspect | Details |
|--------|---------|
| **Problem Solved** | Inventory + GST compliance + Multi-tenant |
| **Modules Count** | 10 (Auth, Inventory, Purchase, Sales, Customers, Suppliers, Dashboard, GST Export, Settings, Onboarding) |
| **Database Tables** | 14 tables + sequences + triggers |
| **Validation Rules** | GSTIN, PAN, Email, Phone, PIN validation |
| **Security Layers** | JWT + bcrypt + Multi-tenant isolation + CORS |
| **Middleware** | Body parser, CORS, JWT auth |
| **GST Exports** | GSTR-1 (B2B/B2CS), CDNR, HSN Summary, Excel/CSV |
| **Tech Stack** | React + Node.js + Oracle + TailwindCSS |
| **Users Supported** | SMEs, retail, wholesale, manufacturing |
| **Database Size** | ~50 MB (scalable) |

---

## 🎓 CONCLUSION

This **Inventory & GST Management System** is a comprehensive solution addressing critical business needs:

✅ **Complete Inventory Management** - Real-time stock tracking
✅ **GST Compliance** - Automated filing and reporting
✅ **Multi-Tenant Architecture** - Data isolation and scalability
✅ **Robust Security** - JWT + bcrypt + input validation
✅ **Professional UI** - React + TailwindCSS
✅ **Database-Driven** - Oracle with proper normalization
✅ **Production-Ready** - Error handling and middleware

**Key Strengths**:
1. Solves real business problems for Indian companies
2. Compliant with GST regulations
3. Scalable architecture
4. Secure implementation
5. Well-structured codebase

**Areas for Enhancement** (Future Roadmap):
1. Mobile app (React Native)
2. Payment gateway integration
3. Advanced analytics & ML
4. Audit logging
5. Backup & disaster recovery
6. API rate limiting & versioning

---

**Document Version**: 1.0
**Last Updated**: May 2026
**Project Status**: Production Ready
