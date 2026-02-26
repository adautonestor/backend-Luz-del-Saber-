const pool = require('../config/db');

const getAllCalendarEvents = async (filters = {}) => {
  let query = `
    SELECT ac.*, ay.año AS academic_year, u.first_name AS usuario_nombre
    FROM academic_calendar ac
    LEFT JOIN academic_years ay ON ac.academic_year_id = ay.id
    LEFT JOIN users u ON ac.user_id_registration = u.id
    WHERE ac.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.academic_year_id) {
    query += ` AND ac.academic_year_id = $${paramCount}`;
    params.push(filters.academic_year_id);
    paramCount++;
  }

  if (filters.type) {
    query += ` AND ac.type = $${paramCount}`;
    params.push(filters.type);
    paramCount++;
  }

  if (filters.mes) {
    query += ` AND ac.mes = $${paramCount}`;
    params.push(filters.mes);
    paramCount++;
  }

  if (filters.start_date) {
    query += ` AND ac.start_date >= $${paramCount}`;
    params.push(filters.start_date);
    paramCount++;
  }

  if (filters.end_date) {
    query += ` AND ac.end_date <= $${paramCount}`;
    params.push(filters.end_date);
    paramCount++;
  }

  query += ' ORDER BY ac.start_date, ac.end_date';
  const result = await pool.query(query, params);
  return result.rows;
};

const getCalendarEventById = async (id) => {
  const query = `
    SELECT ac.*, ay.año AS academic_year
    FROM academic_calendar ac
    LEFT JOIN academic_years ay ON ac.academic_year_id = ay.id
    WHERE ac.id = $1 AND ac.status = 'active'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const getEventsByYear = async (añoEscolarId) => {
  const query = `
    SELECT ac.*
    FROM academic_calendar ac
    WHERE ac.academic_year_id = $1 AND ac.status = 'active'
    ORDER BY ac.start_date, ac.end_date
  `;
  const result = await pool.query(query, [añoEscolarId]);
  return result.rows;
};

const getEventsByDateRange = async (fechaInicio, fechaFin) => {
  const query = `
    SELECT ac.*, ay.año AS academic_year
    FROM academic_calendar ac
    LEFT JOIN academic_years ay ON ac.academic_year_id = ay.id
    WHERE ac.start_date >= $1 AND ac.end_date <= $2 AND ac.status = 'active'
    ORDER BY ac.start_date, ac.end_date
  `;
  const result = await pool.query(query, [fechaInicio, fechaFin]);
  return result.rows;
};

const createCalendarEvent = async (data, userId) => {
  const { title, descripcion, tipo, start_date, end_date, mes, academic_year_id, destinatarios, color } = data;
  const result = await pool.query(
    `INSERT INTO academic_calendar (title, descripcion, tipo, start_date, end_date, mes, academic_year_id, destinatarios, color, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP) RETURNING *`,
    [title, descripcion, tipo, start_date, end_date, mes, academic_year_id, destinatarios, color, userId]
  );
  return result.rows[0];
};

const updateCalendarEvent = async (id, data, userId) => {
  const { title, descripcion, tipo, start_date, end_date, destinatarios, color } = data;
  const result = await pool.query(
    `UPDATE academic_calendar SET title = $1, descripcion = $2, tipo = $3, start_date = $4, end_date = $5, destinatarios = $6, color = $7,
     user_id_modification = $8, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $9 RETURNING *`,
    [title, descripcion, tipo, start_date, end_date, destinatarios, color, userId, id]
  );
  return result.rows[0];
};

const deleteCalendarEvent = async (id, userId) => {
  await pool.query(
    'UPDATE academic_calendar SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactive', userId, id]
  );
  return true;
};

module.exports = { getAllCalendarEvents, getCalendarEventById, getEventsByYear, getEventsByDateRange, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent };
