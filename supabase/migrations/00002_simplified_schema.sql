-- ============================================================================
-- HarvesTrackr Simplified Schema for Data Migration
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/fsavvkjgjaqciebkzykk/sql
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- FARMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS farms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    farm_type TEXT DEFAULT 'MIXED',
    description TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'USA',
    acres DECIMAL(10, 2),
    phone_number TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TEAM MEMBERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'VIEWER',
    is_active BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- FIELDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    acres DECIMAL(10, 2),
    description TEXT,
    field_type TEXT DEFAULT 'OTHER',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- LIVESTOCK TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS livestock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    field_id UUID REFERENCES fields(id) ON DELETE SET NULL,
    name TEXT,
    species TEXT NOT NULL,
    breed TEXT,
    tag_number TEXT,
    birth_date DATE,
    weight DECIMAL(10, 2),
    gender TEXT DEFAULT 'UNKNOWN',
    status TEXT DEFAULT 'ACTIVE',
    acquisition_date DATE,
    acquisition_cost DECIMAL(12, 2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- LIVESTOCK FAMILIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS livestock_families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES livestock(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES livestock(id) ON DELETE CASCADE,
    relationship_type TEXT DEFAULT 'PARENT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- MEDICAL RECORDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    livestock_id UUID NOT NULL REFERENCES livestock(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    medicine TEXT,
    dosage TEXT,
    administered_by TEXT,
    follow_up_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CHICKEN FLOCKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS chicken_flocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    breed TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    has_rooster BOOLEAN DEFAULT FALSE,
    coop_location TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- EGG LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS egg_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flock_id UUID NOT NULL REFERENCES chicken_flocks(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    eggs_collected INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INVENTORY ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'OTHER',
    quantity INTEGER DEFAULT 0,
    unit TEXT,
    location TEXT,
    acquired_date DATE,
    expiry_date DATE,
    cost DECIMAL(12, 2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- EXPENSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    vendor TEXT,
    description TEXT,
    grand_total DECIMAL(12, 2) DEFAULT 0,
    receipt_image_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- LINE ITEMS TABLE (for expenses)
-- ============================================================================
CREATE TABLE IF NOT EXISTS line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    category TEXT,
    quantity INTEGER DEFAULT 1,
    unit_cost DECIMAL(12, 2) DEFAULT 0,
    line_total DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INCOME TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS income (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    item TEXT,
    quantity INTEGER DEFAULT 1,
    price DECIMAL(12, 2) DEFAULT 0,
    amount DECIMAL(12, 2) DEFAULT 0,
    payment_method TEXT,
    notes TEXT,
    livestock_id UUID REFERENCES livestock(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CUSTOMERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'USA',
    tax_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INVOICES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    date DATE NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'DRAFT',
    subtotal DECIMAL(12, 2) DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    total DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    terms TEXT,
    paid_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INVOICE ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit_price DECIMAL(12, 2) DEFAULT 0,
    total DECIMAL(12, 2) DEFAULT 0,
    category TEXT,
    unit TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_farms_owner_id ON farms(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_farm_id ON team_members(farm_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_fields_farm_id ON fields(farm_id);
CREATE INDEX IF NOT EXISTS idx_livestock_farm_id ON livestock(farm_id);
CREATE INDEX IF NOT EXISTS idx_livestock_field_id ON livestock(field_id);
CREATE INDEX IF NOT EXISTS idx_livestock_families_parent_id ON livestock_families(parent_id);
CREATE INDEX IF NOT EXISTS idx_livestock_families_child_id ON livestock_families(child_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_livestock_id ON medical_records(livestock_id);
CREATE INDEX IF NOT EXISTS idx_chicken_flocks_farm_id ON chicken_flocks(farm_id);
CREATE INDEX IF NOT EXISTS idx_egg_logs_flock_id ON egg_logs(flock_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_farm_id ON inventory_items(farm_id);
CREATE INDEX IF NOT EXISTS idx_expenses_farm_id ON expenses(farm_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_line_items_expense_id ON line_items(expense_id);
CREATE INDEX IF NOT EXISTS idx_income_farm_id ON income(farm_id);
CREATE INDEX IF NOT EXISTS idx_income_date ON income(date);
CREATE INDEX IF NOT EXISTS idx_customers_farm_id ON customers(farm_id);
CREATE INDEX IF NOT EXISTS idx_invoices_farm_id ON invoices(farm_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- ============================================================================
-- Done! Tables are ready for data import.
-- ============================================================================
