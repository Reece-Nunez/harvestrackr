# HarvesTrackr Migration Status

## Migration Overview
**From:** React/Vite + AWS Amplify (DynamoDB, Cognito, S3)
**To:** Next.js 14+ + Supabase (PostgreSQL, Auth, Storage) + Sentry

---

## Completed Work

### 1. Project Setup
- [x] Next.js 14+ project initialized with App Router
- [x] TypeScript configuration
- [x] Tailwind CSS + shadcn/ui component library
- [x] Sentry error monitoring integration
- [x] Supabase client configuration (server & client)
- [x] Authentication middleware for protected routes

### 2. Database Schema
- [x] Core tables created in Supabase:
  - `profiles` / `users`
  - `farms`
  - `farm_members`
  - `expenses`
  - `expense_line_items`
  - `income`
  - `invoices` (partial - needs columns)
  - `invoice_items`
  - `customers`
  - `livestock`
  - `chicken_flocks`
  - `egg_logs`
  - `fields`
  - `inventory_items`
- [x] Row Level Security (RLS) policies for farm-scoped access
- [x] Foreign key relationships established

### 3. Authentication
- [x] Login page with Supabase Auth
- [x] Signup page
- [x] Forgot password flow
- [x] Reset password page (for migrated Cognito users)
- [x] Session management via cookies
- [x] Middleware protection for dashboard routes
- [x] Sign out functionality

### 4. Data Migration
- [x] DynamoDB export scripts created
- [x] Data exported from DynamoDB tables
- [x] Import script for expenses, line items, income
- [x] **123 expenses** imported with correct farm association
- [x] **149 line items** imported
- [x] **19 income records** imported
- [x] Multi-farm support (Nunez Farms + mckeachniefarm)
- [x] Receipt image URLs updated to S3 bucket:
  - `https://farmexpensetrackerreceipts94813-main.s3.us-east-1.amazonaws.com/`

### 5. Dashboard & Layout
- [x] Dashboard shell with sidebar navigation
- [x] Mobile-responsive bottom navigation
- [x] Farm switcher component
- [x] Header with user menu
- [x] Theme toggle (dark/light mode)
- [x] Breadcrumbs navigation

### 6. Expenses Module
- [x] Expenses list page with filtering & sorting
- [x] Expense form (create/edit)
- [x] **Expense detail view page** with receipt display
- [x] Line items table
- [x] Category badges
- [x] Delete expense functionality
- [x] Receipt image display from S3

### 7. Income Module
- [x] Income list page
- [x] Income data table with sorting
- [x] Income form (create/edit)
- [x] Summary statistics cards

### 8. Other Pages (Structure Created)
- [x] Analytics dashboard (chart components)
- [x] Customers list & form
- [x] Invoices list & form
- [x] Inventory management pages
- [x] Livestock management pages
- [x] Chicken flock & egg log pages
- [x] Team management page
- [x] Profile settings page
- [x] Farm settings page
- [x] Reports page

---

## Remaining Work

### High Priority - Core Functionality

#### 1. Invoices Module - Schema Fixes
**Issue:** `column invoices.date does not exist` and `column invoices.total does not exist`

**Fix Required:** Run this SQL in Supabase:
```sql
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS terms TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_date DATE;
```

#### 2. Income Detail View Page
**Status:** Not created yet
**Need:** Create `/income/[id]/view/page.tsx` similar to expense detail view

#### 3. Profile Pictures - S3 URL Update
**Status:** Not configured
**S3 Bucket:** `s3://farmexpensetrackerreceipts94813-main/profile-pictures/`
**Need:** Update any profile picture URLs in the database

#### 4. Remaining Data Imports
Check if these tables need data imported from DynamoDB:
- [ ] `livestock` - Has export data (Livestock.json)
- [ ] `chicken_flocks` - Has export data (ChickenFlock.json)
- [ ] `egg_logs` - Has export data (EggLog.json)
- [ ] `fields` - Has export data (Field.json)
- [ ] `inventory_items` - Has export data (InventoryItem.json)
- [ ] `customers` - Empty in export (Customer.json = [])
- [ ] `invoices` - Empty in export (Invoice.json = [])

#### 5. RLS Policies - Verify All Tables
Ensure RLS policies exist for:
- [ ] `income` table
- [ ] `livestock` table
- [ ] `chicken_flocks` table
- [ ] `egg_logs` table
- [ ] `fields` table
- [ ] `inventory_items` table
- [ ] `customers` table
- [ ] `invoices` table
- [ ] `invoice_items` table

### Medium Priority - Feature Parity

#### 6. Receipt Scanner (OCR)
**Status:** Component exists but needs testing
**File:** `src/lib/ocr-service.ts`
**Uses:** Tesseract.js (client-side)

#### 7. CSV Import/Export
**Status:** Components exist, need testing
**Files:**
- `src/components/import/csv-dropzone.tsx`
- `src/components/import/column-mapper.tsx`
- `src/lib/csv-service.ts`

