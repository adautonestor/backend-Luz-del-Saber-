const pool = require('../config/db');

const getAllPermissions = async (filters = {}) => {
  let query = `
    SELECT p.*, u.first_name AS user_name
    FROM permissions p
    LEFT JOIN users u ON p.user_id_registration = u.id
    WHERE p.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.module) {
    query += ` AND p.module = $${paramCount}`;
    params.push(filters.module);
    paramCount++;
  }

  if (filters.name) {
    query += ` AND p.name ILIKE $${paramCount}`;
    params.push(`%${filters.name}%`);
    paramCount++;
  }

  query += ' ORDER BY p.module, p.name';
  const result = await pool.query(query, params);
  return result.rows;
};

const getPermissionById = async (id) => {
  const query = 'SELECT * FROM permissions WHERE id = $1 AND status = $2';
  const result = await pool.query(query, [id, 'active']);
  return result.rows[0] || null;
};

const getPermissionsByModule = async (module) => {
  const query = `
    SELECT * FROM permissions
    WHERE module = $1 AND status = 'active'
    ORDER BY name
  `;
  const result = await pool.query(query, [module]);
  return result.rows;
};

const createPermission = async (data, userId) => {
  const { name, description, module, action } = data;
  const result = await pool.query(
    `INSERT INTO permissions (name, description, module, action, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING *`,
    [name, description, module, action, userId]
  );
  return result.rows[0];
};

const updatePermission = async (id, data, userId) => {
  const { name, description, module, action } = data;
  const result = await pool.query(
    `UPDATE permissions SET name = $1, description = $2, module = $3, action = $4,
     user_id_modification = $5, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $6 RETURNING *`,
    [name, description, module, action, userId, id]
  );
  return result.rows[0];
};

const deletePermission = async (id, userId) => {
  await pool.query(
    'UPDATE permissions SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactive', userId, id]
  );
  return true;
};

module.exports = { getAllPermissions, getPermissionById, getPermissionsByModule, createPermission, updatePermission, deletePermission };
