-- First, remove all existing policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.settings;
DROP POLICY IF EXISTS "Enable read access for anon users" ON public.settings;
DROP POLICY IF EXISTS "Enable insert for anon users" ON public.settings;
DROP POLICY IF EXISTS "Enable update for anon users" ON public.settings;
DROP POLICY IF EXISTS "Enable delete for anon users" ON public.settings;

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON public.settings TO authenticated;
GRANT ALL ON public.settings TO anon;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create a single policy for all operations
CREATE POLICY "Enable all operations for everyone"
ON public.settings
FOR ALL
TO PUBLIC
USING (true)
WITH CHECK (true);

-- Ensure the updated_at trigger is working
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_updated_at ON public.settings;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

VITE_GOOGLE_DRIVE_CLIENT_ID=your_client_id
VITE_GOOGLE_DRIVE_CLIENT_SECRET=your_client_secret
VITE_DROPBOX_APP_KEY=your_app_key
VITE_DROPBOX_APP_SECRET=your_app_secret 