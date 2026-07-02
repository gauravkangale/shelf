require('dotenv').config({ path: require('path').join(__dirname, '..', 'server', '.env') });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function checkDb() {
  try {
    const users = await sql`SELECT id, email, name FROM users LIMIT 3`;
    console.log('Users:', users);
    const messages = await sql`SELECT COUNT(*) FROM messages`;
    console.log('Messages Count:', messages);
    const cohorts = await sql`SELECT name FROM cohorts`;
    console.log('Cohorts:', cohorts);
    console.log('Database connected successfully.');
  } catch (err) {
    console.error('Database connection or query failed:', err.message);
  }
}
checkDb();
