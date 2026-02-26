const pool = require('../config/db');

const getAllStudentBehaviors = async (filters = {}) => {
  let query = `
    SELECT sb.*, s.first_names AS student_first_names, s.last_names AS student_last_names,
           u.first_name AS registered_by_name, ay.name AS academic_year_name
    FROM student_behaviors sb
    INNER JOIN students s ON sb.student_id = s.id
    LEFT JOIN users u ON sb.user_id_registration = u.id
    LEFT JOIN academic_years ay ON sb.academic_year_id = ay.id
    WHERE sb.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.student_id) {
    query += ` AND sb.student_id = $${paramCount}`;
    params.push(filters.student_id);
    paramCount++;
  }

  if (filters.type) {
    query += ` AND sb.discipline = $${paramCount}`;
    params.push(filters.type);
    paramCount++;
  }

  if (filters.gravedad) {
    query += ` AND sb.parent_rating = $${paramCount}`;
    params.push(filters.gravedad);
    paramCount++;
  }

  if (filters.quarter) {
    query += ` AND sb.quarter = $${paramCount}`;
    params.push(filters.quarter);
    paramCount++;
  }

  query += ' ORDER BY sb.date_time_registration DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getStudentBehaviorById = async (id) => {
  const query = `
    SELECT sb.*, s.first_names AS student_first_names, s.last_names AS student_last_names,
           u.first_name AS registered_by_name, ay.name AS academic_year_name
    FROM student_behaviors sb
    INNER JOIN students s ON sb.student_id = s.id
    LEFT JOIN users u ON sb.user_id_registration = u.id
    LEFT JOIN academic_years ay ON sb.academic_year_id = ay.id
    WHERE sb.id = $1 AND sb.status = 'active'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const getBehaviorsByStudent = async (studentId, quarter = null) => {
  let query = `
    SELECT sb.*, u.first_name AS registered_by_name, ay.name AS academic_year_name
    FROM student_behaviors sb
    LEFT JOIN users u ON sb.user_id_registration = u.id
    LEFT JOIN academic_years ay ON sb.academic_year_id = ay.id
    WHERE sb.student_id = $1 AND sb.status = 'active'
  `;
  const params = [studentId];

  if (quarter) {
    query += ' AND sb.quarter = $2';
    params.push(quarter);
  }

  query += ' ORDER BY sb.date_time_registration DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const createStudentBehavior = async (data, userId) => {
  const { student_id, discipline, parent_rating, comments, quarter, academic_year, academic_year_id, grading_system, registered_by } = data;
  const result = await pool.query(
    `INSERT INTO student_behaviors (student_id, discipline, parent_rating, comments, quarter, academic_year, academic_year_id, grading_system, registered_by, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP) RETURNING *`,
    [student_id, discipline, parent_rating, comments, quarter, academic_year, academic_year_id, grading_system || 'literal', registered_by || userId, userId]
  );
  return result.rows[0];
};

const updateStudentBehavior = async (id, data, userId) => {
  const { discipline, parent_rating, comments } = data;
  const result = await pool.query(
    `UPDATE student_behaviors SET discipline = $1, parent_rating = $2, comments = $3,
     user_id_modification = $4, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $5 RETURNING *`,
    [discipline, parent_rating, comments, userId, id]
  );
  return result.rows[0];
};

const deleteStudentBehavior = async (id, userId) => {
  await pool.query(
    'UPDATE student_behaviors SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactive', userId, id]
  );
  return true;
};

module.exports = { getAllStudentBehaviors, getStudentBehaviorById, getBehaviorsByStudent, createStudentBehavior, updateStudentBehavior, deleteStudentBehavior };
