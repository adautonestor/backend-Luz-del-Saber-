const pool = require('../config/db');

const getAllStudentQrCodes = async (filters = {}) => {
  let query = `
    SELECT sqc.*, s.first_names AS student_first_names, s.last_names AS student_last_names, s.code AS student_code
    FROM student_qr_codes sqc
    INNER JOIN students s ON sqc.student_id = s.id
    WHERE sqc.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.student_id) {
    query += ` AND sqc.student_id = $${paramCount}`;
    params.push(filters.student_id);
    paramCount++;
  }

  if (filters.active !== undefined) {
    query += ` AND sqc.active = $${paramCount}`;
    params.push(filters.active);
    paramCount++;
  }

  query += ' ORDER BY sqc.generation_date DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getStudentQrCodeById = async (id) => {
  const query = `
    SELECT sqc.*, s.first_names AS student_first_names, s.last_names AS student_last_names
    FROM student_qr_codes sqc
    INNER JOIN students s ON sqc.student_id = s.id
    WHERE sqc.id = $1 AND sqc.status = 'active'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const getStudentQrCodeByCode = async (qrCode) => {
  const query = `
    SELECT sqc.*, s.first_names AS student_first_names, s.last_names AS student_last_names, s.code AS student_code
    FROM student_qr_codes sqc
    INNER JOIN students s ON sqc.student_id = s.id
    WHERE sqc.qr_code = $1 AND sqc.active = true AND sqc.status = 'active'
  `;
  const result = await pool.query(query, [qrCode]);
  return result.rows[0] || null;
};

/**
 * Buscar estudiante por DNI (código de barras del DNI físico)
 * Devuelve estudiante con información completa incluyendo nivel
 * Solo estudiantes matriculados (enrolled) en el año académico activo
 */
const findStudentByDni = async (dni) => {
  const query = `
    SELECT s.*,
           l.name AS level_name,
           g.name AS grade_name,
           sec.name AS section_name,
           ay.name AS academic_year_name
    FROM students s
    LEFT JOIN levels l ON s.level_id = l.id
    LEFT JOIN grades g ON s.grade_id = g.id
    LEFT JOIN sections sec ON s.section_id = sec.id
    LEFT JOIN academic_years ay ON s.academic_year_id = ay.id AND ay.status = 'active'
    WHERE s.dni = $1 AND s.status IN ('enrolled', 'active')
    LIMIT 1
  `;
  const result = await pool.query(query, [dni]);
  return result.rows[0] || null;
};

// Alias para compatibilidad
const findStudentByDniOrBarcode = findStudentByDni;

/**
 * Generar códigos QR masivamente para múltiples estudiantes
 */
const createBulkQrCodes = async (studentIds, userId) => {
  const results = [];

  for (const studentId of studentIds) {
    // Desactivar códigos anteriores
    await pool.query(
      'UPDATE student_qr_codes SET status = $1 WHERE student_id = $2 AND status = $3',
      ['inactive', studentId, 'active']
    );

    // Obtener DNI del estudiante para usar como código QR
    const studentResult = await pool.query(
      'SELECT dni FROM students WHERE id = $1',
      [studentId]
    );

    if (studentResult.rows[0]) {
      const qrCode = studentResult.rows[0].dni;

      const result = await pool.query(
        `INSERT INTO student_qr_codes (student_id, qr_code, generation_date, generated_by, status, user_id_registration, date_time_registration)
         VALUES ($1, $2, CURRENT_TIMESTAMP, $3, 'active', $4, CURRENT_TIMESTAMP) RETURNING *`,
        [studentId, qrCode, userId, userId]
      );

      results.push(result.rows[0]);
    }
  }

  return results;
};

/**
 * Obtener estudiantes con sus QR codes para generación de PDF
 */
const getStudentsWithQrCodes = async (filters = {}) => {
  let query = `
    SELECT s.id, s.dni, s.first_names, s.last_names, s.code,
           l.name AS level_name, l.id AS level_id,
           g.name AS grade_name, g.id AS grade_id,
           sec.name AS section_name, sec.id AS section_id,
           sqc.qr_code, sqc.generation_date
    FROM students s
    LEFT JOIN levels l ON s.level_id = l.id
    LEFT JOIN grades g ON s.grade_id = g.id
    LEFT JOIN sections sec ON s.section_id = sec.id
    LEFT JOIN student_qr_codes sqc ON s.id = sqc.student_id AND sqc.status = 'active'
    WHERE s.status = 'active'
  `;

  const params = [];
  let paramCount = 1;

  if (filters.level_id) {
    query += ` AND s.level_id = $${paramCount}`;
    params.push(filters.level_id);
    paramCount++;
  }

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

  query += ' ORDER BY s.last_names, s.first_names';

  const result = await pool.query(query, params);
  return result.rows;
};

const getActiveQrCodeByStudent = async (studentId) => {
  const query = `
    SELECT * FROM student_qr_codes
    WHERE student_id = $1 AND active = true AND status = 'active'
    ORDER BY generation_date DESC
    LIMIT 1
  `;
  const result = await pool.query(query, [studentId]);
  return result.rows[0] || null;
};

const createStudentQrCode = async (data, userId) => {
  const { student_id, qr_code, active } = data;

  // Desactivar códigos QR anteriores del estudiante
  await pool.query(
    'UPDATE student_qr_codes SET active = false WHERE student_id = $1 AND active = true',
    [student_id]
  );

  const result = await pool.query(
    `INSERT INTO student_qr_codes (student_id, qr_code, active, generation_date, generated_by, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, CURRENT_TIMESTAMP) RETURNING *`,
    [student_id, qr_code, active !== false, userId, userId]
  );
  return result.rows[0];
};

const updateStudentQrCode = async (id, data, userId) => {
  const { qr_code, active } = data;
  const result = await pool.query(
    `UPDATE student_qr_codes SET qr_code = $1, active = $2,
     user_id_modification = $3, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $4 RETURNING *`,
    [qr_code, active, userId, id]
  );
  return result.rows[0];
};

const deactivateStudentQrCode = async (id, userId) => {
  const result = await pool.query(
    `UPDATE student_qr_codes SET active = false,
     user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $2 RETURNING *`,
    [userId, id]
  );
  return result.rows[0];
};

const deleteStudentQrCode = async (id, userId) => {
  await pool.query(
    'UPDATE student_qr_codes SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactive', userId, id]
  );
  return true;
};

module.exports = {
  getAllStudentQrCodes,
  getStudentQrCodeById,
  getStudentQrCodeByCode,
  getActiveQrCodeByStudent,
  createStudentQrCode,
  updateStudentQrCode,
  deactivateStudentQrCode,
  deleteStudentQrCode,
  findStudentByDni,
  findStudentByDniOrBarcode, // Alias para compatibilidad
  createBulkQrCodes,
  getStudentsWithQrCodes
};
