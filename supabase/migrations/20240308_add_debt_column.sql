-- Add debt column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS debt DECIMAL(10,2) DEFAULT 0;

-- Update status enum
ALTER TABLE clients 
  DROP CONSTRAINT IF EXISTS clients_status_check;

ALTER TABLE clients
  ADD CONSTRAINT clients_status_check 
  CHECK (status IN ('Pending', 'Paid', 'Overdue')); 