#### 8. PDF Report Generation
**Status:** Component exists, needs testing
**File:** `src/lib/pdf-service.ts`

#### 9. Analytics Dashboard
**Status:** Charts created, need real data integration
**Files:** `src/components/charts/`

#### 10. Team Management
**Status:** UI exists, actions need testing
**Features needed:**
- [ ] Invite team member via email
- [ ] Accept/decline invitations
- [ ] Role-based permissions (OWNER, ADMIN, MANAGER, EMPLOYEE, VIEWER, CONTRACTOR)
- [ ] Remove team member

### Low Priority - Polish & Enhancements

#### 11. Manifest.json
**Issue:** `GET /manifest.json 404`
**Fix:** Create `public/manifest.json` for PWA support

#### 12. Auto-Logout
**Status:** Not implemented
**Need:** 60-minute inactivity logout (from original app)

#### 13. Pull-to-Refresh
**Status:** Not implemented
**Need:** Mobile gesture support

#### 14. Loading States
**Status:** Skeleton components exist
**Need:** Verify all pages use proper loading states

#### 15. Error Boundaries
**Status:** Sentry configured
**Need:** Add user-friendly error pages

---

## Database Schema Comparison

### Tables in App Code vs Supabase

| Table | In Code | In Supabase | Status |
|-------|---------|-------------|--------|
| users/profiles | Yes | Yes | ✅ Working |
| farms | Yes | Yes | ✅ Working |
| farm_members | Yes | Yes | ✅ Working |
| expenses | Yes | Yes | ✅ Working |
| expense_line_items | Yes | Yes | ✅ Working |
| income | Yes | Yes | ✅ Working |
| invoices | Yes | Yes | ⚠️ Missing columns |
| invoice_items | Yes | Yes | Needs testing |
| customers | Yes | Yes | Needs testing |
| livestock | Yes | ? | Needs verification |
| chicken_flocks | Yes | ? | Needs verification |
| egg_logs | Yes | ? | Needs verification |
| fields | Yes | ? | Needs verification |
| inventory_items | Yes | ? | Needs verification |
| medical_records | Yes | ? | Needs verification |
| products | Yes | ? | Needs verification |
| team_invitations | Yes | ? | Needs verification |

---

## File Structure

```
harvestrackr-next/
├── src/
│   ├── app/
│   │   ├── (auth)/           # Login, signup, reset password
│   │   ├── (dashboard)/      # Protected dashboard routes
│   │   │   ├── dashboard/    # Main dashboard
│   │   │   ├── expenses/     # ✅ Working
│   │   │   ├── income/       # ✅ Working (needs detail view)
│   │   │   ├── invoices/     # ⚠️ Schema issues
│   │   │   ├── customers/    # Needs testing
│   │   │   ├── inventory/    # Needs testing
│   │   │   ├── analytics/    # Needs data integration
│   │   │   ├── reports/      # Needs testing
│   │   │   ├── team/         # Needs testing
│   │   │   ├── profile/      # Needs testing
│   │   │   └── settings/     # Needs testing
│   │   └── (marketing)/      # Public pages
│   ├── actions/              # Server actions
│   ├── components/           # UI components
│   ├── lib/                  # Utilities
│   └── schemas/              # Zod validation
├── scripts/                  # Migration scripts
├── dynamodb-export/          # Exported DynamoDB data
└── supabase/migrations/      # Database migrations
```

---

## Environment Variables Required

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Sentry
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_sentry_auth_token

# AWS (for S3 image access - if needed)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key (optional - bucket is public)
AWS_SECRET_ACCESS_KEY=your_secret (optional - bucket is public)
```

---

## Testing Checklist

### Authentication
- [ ] New user signup
- [ ] Existing user login
- [ ] Password reset flow
- [ ] Session persistence
- [ ] Logout

### Expenses
- [x] View expense list
- [x] View expense details with receipt
- [ ] Create new expense
- [ ] Edit expense
- [ ] Delete expense
- [ ] Upload receipt image

### Income
- [x] View income list
- [ ] View income details
- [ ] Create new income
- [ ] Edit income
- [ ] Delete income

### Farm Management
- [x] View current farm
- [ ] Switch between farms
- [ ] Create new farm
- [ ] Edit farm settings
- [ ] Delete farm

### Team
- [ ] View team members
- [ ] Invite new member
- [ ] Accept invitation
- [ ] Remove member
- [ ] Change member role

---

## Next Steps (Recommended Order)

1. **Run invoices schema fix SQL** - Unblocks invoices page
2. **Create income detail view page** - Feature parity with expenses
3. **Import remaining data** (livestock, chickens, egg_logs, fields, inventory)
4. **Verify RLS policies** for all tables
5. **Test each module end-to-end**
6. **Add manifest.json** for PWA
7. **Deploy to Vercel** for testing
8. **User acceptance testing** with real data
