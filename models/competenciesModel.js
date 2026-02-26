const pool = require('../config/db');

const getAllCompetencies = async (filters = {}) => {
  let query = `
    SELECT c.*, aa.name AS area_nombre, aa.name AS area_codigo,
           u.first_name AS usuario_nombre
    FROM competencies c
    LEFT JOIN academic_areas aa ON c.academic_area_id = aa.id
    LEFT JOIN users u ON c.user_id_registration = u.id
    WHERE c.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.area_id) {
    query += ` AND c.academic_area_id = $${paramCount}`;
    params.push(filters.area_id);
    paramCount++;
  }

  if (filters.nivel_id) {
    query += ` AND c.level_id = $${paramCount}`;
    params.push(filters.nivel_id);
    paramCount++;
  }

  if (filters.grado_id) {
    query += ` AND c.grado_id = $${paramCount}`;
    params.push(filters.grado_id);
    paramCount++;
  }

  if (filters.codigo) {
    query += ` AND c.code = $${paramCount}`;
    params.push(filters.codigo);
    paramCount++;
  }

  query += ' ORDER BY c.order, c.name';
  const result = await pool.query(query, params);
  return result.rows;
};

const getCompetencyById = async (id) => {
  const query = `
    SELECT c.*, aa.name AS area_nombre, aa.name AS area_codigo
    FROM competencies c
    LEFT JOIN academic_areas aa ON c.academic_area_id = aa.id
    WHERE c.id = $1 AND c.status = 'active'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const getCompetenciesByArea = async (areaId) => {
  const query = `
    SELECT c.*, aa.name AS area_nombre
    FROM competencies c
    LEFT JOIN academic_areas aa ON c.academic_area_id = aa.id
    WHERE c.academic_area_id = $1 AND c.status = 'active'
    ORDER BY c.order, c.name
  `;
  const result = await pool.query(query, [areaId]);
  return result.rows;
};

const createCompetency = async (data, userId) => {
  const { nombre, codigo, descripcion, area_id, nivel_id, grado_id, orden } = data;
  const result = await pool.query(
    `INSERT INTO competencies (name, code, description, academic_area_id, level_id, "order", user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP) RETURNING *`,
    [nombre, codigo, descripcion, area_id, nivel_id, orden, userId]
  );
  return result.rows[0];
};

const updateCompetency = async (id, data, userId) => {
  const { nombre, codigo, descripcion, area_id, nivel_id, grado_id, orden } = data;
  const result = await pool.query(
    `UPDATE competencies SET name = $1, code = $2, description = $3, academic_area_id = $4, level_id = $5, "order" = $6,
     user_id_modification = $7, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $8 RETURNING *`,
    [nombre, codigo, descripcion, area_id, nivel_id, orden, userId, id]
  );
  return result.rows[0];
};

const deleteCompetency = async (id, userId) => {
  await pool.query(
    'UPDATE competencies SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactive', userId, id]
  );
  return true;
};

module.exports = { getAllCompetencies, getCompetencyById, getCompetenciesByArea, createCompetency, updateCompetency, deleteCompetency };
