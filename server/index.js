require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { neon } = require('@neondatabase/serverless');
const { Resend } = require('resend');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const PORT = process.env.PORT || 3001;

const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

// ─── DB & Email clients ───────────────────────────────────────────────────────
let isInMemory = false;
const inMemoryStore = {
  users: [],
  otp_tokens: [],
  sessions: [],
  messages: [],
  groups: [
    { id: 'g1', name: 'Design Systems', description: 'Visual design, layout components, and branding aesthetics.' },
    { id: 'g2', name: 'Engineering Core', description: 'Database performance, API endpoints, and system architecture.' },
    { id: 'g3', name: 'Product Planning', description: 'Roadmaps, feature specifications, and timeline coordination.' },
    { id: 'g4', name: 'General Assembly', description: 'All-hands discussion, general announcements, and casual chats.' }
  ],
  group_members: [],
  friendships: []
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
      console.error('⚠️ Database query error:', dbErr.message || dbErr);
      throw dbErr;
    }
  }

  const query = strings.reduce((acc, str, i) => acc + str + (values[i] !== undefined ? `__VAL_${i}__` : ''), '').trim();

  if (query.startsWith('CREATE') || query.startsWith('ALTER')) {
    return [];
  }

  // SELECT FROM groups
  if (query.includes('SELECT') && query.includes('FROM groups')) {
    if (query.includes('JOIN group_members')) {
      const userId = values[0];
      const myGroupIds = new Set(
        inMemoryStore.group_members
          .filter(gm => gm.user_id === userId)
          .map(gm => gm.group_id)
      );
      return inMemoryStore.groups
        .filter(g => myGroupIds.has(g.id))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    return inMemoryStore.groups;
  }

  // SELECT FROM users for search (ILIKE / LIKE)
  if ((query.includes('ILIKE') || query.includes('LIKE')) && query.includes('users') && query.includes('username')) {
    const hasExcludedUser = query.includes('id !=');
    const patternValue = hasExcludedUser ? values[1] : values[0];
    const excludeId = hasExcludedUser ? values[0] : values[1];
    const pattern = patternValue ? patternValue.replace(/%/g, '').toLowerCase() : '';
    return inMemoryStore.users.filter(u =>
      u.id !== excludeId &&
      ((u.username && u.username.toLowerCase().includes(pattern)) ||
       (u.name && u.name.toLowerCase().includes(pattern)))
    ).slice(0, 15).map(u => ({
      id: u.id, name: u.name, username: u.username, avatar_url: u.avatar_url
    }));
  }

  // INSERT INTO groups
  if (query.includes('INSERT INTO groups')) {
    const name = values[0];
    const description = values[1];
    let grp = inMemoryStore.groups.find(g => g.name === name);
    if (!grp) {
      grp = { id: crypto.randomUUID(), name, description, created_at: new Date() };
      inMemoryStore.groups.push(grp);
    }
    return [grp];
  }

  // SELECT FROM group_members
  if (query.includes('SELECT') && query.includes('group_members')) {
    if (query.includes('JOIN users') && query.includes('IN (')) {
      const userId = values[0];
      const myGroupIds = new Set(
        inMemoryStore.group_members
          .filter(gm => gm.user_id === userId)
          .map(gm => gm.group_id)
      );
      return inMemoryStore.group_members
        .filter(gm => myGroupIds.has(gm.group_id))
        .map(gm => {
          const u = inMemoryStore.users.find(usr => usr.id === gm.user_id);
          if (!u) return null;
          return {
            group_id: gm.group_id,
            id: u.id,
            name: u.name,
            username: u.username,
            avatar_url: u.avatar_url,
            books: u.books,
            created_at: u.created_at
          };
        })
        .filter(Boolean)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    // Membership check: WHERE group_id = X AND user_id = Y
    if (query.includes('group_id =') && query.includes('user_id =')) {
      const groupId = values[0];
      const userId = values[1];
      return inMemoryStore.group_members.filter(gm => gm.group_id === groupId && gm.user_id === userId);
    }
    if (query.includes('user_id =')) {
      const userId = values[0];
      return inMemoryStore.group_members.filter(gm => gm.user_id === userId);
    }
    if (query.includes('group_id =')) {
      const groupId = values[0];
      const matches = inMemoryStore.group_members.filter(gm => gm.group_id === groupId);
      return matches.map(m => {
        const u = inMemoryStore.users.find(usr => usr.id === m.user_id);
        if (!u) return null;
        return { id: u.id, name: u.name, username: u.username, avatar_url: u.avatar_url, books: u.books, created_at: u.created_at };
      }).filter(Boolean);
    }
    return inMemoryStore.group_members;
  }

  // INSERT INTO group_members
  if (query.includes('INSERT INTO group_members')) {
    const groupId = values[0];
    const userId = values[1];
    const exists = inMemoryStore.group_members.some(gm => gm.group_id === groupId && gm.user_id === userId);
    if (!exists) {
      inMemoryStore.group_members.push({ group_id: groupId, user_id: userId });
    }
    return [];
  }

  // DELETE FROM group_members
  if (query.includes('DELETE FROM group_members')) {
    const groupId = values[0];
    const userId = values[1];
    inMemoryStore.group_members = inMemoryStore.group_members.filter(
      gm => !(gm.group_id === groupId && gm.user_id === userId)
    );
    return [];
  }

  // SELECT FROM friendships
  if (query.includes('SELECT') && query.includes('friendships')) {
    if (query.includes('SELECT 1')) {
      const id1 = values[0];
      const id2 = values[1];
      return inMemoryStore.friendships.filter(f =>
        f.user_id_1 === id1 && f.user_id_2 === id2 && f.status === 'accepted'
      );
    }

    if (query.includes('SELECT status, sender_id') || query.includes('SELECT sender_id')) {
      const id1 = values[0];
      const id2 = values[1];
      return inMemoryStore.friendships
        .filter(f => f.user_id_1 === id1 && f.user_id_2 === id2)
        .map(f => ({ status: f.status, sender_id: f.sender_id }));
    }

    const userId = values[0];
    const rows = inMemoryStore.friendships.filter(f =>
      f.user_id_1 === userId || f.user_id_2 === userId
    );

    if (query.includes("f.status = 'accepted'")) {
      return rows
        .filter(f => f.status === 'accepted')
        .map(f => {
          const friendId = f.user_id_1 === userId ? f.user_id_2 : f.user_id_1;
          const u = inMemoryStore.users.find(user => user.id === friendId);
          return u ? { id: u.id, name: u.name, username: u.username, avatar_url: u.avatar_url } : null;
        })
        .filter(Boolean);
    }

    if (query.includes("f.status = 'pending'") && query.includes('f.sender_id !=')) {
      return rows
        .filter(f => f.status === 'pending' && f.sender_id !== userId)
        .map(f => {
          const u = inMemoryStore.users.find(user => user.id === f.sender_id);
          return u ? { id: u.id, name: u.name, username: u.username, avatar_url: u.avatar_url } : null;
        })
        .filter(Boolean);
    }

    if (query.includes("f.status = 'pending'") && query.includes('f.sender_id =')) {
      return rows
        .filter(f => f.status === 'pending' && f.sender_id === userId)
        .map(f => {
          const friendId = f.user_id_1 === userId ? f.user_id_2 : f.user_id_1;
          const u = inMemoryStore.users.find(user => user.id === friendId);
          return u ? { id: u.id, name: u.name, username: u.username, avatar_url: u.avatar_url } : null;
        })
        .filter(Boolean);
    }

    return rows;
  }

  // INSERT INTO friendships
  if (query.includes('INSERT INTO friendships')) {
    const user_id_1 = values[0];
    const user_id_2 = values[1];
    const sender_id = values[2];
    const existing = inMemoryStore.friendships.find(f =>
      f.user_id_1 === user_id_1 && f.user_id_2 === user_id_2
    );
    if (!existing) {
      inMemoryStore.friendships.push({
        user_id_1,
        user_id_2,
        status: 'pending',
        sender_id,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
    return [];
  }

  // UPDATE friendships
  if (query.includes('UPDATE friendships')) {
    const id1 = values[0];
    const id2 = values[1];
    const row = inMemoryStore.friendships.find(f => f.user_id_1 === id1 && f.user_id_2 === id2);
    if (row) {
      row.status = 'accepted';
      row.updated_at = new Date();
    }
    return [];
  }

  // DELETE FROM friendships
  if (query.includes('DELETE FROM friendships')) {
    const id1 = values[0];
    const id2 = values[1];
    inMemoryStore.friendships = inMemoryStore.friendships.filter(f =>
      !(f.user_id_1 === id1 && f.user_id_2 === id2)
    );
    return [];
  }

  // Mutual teammates lookup
  if (query.includes('group_members gm1') && query.includes('gm1.user_id =')) {
    const userId = values[0];
    const myGroups = inMemoryStore.group_members.filter(gm => gm.user_id === userId).map(gm => gm.group_id);
    const teammateIds = new Set();
    inMemoryStore.group_members.forEach(gm => {
      if (myGroups.includes(gm.group_id) && gm.user_id !== userId) {
        teammateIds.add(gm.user_id);
      }
    });
    const teammates = [];
    teammateIds.forEach(tid => {
      const u = inMemoryStore.users.find(usr => usr.id === tid);
      if (u) {
        teammates.push({
          id: u.id,
          name: u.name,
          username: u.username,
          avatar_url: u.avatar_url,
          updated_at: u.updated_at,
          books: u.books,
          daily_notes: u.daily_notes
        });
      }
    });
    return teammates;
  }

  // SELECT FROM users
  if (query.includes('SELECT') && query.includes('users')) {
    // Must check 'id =' before generic checks — this is the user-by-id lookup
    if (query.includes('id =') || query.includes('id=')) {
      const id = values[0];
      return inMemoryStore.users.filter(u => u.id === id);
    }
    if (query.includes('LOWER(username) =') || query.includes('username =')) {
      const username = values[0];
      const excludeId = values[1];
      return inMemoryStore.users.filter(u =>
        u.username && u.username.toLowerCase() === username.toLowerCase() && (!excludeId || u.id !== excludeId)
      );
    }
    if (query.includes('LOWER(email) =') || query.includes('email =')) {
      const email = values[0];
      const excludeId = values[1];
      return inMemoryStore.users.filter(u =>
        u.email && u.email.toLowerCase() === email.toLowerCase() && (!excludeId || u.id !== excludeId)
      );
    }
    if (query.includes('phone =')) {
      const phone = values[0];
      return inMemoryStore.users.filter(u => u.phone === phone);
    }
    if (query.includes('LOWER(name)') || query.includes("name =")) {
      const name = values[0];
      return inMemoryStore.users.filter(u => u.name && u.name.toLowerCase() === name.toLowerCase());
    }
    return inMemoryStore.users;
  }

  // UPDATE users
  if (query.includes('UPDATE users')) {
    // values will be: name, username, email, avatar_url, userId
    const name = values[0];
    const username = values[1];
    const email = values[2];
    const avatar_url = values[3];
    const userId = values[4];
    const user = inMemoryStore.users.find(u => u.id === userId);
    if (user) {
      user.name = name;
      user.username = username;
      user.email = email;
      user.avatar_url = avatar_url;
      user.updated_at = new Date();
      return [user];
    }
    return [];
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
        username: name ? name.toLowerCase().replace(/\s+/g, '') : null,
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

  // SELECT FROM messages (with JOIN users for enriched fields)
  if (query.includes('SELECT') && query.includes('messages')) {
    if (query.includes('MAX(created_at)')) {
      const userId = values[0];
      const myGroupIds = new Set(
        inMemoryStore.group_members
          .filter(gm => gm.user_id === userId)
          .map(gm => gm.group_id)
      );
      const latestByGroup = new Map();
      inMemoryStore.messages
        .filter(m => m.group_id && myGroupIds.has(m.group_id))
        .forEach(m => {
          const current = latestByGroup.get(m.group_id);
          if (!current || new Date(m.created_at) > new Date(current)) {
            latestByGroup.set(m.group_id, m.created_at);
          }
        });
      return Array.from(latestByGroup, ([group_id, last_message_at]) => ({
        group_id,
        last_message_at
      }));
    }
    if (query.includes('group_id =')) {
      const groupId = values[0];
      const msgs = inMemoryStore.messages
        .filter(m => m.group_id === groupId)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      // Enrich with user info
      return msgs.map(m => {
        const u = inMemoryStore.users.find(u => u.id === m.sender_id) || {};
        return {
          id: m.id,
          senderId: m.sender_id,
          groupId: m.group_id,
          text: m.message_text,
          createdAt: m.created_at,
          name: u.name || null,
          username: u.username || null,
          avatar_url: u.avatar_url || null
        };
      });
    }
    const val0 = values[0];
    const val1 = values[1];
    return inMemoryStore.messages.filter(m =>
      (m.sender_id === val0 && m.receiver_id === val1) ||
      (m.sender_id === val1 && m.receiver_id === val0)
    ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map(m => ({
        id: m.id,
        senderId: m.sender_id,
        text: m.message_text,
        createdAt: m.created_at
      }));
  }

  // INSERT INTO messages — return aliased fields matching SQL RETURNING clause
  if (query.includes('INSERT INTO messages')) {
    if (query.includes('group_id')) {
      const sender_id = values[0];
      const group_id = values[1];
      const message_text = values[2];
      const rawMsg = {
        id: crypto.randomUUID(),
        sender_id,
        group_id,
        message_text,
        created_at: new Date()
      };
      inMemoryStore.messages.push(rawMsg);
      // Return aliased to match RETURNING clause
      return [{
        id: rawMsg.id,
        senderId: rawMsg.sender_id,
        groupId: rawMsg.group_id,
        text: rawMsg.message_text,
        createdAt: rawMsg.created_at
      }];
    } else {
      const sender_id = values[0];
      const receiver_id = values[1];
      const message_text = values[2];
      const rawMsg = {
        id: crypto.randomUUID(),
        sender_id,
        receiver_id,
        message_text,
        created_at: new Date()
      };
      inMemoryStore.messages.push(rawMsg);
      return [{ id: rawMsg.id, senderId: rawMsg.sender_id, text: rawMsg.message_text, createdAt: rawMsg.created_at }];
    }
  }

  return [];
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const JWT_SECRET = process.env.JWT_SECRET || 'shelf_dev_secret_key_do_not_use_in_prod';

function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized — no token provided.' });
  }
  const token = auth.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized — empty token.' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    console.error('Token verify failed:', err.message);
    res.status(401).json({ error: 'Token expired or invalid. Please log in again.' });
  }
}

async function isGroupMember(groupId, userId) {
  const rows = await sql`
    SELECT 1 FROM group_members WHERE group_id = ${groupId} AND user_id = ${userId}
  `;
  return rows.length > 0;
}

async function areAcceptedFriends(userId, friendId) {
  const id1 = userId < friendId ? userId : friendId;
  const id2 = userId < friendId ? friendId : userId;
  const rows = await sql`
    SELECT 1 FROM friendships
    WHERE user_id_1 = ${id1} AND user_id_2 = ${id2} AND status = 'accepted'
  `;
  return rows.length > 0;
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
  if (!isInMemory && neonClient) {
    try {
      const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
      const tableNames = tables.map(t => t.table_name);
      if (tableNames.includes('shortcuts') || tableNames.includes('daily_notes') || tableNames.includes('books') || tableNames.includes('sessions') || tableNames.includes('otp_tokens')) {
        console.log('🔄 Old table structure detected. Migrating database to unified schema...');
        await sql`DROP TABLE IF EXISTS friendships CASCADE`;
        await sql`DROP TABLE IF EXISTS books CASCADE`;
        await sql`DROP TABLE IF EXISTS daily_notes CASCADE`;
        await sql`DROP TABLE IF EXISTS shortcuts CASCADE`;
        await sql`DROP TABLE IF EXISTS sessions CASCADE`;
        await sql`DROP TABLE IF EXISTS otp_tokens CASCADE`;
        await sql`DROP TABLE IF EXISTS users CASCADE`;
      }
      if (!tableNames.includes('groups') && tableNames.includes('users')) {
        console.log('🔄 Migrating schema for Bookshelf groups and Group Chats...');
        await sql`DROP TABLE IF EXISTS messages CASCADE`;
        await sql`DROP TABLE IF EXISTS friendships CASCADE`;
        await sql`DROP TABLE IF EXISTS groups CASCADE`;
        await sql`DROP TABLE IF EXISTS group_members CASCADE`;
      }
    } catch (e) {
      console.warn('⚠️ Migration check failed, continuing with table creation:', e.message);
    }
  }

  await sql`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto"
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name            TEXT,
      username        TEXT UNIQUE,
      email           TEXT UNIQUE,
      phone           TEXT UNIQUE,
      avatar_url      TEXT,
      google_id       TEXT UNIQUE,
      is_verified     BOOLEAN DEFAULT false,
      otp_code        TEXT,
      otp_expires_at  TIMESTAMPTZ,
      otp_purpose     TEXT,
      shortcuts       JSONB DEFAULT '[]'::jsonb,
      daily_notes     JSONB DEFAULT '[]'::jsonb,
      books           JSONB DEFAULT '{}'::jsonb,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS groups (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name          TEXT UNIQUE NOT NULL,
      description   TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS group_members (
      group_id      UUID REFERENCES groups(id) ON DELETE CASCADE,
      user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (group_id, user_id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS friendships (
      user_id_1   UUID REFERENCES users(id) ON DELETE CASCADE,
      user_id_2   UUID REFERENCES users(id) ON DELETE CASCADE,
      status      TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
      sender_id   UUID REFERENCES users(id) ON DELETE CASCADE,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id_1, user_id_2),
      CONSTRAINT chk_user_order CHECK (user_id_1 < user_id_2)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sender_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id   UUID REFERENCES users(id) ON DELETE CASCADE,
      group_id      UUID REFERENCES groups(id) ON DELETE CASCADE,
      message_text  TEXT NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('✅ DB tables ready');

  // Seed default groups
  try {
    const seedGroups = [
      { name: 'Design Systems', description: 'Visual design, layout components, and branding aesthetics.' },
      { name: 'Engineering Core', description: 'Database performance, API endpoints, and system architecture.' },
      { name: 'Product Planning', description: 'Roadmaps, feature specifications, and timeline coordination.' },
      { name: 'General Assembly', description: 'All-hands discussion, general announcements, and casual chats.' }
    ];
    for (const g of seedGroups) {
      await sql`
        INSERT INTO groups (name, description)
        VALUES (${g.name}, ${g.description})
        ON CONFLICT (name) DO NOTHING
      `;
    }
    console.log('✅ Seed groups populated');
  } catch (seedErr) {
    console.error('⚠️ Seeding groups failed:', seedErr.message);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// ── POST /api/auth/send-otp ───────────────────────────────────────────────────
// Body: { identifier: "email@x.com" | "+91XXXXXXXXXX", purpose: "signup"|"login", name?: string }
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    let { identifier, purpose, name } = req.body;
    if (!identifier || !purpose) {
      return res.status(400).json({ error: 'identifier and purpose are required' });
    }

    const isEmail = identifier.includes('@');
    const cleanId = identifier.trim().toLowerCase();

    // Check if user already exists
    let existing = [];
    if (isEmail) {
      existing = await sql`SELECT id FROM users WHERE email = ${cleanId}`;
    } else {
      existing = await sql`SELECT id FROM users WHERE phone = ${cleanId}`;
    }

    // If signup but user exists, silently transition to login
    if (purpose === 'signup' && existing.length > 0) {
      purpose = 'login';
    }

    // For signup: verify username is unique
    if (purpose === 'signup') {
      if (name) {
        const cleanName = name.trim();
        const existingName = await sql`SELECT id FROM users WHERE LOWER(name) = LOWER(${cleanName})`;
        if (existingName.length > 0) {
          return res.status(409).json({ error: 'The username is already taken.' });
        }
      }
    }

    // For login: check user exists
    if (purpose === 'login') {
      if (existing.length === 0) {
        return res.status(404).json({ error: 'No account found. Please sign up first.' });
      }
    }

    // Generate & store new OTP directly on user record
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    if (existing.length > 0) {
      await sql`
        UPDATE users
        SET otp_code = ${otp},
            otp_expires_at = ${expiresAt},
            otp_purpose = ${purpose}
        WHERE id = ${existing[0].id}
      `;
    } else {
      if (isEmail) {
        await sql`
          INSERT INTO users (email, name, otp_code, otp_expires_at, otp_purpose, is_verified)
          VALUES (${cleanId}, ${name || null}, ${otp}, ${expiresAt}, ${purpose}, false)
          ON CONFLICT (email) DO UPDATE
            SET otp_code = EXCLUDED.otp_code,
                otp_expires_at = EXCLUDED.otp_expires_at,
                otp_purpose = EXCLUDED.otp_purpose
        `;
      } else {
        await sql`
          INSERT INTO users (phone, name, otp_code, otp_expires_at, otp_purpose, is_verified)
          VALUES (${cleanId}, ${name || null}, ${otp}, ${expiresAt}, ${purpose}, false)
          ON CONFLICT (phone) DO UPDATE
            SET otp_code = EXCLUDED.otp_code,
                otp_expires_at = EXCLUDED.otp_expires_at,
                otp_purpose = EXCLUDED.otp_purpose
        `;
      }
    }

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

    // Validate OTP against users table
    let user;
    if (isEmail) {
      [user] = await sql`
        SELECT * FROM users
        WHERE email = ${cleanId}
          AND otp_code = ${otp}
          AND (otp_purpose = ${purpose} OR otp_purpose = 'login' OR otp_purpose = 'signup')
          AND otp_expires_at > NOW()
      `;
    } else {
      [user] = await sql`
        SELECT * FROM users
        WHERE phone = ${cleanId}
          AND otp_code = ${otp}
          AND (otp_purpose = ${purpose} OR otp_purpose = 'login' OR otp_purpose = 'signup')
          AND otp_expires_at > NOW()
      `;
    }

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Please request a new one.' });
    }

    // Mark OTP as verified (clear it) and set name if signup
    const nameUpdate = (purpose === 'signup' && name) ? name.trim() : user.name;
    const [updatedUser] = await sql`
      UPDATE users
      SET otp_code = NULL,
          otp_expires_at = NULL,
          otp_purpose = NULL,
          is_verified = true,
          name = ${nameUpdate}
      WHERE id = ${user.id}
      RETURNING *
    `;

    // Issue JWT (stateless)
    const jwtToken = signToken(updatedUser.id);

    res.json({
      success: true,
      token: jwtToken,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        phone: updatedUser.phone,
        avatar_url: updatedUser.avatar_url,
        is_verified: updatedUser.is_verified
      }
    });
  } catch (err) {
    console.error('verify-otp error:', err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// ── GET /api/auth/config ──────────────────────────────────────────────────────
app.get('/api/auth/config', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || null
  });
});

// ── POST /api/auth/google ─────────────────────────────────────────────────────
// Body: { credential: "<google JWT>" }
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'credential is required' });

    let payload;
    if (googleClient) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
      } catch (verifyErr) {
        console.error('⚠️ Google ID Token verification failed:', verifyErr.message);
        return res.status(401).json({ error: 'Invalid Google token. Verification failed.' });
      }
    } else {
      console.warn('⚠️ GOOGLE_CLIENT_ID is not configured. Falling back to simple token decode.');
      // Decode Google JWT (verify with Google in production)
      const [, payloadB64] = credential.split('.');
      payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
    }

    if (!payload || !payload.email) return res.status(400).json({ error: 'Invalid Google token' });

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

    // Issue JWT (stateless)
    const jwtToken = signToken(user.id);

    res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
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

// ── POST /api/auth/forgot-username ────────────────────────────────────────────
app.post('/api/auth/forgot-username', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    const cleanEmail = email.trim().toLowerCase();

    // Find user
    const [user] = await sql`
      SELECT username, name FROM users WHERE LOWER(email) = ${cleanEmail}
    `;

    if (user && user.username) {
      try {
        await resend.emails.send({
          from: process.env.FROM_EMAIL || 'Shelf <onboarding@resend.dev>',
          to: cleanEmail,
          subject: 'Your Shelf Username',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: 'Georgia', serif; background: #f5f4ee; margin: 0; padding: 40px 20px; }
                .card { max-width: 460px; margin: 0 auto; background: #ffffff; border-radius: 12px;
                        border: 1px solid #e4e3da; padding: 40px; box-shadow: 0 8px 30px rgba(0,0,0,0.08); }
                .logo { font-size: 22px; font-weight: 700; color: #b33933; margin-bottom: 28px; }
                .username { font-size: 24px; font-weight: 700; color: #1e2022; background: #f5f4ee;
                        border-radius: 8px; padding: 12px 20px; text-align: center; margin: 24px 0; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="logo">📚 Shelf</div>
                <p>Hello ${user.name || 'Member'},</p>
                <p>You requested to retrieve your unique username for Shelf.</p>
                <p>Your unique username is:</p>
                <div class="username">@${user.username}</div>
                <p>Use this username to connect with other readers on Shelf!</p>
              </div>
            </body>
            </html>
          `
        });
      } catch (emailErr) {
        console.error('Failed to send forgot-username email:', emailErr);
      }
    }
    res.json({ success: true, message: 'If this email is registered, we have sent your username.' });
  } catch (err) {
    console.error('Forgot username error:', err);
    res.status(500).json({ error: 'Failed to process request.' });
  }
});


