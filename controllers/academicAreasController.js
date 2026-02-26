const { getAllAcademicAreas, getAcademicAreaById, createAcademicArea, updateAcademicArea, deleteAcademicArea } = require('../models/academicAreasModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      name: req.query.name
    };
    const areas = await getAllAcademicAreas(filters);
    res.json({ success: true, data: areas, total: areas.length });
  } catch (error) {
    console.error('Error al obtener áreas académicas:', error);
    res.status(500).json({ success: false, error: 'Error al obtener áreas académicas' });
  }
};

const getById = async (req, res) => {
  try {
    const area = await getAcademicAreaById(req.params.id);
    if (!area) return res.status(404).json({ success: false, error: 'Área académica no encontrada' });
    res.json({ success: true, data: area });
  } catch (error) {
    console.error('Error al obtener área académica:', error);
    res.status(500).json({ success: false, error: 'Error al obtener área académica' });
  }
};

const create = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'El nombre del área es requerido' });
    }

    const newArea = await createAcademicArea(req.body, req.user?.id);
    res.status(201).json({ success: true, message: 'Área académica creada exitosamente', data: newArea });
  } catch (error) {
    console.error('Error al crear área académica:', error);
    if (error.code === '23505') {
      return res.status(409).json({ success: false, error: 'Ya existe un área con ese nombre' });
    }
    res.status(500).json({ success: false, error: 'Error al crear área académica' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getAcademicAreaById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Área académica no encontrada' });
    const updated = await updateAcademicArea(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Área académica actualizada exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar área académica:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar área académica' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getAcademicAreaById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Área académica no encontrada' });
    await deleteAcademicArea(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Área académica eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar área académica:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar área académica' });
  }
};

module.exports = { getAll, getById, create, update, remove };
