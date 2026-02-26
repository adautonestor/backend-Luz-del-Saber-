const pool = require('../config/db');

const getAllCommunications = async (filters = {}) => {
  let query = `
    SELECT c.*,
           u.first_name AS remitente_nombre,
           u.last_names AS remitente_apellidos,
           COALESCE(stats.total_enviados, 0) AS total_enviados,
           COALESCE(stats.total_leidos, 0) AS total_leidos,
           COALESCE(stats.total_confirmados, 0) AS total_confirmados
    FROM communications c
    INNER JOIN users u ON c.sender = u.id
    LEFT JOIN (
      SELECT communication_id,
             COUNT(*) AS total_enviados,
             COUNT(CASE WHEN read_date IS NOT NULL THEN 1 END) AS total_leidos,
             COUNT(CASE WHEN confirmation_date IS NOT NULL THEN 1 END) AS total_confirmados
      FROM read_confirmations
      WHERE status != 'inactive'
      GROUP BY communication_id
    ) stats ON stats.communication_id = c.id
    WHERE c.status != 'deleted'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.type) {
    query += ` AND c.type = $${paramCount}`;
    params.push(filters.type);
    paramCount++;
  }

  if (filters.status) {
    query += ` AND c.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }

  if (filters.priority) {
    query += ` AND c.priority = $${paramCount}`;
    params.push(filters.priority);
    paramCount++;
  }

  query += ' ORDER BY c.send_date DESC';
  const result = await pool.query(query, params);

  // Mapear resultados para incluir estadísticas en formato esperado
  return result.rows.map(row => ({
    ...row,
    statistics: {
      totalEnviados: parseInt(row.total_enviados) || 0,
      totalLeidos: parseInt(row.total_leidos) || 0,
      totalConfirmados: parseInt(row.total_confirmados) || 0
    }
  }));
};

const getCommunicationById = async (id) => {
  const query = `
    SELECT c.*,
           u.first_name AS remitente_nombre,
           u.last_names AS remitente_apellidos,
           COALESCE(stats.total_enviados, 0) AS total_enviados,
           COALESCE(stats.total_leidos, 0) AS total_leidos,
           COALESCE(stats.total_confirmados, 0) AS total_confirmados
    FROM communications c
    INNER JOIN users u ON c.sender = u.id
    LEFT JOIN (
      SELECT communication_id,
             COUNT(*) AS total_enviados,
             COUNT(CASE WHEN read_date IS NOT NULL THEN 1 END) AS total_leidos,
             COUNT(CASE WHEN confirmation_date IS NOT NULL THEN 1 END) AS total_confirmados
      FROM read_confirmations
      WHERE status != 'inactive'
      GROUP BY communication_id
    ) stats ON stats.communication_id = c.id
    WHERE c.id = $1 AND c.status != 'deleted'
  `;
  const result = await pool.query(query, [id]);

  if (result.rows[0]) {
    const row = result.rows[0];
    return {
      ...row,
      statistics: {
        totalEnviados: parseInt(row.total_enviados) || 0,
        totalLeidos: parseInt(row.total_leidos) || 0,
        totalConfirmados: parseInt(row.total_confirmados) || 0
      }
    };
  }
  return null;
};

const createCommunication = async (data, userId) => {
  const { title, content, type, recipients, requires_confirmation, priority, send_date, scheduled_date, expiration_date, attachments, status } = data;

  // Para comunicados programados (status='scheduled'):
  // - Idealmente send_date sería NULL, pero la columna tiene restricción NOT NULL
  // - Usamos scheduled_date como send_date temporal (el scheduler lo actualizará)
  // Para otros estados, usar send_date proporcionado o NOW()
  let effectiveSendDate;
  if (status === 'scheduled' && scheduled_date) {
    // Usar la fecha programada como send_date temporal
    // El scheduler actualizará send_date cuando realmente se envíe
    effectiveSendDate = scheduled_date;
  } else {
    effectiveSendDate = send_date || new Date();
  }

  const result = await pool.query(
    `INSERT INTO communications (title, content, type, sender, recipients, requires_confirmation, priority, send_date, scheduled_date, expiration_date, attachments, status, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP) RETURNING *`,
    [title, content, type, userId, JSON.stringify(recipients), requires_confirmation || false, priority || 'medium', effectiveSendDate, scheduled_date, expiration_date, attachments ? JSON.stringify(attachments) : null, status || 'draft', userId]
  );
  return result.rows[0];
};

