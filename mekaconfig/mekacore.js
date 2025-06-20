// mekaconfig/mekacore.js
const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function insertCoreUser(user) {
  const idOne = 'MX-' + Math.floor(100000 + Math.random() * 900000);
  const idTwo = crypto.randomUUID();

const query = `
  INSERT INTO mekacore (
    id_one, id_two, first_name, last_name,
    username, email, phone, password, profile_image,
    gender, dob, world, created_at
  ) VALUES (
    $1, $2, $3, $4,
    $5, $6, $7, $8, $9,
    $10, $11, $12, NOW()
  )
  RETURNING id_one
`;

const values = [
  idOne,
  idTwo,
  user.firstName,
  user.lastName,
  user.username,
  user.email,
  user.phone,
  user.password, // ✅ send hashed password
  user.profileImage,
  user.gender,
  user.dob,
  user.world
];

  const result = await pool.query(query, values);
  return result.rows[0];
}

module.exports = {
  insertCoreUser
};