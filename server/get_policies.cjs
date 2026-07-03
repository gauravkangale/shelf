require('dotenv').config({ path: './.env' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function run() {
  const policies = await sql`SELECT * FROM pg_policies WHERE tablename = 'users'`;
  console.log(policies);
  process.exit(0);
}
run();
