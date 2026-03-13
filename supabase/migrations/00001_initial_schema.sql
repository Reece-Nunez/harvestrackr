-- ============================================================================
-- HarvestTrackr Initial Schema Migration
-- Version: 00001
-- Description: Creates all tables, enums, indexes, RLS policies, triggers,
--              and storage buckets for the HarvestTrackr application.
-- ============================================================================

-- ============================================================================
-- SECTION 1: EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SECTION 2: CUSTOM TYPES (ENUMS)
-- ============================================================================

-- Farm type enum
CREATE TYPE farm_type AS ENUM (
    'LIVESTOCK',
    'CROP',
    'DAIRY',
    'POULTRY',
    'MIXED',
    'AQUACULTURE',
    'ORGANIC',
    'GREENHOUSE',
    'ORCHARD',
    'VINEYARD',
    'OTHER'
);

-- Team role enum (hierarchical from highest to lowest privilege)
CREATE TYPE team_role AS ENUM (
    'OWNER',
    'ADMIN',
    'MANAGER',
    'EMPLOYEE',
    'VIEWER',
    'CONTRACTOR'
);

-- Invitation status enum
CREATE TYPE invitation_status AS ENUM (
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'EXPIRED',
    'CANCELLED'
);

-- Invoice status enum
CREATE TYPE invoice_status AS ENUM (
    'DRAFT',
    'SENT',
    'PAID',
    'OVERDUE',
    'CANCELLED'
);

-- Livestock status enum
CREATE TYPE livestock_status AS ENUM (
    'ACTIVE',
    'SOLD',
    'DECEASED',
    'TRANSFERRED'
);

-- Gender enum
CREATE TYPE gender AS ENUM (
    'MALE',
    'FEMALE',
    'UNKNOWN'
);

