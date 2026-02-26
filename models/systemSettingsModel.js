const pool = require('../config/db');

const getAllSystemSettings = async (filters = {}) => {
  let query = `
    SELECT ss.*, u.first_name AS usuario_nombre
    FROM system_settings ss
    LEFT JOIN users u ON ss.user_id_modification = u.id
    WHERE ss.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.key) {
    query += ` AND ss.key = $${paramCount}`;
    params.push(filters.key);
    paramCount++;
  }

  query += ' ORDER BY ss.key';
  const result = await pool.query(query, params);
  return result.rows;
};

const getSystemSettingById = async (id) => {
  const query = 'SELECT * FROM system_settings WHERE id = $1 AND status = $2';
  const result = await pool.query(query, [id, 'active']);
  return result.rows[0] || null;
};

const getSettingByKey = async (key) => {
  const query = 'SELECT * FROM system_settings WHERE key = $1 AND status = $2';
  const result = await pool.query(query, [key, 'active']);
  return result.rows[0] || null;
};

const getSettingsByCategory = async (category) => {
  // Esta tabla no tiene categoria, retornar todos
  const query = `
    SELECT * FROM system_settings
    WHERE status = 'active'
    ORDER BY key
  `;
  const result = await pool.query(query);
  return result.rows;
};

const createSystemSetting = async (data, userId) => {
  const { key, value } = data;
  const result = await pool.query(
    `INSERT INTO system_settings (key, value, status, user_id_registration, date_time_registration)
     VALUES ($1, $2, 'active', $3, CURRENT_TIMESTAMP) RETURNING *`,
    [key, JSON.stringify(value), userId]
  );
  return result.rows[0];
};

const updateSystemSetting = async (id, data, userId) => {
  const { value } = data;
  const result = await pool.query(
    `UPDATE system_settings SET value = $1,
     user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $3 RETURNING *`,
    [JSON.stringify(value), userId, id]
  );
  return result.rows[0];
};

const updateSettingByKey = async (key, value, userId) => {
  const result = await pool.query(
    `UPDATE system_settings SET value = $1,
     user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP
     WHERE key = $3 RETURNING *`,
    [JSON.stringify(value), userId, key]
  );
  return result.rows[0];
};

/**
 * Crear o actualizar configuracion (upsert)
 */
const upsertSetting = async (key, value, userId) => {
  // Verificar si existe
  const existing = await getSettingByKey(key);

  if (existing) {
    return await updateSettingByKey(key, value, userId);
  } else {
    return await createSystemSetting({ key, value }, userId);
  }
};

const deleteSystemSetting = async (id, userId) => {
  await pool.query(
    'UPDATE system_settings SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactive', userId, id]
  );
  return true;
};

module.exports = { getAllSystemSettings, getSystemSettingById, getSettingByKey, getSettingsByCategory, createSystemSetting, updateSystemSetting, updateSettingByKey, upsertSetting, deleteSystemSetting };
