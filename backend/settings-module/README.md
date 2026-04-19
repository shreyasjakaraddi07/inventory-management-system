# Settings Module Backend - Complete Implementation Guide

## 📁 Project Structure

```
backend/settings-module/
├── db.js                              # PostgreSQL connection pool
├── middleware/
│   └── auth.js                        # JWT authentication & RBAC
├── validators/
│   └── settingsValidators.js          # Zod validation schemas
├── models/
│   └── settingsModel.js               # SQL queries and data access
├── services/
│   └── settingsService.js             # Business logic layer
├── controllers/
│   └── settingsController.js          # Request handlers
├── routes/
│   └── settingsRoutes.js              # API route definitions
└── utils/
    └── errorHandler.js                # Centralized error handling
```

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install pg jsonwebtoken zod express helmet cors express-rate-limit dotenv
```

### 2. Environment Variables

Create `.env` file:

```env
# PostgreSQL
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=inventory_db
PG_USER=postgres
PG_PASSWORD=your_password

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# Server
PORT=8080
NODE_ENV=development

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Database Setup

```bash
# Create database
createdb inventory_db

# Run schema
psql -U postgres -d inventory_db -f settings_module_schema.sql
```

### 4. Integrate with Express Server

Add to your main `server.js`:

```javascript
import settingsRoutes from './settings-module/routes/settingsRoutes.js';

// Settings Module Routes
app.use('/api/settings', settingsRoutes);
```

## 📊 Database Schema

See `settings_module_schema.sql` for complete PostgreSQL schema with:
- 13 normalized tables
- Foreign key constraints
- Check constraints for data validation
- Auto-creation of default settings
- Audit logging triggers
- Performance indexes
- Complete settings view

## 🔐 Authentication & Authorization

### JWT Authentication

```javascript
import { authenticateToken } from './settings-module/middleware/auth.js';

// Protect route
app.get('/api/settings/:businessId', authenticateToken, controller);
```

### Role-Based Access Control

```javascript
import { authorizeRoles } from './settings-module/middleware/auth.js';

// Admin only
app.put('/api/settings/tax/:businessId', 
  authenticateToken, 
  authorizeRoles('admin'), 
  controller
);

// Admin and accountant
app.get('/api/settings/:businessId', 
  authenticateToken, 
  authorizeRoles('admin', 'accountant'), 
  controller
);
```

## 🎯 API Endpoints

### Get All Settings
```
GET /api/settings/:businessId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "business": { ... },
    "businessProfile": { ... },
    "taxSettings": { ... },
    "invoiceSettings": { ... },
    "inventorySettings": { ... },
    "notificationSettings": { ... },
    "securitySettings": { ... }
  }
}
```

### Update Business Profile
```
PUT /api/settings/business-profile/:businessId
Authorization: Bearer <token>
Content-Type: application/json

{
  "businessName": "ABC Enterprises",
  "gstin": "27AABCU9603R1ZX",
  "pan": "AABCU9603R",
  "address": "123 Main Street",
  "city": "Mumbai",
  "state": "Maharashtra",
  "stateCode": "27",
  "pincode": "400001",
  "phone": "9876543210",
  "email": "contact@abc.com"
}
```

### Update Tax Settings
```
PUT /api/settings/tax/:businessId
Authorization: Bearer <token>
Content-Type: application/json

{
  "defaultGstRate": 18,
  "enableIgst": true,
  "enableRoundOff": true,
  "reverseChargeEnabled": false,
  "tdsEnabled": true,
  "tdsRate": 10,
  "filingFrequency": "monthly"
}
```

### Update Invoice Settings
```
PUT /api/settings/invoice/:businessId
Authorization: Bearer <token>
Content-Type: application/json

{
  "invoicePrefix": "INV-",
  "purchasePrefix": "PUR-",
  "creditNotePrefix": "CN-",
  "debitNotePrefix": "DN-",
  "startingNumber": 1000,
  "fyResetEnabled": true,
  "showHsn": true,
  "showGstBreakup": true,
  "invoiceTerms": "Payment due within 30 days"
}
```

### Update Inventory Settings
```
PUT /api/settings/inventory/:businessId
Authorization: Bearer <token>
Content-Type: application/json

{
  "lowStockAlertEnabled": true,
  "lowStockThreshold": 10,
  "autoStockUpdate": true,
  "negativeStockPrevention": false,
  "stockValuationMethod": "fifo",
  "barcodeEnabled": true
}
```

### Update Notification Settings
```
PUT /api/settings/notifications/:businessId
Authorization: Bearer <token>
Content-Type: application/json

{
  "lowStockAlertEnabled": true,
  "lowStockEmail": true,
  "lowStockSms": false,
  "lowStockFrequency": "realtime",
  "paymentRemindersEnabled": true,
  "gstFilingReminderEnabled": true,
  "emailNotificationsEnabled": true,
  "quietHoursEnabled": true,
  "quietHoursFrom": "22:00:00",
  "quietHoursTo": "08:00:00"
}
```

