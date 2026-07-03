require('dotenv').config({ path: './.env' });
const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const msgs = await sql`SELECT sender_id as "senderId" FROM messages LIMIT 1`;
  console.log('MESSAGES:', msgs);
  process.exit(0);
}
run();
