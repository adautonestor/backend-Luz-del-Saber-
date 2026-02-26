const pool = require('../config/db');

const getAllPaymentMethods = async (filters = {}) => {
  let query = 'SELECT * FROM payment_methods WHERE 1=1';
  const params = [];

  if (filters.type) {
    params.push(filters.type);
    query += ` AND type = $${params.length}`;
  }

  if (filters.status) {
    params.push(filters.status);
    query += ` AND status = $${params.length}`;
  }

  query += ' ORDER BY type, name';
  const result = await pool.query(query, params);
  return result.rows;
};

const getPaymentMethodById = async (id) => {
  const result = await pool.query('SELECT * FROM payment_methods WHERE id = $1', [id]);
  return result.rows[0] || null;
};

const createPaymentMethod = async (data, userId) => {
  const { type, name, phone_number, qr_code, bank, account_number, cci, holder, instructions, status } = data;
  const result = await pool.query(
    `INSERT INTO payment_methods (type, name, phone_number, qr_code, bank, account_number, cci, holder, instructions, status, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP) RETURNING *`,
    [type, name, phone_number, qr_code, bank, account_number, cci, holder, instructions, status || 'active', userId]
  );
  return result.rows[0];
};

const updatePaymentMethod = async (id, data, userId) => {
  // Construir query dinamicamente solo con los campos enviados
  const allowedFields = ['type', 'name', 'phone_number', 'qr_code', 'bank', 'account_number', 'cci', 'holder', 'instructions', 'status'];
  const updates = [];
  const params = [];

  allowedFields.forEach(field => {
    if (data[field] !== undefined) {
      params.push(data[field]);
      updates.push(`${field} = $${params.length}`);
    }
  });

  if (updates.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  // Agregar campos de auditoria
  params.push(userId);
  updates.push(`user_id_modification = $${params.length}`);
  updates.push('date_time_modification = CURRENT_TIMESTAMP');

  params.push(id);
  const query = `UPDATE payment_methods SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`;

  const result = await pool.query(query, params);
  return result.rows[0];
};

const deletePaymentMethod = async (id, userId) => {
  // Eliminación física (DELETE real)
  await pool.query('DELETE FROM payment_methods WHERE id = $1', [id]);
  return true;
};

module.exports = { getAllPaymentMethods, getPaymentMethodById, createPaymentMethod, updatePaymentMethod, deletePaymentMethod };
