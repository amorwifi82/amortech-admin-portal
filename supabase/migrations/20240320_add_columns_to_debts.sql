-- Add collected_amount and reason columns to debts table
ALTER TABLE debts
ADD COLUMN IF NOT EXISTS collected_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS reason TEXT;

-- Update existing rows to set collected_amount to 0 if null
UPDATE debts SET collected_amount = 0 WHERE collected_amount IS NULL;

-- Make collected_amount NOT NULL after setting default values
ALTER TABLE debts
ALTER COLUMN collected_amount SET NOT NULL; 