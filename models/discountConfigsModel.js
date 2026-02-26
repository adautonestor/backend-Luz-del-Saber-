const pool = require('../config/db');

const getAllDiscountConfigs = async (filters = {}) => {
  let query = `
    SELECT dc.*, u.first_name || ' ' || u.last_names AS usuario_nombre
    FROM discount_configs dc
    LEFT JOIN users u ON dc.user_id_registration = u.id
    WHERE dc.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.level) {
    query += ` AND dc.level = $${paramCount}`;
    params.push(filters.level);
    paramCount++;
  }

  if (filters.academic_year) {
    query += ` AND dc.academic_year = $${paramCount}`;
    params.push(filters.academic_year);
    paramCount++;
  }

  if (filters.status !== undefined) {
    query += ` AND dc.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }

  query += ' ORDER BY dc.children_quantity, dc.level';
  const result = await pool.query(query, params);
  return result.rows;
};

const getDiscountConfigById = async (id) => {
  const query = `
    SELECT dc.*
    FROM discount_configs dc
    WHERE dc.id = $1 AND dc.status = 'active'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const getActiveDiscounts = async (level = null) => {
  let query = `
    SELECT dc.*
    FROM discount_configs dc
    WHERE dc.status = 'active' AND dc.status = 'active'
  `;
  const params = [];

  if (level) {
    query += ' AND dc.level = $1';
    params.push(level);
  }

  query += ' ORDER BY dc.children_quantity, dc.level';
  const result = await pool.query(query, params);
  return result.rows;
};

const createDiscountConfig = async (data, userId) => {
  const { children_quantity, level, discount_percentage, description, academic_year, status } = data;
  const result = await pool.query(
    `INSERT INTO discount_configs (children_quantity, level, discount_percentage, description, academic_year, status, status, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP) RETURNING *`,
    [children_quantity, level, discount_percentage, description, academic_year, status || 'active', 'active', userId]
  );
  return result.rows[0];
};

const updateDiscountConfig = async (id, data, userId) => {
  const { children_quantity, level, discount_percentage, description, status } = data;
  const result = await pool.query(
    `UPDATE discount_configs SET children_quantity = $1, level = $2, discount_percentage = $3, description = $4, status = $5,
     user_id_modification = $6, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $7 RETURNING *`,
    [children_quantity, level, discount_percentage, description, status, userId, id]
  );
  return result.rows[0];
};

const deleteDiscountConfig = async (id, userId) => {
  await pool.query(
    'UPDATE discount_configs SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactive', userId, id]
  );
  return true;
};

module.exports = { getAllDiscountConfigs, getDiscountConfigById, getActiveDiscounts, createDiscountConfig, updateDiscountConfig, deleteDiscountConfig };
