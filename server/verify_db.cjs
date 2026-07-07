require('dotenv').config({ path: './.env' });
const { neon } = require('@neondatabase/serverless');

async function run() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log("Database connection successful.");
    console.log("Tables in database:", tables.map(t => t.table_name).join(", "));
  } catch (error) {
    console.error("Error connecting to database:", error);
  } finally {
    process.exit(0);
  }
}

run();