-- ============================================================================
-- SECTION 3: HELPER FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check if current user has access to a farm
CREATE OR REPLACE FUNCTION user_has_farm_access(p_farm_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM farm_members
        WHERE farm_id = p_farm_id
          AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user can modify a farm (has required role)
CREATE OR REPLACE FUNCTION user_can_modify_farm(p_farm_id UUID, p_required_roles team_role[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM farm_members
        WHERE farm_id = p_farm_id
          AND user_id = auth.uid()
          AND role = ANY(p_required_roles)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is farm owner or admin
CREATE OR REPLACE FUNCTION user_is_farm_admin(p_farm_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN user_can_modify_farm(p_farm_id, ARRAY['OWNER', 'ADMIN']::team_role[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can write to farm (OWNER, ADMIN, MANAGER, EMPLOYEE, CONTRACTOR)
CREATE OR REPLACE FUNCTION user_can_write_farm(p_farm_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN user_can_modify_farm(p_farm_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'CONTRACTOR']::team_role[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role in a farm
CREATE OR REPLACE FUNCTION get_user_farm_role(p_farm_id UUID)
RETURNS team_role AS $$
DECLARE
    v_role team_role;
BEGIN
    SELECT role INTO v_role
    FROM farm_members
    WHERE farm_id = p_farm_id AND user_id = auth.uid();

    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECTION 4: TABLES
-- ============================================================================

-- --------------------------------------------------------------------------
-- User Profiles Table
-- --------------------------------------------------------------------------
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    timezone TEXT DEFAULT 'America/New_York',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- Farms Table
-- --------------------------------------------------------------------------
CREATE TABLE farms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type farm_type NOT NULL DEFAULT 'MIXED',
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'USA',
    acreage DECIMAL(10, 2),
    description TEXT,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- Farm Members Table (Join table for users and farms)
-- --------------------------------------------------------------------------
CREATE TABLE farm_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role team_role NOT NULL DEFAULT 'VIEWER',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(farm_id, user_id)
);

-- --------------------------------------------------------------------------
-- Team Invitations Table
-- --------------------------------------------------------------------------
CREATE TABLE team_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role team_role NOT NULL DEFAULT 'VIEWER',
    status invitation_status NOT NULL DEFAULT 'PENDING',
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- Categories Table
-- --------------------------------------------------------------------------
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    description TEXT,
    color TEXT DEFAULT '#6B7280',
    icon TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(farm_id, name, type)
);

-- --------------------------------------------------------------------------
-- Vendors Table
-- --------------------------------------------------------------------------
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'USA',
    website TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(farm_id, name)
);

-- --------------------------------------------------------------------------
-- Customers Table
-- --------------------------------------------------------------------------
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'USA',
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(farm_id, name)
);

-- --------------------------------------------------------------------------
-- Expenses Table
-- --------------------------------------------------------------------------
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    grand_total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    receipt_url TEXT,
    notes TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern JSONB,
    tags TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- Expense Line Items Table
-- --------------------------------------------------------------------------
CREATE TABLE expense_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 4) NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL,
    line_total DECIMAL(12, 2) NOT NULL GENERATED ALWAYS AS (quantity * unit_price) STORED,
    unit TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- Income Table
-- --------------------------------------------------------------------------
CREATE TABLE income (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method TEXT,
    reference_number TEXT,
    notes TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern JSONB,
    tags TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- Invoices Table
-- --------------------------------------------------------------------------
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    status invoice_status NOT NULL DEFAULT 'DRAFT',
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    grand_total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    terms TEXT,
    paid_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    pdf_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(farm_id, invoice_number)
);

-- --------------------------------------------------------------------------
-- Invoice Line Items Table
-- --------------------------------------------------------------------------
CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 4) NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL,
    line_total DECIMAL(12, 2) NOT NULL GENERATED ALWAYS AS (quantity * unit_price) STORED,
    unit TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- Livestock Table
-- --------------------------------------------------------------------------
CREATE TABLE livestock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    tag_number TEXT NOT NULL,
    name TEXT,
    species TEXT NOT NULL,
    breed TEXT,
    gender gender NOT NULL DEFAULT 'UNKNOWN',
    birth_date DATE,
    acquisition_date DATE,
    acquisition_cost DECIMAL(12, 2),
    status livestock_status NOT NULL DEFAULT 'ACTIVE',
    weight DECIMAL(10, 2),
    weight_unit TEXT DEFAULT 'lbs',
    location TEXT,
    mother_id UUID REFERENCES livestock(id) ON DELETE SET NULL,
    father_id UUID REFERENCES livestock(id) ON DELETE SET NULL,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(farm_id, tag_number)
);

-- --------------------------------------------------------------------------
-- Livestock Health Records Table
-- --------------------------------------------------------------------------
CREATE TABLE livestock_health_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    livestock_id UUID NOT NULL REFERENCES livestock(id) ON DELETE CASCADE,
    record_date DATE NOT NULL DEFAULT CURRENT_DATE,
    record_type TEXT NOT NULL,
    description TEXT NOT NULL,
    treatment TEXT,
    medication TEXT,
    dosage TEXT,
    administered_by TEXT,
    veterinarian TEXT,
    cost DECIMAL(12, 2),
    next_treatment_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- Crops Table
-- --------------------------------------------------------------------------
CREATE TABLE crops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    variety TEXT,
    field_name TEXT,
    acreage DECIMAL(10, 2),
    planting_date DATE,
    expected_harvest_date DATE,
    actual_harvest_date DATE,
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'planted', 'growing', 'harvested', 'failed')),
    yield_amount DECIMAL(12, 2),
    yield_unit TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- Equipment Table
-- --------------------------------------------------------------------------
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT,
    make TEXT,
    model TEXT,
    year INTEGER,
    serial_number TEXT,
    purchase_date DATE,
    purchase_price DECIMAL(12, 2),
    current_value DECIMAL(12, 2),
    status TEXT DEFAULT 'operational' CHECK (status IN ('operational', 'maintenance', 'repair', 'retired')),
    location TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- Equipment Maintenance Records Table
-- --------------------------------------------------------------------------
CREATE TABLE equipment_maintenance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    maintenance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    maintenance_type TEXT NOT NULL,
    description TEXT NOT NULL,
    performed_by TEXT,
    cost DECIMAL(12, 2),
    next_maintenance_date DATE,
    odometer_reading DECIMAL(12, 2),
    hours_reading DECIMAL(12, 2),
    parts_replaced TEXT[],
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- Audit Log Table
-- --------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SECTION 5: INDEXES
-- ============================================================================

