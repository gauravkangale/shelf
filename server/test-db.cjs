const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: require('path').join(__dirname, 'server', '.env') });

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const result = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'users';
  `;
  console.log("Columns in 'users' table:", result.map(r => r.column_name));
}

run().catch(console.error);
