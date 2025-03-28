-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.settings;

-- Create policy to allow all operations for authenticated users
CREATE POLICY "Enable all operations for authenticated users"
ON public.settings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Add a policy for anonymous access if needed
DROP POLICY IF EXISTS "Enable read access for anon users" ON public.settings;
CREATE POLICY "Enable read access for anon users"
ON public.settings
FOR SELECT
TO anon
USING (true);

-- Ensure the trigger function exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS handle_updated_at ON public.settings;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at(); 