// create_admin.js - run `npm run seed-admin` to create a staff user with a hashed password
// Usage: set env DB_* like in .env or rely on defaults. It will insert username=libadmin unless overwritten.

const bcrypt = require('bcrypt');
const pool = require('./db');
require('dotenv').config();

async function createAdmin() {
  const username = process.env.SEED_USER || 'libadmin';
  const password = process.env.SEED_PASS || 'Abhi07@$'; // default - change for production
  const name = process.env.SEED_NAME || 'Library Admin';
  const role = process.env.SEED_ROLE || 'librarian';
  const hashed = await bcrypt.hash(password, 10);

  try {
    const [existing] = await pool.query('SELECT id FROM staff WHERE username = ?', [username]);
    if (existing.length) {
      console.log('User already exists:', username);
      process.exit(0);
    }
    await pool.query('INSERT INTO staff (username, password_hash, name, role) VALUES (?, ?, ?, ?)', [username, hashed, name, role]);
    console.log(`Created user ${username} with password ${password} (hashed stored in DB)`);
    process.exit(0);
  } catch (err) {
    console.error('Error seeding admin:', err);
    process.exit(1);
  }
}

createAdmin();
