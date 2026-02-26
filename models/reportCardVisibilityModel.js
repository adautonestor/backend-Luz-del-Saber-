const pool = require('../config/db');

const getAllVisibilityConfigs = async (filters = {}) => {
  let query = `
    SELECT rcv.*, g.name AS grado_nombre, ay.year AS academic_year,
           n.name AS nivel_nombre, u.first_name AS usuario_nombre
    FROM report_card_visibility rcv
    LEFT JOIN grades g ON rcv.grade_id = g.id
    LEFT JOIN academic_years ay ON rcv.academic_year_id = ay.id
    LEFT JOIN levels n ON rcv.level_id = n.id
    LEFT JOIN users u ON rcv.user_id_registration = u.id
    WHERE rcv.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.grade_id) {
    query += ` AND rcv.grade_id = $${paramCount}`;
    params.push(filters.grade_id);
    paramCount++;
  }

  if (filters.level_id) {
    query += ` AND rcv.level_id = $${paramCount}`;
    params.push(filters.level_id);
    paramCount++;
  }

  if (filters.academic_year_id) {
    query += ` AND rcv.academic_year_id = $${paramCount}`;
    params.push(filters.academic_year_id);
    paramCount++;
  }

  if (filters.quarter) {
    query += ` AND rcv.quarter = $${paramCount}`;
    params.push(filters.quarter);
    paramCount++;
  }

  if (filters.visible !== undefined) {
    query += ` AND rcv.visible = $${paramCount}`;
    params.push(filters.visible);
    paramCount++;
  }

  query += ' ORDER BY rcv.date_time_registration DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getVisibilityConfigById = async (id) => {
  const query = `
    SELECT rcv.*, g.name AS grado_nombre, ay.year AS academic_year,
           n.name AS nivel_nombre
    FROM report_card_visibility rcv
    LEFT JOIN grades g ON rcv.grade_id = g.id
    LEFT JOIN academic_years ay ON rcv.academic_year_id = ay.id
    LEFT JOIN levels n ON rcv.level_id = n.id
    WHERE rcv.id = $1 AND rcv.status = 'active'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const getVisibilityByParams = async (gradoId, nivelId, añoEscolarId, quarter) => {
  const query = `
    SELECT rcv.*
    FROM report_card_visibility rcv
    WHERE rcv.grade_id = $1 AND rcv.level_id = $2 AND rcv.academic_year_id = $3 AND rcv.quarter = $4 AND rcv.status = 'active'
  `;
  const result = await pool.query(query, [gradoId, nivelId, añoEscolarId, quarter]);
  return result.rows[0] || null;
};

/**
 * Busca config existente manejando correctamente NULLs con IS NULL
 * (PostgreSQL: NULL = NULL es NULL, no TRUE)
 */
const findExistingConfig = async (academicYearId, quarter, levelId, gradeId) => {
  const conditions = ['rcv.academic_year_id = $1', 'rcv.quarter = $2', "rcv.status = 'active'"];
  const params = [academicYearId, quarter];
  let paramIdx = 3;

  if (gradeId) {
    conditions.push(`rcv.grade_id = $${paramIdx}`);
    params.push(gradeId);
    paramIdx++;
  } else {
    conditions.push('rcv.grade_id IS NULL');
  }

  if (levelId) {
    conditions.push(`rcv.level_id = $${paramIdx}`);
    params.push(levelId);
  } else {
    conditions.push('rcv.level_id IS NULL');
  }

  const query = `
    SELECT rcv.* FROM report_card_visibility rcv
    WHERE ${conditions.join(' AND ')}
    ORDER BY rcv.date_time_registration DESC
    LIMIT 1
  `;

  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

const createVisibilityConfig = async (data, userId) => {
  const { grade_id, level_id, academic_year_id, quarter, visible, authorization_date, observations } = data;
  const result = await pool.query(
    `INSERT INTO report_card_visibility (grade_id, level_id, academic_year_id, quarter, visible, authorization_date, observations, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP) RETURNING *`,
    [grade_id, level_id, academic_year_id, quarter, visible !== false, authorization_date, observations, userId]
  );
  return result.rows[0];
};

const updateVisibilityConfig = async (id, data, userId) => {
  const { visible, authorization_date, observations } = data;
  const result = await pool.query(
    `UPDATE report_card_visibility SET visible = $1, authorization_date = $2, observations = $3,
     user_id_modification = $4, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $5 RETURNING *`,
    [visible, authorization_date, observations, userId, id]
  );
  return result.rows[0];
};

const deleteVisibilityConfig = async (id, userId) => {
  await pool.query(
    'UPDATE report_card_visibility SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactive', userId, id]
  );
  return true;
};

module.exports = { getAllVisibilityConfigs, getVisibilityConfigById, getVisibilityByParams, findExistingConfig, createVisibilityConfig, updateVisibilityConfig, deleteVisibilityConfig };
