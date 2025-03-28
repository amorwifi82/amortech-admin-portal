-- Create the settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name TEXT NOT NULL DEFAULT '',
    company_logo TEXT NOT NULL DEFAULT '',
    company_email TEXT NOT NULL DEFAULT '',
    currency TEXT NOT NULL DEFAULT 'KES',
    notification_enabled BOOLEAN NOT NULL DEFAULT true,
    payment_reminder_days INTEGER NOT NULL DEFAULT 7,
    theme TEXT NOT NULL DEFAULT 'system',
    language TEXT NOT NULL DEFAULT 'en',
    timezone TEXT NOT NULL DEFAULT 'Africa/Nairobi',
    data_retention_days INTEGER NOT NULL DEFAULT 365,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
CREATE POLICY "Enable all operations for authenticated users"
ON public.settings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at(); 