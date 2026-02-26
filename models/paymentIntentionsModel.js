const pool = require('../config/db');

const getAllPaymentIntentions = async (filters = {}) => {
  let query = `
    SELECT pi.*, s.first_names AS student_first_names, s.last_names AS student_last_names,
           u.first_name AS parent_first_names, u.last_names AS parent_last_names,
           po.total_amount AS obligation_amount
    FROM payment_intentions pi
    INNER JOIN students s ON pi.student_id = s.id
    INNER JOIN users u ON pi.user_id = u.id
    INNER JOIN payment_obligations po ON pi.obligation_id = po.id
    WHERE pi.status != 'inactive'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.status) {
    query += ` AND pi.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }

  if (filters.student_id) {
    query += ` AND pi.student_id = $${paramCount}`;
    params.push(filters.student_id);
    paramCount++;
  }

  if (filters.parent_id || filters.user_id) {
    query += ` AND pi.user_id = $${paramCount}`;
    params.push(filters.parent_id || filters.user_id);
    paramCount++;
  }

  query += ' ORDER BY pi.registration_date DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getPaymentIntentionById = async (id) => {
  const query = `
    SELECT pi.*, s.first_names AS student_first_names, s.last_names AS student_last_names,
           u.first_name AS parent_first_names, u.last_names AS parent_last_names
    FROM payment_intentions pi
    INNER JOIN students s ON pi.student_id = s.id
    INNER JOIN users u ON pi.user_id = u.id
    WHERE pi.id = $1 AND pi.status != 'inactive'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const createPaymentIntention = async (data, userId) => {
  const { obligation_id, student_id, parent_id, user_id, amount, payment_method, operation_number, observations, voucher, payment_date, registration_date } = data;

  // Crear la intención de pago
  const result = await pool.query(
    `INSERT INTO payment_intentions (obligation_id, student_id, user_id, amount, payment_method, operation_number, observations, voucher, status, payment_date, registration_date, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP) RETURNING *`,
    [obligation_id, student_id, user_id || parent_id, amount, payment_method, operation_number, observations, voucher, 'pending', payment_date || new Date(), registration_date || new Date(), userId]
  );

  // Actualizar estado de la obligación a "en_verificacion"
  await pool.query(
    `UPDATE payment_obligations SET status = 'en_verificacion' WHERE id = $1`,
    [obligation_id]
  );

  return result.rows[0];
};

const updatePaymentIntention = async (id, data, userId) => {
  const { status, rejection_reason } = data;
  const result = await pool.query(
    `UPDATE payment_intentions SET status = $1, rejection_reason = $2,
     user_id_modification = $3, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $4 RETURNING *`,
    [status, rejection_reason, userId, id]
  );
  return result.rows[0];
};

const approvePaymentIntention = async (id, userId) => {
  // Obtener la intención para saber qué obligación actualizar
  const intentionResult = await pool.query(
    `SELECT * FROM payment_intentions WHERE id = $1`,
    [id]
  );
  const intention = intentionResult.rows[0];

  if (!intention) {
    throw new Error('Intención de pago no encontrada');
  }

  // Obtener datos de la obligación para crear el registro de pago
  const obligationResult = await pool.query(
    `SELECT * FROM payment_obligations WHERE id = $1`,
    [intention.obligation_id]
  );
  const obligation = obligationResult.rows[0];

  if (!obligation) {
    throw new Error('Obligación de pago no encontrada');
  }

  // Aprobar la intención
  const result = await pool.query(
    `UPDATE payment_intentions SET status = 'approved',
     user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $2 RETURNING *`,
    [userId, id]
  );

  // Actualizar la obligación a 'paid' (pagado)
  await pool.query(
    `UPDATE payment_obligations SET
       status = 'paid',
       paid_amount = total_amount,
       pending_balance = 0,
       last_payment_date = CURRENT_DATE
     WHERE id = $1`,
    [intention.obligation_id]
  );

  // Crear registro en payment_records para contabilizar el ingreso
  const paymentDetails = {
    intention_id: intention.id,
    payment_method: intention.payment_method,
    operation_number: intention.operation_number,
    payment_date: intention.payment_date,
    approved_by: userId,
    approved_at: new Date().toISOString()
  };

  await pool.query(
    `INSERT INTO payment_records
     (obligation_id, student_id, concept_id, total_amount, paid_amount, pending_balance, payments, status, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
    [
      intention.obligation_id,
      intention.student_id,
      obligation.concept_id,
      obligation.total_amount,
      intention.amount,
      0,
      JSON.stringify([paymentDetails]),
      'paid',
      userId
    ]
  );

  return result.rows[0];
};

const rejectPaymentIntention = async (id, reason, userId) => {
  // Obtener la intención para saber qué obligación actualizar
  const intentionResult = await pool.query(
    `SELECT * FROM payment_intentions WHERE id = $1`,
    [id]
  );
  const intention = intentionResult.rows[0];

  // Rechazar la intención
  const result = await pool.query(
    `UPDATE payment_intentions SET status = 'rejected', rejection_reason = $1,
     user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $3 RETURNING *`,
    [reason, userId, id]
  );

  // Volver la obligación a estado 'pending' (el frontend determinará si es vencido)
  if (intention) {
    await pool.query(
      `UPDATE payment_obligations SET status = 'pending' WHERE id = $1`,
      [intention.obligation_id]
    );
  }

  return result.rows[0];
};

module.exports = { getAllPaymentIntentions, getPaymentIntentionById, createPaymentIntention, updatePaymentIntention, approvePaymentIntention, rejectPaymentIntention };
