require('dotenv').config({ path: './.env' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    const expiredSessions = await sql`DELETE FROM sessions WHERE expires_at < NOW() RETURNING id`;
    const expiredOtps = await sql`DELETE FROM otp_tokens WHERE expires_at < NOW() OR used = true RETURNING id`;
    const expiredResets = await sql`DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used = true RETURNING id`;
    
    console.log(`Deleted ${expiredSessions.length} expired sessions.`);
    console.log(`Deleted ${expiredOtps.length} expired or used OTP tokens.`);
    console.log(`Deleted ${expiredResets.length} expired or used password reset tokens.`);
  } catch (error) {
    console.error("Error clearing storage:", error);
  } finally {
    process.exit(0);
  }
}
run();