-- Profiles indexes
CREATE INDEX idx_profiles_email ON profiles(email);

-- Farms indexes
CREATE INDEX idx_farms_type ON farms(type);

-- Farm members indexes
CREATE INDEX idx_farm_members_farm_id ON farm_members(farm_id);
CREATE INDEX idx_farm_members_user_id ON farm_members(user_id);
CREATE INDEX idx_farm_members_role ON farm_members(role);

-- Team invitations indexes
CREATE INDEX idx_team_invitations_farm_id ON team_invitations(farm_id);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE INDEX idx_team_invitations_status ON team_invitations(status);
CREATE INDEX idx_team_invitations_token ON team_invitations(token);

-- Categories indexes
CREATE INDEX idx_categories_farm_id ON categories(farm_id);
CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);

-- Vendors indexes
CREATE INDEX idx_vendors_farm_id ON vendors(farm_id);
CREATE INDEX idx_vendors_is_active ON vendors(is_active);

-- Customers indexes
CREATE INDEX idx_customers_farm_id ON customers(farm_id);
CREATE INDEX idx_customers_is_active ON customers(is_active);

-- Expenses indexes
CREATE INDEX idx_expenses_farm_id ON expenses(farm_id);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
CREATE INDEX idx_expenses_vendor_id ON expenses(vendor_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_created_by ON expenses(created_by);

-- Expense line items indexes
CREATE INDEX idx_expense_line_items_expense_id ON expense_line_items(expense_id);

-- Income indexes
CREATE INDEX idx_income_farm_id ON income(farm_id);
CREATE INDEX idx_income_category_id ON income(category_id);
CREATE INDEX idx_income_customer_id ON income(customer_id);
CREATE INDEX idx_income_date ON income(date);
CREATE INDEX idx_income_created_by ON income(created_by);

-- Invoices indexes
CREATE INDEX idx_invoices_farm_id ON invoices(farm_id);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- Invoice line items indexes
CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);

-- Livestock indexes
CREATE INDEX idx_livestock_farm_id ON livestock(farm_id);
CREATE INDEX idx_livestock_status ON livestock(status);
CREATE INDEX idx_livestock_species ON livestock(species);
CREATE INDEX idx_livestock_tag_number ON livestock(tag_number);

-- Livestock health records indexes
CREATE INDEX idx_livestock_health_records_livestock_id ON livestock_health_records(livestock_id);
CREATE INDEX idx_livestock_health_records_record_date ON livestock_health_records(record_date);
CREATE INDEX idx_livestock_health_records_record_type ON livestock_health_records(record_type);

-- Crops indexes
CREATE INDEX idx_crops_farm_id ON crops(farm_id);
CREATE INDEX idx_crops_status ON crops(status);
CREATE INDEX idx_crops_planting_date ON crops(planting_date);

-- Equipment indexes
CREATE INDEX idx_equipment_farm_id ON equipment(farm_id);
CREATE INDEX idx_equipment_status ON equipment(status);

-- Equipment maintenance indexes
CREATE INDEX idx_equipment_maintenance_equipment_id ON equipment_maintenance(equipment_id);
CREATE INDEX idx_equipment_maintenance_date ON equipment_maintenance(maintenance_date);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_farm_id ON audit_logs(farm_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- SECTION 6: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE livestock ENABLE ROW LEVEL SECURITY;
ALTER TABLE livestock_health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 7: ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- --------------------------------------------------------------------------
-- Profiles Policies
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Users can view profiles of farm members"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM farm_members fm1
            JOIN farm_members fm2 ON fm1.farm_id = fm2.farm_id
            WHERE fm1.user_id = auth.uid() AND fm2.user_id = profiles.id
        )
    );

-- --------------------------------------------------------------------------
-- Farms Policies
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view farms they are members of"
    ON farms FOR SELECT
    USING (user_has_farm_access(id));

CREATE POLICY "Admins can update farm details"
    ON farms FOR UPDATE
    USING (user_is_farm_admin(id))
    WITH CHECK (user_is_farm_admin(id));

CREATE POLICY "Only owners can delete farms"
    ON farms FOR DELETE
    USING (user_can_modify_farm(id, ARRAY['OWNER']::team_role[]));

CREATE POLICY "Authenticated users can create farms"
    ON farms FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- --------------------------------------------------------------------------
-- Farm Members Policies
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view members of their farms"
    ON farm_members FOR SELECT
    USING (user_has_farm_access(farm_id));

CREATE POLICY "Admins can add farm members"
    ON farm_members FOR INSERT
    WITH CHECK (user_is_farm_admin(farm_id));

CREATE POLICY "Admins can update farm members"
    ON farm_members FOR UPDATE
    USING (user_is_farm_admin(farm_id))
    WITH CHECK (user_is_farm_admin(farm_id));

CREATE POLICY "Admins can remove farm members"
    ON farm_members FOR DELETE
    USING (user_is_farm_admin(farm_id));

CREATE POLICY "Users can remove themselves from farms"
    ON farm_members FOR DELETE
    USING (user_id = auth.uid() AND role != 'OWNER');

-- --------------------------------------------------------------------------
-- Team Invitations Policies
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view invitations for their farms"
    ON team_invitations FOR SELECT
    USING (user_has_farm_access(farm_id));

CREATE POLICY "Users can view invitations sent to their email"
    ON team_invitations FOR SELECT
    USING (email = (SELECT email FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can create invitations"
    ON team_invitations FOR INSERT
    WITH CHECK (user_is_farm_admin(farm_id));

CREATE POLICY "Admins can update invitations"
    ON team_invitations FOR UPDATE
    USING (user_is_farm_admin(farm_id))
    WITH CHECK (user_is_farm_admin(farm_id));

CREATE POLICY "Users can accept their invitations"
    ON team_invitations FOR UPDATE
    USING (email = (SELECT email FROM profiles WHERE id = auth.uid()))
    WITH CHECK (email = (SELECT email FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can delete invitations"
    ON team_invitations FOR DELETE
    USING (user_is_farm_admin(farm_id));

-- --------------------------------------------------------------------------
-- Categories Policies
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view categories of their farms"
    ON categories FOR SELECT
    USING (user_has_farm_access(farm_id));

CREATE POLICY "Writers can create categories"
    ON categories FOR INSERT
    WITH CHECK (user_can_write_farm(farm_id));

CREATE POLICY "Writers can update categories"
    ON categories FOR UPDATE
    USING (user_can_write_farm(farm_id))
    WITH CHECK (user_can_write_farm(farm_id));

CREATE POLICY "Admins can delete categories"
    ON categories FOR DELETE
    USING (user_is_farm_admin(farm_id));

-- --------------------------------------------------------------------------
-- Vendors Policies
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view vendors of their farms"
    ON vendors FOR SELECT
    USING (user_has_farm_access(farm_id));

CREATE POLICY "Writers can create vendors"
    ON vendors FOR INSERT
    WITH CHECK (user_can_write_farm(farm_id));

CREATE POLICY "Writers can update vendors"
    ON vendors FOR UPDATE
    USING (user_can_write_farm(farm_id))
    WITH CHECK (user_can_write_farm(farm_id));

CREATE POLICY "Admins can delete vendors"
    ON vendors FOR DELETE
    USING (user_is_farm_admin(farm_id));

-- --------------------------------------------------------------------------
-- Customers Policies
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view customers of their farms"
    ON customers FOR SELECT
    USING (user_has_farm_access(farm_id));

CREATE POLICY "Writers can create customers"
    ON customers FOR INSERT
    WITH CHECK (user_can_write_farm(farm_id));

CREATE POLICY "Writers can update customers"
    ON customers FOR UPDATE
    USING (user_can_write_farm(farm_id))
    WITH CHECK (user_can_write_farm(farm_id));

CREATE POLICY "Admins can delete customers"
    ON customers FOR DELETE
    USING (user_is_farm_admin(farm_id));

-- --------------------------------------------------------------------------
-- Expenses Policies
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view expenses of their farms"
    ON expenses FOR SELECT
    USING (user_has_farm_access(farm_id));

CREATE POLICY "Writers can create expenses"
    ON expenses FOR INSERT
    WITH CHECK (user_can_write_farm(farm_id));

CREATE POLICY "Writers can update expenses"
    ON expenses FOR UPDATE
    USING (user_can_write_farm(farm_id))
    WITH CHECK (user_can_write_farm(farm_id));

CREATE POLICY "Admins can delete expenses"
    ON expenses FOR DELETE
    USING (user_is_farm_admin(farm_id));

-- --------------------------------------------------------------------------
-- Expense Line Items Policies
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view expense line items of their farms"
    ON expense_line_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM expenses e
            WHERE e.id = expense_line_items.expense_id
              AND user_has_farm_access(e.farm_id)
        )
    );

CREATE POLICY "Writers can create expense line items"
    ON expense_line_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM expenses e
            WHERE e.id = expense_line_items.expense_id
              AND user_can_write_farm(e.farm_id)
        )
    );

