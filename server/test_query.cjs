require('dotenv').config({ path: './.env' });
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function run() {
  const msgs = await sql`SELECT * FROM messages ORDER BY created_at DESC LIMIT 5`;
  console.log(msgs);
  process.exit(0);
}
run();
