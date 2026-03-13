-- Run this in Supabase SQL Editor to allow null created_by temporarily for data import
-- https://supabase.com/dashboard/project/fsavvkjgjaqciebkzykk/sql/new

-- Make created_by nullable for expenses
ALTER TABLE expenses ALTER COLUMN created_by DROP NOT NULL;

-- Make created_by nullable for income
ALTER TABLE income ALTER COLUMN created_by DROP NOT NULL;

-- Make created_by nullable for invoices
ALTER TABLE invoices ALTER COLUMN created_by DROP NOT NULL;

-- Done! Now you can run the import script again.
