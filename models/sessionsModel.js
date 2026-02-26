const pool = require('../config/db');

const getAllSessions = async (filters = {}) => {
  let query = `
    SELECT s.*, u.first_name AS user_name, u.email AS user_email
    FROM sessions s
    LEFT JOIN users u ON s.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;

  if (filters.user_id) {
    query += ` AND s.user_id = $${paramCount}`;
    params.push(filters.user_id);
    paramCount++;
  }

  if (filters.active !== undefined) {
    query += ` AND s.active = $${paramCount}`;
    params.push(filters.active);
    paramCount++;
  }

  if (filters.start_date) {
    query += ` AND s.start_date >= $${paramCount}`;
    params.push(filters.start_date);
    paramCount++;
  }

  query += ' ORDER BY s.start_date DESC LIMIT 500';
  const result = await pool.query(query, params);
  return result.rows;
};

const getSessionById = async (id) => {
  const query = `
    SELECT s.*, u.first_name AS user_name, u.email AS user_email
    FROM sessions s
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const getSessionByToken = async (token) => {
  const query = 'SELECT * FROM sessions WHERE token = $1';
  const result = await pool.query(query, [token]);
  return result.rows[0] || null;
};

const getSessionsByUser = async (userId, limit = 50) => {
  const query = `
    SELECT *
    FROM sessions
    WHERE user_id = $1
    ORDER BY start_date DESC
    LIMIT $2
  `;
  const result = await pool.query(query, [userId, limit]);
  return result.rows;
};

const getActiveSessions = async (userId = null) => {
  let query = 'SELECT s.*, u.first_name AS user_name FROM sessions s LEFT JOIN users u ON s.user_id = u.id WHERE s.active = true';
  const params = [];

  if (userId) {
    query += ' AND s.user_id = $1';
    params.push(userId);
  }

  query += ' ORDER BY s.start_date DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const createSession = async (data) => {
  const { user_id, token, ip_address, user_agent, expires_at } = data;
  const result = await pool.query(
    `INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at, active, start_date)
     VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP) RETURNING *`,
    [user_id, token, ip_address, user_agent, expires_at]
  );
  return result.rows[0];
};

const closeSession = async (id) => {
  const result = await pool.query(
    'UPDATE sessions SET active = false, end_date = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0];
};

const closeSessionByToken = async (token) => {
  const result = await pool.query(
    'UPDATE sessions SET active = false, end_date = CURRENT_TIMESTAMP WHERE token = $1 RETURNING *',
    [token]
  );
  return result.rows[0];
};

const closeAllUserSessions = async (userId) => {
  const result = await pool.query(
    'UPDATE sessions SET active = false, end_date = CURRENT_TIMESTAMP WHERE user_id = $1 AND active = true',
    [userId]
  );
  return result.rowCount;
};

module.exports = { getAllSessions, getSessionById, getSessionByToken, getSessionsByUser, getActiveSessions, createSession, closeSession, closeSessionByToken, closeAllUserSessions };