CREATE POLICY "Writers can update expense line items"
    ON expense_line_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM expenses e
            WHERE e.id = expense_line_items.expense_id
              AND user_can_write_farm(e.farm_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM expenses e
            WHERE e.id = expense_line_items.expense_id
              AND user_can_write_farm(e.farm_id)
        )
    );

CREATE POLICY "Admins can delete expense line items"
    ON expense_line_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM expenses e
            WHERE e.id = expense_line_items.expense_id
              AND user_is_farm_admin(e.farm_id)
        )
    );

-- --------------------------------------------------------------------------
-- Income Policies
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view income of their farms"
    ON income FOR SELECT
    USING (user_has_farm_access(farm_id));

CREATE POLICY "Writers can create income"
    ON income FOR INSERT
    WITH CHECK (user_can_write_farm(farm_id));

CREATE POLICY "Writers can update income"
    ON income FOR UPDATE
    USING (user_can_write_farm(farm_id))
    WITH CHECK (user_can_write_farm(farm_id));

CREATE POLICY "Admins can delete income"
    ON income FOR DELETE
    USING (user_is_farm_admin(farm_id));

-- --------------------------------------------------------------------------
-- Invoices Policies
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view invoices of their farms"
    ON invoices FOR SELECT
    USING (user_has_farm_access(farm_id));

CREATE POLICY "Writers can create invoices"
    ON invoices FOR INSERT
    WITH CHECK (user_can_write_farm(farm_id));

CREATE POLICY "Writers can update invoices"
    ON invoices FOR UPDATE
    USING (user_can_write_farm(farm_id))
    WITH CHECK (user_can_write_farm(farm_id));

CREATE POLICY "Admins can delete invoices"
    ON invoices FOR DELETE
    USING (user_is_farm_admin(farm_id));

-- --------------------------------------------------------------------------
-- Invoice Line Items Policies
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view invoice line items of their farms"
    ON invoice_line_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM invoices i
            WHERE i.id = invoice_line_items.invoice_id
              AND user_has_farm_access(i.farm_id)
        )
    );

CREATE POLICY "Writers can create invoice line items"
    ON invoice_line_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM invoices i
            WHERE i.id = invoice_line_items.invoice_id
              AND user_can_write_farm(i.farm_id)
        )
    );

CREATE POLICY "Writers can update invoice line items"
    ON invoice_line_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM invoices i
            WHERE i.id = invoice_line_items.invoice_id
              AND user_can_write_farm(i.farm_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM invoices i
            WHERE i.id = invoice_line_items.invoice_id
              AND user_can_write_farm(i.farm_id)
        )
    );

CREATE POLICY "Admins can delete invoice line items"
    ON invoice_line_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM invoices i
            WHERE i.id = invoice_line_items.invoice_id
              AND user_is_farm_admin(i.farm_id)
        )
    );

-- --------------------------------------------------------------------------
-- Livestock Policies
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view livestock of their farms"
    ON livestock FOR SELECT
    USING (user_has_farm_access(farm_id));

CREATE POLICY "Writers can create livestock"
    ON livestock FOR INSERT
    WITH CHECK (user_can_write_farm(farm_id));

CREATE POLICY "Writers can update livestock"
    ON livestock FOR UPDATE
    USING (user_can_write_farm(farm_id))
    WITH CHECK (user_can_write_farm(farm_id));

