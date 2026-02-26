const pool = require('../config/db');

const getAllRolesPermissions = async (filters = {}) => {
  let query = `
    SELECT rp.*, r.nombre AS rol_nombre, p.nombre AS permiso_nombre,
           p.modulo AS permiso_modulo, u.nombre AS usuario_nombre
    FROM roles_permissions rp
    INNER JOIN roles r ON rp.rol_id = r.id
    INNER JOIN permissions p ON rp.permiso_id = p.id
    LEFT JOIN users u ON rp.user_id_registration = u.id
    WHERE rp.status = 'activo'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.rol_id) {
    query += ` AND rp.rol_id = $${paramCount}`;
    params.push(filters.rol_id);
    paramCount++;
  }

  if (filters.permiso_id) {
    query += ` AND rp.permiso_id = $${paramCount}`;
    params.push(filters.permiso_id);
    paramCount++;
  }

  query += ' ORDER BY r.nombre, p.modulo, p.nombre';
  const result = await pool.query(query, params);
  return result.rows;
};

const getRolePermissionById = async (id) => {
  const query = `
    SELECT rp.*, r.nombre AS rol_nombre, p.nombre AS permiso_nombre
    FROM roles_permissions rp
    INNER JOIN roles r ON rp.rol_id = r.id
    INNER JOIN permissions p ON rp.permiso_id = p.id
    WHERE rp.id = $1 AND rp.status = 'activo'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const getPermissionsByRole = async (rolId) => {
  const query = `
    SELECT rp.*, p.nombre AS permiso_nombre, p.descripcion, p.modulo, p.accion
    FROM roles_permissions rp
    INNER JOIN permissions p ON rp.permiso_id = p.id
    WHERE rp.rol_id = $1 AND rp.status = 'activo'
    ORDER BY p.modulo, p.nombre
  `;
  const result = await pool.query(query, [rolId]);
  return result.rows;
};

const getRolesByPermission = async (permisoId) => {
  const query = `
    SELECT rp.*, r.nombre AS rol_nombre, r.descripcion
    FROM roles_permissions rp
    INNER JOIN roles r ON rp.rol_id = r.id
    WHERE rp.permiso_id = $1 AND rp.status = 'activo'
    ORDER BY r.nivel_jerarquia, r.nombre
  `;
  const result = await pool.query(query, [permisoId]);
  return result.rows;
};

const getRolePermission = async (rolId, permisoId) => {
  const query = `
    SELECT rp.*
    FROM roles_permissions rp
    WHERE rp.rol_id = $1 AND rp.permiso_id = $2 AND rp.status = 'activo'
  `;
  const result = await pool.query(query, [rolId, permisoId]);
  return result.rows[0] || null;
};

const createRolePermission = async (data, userId) => {
  const { rol_id, permiso_id } = data;
  const result = await pool.query(
    `INSERT INTO roles_permissions (rol_id, permiso_id, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING *`,
    [rol_id, permiso_id, userId]
  );
  return result.rows[0];
};

const deleteRolePermission = async (id, userId) => {
  await pool.query(
    'UPDATE roles_permissions SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactivo', userId, id]
  );
  return true;
};

module.exports = { getAllRolesPermissions, getRolePermissionById, getPermissionsByRole, getRolesByPermission, getRolePermission, createRolePermission, deleteRolePermission };
