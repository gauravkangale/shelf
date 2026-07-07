require('dotenv').config({ path: './.env' });
const { neon } = require('@neondatabase/serverless');

async function migrate() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;`;
    console.log("Migration successful: Added password_hash column to users table.");
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    process.exit(0);
  }
}

migrate();
