const pool = require('../config/db');

const getAllSchedules = async (filters = {}) => {
  let query = `
    SELECT s.*, g.name AS grado_nombre, sec.name AS seccion_nombre,
           ay.year AS academic_year, u.first_name AS usuario_nombre, g.academic_year_id
    FROM schedules s
    LEFT JOIN grades g ON s.grade_id = g.id
    LEFT JOIN sections sec ON s.section_id = sec.id
    LEFT JOIN academic_years ay ON g.academic_year_id = ay.id
    LEFT JOIN users u ON s.user_id_registration = u.id
    WHERE s.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.grade_id) {
    query += ` AND s.grade_id = $${paramCount}`;
    params.push(filters.grade_id);
    paramCount++;
  }

  if (filters.section_id) {
    query += ` AND s.section_id = $${paramCount}`;
    params.push(filters.section_id);
    paramCount++;
  }

  if (filters.academic_year_id) {
    query += ` AND g.academic_year_id = $${paramCount}`;
    params.push(filters.academic_year_id);
    paramCount++;
  }

  query += ' ORDER BY s.date_time_registration DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getScheduleById = async (id) => {
  const query = `
    SELECT s.*, g.name AS grado_nombre, sec.name AS seccion_nombre,
           ay.year AS academic_year, g.academic_year_id
    FROM schedules s
    LEFT JOIN grades g ON s.grade_id = g.id
    LEFT JOIN sections sec ON s.section_id = sec.id
    LEFT JOIN academic_years ay ON g.academic_year_id = ay.id
    WHERE s.id = $1 AND s.status = 'active'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const getScheduleByGradeAndSection = async (gradoId, seccionId, añoEscolarId) => {
  const query = `
    SELECT s.*, g.name AS grado_nombre, sec.name AS seccion_nombre,
           ay.year AS academic_year, g.academic_year_id
    FROM schedules s
    LEFT JOIN grades g ON s.grade_id = g.id
    LEFT JOIN sections sec ON s.section_id = sec.id
    LEFT JOIN academic_years ay ON g.academic_year_id = ay.id
    WHERE s.grade_id = $1 AND s.section_id = $2 AND g.academic_year_id = $3 AND s.status = 'active'
  `;
  const result = await pool.query(query, [gradoId, seccionId, añoEscolarId]);
  return result.rows[0] || null;
};

const createSchedule = async (data, userId) => {
  const { level_id, grade_id, section_id, course_id, teacher_id, day, start_time, end_time, classroom, observations } = data;
  const result = await pool.query(
    `INSERT INTO schedules (level_id, grade_id, section_id, course_id, teacher_id, day, start_time, end_time, classroom, observations, user_id_registration, date_time_registration, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, 'active') RETURNING *`,
    [level_id, grade_id, section_id, course_id, teacher_id, day, start_time, end_time, classroom, observations, userId]
  );
  return result.rows[0];
};

const updateSchedule = async (id, data, userId) => {
  const { day, start_time, end_time, classroom, observations } = data;
  const result = await pool.query(
    `UPDATE schedules SET day = $1, start_time = $2, end_time = $3, classroom = $4, observations = $5,
     user_id_modification = $6, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $7 RETURNING *`,
    [day, start_time, end_time, classroom, observations, userId, id]
  );
  return result.rows[0];
};

const deleteSchedule = async (id, userId) => {
  await pool.query(
    'UPDATE schedules SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactive', userId, id]
  );
  return true;
};

module.exports = { getAllSchedules, getScheduleById, getScheduleByGradeAndSection, createSchedule, updateSchedule, deleteSchedule };