// ── GET /api/auth/me ──────────────────────────────────────────────────────────
app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    const [user] = await sql`
      SELECT id, name, username, email, phone, avatar_url, is_verified, created_at
      FROM users WHERE id = ${req.user.sub}
    `;
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ── PUT /api/users/profile ───────────────────────────────────────────────────
app.put('/api/users/profile', verifyToken, async (req, res) => {
  try {
    const { name, username, email, avatar_url } = req.body;
    const userId = req.user.sub;

    if (!name || !username || !email) {
      return res.status(400).json({ error: 'Name, username, and email are required.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check if username is already taken by another user
    const existingUser = await sql`
      SELECT id FROM users 
      WHERE LOWER(username) = ${cleanUsername} AND id != ${userId}
    `;
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'Username is already taken.' });
    }

    // Check if email is already taken by another user
    const existingEmail = await sql`
      SELECT id FROM users 
      WHERE LOWER(email) = ${cleanEmail} AND id != ${userId}
    `;
    if (existingEmail.length > 0) {
      return res.status(409).json({ error: 'Email is already taken.' });
    }

    // Update user in DB
    const [user] = await sql`
      UPDATE users
      SET name = ${name.trim()},
          username = ${cleanUsername},
          email = ${cleanEmail},
          avatar_url = ${avatar_url ? avatar_url.trim() : null},
          updated_at = NOW()
      WHERE id = ${userId}
      RETURNING *
    `;

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        is_verified: user.is_verified
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
app.post('/api/auth/logout', verifyToken, async (req, res) => {
  res.json({ success: true });
});

// ── GET /api/shortcuts ────────────────────────────────────────────────────────
app.get('/api/shortcuts', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const [user] = await sql`
      SELECT shortcuts FROM users WHERE id = ${userId}
    `;
    const rawShortcuts = (user && user.shortcuts) || [];
    const shortcuts = rawShortcuts.map(s => ({
      id: s.id,
      title: s.title,
      url: s.url,
      subtitle: s.subtitle || null,
      author: s.author || null,
      gradient: s.gradient || null,
      shortcutKey: s.shortcutKey || s.shortcut_key || null,
      customImage: s.customImage || s.custom_image || null
    }));
    res.json({ shortcuts });
  } catch (err) {
    console.error('Fetch shortcuts error:', err);
    res.status(500).json({ error: 'Failed to fetch shortcuts.' });
  }
});

// ── POST /api/shortcuts ───────────────────────────────────────────────────────
app.post('/api/shortcuts', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { shortcuts } = req.body;
    if (!Array.isArray(shortcuts)) {
      return res.status(400).json({ error: 'shortcuts must be an array' });
    }
    await sql`
      UPDATE users
      SET shortcuts = ${JSON.stringify(shortcuts)}
      WHERE id = ${userId}
    `;
    res.json({ success: true });
  } catch (err) {
    console.error('Save shortcuts error:', err);
    res.status(500).json({ error: 'Failed to save shortcuts.' });
  }
});

