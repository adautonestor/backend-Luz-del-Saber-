const pool = require('../config/db');

const getAllCapacities = async (filters = {}) => {
  let query = `
    SELECT cap.*, comp.name AS competencia_nombre, comp.code AS competencia_codigo,
           u.first_name AS usuario_nombre
    FROM capacities cap
    LEFT JOIN competencies comp ON cap.competency_id = comp.id
    LEFT JOIN users u ON cap.user_id_registration = u.id
    WHERE cap.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.competencia_id) {
    query += ` AND cap.competency_id = $${paramCount}`;
    params.push(filters.competencia_id);
    paramCount++;
  }

  if (filters.codigo) {
    query += ` AND cap.code = $${paramCount}`;
    params.push(filters.codigo);
    paramCount++;
  }

  query += ' ORDER BY cap.order, cap.name';
  const result = await pool.query(query, params);
  return result.rows;
};

const getCapacityById = async (id) => {
  const query = `
    SELECT cap.*, comp.name AS competencia_nombre, comp.code AS competencia_codigo
    FROM capacities cap
    LEFT JOIN competencies comp ON cap.competency_id = comp.id
    WHERE cap.id = $1 AND cap.status = 'active'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const getCapacitiesByCompetency = async (competenciaId) => {
  const query = `
    SELECT cap.*, comp.name AS competencia_nombre
    FROM capacities cap
    LEFT JOIN competencies comp ON cap.competency_id = comp.id
    WHERE cap.competency_id = $1 AND cap.status = 'active'
    ORDER BY cap.order, cap.name
  `;
  const result = await pool.query(query, [competenciaId]);
  return result.rows;
};

const createCapacity = async (data, userId) => {
  const { nombre, codigo, descripcion, competencia_id, orden } = data;
  const result = await pool.query(
    `INSERT INTO capacities (name, code, description, competency_id, "order", user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) RETURNING *`,
    [nombre, codigo, descripcion, competencia_id, orden, userId]
  );
  return result.rows[0];
};

const updateCapacity = async (id, data, userId) => {
  const { nombre, codigo, descripcion, competencia_id, orden } = data;
  const result = await pool.query(
    `UPDATE capacities SET name = $1, code = $2, description = $3, competency_id = $4, "order" = $5,
     user_id_modification = $6, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $7 RETURNING *`,
    [nombre, codigo, descripcion, competencia_id, orden, userId, id]
  );
  return result.rows[0];
};

const deleteCapacity = async (id, userId) => {
  await pool.query(
    'UPDATE capacities SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactive', userId, id]
  );
  return true;
};

module.exports = { getAllCapacities, getCapacityById, getCapacitiesByCompetency, createCapacity, updateCapacity, deleteCapacity };
