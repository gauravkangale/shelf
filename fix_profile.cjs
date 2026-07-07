const fs = require('fs');

// 1. Fix server/index.js profile update
const serverPath = '/Users/gauravkangale/Desktop/homepage/shelf/server/index.js';
let serverCode = fs.readFileSync(serverPath, 'utf8');

const profileUpdateTarget = `    // Update user in DB
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

const profileUpdateReplacement = `    // Update user in DB
    const updateData = {
      name: name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      avatar_url: avatar_url ? avatar_url.trim() : null,
      phone: phone ? phone.trim() : null,
      bio: bio ? bio.trim() : null,
      updated_at: new Date()
    };
    if (passwordHashUpdate) {
      updateData.password_hash = passwordHashUpdate;
    }

    const [user] = await sql\`
      UPDATE users SET \${sql(updateData)}
      WHERE id = \${userId}
      RETURNING *
    \`;`;

serverCode = serverCode.replace(profileUpdateTarget, profileUpdateReplacement);
fs.writeFileSync(serverPath, serverCode);

// 2. Fix SettingsPage.jsx username input
const settingsPath = '/Users/gauravkangale/Desktop/homepage/shelf/src/components/SettingsPage.jsx';
let settingsCode = fs.readFileSync(settingsPath, 'utf8');

const usernameTarget = `          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            style={{`;

const usernameReplacement = `          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value.replace(/\\s/g, ''))}
            onKeyDown={e => { if (e.key === ' ') e.preventDefault(); }}
            style={{`;

settingsCode = settingsCode.replace(usernameTarget, usernameReplacement);
fs.writeFileSync(settingsPath, settingsCode);

console.log('done fixing profile and settings');
