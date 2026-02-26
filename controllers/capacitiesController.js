const { getAllCapacities, getCapacityById, getCapacitiesByCompetency, createCapacity, updateCapacity, deleteCapacity } = require('../models/capacitiesModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      competencia_id: req.query.competencia_id,
      codigo: req.query.codigo
    };
    const capacities = await getAllCapacities(filters);
    res.json({ success: true, data: capacities, total: capacities.length });
  } catch (error) {
    console.error('Error al obtener capacidades:', error);
    res.status(500).json({ success: false, error: 'Error al obtener capacidades' });
  }
};

const getById = async (req, res) => {
  try {
    const capacity = await getCapacityById(req.params.id);
    if (!capacity) return res.status(404).json({ success: false, error: 'Capacidad no encontrada' });
    res.json({ success: true, data: capacity });
  } catch (error) {
    console.error('Error al obtener capacidad:', error);
    res.status(500).json({ success: false, error: 'Error al obtener capacidad' });
  }
};

const getByCompetency = async (req, res) => {
  try {
    const { competencyId } = req.params;
    const capacities = await getCapacitiesByCompetency(competencyId);
    res.json({ success: true, data: capacities, total: capacities.length });
  } catch (error) {
    console.error('Error al obtener capacidades de la competencia:', error);
    res.status(500).json({ success: false, error: 'Error al obtener capacidades de la competencia' });
  }
};

const create = async (req, res) => {
  try {
    const { nombre, codigo } = req.body;
    if (!nombre || !codigo) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }
    const newCapacity = await createCapacity(req.body, req.user?.id);
    res.status(201).json({ success: true, message: 'Capacidad creada exitosamente', data: newCapacity });
  } catch (error) {
    console.error('Error al crear capacidad:', error);
    res.status(500).json({ success: false, error: 'Error al crear capacidad' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getCapacityById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Capacidad no encontrada' });
    const updated = await updateCapacity(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Capacidad actualizada exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar capacidad:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar capacidad' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getCapacityById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Capacidad no encontrada' });
    await deleteCapacity(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Capacidad eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar capacidad:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar capacidad' });
  }
};

module.exports = { getAll, getById, getByCompetency, create, update, remove };
