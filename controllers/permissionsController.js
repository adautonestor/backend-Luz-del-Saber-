const { getAllPermissions, getPermissionById, getPermissionsByModule, createPermission, updatePermission, deletePermission } = require('../models/permissionsModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      module: req.query.module,
      name: req.query.name
    };
    const permissions = await getAllPermissions(filters);
    res.json({ success: true, data: permissions, total: permissions.length });
  } catch (error) {
    console.error('Error al obtener permisos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener permisos' });
  }
};

const getById = async (req, res) => {
  try {
    const permission = await getPermissionById(req.params.id);
    if (!permission) return res.status(404).json({ success: false, error: 'Permiso no encontrado' });
    res.json({ success: true, data: permission });
  } catch (error) {
    console.error('Error al obtener permiso:', error);
    res.status(500).json({ success: false, error: 'Error al obtener permiso' });
  }
};

const getByModule = async (req, res) => {
  try {
    const { module } = req.params;
    const permissions = await getPermissionsByModule(module);
    res.json({ success: true, data: permissions, total: permissions.length });
  } catch (error) {
    console.error('Error al obtener permisos del módulo:', error);
    res.status(500).json({ success: false, error: 'Error al obtener permisos del módulo' });
  }
};

const create = async (req, res) => {
  try {
    const { name, module } = req.body;
    if (!name || !module) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }
    const newPermission = await createPermission(req.body, req.user?.id);
    res.status(201).json({ success: true, message: 'Permiso creado exitosamente', data: newPermission });
  } catch (error) {
    console.error('Error al crear permiso:', error);
    res.status(500).json({ success: false, error: 'Error al crear permiso' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getPermissionById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Permiso no encontrado' });
    const updated = await updatePermission(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Permiso actualizado exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar permiso:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar permiso' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getPermissionById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Permiso no encontrado' });
    await deletePermission(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Permiso eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar permiso:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar permiso' });
  }
};

module.exports = { getAll, getById, getByModule, create, update, remove };
