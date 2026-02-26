const pool = require('../config/db');

const getAllAcademicAreas = async (filters = {}) => {
  let query = `
    SELECT * FROM academic_areas
    WHERE status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.name) {
    query += ` AND name ILIKE $${paramCount}`;
    params.push(`%${filters.name}%`);
    paramCount++;
  }

  query += ' ORDER BY "order" ASC, name ASC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getAcademicAreaById = async (id) => {
  const query = 'SELECT * FROM academic_areas WHERE id = $1 AND status = $2';
  const result = await pool.query(query, [id, 'active']);
  return result.rows[0] || null;
};

const createAcademicArea = async (data, userId) => {
  const { name, description, order } = data;

  // Calcular orden si no se proporciona
  let areaOrder = order;
  if (!areaOrder) {
    const maxResult = await pool.query('SELECT COALESCE(MAX("order"), 0) + 1 as next_order FROM academic_areas WHERE status = $1', ['active']);
    areaOrder = maxResult.rows[0].next_order;
  }

  const result = await pool.query(
    `INSERT INTO academic_areas (name, description, "order", status, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, 'active', $4, CURRENT_TIMESTAMP) RETURNING *`,
    [name, description || null, areaOrder, userId]
  );
  return result.rows[0];
};

const updateAcademicArea = async (id, data, userId) => {
  const { name, description, order } = data;
  const result = await pool.query(
    `UPDATE academic_areas SET
     name = COALESCE($1, name),
     description = COALESCE($2, description),
     "order" = COALESCE($3, "order"),
     user_id_modification = $4,
     date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $5 RETURNING *`,
    [name, description, order, userId, id]
  );
  return result.rows[0];
};

const deleteAcademicArea = async (id, userId) => {
  await pool.query(
    'UPDATE academic_areas SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactive', userId, id]
  );
  return true;
};

module.exports = { getAllAcademicAreas, getAcademicAreaById, createAcademicArea, updateAcademicArea, deleteAcademicArea };