CREATE POLICY "Admins can delete livestock"
    ON livestock FOR DELETE
    USING (user_is_farm_admin(farm_id));

-- --------------------------------------------------------------------------
-- Livestock Health Records Policies
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view livestock health records of their farms"
    ON livestock_health_records FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM livestock l
            WHERE l.id = livestock_health_records.livestock_id
              AND user_has_farm_access(l.farm_id)
        )
    );

CREATE POLICY "Writers can create livestock health records"
    ON livestock_health_records FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM livestock l
            WHERE l.id = livestock_health_records.livestock_id
              AND user_can_write_farm(l.farm_id)
        )
    );

CREATE POLICY "Writers can update livestock health records"
    ON livestock_health_records FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM livestock l
            WHERE l.id = livestock_health_records.livestock_id
              AND user_can_write_farm(l.farm_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM livestock l
            WHERE l.id = livestock_health_records.livestock_id
              AND user_can_write_farm(l.farm_id)
        )
    );

CREATE POLICY "Admins can delete livestock health records"
    ON livestock_health_records FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM livestock l
            WHERE l.id = livestock_health_records.livestock_id
              AND user_is_farm_admin(l.farm_id)
        )
    );

-- --------------------------------------------------------------------------
-- Crops Policies
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view crops of their farms"
    ON crops FOR SELECT
    USING (user_has_farm_access(farm_id));

CREATE POLICY "Writers can create crops"
    ON crops FOR INSERT
    WITH CHECK (user_can_write_farm(farm_id));

CREATE POLICY "Writers can update crops"
    ON crops FOR UPDATE
    USING (user_can_write_farm(farm_id))
    WITH CHECK (user_can_write_farm(farm_id));

CREATE POLICY "Admins can delete crops"
    ON crops FOR DELETE
    USING (user_is_farm_admin(farm_id));

-- --------------------------------------------------------------------------
-- Equipment Policies
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view equipment of their farms"
    ON equipment FOR SELECT
    USING (user_has_farm_access(farm_id));

CREATE POLICY "Writers can create equipment"
    ON equipment FOR INSERT
    WITH CHECK (user_can_write_farm(farm_id));

CREATE POLICY "Writers can update equipment"
    ON equipment FOR UPDATE
    USING (user_can_write_farm(farm_id))
    WITH CHECK (user_can_write_farm(farm_id));

CREATE POLICY "Admins can delete equipment"
    ON equipment FOR DELETE
    USING (user_is_farm_admin(farm_id));

-- --------------------------------------------------------------------------
-- Equipment Maintenance Policies
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view equipment maintenance of their farms"
    ON equipment_maintenance FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM equipment eq
            WHERE eq.id = equipment_maintenance.equipment_id
              AND user_has_farm_access(eq.farm_id)
        )
    );

CREATE POLICY "Writers can create equipment maintenance"
    ON equipment_maintenance FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM equipment eq
            WHERE eq.id = equipment_maintenance.equipment_id
              AND user_can_write_farm(eq.farm_id)
        )
    );

CREATE POLICY "Writers can update equipment maintenance"
    ON equipment_maintenance FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM equipment eq
            WHERE eq.id = equipment_maintenance.equipment_id
              AND user_can_write_farm(eq.farm_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM equipment eq
            WHERE eq.id = equipment_maintenance.equipment_id
              AND user_can_write_farm(eq.farm_id)
        )
    );

CREATE POLICY "Admins can delete equipment maintenance"
    ON equipment_maintenance FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM equipment eq
            WHERE eq.id = equipment_maintenance.equipment_id
              AND user_is_farm_admin(eq.farm_id)
        )
    );

-- --------------------------------------------------------------------------
-- Audit Logs Policies
-- --------------------------------------------------------------------------
CREATE POLICY "Admins can view audit logs of their farms"
    ON audit_logs FOR SELECT
    USING (user_is_farm_admin(farm_id));

CREATE POLICY "System can insert audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- SECTION 8: TRIGGERS
-- ============================================================================

