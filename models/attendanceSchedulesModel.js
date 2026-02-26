const pool = require('../config/db');
// Re-exportar funciones del servicio centralizado para compatibilidad
const attendanceStatusService = require('../services/attendanceStatusService');

/**
 * Obtener todos los horarios de asistencia con información del nivel
 */
const getAllAttendanceSchedules = async (filters = {}) => {
  let query = `
    SELECT
      ats.*,
      l.name as level_name,
      l.code as level_code
    FROM attendance_schedules ats
    INNER JOIN levels l ON ats.level_id = l.id
    WHERE ats.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.level_id) {
    query += ` AND ats.level_id = $${paramCount}`;
    params.push(filters.level_id);
    paramCount++;
  }

  query += ' ORDER BY l.order, l.name';
  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Obtener horario por ID
 */
const getAttendanceScheduleById = async (id) => {
  const query = `
    SELECT
      ats.*,
      l.name as level_name,
      l.code as level_code
    FROM attendance_schedules ats
    INNER JOIN levels l ON ats.level_id = l.id
    WHERE ats.id = $1 AND ats.status = 'active'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

/**
 * Obtener horario por level_id
 * Con fallback cross-year: si no hay horario para el level_id exacto,
 * busca horario de cualquier nivel con el mismo código (e.g. INI, PRI, SEC)
 */
const getScheduleByLevelId = async (levelId) => {
  if (!levelId) return null;

  // 1. Búsqueda exacta por level_id
  const exactQuery = `
    SELECT ats.*, l.name as level_name, l.code as level_code
    FROM attendance_schedules ats
    INNER JOIN levels l ON ats.level_id = l.id
    WHERE ats.level_id = $1 AND ats.status = 'active'
    LIMIT 1
  `;
  const exactResult = await pool.query(exactQuery, [levelId]);
  if (exactResult.rows[0]) return exactResult.rows[0];

  // 2. Fallback: buscar por código de nivel equivalente
  const fallbackQuery = `
    SELECT ats.*, l_sched.name as level_name, l_sched.code as level_code
    FROM attendance_schedules ats
    INNER JOIN levels l_sched ON ats.level_id = l_sched.id
    WHERE l_sched.code = (SELECT code FROM levels WHERE id = $1)
      AND ats.status = 'active'
    ORDER BY ats.date_time_registration DESC
    LIMIT 1
  `;
  const fallbackResult = await pool.query(fallbackQuery, [levelId]);
  return fallbackResult.rows[0] || null;
};

/**
 * Crear horario de asistencia
 */
const createAttendanceSchedule = async (data, userId) => {
  const {
    level_id,
    entry1_start_time,
    entry1_limit_time,
    exit1_expected_time,
    entry2_start_time,
    entry2_limit_time,
    exit2_expected_time,
    tolerance_minutes,
    applicable_days
  } = data;

  const result = await pool.query(
    `INSERT INTO attendance_schedules
     (level_id, entry1_start_time, entry1_limit_time, exit1_expected_time,
      entry2_start_time, entry2_limit_time, exit2_expected_time,
      tolerance_minutes, applicable_days, status, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, CURRENT_TIMESTAMP)
     RETURNING *`,
    [level_id, entry1_start_time, entry1_limit_time, exit1_expected_time,
     entry2_start_time, entry2_limit_time, exit2_expected_time,
     tolerance_minutes, JSON.stringify(applicable_days || [1,2,3,4,5]), userId]
  );
  return result.rows[0];
};

/**
 * Actualizar horario de asistencia
 */
const updateAttendanceSchedule = async (id, data, userId) => {
  const {
    level_id,
    entry1_start_time,
    entry1_limit_time,
    exit1_expected_time,
    entry2_start_time,
    entry2_limit_time,
    exit2_expected_time,
    tolerance_minutes,
    applicable_days
  } = data;

  const result = await pool.query(
    `UPDATE attendance_schedules SET
     level_id = COALESCE($1, level_id),
     entry1_start_time = COALESCE($2, entry1_start_time),
     entry1_limit_time = COALESCE($3, entry1_limit_time),
     exit1_expected_time = COALESCE($4, exit1_expected_time),
     entry2_start_time = $5,
     entry2_limit_time = $6,
     exit2_expected_time = $7,
     tolerance_minutes = COALESCE($8, tolerance_minutes),
     applicable_days = COALESCE($9, applicable_days),
     user_id_modification = $10,
     date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $11 RETURNING *`,
    [level_id, entry1_start_time, entry1_limit_time, exit1_expected_time,
     entry2_start_time, entry2_limit_time, exit2_expected_time,
     tolerance_minutes, applicable_days ? JSON.stringify(applicable_days) : null, userId, id]
  );
  return result.rows[0];
};

/**
 * Crear o actualizar horario (upsert por level_id)
 */
const upsertAttendanceSchedule = async (data, userId) => {
  const {
    level_id,
    entry1_start_time,
    entry1_limit_time,
    exit1_expected_time,
    entry2_start_time,
    entry2_limit_time,
    exit2_expected_time,
    tolerance_minutes,
    applicable_days
  } = data;

  const daysJson = JSON.stringify(applicable_days || [1, 2, 3, 4, 5]);

  // Verificar si ya existe un horario para este nivel
  const existing = await pool.query(
    'SELECT id FROM attendance_schedules WHERE level_id = $1 AND status = $2 LIMIT 1',
    [level_id, 'active']
  );

  let result;
  if (existing.rows.length > 0) {
    // Actualizar existente
    result = await pool.query(
      `UPDATE attendance_schedules SET
        entry1_start_time = $1,
        entry1_limit_time = $2,
        exit1_expected_time = $3,
        entry2_start_time = $4,
        entry2_limit_time = $5,
        exit2_expected_time = $6,
        tolerance_minutes = $7,
        applicable_days = $8,
        user_id_modification = $9,
        date_time_modification = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [entry1_start_time, entry1_limit_time, exit1_expected_time,
       entry2_start_time, entry2_limit_time, exit2_expected_time,
       tolerance_minutes, daysJson, userId, existing.rows[0].id]
    );
  } else {
    // Crear nuevo
    result = await pool.query(
      `INSERT INTO attendance_schedules
       (level_id, entry1_start_time, entry1_limit_time, exit1_expected_time,
        entry2_start_time, entry2_limit_time, exit2_expected_time,
        tolerance_minutes, applicable_days, status, user_id_registration, date_time_registration)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, CURRENT_TIMESTAMP)
       RETURNING *`,
      [level_id, entry1_start_time, entry1_limit_time, exit1_expected_time,
       entry2_start_time, entry2_limit_time, exit2_expected_time,
       tolerance_minutes, daysJson, userId]
    );
  }

  return result.rows[0];
};

/**
 * Eliminar horario de asistencia (soft delete)
 */
const deleteAttendanceSchedule = async (id, userId) => {
  await pool.query(
    `UPDATE attendance_schedules SET status = 'inactive',
     user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [userId, id]
  );
  return true;
};

/**
 * @deprecated Usar attendanceStatusService.determineEntryStatus directamente
 * Esta función delega al servicio centralizado para compatibilidad
 */
const determineEntryStatus = async (levelId, entryTime, entryNumber = 1) => {
  return attendanceStatusService.determineEntryStatus(levelId, entryTime, entryNumber);
};

/**
 * @deprecated Usar attendanceStatusService.determineExitStatus directamente
 * Esta función delega al servicio centralizado para compatibilidad
 */
const determineExitStatus = async (levelId, exitTime, exitNumber = 1) => {
  return attendanceStatusService.determineExitStatus(levelId, exitTime, exitNumber);
};

/**
 * Verificar si hoy es día aplicable para registrar asistencia
 * Delega al servicio centralizado
 */
const canRegisterAttendanceToday = async (levelId) => {
  return attendanceStatusService.canRegisterAttendanceToday(levelId);
};

module.exports = {
  getAllAttendanceSchedules,
  getAttendanceScheduleById,
  getScheduleByLevelId,
  createAttendanceSchedule,
  updateAttendanceSchedule,
  upsertAttendanceSchedule,
  deleteAttendanceSchedule,
  // Funciones delegadas al servicio centralizado
  determineEntryStatus,
  determineExitStatus,
  canRegisterAttendanceToday,
  // Alias para compatibilidad
  getScheduleByLevel: getScheduleByLevelId
};
