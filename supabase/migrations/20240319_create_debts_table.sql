-- Create debts table
CREATE TABLE IF NOT EXISTS debts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partially_paid', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::TEXT, NOW()) NOT NULL
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('UTC'::TEXT, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_debts_updated_at
  BEFORE UPDATE ON debts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON debts
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON debts
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON debts
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated'); 