-- --------------------------------------------------------------------------
-- Updated_at triggers for all tables
-- --------------------------------------------------------------------------
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_farms_updated_at
    BEFORE UPDATE ON farms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_farm_members_updated_at
    BEFORE UPDATE ON farm_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_invitations_updated_at
    BEFORE UPDATE ON team_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at
    BEFORE UPDATE ON vendors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expense_line_items_updated_at
    BEFORE UPDATE ON expense_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_income_updated_at
    BEFORE UPDATE ON income
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_line_items_updated_at
    BEFORE UPDATE ON invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_livestock_updated_at
    BEFORE UPDATE ON livestock
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_livestock_health_records_updated_at
    BEFORE UPDATE ON livestock_health_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crops_updated_at
    BEFORE UPDATE ON crops
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at
    BEFORE UPDATE ON equipment
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_maintenance_updated_at
    BEFORE UPDATE ON equipment_maintenance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------------------------
-- Auto-create user profile on auth.users insert
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_farm_id UUID;
BEGIN
    -- Create profile for the new user
    INSERT INTO profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );

    -- Create a default farm for the new user
    INSERT INTO farms (name, type)
    VALUES (
        COALESCE(NEW.raw_user_meta_data->>'farm_name', 'My Farm'),
        'MIXED'
    )
    RETURNING id INTO v_farm_id;

    -- Add the user as OWNER of their default farm
    INSERT INTO farm_members (farm_id, user_id, role)
    VALUES (v_farm_id, NEW.id, 'OWNER');

    -- Create default expense categories
    INSERT INTO categories (farm_id, name, type, is_default, color) VALUES
        (v_farm_id, 'Feed & Nutrition', 'expense', true, '#EF4444'),
        (v_farm_id, 'Veterinary & Health', 'expense', true, '#F97316'),
        (v_farm_id, 'Equipment & Machinery', 'expense', true, '#F59E0B'),
        (v_farm_id, 'Fuel & Energy', 'expense', true, '#84CC16'),
        (v_farm_id, 'Seeds & Plants', 'expense', true, '#22C55E'),
        (v_farm_id, 'Fertilizers & Chemicals', 'expense', true, '#10B981'),
        (v_farm_id, 'Labor & Wages', 'expense', true, '#14B8A6'),
        (v_farm_id, 'Repairs & Maintenance', 'expense', true, '#06B6D4'),
        (v_farm_id, 'Insurance', 'expense', true, '#0EA5E9'),
        (v_farm_id, 'Utilities', 'expense', true, '#3B82F6'),
        (v_farm_id, 'Transportation', 'expense', true, '#6366F1'),
        (v_farm_id, 'Other Expenses', 'expense', true, '#8B5CF6');

    -- Create default income categories
    INSERT INTO categories (farm_id, name, type, is_default, color) VALUES
        (v_farm_id, 'Crop Sales', 'income', true, '#22C55E'),
        (v_farm_id, 'Livestock Sales', 'income', true, '#10B981'),
        (v_farm_id, 'Dairy Products', 'income', true, '#14B8A6'),
        (v_farm_id, 'Eggs & Poultry', 'income', true, '#F59E0B'),
        (v_farm_id, 'Government Subsidies', 'income', true, '#3B82F6'),
        (v_farm_id, 'Equipment Rental', 'income', true, '#6366F1'),
        (v_farm_id, 'Services', 'income', true, '#8B5CF6'),
        (v_farm_id, 'Other Income', 'income', true, '#EC4899');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- --------------------------------------------------------------------------
-- Auto-calculate expense grand_total when line items change
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_expense_grand_total()
RETURNS TRIGGER AS $$
DECLARE
    v_expense_id UUID;
    v_total DECIMAL(12, 2);
BEGIN
    -- Determine which expense to update
    IF TG_OP = 'DELETE' THEN
        v_expense_id := OLD.expense_id;
    ELSE
        v_expense_id := NEW.expense_id;
    END IF;

    -- Calculate new total
    SELECT COALESCE(SUM(line_total), 0) INTO v_total
    FROM expense_line_items
    WHERE expense_id = v_expense_id;

    -- Update the expense
    UPDATE expenses
    SET grand_total = v_total + COALESCE(tax_amount, 0)
    WHERE id = v_expense_id;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_expense_total_on_line_item_change
    AFTER INSERT OR UPDATE OR DELETE ON expense_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_expense_grand_total();

