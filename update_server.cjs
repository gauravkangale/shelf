const fs = require('fs');
const path = '/Users/gauravkangale/Desktop/homepage/shelf/server/index.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Update /api/auth/login-password
const loginTarget = `    const users = isEmail
      ? await sql\`SELECT id, name, username, email, avatar_url, is_verified, password_hash FROM users WHERE email = \${cleanId}\`
      : await sql\`SELECT id, name, username, phone as email, avatar_url, is_verified, password_hash FROM users WHERE phone = \${cleanId}\`;`;
const loginReplacement = `    const users = isEmail
      ? await sql\`SELECT id, name, username, email, avatar_url, is_verified, password_hash FROM users WHERE email = \${cleanId}\`
      : await sql\`SELECT id, name, username, phone as email, avatar_url, is_verified, password_hash FROM users WHERE phone = \${cleanId} OR username = \${cleanId}\`;`;
code = code.replace(loginTarget, loginReplacement);

// 2. Update /api/users/profile
const profileTarget1 = `app.put('/api/users/profile', verifyToken, async (req, res) => {
  try {
    const { name, username, email, avatar_url, phone, bio } = req.body;`;
const profileReplacement1 = `app.put('/api/users/profile', verifyToken, async (req, res) => {
  try {
    const { name, username, email, avatar_url, phone, bio, password } = req.body;`;
code = code.replace(profileTarget1, profileReplacement1);

const profileTarget2 = `    // Update user in DB
    const [user] = await sql\`
      UPDATE users
      SET name = \${name.trim()},
          username = \${cleanUsername},
          email = \${cleanEmail},
          avatar_url = \${avatar_url ? avatar_url.trim() : null},
          phone = \${phone ? phone.trim() : null},
          bio = \${bio ? bio.trim() : null},
          updated_at = NOW()
      WHERE id = \${userId}
      RETURNING *
    \`;`;
const profileReplacement2 = `    let passwordHashUpdate = undefined;
    if (password && password.length >= 8) {
       const bcrypt = require('bcrypt');
       const salt = await bcrypt.genSalt(10);
       passwordHashUpdate = await bcrypt.hash(password, salt);
    }
    
    // Update user in DB
    const [user] = await sql\`
      UPDATE users
      SET name = \${name.trim()},
          username = \${cleanUsername},
          email = \${cleanEmail},
          avatar_url = \${avatar_url ? avatar_url.trim() : null},
          phone = \${phone ? phone.trim() : null},
          bio = \${bio ? bio.trim() : null},
          updated_at = NOW()
          \${passwordHashUpdate ? sql\`, password_hash = \${passwordHashUpdate}\` : sql\`\`}
      WHERE id = \${userId}
      RETURNING *
    \`;`;
code = code.replace(profileTarget2, profileReplacement2);

// 3. Add Forgot Password Endpoints
const forgotEndpoints = `
// ── POST /api/auth/forgot-password/send-otp ────────────────────────────────────────────
app.post('/api/auth/forgot-password/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const cleanId = email.trim().toLowerCase();
    
    const users = await sql\`SELECT id FROM users WHERE email = \${cleanId} OR username = \${cleanId}\`;
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    
    await sql\`
      UPDATE users 
      SET otp_code = \${otp}, otp_purpose = 'reset', otp_expires_at = \${expiresAt.toISOString()}
      WHERE id = \${users[0].id}
    \`;
    
    console.log(\`\\n\\n=== PASSWORD RESET OTP for \${cleanId}: \${otp} ===\\n\\n\`);
    
    res.json({ success: true, message: 'OTP sent' });
  } catch (err) {
    console.error('send-otp error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/forgot-password/verify-reset ────────────────────────────────────────────
app.post('/api/auth/forgot-password/verify-reset', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ error: 'Missing fields' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password too short' });
    
    const cleanId = email.trim().toLowerCase();
    
    const users = await sql\`
      SELECT id FROM users 
      WHERE (email = \${cleanId} OR username = \${cleanId})
        AND otp_code = \${otp}
        AND otp_purpose = 'reset'
        AND otp_expires_at > NOW()
    \`;
    
    if (users.length === 0) return res.status(400).json({ error: 'Invalid or expired OTP' });
    
    const bcrypt = require('bcrypt');
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);
    
    await sql\`
      UPDATE users 
      SET password_hash = \${hash}, otp_code = NULL, otp_purpose = NULL, otp_expires_at = NULL
      WHERE id = \${users[0].id}
    \`;
    
    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    console.error('verify-reset error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
`;

code = code.replace('// ── POST /api/auth/login-password', forgotEndpoints + '\n// ── POST /api/auth/login-password');

fs.writeFileSync(path, code);
console.log('done updating server/index.js');
