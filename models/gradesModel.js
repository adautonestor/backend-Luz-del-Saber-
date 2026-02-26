const pool = require('../config/db');

const getAllGrades = async (filters = {}) => {
  let query = `
    SELECT g.*, l.name AS level_name, ay.name AS academic_year_name
    FROM grades g
    LEFT JOIN levels l ON g.level_id = l.id
    LEFT JOIN academic_years ay ON g.academic_year_id = ay.id
    WHERE g.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.level_id) {
    query += ` AND g.level_id = $${paramCount}`;
    params.push(filters.level_id);
    paramCount++;
  }

  if (filters.status) {
    query += ` AND g.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }

  if (filters.academic_year_id) {
    query += ` AND g.academic_year_id = $${paramCount}`;
    params.push(filters.academic_year_id);
    paramCount++;
  }

  query += ' ORDER BY g."order" ASC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getGradeById = async (id) => {
  const query = `
    SELECT g.*, l.name AS level_name
    FROM grades g
    LEFT JOIN levels l ON g.level_id = l.id
    WHERE g.id = $1 AND g.status = 'active'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const createGrade = async (data, userId) => {
  const { level_id, name, code, description, order, courses_json, status, academic_year_id } = data;
  const result = await pool.query(
    `INSERT INTO grades (level_id, name, code, description, "order", courses_json, status, academic_year_id, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP) RETURNING *`,
    [level_id, name, code, description, order, courses_json ? JSON.stringify(courses_json) : null, status || 'active', academic_year_id, userId]
  );
  return result.rows[0];
};

const updateGrade = async (id, data, userId) => {
  const { level_id, name, code, description, order, courses_json, status } = data;
  const result = await pool.query(
    `UPDATE grades SET level_id = $1, name = $2, code = $3, description = $4, "order" = $5, courses_json = $6, status = $7,
     user_id_modification = $8, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $9 RETURNING *`,
    [level_id, name, code, description, order, courses_json ? JSON.stringify(courses_json) : null, status, userId, id]
  );
  return result.rows[0];
};

const deleteGrade = async (id, userId) => {
  await pool.query(
    'UPDATE grades SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['deleted', userId, id]
  );
  return true;
};

module.exports = { getAllGrades, getGradeById, createGrade, updateGrade, deleteGrade };
