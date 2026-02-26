const pool = require('../config/db');

const getAllParentMeetings = async (filters = {}) => {
  let query = `
    SELECT pm.*, g.name AS grado_nombre, sec.name AS seccion_nombre,
           ay.year AS academic_year_name, u.first_name AS organizador_nombre
    FROM parent_meetings pm
    LEFT JOIN grades g ON pm.grade_id = g.id
    LEFT JOIN sections sec ON pm.section_id = sec.id
    LEFT JOIN academic_years ay ON pm.academic_year_id = ay.id
    LEFT JOIN users u ON pm.user_id_registration = u.id
    WHERE pm.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.grade_id) {
    query += ` AND pm.grade_id = $${paramCount}`;
    params.push(filters.grade_id);
    paramCount++;
  }

  if (filters.section_id) {
    query += ` AND pm.section_id = $${paramCount}`;
    params.push(filters.section_id);
    paramCount++;
  }

  if (filters.academic_year_id) {
    query += ` AND pm.academic_year_id = $${paramCount}`;
    params.push(filters.academic_year_id);
    paramCount++;
  }

  if (filters.status) {
    query += ` AND pm.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }

  query += ' ORDER BY pm.date DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getParentMeetingById = async (id) => {
  const query = `
    SELECT pm.*, g.name AS grado_nombre, sec.name AS seccion_nombre,
           ay.year AS academic_year_name
    FROM parent_meetings pm
    LEFT JOIN grades g ON pm.grade_id = g.id
    LEFT JOIN sections sec ON pm.section_id = sec.id
    LEFT JOIN academic_years ay ON pm.academic_year_id = ay.id
    WHERE pm.id = $1 AND pm.status = 'active'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const getMeetingsByGradeAndSection = async (gradoId, seccionId, añoEscolarId = null) => {
  let query = `
    SELECT pm.*, ay.year AS academic_year_name
    FROM parent_meetings pm
    LEFT JOIN academic_years ay ON pm.academic_year_id = ay.id
    WHERE pm.grade_id = $1 AND pm.section_id = $2 AND pm.status = 'active'
  `;
  const params = [gradoId, seccionId];

  if (añoEscolarId) {
    query += ' AND pm.academic_year_id = $3';
    params.push(añoEscolarId);
  }

  query += ' ORDER BY pm.date DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const createParentMeeting = async (data, userId) => {
  const { title, description, date, time, place, grade_id, section_id, academic_year_id, level_id, scope, status } = data;
  const result = await pool.query(
    `INSERT INTO parent_meetings (title, description, date, time, place, grade_id, section_id, academic_year_id, level_id, scope, status, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP) RETURNING *`,
    [title, description, date, time, place, grade_id, section_id, academic_year_id, level_id, scope, status || 'active', userId]
  );
  return result.rows[0];
};

const updateParentMeeting = async (id, data, userId) => {
  const { title, description, date, time, place, status } = data;
  const result = await pool.query(
    `UPDATE parent_meetings SET title = $1, description = $2, date = $3, time = $4, place = $5, status = $6,
     user_id_modification = $7, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $8 RETURNING *`,
    [title, description, date, time, place, status, userId, id]
  );
  return result.rows[0];
};

const cancelMeeting = async (id, motivo, userId) => {
  const result = await pool.query(
    `UPDATE parent_meetings SET status = 'cancelled', description = CONCAT(COALESCE(description, ''), ' | CANCELADA: ', $1),
     user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $3 RETURNING *`,
    [motivo, userId, id]
  );
  return result.rows[0];
};

const deleteParentMeeting = async (id, userId) => {
  await pool.query(
    'UPDATE parent_meetings SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactive', userId, id]
  );
  return true;
};

module.exports = { getAllParentMeetings, getParentMeetingById, getMeetingsByGradeAndSection, createParentMeeting, updateParentMeeting, cancelMeeting, deleteParentMeeting };
