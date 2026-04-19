# 🧾 Inventory & GST Management System

A **full-stack, multi-tenant Inventory Management System** with built-in **GST compliance**, designed for Indian businesses. Manage products, purchases, sales, customers, suppliers, and generate GST-ready export reports — all from a single dashboard.

---

## ✨ Features

### 🔐 Authentication & Multi-Tenancy
- JWT-based authentication (Register / Login)
- Multi-tenant data isolation — each user sees only their own data
- Role-based access (Admin / Staff)
- Smart onboarding wizard with GSTIN auto-fill

### 📦 Inventory Management
- Add, edit, and delete products with HSN codes
- Track stock quantities in real-time
- Quick stock adjustments (add/set modes)
- Product search with autocomplete
- Low-stock alerts on the dashboard

### 🛒 Purchase Module
- Create purchases with multi-item line entries
- Supplier auto-search and create-on-the-fly
- Auto GST calculation (CGST/SGST/IGST) based on product rates
- Purchase returns with stock reversal
- Multiple payment methods (Cash, UPI, Card, Bank Transfer, Credit)

### 💰 Sales / Billing Module
- Create sales invoices with auto-generated invoice numbers
- Customer lookup by phone number
- GST breakup per item (CGST + SGST or IGST)
- Sale returns with stock and GST reversal
- Invoice printing with customizable templates

### 👥 Customer & Supplier Management
- Full directory with aggregated stats
- Transaction ledger per customer/supplier
- Balance tracking (total purchases/sales minus returns)
- Search and filter capabilities

### 📊 Dashboard & Analytics
- Month-to-date (MTD) and Year-to-date (YTD) summaries
- Sales vs Purchases graph (Recharts)
- Top selling products
- Low stock alerts
- Revenue and profit metrics

### 📤 GST Export Reports
- **GSTR-1 (B2B)** — Business-to-business sales
- **GSTR-1 (B2CS)** — Business-to-consumer sales
- **CDNR** — Credit/Debit notes (Returns)
- **HSN Summary** — HSN-wise sales summary
- Export to **Excel (.xlsx)** and **CSV** formats
- Custom date range filtering

### ⚙️ Settings Module
- Business profile management
- Tax settings (default GST rate, IGST toggle, round-off)
- Invoice settings (prefix, numbering, terms & conditions)
- Notification preferences

### 🤖 GST Filing Assistant
- Built-in AI assistant for GST filing guidance
- ITC claim advice and reconciliation help
- Tax regulation references (CGST Act, 2017)

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, TailwindCSS |
| **UI Components** | Lucide React (icons), Framer Motion (animations), Recharts (charts) |
| **Routing** | React Router DOM v6 |
| **Backend** | Node.js, Express.js (ES Modules) |
| **Database** | Oracle Database (XE/19c+) via `oracledb` |
| **Auth** | JWT (jsonwebtoken) + bcrypt |
| **Exports** | ExcelJS (.xlsx), json2csv (.csv) |

---

## 📂 Project Structure

```
VENK/
├── backend/
│   ├── server.js                  # Main Express server (all API routes)
│   ├── db.js                      # Oracle DB connection pool
│   ├── package.json
│   ├── .env.example               # Environment variable template
│   ├── middleware/
│   │   └── auth.js                # JWT authentication middleware
│   ├── controllers/
│   │   ├── gstExportController.js # GST export logic (B2B, B2CS, CDNR, HSN)
│   │   └── onboardingController.js
│   ├── routes/
│   │   ├── gstExports.js          # GST export route definitions
│   │   └── onboarding.js
│   ├── utils/
│   │   └── gstUtils.js            # GST calculation utilities
│   ├── settings-module/           # Modular settings system
│   │   ├── db.js
│   │   ├── middleware/auth.js
│   │   └── validators/settingsValidators.js
│   └── schema.sql                 # Database schema definition
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx               # React entry point
│       ├── App.jsx                # Root component + routing
│       ├── index.css              # Global styles
│       ├── context/
│       │   ├── AuthContext.jsx     # Auth state management
│       │   └── ThemeContext.jsx    # Theme provider (dark mode)
│       ├── components/
│       │   ├── Layout.jsx         # App shell (sidebar + content)
│       │   ├── ProtectedRoute.jsx # Auth route guard
│       │   ├── Autocomplete.jsx   # Searchable product dropdown
│       │   ├── GstAssistant.jsx   # AI GST filing assistant
│       │   ├── gst/
│       │   │   └── DateRangePicker.jsx
│       │   └── settings/
│       │       ├── BusinessProfile.jsx
│       │       ├── TaxSettings.jsx
│       │       ├── InvoiceSettings.jsx
│       │       ├── NotificationSettings.jsx
│       │       └── ...            # Reusable form components
│       ├── pages/
│       │   ├── Dashboard.jsx      # Analytics dashboard
│       │   ├── Inventory.jsx      # Product management
│       │   ├── Purchase.jsx       # Purchase module
│       │   ├── Sales.jsx          # Sales / billing
│       │   ├── Customers.jsx      # Customer directory
│       │   ├── Suppliers.jsx      # Supplier directory
│       │   ├── Export.jsx         # GST export reports
│       │   ├── Settings.jsx       # App settings
│       │   ├── Login.jsx          # Login page
│       │   ├── Register.jsx       # Registration page
│       │   └── Onboarding.jsx     # Setup wizard
│       ├── services/
│       │   └── gstExportService.js
│       └── utils/
│           ├── gstHelpers.js      # GST calculation helpers
│           └── printUtils.js      # Invoice print utilities
│
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ — [Download](https://nodejs.org/)
- **Oracle Database** (XE or 19c+) — [Download](https://www.oracle.com/database/technologies/xe-downloads.html)
- **Oracle Instant Client** — Required by `oracledb` npm package

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/VENK.git
cd VENK
```

