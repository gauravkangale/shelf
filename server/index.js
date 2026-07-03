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

const fs = require('fs');
const path = require('path');
const dbFilePath = path.join(__dirname, 'db_persisted.json');

function saveDb() {
  if (isInMemory) {
    try {
      fs.writeFileSync(dbFilePath, JSON.stringify(inMemoryStore, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to write local database file:', e);
    }
  }
}

function loadDb() {
  if (isInMemory && fs.existsSync(dbFilePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
      Object.keys(inMemoryStore).forEach(key => {
        if (Array.isArray(data[key])) {
          inMemoryStore[key] = data[key];
        }
      });
      console.log('📦 Loaded persisted local database from', dbFilePath);
    } catch (e) {
      console.error('Failed to read local database file:', e);
    }
  }
}

// ─── DB & Email clients ───────────────────────────────────────────────────────
let isInMemory = false;
const inMemoryStore = {
  users: [],
  otp_tokens: [],
  sessions: [],
  messages: [],
  cohorts: [
    { id: 'g1', name: 'Design Systems', description: 'Visual design, layout components, and branding aesthetics.' },
    { id: 'g2', name: 'Engineering Core', description: 'Database performance, API endpoints, and system architecture.' },
    { id: 'g3', name: 'Product Planning', description: 'Roadmaps, feature specifications, and timeline coordination.' },
    { id: 'g4', name: 'General Assembly', description: 'All-hands discussion, general announcements, and casual chats.' }
  ],
  cohort_members: [],
  friendships: [],
  notifications: []
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

  const result = simulateSqlInMemory(strings, values);
  const query = strings.reduce((acc, str, i) => acc + str + (values[i] !== undefined ? `__VAL_${i}__` : ''), '').trim();
  const isMutation = query.startsWith('INSERT') || query.startsWith('UPDATE') || query.startsWith('DELETE') || query.startsWith('CREATE') || query.startsWith('ALTER');
  if (isMutation) {
    saveDb();
  }
  return result;
}

function simulateSqlInMemory(strings, values) {
  const query = strings.reduce((acc, str, i) => acc + str + (values[i] !== undefined ? `__VAL_${i}__` : ''), '').trim();

  if (query.startsWith('CREATE') || query.startsWith('ALTER')) {
    return [];
  }

  // SELECT FROM cohorts
  if (query.includes('SELECT') && query.includes('FROM cohorts')) {
    if (query.includes('JOIN cohort_members')) {
      const userId = values[0];
      const myCohortIds = new Set(
        inMemoryStore.cohort_members
          .filter(gm => gm.user_id === userId)
          .map(gm => gm.cohort_id)
      );
      return inMemoryStore.cohorts
        .filter(g => myCohortIds.has(g.id))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    return inMemoryStore.cohorts;
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

  // INSERT INTO cohorts
  if (query.includes('INSERT INTO cohorts')) {
    const name = values[0];
    const description = values[1];
    let grp = inMemoryStore.cohorts.find(g => g.name === name);
    if (!grp) {
      grp = { id: crypto.randomUUID(), name, description, created_at: new Date() };
      inMemoryStore.cohorts.push(grp);
    }
    return [grp];
  }

  // SELECT FROM cohort_members
  if (query.includes('SELECT') && query.includes('cohort_members')) {
    if (query.includes('JOIN users') && query.includes('IN (')) {
      const userId = values[0];
      const myCohortIds = new Set(
        inMemoryStore.cohort_members
          .filter(gm => gm.user_id === userId)
          .map(gm => gm.cohort_id)
      );
      return inMemoryStore.cohort_members
        .filter(gm => myCohortIds.has(gm.cohort_id))
        .map(gm => {
          const u = inMemoryStore.users.find(usr => usr.id === gm.user_id);
          if (!u) return null;
          return {
            cohort_id: gm.cohort_id,
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
    // Membership check: WHERE cohort_id = X AND user_id = Y
    if (query.includes('cohort_id =') && query.includes('user_id =')) {
      const cohortId = values[0];
      const userId = values[1];
      return inMemoryStore.cohort_members.filter(gm => gm.cohort_id === cohortId && gm.user_id === userId);
    }
    if (query.includes('user_id =')) {
      const userId = values[0];
      return inMemoryStore.cohort_members.filter(gm => gm.user_id === userId);
    }
    if (query.includes('cohort_id =')) {
      const cohortId = values[0];
      const matches = inMemoryStore.cohort_members.filter(gm => gm.cohort_id === cohortId);
      return matches.map(m => {
        const u = inMemoryStore.users.find(usr => usr.id === m.user_id);
        if (!u) return null;
        return { id: u.id, name: u.name, username: u.username, avatar_url: u.avatar_url, books: u.books, created_at: u.created_at };
      }).filter(Boolean);
    }
    return inMemoryStore.cohort_members;
  }

  // INSERT INTO cohort_members
  if (query.includes('INSERT INTO cohort_members')) {
    const cohortId = values[0];
    const userId = values[1];
    const exists = inMemoryStore.cohort_members.some(gm => gm.cohort_id === cohortId && gm.user_id === userId);
    if (!exists) {
      inMemoryStore.cohort_members.push({ cohort_id: cohortId, user_id: userId });
    }
    return [];
  }

  // DELETE FROM cohort_members
  if (query.includes('DELETE FROM cohort_members')) {
    const cohortId = values[0];
    const userId = values[1];
    inMemoryStore.cohort_members = inMemoryStore.cohort_members.filter(
      gm => !(gm.cohort_id === cohortId && gm.user_id === userId)
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

  // UPDATE messages
  if (query.includes('UPDATE messages')) {
    const friendId = values[0];
    const userId = values[1];
    inMemoryStore.messages.forEach(m => {
      if (m.sender_id === friendId && m.receiver_id === userId) {
        m.read = true;
      }
    });
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
    
    // OTP verification check
    if (query.includes('otp_code =') && query.includes('otp_expires_at > NOW()')) {
      const identifier = values[0]; // email or phone
      const otp = values[1];
      const purpose = values[2];
      const isEmail = query.includes('email =');
      return inMemoryStore.users.filter(u => 
        (isEmail ? u.email === identifier : u.phone === identifier) &&
        u.otp_code === otp &&
        (u.otp_purpose === purpose || u.otp_purpose === 'login' || u.otp_purpose === 'signup') &&
        new Date(u.otp_expires_at) > new Date()
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
    if (query.includes('SET otp_code =') && query.includes('otp_expires_at =')) {
      const otp = values[0];
      const expiresAt = values[1];
      const purpose = values[2];
      const userId = values[3];
      const user = inMemoryStore.users.find(u => u.id === userId);
      if (user) {
        user.otp_code = otp;
        user.otp_expires_at = expiresAt;
        user.otp_purpose = purpose;
        user.updated_at = new Date();
        return [user];
      }
      return [];
    }
    if (query.includes('SET otp_code = NULL')) {
      const nameUpdate = values[0];
      const userId = values[1];
      const user = inMemoryStore.users.find(u => u.id === userId);
      if (user) {
        user.otp_code = null;
        user.otp_expires_at = null;
        user.otp_purpose = null;
        user.is_verified = true;
        if (nameUpdate) {
          user.name = nameUpdate;
          user.username = nameUpdate.toLowerCase().replace(/\s+/g, '');
        }
        user.updated_at = new Date();
        return [user];
      }
      return [];
    }
    if (query.includes('SET books =')) {
      const booksJson = values[0];
      const userId = values[1];
      const user = inMemoryStore.users.find(u => u.id === userId);
      if (user) {
        user.books = booksJson ? JSON.parse(booksJson) : null;
        user.updated_at = new Date();
        return [user];
      }
      return [];
    }
    if (query.includes('SET daily_notes =')) {
      const notesJson = values[0];
      const userId = values[1];
      const user = inMemoryStore.users.find(u => u.id === userId);
      if (user) {
        user.daily_notes = notesJson ? JSON.parse(notesJson) : [];
        user.updated_at = new Date();
        return [user];
      }
      return [];
    }
    if (query.includes('SET preferences =')) {
      const prefsJson = values[0];
      const userId = values[1];
      const user = inMemoryStore.users.find(u => u.id === userId);
      if (user) {
        user.preferences = prefsJson ? JSON.parse(prefsJson) : {};
        user.updated_at = new Date();
        return [user];
      }
      return [];
    }
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
    const isGoogle = query.includes('google_id');
    const identifier = values[0];
    const name = values[1];
    let user = inMemoryStore.users.find(u => isEmail ? u.email === identifier : u.phone === identifier);
    if (!user) {
      user = {
        id: crypto.randomUUID(),
        email: isEmail ? identifier : null,
        phone: !isEmail ? identifier : null,
        name: name || null,
        username: name ? name.toLowerCase().replace(/\s+/g, '') : (identifier ? identifier.split('@')[0] : 'user'),
        avatar_url: isGoogle ? values[2] : '',
        google_id: isGoogle ? values[3] : null,
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      };
      inMemoryStore.users.push(user);
    } else {
      user.is_verified = true;
      if (name) user.name = name;
      if (isGoogle) {
        user.avatar_url = values[2] || user.avatar_url;
        user.google_id = values[3];
      }
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
      const myCohortIds = new Set(
        inMemoryStore.cohort_members
          .filter(gm => gm.user_id === userId)
          .map(gm => gm.cohort_id)
      );
      const latestByCohort = new Map();
      inMemoryStore.messages
        .filter(m => m.cohort_id && myCohortIds.has(m.cohort_id))
        .forEach(m => {
          const current = latestByCohort.get(m.cohort_id);
          if (!current || new Date(m.created_at) > new Date(current)) {
            latestByCohort.set(m.cohort_id, m.created_at);
          }
        });
      return Array.from(latestByCohort, ([cohort_id, last_message_at]) => ({
        cohort_id,
        last_message_at
      }));
    }
    if (query.includes('cohort_id =')) {
      const cohortId = values[0];
      const msgs = inMemoryStore.messages
        .filter(m => m.cohort_id === cohortId)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      // Enrich with user info
      return msgs.map(m => {
        const u = inMemoryStore.users.find(u => u.id === m.sender_id) || {};
        return {
          id: m.id,
          senderId: m.sender_id,
          cohortId: m.cohort_id,
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
        imageUrl: m.image_url || null,
        read: m.read || false,
        createdAt: m.created_at
      }));
  }

  // INSERT INTO messages — return aliased fields matching SQL RETURNING clause
  if (query.includes('INSERT INTO messages')) {
    if (query.includes('cohort_id')) {
      const sender_id = values[0];
      const cohort_id = values[1];
      const message_text = values[2];
      const rawMsg = {
        id: crypto.randomUUID(),
        sender_id,
        cohort_id,
        message_text,
        image_url: null,
        read: false,
        created_at: new Date()
      };
      inMemoryStore.messages.push(rawMsg);
      // Return aliased to match RETURNING clause
      return [{
        id: rawMsg.id,
        senderId: rawMsg.sender_id,
        cohortId: rawMsg.cohort_id,
        text: rawMsg.message_text,
        imageUrl: null,
        read: false,
        createdAt: rawMsg.created_at
      }];
    } else {
      const sender_id = values[0];
      const receiver_id = values[1];
      const message_text = values[2];
      const image_url = values[3] || null;
      const rawMsg = {
        id: crypto.randomUUID(),
        sender_id,
        receiver_id,
        message_text,
        image_url,
        read: false,
        created_at: new Date()
      };
      inMemoryStore.messages.push(rawMsg);
      return [{
        id: rawMsg.id,
        senderId: rawMsg.sender_id,
        text: rawMsg.message_text,
        imageUrl: rawMsg.image_url,
        read: false,
        createdAt: rawMsg.created_at
      }];
    }
  }

  return [];
}

// ─── In-Memory Notification Helpers ─────────────────────────────────────────
function createInMemoryNotification({ recipientId, type, title, body, senderId, refId }) {
  const notif = {
    id: crypto.randomUUID(),
    recipient_id: recipientId,
    type,
    title,
    body,
    sender_id: senderId || null,
    ref_id: refId || null,
    read: false,
    created_at: new Date()
  };
  inMemoryStore.notifications.push(notif);
  saveDb();
  return notif;
}

function getInMemoryNotifications(userId) {
  return inMemoryStore.notifications
    .filter(n => n.recipient_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 50);
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateOtp() {
  // Use cryptographically secure random number instead of Math.random()
  return String(crypto.randomInt(100000, 999999));
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

async function isCohortMember(cohortId, userId) {
  const rows = await sql`
    SELECT 1 FROM cohort_members WHERE cohort_id = ${cohortId} AND user_id = ${userId}
  `;
  return rows.length > 0;
}

async function areAcceptedFriends(userId, friendId) {
  if (isInMemory) {
    // Check direct accepted friendship
    const id1 = userId < friendId ? userId : friendId;
    const id2 = userId < friendId ? friendId : userId;
    const directFriend = inMemoryStore.friendships.some(
      f => f.user_id_1 === id1 && f.user_id_2 === id2 && f.status === 'accepted'
    );
    if (directFriend) return true;
    // Fallback: shared cohort (teammates can also chat)
    const myCohorts = new Set(
      inMemoryStore.cohort_members.filter(gm => gm.user_id === userId).map(gm => gm.cohort_id)
    );
    return inMemoryStore.cohort_members.some(gm => gm.user_id === friendId && myCohorts.has(gm.cohort_id));
  }

  // Check direct accepted friendship
  const id1 = userId < friendId ? userId : friendId;
  const id2 = userId < friendId ? friendId : userId;
  const friendRows = await sql`
    SELECT 1 FROM friendships
    WHERE user_id_1 = ${id1} AND user_id_2 = ${id2} AND status = 'accepted'
    LIMIT 1
  `;
  if (friendRows.length > 0) return true;

  // Fallback: shared cohort (teammates can also chat)
  const cohortRows = await sql`
    SELECT 1 FROM cohort_members gm1
    JOIN cohort_members gm2 ON gm1.cohort_id = gm2.cohort_id
    WHERE gm1.user_id = ${userId} AND gm2.user_id = ${friendId}
    LIMIT 1
  `;
  return cohortRows.length > 0;
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

      // Rename groups -> cohorts
      if (tableNames.includes('groups') && !tableNames.includes('cohorts')) {
        console.log('🔄 Migrating groups table to cohorts...');
        await sql`ALTER TABLE groups RENAME TO cohorts`;
      }
      // Rename group_members -> cohort_members
      if (tableNames.includes('group_members') && !tableNames.includes('cohort_members')) {
        console.log('🔄 Migrating group_members table to cohort_members...');
        await sql`ALTER TABLE group_members RENAME TO cohort_members`;
        await sql`ALTER TABLE cohort_members RENAME COLUMN group_id TO cohort_id`;
      }

      // Rename group_id column to cohort_id in messages table
      const messagesCols = await sql`
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'group_id'
      `;
      if (messagesCols.length > 0) {
        console.log('🔄 Migrating messages.group_id to messages.cohort_id...');
        await sql`ALTER TABLE messages RENAME COLUMN group_id TO cohort_id`;
      }

      // Check for cleanups
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
      preferences     JSONB DEFAULT '{}'::jsonb,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS cohorts (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name          TEXT UNIQUE NOT NULL,
      description   TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS cohort_members (
      cohort_id     UUID REFERENCES cohorts(id) ON DELETE CASCADE,
      user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (cohort_id, user_id)
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
      cohort_id     UUID REFERENCES cohorts(id) ON DELETE CASCADE,
      message_text  TEXT,
      image_url     TEXT,
      read          BOOLEAN DEFAULT false,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
    
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Messages privacy policy'
      ) THEN
        CREATE POLICY "Messages privacy policy" ON messages
          USING (
            sender_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid 
            OR receiver_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid
          );
      END IF;
    END
    $$;
  `;
  try {
    await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url TEXT`;
    await sql`ALTER TABLE messages ALTER COLUMN message_text DROP NOT NULL`;
  } catch (err) {
    console.error('Migration warning:', err.message);
  }
  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      recipient_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sender_id     UUID REFERENCES users(id) ON DELETE SET NULL,
      type          TEXT NOT NULL,
      title         TEXT NOT NULL,
      body          TEXT NOT NULL,
      ref_id        TEXT,
      read          BOOLEAN DEFAULT false,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('✅ DB tables ready');
  
  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb`;
  } catch (err) {}

  // Performance indexes
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON friendships(user_id_1)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON friendships(user_id_2)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_friendships_both ON friendships(user_id_1, user_id_2, status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id, created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_cohort_members_user ON cohort_members(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_cohort_members_cohort ON cohort_members(cohort_id)`;
  } catch (idxErr) {
    console.error('⚠️ Index creation warning:', idxErr.message);
  }


  // Seed default cohorts
  try {
    const seedCohorts = [
      { name: 'Design Systems', description: 'Visual design, layout components, and branding aesthetics.' },
      { name: 'Engineering Core', description: 'Database performance, API endpoints, and system architecture.' },
      { name: 'Product Planning', description: 'Roadmaps, feature specifications, and timeline coordination.' },
      { name: 'General Assembly', description: 'All-hands discussion, general announcements, and casual chats.' }
    ];
    for (const g of seedCohorts) {
      await sql`
        INSERT INTO cohorts (name, description)
        VALUES (${g.name}, ${g.description})
        ON CONFLICT (name) DO NOTHING
      `;
    }
    console.log('✅ Seed cohorts populated');
  } catch (seedErr) {
    console.error('⚠️ Seeding cohorts failed:', seedErr.message);
  }
  loadDb();
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
        // Assume username will be based on name or provided by user later.
        // Let's check if the generated username is taken.
        let generatedUsername = cleanName.toLowerCase().replace(/\\s+/g, '');
        if (generatedUsername) {
            const existingName = await sql`SELECT id FROM users WHERE LOWER(username) = LOWER(${generatedUsername})`;
            if (existingName.length > 0) {
              return res.status(409).json({ error: 'The generated username is already taken. Please try a different name or login.' });
            }
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
      // Generate initial username from name or email
      let initialUsername = name ? name.trim().toLowerCase().replace(/\\s+/g, '') : (isEmail ? cleanId.split('@')[0] : 'user');
      
      if (isEmail) {
        await sql`
          INSERT INTO users (email, username, name, otp_code, otp_expires_at, otp_purpose, is_verified)
          VALUES (${cleanId}, ${initialUsername}, ${name || null}, ${otp}, ${expiresAt}, ${purpose}, false)
          ON CONFLICT (email) DO UPDATE
            SET otp_code = EXCLUDED.otp_code,
                otp_expires_at = EXCLUDED.otp_expires_at,
                otp_purpose = EXCLUDED.otp_purpose
        `;
      } else {
        await sql`
          INSERT INTO users (phone, username, name, otp_code, otp_expires_at, otp_purpose, is_verified)
          VALUES (${cleanId}, ${initialUsername}, ${name || null}, ${otp}, ${expiresAt}, ${purpose}, false)
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
          name = COALESCE(${nameUpdate}, name)
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
      // SECURITY: Do not decode without verification in production
      console.error('⚠️ GOOGLE_CLIENT_ID is not configured. Cannot verify Google token.');
      return res.status(500).json({ error: 'Google sign-in is not configured on this server.' });
    }

    if (!payload || !payload.email) return res.status(400).json({ error: 'Invalid Google token' });

    let initialUsername = payload.name ? payload.name.trim().toLowerCase().replace(/\\s+/g, '') : payload.email.split('@')[0];

    // Upsert user
    const [user] = await sql`
      INSERT INTO users (email, username, name, avatar_url, google_id, is_verified)
      VALUES (${payload.email}, ${initialUsername}, ${payload.name}, ${payload.picture}, ${payload.sub}, true)
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

// ── GET /api/preferences ────────────────────────────────────────────────────────
app.get('/api/preferences', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const [user] = await sql`
      SELECT preferences FROM users WHERE id = ${userId}
    `;
    const prefs = (user && user.preferences) ? user.preferences : {};
    res.json({ preferences: prefs });
  } catch (err) {
    console.error('Fetch preferences error:', err);
    res.status(500).json({ error: 'Failed to fetch preferences.' });
  }
});

// ── POST /api/preferences ───────────────────────────────────────────────────────
app.post('/api/preferences', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { preferences } = req.body;
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ error: 'preferences must be an object' });
    }
    
    // Merge existing with new
    const [user] = await sql`SELECT preferences FROM users WHERE id = ${userId}`;
    const currentPrefs = (user && user.preferences) ? user.preferences : {};
    const mergedPrefs = { ...currentPrefs, ...preferences };
    
    await sql`
      UPDATE users
      SET preferences = ${JSON.stringify(mergedPrefs)}::jsonb
      WHERE id = ${userId}
    `;
    res.json({ success: true, preferences: mergedPrefs });
  } catch (err) {
    console.error('Save preferences error:', err);
    res.status(500).json({ error: 'Failed to save preferences.' });
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

    if (isInMemory) {
      const acceptedFs = inMemoryStore.friendships.filter(
        f => (f.user_id_1 === userId || f.user_id_2 === userId) && f.status === 'accepted'
      );
      const friends = acceptedFs.map(f => {
        const otherId = f.user_id_1 === userId ? f.user_id_2 : f.user_id_1;
        const u = inMemoryStore.users.find(u => u.id === otherId);
        return u ? { id: u.id, name: u.name, username: u.username, avatar_url: u.avatar_url } : null;
      }).filter(Boolean);

      const pendingInFs = inMemoryStore.friendships.filter(
        f => (f.user_id_1 === userId || f.user_id_2 === userId) && f.status === 'pending' && f.sender_id !== userId
      );
      const pendingIncoming = pendingInFs.map(f => {
        const u = inMemoryStore.users.find(u => u.id === f.sender_id);
        return u ? { id: u.id, name: u.name, username: u.username, avatar_url: u.avatar_url } : null;
      }).filter(Boolean);

      const pendingOutFs = inMemoryStore.friendships.filter(
        f => (f.user_id_1 === userId || f.user_id_2 === userId) && f.status === 'pending' && f.sender_id === userId
      );
      const pendingOutgoing = pendingOutFs.map(f => {
        const otherId = f.user_id_1 === userId ? f.user_id_2 : f.user_id_1;
        const u = inMemoryStore.users.find(u => u.id === otherId);
        return u ? { id: u.id, name: u.name, username: u.username, avatar_url: u.avatar_url } : null;
      }).filter(Boolean);

      return res.json({ friends, pendingIncoming, pendingOutgoing });
    }

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

    res.json({ friends, pendingIncoming, pendingOutgoing });
  } catch (err) {
    console.error('Get friendships error:', err);
    res.status(500).json({ error: 'Failed to fetch friends.' });
  }
});

// ── GET /api/friends ──────────────────────────────────────────────────────────
// Returns all accepted friends with reading data, for the Direct Conversations list
app.get('/api/friends', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    let friends = [];

    if (isInMemory) {
      const acceptedFs = inMemoryStore.friendships.filter(
        f => (f.user_id_1 === userId || f.user_id_2 === userId) && f.status === 'accepted'
      );
      friends = acceptedFs.map(f => {
        const otherId = f.user_id_1 === userId ? f.user_id_2 : f.user_id_1;
        const u = inMemoryStore.users.find(u => u.id === otherId);
        if (!u) return null;
        const unreadCount = inMemoryStore.messages.filter(
          m => m.sender_id === otherId && m.receiver_id === userId && !m.read
        ).length;
        return {
          id: u.id, name: u.name, username: u.username, avatar_url: u.avatar_url,
          currentBook: u.books && u.books.title ? {
            title: u.books.title, author: u.books.author,
            currentPage: u.books.currentPage || u.books.current_page,
            totalPages: u.books.totalPages || u.books.total_pages
          } : null,
          lastActive: u.updated_at ? new Date(u.updated_at).toISOString() : null,
          unreadCount
        };
      }).filter(Boolean);
    } else {
      const rows = await sql`
        SELECT u.id, u.name, u.username, u.avatar_url, u.books, u.updated_at,
               COALESCE((
                 SELECT COUNT(*)::int 
                 FROM messages m 
                 WHERE m.sender_id = u.id AND m.receiver_id = ${userId} AND m.read = false
               ), 0) as "unreadCount"
        FROM friendships f
        JOIN users u ON (u.id = f.user_id_1 OR u.id = f.user_id_2)
        WHERE (f.user_id_1 = ${userId} OR f.user_id_2 = ${userId})
          AND f.status = 'accepted'
          AND u.id != ${userId}
        ORDER BY f.updated_at DESC
      `;
      friends = rows.map(u => ({
        id: u.id, name: u.name, username: u.username, avatar_url: u.avatar_url,
        currentBook: u.books && u.books.title ? {
          title: u.books.title, author: u.books.author,
          currentPage: u.books.currentPage || u.books.current_page,
          totalPages: u.books.totalPages || u.books.total_pages
        } : null,
        lastActive: u.updated_at ? new Date(u.updated_at).toISOString() : null,
        unreadCount: u.unreadCount || 0
      }));
    }

    res.json({ friends });
  } catch (err) {
    console.error('Get friends error:', err);
    res.status(500).json({ error: 'Failed to fetch friends.' });
  }
});

// ── POST /api/friends/request ─────────────────────────────────────────────────
app.post('/api/friends/request', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { username, friendId } = req.body;

    if (!username && !friendId) {
      return res.status(400).json({ error: 'username or friendId is required.' });
    }

    let target;
    if (isInMemory) {
      if (friendId) {
        target = inMemoryStore.users.find(u => u.id === friendId);
      } else {
        const cleanUsername = username.trim().toLowerCase();
        target = inMemoryStore.users.find(u => (u.username || '').toLowerCase() === cleanUsername);
      }
    } else if (friendId) {
      [target] = await sql`SELECT id, name, username FROM users WHERE id = ${friendId}`;
    } else {
      const cleanUsername = username.trim().toLowerCase();
      [target] = await sql`SELECT id, name, username FROM users WHERE LOWER(username) = ${cleanUsername}`;
    }

    if (!target) return res.status(404).json({ error: 'User not found.' });
    if (target.id === userId) return res.status(400).json({ error: 'You cannot add yourself.' });

    const id1 = userId < target.id ? userId : target.id;
    const id2 = userId < target.id ? target.id : userId;

    if (isInMemory) {
      const existing = inMemoryStore.friendships.find(f => f.user_id_1 === id1 && f.user_id_2 === id2);
      if (existing) {
        if (existing.status === 'accepted') return res.status(400).json({ error: 'You are already friends.' });
        if (existing.sender_id === userId) return res.status(400).json({ error: 'Request already sent.' });
        // Auto-accept: the other person already sent us a request
        existing.status = 'accepted';
        existing.updated_at = new Date();
        const sender = inMemoryStore.users.find(u => u.id === userId);
        const senderName = sender?.name || sender?.username || 'Someone';
        await createNotification({
          recipientId: existing.sender_id, type: 'friend_accepted',
          title: 'Friend request accepted',
          body: `${senderName} accepted your friend request.`,
          senderId: userId, refId: userId
        });
        return res.json({ success: true, message: 'Friend request accepted!' });
      }
      inMemoryStore.friendships.push({
        id: crypto.randomUUID(), user_id_1: id1, user_id_2: id2,
        status: 'pending', sender_id: userId,
        created_at: new Date(), updated_at: new Date()
      });
      const sender = inMemoryStore.users.find(u => u.id === userId);
      const senderName = sender?.name || sender?.username || 'Someone';
      await createNotification({
        recipientId: target.id, type: 'friend_request',
        title: 'New friend request',
        body: `${senderName} wants to connect with you.`,
        senderId: userId, refId: userId
      });
      return res.json({ success: true, message: 'Friend request sent.' });
    }

    const [existing] = await sql`
      SELECT status, sender_id FROM friendships
      WHERE user_id_1 = ${id1} AND user_id_2 = ${id2}
    `;
    if (existing) {
      if (existing.status === 'accepted') return res.status(400).json({ error: 'You are already friends.' });
      if (existing.status === 'pending') {
        if (existing.sender_id === userId) return res.status(400).json({ error: 'Request already sent.' });
        await sql`UPDATE friendships SET status = 'accepted', updated_at = NOW() WHERE user_id_1 = ${id1} AND user_id_2 = ${id2}`;
        const [senderUser] = await sql`SELECT name, username FROM users WHERE id = ${userId}`;
        const senderName = senderUser?.name || senderUser?.username || 'Someone';
        await createNotification({
          recipientId: existing.sender_id, type: 'friend_accepted',
          title: 'Friend request accepted', body: `${senderName} accepted your friend request.`,
          senderId: userId, refId: userId
        });
        return res.json({ success: true, message: 'Friend request accepted!' });
      }
    }

    await sql`INSERT INTO friendships (user_id_1, user_id_2, status, sender_id) VALUES (${id1}, ${id2}, 'pending', ${userId})`;
    const [senderUser] = await sql`SELECT name, username FROM users WHERE id = ${userId}`;
    const senderName = senderUser?.name || senderUser?.username || 'Someone';
    await createNotification({
      recipientId: target.id, type: 'friend_request',
      title: 'New friend request', body: `${senderName} wants to connect with you.`,
      senderId: userId, refId: userId
    });
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
    const { friendId, action, notificationId } = req.body;
    if (!friendId || !['accept', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'friendId and valid action are required.' });
    }

    const id1 = userId < friendId ? userId : friendId;
    const id2 = userId < friendId ? friendId : userId;

    if (isInMemory) {
      const fs = inMemoryStore.friendships.find(
        f => f.user_id_1 === id1 && f.user_id_2 === id2 && f.status === 'pending'
      );
      if (!fs) return res.status(404).json({ error: 'No pending friend request found.' });
      if (fs.sender_id === userId) return res.status(403).json({ error: 'You cannot respond to your own friend request.' });

      if (action === 'accept') {
        fs.status = 'accepted';
        fs.updated_at = new Date();
        const accepter = inMemoryStore.users.find(u => u.id === userId);
        const accepterName = accepter?.name || accepter?.username || 'Someone';
        await createNotification({
          recipientId: fs.sender_id, type: 'friend_accepted',
          title: 'Friend request accepted',
          body: `${accepterName} accepted your friend request. You are now connected!`,
          senderId: userId, refId: userId
        });
      } else {
        inMemoryStore.friendships = inMemoryStore.friendships.filter(
          f => !(f.user_id_1 === id1 && f.user_id_2 === id2)
        );
      }
      // DELETE the notification so it never reappears on next poll
      if (notificationId) {
        inMemoryStore.notifications = (inMemoryStore.notifications || []).filter(
          n => n.id !== notificationId
        );
      }
      return res.json({ success: true });
    }

    const [pending] = await sql`
      SELECT sender_id FROM friendships
      WHERE user_id_1 = ${id1} AND user_id_2 = ${id2} AND status = 'pending'
    `;
    if (!pending) return res.status(404).json({ error: 'No pending friend request found.' });
    if (pending.sender_id === userId) return res.status(403).json({ error: 'You cannot respond to your own friend request.' });

    if (action === 'accept') {
      await sql`UPDATE friendships SET status = 'accepted', updated_at = NOW() WHERE user_id_1 = ${id1} AND user_id_2 = ${id2}`;
      await sql`UPDATE users SET updated_at = NOW() WHERE id = ${userId} OR id = ${friendId}`;
      const [accepter] = await sql`SELECT name, username FROM users WHERE id = ${userId}`;
      const accepterName = accepter?.name || accepter?.username || 'Someone';
      await createNotification({
        recipientId: pending.sender_id, type: 'friend_accepted',
        title: 'Friend request accepted',
        body: `${accepterName} accepted your friend request. You are now connected!`,
        senderId: userId, refId: userId
      });
    } else {
      await sql`DELETE FROM friendships WHERE user_id_1 = ${id1} AND user_id_2 = ${id2}`;
    }

    // DELETE the notification so it doesn't reappear on next poll
    if (notificationId) {
      await sql`DELETE FROM notifications WHERE id = ${notificationId} AND recipient_id = ${userId}`;
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

    if (isInMemory) {
      // Mark all unread incoming messages from this friend as read
      inMemoryStore.messages
        .filter(m => m.sender_id === friendId && m.receiver_id === userId && !m.read)
        .forEach(m => { m.read = true; });
      saveDb();

      const messages = inMemoryStore.messages
        .filter(m =>
          (m.sender_id === userId && m.receiver_id === friendId) ||
          (m.sender_id === friendId && m.receiver_id === userId)
        )
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map(m => ({
          id: m.id,
          senderId: m.sender_id,
          receiverId: m.receiver_id,
          text: m.message_text,
          imageUrl: m.image_url,
          read: m.read,
          createdAt: m.created_at
        }));

      return res.json({ messages });
    }

    // Mark all unread incoming messages from this friend as read
    await sql`
      UPDATE messages
      SET read = true
      WHERE sender_id = ${friendId} AND receiver_id = ${userId} AND read = false
    `;

    const messages = await sql`
      SELECT id, sender_id as "senderId", receiver_id as "receiverId", 
             message_text as "text", image_url as "imageUrl", read, created_at as "createdAt"
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
    const { receiverId, messageText, imageUrl } = req.body;
    
    if (!receiverId) {
      return res.status(400).json({ error: 'receiverId is required.' });
    }
    if (!messageText && !imageUrl) {
      return res.status(400).json({ error: 'Either messageText or imageUrl is required.' });
    }

    if (!(await areAcceptedFriends(userId, receiverId))) {
      return res.status(403).json({ error: 'You are not friends with this user.' });
    }

    if (isInMemory) {
      const msg = {
        id: crypto.randomUUID(),
        sender_id: userId,
        receiver_id: receiverId,
        cohort_id: null,
        message_text: messageText || null,
        image_url: imageUrl || null,
        read: false,
        created_at: new Date().toISOString()
      };
      inMemoryStore.messages.push(msg);
      saveDb();

      // Create notification
      try {
        const sender = inMemoryStore.users.find(u => u.id === userId) || {};
        const senderName = sender.name || sender.username || 'Someone';
        await createNotification({
          recipientId: receiverId,
          type: 'private_message',
          title: `Message from ${senderName}`,
          body: messageText ? (messageText.slice(0, 80) + (messageText.length > 80 ? '…' : '')) : 'Sent an attachment',
          senderId: userId
        });
      } catch (notifErr) {
        console.error('Notification error:', notifErr.message);
      }

      return res.json({
        success: true,
        message: {
          id: msg.id,
          senderId: msg.sender_id,
          receiverId: msg.receiver_id,
          text: msg.message_text,
          imageUrl: msg.image_url,
          read: msg.read,
          createdAt: msg.created_at
        }
      });
    }

    const [msg] = await sql`
      INSERT INTO messages (sender_id, receiver_id, message_text, image_url, read)
      VALUES (${userId}, ${receiverId}, ${messageText || null}, ${imageUrl || null}, false)
      RETURNING id, sender_id as "senderId", receiver_id as "receiverId", 
                message_text as "text", image_url as "imageUrl", read, created_at as "createdAt"
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

    let users = [];
    if (isInMemory) {
      users = inMemoryStore.users
        .filter(u => u.id !== userId &&
          ((u.username || '').toLowerCase().includes(q.trim().toLowerCase()) ||
           (u.name || '').toLowerCase().includes(q.trim().toLowerCase())))
        .slice(0, 10)
        .map(u => ({
          id: u.id,
          name: u.name,
          username: u.username,
          avatar_url: u.avatar_url,
          books: u.books || {}
        }));
    } else {
      users = await sql`
        SELECT id, name, username, avatar_url, books
        FROM users
        WHERE id != ${userId}
          AND (LOWER(username) ILIKE ${pattern} OR LOWER(name) ILIKE ${pattern})
        LIMIT 10
      `;
    }

    // Query friendships for this user to determine status
    let friendships = [];
    if (isInMemory) {
      friendships = inMemoryStore.friendships.filter(
        f => f.user_id_1 === userId || f.user_id_2 === userId
      );
    } else {
      friendships = await sql`
        SELECT user_id_1, user_id_2, status, sender_id
        FROM friendships
        WHERE user_id_1 = ${userId} OR user_id_2 = ${userId}
      `;
    }

    const fsMap = new Map();
    friendships.forEach(f => {
      const otherId = f.user_id_1 === userId ? f.user_id_2 : f.user_id_1;
      let status = 'none';
      if (f.status === 'accepted') {
        status = 'accepted';
      } else if (f.status === 'pending') {
        status = f.sender_id === userId ? 'pending_sent' : 'pending_received';
      }
      fsMap.set(otherId, status);
    });

    const enriched = users.map(u => ({
      id: u.id,
      name: u.name,
      username: u.username,
      avatar_url: u.avatar_url,
      friendship_status: fsMap.get(u.id) || 'none',
      currentBook: u.books && u.books.title ? {
        title: u.books.title,
        author: u.books.author,
        currentPage: u.books.currentPage || u.books.current_page,
        totalPages: u.books.totalPages || u.books.total_pages
      } : null
    }));

    res.json({ users: enriched });
  } catch (err) {
    console.error('User search error:', err);
    res.status(500).json({ error: 'Failed to search users.' });
  }
});

// ── POST /api/cohorts/create ───────────────────────────────────────────────────
app.post('/api/cohorts/create', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { name, description, memberIds } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Cohort name is required.' });
    }

    // Create cohort
    const [cohort] = await sql`
      INSERT INTO cohorts (name, description)
      VALUES (${name.trim()}, ${description || null})
      RETURNING id, name, description, created_at
    `;

    // Add creator as member
    await sql`
      INSERT INTO cohort_members (cohort_id, user_id)
      VALUES (${cohort.id}, ${userId})
      ON CONFLICT (cohort_id, user_id) DO NOTHING
    `;

    // Add invited members
    if (Array.isArray(memberIds) && memberIds.length > 0) {
      for (const memberId of memberIds) {
        if (memberId !== userId) {
          await sql`
            INSERT INTO cohort_members (cohort_id, user_id)
            VALUES (${cohort.id}, ${memberId})
            ON CONFLICT (cohort_id, user_id) DO NOTHING
          `;
        }
      }
    }

    res.json({ success: true, group: cohort }); // map cohort to group for frontend compatibility
  } catch (err) {
    console.error('Create cohort error:', err);
    res.status(500).json({ error: 'Failed to create cohort.' });
  }
});

// ── GET /api/cohorts ──────────────────────────────────────────────────────────
app.get('/api/cohorts', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;

    const cohorts = await sql`
      SELECT g.id, g.name, g.description
      FROM cohorts g
      JOIN cohort_members mine ON mine.cohort_id = g.id
      WHERE mine.user_id = ${userId}
      ORDER BY g.name ASC
    `;

    if (cohorts.length === 0) return res.json({ groups: [] }); // map to groups for compatibility

    const members = await sql`
      SELECT gm.cohort_id, u.id, u.name, u.username, u.avatar_url, u.books, u.created_at
      FROM cohort_members gm
      JOIN users u ON u.id = gm.user_id
      WHERE gm.cohort_id IN (
        SELECT cohort_id FROM cohort_members WHERE user_id = ${userId}
      )
      ORDER BY u.name ASC
    `;

    const lastMessages = await sql`
      SELECT m.cohort_id,
             m.message_text AS last_message_text,
             u.name AS last_message_sender_name,
             u.username AS last_message_sender_username,
             u.avatar_url AS last_message_sender_avatar_url,
             m.created_at AS last_message_at
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.cohort_id IN (
        SELECT cohort_id FROM cohort_members WHERE user_id = ${userId}
      )
      AND m.created_at = (
        SELECT MAX(created_at) FROM messages WHERE cohort_id = m.cohort_id
      )
    `;

    const membersByCohort = new Map();
    members.forEach(({ cohort_id, ...member }) => {
      if (!membersByCohort.has(cohort_id)) membersByCohort.set(cohort_id, []);
      membersByCohort.get(cohort_id).push(member);
    });

    const lastMessageByCohort = new Map(
      lastMessages.map(row => [row.cohort_id, row])
    );

    const enrichedCohorts = cohorts.map((g) => {
      const messageInfo = lastMessageByCohort.get(g.id);
      return {
        id: g.id,
        name: g.name,
        description: g.description,
        isMember: true,
        members: membersByCohort.get(g.id) || [],
        lastMessageAt: messageInfo?.last_message_at || null,
        lastMessageText: messageInfo?.last_message_text || null,
        lastMessageSenderName: messageInfo?.last_message_sender_name || null,
        lastMessageSenderUsername: messageInfo?.last_message_sender_username || null,
        lastMessageSenderAvatarUrl: messageInfo?.last_message_sender_avatar_url || null
      };
    });

    res.json({ groups: enrichedCohorts }); // map to groups key for frontend compatibility
  } catch (err) {
    console.error('Fetch cohorts error:', err);
    res.status(500).json({ error: 'Failed to fetch cohorts.' });
  }
});

// ── POST /api/cohorts/:cohortId/members ───────────────────────────────────────
app.post('/api/cohorts/:cohortId/members', verifyToken, async (req, res) => {
  try {
    const { cohortId } = req.params;
    const { userId: targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: 'userId is required.' });

    // Verify requester is a member of this cohort
    const membership = await sql`
      SELECT 1 FROM cohort_members WHERE cohort_id = ${cohortId} AND user_id = ${req.user.sub}
    `;
    if (!membership.length) {
      return res.status(403).json({ error: 'You must be a cohort member to invite others.' });
    }

    await sql`
      INSERT INTO cohort_members (cohort_id, user_id)
      VALUES (${cohortId}, ${targetUserId})
      ON CONFLICT (cohort_id, user_id) DO NOTHING
    `;
    res.json({ success: true });
  } catch (err) {
    console.error('Add cohort member error:', err);
    res.status(500).json({ error: 'Failed to add member.' });
  }
});

