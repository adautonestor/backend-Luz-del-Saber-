const pool = require('../config/db');

const getAllRoles = async (filters = {}) => {
  let query = `
    SELECT r.*, u.first_name AS user_name
    FROM roles r
    LEFT JOIN users u ON r.user_id_registration = u.id
    WHERE r.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.name) {
    query += ` AND r.name ILIKE $${paramCount}`;
    params.push(`%${filters.name}%`);
    paramCount++;
  }

  query += ' ORDER BY r.name';
  const result = await pool.query(query, params);
  return result.rows;
};

const getRoleById = async (id) => {
  const query = 'SELECT * FROM roles WHERE id = $1 AND status = $2';
  const result = await pool.query(query, [id, 'active']);
  return result.rows[0] || null;
};

const createRole = async (data, userId) => {
  const { name, description } = data;
  const result = await pool.query(
    `INSERT INTO roles (name, description, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING *`,
    [name, description, userId]
  );
  return result.rows[0];
};

const updateRole = async (id, data, userId) => {
  const { name, description } = data;
  const result = await pool.query(
    `UPDATE roles SET name = $1, description = $2,
     user_id_modification = $3, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $4 RETURNING *`,
    [name, description, userId, id]
  );
  return result.rows[0];
};

const deleteRole = async (id, userId) => {
  await pool.query(
    'UPDATE roles SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactive', userId, id]
  );
  return true;
};

module.exports = { getAllRoles, getRoleById, createRole, updateRole, deleteRole };