### 2. Set Up the Database

1. Connect to your Oracle database as a DBA
2. Run the schema file to create all tables, sequences, and triggers:

```sql
-- Run in SQL*Plus or SQL Developer
@backend/schema.sql
```

This creates the following tables:
- `users` — User accounts
- `suppliers` — Supplier directory
- `products` — Product catalog
- `customers` — Customer directory
- `purchases` / `purchase_items` — Purchase transactions
- `purchase_returns` / `purchase_return_items` — Purchase returns
- `sales` / `sale_items` — Sales transactions
- `sale_returns` / `sale_return_items` — Sale returns
- `business_profiles` — Business settings
- `tax_settings` / `invoice_settings` — GST configuration

### 3. Configure the Backend

```bash
cd backend
npm install
```

Create a `.env` file (use `.env.example` as a template):

```env
# Oracle Database Configuration
ORACLE_USER=your_oracle_username
ORACLE_PASSWORD=your_oracle_password
ORACLE_CONNECT=localhost:1521/XEPDB1

# Server Configuration
PORT=8080
NODE_ENV=development
JWT_SECRET=your_secure_random_jwt_secret_key

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

Start the backend:

```bash
npm run dev     # Development (with nodemon)
npm start       # Production
```

### 4. Configure the Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at **http://localhost:5173**

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and get JWT token |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all products |
| GET | `/api/products/search?q=` | Search products (autocomplete) |
| POST | `/api/products` | Create a new product |
| PUT | `/api/products/:id` | Update a product |
| DELETE | `/api/products/:id` | Soft-delete a product |
| PATCH | `/api/products/:id/stock` | Adjust stock quantity |

### Suppliers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/suppliers` | List all suppliers |
| GET | `/api/suppliers/search?q=` | Search suppliers |
| POST | `/api/suppliers` | Create a new supplier |

### Customers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | List all customers |
| GET | `/api/customers/phone/:phone` | Find customer by phone |
| GET | `/api/customers/:id` | Customer details + ledger |

### Purchases
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/purchases` | List all purchases |
| POST | `/api/purchases` | Create a new purchase |
| POST | `/api/purchase-returns` | Process a purchase return |

### Sales
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sales` | List all sales |
| POST | `/api/sales` | Create a new sale |
| POST | `/api/sales/return` | Process a sale return |

### GST Exports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/exports/b2b` | GSTR-1 B2B report |
| GET | `/api/exports/b2cs` | GSTR-1 B2CS report |
| GET | `/api/exports/cdnr` | Credit/Debit notes report |
| GET | `/api/exports/hsn` | HSN summary report |

### Settings & Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get user settings |
| PUT | `/api/settings` | Update settings |
| GET | `/api/dashboard/summary` | Dashboard metrics |
| POST | `/api/onboarding/complete` | Complete onboarding wizard |

> **Note:** All endpoints (except auth) require a valid JWT token in the `Authorization: Bearer <token>` header.

---

## 🔒 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ORACLE_USER` | ✅ | Oracle database username |
| `ORACLE_PASSWORD` | ✅ | Oracle database password |
| `ORACLE_CONNECT` | ✅ | Oracle connection string (e.g., `localhost:1521/XEPDB1`) |
| `PORT` | ❌ | Server port (default: `8080`) |
| `NODE_ENV` | ❌ | Environment mode (default: `development`) |
| `JWT_SECRET` | ✅ | Secret key for JWT signing |
| `CORS_ORIGIN` | ❌ | Allowed CORS origin (default: `http://localhost:5173`) |

---

## 📸 Application Pages

| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | User authentication |
| Register | `/register` | New user registration |
| Onboarding | `/onboarding` | 3-step setup wizard |
| Dashboard | `/` | Analytics & KPI overview |
| Inventory | `/inventory` | Product CRUD + stock management |
| Purchase | `/purchase` | Purchase order creation & returns |
| Sales | `/sales` | Sales invoice creation & returns |
| Customers | `/customers` | Customer directory & ledger |
| Suppliers | `/suppliers` | Supplier directory & ledger |
| GST Export | `/export` | GSTR-1, CDNR, HSN reports |
| Settings | `/settings` | Business, tax, invoice config |

---

## 🇮🇳 GST Compliance

This system is built for **Indian GST regulations**:

- ✅ Automatic CGST + SGST split (intra-state)
- ✅ IGST for inter-state transactions
- ✅ HSN code tracking per product
- ✅ GSTIN validation (15-digit format)
- ✅ State code detection from GSTIN
- ✅ GSTR-1 ready exports (B2B, B2CS, CDNR, HSN)
- ✅ Round-off as per GST rules
- ✅ Credit/Debit note generation for returns

---

## 🛠️ Development

```bash
# Run backend with auto-reload
cd backend && npm run dev

# Run frontend dev server
cd frontend && npm run dev

# Build frontend for production
cd frontend && npm run build
```

---

## 📄 License

This project is private and proprietary.

---

## 👤 Author

Built with ❤️ for Indian businesses.
