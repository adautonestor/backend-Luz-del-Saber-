const pool = require('../config/db');

/**
 * Buscar usuario por correo con su rol y permisos
 * @param {string} email - Correo electrónico del usuario
 * @returns {Promise<Object|null>} Usuario con sus datos, rol y permisos
 */
const findUserByEmail = async (email) => {
  const query = `
    SELECT
      u.id,
      u.email,
      u.password,
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
      u.status,
      u.user_id_registration,
      u.date_time_registration,
      u.user_id_modification,
      u.date_time_modification,
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
      ) AS permisos
    FROM users u
    JOIN roles r ON u.role_id = r.id
    LEFT JOIN roles_permissions rp ON r.id = rp.role_id AND rp.status = 'active'
    LEFT JOIN permissions p ON rp.permission_id = p.id AND p.status = 'active'
    WHERE u.email = $1
      AND u.status = 'active'
    GROUP BY
      u.id, u.email, u.password, u.first_name, u.last_names, u.dni,
      u.document_type, u.role_id, u.relationship, u.phone, u.address,
      u.status, u.specialty, u.level, u.entry_date, u.last_login,
      u.status, u.user_id_registration, u.date_time_registration,
      u.user_id_modification, u.date_time_modification, r.name
  `;

  const result = await pool.query(query, [email]);

  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Buscar usuario por ID con su rol y permisos
 * @param {number} id - ID del usuario
 * @returns {Promise<Object|null>} Usuario con sus datos, rol y permisos
 */
const findUserById = async (id) => {
  const query = `
    SELECT
      u.id,
      u.email,
      u.password,
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
      u.status,
      u.user_id_registration,
      u.date_time_registration,
      u.user_id_modification,
      u.date_time_modification,
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
      ) AS permisos
    FROM users u
    JOIN roles r ON u.role_id = r.id
    LEFT JOIN roles_permissions rp ON r.id = rp.role_id AND rp.status = 'active'
    LEFT JOIN permissions p ON rp.permission_id = p.id AND p.status = 'active'
    WHERE u.id = $1
    GROUP BY
      u.id, u.email, u.password, u.first_name, u.last_names, u.dni,
      u.document_type, u.role_id, u.relationship, u.phone, u.address,
      u.status, u.specialty, u.level, u.entry_date, u.last_login,
      u.status, u.user_id_registration, u.date_time_registration,
      u.user_id_modification, u.date_time_modification, r.name
  `;

  const result = await pool.query(query, [id]);

  return result.rows.length > 0 ? result.rows[0] : null;
};

module.exports = {
  findUserByEmail,
  findUserById
};
