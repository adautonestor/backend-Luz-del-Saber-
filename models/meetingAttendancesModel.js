const pool = require('../config/db');

const getAllMeetingAttendances = async (filters = {}) => {
  let query = `
    SELECT ma.*, pm.title AS reunion_titulo, u.first_name AS parent_first_names, u.last_names AS parent_last_names,
           s.first_names AS student_first_names, s.last_names AS student_last_names
    FROM meeting_attendances ma
    INNER JOIN parent_meetings pm ON ma.meeting_id = pm.id
    INNER JOIN users u ON ma.user_id = u.id
    LEFT JOIN students s ON ma.student_id = s.id
    WHERE ma.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.reunion_id) {
    query += ` AND ma.meeting_id = $${paramCount}`;
    params.push(filters.reunion_id);
    paramCount++;
  }

  if (filters.parent_id || filters.user_id) {
    query += ` AND ma.user_id = $${paramCount}`;
    params.push(filters.parent_id || filters.user_id);
    paramCount++;
  }

  if (filters.student_id) {
    query += ` AND ma.student_id = $${paramCount}`;
    params.push(filters.student_id);
    paramCount++;
  }

  if (filters.attended !== undefined) {
    query += ` AND ma.attended = $${paramCount}`;
    params.push(filters.attended);
    paramCount++;
  }

  query += ' ORDER BY ma.date_time_registration DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getMeetingAttendanceById = async (id) => {
  const query = `
    SELECT ma.*, pm.title AS reunion_titulo, pm.date AS fecha_reunion,
           u.first_name AS parent_first_names, u.last_names AS parent_last_names,
           s.first_names AS student_first_names, s.last_names AS student_last_names
    FROM meeting_attendances ma
    INNER JOIN parent_meetings pm ON ma.meeting_id = pm.id
    INNER JOIN users u ON ma.user_id = u.id
    LEFT JOIN students s ON ma.student_id = s.id
    WHERE ma.id = $1 AND ma.status = 'active'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const getAttendancesByMeeting = async (reunionId) => {
  const query = `
    SELECT ma.*, u.first_name AS parent_first_names, u.last_names AS parent_last_names,
           s.first_names AS student_first_names, s.last_names AS student_last_names
    FROM meeting_attendances ma
    INNER JOIN users u ON ma.user_id = u.id
    LEFT JOIN students s ON ma.student_id = s.id
    WHERE ma.meeting_id = $1 AND ma.status = 'active'
    ORDER BY u.last_names, u.first_name
  `;
  const result = await pool.query(query, [reunionId]);
  return result.rows;
};

const getAttendancesByParent = async (padreId) => {
  const query = `
    SELECT ma.*, pm.title AS reunion_titulo, pm.date AS fecha_reunion,
           s.first_names AS student_first_names, s.last_names AS student_last_names
    FROM meeting_attendances ma
    INNER JOIN parent_meetings pm ON ma.meeting_id = pm.id
    LEFT JOIN students s ON ma.student_id = s.id
    WHERE ma.user_id = $1 AND ma.status = 'active'
    ORDER BY pm.date DESC
  `;
  const result = await pool.query(query, [padreId]);
  return result.rows;
};

const createMeetingAttendance = async (data, userId) => {
  const { reunion_id, meeting_id, parent_id, user_id, student_id, attended, hora_llegada, observations, registered_by } = data;
  const result = await pool.query(
    `INSERT INTO meeting_attendances (meeting_id, user_id, student_id, attended, observations, registered_by, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP) RETURNING *`,
    [meeting_id || reunion_id, user_id || parent_id, student_id, attended !== false, observations, registered_by || userId, userId]
  );
  return result.rows[0];
};

const updateMeetingAttendance = async (id, data, userId) => {
  const { attended, hora_llegada, observations } = data;
  const result = await pool.query(
    `UPDATE meeting_attendances SET attended = $1, hora_llegada = $2, observations = $3,
     user_id_modification = $4, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $5 RETURNING *`,
    [attended, hora_llegada, observations, userId, id]
  );
  return result.rows[0];
};

const deleteMeetingAttendance = async (id, userId) => {
  await pool.query(
    'UPDATE meeting_attendances SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactive', userId, id]
  );
  return true;
};

module.exports = { getAllMeetingAttendances, getMeetingAttendanceById, getAttendancesByMeeting, getAttendancesByParent, createMeetingAttendance, updateMeetingAttendance, deleteMeetingAttendance };
