const pool = require('../config/db');

const getAllReadConfirmations = async (filters = {}) => {
  let query = `
    SELECT rc.*, c.title AS comunicacion_titulo, c.type AS comunicacion_tipo,
           CONCAT(u.first_name, ' ', u.last_names) AS usuario_nombre, u.email AS usuario_email
    FROM read_confirmations rc
    INNER JOIN communications c ON rc.communication_id = c.id
    INNER JOIN users u ON rc.user_id = u.id
    WHERE rc.status != 'inactive'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.communication_id) {
    query += ` AND rc.communication_id = $${paramCount}`;
    params.push(filters.communication_id);
    paramCount++;
  }

  if (filters.usuario_id) {
    query += ` AND rc.user_id = $${paramCount}`;
    params.push(filters.usuario_id);
    paramCount++;
  }

  if (filters.read !== undefined) {
    // Si read es true, filtrar los que tienen read_date, si es false los que no tienen
    if (filters.read) {
      query += ` AND rc.read_date IS NOT NULL`;
    } else {
      query += ` AND rc.read_date IS NULL`;
    }
  }

  query += ' ORDER BY rc.read_date DESC NULLS LAST, rc.date_time_registration DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getReadConfirmationById = async (id) => {
  const query = `
    SELECT rc.*, c.title AS comunicacion_titulo, c.type AS comunicacion_tipo,
           CONCAT(u.first_name, ' ', u.last_names) AS usuario_nombre, u.email AS usuario_email
    FROM read_confirmations rc
    INNER JOIN communications c ON rc.communication_id = c.id
    INNER JOIN users u ON rc.user_id = u.id
    WHERE rc.id = $1 AND rc.status != 'inactive'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const getConfirmationsByCommunication = async (comunicacionId) => {
  const query = `
    SELECT rc.*, CONCAT(u.first_name, ' ', u.last_names) AS usuario_nombre, u.email AS usuario_email
    FROM read_confirmations rc
    INNER JOIN users u ON rc.user_id = u.id
    WHERE rc.communication_id = $1 AND rc.status != 'inactive'
    ORDER BY rc.read_date DESC NULLS LAST, u.first_name, u.last_names
  `;
  const result = await pool.query(query, [comunicacionId]);
  return result.rows;
};

const getConfirmationsByUser = async (usuarioId) => {
  const query = `
    SELECT rc.*, c.title AS comunicacion_titulo, c.type AS comunicacion_tipo, c.send_date
    FROM read_confirmations rc
    INNER JOIN communications c ON rc.communication_id = c.id
    WHERE rc.user_id = $1 AND rc.status != 'inactive'
    ORDER BY c.send_date DESC
  `;
  const result = await pool.query(query, [usuarioId]);
  return result.rows;
};

const getConfirmation = async (comunicacionId, usuarioId) => {
  const query = `
    SELECT rc.*
    FROM read_confirmations rc
    WHERE rc.communication_id = $1 AND rc.user_id = $2 AND rc.status != 'inactive'
  `;
  const result = await pool.query(query, [comunicacionId, usuarioId]);
  return result.rows[0] || null;
};

const createReadConfirmation = async (data, userId) => {
  const { communication_id, comunicacion_id, usuario_id, read_date } = data;
  const commId = communication_id || comunicacion_id;
  const result = await pool.query(
    `INSERT INTO read_confirmations (communication_id, user_id, send_date, read_date, user_id_registration, date_time_registration)
     VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, CURRENT_TIMESTAMP) RETURNING *`,
    [commId, usuario_id, read_date || new Date(), userId]
  );
  return result.rows[0];
};

const markAsRead = async (comunicacionId, usuarioId) => {
  const existing = await getConfirmation(comunicacionId, usuarioId);

  if (existing) {
    const result = await pool.query(
      `UPDATE read_confirmations SET read_date = CURRENT_TIMESTAMP,
       date_time_modification = CURRENT_TIMESTAMP, user_id_modification = $3
       WHERE communication_id = $1 AND user_id = $2 RETURNING *`,
      [comunicacionId, usuarioId, usuarioId]
    );
    return result.rows[0];
  } else {
    const result = await pool.query(
      `INSERT INTO read_confirmations (communication_id, user_id, send_date, read_date, user_id_registration, date_time_registration)
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $2, CURRENT_TIMESTAMP) RETURNING *`,
      [comunicacionId, usuarioId]
    );
    return result.rows[0];
  }
};

const deleteReadConfirmation = async (id, userId) => {
  await pool.query(
    'UPDATE read_confirmations SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactive', userId, id]
  );
  return true;
};

module.exports = { getAllReadConfirmations, getReadConfirmationById, getConfirmationsByCommunication, getConfirmationsByUser, getConfirmation, createReadConfirmation, markAsRead, deleteReadConfirmation };
