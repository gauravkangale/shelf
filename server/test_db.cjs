require('dotenv').config({ path: './.env' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function run() {
  const users = await sql`SELECT * FROM users`;
  console.log(users);
  process.exit(0);
}
run();
