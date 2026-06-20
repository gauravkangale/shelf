require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { neon } = require('@neondatabase/serverless');
const { Resend } = require('resend');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── DB & Email clients ───────────────────────────────────────────────────────
let isInMemory = false;
const inMemoryStore = {
  users: [],
  otp_tokens: [],
  sessions: []
};

let neonClient;
try {
  if (process.env.DATABASE_URL) {
    neonClient = neon(process.env.DATABASE_URL);
  } else {
    console.warn('⚠️ No DATABASE_URL provided. Operating in-memory only.');
    isInMemory = true;
  }
} catch (e) {
  console.warn('⚠️ Failed to initialize Neon client. Operating in-memory only.', e);
  isInMemory = true;
}

const resend = new Resend(process.env.RESEND_API_KEY || 'dummy_key');

async function sql(strings, ...values) {
  if (!isInMemory && neonClient) {
    try {
      return await neonClient(strings, ...values);
    } catch (dbErr) {
      console.error('⚠️ Database connection failed. Switching to in-memory fallback.', dbErr.message);
      isInMemory = true;
    }
  }

  const query = strings.reduce((acc, str, i) => acc + str + (values[i] !== undefined ? `__VAL_${i}__` : ''), '').trim();

  if (query.startsWith('CREATE') || query.startsWith('ALTER')) {
    return [];
  }

  // SELECT FROM users
  if (query.includes('SELECT') && query.includes('users')) {
    if (query.includes('email =')) {
      const email = values[0];
      return inMemoryStore.users.filter(u => u.email === email);
    }
    if (query.includes('phone =')) {
      const phone = values[0];
      return inMemoryStore.users.filter(u => u.phone === phone);
    }
    if (query.includes('id =')) {
      const id = values[0];
      return inMemoryStore.users.filter(u => u.id === id);
    }
    if (query.includes('name') || query.includes('LOWER(name)')) {
      const name = values[0];
      return inMemoryStore.users.filter(u => u.name && u.name.toLowerCase() === name.toLowerCase());
    }
    return inMemoryStore.users;
  }

  // SELECT FROM otp_tokens
  if (query.includes('SELECT') && query.includes('otp_tokens')) {
    const identifier = values[0];
    const otp = values[1];
    const purpose = values[2];
    const found = inMemoryStore.otp_tokens.filter(t => 
      t.identifier === identifier &&
      t.otp_code === otp &&
      t.purpose === purpose &&
      !t.used &&
      new Date(t.expires_at) > new Date()
    ).sort((a, b) => b.created_at - a.created_at);
    return found.slice(0, 1);
  }

  // UPDATE otp_tokens SET used = true
  if (query.includes('UPDATE otp_tokens SET used = true') || query.includes('UPDATE otp_tokens SET used=true')) {
    if (query.includes('identifier =')) {
      const identifier = values[0];
      const purpose = values[1];
      inMemoryStore.otp_tokens.forEach(t => {
        if (t.identifier === identifier && t.purpose === purpose) {
          t.used = true;
        }
      });
    } else if (query.includes('id =')) {
      const id = values[0];
      inMemoryStore.otp_tokens.forEach(t => {
        if (t.id === id) {
          t.used = true;
        }
      });
    }
    return [];
  }

  // INSERT INTO otp_tokens
  if (query.includes('INSERT INTO otp_tokens')) {
    const newToken = {
      id: crypto.randomUUID(),
      identifier: values[0],
      otp_code: values[1],
      purpose: values[2],
      expires_at: values[3],
      used: false,
      created_at: new Date()
    };
    inMemoryStore.otp_tokens.push(newToken);
    return [newToken];
  }

  // INSERT INTO users
  if (query.includes('INSERT INTO users')) {
    const isEmail = query.includes('email');
    const identifier = values[0];
    const name = values[1];
    let user = inMemoryStore.users.find(u => isEmail ? u.email === identifier : u.phone === identifier);
    if (!user) {
      user = {
        id: crypto.randomUUID(),
        email: isEmail ? identifier : null,
        phone: !isEmail ? identifier : null,
        name: name || null,
        avatar_url: '',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      };
      inMemoryStore.users.push(user);
    } else {
      user.is_verified = true;
      if (name) user.name = name;
    }
    return [user];
  }

  // INSERT INTO sessions
  if (query.includes('INSERT INTO sessions')) {
    const session = {
      id: crypto.randomUUID(),
      user_id: values[0],
      token_hash: values[1],
      expires_at: values[2],
      created_at: new Date()
    };
    inMemoryStore.sessions.push(session);
    return [session];
  }

  // DELETE FROM sessions
  if (query.includes('DELETE FROM sessions')) {
    const tokenHash = values[0];
    inMemoryStore.sessions = inMemoryStore.sessions.filter(s => s.token_hash !== tokenHash);
    return [];
  }

  return [];
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token expired or invalid' });
  }
}

