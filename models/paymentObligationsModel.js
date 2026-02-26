const pool = require('../config/db');

const getAllPaymentObligations = async (filters = {}) => {
  let query = `
    SELECT po.*,
           po.status AS state,
           po.last_payment_date AS payment_date,
           (po.status = 'exonerado') AS exonerado,
           s.first_names AS student_first_names,
           s.last_names AS student_last_names,
           s.code AS student_code,
           l.name AS level_name,
           l.name AS nivel,
           pc.name AS concept_name,
           pc.name AS concepto,
           pc.type AS concept_type,
           CASE po.due_month
             WHEN 1 THEN 'Enero'
             WHEN 2 THEN 'Febrero'
             WHEN 3 THEN 'Marzo'
             WHEN 4 THEN 'Abril'
             WHEN 5 THEN 'Mayo'
             WHEN 6 THEN 'Junio'
             WHEN 7 THEN 'Julio'
             WHEN 8 THEN 'Agosto'
             WHEN 9 THEN 'Septiembre'
             WHEN 10 THEN 'Octubre'
             WHEN 11 THEN 'Noviembre'
             WHEN 12 THEN 'Diciembre'
             ELSE NULL
           END AS mes
    FROM payment_obligations po
    INNER JOIN students s ON po.student_id = s.id
    INNER JOIN payment_concepts pc ON po.concept_id = pc.id
    LEFT JOIN levels l ON s.level_id = l.id
    WHERE po.status != 'deleted'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.student_id) {
    query += ` AND po.student_id = $${paramCount}`;
    params.push(filters.student_id);
    paramCount++;
  }

  if (filters.status) {
    query += ` AND po.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }

  if (filters.academic_year) {
    query += ` AND po.academic_year = $${paramCount}`;
    params.push(filters.academic_year);
    paramCount++;
  }

  if (filters.due_month) {
    query += ` AND po.due_month = $${paramCount}`;
    params.push(filters.due_month);
    paramCount++;
  }

  query += ' ORDER BY po.due_date DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getPaymentObligationById = async (id) => {
  const query = `
    SELECT po.*,
           po.last_payment_date AS payment_date,
           (po.status = 'exonerado') AS exonerado,
           s.first_names AS student_first_names, s.last_names AS student_last_names,
           pc.name AS concept_name, pc.description AS concept_description
    FROM payment_obligations po
    INNER JOIN students s ON po.student_id = s.id
    INNER JOIN payment_concepts pc ON po.concept_id = pc.id
    WHERE po.id = $1 AND po.status != 'deleted'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const createPaymentObligation = async (data, userId) => {
  const { student_id, concept_id, academic_year, due_month, due_date, total_amount, paid_amount, pending_balance, status, generation_date } = data;
  const result = await pool.query(
    `INSERT INTO payment_obligations (student_id, concept_id, academic_year, due_month, due_date, total_amount, paid_amount, pending_balance, status, generation_date, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP) RETURNING *`,
    [student_id, concept_id, academic_year, due_month, due_date, total_amount, paid_amount || 0, pending_balance || total_amount, status || 'pending', generation_date || new Date(), userId]
  );
  return result.rows[0];
};

const updatePaymentObligation = async (id, data, userId) => {
  // Construir query dinámicamente solo con los campos proporcionados
  const updates = [];
  const params = [];
  let paramCount = 1;

  if (data.paid_amount !== undefined) {
    updates.push(`paid_amount = $${paramCount}`);
    params.push(data.paid_amount);
    paramCount++;
  }

  if (data.pending_balance !== undefined) {
    updates.push(`pending_balance = $${paramCount}`);
    params.push(data.pending_balance);
    paramCount++;
  }

  if (data.status !== undefined) {
    updates.push(`status = $${paramCount}`);
    params.push(data.status);
    paramCount++;
  }

  if (data.last_payment_date !== undefined) {
    updates.push(`last_payment_date = $${paramCount}`);
    params.push(data.last_payment_date);
    paramCount++;
  }

  if (data.alerts_sent !== undefined) {
    updates.push(`alerts_sent = $${paramCount}`);
    params.push(data.alerts_sent ? JSON.stringify(data.alerts_sent) : null);
    paramCount++;
  }

  // Nota: 'exonerado' no es una columna en la BD, se maneja con status = 'exonerado'

  // Siempre actualizar campos de auditoría
  updates.push(`user_id_modification = $${paramCount}`);
  params.push(userId);
  paramCount++;

  updates.push(`date_time_modification = CURRENT_TIMESTAMP`);

  // Agregar el ID al final
  params.push(id);

  const query = `UPDATE payment_obligations SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
  const result = await pool.query(query, params);
  return result.rows[0];
};

