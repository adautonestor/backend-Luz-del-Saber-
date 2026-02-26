const pool = require('../config/db');

const getAllSections = async (filters = {}) => {
  let query = `
    SELECT s.*, g.name AS grade_name,
           CASE WHEN u.id IS NOT NULL THEN CONCAT(u.last_names, ', ', u.first_name) ELSE NULL END AS tutor_name
    FROM sections s
    LEFT JOIN grades g ON s.grade_id = g.id
    LEFT JOIN users u ON s.tutor_id = u.id
    WHERE s.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.grade_id) {
    query += ` AND s.grade_id = $${paramCount}`;
    params.push(filters.grade_id);
    paramCount++;
  }

  if (filters.academic_year) {
    query += ` AND s.academic_year = $${paramCount}`;
    params.push(filters.academic_year);
    paramCount++;
  }

  if (filters.academic_year_id) {
    query += ` AND s.academic_year_id = $${paramCount}`;
    params.push(filters.academic_year_id);
    paramCount++;
  }

  query += ' ORDER BY g."order", s.name';
  const result = await pool.query(query, params);
  return result.rows;
};

const getSectionById = async (id) => {
  const query = `
    SELECT s.*, g.name AS grade_name, l.name AS level_name,
           CASE WHEN u.id IS NOT NULL THEN CONCAT(u.last_names, ', ', u.first_name) ELSE NULL END AS tutor_name
    FROM sections s
    LEFT JOIN grades g ON s.grade_id = g.id
    LEFT JOIN levels l ON g.level_id = l.id
    LEFT JOIN users u ON s.tutor_id = u.id
    WHERE s.id = $1 AND s.status = 'active'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const createSection = async (data, userId) => {
  const { grade_id, name, capacity, tutor_id, shift, students, academic_year, academic_year_id } = data;
  const result = await pool.query(
    `INSERT INTO sections (grade_id, name, capacity, tutor_id, shift, students, academic_year, academic_year_id, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP) RETURNING *`,
    [grade_id, name, capacity || 30, tutor_id, shift || 'mañana', students ? JSON.stringify(students) : null, academic_year, academic_year_id, userId]
  );
  return result.rows[0];
};

const updateSection = async (id, data, userId) => {
  const { grade_id, name, capacity, tutor_id, shift, students, academic_year } = data;
  const result = await pool.query(
    `UPDATE sections SET grade_id = $1, name = $2, capacity = $3, tutor_id = $4, shift = $5, students = $6, academic_year = $7,
     user_id_modification = $8, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $9 RETURNING *`,
    [grade_id, name, capacity, tutor_id, shift, students ? JSON.stringify(students) : null, academic_year, userId, id]
  );
  return result.rows[0];
};

const deleteSection = async (id, userId) => {
  await pool.query(
    'UPDATE sections SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['deleted', userId, id]
  );
  return true;
};

module.exports = { getAllSections, getSectionById, createSection, updateSection, deleteSection };
