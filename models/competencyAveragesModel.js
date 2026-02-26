const pool = require('../config/db');

const getAllCompetencyAverages = async (filters = {}) => {
  let query = `
    SELECT ca.*, s.first_names AS student_first_names, s.last_names AS student_last_names,
           c.name AS course_name, comp.name AS competency_name, comp.code AS competency_code,
           ay.year AS academic_year_value, ay.name AS academic_year_name
    FROM competency_averages ca
    INNER JOIN students s ON ca.student_id = s.id
    INNER JOIN courses c ON ca.course_id = c.id
    INNER JOIN course_competencies cc ON ca.course_competency_id = cc.id
    INNER JOIN competencies comp ON cc.competency_id = comp.id
    LEFT JOIN academic_years ay ON ca.academic_year = ay.id
    WHERE ca.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.student_id) {
    query += ` AND ca.student_id = $${paramCount}`;
    params.push(filters.student_id);
    paramCount++;
  }

  if (filters.course_id) {
    query += ` AND ca.course_id = $${paramCount}`;
    params.push(filters.course_id);
    paramCount++;
  }

  if (filters.competencia_id) {
    query += ` AND cc.competency_id = $${paramCount}`;
    params.push(filters.competencia_id);
    paramCount++;
  }

  if (filters.academic_year_id) {
    query += ` AND ca.academic_year = $${paramCount}`;
    params.push(filters.academic_year_id);
    paramCount++;
  }

  query += ' ORDER BY ca.date_time_registration DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getCompetencyAverageById = async (id) => {
  const query = `
    SELECT ca.*, s.first_names AS student_first_names, s.last_names AS student_last_names,
           c.name AS course_name, comp.name AS competency_name,
           ay.year AS academic_year_value, ay.name AS academic_year_name
    FROM competency_averages ca
    INNER JOIN students s ON ca.student_id = s.id
    INNER JOIN courses c ON ca.course_id = c.id
    INNER JOIN course_competencies cc ON ca.course_competency_id = cc.id
    INNER JOIN competencies comp ON cc.competency_id = comp.id
    LEFT JOIN academic_years ay ON ca.academic_year = ay.id
    WHERE ca.id = $1 AND ca.status = 'active'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const getAveragesByStudent = async (studentId, añoEscolarId = null) => {
  let query = `
    SELECT ca.*, c.name AS course_name, comp.name AS competency_name,
           comp.code AS competency_code, ay.year AS academic_year_value, ay.name AS academic_year_name
    FROM competency_averages ca
    INNER JOIN courses c ON ca.course_id = c.id
    INNER JOIN course_competencies cc ON ca.course_competency_id = cc.id
    INNER JOIN competencies comp ON cc.competency_id = comp.id
    LEFT JOIN academic_years ay ON ca.academic_year = ay.id
    WHERE ca.student_id = $1 AND ca.status = 'active'
  `;
  const params = [studentId];

  if (añoEscolarId) {
    query += ' AND ca.academic_year = $2';
    params.push(añoEscolarId);
  }

  query += ' ORDER BY c.name, comp."order"';
  const result = await pool.query(query, params);
  return result.rows;
};

const createCompetencyAverage = async (data, userId) => {
  const { student_id, course_id, course_competency_id, academic_year, annual_average, grading_system } = data;
  const result = await pool.query(
    `INSERT INTO competency_averages (student_id, course_id, course_competency_id, academic_year, annual_average, grading_system, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP) RETURNING *`,
    [student_id, course_id, course_competency_id, academic_year, annual_average, grading_system || 'literal', userId]
  );
  return result.rows[0];
};

const updateCompetencyAverage = async (id, data, userId) => {
  const { annual_average } = data;
  const result = await pool.query(
    `UPDATE competency_averages SET annual_average = $1,
     user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $3 RETURNING *`,
    [annual_average, userId, id]
  );
  return result.rows[0];
};

const deleteCompetencyAverage = async (id, userId) => {
  await pool.query(
    'UPDATE competency_averages SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactive', userId, id]
  );
  return true;
};

module.exports = { getAllCompetencyAverages, getCompetencyAverageById, getAveragesByStudent, createCompetencyAverage, updateCompetencyAverage, deleteCompetencyAverage };
