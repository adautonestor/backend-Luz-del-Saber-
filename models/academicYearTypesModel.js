const pool = require('../config/db');

/**
 * Obtener todos los tipos de año académico
 * @param {Object} filters - Filtros opcionales (status)
 * @returns {Promise<Array>} Lista de tipos
 */
const getAllAcademicYearTypes = async (filters = {}) => {
  let query = 'SELECT * FROM academic_year_types WHERE 1=1';
  const params = [];
  let paramCount = 1;

  if (filters.status) {
    query += ` AND status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  } else {
    query += ` AND status = 'active'`;
  }

  query += ' ORDER BY "order" ASC, name ASC';

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Obtener un tipo por ID
 * @param {number} id - ID del tipo
 * @returns {Promise<Object|null>} Tipo encontrado o null
 */
const getAcademicYearTypeById = async (id) => {
  const query = 'SELECT * FROM academic_year_types WHERE id = $1 AND status = $2';
  const result = await pool.query(query, [id, 'active']);
  return result.rows[0] || null;
};

/**
 * Obtener un tipo por código
 * @param {string} code - Código del tipo
 * @returns {Promise<Object|null>} Tipo encontrado o null
 */
const getAcademicYearTypeByCode = async (code) => {
  const query = 'SELECT * FROM academic_year_types WHERE code = $1 AND status = $2';
  const result = await pool.query(query, [code, 'active']);
  return result.rows[0] || null;
};

/**
 * Crear un nuevo tipo de año académico
 * @param {Object} data - Datos del tipo
 * @param {number} userId - ID del usuario que registra
 * @returns {Promise<Object>} Tipo creado
 */
const createAcademicYearType = async (data, userId) => {
  const { name, code, description, color, icon, order, status } = data;

  const query = `
    INSERT INTO academic_year_types (name, code, description, color, icon, "order", status, user_id_registration, date_time_registration)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
    RETURNING *
  `;

  const values = [
    name,
    code,
    description || null,
    color || '#3B82F6',
    icon || 'calendar',
    order || 0,
    status || 'active',
    userId
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Actualizar un tipo de año académico
 * @param {number} id - ID del tipo
 * @param {Object} data - Datos a actualizar
 * @param {number} userId - ID del usuario que modifica
 * @returns {Promise<Object>} Tipo actualizado
 */
const updateAcademicYearType = async (id, data, userId) => {
  const { name, code, description, color, icon, order, status } = data;

  const query = `
    UPDATE academic_year_types SET
      name = $1,
      code = $2,
      description = $3,
      color = $4,
      icon = $5,
      "order" = $6,
      status = $7,
      user_id_modification = $8,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $9
    RETURNING *
  `;

  const values = [name, code, description, color, icon, order, status, userId, id];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Eliminar un tipo de año académico (soft delete)
 * @param {number} id - ID del tipo
 * @param {number} userId - ID del usuario que elimina
 * @returns {Promise<boolean>} true si se eliminó
 */
const deleteAcademicYearType = async (id, userId) => {
  const query = `
    UPDATE academic_year_types SET
      status = 'deleted',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $2
  `;

  const result = await pool.query(query, [userId, id]);
  return result.rowCount > 0;
};

module.exports = {
  getAllAcademicYearTypes,
  getAcademicYearTypeById,
  getAcademicYearTypeByCode,
  createAcademicYearType,
  updateAcademicYearType,
  deleteAcademicYearType
};