async function sendOtpEmail(toEmail, otp, purpose) {
  const purposeLabels = {
    signup: 'Verify your email',
    login: 'Your login code',
    reset: 'Reset your password'
  };
  const subject = purposeLabels[purpose] || 'Your Shelf OTP';

  await resend.emails.send({
    from: process.env.FROM_EMAIL || 'Shelf <onboarding@resend.dev>',
    to: toEmail,
    subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Georgia', serif; background: #f5f4ee; margin: 0; padding: 40px 20px; }
          .card { max-width: 460px; margin: 0 auto; background: #ffffff; border-radius: 12px;
                  border: 1px solid #e4e3da; padding: 40px; box-shadow: 0 8px 30px rgba(0,0,0,0.08); }
          .logo { font-size: 22px; font-weight: 700; color: #b33933; margin-bottom: 28px; }
          .otp  { font-family: 'Courier New', monospace; font-size: 38px; font-weight: 700;
                  letter-spacing: 12px; color: #1e2022; background: #f5f4ee;
                  border-radius: 8px; padding: 16px 24px; text-align: center; margin: 24px 0; }
          .note { font-size: 13px; color: #6b6457; line-height: 1.6; }
          .expires { color: #e85d56; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">📚 Shelf</div>
          <p style="font-size:16px;color:#1e2022;margin:0 0 8px;">Your verification code</p>
          <p style="font-size:13px;color:#6b6457;margin:0 0 4px;">Use this code to ${subject.toLowerCase()}.</p>
          <div class="otp">${otp}</div>
          <p class="note">This code <span class="expires">expires in 10 minutes</span>. 
          Do not share it with anyone. If you didn't request this, ignore this email.</p>
        </div>
      </body>
      </html>
    `
  });
}

// ─── Initialize DB ────────────────────────────────────────────────────────────
async function initDb() {
  await sql`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto"
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        TEXT,
      email       TEXT UNIQUE,
      phone       TEXT UNIQUE,
      avatar_url  TEXT,
      google_id   TEXT UNIQUE,
      is_verified BOOLEAN DEFAULT false,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS otp_tokens (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      identifier  TEXT NOT NULL,
      otp_code    TEXT NOT NULL,
      purpose     TEXT NOT NULL,
      expires_at  TIMESTAMPTZ NOT NULL,
      used        BOOLEAN DEFAULT false,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash  TEXT NOT NULL,
      expires_at  TIMESTAMPTZ NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('✅ DB tables ready');
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// ── POST /api/auth/send-otp ───────────────────────────────────────────────────
// Body: { identifier: "email@x.com" | "+91XXXXXXXXXX", purpose: "signup"|"login", name?: string }
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { identifier, purpose, name } = req.body;
    if (!identifier || !purpose) {
      return res.status(400).json({ error: 'identifier and purpose are required' });
    }

    const isEmail = identifier.includes('@');
    const cleanId = identifier.trim().toLowerCase();

    // For signup: check if user already exists
    if (purpose === 'signup') {
      if (name) {
        const cleanName = name.trim();
        const existingName = await sql`SELECT id FROM users WHERE LOWER(name) = LOWER(${cleanName})`;
        if (existingName.length > 0) {
          return res.status(409).json({ error: 'The username is already taken.' });
        }
      }

      let existing;
      if (isEmail) {
        existing = await sql`SELECT id FROM users WHERE email = ${cleanId}`;
      } else {
        existing = await sql`SELECT id FROM users WHERE phone = ${cleanId}`;
      }
      if (existing.length > 0) {
        return res.status(409).json({ error: 'An account with this email/phone already exists.' });
      }
    }

    // For login: check user exists
    if (purpose === 'login') {
      let existing;
      if (isEmail) {
        existing = await sql`SELECT id FROM users WHERE email = ${cleanId}`;
      } else {
        existing = await sql`SELECT id FROM users WHERE phone = ${cleanId}`;
      }
      if (existing.length === 0) {
        return res.status(404).json({ error: 'No account found. Please sign up first.' });
      }
    }

    // Invalidate old unused OTPs for this identifier
    await sql`
      UPDATE otp_tokens SET used = true
      WHERE identifier = ${cleanId} AND purpose = ${purpose} AND used = false
    `;

    // Generate & store new OTP
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await sql`
      INSERT INTO otp_tokens (identifier, otp_code, purpose, expires_at)
      VALUES (${cleanId}, ${otp}, ${purpose}, ${expiresAt})
    `;

    // Send via Resend (email only; phone SMS can be added with Twilio)
    if (isEmail) {
      try {
        await sendOtpEmail(cleanId, otp, purpose);
      } catch (emailErr) {
        console.error('📧 Resend email send failed. Logging OTP to console instead:', emailErr.message);
        console.log(`🔑 [FALLBACK] Email OTP for ${cleanId}: ${otp}`);
      }
    } else {
      // TODO: Integrate Twilio for SMS
      console.log(`📱 SMS OTP for ${cleanId}: ${otp}`);
    }

    res.json({ success: true, message: `OTP sent to ${isEmail ? 'email' : 'phone'}` });
  } catch (err) {
    console.error('send-otp error:', err);
    res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
});

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────
// Body: { identifier, otp, purpose, name? (for signup) }
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { identifier, otp, purpose, name } = req.body;
    if (!identifier || !otp || !purpose) {
      return res.status(400).json({ error: 'identifier, otp, and purpose are required' });
    }

    const cleanId = identifier.trim().toLowerCase();
    const isEmail = cleanId.includes('@');

    // Validate OTP
    const [token] = await sql`
      SELECT * FROM otp_tokens
      WHERE identifier = ${cleanId}
        AND otp_code = ${otp}
        AND purpose = ${purpose}
        AND used = false
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (!token) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Please request a new one.' });
    }

    // Mark OTP as used
    await sql`UPDATE otp_tokens SET used = true WHERE id = ${token.id}`;

    let user;

    if (purpose === 'signup') {
      // Create user
      if (isEmail) {
        [user] = await sql`
          INSERT INTO users (email, name, is_verified)
          VALUES (${cleanId}, ${name || null}, true)
          ON CONFLICT (email) DO UPDATE SET is_verified = true, name = COALESCE(EXCLUDED.name, users.name)
          RETURNING *
        `;
      } else {
        [user] = await sql`
          INSERT INTO users (phone, name, is_verified)
          VALUES (${cleanId}, ${name || null}, true)
          ON CONFLICT (phone) DO UPDATE SET is_verified = true, name = COALESCE(EXCLUDED.name, users.name)
          RETURNING *
        `;
      }
    } else {
      // Login — find user
      if (isEmail) {
        [user] = await sql`SELECT * FROM users WHERE email = ${cleanId}`;
      } else {
        [user] = await sql`SELECT * FROM users WHERE phone = ${cleanId}`;
      }
      if (!user) return res.status(404).json({ error: 'User not found' });
    }

    // Issue JWT
    const jwtToken = signToken(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const tokenHash = crypto.createHash('sha256').update(jwtToken).digest('hex');
    await sql`
      INSERT INTO sessions (user_id, token_hash, expires_at)
      VALUES (${user.id}, ${tokenHash}, ${expiresAt})
    `;

    res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar_url: user.avatar_url,
        is_verified: user.is_verified
      }
    });
  } catch (err) {
    console.error('verify-otp error:', err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// ── POST /api/auth/google ─────────────────────────────────────────────────────
// Body: { credential: "<google JWT>" }
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'credential is required' });

    // Decode Google JWT (verify with Google in production)
    const [, payloadB64] = credential.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));

    if (!payload.email) return res.status(400).json({ error: 'Invalid Google token' });

    // Upsert user
    const [user] = await sql`
      INSERT INTO users (email, name, avatar_url, google_id, is_verified)
      VALUES (${payload.email}, ${payload.name}, ${payload.picture}, ${payload.sub}, true)
      ON CONFLICT (email) DO UPDATE
        SET google_id   = EXCLUDED.google_id,
            avatar_url  = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
            is_verified = true
      RETURNING *
    `;

    const jwtToken = signToken(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const tokenHash = crypto.createHash('sha256').update(jwtToken).digest('hex');
    await sql`
      INSERT INTO sessions (user_id, token_hash, expires_at)
      VALUES (${user.id}, ${tokenHash}, ${expiresAt})
    `;

    res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
        is_verified: user.is_verified
      }
    });
  } catch (err) {
    console.error('google auth error:', err);
    res.status(500).json({ error: 'Google sign-in failed.' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    const [user] = await sql`
      SELECT id, name, email, phone, avatar_url, is_verified, created_at
      FROM users WHERE id = ${req.user.sub}
    `;
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
app.post('/api/auth/logout', verifyToken, async (req, res) => {
  try {
    const auth = req.headers.authorization.slice(7);
    const tokenHash = crypto.createHash('sha256').update(auth).digest('hex');
    await sql`DELETE FROM sessions WHERE token_hash = ${tokenHash}`;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ── GET /api/health ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'Shelf Auth API' }));

// ─── Start ────────────────────────────────────────────────────────────────────
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Shelf Auth API running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('⚠️ DB init failed:', err.message);
  isInMemory = true;
  app.listen(PORT, () => {
    console.log(`🚀 Shelf Auth API running on http://localhost:${PORT} (Fallback Mode)`);
  });
});
