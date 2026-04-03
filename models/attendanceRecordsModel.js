const pool = require('../config/db');
const { getLimaComponents, getTodayLima } = require('../utils/dateTime');
const { determineEntryStatus, determineExitStatus } = require('../services/attendanceStatusService');

const getAllAttendanceRecords = async (filters = {}) => {
  let query = `
    SELECT ar.*,
           s.first_names AS student_first_names,
           s.last_names AS student_last_names,
           s.paternal_last_name AS student_paternal_last_name,
           s.maternal_last_name AS student_maternal_last_name,
           s.code AS student_code,
           s.dni,
           s.level_id,
           s.grade_id,
           s.section_id,
           l.name AS level_name,
           g.name AS grade_name,
           sec.name AS section_name,
           u1.first_name AS registrado_entrada1_nombre,
           u2.first_name AS registrado_salida1_nombre
    FROM attendance_records ar
    INNER JOIN students s ON ar.student_id = s.id
    LEFT JOIN levels l ON s.level_id = l.id
    LEFT JOIN grades g ON s.grade_id = g.id
    LEFT JOIN sections sec ON s.section_id = sec.id
    LEFT JOIN users u1 ON ar.registered_by_entry1 = u1.id
    LEFT JOIN users u2 ON ar.registered_by_exit1 = u2.id
    WHERE ar.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.student_id) {
    query += ` AND ar.student_id = $${paramCount}`;
    params.push(filters.student_id);
    paramCount++;
  }

  if (filters.date) {
    query += ` AND ar.date = $${paramCount}`;
    params.push(filters.date);
    paramCount++;
  }

  if (filters.start_date && filters.end_date) {
    query += ` AND ar.date BETWEEN $${paramCount} AND $${paramCount + 1}`;
    params.push(filters.start_date, filters.end_date);
    paramCount += 2;
  }

  query += ' ORDER BY ar.date DESC, ar.student_id';
  const result = await pool.query(query, params);
  return result.rows;
};

const getAttendanceRecordById = async (id) => {
  const query = `
    SELECT ar.*, s.first_names AS student_first_names, s.last_names AS student_last_names
    FROM attendance_records ar
    INNER JOIN students s ON ar.student_id = s.id
    WHERE ar.id = $1 AND ar.status = 'active'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const getAttendanceByStudentAndDate = async (studentId, date) => {
  const query = `
    SELECT * FROM attendance_records
    WHERE student_id = $1 AND date = $2 AND status = 'active'
  `;
  const result = await pool.query(query, [studentId, date]);
  return result.rows[0] || null;
};

const createAttendanceRecord = async (data, userId) => {
  const { student_id, date, entry_time1, entry_status1, observations, registration_type, quarter } = data;
  // Usar timestamp real para almacenar (PostgreSQL TIMESTAMPTZ guarda en UTC)
  const entryTime = entry_time1 || new Date();
  const result = await pool.query(
    `INSERT INTO attendance_records (student_id, date, entry_time1, entry_status1, registered_by_entry1, observations, registration_type, quarter, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP) RETURNING *`,
    [student_id, date, entryTime, entry_status1 || 'presente', userId, observations, registration_type || 'qr', quarter || null, userId]
  );
  return result.rows[0];
};

const updateAttendanceRecord = async (id, data, userId) => {
  const {
    exit_time1, exit_status1, entry_time2, entry_status2, exit_time2, exit_status2,
    observations, late_justified, late_justification, quarter, absence_justified
  } = data;
  const result = await pool.query(
    `UPDATE attendance_records SET
     exit_time1 = COALESCE($1, exit_time1),
     exit_status1 = COALESCE($2, exit_status1),
     registered_by_exit1 = COALESCE($3, registered_by_exit1),
     entry_time2 = COALESCE($4, entry_time2),
     entry_status2 = COALESCE($5, entry_status2),
     exit_time2 = COALESCE($6, exit_time2),
     exit_status2 = COALESCE($7, exit_status2),
     observations = COALESCE($8, observations),
     late_justified = COALESCE($9, late_justified),
     late_justification = COALESCE($10, late_justification),
     quarter = COALESCE($11, quarter),
     absence_justified = COALESCE($12, absence_justified),
     user_id_modification = $13,
     date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $14 RETURNING *`,
    [exit_time1, exit_status1, userId, entry_time2, entry_status2, exit_time2, exit_status2,
     observations, late_justified, late_justification, quarter, absence_justified, userId, id]
  );
  return result.rows[0];
};

const registerEntry = async (studentId, date, userId, levelId = null) => {
  // Verificar si ya existe registro para hoy
  const existing = await getAttendanceByStudentAndDate(studentId, date);
  // Usar timestamp real para almacenar
  const currentTime = new Date();

  if (existing) {
    // Si ya existe, actualizar entrada2 si corresponde
    if (!existing.entry_time2) {
      // Determinar estado de entrada2 usando horario configurado
      const entryStatus = levelId
        ? await determineEntryStatus(levelId, currentTime, 2)
        : 'a_tiempo';

      const result = await pool.query(
        `UPDATE attendance_records SET entry_time2 = $1, entry_status2 = $2, registered_by_entry2 = $3,
         user_id_modification = $4, date_time_modification = CURRENT_TIMESTAMP
         WHERE id = $5 RETURNING *`,
        [currentTime, entryStatus, userId, userId, existing.id]
      );
      return result.rows[0];
    }
    return existing;
  }

  // Determinar estado de entrada1 usando horario configurado
  const entryStatus = levelId
    ? await determineEntryStatus(levelId, currentTime, 1)
    : 'a_tiempo';

  // Crear nuevo registro
  return await createAttendanceRecord({
    student_id: studentId,
    date,
    entry_time1: currentTime,
    entry_status1: entryStatus,
    registration_type: 'qr'
  }, userId);
};

const registerExit = async (studentId, date, userId, levelId = null) => {
  const existing = await getAttendanceByStudentAndDate(studentId, date);

  if (!existing) {
    throw new Error('No hay registro de entrada para hoy');
  }

  // Usar timestamp real para almacenar
  const currentTime = new Date();

  // Registrar salida1 o salida2 según corresponda
  if (!existing.exit_time1) {
    // Determinar estado de salida1 usando horario configurado
    const exitStatus = levelId
      ? await determineExitStatus(levelId, currentTime, 1)
      : 'a_tiempo';

    const result = await pool.query(
      `UPDATE attendance_records SET exit_time1 = $1, exit_status1 = $2, registered_by_exit1 = $3,
       user_id_modification = $4, date_time_modification = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [currentTime, exitStatus, userId, userId, existing.id]
    );
    return result.rows[0];
  } else if (existing.entry_time2 && !existing.exit_time2) {
    // Determinar estado de salida2 usando horario configurado
    const exitStatus = levelId
      ? await determineExitStatus(levelId, currentTime, 2)
      : 'a_tiempo';

    const result = await pool.query(
      `UPDATE attendance_records SET exit_time2 = $1, exit_status2 = $2, registered_by_exit2 = $3,
       user_id_modification = $4, date_time_modification = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [currentTime, exitStatus, userId, userId, existing.id]
    );
    return result.rows[0];
  }

  return existing;
};

const deleteAttendanceRecord = async (id, userId) => {
  await pool.query(
    'UPDATE attendance_records SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactive', userId, id]
  );
  return true;
};

module.exports = { getAllAttendanceRecords, getAttendanceRecordById, getAttendanceByStudentAndDate, createAttendanceRecord, updateAttendanceRecord, registerEntry, registerExit, deleteAttendanceRecord };