// ── GET /api/notes ────────────────────────────────────────────────────────────
app.get('/api/notes', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const [user] = await sql`
      SELECT daily_notes FROM users WHERE id = ${userId}
    `;
    const rawNotes = (user && user.daily_notes) || [];
    const notes = rawNotes.map(n => ({
      id: n.id,
      dateKey: n.dateKey || n.date_key,
      text: n.text || n.note_text,
      completed: !!n.completed
    }));
    res.json({ notes });
  } catch (err) {
    console.error('Fetch notes error:', err);
    res.status(500).json({ error: 'Failed to fetch notes.' });
  }
});

// ── POST /api/notes ───────────────────────────────────────────────────────────
app.post('/api/notes', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { id, dateKey, text, completed } = req.body;
    if (!id || !dateKey || text === undefined) {
      return res.status(400).json({ error: 'id, dateKey, and text are required' });
    }

    const [user] = await sql`
      SELECT daily_notes FROM users WHERE id = ${userId}
    `;
    let notes = (user && user.daily_notes) || [];
    if (!Array.isArray(notes)) notes = [];

    const existingIndex = notes.findIndex(n => n.id === id);
    const newNote = {
      id: String(id),
      dateKey,
      text,
      completed: !!completed,
      created_at: existingIndex >= 0 ? (notes[existingIndex].created_at || new Date().toISOString()) : new Date().toISOString()
    };

    if (existingIndex >= 0) {
      notes[existingIndex] = newNote;
    } else {
      notes.push(newNote);
    }

    await sql`
      UPDATE users
      SET daily_notes = ${JSON.stringify(notes)},
          updated_at = NOW()
      WHERE id = ${userId}
    `;
    res.json({ success: true });
  } catch (err) {
    console.error('Save note error:', err);
    res.status(500).json({ error: 'Failed to save note.' });
  }
});

