-- Add user_nickname column to building_votes table
-- Run this in Supabase SQL Editor

ALTER TABLE building_votes 
ADD COLUMN IF NOT EXISTS user_nickname VARCHAR(255);

-- Add comment
COMMENT ON COLUMN building_votes.user_nickname IS 'User nickname stored at vote time';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_building_votes_user_nickname ON building_votes(user_nickname);

-- Update existing rows with a default value (optional)
-- UPDATE building_votes SET user_nickname = 'Anonymous' WHERE user_nickname IS NULL;

SELECT 'user_nickname column added successfully!' as message;

