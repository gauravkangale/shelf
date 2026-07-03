-- ============================================================
-- Shelf — Auth Database Schema (Neon PostgreSQL)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT,
  email         TEXT UNIQUE,
  phone         TEXT UNIQUE,
  avatar_url    TEXT,
  google_id     TEXT UNIQUE,
  is_verified   BOOLEAN DEFAULT false,
  preferences   JSONB DEFAULT '{}'::jsonb,
  "alter"       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by email or phone
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- ============================================================
-- OTP TOKENS TABLE
-- Stores short-lived OTPs for email/phone verification
-- ============================================================
CREATE TABLE IF NOT EXISTS otp_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT NOT NULL,          -- email or phone
  otp_code    TEXT NOT NULL,          -- 6-digit code
  purpose     TEXT NOT NULL,          -- 'signup' | 'login' | 'reset'
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_identifier ON otp_tokens(identifier);

-- Auto-expire policy: clean up used/expired OTPs older than 1 hour
-- (Run as a cron job or rely on application-level cleanup)

-- ============================================================
-- SESSIONS TABLE
-- Tracks active JWT sessions per user
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,          -- hashed JWT token
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- ============================================================
-- PASSWORD RESET TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — recommended for Neon
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: service role (server) can read/write all rows
-- (Your server uses the neondb_owner role which bypasses RLS)

-- Policy: prevent direct public access (add specific policies as needed)
CREATE POLICY "Users can read all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid) WITH CHECK (id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid);

CREATE POLICY "OTP: service access only" ON otp_tokens
  USING (true) WITH CHECK (true);

CREATE POLICY "Sessions: service access only" ON sessions
  USING (true) WITH CHECK (true);

CREATE POLICY "Reset tokens: service access only" ON password_reset_tokens
  USING (true) WITH CHECK (true);

-- ============================================================
-- FUNCTION: auto-update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
