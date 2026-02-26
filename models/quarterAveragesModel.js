const pool = require('../config/db');

const getAllQuarterAverages = async (filters = {}) => {
  let query = `
    SELECT qa.*, s.first_names AS student_first_names, s.last_names AS student_last_names,
           c.name AS course_name, ay.year AS academic_year_value, ay.name AS academic_year_name
    FROM quarter_averages qa
    INNER JOIN students s ON qa.student_id = s.id
    INNER JOIN courses c ON qa.course_id = c.id
    LEFT JOIN academic_years ay ON qa.academic_year = ay.id
    WHERE qa.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.student_id) {
    query += ` AND qa.student_id = $${paramCount}`;
    params.push(filters.student_id);
    paramCount++;
  }

  if (filters.course_id) {
    query += ` AND qa.course_id = $${paramCount}`;
    params.push(filters.course_id);
    paramCount++;
  }

  if (filters.quarter) {
    query += ` AND qa.quarter = $${paramCount}`;
    params.push(filters.quarter);
    paramCount++;
  }

  if (filters.academic_year_id) {
    query += ` AND qa.academic_year = $${paramCount}`;
    params.push(filters.academic_year_id);
    paramCount++;
  }

  query += ' ORDER BY qa.date_time_registration DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getQuarterAverageById = async (id) => {
  const query = `
    SELECT qa.*, s.first_names AS student_first_names, s.last_names AS student_last_names,
           c.name AS course_name, ay.year AS academic_year_value, ay.name AS academic_year_name
    FROM quarter_averages qa
    INNER JOIN students s ON qa.student_id = s.id
    INNER JOIN courses c ON qa.course_id = c.id
    LEFT JOIN academic_years ay ON qa.academic_year = ay.id
    WHERE qa.id = $1 AND qa.status = 'active'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const getAveragesByStudent = async (studentId, academicYearId = null) => {
  let query = `
    SELECT qa.*, c.name AS course_name, ay.year AS academic_year_value, ay.name AS academic_year_name
    FROM quarter_averages qa
    INNER JOIN courses c ON qa.course_id = c.id
    LEFT JOIN academic_years ay ON qa.academic_year = ay.id
    WHERE qa.student_id = $1 AND qa.status = 'active'
  `;
  const params = [studentId];

  if (academicYearId) {
    query += ' AND qa.academic_year = $2';
    params.push(academicYearId);
  }

  query += ' ORDER BY c.name, qa.quarter';
  const result = await pool.query(query, params);
  return result.rows;
};

const createQuarterAverage = async (data, userId) => {
  const { student_id, course_id, academic_year, quarter, partial_average, cumulative_average, calculation_detail } = data;
  const result = await pool.query(
    `INSERT INTO quarter_averages (student_id, course_id, academic_year, quarter, partial_average, cumulative_average, calculation_detail, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP) RETURNING *`,
    [student_id, course_id, academic_year, quarter, partial_average, cumulative_average, calculation_detail || null, userId]
  );
  return result.rows[0];
};

const updateQuarterAverage = async (id, data, userId) => {
  const { partial_average, cumulative_average, calculation_detail } = data;
  const result = await pool.query(
    `UPDATE quarter_averages SET partial_average = $1, cumulative_average = $2, calculation_detail = $3,
     user_id_modification = $4, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $5 RETURNING *`,
    [partial_average, cumulative_average, calculation_detail, userId, id]
  );
  return result.rows[0];
};

const deleteQuarterAverage = async (id, userId) => {
  await pool.query(
    'UPDATE quarter_averages SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactive', userId, id]
  );
  return true;
};

module.exports = { getAllQuarterAverages, getQuarterAverageById, getAveragesByStudent, createQuarterAverage, updateQuarterAverage, deleteQuarterAverage };
