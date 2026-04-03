const pool = require('../config/db');

const getAllPaymentRecords = async (filters = {}) => {
  let query = `
    SELECT pr.*, s.first_names AS student_first_names, s.last_names AS student_last_names,
           s.paternal_last_name AS student_paternal_last_name,
           s.maternal_last_name AS student_maternal_last_name,
           pc.name AS concept_name,
           u.first_name AS registered_by
    FROM payment_records pr
    INNER JOIN students s ON pr.student_id = s.id
    INNER JOIN payment_concepts pc ON pr.concept_id = pc.id
    LEFT JOIN users u ON pr.user_id_registration = u.id
    WHERE pr.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.student_id) {
    query += ` AND pr.student_id = $${paramCount}`;
    params.push(filters.student_id);
    paramCount++;
  }

  if (filters.concept_id) {
    query += ` AND pr.concept_id = $${paramCount}`;
    params.push(filters.concept_id);
    paramCount++;
  }

  if (filters.status) {
    query += ` AND pr.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }

  query += ' ORDER BY pr.date_time_registration DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getPaymentRecordById = async (id) => {
  const query = `
    SELECT pr.*, s.first_names AS student_first_names, s.last_names AS student_last_names,
           s.paternal_last_name AS student_paternal_last_name,
           s.maternal_last_name AS student_maternal_last_name,
           pc.name AS concept_name
    FROM payment_records pr
    INNER JOIN students s ON pr.student_id = s.id
    INNER JOIN payment_concepts pc ON pr.concept_id = pc.id
    WHERE pr.id = $1 AND pr.status = 'active'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const getRecordsByStudent = async (studentId, status = null) => {
  let query = `
    SELECT pr.*, pc.name AS concept_name
    FROM payment_records pr
    INNER JOIN payment_concepts pc ON pr.concept_id = pc.id
    WHERE pr.student_id = $1 AND pr.status = 'active'
  `;
  const params = [studentId];

  if (status) {
    query += ' AND pr.status = $2';
    params.push(status);
  }

  query += ' ORDER BY pr.date_time_registration DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const createPaymentRecord = async (data, userId) => {
  const { obligation_id, student_id, concept_id, total_amount, paid_amount, pending_balance, payments, status } = data;
  const result = await pool.query(
    `INSERT INTO payment_records (obligation_id, student_id, concept_id, total_amount, paid_amount, pending_balance, payments, status, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP) RETURNING *`,
    [obligation_id, student_id, concept_id, total_amount, paid_amount || 0, pending_balance || total_amount, payments ? JSON.stringify(payments) : null, status || 'paid', userId]
  );
  return result.rows[0];
};

const updatePaymentRecord = async (id, data, userId) => {
  const { total_amount, paid_amount, pending_balance, payments, status } = data;
  const result = await pool.query(
    `UPDATE payment_records SET total_amount = $1, paid_amount = $2, pending_balance = $3, payments = $4, status = $5,
     user_id_modification = $6, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $7 RETURNING *`,
    [total_amount, paid_amount, pending_balance, payments ? JSON.stringify(payments) : null, status, userId, id]
  );
  return result.rows[0];
};

const annulPaymentRecord = async (id, reason, userId) => {
  const result = await pool.query(
    `UPDATE payment_records SET status = 'annulled',
     user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $2 RETURNING *`,
    [userId, id]
  );
  return result.rows[0];
};

const deletePaymentRecord = async (id, userId) => {
  await pool.query(
    'UPDATE payment_records SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactive', userId, id]
  );
  return true;
};

module.exports = { getAllPaymentRecords, getPaymentRecordById, getRecordsByStudent, createPaymentRecord, updatePaymentRecord, annulPaymentRecord, deletePaymentRecord };
