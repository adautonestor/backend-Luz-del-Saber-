const { getAllCompetencies, getCompetencyById, getCompetenciesByArea, createCompetency, updateCompetency, deleteCompetency } = require('../models/competenciesModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      area_id: req.query.area_id,
      nivel_id: req.query.nivel_id,
      grado_id: req.query.grado_id,
      codigo: req.query.codigo
    };
    const competencies = await getAllCompetencies(filters);
    res.json({ success: true, data: competencies, total: competencies.length });
  } catch (error) {
    console.error('Error al obtener competencias:', error);
    res.status(500).json({ success: false, error: 'Error al obtener competencias' });
  }
};

const getById = async (req, res) => {
  try {
    const competency = await getCompetencyById(req.params.id);
    if (!competency) return res.status(404).json({ success: false, error: 'Competencia no encontrada' });
    res.json({ success: true, data: competency });
  } catch (error) {
    console.error('Error al obtener competencia:', error);
    res.status(500).json({ success: false, error: 'Error al obtener competencia' });
  }
};

const getByArea = async (req, res) => {
  try {
    const { areaId } = req.params;
    const competencies = await getCompetenciesByArea(areaId);
    res.json({ success: true, data: competencies, total: competencies.length });
  } catch (error) {
    console.error('Error al obtener competencias del área:', error);
    res.status(500).json({ success: false, error: 'Error al obtener competencias del área' });
  }
};

const create = async (req, res) => {
  try {
    const { nombre, codigo } = req.body;
    if (!nombre || !codigo) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }
    const newCompetency = await createCompetency(req.body, req.user?.id);
    res.status(201).json({ success: true, message: 'Competencia creada exitosamente', data: newCompetency });
  } catch (error) {
    console.error('Error al crear competencia:', error);
    res.status(500).json({ success: false, error: 'Error al crear competencia' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getCompetencyById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Competencia no encontrada' });
    const updated = await updateCompetency(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Competencia actualizada exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar competencia:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar competencia' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getCompetencyById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Competencia no encontrada' });
    await deleteCompetency(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Competencia eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar competencia:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar competencia' });
  }
};

module.exports = { getAll, getById, getByArea, create, update, remove };
