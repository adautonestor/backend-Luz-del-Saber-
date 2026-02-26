const { getAllRolesPermissions, getRolePermissionById, getPermissionsByRole, getRolesByPermission, getRolePermission, createRolePermission, deleteRolePermission } = require('../models/rolesPermissionsModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      rol_id: req.query.rol_id,
      permiso_id: req.query.permiso_id
    };
    const rolesPermissions = await getAllRolesPermissions(filters);
    res.json({ success: true, data: rolesPermissions, total: rolesPermissions.length });
  } catch (error) {
    console.error('Error al obtener roles-permisos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener roles-permisos' });
  }
};

const getById = async (req, res) => {
  try {
    const rolePermission = await getRolePermissionById(req.params.id);
    if (!rolePermission) return res.status(404).json({ success: false, error: 'Relación no encontrada' });
    res.json({ success: true, data: rolePermission });
  } catch (error) {
    console.error('Error al obtener relación:', error);
    res.status(500).json({ success: false, error: 'Error al obtener relación' });
  }
};

const getByRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const permissions = await getPermissionsByRole(roleId);
    res.json({ success: true, data: permissions, total: permissions.length });
  } catch (error) {
    console.error('Error al obtener permisos del rol:', error);
    res.status(500).json({ success: false, error: 'Error al obtener permisos del rol' });
  }
};

const getByPermission = async (req, res) => {
  try {
    const { permissionId } = req.params;
    const roles = await getRolesByPermission(permissionId);
    res.json({ success: true, data: roles, total: roles.length });
  } catch (error) {
    console.error('Error al obtener roles con el permiso:', error);
    res.status(500).json({ success: false, error: 'Error al obtener roles con el permiso' });
  }
};

const create = async (req, res) => {
  try {
    const { rol_id, permiso_id } = req.body;
    if (!rol_id || !permiso_id) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }

    // Verificar si ya existe la relación
    const existing = await getRolePermission(rol_id, permiso_id);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Esta relación ya existe' });
    }

    const newRolePermission = await createRolePermission(req.body, req.user?.id);
    res.status(201).json({ success: true, message: 'Permiso asignado al rol exitosamente', data: newRolePermission });
  } catch (error) {
    console.error('Error al crear relación:', error);
    res.status(500).json({ success: false, error: 'Error al crear relación' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getRolePermissionById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Relación no encontrada' });
    await deleteRolePermission(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Permiso removido del rol exitosamente' });
  } catch (error) {
    console.error('Error al eliminar relación:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar relación' });
  }
};

module.exports = { getAll, getById, getByRole, getByPermission, create, remove };
