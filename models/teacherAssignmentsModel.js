const pool = require('../config/db');

const getAllTeacherAssignments = async (filters = {}) => {
  let query = `
    SELECT ta.*, u.first_name AS teacher_first_name, u.last_names AS teacher_last_names,
           c.name AS course_name, g.name AS grade_name,
           ay.year AS academic_year
    FROM teacher_assignments ta
    INNER JOIN users u ON ta.teacher_id = u.id
    INNER JOIN courses c ON ta.course_id = c.id
    INNER JOIN grades g ON ta.grade_id = g.id
    INNER JOIN academic_years ay ON ta.academic_year_id = ay.id
    WHERE ta.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.teacher_id) {
    query += ` AND ta.teacher_id = $${paramCount}`;
    params.push(filters.teacher_id);
    paramCount++;
  }

  if (filters.course_id) {
    query += ` AND ta.course_id = $${paramCount}`;
    params.push(filters.course_id);
    paramCount++;
  }

  if (filters.grade_id) {
    query += ` AND ta.grade_id = $${paramCount}`;
    params.push(filters.grade_id);
    paramCount++;
  }

  if (filters.academic_year_id) {
    query += ` AND ta.academic_year_id = $${paramCount}`;
    params.push(filters.academic_year_id);
    paramCount++;
  }

  if (filters.academic_year) {
    query += ` AND ta.academic_year = $${paramCount}`;
    params.push(filters.academic_year);
    paramCount++;
  }

  query += ' ORDER BY ta.date_time_registration DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getTeacherAssignmentById = async (id) => {
  const query = `
    SELECT ta.*, u.first_name AS teacher_first_name, u.last_names AS teacher_last_names,
           c.name AS course_name, g.name AS grade_name,
           ay.year AS academic_year
    FROM teacher_assignments ta
    INNER JOIN users u ON ta.teacher_id = u.id
    INNER JOIN courses c ON ta.course_id = c.id
    INNER JOIN grades g ON ta.grade_id = g.id
    INNER JOIN academic_years ay ON ta.academic_year_id = ay.id
    WHERE ta.id = $1 AND ta.status = 'active'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const getAssignmentsByTeacher = async (teacherId, academicYearId = null) => {
  let query = `
    SELECT ta.*, c.name AS course_name, g.name AS grade_name,
           ay.year AS academic_year
    FROM teacher_assignments ta
    INNER JOIN courses c ON ta.course_id = c.id
    INNER JOIN grades g ON ta.grade_id = g.id
    INNER JOIN academic_years ay ON ta.academic_year_id = ay.id
    WHERE ta.teacher_id = $1 AND ta.status = 'active'
  `;
  const params = [teacherId];

  if (academicYearId) {
    query += ' AND ta.academic_year_id = $2';
    params.push(academicYearId);
  }

  query += ' ORDER BY g."order", c.name';
  const result = await pool.query(query, params);
  return result.rows;
};

const createTeacherAssignment = async (data, userId) => {
  const { teacher_id, course_id, grade_id, section_ids, academic_year, academic_year_id, status } = data;
  const result = await pool.query(
    `INSERT INTO teacher_assignments (teacher_id, course_id, grade_id, section_ids, academic_year, academic_year_id, status, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP) RETURNING *`,
    [teacher_id, course_id, grade_id, section_ids ? JSON.stringify(section_ids) : null, academic_year, academic_year_id, status || 'active', userId]
  );
  return result.rows[0];
};

const updateTeacherAssignment = async (id, data, userId) => {
  const { section_ids, status } = data;
  const result = await pool.query(
    `UPDATE teacher_assignments SET section_ids = $1, status = $2,
     user_id_modification = $3, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $4 RETURNING *`,
    [section_ids ? JSON.stringify(section_ids) : null, status, userId, id]
  );
  return result.rows[0];
};

const deleteTeacherAssignment = async (id, userId) => {
  await pool.query(
    'UPDATE teacher_assignments SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactive', userId, id]
  );
  return true;
};

module.exports = { getAllTeacherAssignments, getTeacherAssignmentById, getAssignmentsByTeacher, createTeacherAssignment, updateTeacherAssignment, deleteTeacherAssignment };