const deletePaymentObligation = async (id, userId) => {
  await pool.query(
    'UPDATE payment_obligations SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactive', userId, id]
  );
  return true;
};

const getObligationsByStudent = async (studentId, academicYear = null) => {
  let query = `
    SELECT po.*,
           po.last_payment_date AS payment_date,
           (po.status = 'exonerado') AS exonerado,
           pc.name AS concept_name, pc.type AS concept_type
    FROM payment_obligations po
    INNER JOIN payment_concepts pc ON po.concept_id = pc.id
    WHERE po.student_id = $1 AND po.status != 'deleted'
  `;
  const params = [studentId];

  if (academicYear) {
    query += ' AND po.academic_year = $2';
    params.push(academicYear);
  }

  query += ' ORDER BY po.due_date';
  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Crear múltiples obligaciones de manera eficiente
 * @param {Array} obligations - Array de obligaciones a crear
 * @param {number} userId - ID del usuario que registra
 * @returns {Promise<Array>} Obligaciones creadas
 */
const createBulkObligations = async (obligations, userId) => {
  if (!obligations || obligations.length === 0) {
    return [];
  }

  const client = await pool.connect();
  const createdObligations = [];

  try {
    await client.query('BEGIN');

    for (const obl of obligations) {
      const result = await client.query(
        `INSERT INTO payment_obligations (student_id, concept_id, academic_year, due_month, due_date, total_amount, paid_amount, pending_balance, generation_date, status, user_id_registration, date_time_registration)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP) RETURNING *`,
        [
          obl.student_id,
          obl.concept_id,
          obl.academic_year,
          obl.due_month,
          obl.due_date,
          obl.total_amount,
          obl.paid_amount || 0,
          obl.pending_balance || obl.total_amount,
          obl.generation_date || new Date(),
          obl.status || 'pending',
          userId
        ]
      );
      createdObligations.push(result.rows[0]);
    }

    await client.query('COMMIT');
    return createdObligations;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Verificar si existe una obligación específica
 * @param {number} studentId - ID del estudiante
 * @param {number} conceptId - ID del concepto
 * @param {number|null} dueMonth - Mes de vencimiento (null para únicos)
 * @returns {Promise<boolean>} true si existe
 */
const checkExistingObligation = async (studentId, conceptId, dueMonth) => {
  // Para pagos únicos (dueMonth = null), buscar exactamente donde due_month IS NULL
  // Para pagos mensuales, buscar donde due_month = dueMonth
  let query;
  let params;

  if (dueMonth === null || dueMonth === undefined) {
    query = `
      SELECT id FROM payment_obligations
      WHERE student_id = $1
        AND concept_id = $2
        AND due_month IS NULL
        AND status != 'deleted'
      LIMIT 1
    `;
    params = [studentId, conceptId];
  } else {
    query = `
      SELECT id FROM payment_obligations
      WHERE student_id = $1
        AND concept_id = $2
        AND due_month = $3
        AND status != 'deleted'
      LIMIT 1
    `;
    params = [studentId, conceptId, dueMonth];
  }

  const result = await pool.query(query, params);
  return result.rows.length > 0;
};

/**
 * Obtener obligaciones por concepto
 * @param {number} conceptId - ID del concepto
 * @returns {Promise<Array>} Lista de obligaciones
 */
const getObligationsByConcept = async (conceptId) => {
  const query = `
    SELECT po.*,
           po.last_payment_date AS payment_date,
           (po.status = 'exonerado') AS exonerado,
           s.first_names AS student_first_names,
           s.last_names AS student_last_names,
           s.code AS student_code
    FROM payment_obligations po
    INNER JOIN students s ON po.student_id = s.id
    WHERE po.concept_id = $1 AND po.status != 'deleted'
    ORDER BY s.last_names, s.first_names, po.due_date
  `;

  const result = await pool.query(query, [conceptId]);
  return result.rows;
};

module.exports = {
  getAllPaymentObligations,
  getPaymentObligationById,
  createPaymentObligation,
  updatePaymentObligation,
  deletePaymentObligation,
  getObligationsByStudent,
  createBulkObligations,
  checkExistingObligation,
  getObligationsByConcept
};