// ── POST /api/cohorts/join ────────────────────────────────────────────────────
app.post('/api/cohorts/join', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { groupId: cohortId } = req.body; // accept groupId for compatibility
    if (!cohortId) return res.status(400).json({ error: 'cohortId is required.' });

    await sql`
      INSERT INTO cohort_members (cohort_id, user_id)
      VALUES (${cohortId}, ${userId})
      ON CONFLICT (cohort_id, user_id) DO NOTHING
    `;
    res.json({ success: true });
  } catch (err) {
    console.error('Join cohort error:', err);
    res.status(500).json({ error: 'Failed to join cohort.' });
  }
});

// ── GET /api/chat/cohort/:cohortId ─────────────────────────────────────────────
app.get('/api/chat/cohort/:cohortId', verifyToken, async (req, res) => {
  try {
    const cohortId = req.params.cohortId;
    const userId = req.user.sub;

    if (!(await isCohortMember(cohortId, userId))) {
      return res.status(403).json({ error: 'You are not a member of this cohort.' });
    }

    const messages = await sql`
      SELECT m.id, m.sender_id as "senderId", m.message_text as "text", m.created_at as "createdAt", u.name, u.username, u.avatar_url
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.cohort_id = ${cohortId}
      ORDER BY m.created_at ASC
    `;
    res.json({ messages });
  } catch (err) {
    console.error('Fetch cohort chat history error:', err);
    res.status(500).json({ error: 'Failed to fetch cohort chat history.' });
  }
});

