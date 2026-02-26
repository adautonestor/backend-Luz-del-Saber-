const pool = require('../config/db');

const getAllPaymentConcepts = async (filters = {}) => {
  let query = `
    SELECT pc.*, ay.name AS academic_year_name
    FROM payment_concepts pc
    LEFT JOIN academic_years ay ON pc.academic_year_id = ay.id
    WHERE pc.status != 'deleted'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.type) {
    query += ` AND pc.type = $${paramCount}`;
    params.push(filters.type);
    paramCount++;
  }

  if (filters.academic_year_id) {
    query += ` AND pc.academic_year_id = $${paramCount}`;
    params.push(filters.academic_year_id);
    paramCount++;
  }

  if (filters.status) {
    query += ` AND pc.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }

  query += ' ORDER BY pc.name';
  const result = await pool.query(query, params);

  // Parsear campos JSONB si vienen como strings
  return result.rows.map(row => ({
    ...row,
    levels: typeof row.levels === 'string' ? JSON.parse(row.levels) : row.levels,
    applicable_months: typeof row.applicable_months === 'string' ? JSON.parse(row.applicable_months) : row.applicable_months,
    specific_students: typeof row.specific_students === 'string' ? JSON.parse(row.specific_students) : row.specific_students,
    excluded_students: typeof row.excluded_students === 'string' ? JSON.parse(row.excluded_students) : row.excluded_students
  }));
};

const getPaymentConceptById = async (id) => {
  const query = `
    SELECT pc.*, ay.name AS academic_year_name
    FROM payment_concepts pc
    LEFT JOIN academic_years ay ON pc.academic_year_id = ay.id
    WHERE pc.id = $1
  `;
  const result = await pool.query(query, [id]);
  const row = result.rows[0];

  if (!row) return null;

  // Parsear campos JSONB si vienen como strings
  return {
    ...row,
    levels: typeof row.levels === 'string' ? JSON.parse(row.levels) : row.levels,
    applicable_months: typeof row.applicable_months === 'string' ? JSON.parse(row.applicable_months) : row.applicable_months,
    specific_students: typeof row.specific_students === 'string' ? JSON.parse(row.specific_students) : row.specific_students,
    excluded_students: typeof row.excluded_students === 'string' ? JSON.parse(row.excluded_students) : row.excluded_students
  };
};

const createPaymentConcept = async (data, userId) => {
  const { name, description, type, amount, frequency, due_day, applies_to_all, levels, applicable_months, specific_students, excluded_students, status, academic_year_id, unique_payment_date } = data;
  const result = await pool.query(
    `INSERT INTO payment_concepts (name, description, type, amount, frequency, due_day, applies_to_all, levels, applicable_months, specific_students, excluded_students, status, academic_year_id, unique_payment_date, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP) RETURNING *`,
    [name, description, type, amount, frequency, due_day, applies_to_all !== false, levels ? JSON.stringify(levels) : null, applicable_months ? JSON.stringify(applicable_months) : null, specific_students ? JSON.stringify(specific_students) : null, excluded_students ? JSON.stringify(excluded_students) : null, status || 'active', academic_year_id, unique_payment_date || null, userId]
  );

  const row = result.rows[0];
  // Parsear campos JSONB si vienen como strings
  return {
    ...row,
    levels: typeof row.levels === 'string' ? JSON.parse(row.levels) : row.levels,
    applicable_months: typeof row.applicable_months === 'string' ? JSON.parse(row.applicable_months) : row.applicable_months,
    specific_students: typeof row.specific_students === 'string' ? JSON.parse(row.specific_students) : row.specific_students,
    excluded_students: typeof row.excluded_students === 'string' ? JSON.parse(row.excluded_students) : row.excluded_students
  };
};

const updatePaymentConcept = async (id, data, userId) => {
  const { name, description, type, amount, frequency, due_day, applies_to_all, levels, applicable_months, specific_students, excluded_students, status, unique_payment_date } = data;
  const result = await pool.query(
    `UPDATE payment_concepts SET name = $1, description = $2, type = $3, amount = $4, frequency = $5, due_day = $6, applies_to_all = $7, levels = $8, applicable_months = $9, specific_students = $10, excluded_students = $11, status = $12, unique_payment_date = $13,
     user_id_modification = $14, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $15 RETURNING *`,
    [name, description, type, amount, frequency, due_day, applies_to_all, levels ? JSON.stringify(levels) : null, applicable_months ? JSON.stringify(applicable_months) : null, specific_students ? JSON.stringify(specific_students) : null, excluded_students ? JSON.stringify(excluded_students) : null, status, unique_payment_date || null, userId, id]
  );

  const row = result.rows[0];
  // Parsear campos JSONB si vienen como strings
  return {
    ...row,
    levels: typeof row.levels === 'string' ? JSON.parse(row.levels) : row.levels,
    applicable_months: typeof row.applicable_months === 'string' ? JSON.parse(row.applicable_months) : row.applicable_months,
    specific_students: typeof row.specific_students === 'string' ? JSON.parse(row.specific_students) : row.specific_students,
    excluded_students: typeof row.excluded_students === 'string' ? JSON.parse(row.excluded_students) : row.excluded_students
  };
};

const deletePaymentConcept = async (id, userId) => {
  await pool.query(
    'UPDATE payment_concepts SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['deleted', userId, id]
  );
  return true;
};

module.exports = { getAllPaymentConcepts, getPaymentConceptById, createPaymentConcept, updatePaymentConcept, deletePaymentConcept };