// ── DELETE /api/notes/:id ──────────────────────────────────────────────────────
app.delete('/api/notes/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const noteId = req.params.id;

    const [user] = await sql`
      SELECT daily_notes FROM users WHERE id = ${userId}
    `;
    let notes = (user && user.daily_notes) || [];
    if (!Array.isArray(notes)) notes = [];

    notes = notes.filter(n => n.id !== noteId);

    await sql`
      UPDATE users
      SET daily_notes = ${JSON.stringify(notes)},
          updated_at = NOW()
      WHERE id = ${userId}
    `;
    res.json({ success: true });
  } catch (err) {
    console.error('Delete note error:', err);
    res.status(500).json({ error: 'Failed to delete note.' });
  }
});

// ── GET /api/books/current ────────────────────────────────────────────────────
app.get('/api/books/current', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const [user] = await sql`
      SELECT books FROM users WHERE id = ${userId}
    `;
    const book = (user && user.books && user.books.title) ? user.books : null;
    res.json({ book });
  } catch (err) {
    console.error('Fetch current book error:', err);
    res.status(500).json({ error: 'Failed to fetch current book.' });
  }
});

// ── POST /api/books/current ───────────────────────────────────────────────────
app.post('/api/books/current', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { title, author, currentPage, totalPages, description } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Book title is required.' });
    }

    const book = {
      title,
      author: author || null,
      currentPage: String(currentPage),
      totalPages: String(totalPages),
      description: description || null,
      updated_at: new Date().toISOString()
    };

    await sql`
      UPDATE users
      SET books = ${JSON.stringify(book)},
          updated_at = NOW()
      WHERE id = ${userId}
    `;
    res.json({ success: true });
  } catch (err) {
    console.error('Save current book error:', err);
    res.status(500).json({ error: 'Failed to save book details.' });
  }
});

