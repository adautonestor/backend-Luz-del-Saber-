const pool = require('../config/db');

/**
 * Obtener todos los años escolares
 * @param {Object} filters - Filtros opcionales (status, year)
 * @returns {Promise<Array>} Lista de años escolares
 */
const getAllAcademicYears = async (filters = {}) => {
  let query = `
    SELECT * FROM academic_years
    WHERE status != 'inactive'
  `;

  const params = [];
  let paramCount = 1;

  if (filters.status) {
    query += ` AND status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }

  if (filters.year) {
    query += ` AND year = $${paramCount}`;
    params.push(filters.year);
    paramCount++;
  }

  query += ` ORDER BY year DESC, start_date DESC`;

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Obtener un año escolar por ID
 * @param {number} id - ID del año escolar
 * @returns {Promise<Object|null>} Año escolar encontrado o null
 */
const getAcademicYearById = async (id) => {
  const query = `
    SELECT * FROM academic_years
    WHERE id = $1 AND status != 'inactive'
  `;

  const result = await pool.query(query, [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Obtener año escolar activo actual
 * @returns {Promise<Object|null>} Año escolar activo o null
 */
const getCurrentAcademicYear = async () => {
  const query = `
    SELECT * FROM academic_years
    WHERE status = 'active'
    ORDER BY start_date DESC
    LIMIT 1
  `;

  const result = await pool.query(query);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Crear un nuevo año escolar
 * IMPORTANTE: Si el status es 'active', automáticamente desactiva todos los demás años activos
 * @param {Object} yearData - Datos del año escolar
 * @param {number} userId - ID del usuario que registra
 * @returns {Promise<Object>} Año escolar creado
 */
const createAcademicYear = async (yearData, userId) => {
  const {
    name,
    year,
    year_code,
    type,
    start_date,
    end_date,
    description,
    status,
    copy_structure,
    file
  } = yearData;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // CRÍTICO: Si se está creando con status 'active', primero desactivar todos los años activos
    if (status === 'active') {
      await client.query(`
        UPDATE academic_years
        SET status = 'closed',
            user_id_modification = $1,
            date_time_modification = CURRENT_TIMESTAMP
        WHERE status = 'active'
      `, [userId]);
      console.log('⚠️ Se desactivaron todos los años activos antes de crear el nuevo año activo');
    }

    const query = `
      INSERT INTO academic_years (
        name, year, year_code, type, start_date, end_date,
        description, status, copy_structure, file,
        user_id_registration, date_time_registration
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP
      ) RETURNING *
    `;

    const values = [
      name,
      year,
      year_code || null,
      type || 'regular',
      start_date,
      end_date,
      description || null,
      status || 'planned',
      copy_structure || false,
      file ? JSON.stringify(file) : null,
      userId
    ];

    const result = await client.query(query, values);

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Actualizar un año escolar
 * IMPORTANTE: Si el status cambia a 'active', automáticamente desactiva todos los demás años activos
 * @param {number} id - ID del año escolar
 * @param {Object} yearData - Datos a actualizar
 * @param {number} userId - ID del usuario que modifica
 * @returns {Promise<Object>} Año escolar actualizado
 */
const updateAcademicYear = async (id, yearData, userId) => {
  const {
    name,
    year,
    year_code,
    type,
    start_date,
    end_date,
    description,
    status,
    copy_structure,
    file
  } = yearData;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // CRÍTICO: Si se está actualizando a status 'active', primero desactivar todos los demás años activos
    if (status === 'active') {
      await client.query(`
        UPDATE academic_years
        SET status = 'closed',
            user_id_modification = $1,
            date_time_modification = CURRENT_TIMESTAMP
        WHERE status = 'active' AND id != $2
      `, [userId, id]);
      console.log('⚠️ Se desactivaron todos los años activos antes de activar el año ID ' + id);
    }

    const query = `
      UPDATE academic_years SET
        name = $1,
        year = $2,
        year_code = $3,
        type = $4,
        start_date = $5,
        end_date = $6,
        description = $7,
        status = $8,
        copy_structure = $9,
        file = $10,
        user_id_modification = $11,
        date_time_modification = CURRENT_TIMESTAMP
      WHERE id = $12 AND status != 'inactive'
      RETURNING *
    `;

    const values = [
      name,
      year,
      year_code || null,
      type || 'regular',
      start_date,
      end_date,
      description || null,
      status || 'planned',
      copy_structure || false,
      file ? JSON.stringify(file) : null,
      userId,
      id
    ];

    const result = await client.query(query, values);

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Activar un año escolar (desactiva automáticamente otros años activos)
 * @param {number} id - ID del año escolar a activar
 * @param {number} userId - ID del usuario que activa
 * @returns {Promise<Object>} Año escolar activado
 */
const activateAcademicYear = async (id, userId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Desactivar todos los años activos actuales
    await client.query(`
      UPDATE academic_years
      SET status = 'closed',
          user_id_modification = $1,
          date_time_modification = CURRENT_TIMESTAMP
      WHERE status = 'active' AND id != $2
    `, [userId, id]);

    // 2. Activar el año seleccionado
    const result = await client.query(`
      UPDATE academic_years
      SET status = 'active',
          user_id_modification = $1,
          date_time_modification = CURRENT_TIMESTAMP
      WHERE id = $2 AND status != 'inactive'
      RETURNING *
    `, [userId, id]);

    await client.query('COMMIT');

    if (result.rows.length === 0) {
      throw new Error('Año escolar no encontrado');
    }

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Cerrar un año escolar
 * @param {number} id - ID del año escolar
 * @param {string} reason - Motivo del cierre
 * @param {string} observations - Observaciones del cierre
 * @param {number} userId - ID del usuario que cierra
 * @param {Object} archiveData - Datos de archivo (snapshot) del año
 * @returns {Promise<Object>} Año escolar cerrado
 */
const closeAcademicYear = async (id, reason, observations, userId, archiveData = null) => {
  const query = `
    UPDATE academic_years SET
      status = 'closed',
      close_date = CURRENT_TIMESTAMP,
      close_reason = $1,
      close_observations = $2,
      file = $3,
      user_id_modification = $4,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $5 AND status != 'inactive'
    RETURNING *
  `;

  const result = await pool.query(query, [
    reason,
    observations,
    archiveData ? JSON.stringify(archiveData) : null,
    userId,
    id
  ]);
  return result.rows[0];
};

/**
 * Eliminar un año escolar (soft delete)
 * @param {number} id - ID del año escolar
 * @param {number} userId - ID del usuario que elimina
 * @returns {Promise<boolean>} true si se eliminó correctamente
 */
const deleteAcademicYear = async (id, userId) => {
  const query = `
    UPDATE academic_years SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $2
  `;

  const result = await pool.query(query, [userId, id]);
  return result.rowCount > 0;
};

module.exports = {
  getAllAcademicYears,
  getAcademicYearById,
  getCurrentAcademicYear,
  createAcademicYear,
  updateAcademicYear,
  activateAcademicYear,
  closeAcademicYear,
  deleteAcademicYear
};
