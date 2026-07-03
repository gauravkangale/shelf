require('dotenv').config({ path: './.env' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    await sql`ALTER TABLE users ADD CONSTRAINT unique_username UNIQUE (username)`;
    console.log("Added UNIQUE constraint on username.");
  } catch(e) {
    console.log("Error or already exists:", e.message);
  }
  process.exit(0);
}
run();
