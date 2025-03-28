-- Add due_date column to debts table
ALTER TABLE debts
ADD COLUMN IF NOT EXISTS due_date DATE;

-- Set due_date to created_at date for existing records
UPDATE debts 
SET due_date = created_at::date 
WHERE due_date IS NULL;

-- Make due_date NOT NULL after setting default values
ALTER TABLE debts
ALTER COLUMN due_date SET NOT NULL; 