const { getAllStudentBehaviors, getStudentBehaviorById, getBehaviorsByStudent, createStudentBehavior, updateStudentBehavior, deleteStudentBehavior } = require('../models/studentBehaviorsModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      student_id: req.query.student_id,
      type: req.query.type,
      gravedad: req.query.gravedad,
      quarter: req.query.quarter
    };
    const behaviors = await getAllStudentBehaviors(filters);
    res.json({ success: true, data: behaviors, total: behaviors.length });
  } catch (error) {
    console.error('Error al obtener registros de conducta:', error);
    res.status(500).json({ success: false, error: 'Error al obtener registros de conducta' });
  }
};

const getById = async (req, res) => {
  try {
    const behavior = await getStudentBehaviorById(req.params.id);
    if (!behavior) return res.status(404).json({ success: false, error: 'Registro de conducta no encontrado' });
    res.json({ success: true, data: behavior });
  } catch (error) {
    console.error('Error al obtener registro de conducta:', error);
    res.status(500).json({ success: false, error: 'Error al obtener registro de conducta' });
  }
};

const getByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const quarter = req.query.quarter || null;
    const behaviors = await getBehaviorsByStudent(studentId, quarter);
    res.json({ success: true, data: behaviors, total: behaviors.length });
  } catch (error) {
    console.error('Error al obtener registros de conducta del estudiante:', error);
    res.status(500).json({ success: false, error: 'Error al obtener registros de conducta del estudiante' });
  }
};

const create = async (req, res) => {
  try {
    const { student_id, quarter, academic_year } = req.body;

    // Validar campos requeridos mínimos
    if (!student_id || !quarter || !academic_year) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: student_id, quarter, academic_year'
      });
    }

    // Mapear campos del frontend al modelo
    const behaviorData = {
      student_id: req.body.student_id,
      discipline: req.body.disciplina || req.body.discipline || null,
      parent_rating: req.body.calificacion_padres || req.body.parent_rating || null,
      comments: req.body.comentarios || req.body.comments || null,
      quarter: req.body.quarter,
      academic_year: req.body.academic_year,
      academic_year_id: req.body.academic_year_id || null,
      grading_system: req.body.grading_system || 'literal',
      registered_by: req.body.registrado_por || req.body.registered_by || req.user?.id
    };

    const newBehavior = await createStudentBehavior(behaviorData, req.user?.id);
    res.status(201).json({ success: true, message: 'Registro de conducta creado exitosamente', data: newBehavior });
  } catch (error) {
    console.error('Error al crear registro de conducta:', error);
    res.status(500).json({ success: false, error: 'Error al crear registro de conducta: ' + error.message });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getStudentBehaviorById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Registro de conducta no encontrado' });

    // Mapear campos del frontend al modelo
    const updateData = {
      discipline: req.body.disciplina || req.body.discipline,
      parent_rating: req.body.calificacion_padres || req.body.parent_rating,
      comments: req.body.comentarios || req.body.comments
    };

    const updated = await updateStudentBehavior(req.params.id, updateData, req.user?.id);
    res.json({ success: true, message: 'Registro de conducta actualizado exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar registro de conducta:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar registro de conducta: ' + error.message });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getStudentBehaviorById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Registro de conducta no encontrado' });
    await deleteStudentBehavior(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Registro de conducta eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar registro de conducta:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar registro de conducta' });
  }
};

module.exports = { getAll, getById, getByStudent, create, update, remove };