const updateCommunication = async (id, data, userId) => {
  const { title, content, type, recipients, requires_confirmation, priority, scheduled_date, expiration_date, attachments, status, attended } = data;
  const result = await pool.query(
    `UPDATE communications SET title = $1, content = $2, type = $3, recipients = $4, requires_confirmation = $5, priority = $6, scheduled_date = $7, expiration_date = $8, attachments = $9, status = $10, attended = $11,
     user_id_modification = $12, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $13 RETURNING *`,
    [title, content, type, JSON.stringify(recipients), requires_confirmation, priority, scheduled_date, expiration_date, attachments ? JSON.stringify(attachments) : null, status, attended, userId, id]
  );
  return result.rows[0];
};

const sendCommunication = async (id, userId) => {
  const result = await pool.query(
    `UPDATE communications SET status = 'sent', send_date = CURRENT_TIMESTAMP,
     user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $2 RETURNING *`,
    [userId, id]
  );
  return result.rows[0];
};

const deleteCommunication = async (id, userId) => {
  // Primero eliminar las confirmaciones de lectura asociadas
  await pool.query('DELETE FROM read_confirmations WHERE communication_id = $1', [id]);
  // Luego eliminar la comunicación físicamente
  await pool.query('DELETE FROM communications WHERE id = $1', [id]);
  return true;
};

/**
 * Obtener comunicados programados que deben enviarse
 * Busca comunicados con status='scheduled' y scheduled_date <= NOW()
 * @returns {Array} Lista de comunicados que deben enviarse
 */
const getScheduledCommunicationsToSend = async () => {
  const query = `
    SELECT * FROM communications
    WHERE status = 'scheduled'
    AND scheduled_date IS NOT NULL
    AND scheduled_date <= NOW()
    ORDER BY scheduled_date ASC
  `;
  const result = await pool.query(query);
  return result.rows;
};

/**
 * Enviar un comunicado programado (cambiar estado a 'sent')
 * @param {number} id - ID del comunicado
 * @returns {Object} Comunicado actualizado
 */
