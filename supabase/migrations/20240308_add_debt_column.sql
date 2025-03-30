-- Add debt column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS debt DECIMAL(10,2) DEFAULT 0;

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

-- Create policies for debts table
CREATE POLICY "Enable all operations for authenticated users"
ON debts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create policy for public access (if needed)
CREATE POLICY "Enable read access for all users"
ON debts
FOR SELECT
TO PUBLIC
USING (true);

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