// ── GET /api/friends/status ──────────────────────────────────────────────────
app.get('/api/friends/status', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;

    const friends = await sql`
      SELECT u.id, u.name, u.username, u.avatar_url
      FROM friendships f
      JOIN users u ON (u.id = f.user_id_1 OR u.id = f.user_id_2)
      WHERE (f.user_id_1 = ${userId} OR f.user_id_2 = ${userId})
        AND f.status = 'accepted'
        AND u.id != ${userId}
    `;

    const pendingIncoming = await sql`
      SELECT u.id, u.name, u.username, u.avatar_url
      FROM friendships f
      JOIN users u ON u.id = f.sender_id
      WHERE (f.user_id_1 = ${userId} OR f.user_id_2 = ${userId})
        AND f.status = 'pending'
        AND f.sender_id != ${userId}
    `;

    const pendingOutgoing = await sql`
      SELECT u.id, u.name, u.username, u.avatar_url
      FROM friendships f
      JOIN users u ON (u.id = f.user_id_1 OR u.id = f.user_id_2)
      WHERE (f.user_id_1 = ${userId} OR f.user_id_2 = ${userId})
        AND f.status = 'pending'
        AND f.sender_id = ${userId}
        AND u.id != ${userId}
    `;

    res.json({
      friends,
      pendingIncoming,
      pendingOutgoing
    });
  } catch (err) {
    console.error('Get friendships error:', err);
    res.status(500).json({ error: 'Failed to fetch friends.' });
  }
});