-- --------------------------------------------------------------------------
-- Auto-calculate invoice grand_total when line items change
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_invoice_grand_total()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_subtotal DECIMAL(12, 2);
    v_tax_rate DECIMAL(5, 2);
    v_discount DECIMAL(12, 2);
BEGIN
    -- Determine which invoice to update
    IF TG_OP = 'DELETE' THEN
        v_invoice_id := OLD.invoice_id;
    ELSE
        v_invoice_id := NEW.invoice_id;
    END IF;

    -- Calculate new subtotal
    SELECT COALESCE(SUM(line_total), 0) INTO v_subtotal
    FROM invoice_line_items
    WHERE invoice_id = v_invoice_id;

    -- Get current tax rate and discount
    SELECT COALESCE(tax_rate, 0), COALESCE(discount_amount, 0)
    INTO v_tax_rate, v_discount
    FROM invoices
    WHERE id = v_invoice_id;

    -- Update the invoice
    UPDATE invoices
    SET
        subtotal = v_subtotal,
        tax_amount = v_subtotal * (v_tax_rate / 100),
        grand_total = v_subtotal + (v_subtotal * (v_tax_rate / 100)) - v_discount
    WHERE id = v_invoice_id;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_invoice_total_on_line_item_change
    AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_grand_total();

-- ============================================================================
-- SECTION 9: STORAGE BUCKETS
-- ============================================================================

-- Insert storage buckets (must be run by service_role or admin)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('receipts', 'receipts', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    ('profile-pictures', 'profile-pictures', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('invoices', 'invoices', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------------------
-- Storage Policies for receipts bucket
-- --------------------------------------------------------------------------
CREATE POLICY "Users can upload receipts for their farms"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'receipts'
        AND auth.uid() IS NOT NULL
        AND (
            -- Path format: farm_id/expense_id/filename
            user_has_farm_access((string_to_array(name, '/'))[1]::uuid)
        )
    );

CREATE POLICY "Users can view receipts of their farms"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'receipts'
        AND (
            user_has_farm_access((string_to_array(name, '/'))[1]::uuid)
        )
    );

CREATE POLICY "Users can delete receipts of their farms"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'receipts'
        AND (
            user_can_write_farm((string_to_array(name, '/'))[1]::uuid)
        )
    );

-- --------------------------------------------------------------------------
-- Storage Policies for profile-pictures bucket
-- --------------------------------------------------------------------------
CREATE POLICY "Anyone can view profile pictures"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'profile-pictures');

CREATE POLICY "Users can upload their own profile picture"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'profile-pictures'
        AND auth.uid()::text = (string_to_array(name, '/'))[1]
    );

CREATE POLICY "Users can update their own profile picture"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'profile-pictures'
        AND auth.uid()::text = (string_to_array(name, '/'))[1]
    )
    WITH CHECK (
        bucket_id = 'profile-pictures'
        AND auth.uid()::text = (string_to_array(name, '/'))[1]
    );

CREATE POLICY "Users can delete their own profile picture"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'profile-pictures'
        AND auth.uid()::text = (string_to_array(name, '/'))[1]
    );

-- --------------------------------------------------------------------------
-- Storage Policies for invoices bucket
-- --------------------------------------------------------------------------
CREATE POLICY "Users can upload invoices for their farms"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'invoices'
        AND auth.uid() IS NOT NULL
        AND (
            -- Path format: farm_id/invoice_id/filename
            user_has_farm_access((string_to_array(name, '/'))[1]::uuid)
        )
    );

CREATE POLICY "Users can view invoices of their farms"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'invoices'
        AND (
            user_has_farm_access((string_to_array(name, '/'))[1]::uuid)
        )
    );

CREATE POLICY "Users can delete invoices of their farms"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'invoices'
        AND (
            user_can_write_farm((string_to_array(name, '/'))[1]::uuid)
        )
    );

-- ============================================================================
-- SECTION 10: GRANTS
-- ============================================================================

-- Grant usage on types to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
