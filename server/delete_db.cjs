require('dotenv').config({ path: './.env' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function run() {
  await sql`DELETE FROM users WHERE id = '0b71a0ed-16ac-4c89-b2a0-3c4e9b38c811'`;
  console.log("Deleted duplicate user.");
  process.exit(0);
}
run();
