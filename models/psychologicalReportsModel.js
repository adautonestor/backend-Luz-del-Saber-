const pool = require('../config/db');

const getAllPsychologicalReports = async (filters = {}) => {
  let query = `
    SELECT pr.*,
           s.first_names AS student_first_names,
           s.last_names AS student_last_names,
           s.dni AS student_dni,
           u.first_name AS uploaded_by_name,
           g.name AS grade_name,
           sec.name AS section_name,
           l.name AS level_name
    FROM psychological_reports pr
    INNER JOIN students s ON pr.student_id = s.id
    LEFT JOIN users u ON pr.uploaded_by = u.id
    LEFT JOIN grades g ON s.grade_id = g.id
    LEFT JOIN sections sec ON s.section_id = sec.id
    LEFT JOIN levels l ON g.level_id = l.id
    WHERE pr.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.student_id) {
    query += ` AND pr.student_id = $${paramCount}`;
    params.push(filters.student_id);
    paramCount++;
  }

  if (filters.type) {
    query += ` AND pr.type = $${paramCount}`;
    params.push(filters.type);
    paramCount++;
  }

  if (filters.academic_year) {
    query += ` AND pr.academic_year = $${paramCount}`;
    params.push(filters.academic_year);
    paramCount++;
  }

  query += ' ORDER BY pr.issue_date DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getPsychologicalReportById = async (id) => {
  const query = `
    SELECT pr.*,
           s.first_names AS student_first_names,
           s.last_names AS student_last_names,
           s.dni AS student_dni,
           u.first_name AS uploaded_by_name
    FROM psychological_reports pr
    INNER JOIN students s ON pr.student_id = s.id
    LEFT JOIN users u ON pr.uploaded_by = u.id
    WHERE pr.id = $1 AND pr.status = 'active'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const getReportsByStudent = async (studentId, academicYear = null) => {
  let query = `
    SELECT pr.*, u.first_name AS uploaded_by_name
    FROM psychological_reports pr
    LEFT JOIN users u ON pr.uploaded_by = u.id
    WHERE pr.student_id = $1 AND pr.status = 'active'
  `;
  const params = [studentId];

  if (academicYear) {
    query += ' AND pr.academic_year = $2';
    params.push(academicYear);
  }

  query += ' ORDER BY pr.issue_date DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const createPsychologicalReport = async (data, userId) => {
  const { student_id, academic_year, issue_date, file_name, file_path, file_size, observations } = data;
  const result = await pool.query(
    `INSERT INTO psychological_reports
     (student_id, academic_year, issue_date, file_name, file_url, file_size, observations, uploaded_by, upload_date, status, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, 'active', $8, CURRENT_TIMESTAMP)
     RETURNING *`,
    [student_id, academic_year, issue_date, file_name, file_path, file_size, observations, userId]
  );
  return result.rows[0];
};

const updatePsychologicalReport = async (id, data, userId) => {
  const { issue_date, file_name, file_path, file_size, observations } = data;

  // Construir query dinámico solo con los campos que se actualizan
  const updates = [];
  const values = [];
  let paramCount = 1;

  if (issue_date !== undefined) {
    updates.push(`issue_date = $${paramCount}`);
    values.push(issue_date);
    paramCount++;
  }
  if (file_name !== undefined) {
    updates.push(`file_name = $${paramCount}`);
    values.push(file_name);
    paramCount++;
  }
  if (file_path !== undefined) {
    updates.push(`file_url = $${paramCount}`);
    values.push(file_path);
    paramCount++;
  }
  if (file_size !== undefined) {
    updates.push(`file_size = $${paramCount}`);
    values.push(file_size);
    paramCount++;
  }
  if (observations !== undefined) {
    updates.push(`observations = $${paramCount}`);
    values.push(observations);
    paramCount++;
  }

  // Siempre actualizar modificación
  updates.push(`user_id_modification = $${paramCount}`);
  values.push(userId);
  paramCount++;

  updates.push(`date_time_modification = CURRENT_TIMESTAMP`);

  // Agregar ID al final
  values.push(id);

  const result = await pool.query(
    `UPDATE psychological_reports SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );
  return result.rows[0];
};

const deletePsychologicalReport = async (id, userId) => {
  await pool.query(
    'UPDATE psychological_reports SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactive', userId, id]
  );
  return true;
};

module.exports = { getAllPsychologicalReports, getPsychologicalReportById, getReportsByStudent, createPsychologicalReport, updatePsychologicalReport, deletePsychologicalReport };