// ── POST /api/friends/request ─────────────────────────────────────────────────
app.post('/api/friends/request', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Username is required.' });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Look up target user
    const [target] = await sql`
      SELECT id FROM users WHERE LOWER(username) = ${cleanUsername}
    `;
    if (!target) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (target.id === userId) {
      return res.status(400).json({ error: 'You cannot add yourself.' });
    }

    // Check existing friendship
    const id1 = userId < target.id ? userId : target.id;
    const id2 = userId < target.id ? target.id : userId;

    const [existing] = await sql`
      SELECT status, sender_id FROM friendships
      WHERE user_id_1 = ${id1} AND user_id_2 = ${id2}
    `;

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ error: 'You are already friends.' });
      }
      if (existing.status === 'pending') {
        if (existing.sender_id === userId) {
          return res.status(400).json({ error: 'Request already sent.' });
        } else {
          // Auto-accept request if target has already sent a request to active user
          await sql`
            UPDATE friendships
            SET status = 'accepted', updated_at = NOW()
            WHERE user_id_1 = ${id1} AND user_id_2 = ${id2}
          `;
          return res.json({ success: true, message: 'Friend request accepted!' });
        }
      }
    }

    // Insert new friendship
    await sql`
      INSERT INTO friendships (user_id_1, user_id_2, status, sender_id)
      VALUES (${id1}, ${id2}, 'pending', ${userId})
    `;

    res.json({ success: true, message: 'Friend request sent.' });
  } catch (err) {
    console.error('Send friend request error:', err);
    res.status(500).json({ error: 'Failed to send friend request.' });
  }
});

// ── POST /api/friends/respond ─────────────────────────────────────────────────
app.post('/api/friends/respond', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { friendId, action } = req.body; // action: 'accept' | 'decline'
    if (!friendId || !['accept', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'friendId and valid action are required.' });
    }

    const id1 = userId < friendId ? userId : friendId;
    const id2 = userId < friendId ? friendId : userId;

    const [pending] = await sql`
      SELECT sender_id FROM friendships
      WHERE user_id_1 = ${id1} AND user_id_2 = ${id2} AND status = 'pending'
    `;
    if (!pending) {
      return res.status(404).json({ error: 'No pending friend request found.' });
    }
    if (pending.sender_id === userId) {
      return res.status(403).json({ error: 'You cannot respond to your own friend request.' });
    }

    if (action === 'accept') {
      await sql`
        UPDATE friendships
        SET status = 'accepted', updated_at = NOW()
        WHERE user_id_1 = ${id1} AND user_id_2 = ${id2}
      `;
      // Touch user records to trigger updates
      await sql`UPDATE users SET updated_at = NOW() WHERE id = ${userId} OR id = ${friendId}`;
    } else {
      await sql`
        DELETE FROM friendships
        WHERE user_id_1 = ${id1} AND user_id_2 = ${id2}
      `;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Friend response error:', err);
    res.status(500).json({ error: 'Failed to respond to friend request' });
  }
});

// ── GET /api/users/activity ───────────────────────────────────────────────────
app.get('/api/users/activity', async (req, res) => {
  try {
    let activeUsers = [];
    
    // Check if token is provided
    const auth = req.headers.authorization;
    let userId = null;
    if (auth && auth.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
        userId = decoded.sub;
      } catch (e) {
        // ignore invalid token
      }
    }

    if (userId) {
      // Return only accepted friends
      activeUsers = await sql`
        SELECT u.id, u.name, u.username, u.avatar_url, u.updated_at, u.books, u.daily_notes
        FROM friendships f
        JOIN users u ON (u.id = f.user_id_1 OR u.id = f.user_id_2)
        WHERE (f.user_id_1 = ${userId} OR f.user_id_2 = ${userId})
          AND f.status = 'accepted'
          AND u.id != ${userId}
        ORDER BY u.updated_at DESC
      `;
    } else {
      // Fallback: return empty array if not logged in (to encourage connecting)
      activeUsers = [];
    }

    const activities = [];
    for (const u of activeUsers) {
      const book = u.books && u.books.title ? u.books : null;
      let latestNote = null;
      if (Array.isArray(u.daily_notes) && u.daily_notes.length > 0) {
        const sortedNotes = [...u.daily_notes].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        latestNote = sortedNotes[0];
      }

      const userTime = new Date(u.updated_at).getTime();
      const bookTime = book && book.updated_at ? new Date(book.updated_at).getTime() : 0;
      const noteTime = latestNote && latestNote.created_at ? new Date(latestNote.created_at).getTime() : 0;
      const lastActiveTime = Math.max(userTime, bookTime, noteTime);

      activities.push({
        id: u.id,
        name: u.name,
        username: u.username,
        avatar_url: u.avatar_url,
        currentBook: book ? {
          title: book.title,
          author: book.author,
          currentPage: book.currentPage || book.current_page,
          totalPages: book.totalPages || book.total_pages
        } : null,
        latestNote: latestNote ? {
          text: latestNote.text || latestNote.note_text,
          createdAt: latestNote.created_at || latestNote.createdAt
        } : null,
        lastActive: new Date(lastActiveTime).toISOString()
      });
    }

    activities.sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive));
    res.json({ activities });
  } catch (err) {
    console.error('Fetch users activity error:', err);
    res.status(500).json({ error: 'Failed to fetch user activities.' });
  }
});

// ── GET /api/chat/:friendId ──────────────────────────────────────────────────
app.get('/api/chat/:friendId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const friendId = req.params.friendId;

    if (!(await areAcceptedFriends(userId, friendId))) {
      return res.status(403).json({ error: 'You are not friends with this user.' });
    }

    const messages = await sql`
      SELECT id, sender_id as "senderId", receiver_id as "receiverId", message_text as "text", created_at as "createdAt"
      FROM messages
      WHERE (sender_id = ${userId} AND receiver_id = ${friendId})
         OR (sender_id = ${friendId} AND receiver_id = ${userId})
      ORDER BY created_at ASC
    `;

    res.json({ messages });
  } catch (err) {
    console.error('Fetch chat history error:', err);
    res.status(500).json({ error: 'Failed to fetch chat history.' });
  }
});

