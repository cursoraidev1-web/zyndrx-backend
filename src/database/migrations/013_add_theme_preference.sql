-- Migration: Add Theme Preference to Users Table
-- This migration adds a theme_preference column to store user's theme preference

-- Add theme_preference column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark', 'auto'));

-- Update existing users to have default theme
UPDATE users SET theme_preference = 'light' WHERE theme_preference IS NULL;

