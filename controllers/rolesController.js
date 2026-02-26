const { getAllRoles, getRoleById, createRole, updateRole, deleteRole } = require('../models/rolesModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      name: req.query.name
    };
    const roles = await getAllRoles(filters);
    res.json({ success: true, data: roles, total: roles.length });
  } catch (error) {
    console.error('Error al obtener roles:', error);
    res.status(500).json({ success: false, error: 'Error al obtener roles' });
  }
};

const getById = async (req, res) => {
  try {
    const role = await getRoleById(req.params.id);
    if (!role) return res.status(404).json({ success: false, error: 'Rol no encontrado' });
    res.json({ success: true, data: role });
  } catch (error) {
    console.error('Error al obtener rol:', error);
    res.status(500).json({ success: false, error: 'Error al obtener rol' });
  }
};

const create = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }
    const newRole = await createRole(req.body, req.user?.id);
    res.status(201).json({ success: true, message: 'Rol creado exitosamente', data: newRole });
  } catch (error) {
    console.error('Error al crear rol:', error);
    res.status(500).json({ success: false, error: 'Error al crear rol' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getRoleById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Rol no encontrado' });
    const updated = await updateRole(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Rol actualizado exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar rol:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar rol' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getRoleById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Rol no encontrado' });
    await deleteRole(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Rol eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar rol:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar rol' });
  }
};

module.exports = { getAll, getById, create, update, remove };