// ── POST /api/chat ───────────────────────────────────────────────────────────
app.post('/api/chat', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { receiverId, messageText } = req.body;
    if (!receiverId || !messageText) {
      return res.status(400).json({ error: 'receiverId and messageText are required.' });
    }

    if (!(await areAcceptedFriends(userId, receiverId))) {
      return res.status(403).json({ error: 'You are not friends with this user.' });
    }

    const [msg] = await sql`
      INSERT INTO messages (sender_id, receiver_id, message_text)
      VALUES (${userId}, ${receiverId}, ${messageText})
      RETURNING id, sender_id as "senderId", receiver_id as "receiverId", message_text as "text", created_at as "createdAt"
    `;

    res.json({ success: true, message: msg });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

// ── GET /api/users/search ────────────────────────────────────────────────────
app.get('/api/users/search', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { q } = req.query;
    if (!q || q.trim().length < 1) {
      return res.json({ users: [] });
    }
    const pattern = `%${q.trim().toLowerCase()}%`;
    const users = await sql`
      SELECT id, name, username, avatar_url
      FROM users
      WHERE id != ${userId}
        AND (LOWER(username) ILIKE ${pattern} OR LOWER(name) ILIKE ${pattern})
      LIMIT 10
    `;
    res.json({ users });
  } catch (err) {
    console.error('User search error:', err);
    res.status(500).json({ error: 'Failed to search users.' });
  }
});

// ── POST /api/groups/create ───────────────────────────────────────────────────
app.post('/api/groups/create', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { name, description, memberIds } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required.' });
    }

    // Create group
    const [group] = await sql`
      INSERT INTO groups (name, description)
      VALUES (${name.trim()}, ${description || null})
      RETURNING id, name, description, created_at
    `;

    // Add creator as member
    await sql`
      INSERT INTO group_members (group_id, user_id)
      VALUES (${group.id}, ${userId})
      ON CONFLICT (group_id, user_id) DO NOTHING
    `;

    // Add invited members
    if (Array.isArray(memberIds) && memberIds.length > 0) {
      for (const memberId of memberIds) {
        if (memberId !== userId) {
          await sql`
            INSERT INTO group_members (group_id, user_id)
            VALUES (${group.id}, ${memberId})
            ON CONFLICT (group_id, user_id) DO NOTHING
          `;
        }
      }
    }

    res.json({ success: true, group });
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ error: 'Failed to create group.' });
  }
});

// ── GET /api/groups ──────────────────────────────────────────────────────────
app.get('/api/groups', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;

    const groups = await sql`
      SELECT g.id, g.name, g.description
      FROM groups g
      JOIN group_members mine ON mine.group_id = g.id
      WHERE mine.user_id = ${userId}
      ORDER BY g.name ASC
    `;

    if (groups.length === 0) return res.json({ groups: [] });

    const members = await sql`
      SELECT gm.group_id, u.id, u.name, u.username, u.avatar_url, u.books, u.created_at
      FROM group_members gm
      JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id IN (
        SELECT group_id FROM group_members WHERE user_id = ${userId}
      )
      ORDER BY u.name ASC
    `;

    const lastMessages = await sql`
      SELECT m.group_id,
             m.message_text AS last_message_text,
             u.name AS last_message_sender_name,
             u.username AS last_message_sender_username,
             u.avatar_url AS last_message_sender_avatar_url,
             m.created_at AS last_message_at
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.group_id IN (
        SELECT group_id FROM group_members WHERE user_id = ${userId}
      )
      AND m.created_at = (
        SELECT MAX(created_at) FROM messages WHERE group_id = m.group_id
      )
    `;

    const membersByGroup = new Map();
    members.forEach(({ group_id, ...member }) => {
      if (!membersByGroup.has(group_id)) membersByGroup.set(group_id, []);
      membersByGroup.get(group_id).push(member);
    });

    const lastMessageByGroup = new Map(
      lastMessages.map(row => [row.group_id, row])
    );

    const enrichedGroups = groups.map((g) => {
      const messageInfo = lastMessageByGroup.get(g.id);
      return {
        id: g.id,
        name: g.name,
        description: g.description,
        isMember: true,
        members: membersByGroup.get(g.id) || [],
        lastMessageAt: messageInfo?.last_message_at || null,
        lastMessageText: messageInfo?.last_message_text || null,
        lastMessageSenderName: messageInfo?.last_message_sender_name || null,
        lastMessageSenderUsername: messageInfo?.last_message_sender_username || null,
        lastMessageSenderAvatarUrl: messageInfo?.last_message_sender_avatar_url || null
      };
    });

    res.json({ groups: enrichedGroups });
  } catch (err) {
    console.error('Fetch groups error:', err);
    res.status(500).json({ error: 'Failed to fetch groups.' });
  }
});

// ── POST /api/groups/:groupId/members ───────────────────────────────────────
app.post('/api/groups/:groupId/members', verifyToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId: targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: 'userId is required.' });

    // Verify requester is a member of this group
    const membership = await sql`
      SELECT 1 FROM group_members WHERE group_id = ${groupId} AND user_id = ${req.user.sub}
    `;
    if (!membership.length) {
      return res.status(403).json({ error: 'You must be a group member to invite others.' });
    }

    await sql`
      INSERT INTO group_members (group_id, user_id)
      VALUES (${groupId}, ${targetUserId})
      ON CONFLICT (group_id, user_id) DO NOTHING
    `;
    res.json({ success: true });
  } catch (err) {
    console.error('Add group member error:', err);
    res.status(500).json({ error: 'Failed to add member.' });
  }
});

// ── POST /api/groups/join ────────────────────────────────────────────────────
app.post('/api/groups/join', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { groupId } = req.body;
    if (!groupId) return res.status(400).json({ error: 'groupId is required.' });

    await sql`
      INSERT INTO group_members (group_id, user_id)
      VALUES (${groupId}, ${userId})
      ON CONFLICT (group_id, user_id) DO NOTHING
    `;
    res.json({ success: true });
  } catch (err) {
    console.error('Join group error:', err);
    res.status(500).json({ error: 'Failed to join group.' });
  }
});

// ── GET /api/chat/group/:groupId ─────────────────────────────────────────────
app.get('/api/chat/group/:groupId', verifyToken, async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const userId = req.user.sub;

    if (!(await isGroupMember(groupId, userId))) {
      return res.status(403).json({ error: 'You are not a member of this group.' });
    }

    const messages = await sql`
      SELECT m.id, m.sender_id as "senderId", m.message_text as "text", m.created_at as "createdAt", u.name, u.username, u.avatar_url
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.group_id = ${groupId}
      ORDER BY m.created_at ASC
    `;
    res.json({ messages });
  } catch (err) {
    console.error('Fetch group chat history error:', err);
    res.status(500).json({ error: 'Failed to fetch group chat history.' });
  }
});