### Update Security Settings
```
PUT /api/settings/security/:businessId
Authorization: Bearer <token>
Content-Type: application/json

{
  "sessionTimeoutMinutes": 30,
  "failedLoginLockoutEnabled": true,
  "failedLoginAttempts": 5,
  "lockoutDurationMinutes": 30,
  "passwordMinLength": 8,
  "twoFactorEnabled": true,
  "twoFactorMethod": "authenticator"
}
```

### Get Audit Logs
```
GET /api/settings/audit-logs/:businessId?days=30
Authorization: Bearer <token>
```

## ✅ Validation

All endpoints use Zod validation with automatic error responses:

**Error Response:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "gstin",
      "message": "Invalid GSTIN format. Example: 27AABCU9603R1ZX"
    },
    {
      "field": "defaultGstRate",
      "message": "GST rate cannot exceed 28%"
    }
  ]
}
```

## 🔒 Security Features

1. **JWT Authentication** - Token-based auth
2. **RBAC** - Role-based access control (admin, accountant, staff)
3. **Business Ownership** - Users can only access their businesses
4. **Input Validation** - Zod schemas for all inputs
5. **SQL Injection Prevention** - Parameterized queries
6. **Rate Limiting** - Prevent abuse
7. **Audit Logging** - Track all changes
8. **Helmet.js** - Security headers
9. **CORS** - Configurable origins

## 📝 Audit Logging

All settings changes are automatically logged:

```sql
SELECT * FROM settings_audit_logs 
WHERE business_id = 'uuid' 
ORDER BY created_at DESC;
```

**Logged Information:**
- User who made the change
- Table and record modified
- Old and new values (JSONB)
- IP address
- Timestamp

## 🎨 Key Features

### 1. Multi-Business Architecture
- Each business has isolated settings
- Foreign keys link all tables to `business_id`
- Users can own multiple businesses

### 2. Auto-Default Settings
When a new business is created, default settings are automatically generated via database trigger.

### 3. Optimized Queries
Single JOIN query fetches all settings:
```sql
SELECT * FROM v_business_complete_settings 
WHERE business_id = $1;
```

### 4. Transaction Support
Updates use transactions to ensure data consistency:
```javascript
await transaction(async (client) => {
  // Multiple queries
  await client.query('UPDATE ...');
  await client.query('UPDATE ...');
});
```

### 5. GST Compliance
- GSTIN format validation (15 chars)
- PAN validation (10 chars)
- GST rate constraints (0-28%)
- State code support
- HSN/SAC code management

## 🧪 Testing

### Test with cURL

```bash
# Get settings
curl -X GET http://localhost:8080/api/settings/{businessId} \
  -H "Authorization: Bearer {token}"

# Update business profile
curl -X PUT http://localhost:8080/api/settings/business-profile/{businessId} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Test Company",
    "gstin": "27AABCU9603R1ZX"
  }'
```

### Test with Postman

1. Import collection
2. Set environment variables (base URL, token)
3. Run requests

## 📈 Performance

- **Connection Pooling** - Reuses database connections
- **Indexes** - Optimized for common queries
- **Views** - Pre-joined data for fast reads
- **Transactions** - Efficient batch updates
- **Prepared Statements** - Query plan caching

## 🚨 Error Handling

Centralized error handling middleware:

```javascript
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});
```

## 🔄 Migration from Oracle

If migrating from the existing Oracle setup:

1. **Schema Differences:**
   - Oracle: Single `settings` table with key-value pairs
   - PostgreSQL: Normalized relational tables

2. **Data Migration Script:**
```sql
-- Migrate from key-value to relational
INSERT INTO business_profiles (business_id, gstin, pan, ...)
SELECT 
  business_id,
  MAX(CASE WHEN setting_key = 'business_gstin' THEN setting_value END),
  MAX(CASE WHEN setting_key = 'business_pan' THEN setting_value END),
  ...
FROM settings
GROUP BY business_id;
```

3. **API Compatibility:**
   - Old: `GET /api/settings` (all settings)
   - New: `GET /api/settings/:businessId` (with business context)

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Zod Validation](https://zod.dev/)
- [JWT Best Practices](https://jwt.io/introduction)
- [Express Security](https://expressjs.com/en/advanced/best-practice-security.html)

## 🎯 Next Steps

1. ✅ Database schema created
2. ✅ Authentication & RBAC implemented
3. ✅ Validation schemas defined
4. ⏳ Create models, services, controllers
5. ⏳ Add rate limiting and error handling
6. ⏳ Write tests
7. ⏳ Deploy to production

## 💡 Pro Tips

1. **Always use transactions** for multi-table updates
2. **Index frequently queried columns**
3. **Use views** for complex joins
4. **Log all changes** for audit trail
5. **Validate on both client and server**
6. **Use connection pooling** for performance
7. **Implement caching** for frequently accessed settings
8. **Backup regularly** with pg_dump

---

**Status:** Backend Architecture Complete  
**Database:** PostgreSQL 13+  
**Node.js:** 16+ (ES Modules)  
**Ready for:** Implementation & Testing
