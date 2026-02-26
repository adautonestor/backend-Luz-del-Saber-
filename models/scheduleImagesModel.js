const pool = require('../config/db');

const getAllScheduleImages = async (filters = {}) => {
  let query = `
    SELECT si.*, g.name AS grade_name, sec.name AS section_name,
           l.name AS level_name, u.first_name AS uploaded_by_name,
           t.first_name AS teacher_first_names, t.last_names AS teacher_last_names
    FROM schedule_images si
    LEFT JOIN grades g ON si.grade_id = g.id
    LEFT JOIN sections sec ON si.section_id = sec.id
    LEFT JOIN levels l ON si.level_id = l.id
    LEFT JOIN users u ON si.user_id_registration = u.id
    LEFT JOIN users t ON si.teacher_id = t.id
    WHERE si.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.grade_id) {
    query += ` AND si.grade_id = $${paramCount}`;
    params.push(filters.grade_id);
    paramCount++;
  }

  if (filters.section_id) {
    query += ` AND si.section_id = $${paramCount}`;
    params.push(filters.section_id);
    paramCount++;
  }

  if (filters.level_id) {
    query += ` AND si.level_id = $${paramCount}`;
    params.push(filters.level_id);
    paramCount++;
  }

  if (filters.teacher_id) {
    query += ` AND si.teacher_id = $${paramCount}`;
    params.push(filters.teacher_id);
    paramCount++;
  }

  if (filters.type) {
    query += ` AND si.type = $${paramCount}`;
    params.push(filters.type);
    paramCount++;
  }

  query += ' ORDER BY si.date_time_registration DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getScheduleImageById = async (id) => {
  const query = `
    SELECT si.*, g.name AS grade_name, sec.name AS section_name,
           l.name AS level_name, u.first_name AS uploaded_by_name,
           t.first_name AS teacher_first_names, t.last_names AS teacher_last_names
    FROM schedule_images si
    LEFT JOIN grades g ON si.grade_id = g.id
    LEFT JOIN sections sec ON si.section_id = sec.id
    LEFT JOIN levels l ON si.level_id = l.id
    LEFT JOIN users u ON si.user_id_registration = u.id
    LEFT JOIN users t ON si.teacher_id = t.id
    WHERE si.id = $1 AND si.status = 'active'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const getScheduleImageByGradeAndSection = async (gradeId, sectionId) => {
  const query = `
    SELECT si.*, g.name AS grade_name, sec.name AS section_name,
           l.name AS level_name, u.first_name AS uploaded_by_name,
           t.first_name AS teacher_first_names, t.last_names AS teacher_last_names
    FROM schedule_images si
    LEFT JOIN grades g ON si.grade_id = g.id
    LEFT JOIN sections sec ON si.section_id = sec.id
    LEFT JOIN levels l ON si.level_id = l.id
    LEFT JOIN users u ON si.user_id_registration = u.id
    LEFT JOIN users t ON si.teacher_id = t.id
    WHERE si.grade_id = $1 AND si.section_id = $2 AND si.status = 'active'
  `;
  const result = await pool.query(query, [gradeId, sectionId]);
  return result.rows[0] || null;
};

const createScheduleImage = async (data, userId) => {
  const { title, description, type, level_id, grade_id, section_id, teacher_id, file_name, file_path, file_size, file_type, uploaded_by } = data;
  // image_data es obligatorio en BD - usar file_path como valor (compatibilidad con sistema anterior)
  const imageData = file_path || '';
  const result = await pool.query(
    `INSERT INTO schedule_images (title, description, type, level_id, grade_id, section_id, teacher_id, file_name, file_path, file_size, file_type, image_data, upload_date, uploaded_by, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, $13, $14, CURRENT_TIMESTAMP) RETURNING *`,
    [title, description, type, level_id, grade_id, section_id, teacher_id, file_name, file_path, file_size, file_type, imageData, uploaded_by || userId, userId]
  );
  return result.rows[0];
};

const updateScheduleImage = async (id, data, userId) => {
  const { title, description, file_name, file_path, file_size, file_type } = data;
  const result = await pool.query(
    `UPDATE schedule_images SET title = COALESCE($1, title), description = COALESCE($2, description),
     file_name = COALESCE($3, file_name), file_path = COALESCE($4, file_path),
     file_size = COALESCE($5, file_size), file_type = COALESCE($6, file_type),
     user_id_modification = $7, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $8 RETURNING *`,
    [title, description, file_name, file_path, file_size, file_type, userId, id]
  );
  return result.rows[0];
};

const deleteScheduleImage = async (id, userId) => {
  await pool.query(
    'UPDATE schedule_images SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactive', userId, id]
  );
  return true;
};

module.exports = { getAllScheduleImages, getScheduleImageById, getScheduleImageByGradeAndSection, createScheduleImage, updateScheduleImage, deleteScheduleImage };