// ── POST /api/chat/group ─────────────────────────────────────────────────────
app.post('/api/chat/group', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { groupId, messageText } = req.body;
    if (!groupId || !messageText) {
      return res.status(400).json({ error: 'groupId and messageText are required.' });
    }

    if (!(await isGroupMember(groupId, userId))) {
      return res.status(403).json({ error: 'You are not a member of this group.' });
    }

    const [msg] = await sql`
      INSERT INTO messages (sender_id, group_id, message_text)
      VALUES (${userId}, ${groupId}, ${messageText})
      RETURNING id, sender_id as "senderId", group_id as "groupId", message_text as "text", created_at as "createdAt"
    `;

    const [user] = await sql`SELECT name, username, avatar_url FROM users WHERE id = ${userId}`;
    const enrichedMsg = {
      ...msg,
      name: user.name,
      username: user.username,
      avatar_url: user.avatar_url
    };

    res.json({ success: true, message: enrichedMsg });
  } catch (err) {
    console.error('Send group message error:', err);
    res.status(500).json({ error: 'Failed to send group message.' });
  }
});

// ── GET /api/teammates/mutual ────────────────────────────────────────────────
app.get('/api/teammates/mutual', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const teammates = await sql`
      SELECT DISTINCT u.id, u.name, u.username, u.avatar_url, u.updated_at, u.books, u.daily_notes
      FROM group_members gm1
      JOIN group_members gm2 ON gm1.group_id = gm2.group_id
      JOIN users u ON u.id = gm2.user_id
      WHERE gm1.user_id = ${userId} AND gm2.user_id != ${userId}
    `;

    const activities = [];
    for (const u of teammates) {
      const book = u.books && u.books.title ? u.books : null;
      let latestNote = null;
      if (Array.isArray(u.daily_notes) && u.daily_notes.length > 0) {
        const sortedNotes = [...u.daily_notes].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        latestNote = sortedNotes[0];
      }

      const userTime = new Date(u.updated_at).getTime();
      const bookTime = book && book.updated_at ? new Date(book.updated_at).getTime() : 0;
      const noteTime = latestNote && latestNote.created_at ? new Date(latestNote.created_at).getTime() : 0;
      const lastActiveTime = Math.max(userTime, bookTime, noteTime);

      activities.push({
        id: u.id,
        name: u.name,
        username: u.username,
        avatar_url: u.avatar_url,
        currentBook: book ? {
          title: book.title,
          author: book.author,
          currentPage: book.currentPage || book.current_page,
          totalPages: book.totalPages || book.total_pages
        } : null,
        latestNote: latestNote ? {
          text: latestNote.text || latestNote.note_text,
          createdAt: latestNote.created_at || latestNote.createdAt
        } : null,
        lastActive: new Date(lastActiveTime).toISOString()
      });
    }

    activities.sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive));
    res.json({ teammates: activities });
  } catch (err) {
    console.error('Fetch mutual teammates error:', err);
    res.status(500).json({ error: 'Failed to fetch teammates.' });
  }
});

// ── GET /api/users/search ─────────────────────────────────────────────────────
app.get('/api/users/search', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const query = (req.query.q || '').trim();
    if (!query || query.length < 2) {
      return res.json({ users: [] });
    }
    const searchTerm = `%${query.toLowerCase()}%`;
    const users = await sql`
      SELECT id, name, username, avatar_url
      FROM users
      WHERE id != ${userId}
        AND (LOWER(username) LIKE ${searchTerm} OR LOWER(name) LIKE ${searchTerm})
      LIMIT 15
    `;
    res.json({ users });
  } catch (err) {
    console.error('Search users error:', err);
    res.status(500).json({ error: 'Failed to search users.' });
  }
});

// ── POST /api/groups/create ───────────────────────────────────────────────────
app.post('/api/groups/create', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required.' });
    }

    const [group] = await sql`
      INSERT INTO groups (name, description, created_by)
      VALUES (${name.trim()}, ${description ? description.trim() : null}, ${userId})
      RETURNING id, name, description
    `;

    // Auto-add creator as member
    await sql`
      INSERT INTO group_members (group_id, user_id)
      VALUES (${group.id}, ${userId})
      ON CONFLICT (group_id, user_id) DO NOTHING
    `;

    res.json({ success: true, group });
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ error: 'Failed to create group.' });
  }
});

// ── POST /api/groups/members/add ─────────────────────────────────────────────
app.post('/api/groups/members/add', verifyToken, async (req, res) => {
  try {
    const { groupId, userId: targetUserId } = req.body;
    if (!groupId || !targetUserId) {
      return res.status(400).json({ error: 'groupId and userId are required.' });
    }

    if (!(await isGroupMember(groupId, req.user.sub))) {
      return res.status(403).json({ error: 'You must be a group member to invite others.' });
    }

    await sql`
      INSERT INTO group_members (group_id, user_id)
      VALUES (${groupId}, ${targetUserId})
      ON CONFLICT (group_id, user_id) DO NOTHING
    `;
    res.json({ success: true });
  } catch (err) {
    console.error('Add group member error:', err);
    res.status(500).json({ error: 'Failed to add member.' });
  }
});

// ── DELETE /api/groups/members/remove ────────────────────────────────────────
app.delete('/api/groups/members/remove', verifyToken, async (req, res) => {
  try {
    const { groupId, userId: targetUserId } = req.body;
    if (!groupId || !targetUserId) {
      return res.status(400).json({ error: 'groupId and userId are required.' });
    }

    if (!(await isGroupMember(groupId, req.user.sub))) {
      return res.status(403).json({ error: 'You must be a group member to remove members.' });
    }

    await sql`
      DELETE FROM group_members
      WHERE group_id = ${groupId} AND user_id = ${targetUserId}
    `;
    res.json({ success: true });
  } catch (err) {
    console.error('Remove group member error:', err);
    res.status(500).json({ error: 'Failed to remove member.' });
  }
});

// ── POST /api/groups/:groupId/leave ──────────────────────────────────────────
app.post('/api/groups/:groupId/leave', verifyToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.sub;
    await sql`
      DELETE FROM group_members
      WHERE group_id = ${groupId} AND user_id = ${userId}
    `;
    res.json({ success: true });
  } catch (err) {
    console.error('Leave group error:', err);
    res.status(500).json({ error: 'Failed to leave group.' });
  }
});

// ── POST /api/friends/cancel ─────────────────────────────────────────────────
app.post('/api/friends/cancel', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { friendId } = req.body;
    if (!friendId) return res.status(400).json({ error: 'friendId is required.' });

    const id1 = userId < friendId ? userId : friendId;
    const id2 = userId < friendId ? friendId : userId;

    await sql`
      DELETE FROM friendships
      WHERE user_id_1 = ${id1} AND user_id_2 = ${id2}
        AND status = 'pending' AND sender_id = ${userId}
    `;
    res.json({ success: true });
  } catch (err) {
    console.error('Cancel friend request error:', err);
    res.status(500).json({ error: 'Failed to cancel request.' });
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
