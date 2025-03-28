-- Add type column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'message';

-- Create an index on the type column
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);

-- Add constraint for valid message types
ALTER TABLE messages ADD CONSTRAINT valid_message_type 
CHECK (type IN ('message', 'debt_reminder', 'payment_reminder')); 