// ── POST /api/chat/cohort ─────────────────────────────────────────────────────
app.post('/api/chat/cohort', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { groupId: cohortId, messageText } = req.body; // accept groupId for compatibility
    if (!cohortId || !messageText) {
      return res.status(400).json({ error: 'cohortId and messageText are required.' });
    }

    if (!(await isCohortMember(cohortId, userId))) {
      return res.status(403).json({ error: 'You are not a member of this cohort.' });
    }

    const [msg] = await sql`
      INSERT INTO messages (sender_id, cohort_id, message_text)
      VALUES (${userId}, ${cohortId}, ${messageText})
      RETURNING id, sender_id as "senderId", cohort_id as "cohortId", message_text as "text", created_at as "createdAt"
    `;

    const [user] = await sql`SELECT name, username, avatar_url FROM users WHERE id = ${userId}`;
    const enrichedMsg = {
      ...msg,
      name: user.name,
      username: user.username,
      avatar_url: user.avatar_url
    };

    // Notify all other cohort members about the new message
    try {
      const senderName = user?.name || user?.username || 'Someone';
      let cohortMembers;
      if (isInMemory) {
        cohortMembers = inMemoryStore.cohort_members
          .filter(m => m.cohort_id === cohortId && m.user_id !== userId)
          .map(m => ({ user_id: m.user_id }));
      } else {
        cohortMembers = await sql`
          SELECT user_id FROM cohort_members
          WHERE cohort_id = ${cohortId} AND user_id != ${userId}
        `;
      }
      const cohort = isInMemory
        ? inMemoryStore.cohorts.find(c => c.id === cohortId)
        : (await sql`SELECT name FROM cohorts WHERE id = ${cohortId}`)[0];
      const cohortName = cohort?.name || 'a cohort';
      for (const member of cohortMembers) {
        await createNotification({
          recipientId: member.user_id,
          type: 'group_message',
          title: cohortName,
          body: `${senderName}: ${messageText.slice(0, 80)}${messageText.length > 80 ? '…' : ''}`,
          senderId: userId,
          refId: cohortId
        });
      }
    } catch (notifErr) {
      console.error('Cohort notification error:', notifErr.message);
    }

    res.json({ success: true, message: enrichedMsg });
  } catch (err) {
    console.error('Send cohort message error:', err);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

// ── GET /api/teammates/mutual ────────────────────────────────────────────────
app.get('/api/teammates/mutual', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;

    // In-memory mode mock helper
    if (isInMemory) {
      // Find other users who share at least one cohort membership with this user
      const myCohortIds = new Set(
        inMemoryStore.cohort_members.filter(gm => gm.user_id === userId).map(gm => gm.cohort_id)
      );
      const teammateIds = new Set(
        inMemoryStore.cohort_members
          .filter(gm => myCohortIds.has(gm.cohort_id) && gm.user_id !== userId)
          .map(gm => gm.user_id)
      );
      // Include accepted friends
      inMemoryStore.friendships
        .filter(f => f.status === 'accepted' && (f.user_id_1 === userId || f.user_id_2 === userId))
        .forEach(f => {
          const friendId = f.user_id_1 === userId ? f.user_id_2 : f.user_id_1;
          teammateIds.add(friendId);
        });

      const teammates = inMemoryStore.users.filter(u => teammateIds.has(u.id));

      const activities = teammates.map(u => {
        const book = u.books && u.books.title ? u.books : null;
        const unreadCount = inMemoryStore.messages.filter(
          m => m.sender_id === u.id && m.receiver_id === userId && !m.read
        ).length;
        return {
          id: u.id,
          name: u.name,
          username: u.username,
          avatar_url: u.avatar_url,
          currentBook: book ? {
            title: book.title,
            author: book.author,
            currentPage: book.currentPage || book.current_page || 0,
            totalPages: book.totalPages || book.total_pages || 100
          } : null,
          latestNote: null,
          lastActive: new Date().toISOString(),
          unreadCount
        };
      });
      return res.json({ teammates: activities });
    }

    const teammates = await sql`
      SELECT DISTINCT u.id, u.name, u.username, u.avatar_url, u.updated_at, u.books, u.daily_notes,
             COALESCE((
               SELECT COUNT(*)::int 
               FROM messages m 
               WHERE m.sender_id = u.id AND m.receiver_id = ${userId} AND m.read = false
             ), 0) as "unreadCount"
      FROM users u
      LEFT JOIN cohort_members gm2 ON gm2.user_id = u.id
      LEFT JOIN cohort_members gm1 ON gm1.cohort_id = gm2.cohort_id AND gm1.user_id = ${userId}
      LEFT JOIN friendships f ON (f.user_id_1 = u.id AND f.user_id_2 = ${userId})
                              OR (f.user_id_2 = u.id AND f.user_id_1 = ${userId})
      WHERE u.id != ${userId}
        AND (gm1.user_id IS NOT NULL OR f.status = 'accepted')
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
        lastActive: new Date(lastActiveTime).toISOString(),
        unreadCount: u.unreadCount || 0
      });
    }

    activities.sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive));
    res.json({ teammates: activities });
  } catch (err) {
    console.error('Fetch mutual teammates error:', err);
    res.status(500).json({ error: 'Failed to fetch teammates.' });
  }
});

// ── GET /api/chats/recent ───────────────────────────────────────────────────
app.get('/api/chats/recent', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;

    if (isInMemory) {
      // 1. Get Cohorts user has joined
      const myCohortIds = new Set(
        inMemoryStore.cohort_members
          .filter(gm => gm.user_id === userId)
          .map(gm => gm.cohort_id)
      );
      const cohorts = inMemoryStore.cohorts.filter(c => myCohortIds.has(c.id));

      const enrichCohorts = cohorts.map(c => {
        const cMsgs = inMemoryStore.messages
          .filter(m => m.cohort_id === c.id)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const lm = cMsgs[0];
        const sender = lm ? (inMemoryStore.users.find(u => u.id === lm.sender_id) || {}) : {};
        return {
          id: c.id,
          type: 'cohort',
          name: c.name,
          description: c.description,
          lastMessageText: lm ? lm.message_text : null,
          lastMessageAt: lm ? lm.created_at : null,
          lastMessageSenderName: lm ? (sender.name || sender.username || 'Someone') : null,
          lastMessageSenderAvatarUrl: lm ? sender.avatar_url : null,
        };
      });

      // 2. Get DMs — include friends even without messages
      const friendIds = new Set();
      inMemoryStore.friendships
        .filter(f => f.status === 'accepted' && (f.user_id_1 === userId || f.user_id_2 === userId))
        .forEach(f => {
          const otherId = f.user_id_1 === userId ? f.user_id_2 : f.user_id_1;
          friendIds.add(otherId);
        });

      const dmUserIds = new Set();
      // Users with existing messages
      inMemoryStore.users.filter(u => {
        if (u.id === userId) return false;
        return inMemoryStore.messages.some(m =>
          (m.sender_id === userId && m.receiver_id === u.id) ||
          (m.sender_id === u.id && m.receiver_id === userId)
        );
      }).forEach(u => dmUserIds.add(u.id));
      // Also include all accepted friends
      friendIds.forEach(fid => dmUserIds.add(fid));

      const dmUsers = inMemoryStore.users.filter(u => dmUserIds.has(u.id));

      const enrichDMs = dmUsers.map(u => {
        const uMsgs = inMemoryStore.messages
          .filter(m =>
            (m.sender_id === userId && m.receiver_id === u.id) ||
            (m.sender_id === u.id && m.receiver_id === userId)
          )
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const lm = uMsgs[0];
        return {
          id: u.id,
          type: 'private',
          name: u.name || u.username,
          username: u.username,
          avatarUrl: u.avatar_url,
          lastMessageText: lm ? lm.message_text : null,
          lastMessageAt: lm ? lm.created_at : null,
          lastMessageSenderName: lm ? (lm.sender_id === userId ? 'You' : (u.name || u.username)) : null,
          lastMessageSenderAvatarUrl: u.avatar_url,
        };
      });

      const allChats = [...enrichCohorts, ...enrichDMs];
      allChats.sort((a, b) => {
        if (!a.lastMessageAt) return 1;
        if (!b.lastMessageAt) return -1;
        return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
      });

      return res.json({ chats: allChats });
    }

    // Neon DB queries
    const cohorts = await sql`
      SELECT c.id, c.name, c.description
      FROM cohorts c
      JOIN cohort_members mine ON mine.cohort_id = c.id
      WHERE mine.user_id = ${userId}
    `;
    const cohortLastMessages = await sql`
      SELECT m.cohort_id, m.message_text, m.image_url, m.created_at, u.name as sender_name, u.username as sender_username, u.avatar_url as sender_avatar
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.cohort_id IN (
        SELECT cohort_id FROM cohort_members WHERE user_id = ${userId}
      )
      AND m.created_at = (
        SELECT MAX(created_at) FROM messages WHERE cohort_id = m.cohort_id
      )
    `;

    // Get all accepted friends (regardless of messages)
    const acceptedFriends = await sql`
      SELECT u.id, u.name, u.username, u.avatar_url
      FROM friendships f
      JOIN users u ON (u.id = f.user_id_1 OR u.id = f.user_id_2)
      WHERE (f.user_id_1 = ${userId} OR f.user_id_2 = ${userId})
        AND f.status = 'accepted'
        AND u.id != ${userId}
    `;

    // Get DM users who have exchanged messages (may overlap with friends)
    const dmUsers = await sql`
      SELECT DISTINCT u.id, u.name, u.username, u.avatar_url
      FROM users u
      JOIN messages m ON (m.sender_id = u.id AND m.receiver_id = ${userId})
                      OR (m.receiver_id = u.id AND m.sender_id = ${userId})
      WHERE u.id != ${userId}
    `;

    // Merge friends + DM users (deduplicated by ID)
    const allDmUserMap = new Map();
    for (const u of acceptedFriends) allDmUserMap.set(u.id, u);
    for (const u of dmUsers) if (!allDmUserMap.has(u.id)) allDmUserMap.set(u.id, u);
    const allDmUsers = Array.from(allDmUserMap.values());

    const dmLastMessages = await sql`
      SELECT DISTINCT ON (partner_id)
             CASE WHEN sender_id = ${userId} THEN receiver_id ELSE sender_id END as partner_id,
             message_text, image_url, created_at, sender_id
      FROM messages
      WHERE (sender_id = ${userId} AND receiver_id IS NOT NULL)
         OR (receiver_id = ${userId} AND sender_id IS NOT NULL)
      ORDER BY partner_id, created_at DESC
    `;

    const cohortMsgMap = new Map(cohortLastMessages.map(m => [m.cohort_id, m]));
    const enrichCohorts = cohorts.map(c => {
      const lm = cohortMsgMap.get(c.id);
      return {
        id: c.id,
        type: 'cohort',
        name: c.name,
        description: c.description,
        lastMessageText: lm ? lm.message_text : null,
        lastMessageImageUrl: lm ? lm.image_url : null,
        lastMessageAt: lm ? lm.created_at : null,
        lastMessageSenderName: lm ? lm.sender_name : null,
        lastMessageSenderAvatarUrl: lm ? lm.sender_avatar : null,
      };
    });

    const dmMsgMap = new Map(dmLastMessages.map(m => [m.partner_id, m]));
    const enrichDMs = allDmUsers.map(u => {
      const lm = dmMsgMap.get(u.id);
      return {
        id: u.id,
        type: 'private',
        name: u.name || u.username,
        username: u.username,
        avatarUrl: u.avatar_url,
        lastMessageText: lm ? lm.message_text : null,
        lastMessageImageUrl: lm ? lm.image_url : null,
        lastMessageAt: lm ? lm.created_at : null,
        lastMessageSenderName: lm ? (lm.sender_id === userId ? 'You' : (u.name || u.username)) : null,
        lastMessageSenderAvatarUrl: u.avatar_url,
      };
    });

    const allChats = [...enrichCohorts, ...enrichDMs];
    allChats.sort((a, b) => {
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
    });

    res.json({ chats: allChats });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/chat/message/:id ──────────────────────────────────────────────
app.delete('/api/chat/message/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const messageId = req.params.id;

    if (isInMemory) {
      const msgIndex = inMemoryStore.messages.findIndex(m => m.id === messageId || String(m.id) === String(messageId));
      if (msgIndex === -1) {
        return res.status(404).json({ error: 'Message not found.' });
      }
      if (inMemoryStore.messages[msgIndex].sender_id !== userId) {
        return res.status(403).json({ error: 'You are not authorized to delete this message.' });
      }
      inMemoryStore.messages.splice(msgIndex, 1);
    } else {
      const [msg] = await sql`SELECT sender_id FROM messages WHERE id = ${messageId}`;
      if (!msg) {
        return res.status(404).json({ error: 'Message not found.' });
      }
      if (msg.sender_id !== userId) {
        return res.status(403).json({ error: 'You are not authorized to delete this message.' });
      }
      await sql`DELETE FROM messages WHERE id = ${messageId}`;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).json({ error: 'Failed to delete message.' });
  }
});



// ── POST /api/cohorts/members/add ─────────────────────────────────────────────
app.post('/api/cohorts/members/add', verifyToken, async (req, res) => {
  try {
    const { groupId: cohortId, userId: targetUserId } = req.body;
    if (!cohortId || !targetUserId) {
      return res.status(400).json({ error: 'cohortId and userId are required.' });
    }

    if (!(await isCohortMember(cohortId, req.user.sub))) {
      return res.status(403).json({ error: 'You must be a cohort member to invite others.' });
    }

    await sql`
      INSERT INTO cohort_members (cohort_id, user_id)
      VALUES (${cohortId}, ${targetUserId})
      ON CONFLICT (cohort_id, user_id) DO NOTHING
    `;
    res.json({ success: true });
  } catch (err) {
    console.error('Add cohort member error:', err);
    res.status(500).json({ error: 'Failed to add member.' });
  }
});

// ── DELETE /api/cohorts/members/remove ────────────────────────────────────────
app.delete('/api/cohorts/members/remove', verifyToken, async (req, res) => {
  try {
    const { groupId: cohortId, userId: targetUserId } = req.body;
    if (!cohortId || !targetUserId) {
      return res.status(400).json({ error: 'cohortId and userId are required.' });
    }

    if (!(await isCohortMember(cohortId, req.user.sub))) {
      return res.status(403).json({ error: 'You must be a cohort member to remove members.' });
    }

    await sql`
      DELETE FROM cohort_members
      WHERE cohort_id = ${cohortId} AND user_id = ${targetUserId}
    `;
    res.json({ success: true });
  } catch (err) {
    console.error('Remove cohort member error:', err);
    res.status(500).json({ error: 'Failed to remove member.' });
  }
});

// ── POST /api/cohorts/:cohortId/leave ──────────────────────────────────────────
app.post('/api/cohorts/:cohortId/leave', verifyToken, async (req, res) => {
  try {
    const { cohortId } = req.params;
    const userId = req.user.sub;
    await sql`
      DELETE FROM cohort_members
      WHERE cohort_id = ${cohortId} AND user_id = ${userId}
    `;
    res.json({ success: true });
  } catch (err) {
    console.error('Leave cohort error:', err);
    res.status(500).json({ error: 'Failed to leave cohort.' });
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

// ── Notification Helpers ──────────────────────────────────────────────────────
async function createNotification({ recipientId, type, title, body, senderId, refId }) {
  try {
    if (isInMemory) {
      return createInMemoryNotification({ recipientId, type, title, body, senderId, refId });
    }
    await sql`
      INSERT INTO notifications (recipient_id, sender_id, type, title, body, ref_id)
      VALUES (${recipientId}, ${senderId || null}, ${type}, ${title}, ${body}, ${refId || null})
    `;
  } catch (err) {
    console.error('createNotification error:', err.message);
  }
}

async function markNotificationRead(notifId, userId) {
  try {
    if (isInMemory) {
      const n = inMemoryStore.notifications.find(n => n.id === notifId && n.recipient_id === userId);
      if (n) { n.read = true; saveDb(); }
      return;
    }
    await sql`UPDATE notifications SET read = true WHERE id = ${notifId} AND recipient_id = ${userId}`;
  } catch (err) {
    console.error('markNotificationRead error:', err.message);
  }
}

// ── GET /api/notifications ────────────────────────────────────────────────────
app.get('/api/notifications', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    let notifications;
    if (isInMemory) {
      notifications = getInMemoryNotifications(userId);
    } else {
      notifications = await sql`
        SELECT n.id, n.type, n.title, n.body, n.read, n.ref_id,
               n.created_at,
               u.name as sender_name, u.username as sender_username, u.avatar_url as sender_avatar_url
        FROM notifications n
        LEFT JOIN users u ON u.id = n.sender_id
        WHERE n.recipient_id = ${userId}
        ORDER BY n.created_at DESC
        LIMIT 50
      `;
    }
    // Format for frontend
    const formatted = notifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      read: !!n.read,
      refId: n.ref_id || null,
      time: n.created_at,
      senderName: n.sender_name || null,
      senderUsername: n.sender_username || null,
      senderAvatarUrl: n.sender_avatar_url || null,
    }));
    res.json({ notifications: formatted });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// ── POST /api/notifications/mark-read ─────────────────────────────────────────
app.post('/api/notifications/mark-read', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { id } = req.body; // if omitted, mark all read
    if (id) {
      await markNotificationRead(id, userId);
    } else {
      if (isInMemory) {
        inMemoryStore.notifications
          .filter(n => n.recipient_id === userId)
          .forEach(n => { n.read = true; });
        saveDb();
      } else {
        await sql`UPDATE notifications SET read = true WHERE recipient_id = ${userId}`;
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Mark notifications read error:', err);
    res.status(500).json({ error: 'Failed to mark notifications.' });
  }
});

// ── DELETE /api/notifications/:id ─────────────────────────────────────────────
app.delete('/api/notifications/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const notifId = req.params.id;
    if (isInMemory) {
      inMemoryStore.notifications = inMemoryStore.notifications.filter(
        n => !(n.id === notifId && n.recipient_id === userId)
      );
      saveDb();
    } else {
      await sql`DELETE FROM notifications WHERE id = ${notifId} AND recipient_id = ${userId}`;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ error: 'Failed to delete notification.' });
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
  loadDb();
  app.listen(PORT, () => {
    console.log(`🚀 Shelf Auth API running on http://localhost:${PORT} (Fallback Mode)`);
  });
});
