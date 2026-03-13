-- Add missing tables for HarvesTrackr
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/fsavvkjgjaqciebkzykk/sql/new

-- ============================================================================
-- FIELDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    acres DECIMAL(10, 2),
    description TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fields_farm_id ON fields(farm_id);

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

CREATE INDEX IF NOT EXISTS idx_chicken_flocks_farm_id ON chicken_flocks(farm_id);

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

CREATE INDEX IF NOT EXISTS idx_egg_logs_flock_id ON egg_logs(flock_id);
CREATE INDEX IF NOT EXISTS idx_egg_logs_date ON egg_logs(date);

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

CREATE INDEX IF NOT EXISTS idx_inventory_items_farm_id ON inventory_items(farm_id);

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

CREATE INDEX IF NOT EXISTS idx_livestock_families_parent_id ON livestock_families(parent_id);
CREATE INDEX IF NOT EXISTS idx_livestock_families_child_id ON livestock_families(child_id);

-- Done! Tables created for fields, chicken flocks, egg logs, inventory items, and livestock families.
