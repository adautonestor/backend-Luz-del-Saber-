const pool = require('../config/db');

const getAllAuditLogs = async (filters = {}) => {
  let query = `
    SELECT al.*, u.nombre AS usuario_nombre, u.email AS usuario_email
    FROM audit_logs al
    LEFT JOIN users u ON al.usuario_id = u.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;

  if (filters.usuario_id) {
    query += ` AND al.usuario_id = $${paramCount}`;
    params.push(filters.usuario_id);
    paramCount++;
  }

  if (filters.tabla) {
    query += ` AND al.tabla = $${paramCount}`;
    params.push(filters.tabla);
    paramCount++;
  }

  if (filters.accion) {
    query += ` AND al.accion = $${paramCount}`;
    params.push(filters.accion);
    paramCount++;
  }

  if (filters.fecha_inicio) {
    query += ` AND al.fecha >= $${paramCount}`;
    params.push(filters.fecha_inicio);
    paramCount++;
  }

  if (filters.fecha_fin) {
    query += ` AND al.fecha <= $${paramCount}`;
    params.push(filters.fecha_fin);
    paramCount++;
  }

  query += ' ORDER BY al.fecha DESC LIMIT 1000'; // Limitar a 1000 registros recientes
  const result = await pool.query(query, params);
  return result.rows;
};

const getAuditLogById = async (id) => {
  const query = `
    SELECT al.*, u.nombre AS usuario_nombre, u.email AS usuario_email
    FROM audit_logs al
    LEFT JOIN users u ON al.usuario_id = u.id
    WHERE al.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const getLogsByUser = async (usuarioId, limit = 100) => {
  const query = `
    SELECT al.*
    FROM audit_logs al
    WHERE al.usuario_id = $1
    ORDER BY al.fecha DESC
    LIMIT $2
  `;
  const result = await pool.query(query, [usuarioId, limit]);
  return result.rows;
};

const getLogsByTable = async (tabla, registroId = null) => {
  let query = `
    SELECT al.*, u.nombre AS usuario_nombre
    FROM audit_logs al
    LEFT JOIN users u ON al.usuario_id = u.id
    WHERE al.tabla = $1
  `;
  const params = [tabla];

  if (registroId) {
    query += ' AND al.registro_id = $2';
    params.push(registroId);
  }

  query += ' ORDER BY al.fecha DESC LIMIT 500';
  const result = await pool.query(query, params);
  return result.rows;
};

const createAuditLog = async (data) => {
  const { usuario_id, tabla, registro_id, accion, datos_anteriores, datos_nuevos, ip_address, user_agent } = data;
  const result = await pool.query(
    `INSERT INTO audit_logs (usuario_id, tabla, registro_id, accion, datos_anteriores, datos_nuevos, ip_address, user_agent, fecha)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP) RETURNING *`,
    [usuario_id, tabla, registro_id, accion, datos_anteriores, datos_nuevos, ip_address, user_agent]
  );
  return result.rows[0];
};

module.exports = { getAllAuditLogs, getAuditLogById, getLogsByUser, getLogsByTable, createAuditLog };
