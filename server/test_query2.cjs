require('dotenv').config({ path: './.env' });
const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const users = await sql`SELECT id, username FROM users`;
  console.log('USERS:', users);
  
  const msgs = await sql`SELECT id, sender_id, receiver_id, message_text FROM messages ORDER BY created_at DESC LIMIT 5`;
  console.log('MESSAGES:', msgs);
  process.exit(0);
}
run();
