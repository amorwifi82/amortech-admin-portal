-- Add debt column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS debt DECIMAL(10,2) DEFAULT 0;

-- Add status column if it doesn't exist
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Pending';

-- Update status enum
ALTER TABLE clients 
  DROP CONSTRAINT IF EXISTS clients_status_check;

ALTER TABLE clients
  ADD CONSTRAINT clients_status_check 
  CHECK (status IN ('Pending', 'Paid', 'Overdue'));

-- Create debts table if it doesn't exist
CREATE TABLE IF NOT EXISTS debts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) CHECK (status IN ('pending', 'partially_paid', 'paid')) DEFAULT 'pending',
    collected_amount DECIMAL(10,2) DEFAULT 0,
    due_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON debts;
DROP POLICY IF EXISTS "Enable read access for all users" ON debts;

-- Create specific policies for debts table
CREATE POLICY "Enable insert for all users"
ON debts
FOR INSERT
TO PUBLIC
WITH CHECK (true);

CREATE POLICY "Enable select for all users"
ON debts
FOR SELECT
TO PUBLIC
USING (true);

CREATE POLICY "Enable update for all users"
ON debts
FOR UPDATE
TO PUBLIC
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for all users"
ON debts
FOR DELETE
TO PUBLIC
USING (true);

-- Grant necessary permissions
GRANT ALL ON debts TO anon;
GRANT ALL ON debts TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON debts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at(); 