const { getAllCourseCompetencies, getCourseCompetencyById, getCompetenciesByCourse, createCourseCompetency, updateCourseCompetency, deleteCourseCompetency } = require('../models/courseCompetenciesModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      curso_id: req.query.curso_id,
      competencia_id: req.query.competencia_id,
      grado_id: req.query.grado_id,
      academic_year_id: req.query.academic_year_id
    };
    const courseCompetencies = await getAllCourseCompetencies(filters);
    res.json({ success: true, data: courseCompetencies, total: courseCompetencies.length });
  } catch (error) {
    console.error('Error al obtener competencias del curso:', error);
    res.status(500).json({ success: false, error: 'Error al obtener competencias del curso' });
  }
};

const getById = async (req, res) => {
  try {
    const courseCompetency = await getCourseCompetencyById(req.params.id);
    if (!courseCompetency) return res.status(404).json({ success: false, error: 'Competencia del curso no encontrada' });
    res.json({ success: true, data: courseCompetency });
  } catch (error) {
    console.error('Error al obtener competencia del curso:', error);
    res.status(500).json({ success: false, error: 'Error al obtener competencia del curso' });
  }
};

const getByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const gradoId = req.query.grado_id || null;
    const añoEscolarId = req.query.academic_year_id || null;
    const competencies = await getCompetenciesByCourse(courseId, gradoId, añoEscolarId);
    res.json({ success: true, data: competencies, total: competencies.length });
  } catch (error) {
    console.error('Error al obtener competencias del curso:', error);
    res.status(500).json({ success: false, error: 'Error al obtener competencias del curso' });
  }
};

const create = async (req, res) => {
  try {
    const { curso_id, competencia_id } = req.body;
    if (!curso_id || !competencia_id) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }
    const newCourseCompetency = await createCourseCompetency(req.body, req.user?.id);
    res.status(201).json({ success: true, message: 'Competencia del curso creada exitosamente', data: newCourseCompetency });
  } catch (error) {
    console.error('Error al crear competencia del curso:', error);
    res.status(500).json({ success: false, error: 'Error al crear competencia del curso' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getCourseCompetencyById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Competencia del curso no encontrada' });
    const updated = await updateCourseCompetency(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Competencia del curso actualizada exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar competencia del curso:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar competencia del curso' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getCourseCompetencyById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Competencia del curso no encontrada' });
    await deleteCourseCompetency(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Competencia del curso eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar competencia del curso:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar competencia del curso' });
  }
};

module.exports = { getAll, getById, getByCourse, create, update, remove };