const sendScheduledCommunication = async (id) => {
  const result = await pool.query(
    `UPDATE communications
     SET status = 'sent',
         send_date = NOW(),
         date_time_modification = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return result.rows[0];
};

/**
 * Obtener IDs de usuarios destinatarios basándose en el JSON de recipients
 * @param {Object|Array} recipients - Destinatarios del comunicado
 * @returns {Array<number>} Array de IDs de usuarios
 */
const getRecipientUserIds = async (recipients) => {
  if (!recipients) return [];

  // Parsear si es string
  let parsed = recipients;
  if (typeof recipients === 'string') {
    try {
      parsed = JSON.parse(recipients);
    } catch (e) {
      return [];
    }
  }

  let query = '';
  const params = [];

  // Formato array legacy: ['todos'], ['profesores'], ['padres'], etc.
  if (Array.isArray(parsed)) {
    if (parsed.includes('todos')) {
      query = `SELECT id FROM users WHERE status = 'active'`;
    } else if (parsed.includes('profesores') && parsed.includes('padres')) {
      query = `SELECT u.id FROM users u
               INNER JOIN roles r ON u.role_id = r.id
               WHERE u.status = 'active' AND LOWER(r.name) IN ('profesor', 'docente', 'padre', 'apoderado')`;
    } else if (parsed.includes('profesores')) {
      query = `SELECT u.id FROM users u
               INNER JOIN roles r ON u.role_id = r.id
               WHERE u.status = 'active' AND LOWER(r.name) IN ('profesor', 'docente')`;
    } else if (parsed.includes('padres')) {
      query = `SELECT u.id FROM users u
               INNER JOIN roles r ON u.role_id = r.id
               WHERE u.status = 'active' AND LOWER(r.name) IN ('padre', 'apoderado')`;
    } else {
      return [];
    }
  }
  // Formato objeto nuevo: { type: 'todos' | 'profesores' | 'padres' | 'nivel' | 'grado' | 'seccion' | 'especifico', valores: [...] }
  else if (parsed.type) {
    switch (parsed.type) {
      case 'todos':
        query = `SELECT id FROM users WHERE status = 'active'`;
        break;
      case 'profesores':
        query = `SELECT u.id FROM users u
                 INNER JOIN roles r ON u.role_id = r.id
                 WHERE u.status = 'active' AND LOWER(r.name) IN ('profesor', 'docente')`;
        break;
      case 'padres':
        query = `SELECT u.id FROM users u
                 INNER JOIN roles r ON u.role_id = r.id
                 WHERE u.status = 'active' AND LOWER(r.name) IN ('padre', 'apoderado')`;
        break;
      case 'profesores_y_padres':
        query = `SELECT u.id FROM users u
                 INNER JOIN roles r ON u.role_id = r.id
                 WHERE u.status = 'active' AND LOWER(r.name) IN ('profesor', 'docente', 'padre', 'apoderado')`;
        break;
      case 'nivel':
        if (parsed.valores && parsed.valores.length > 0) {
          // Padres con hijos en el nivel especificado
          query = `SELECT DISTINCT sp.user_id AS id FROM student_parents sp
                   INNER JOIN students s ON sp.student_id = s.id
                   INNER JOIN matriculation m ON m.student_id = s.id
                   INNER JOIN sections sec ON m.section_id = sec.id
                   INNER JOIN grades g ON sec.grade_id = g.id
                   WHERE g.level_id = $1 AND m.status = 'active'`;
          params.push(parsed.valores[0]);
        }
        break;
      case 'grado':
        if (parsed.valores && parsed.valores.length > 0) {
          query = `SELECT DISTINCT sp.user_id AS id FROM student_parents sp
                   INNER JOIN students s ON sp.student_id = s.id
                   INNER JOIN matriculation m ON m.student_id = s.id
                   INNER JOIN sections sec ON m.section_id = sec.id
                   WHERE sec.grade_id = $1 AND m.status = 'active'`;
          params.push(parsed.valores[0]);
        }
        break;
      case 'seccion':
        if (parsed.valores && parsed.valores.length > 0) {
          query = `SELECT DISTINCT sp.user_id AS id FROM student_parents sp
                   INNER JOIN students s ON sp.student_id = s.id
                   INNER JOIN matriculation m ON m.student_id = s.id
                   WHERE m.section_id = $1 AND m.status = 'active'`;
          params.push(parsed.valores[0]);
        }
        break;
      case 'especifico':
        if (parsed.valores && parsed.valores.length > 0) {
          return parsed.valores.map(id => parseInt(id)).filter(id => !isNaN(id));
        }
        break;
      default:
        return [];
    }
  }

  if (!query) return [];

  try {
    const result = await pool.query(query, params);
    return result.rows.map(row => row.id);
  } catch (error) {
    console.error('Error obteniendo destinatarios:', error);
    return [];
  }
};

/**
 * Crear registros de confirmación de lectura para todos los destinatarios
 * @param {number} communicationId - ID del comunicado
 * @param {Array<number>} userIds - IDs de usuarios destinatarios
 * @param {number} userId - ID del usuario que crea los registros
 */
const createReadConfirmationsForRecipients = async (communicationId, userIds, userId) => {
  if (!userIds || userIds.length === 0) return;

  // Usar inserción en lote para mejor rendimiento
  const values = userIds.map((uid, index) => {
    const offset = index * 3;
    return `($${offset + 1}, $${offset + 2}, CURRENT_TIMESTAMP, $${offset + 3}, CURRENT_TIMESTAMP)`;
  }).join(', ');

  const params = userIds.flatMap(uid => [communicationId, uid, userId]);

  const query = `
    INSERT INTO read_confirmations (communication_id, user_id, send_date, user_id_registration, date_time_registration)
    VALUES ${values}
    ON CONFLICT DO NOTHING
  `;

  try {
    await pool.query(query, params);
    console.log(`✅ [COMMUNICATIONS] Creados ${userIds.length} registros de confirmación para comunicado ${communicationId}`);
  } catch (error) {
    console.error('Error creando confirmaciones de lectura:', error);
  }
};

module.exports = {
  getAllCommunications,
  getCommunicationById,
  createCommunication,
  updateCommunication,
  sendCommunication,
  deleteCommunication,
  getScheduledCommunicationsToSend,
  sendScheduledCommunication,
  getRecipientUserIds,
  createReadConfirmationsForRecipients
};
