-- Ensure RLS is enabled
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow public access to settings table
GRANT ALL ON public.settings TO anon;
GRANT ALL ON public.settings TO authenticated;

-- Reset policies
DROP POLICY IF EXISTS "Enable insert for anon users" ON public.settings;
DROP POLICY IF EXISTS "Enable update for anon users" ON public.settings;
DROP POLICY IF EXISTS "Enable delete for anon users" ON public.settings;

-- Create comprehensive policies for anon users since we're using anon key
CREATE POLICY "Enable insert for anon users"
ON public.settings
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Enable update for anon users"
ON public.settings
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for anon users"
ON public.settings
FOR DELETE
TO anon
USING (true); 