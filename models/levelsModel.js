const pool = require('../config/db');

const getAllLevels = async (filters = {}) => {
  let query = 'SELECT * FROM levels WHERE status = $1';
  const params = [filters.status || 'active'];
  let paramCount = 2;

  if (filters.academic_year_id) {
    query += ` AND academic_year_id = $${paramCount}`;
    params.push(filters.academic_year_id);
    paramCount++;
  }

  query += ' ORDER BY "order" ASC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getLevelById = async (id) => {
  const result = await pool.query('SELECT * FROM levels WHERE id = $1 AND status = $2', [id, 'active']);
  return result.rows[0] || null;
};

const createLevel = async (data, userId) => {
  const { name, code, description, order, status, academic_year_id } = data;
  const result = await pool.query(
    `INSERT INTO levels (name, code, description, "order", status, academic_year_id, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP) RETURNING *`,
    [name, code, description, order, status || 'active', academic_year_id, userId]
  );
  return result.rows[0];
};

const updateLevel = async (id, data, userId) => {
  const { name, code, description, order, status } = data;
  const result = await pool.query(
    `UPDATE levels SET name = $1, code = $2, description = $3, "order" = $4, status = $5,
     user_id_modification = $6, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $7 RETURNING *`,
    [name, code, description, order, status, userId, id]
  );
  return result.rows[0];
};

const deleteLevel = async (id, userId) => {
  await pool.query(
    'UPDATE levels SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['deleted', userId, id]
  );
  return true;
};

module.exports = { getAllLevels, getLevelById, createLevel, updateLevel, deleteLevel };
