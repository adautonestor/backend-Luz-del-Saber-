const pool = require('../config/db');
const bcrypt = require('bcrypt');

/**
 * Obtener todos los usuarios con información relacionada
 * @param {Object} filters - Filtros opcionales (role_id, status)
 * @returns {Promise<Array>} Lista de usuarios
 */
const getAllUsers = async (filters = {}) => {
  let query = `
    SELECT
      u.id,
      u.email,
      u.first_name,
      u.last_names,
      u.dni,
      u.document_type,
      u.role_id,
      u.relationship,
      u.phone,
      u.address,
      u.status,
      u.specialty,
      u.level,
      u.entry_date,
      u.last_login,
      u.date_time_registration,
      r.name AS rol
    FROM users u
    INNER JOIN roles r ON u.role_id = r.id
    WHERE u.status != 'deleted'
  `;

  const params = [];
  let paramCount = 1;

  if (filters.role_id) {
    query += ` AND u.role_id = $${paramCount}`;
    params.push(filters.role_id);
    paramCount++;
  }

  if (filters.status) {
    query += ` AND u.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }

  query += ` ORDER BY u.first_name, u.last_names`;

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Obtener un usuario por ID
 * @param {number} id - ID del usuario
 * @returns {Promise<Object|null>} Usuario encontrado o null
 */
const getUserById = async (id) => {
  const query = `
    SELECT
      u.id,
      u.email,
      u.first_name,
      u.last_names,
      u.dni,
      u.document_type,
      u.role_id,
      u.relationship,
      u.phone,
      u.address,
      u.status,
      u.specialty,
      u.level,
      u.entry_date,
      u.last_login,
      r.name AS rol,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'name', p.name,
            'description', p.description,
            'module', p.module,
            'action', p.action
          )
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'
      ) AS permissions
    FROM users u
    INNER JOIN roles r ON u.role_id = r.id
    LEFT JOIN roles_permissions rp ON r.id = rp.role_id AND rp.status = 'active'
    LEFT JOIN permissions p ON rp.permission_id = p.id AND p.status = 'active'
    WHERE u.id = $1
    GROUP BY u.id, r.name
  `;

  const result = await pool.query(query, [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Obtener un usuario por email
 * @param {string} email - Email del usuario
 * @returns {Promise<Object|null>} Usuario encontrado o null
 */
const getUserByEmail = async (email) => {
  const query = `
    SELECT * FROM users
    WHERE email = $1
  `;

  const result = await pool.query(query, [email]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Obtener un usuario por DNI
 * @param {string} dni - DNI del usuario
 * @returns {Promise<Object|null>} Usuario encontrado o null
 */
const getUserByDni = async (dni) => {
  const query = `
    SELECT * FROM users
    WHERE dni = $1
  `;

  const result = await pool.query(query, [dni]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Crear un nuevo usuario
 * @param {Object} userData - Datos del usuario
 * @param {number} userId - ID del usuario que registra
 * @returns {Promise<Object>} Usuario creado
 */
const createUser = async (userData, userId) => {
  const {
    email,
    password,
    first_name,
    last_names,
    dni,
    document_type,
    role_id,
    relationship,
    phone,
    address,
    status,
    specialty,
    level,
    entry_date
  } = userData;

  // Hashear la contraseña
  const hashedPassword = await bcrypt.hash(password, 10);

  const query = `
    INSERT INTO users (
      email, password, first_name, last_names, dni, document_type,
      role_id, relationship, phone, address, status,
      specialty, level, entry_date,
      user_id_registration, date_time_registration
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP
    ) RETURNING id
  `;

  const values = [
    email,
    hashedPassword,
    first_name,
    last_names,
    dni,
    document_type || 'DNI',
    role_id,
    relationship || null,
    phone || null,
    address || null,
    status || 'active',
    specialty || null,
    level || null,
    entry_date || null,
    userId
  ];

  const result = await pool.query(query, values);
  const newUserId = result.rows[0].id;

  // Hacer un SELECT con JOIN para obtener todos los datos incluyendo el nombre del rol
  const selectQuery = `
    SELECT
      u.id,
      u.email,
      u.first_name,
      u.last_names,
      u.dni,
      u.document_type,
      u.role_id,
      u.relationship,
      u.phone,
      u.address,
      u.status,
      u.specialty,
      u.level,
      u.entry_date,
      u.last_login,
      u.date_time_registration,
      r.name AS rol
    FROM users u
    INNER JOIN roles r ON u.role_id = r.id
    WHERE u.id = $1
  `;

  const selectResult = await pool.query(selectQuery, [newUserId]);
  return selectResult.rows[0];
};

/**
 * Actualizar un usuario
 * @param {number} id - ID del usuario
 * @param {Object} userData - Datos a actualizar
 * @param {number} userId - ID del usuario que modifica
 * @returns {Promise<Object>} Usuario actualizado
 */
const updateUser = async (id, userData, userId) => {
  const {
    email,
    password,
    first_name,
    last_names,
    dni,
    document_type,
    role_id,
    relationship,
    phone,
    address,
    status,
    specialty,
    level,
    entry_date
  } = userData;

  let query;
  let values;

  // Si se proporciona contraseña, hashearla y actualizar
  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    query = `
      UPDATE users SET
        email = $1,
        password = $2,
        first_name = $3,
        last_names = $4,
        dni = $5,
        document_type = $6,
        role_id = $7,
        relationship = $8,
        phone = $9,
        address = $10,
        status = $11,
        specialty = $12,
        level = $13,
        entry_date = $14,
        user_id_modification = $15,
        date_time_modification = CURRENT_TIMESTAMP
      WHERE id = $16
      RETURNING id
    `;

    values = [
      email,
      hashedPassword,
      first_name,
      last_names,
      dni,
      document_type || 'DNI',
      role_id,
      relationship || null,
      phone || null,
      address || null,
      status || 'active',
      specialty || null,
      level || null,
      entry_date || null,
      userId,
      id
    ];
  } else {
    // Si no se proporciona contraseña, no actualizarla
    query = `
      UPDATE users SET
        email = $1,
        first_name = $2,
        last_names = $3,
        dni = $4,
        document_type = $5,
        role_id = $6,
        relationship = $7,
        phone = $8,
        address = $9,
        status = $10,
        specialty = $11,
        level = $12,
        entry_date = $13,
        user_id_modification = $14,
        date_time_modification = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING id
    `;

    values = [
      email,
      first_name,
      last_names,
      dni,
      document_type || 'DNI',
      role_id,
      relationship || null,
      phone || null,
      address || null,
      status || 'active',
      specialty || null,
      level || null,
      entry_date || null,
      userId,
      id
    ];
  }

  const result = await pool.query(query, values);
  const updatedUserId = result.rows[0].id;

  // Hacer un SELECT con JOIN para obtener todos los datos incluyendo el nombre del rol
  const selectQuery = `
    SELECT
      u.id,
      u.email,
      u.first_name,
      u.last_names,
      u.dni,
      u.document_type,
      u.role_id,
      u.relationship,
      u.phone,
      u.address,
      u.status,
      u.specialty,
      u.level,
      u.entry_date,
      u.last_login,
      u.date_time_registration,
      r.name AS rol
    FROM users u
    INNER JOIN roles r ON u.role_id = r.id
    WHERE u.id = $1
  `;

  const selectResult = await pool.query(selectQuery, [updatedUserId]);
  return selectResult.rows[0];
};

/**
 * Eliminar un usuario (soft delete)
 * @param {number} id - ID del usuario
 * @param {number} userId - ID del usuario que elimina
 * @returns {Promise<boolean>} true si se eliminó correctamente
 */
const deleteUser = async (id, userId) => {
  const query = `
    UPDATE users SET
      status = 'deleted',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $2
  `;

  const result = await pool.query(query, [userId, id]);
  return result.rowCount > 0;
};

/**
 * Actualizar último login del usuario
 * @param {number} id - ID del usuario
 * @returns {Promise<boolean>} true si se actualizó correctamente
 */
const updateLastLogin = async (id) => {
  const query = `
    UPDATE users SET
      last_login = CURRENT_TIMESTAMP
    WHERE id = $1
  `;

  const result = await pool.query(query, [id]);
  return result.rowCount > 0;
};

/**
 * Obtener usuarios por nombre de rol
 * @param {string} roleName - Nombre del rol (ej: 'parent', 'teacher', 'admin')
 * @returns {Promise<Array>} Lista de usuarios con ese rol
 */
const getUsersByRoleName = async (roleName) => {
  const query = `
    SELECT
      u.id,
      u.email,
      u.first_name,
      u.last_names,
      u.dni,
      u.document_type,
      u.role_id,
      u.relationship,
      u.phone,
      u.address,
      u.status,
      u.specialty,
      u.level,
      u.entry_date,
      u.last_login,
      u.date_time_registration,
      r.name AS rol
    FROM users u
    INNER JOIN roles r ON u.role_id = r.id
    WHERE u.status != 'deleted' AND LOWER(r.name) = LOWER($1)
    ORDER BY u.first_name, u.last_names
  `;

  const result = await pool.query(query, [roleName]);
  return result.rows;
};

module.exports = {
  getAllUsers,
  getUserById,
  getUserByEmail,
  getUserByDni,
  createUser,
  updateUser,
  deleteUser,
  updateLastLogin,
  getUsersByRoleName
};
