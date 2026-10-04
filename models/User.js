'use strict';

const pool = require('../config/db');

/** Find an active user by email. Explicitly selects only fields needed for authentication (M-5). */
exports.findByEmail = async (email) => {
  const [rows] = await pool.query(
    'SELECT id, full_name, email, password, role, is_active FROM users WHERE email = ? AND is_active = 1 LIMIT 1',
    [email]
  );
  return rows[0] || null;
};

/** Find a user by ID (excludes password hash). */
exports.findById = async (id) => {
  const [rows] = await pool.query(
    'SELECT id, full_name, email, role, created_at FROM users WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
};

/** Get all active users with a given role (e.g. for judge dropdown in R3). */
exports.findByRole = async (role, limit = 200) => {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 200, 1), 1000);
  const [rows] = await pool.query(
    'SELECT id, full_name, email FROM users WHERE role = ? AND is_active = 1 ORDER BY full_name LIMIT ?',
    [role, safeLimit]
  );
  return rows;
};
