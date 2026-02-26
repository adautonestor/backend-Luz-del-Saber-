const { getAllTeacherAssignments, getTeacherAssignmentById, getAssignmentsByTeacher, createTeacherAssignment, updateTeacherAssignment, deleteTeacherAssignment } = require('../models/teacherAssignmentsModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      teacher_id: req.query.teacher_id,
      course_id: req.query.course_id,
      grade_id: req.query.grade_id,
      academic_year_id: req.query.academic_year_id,
      academic_year: req.query.academic_year
    };
    const assignments = await getAllTeacherAssignments(filters);
    res.json({ success: true, data: assignments, total: assignments.length });
  } catch (error) {
    console.error('Error al obtener asignaciones de profesores:', error);
    res.status(500).json({ success: false, error: 'Error al obtener asignaciones de profesores' });
  }
};

const getById = async (req, res) => {
  try {
    const assignment = await getTeacherAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, error: 'Asignación no encontrada' });
    res.json({ success: true, data: assignment });
  } catch (error) {
    console.error('Error al obtener asignación:', error);
    res.status(500).json({ success: false, error: 'Error al obtener asignación' });
  }
};

const getByTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const academicYearId = req.query.academic_year_id || null;
    const assignments = await getAssignmentsByTeacher(teacherId, academicYearId);
    res.json({ success: true, data: assignments, total: assignments.length });
  } catch (error) {
    console.error('Error al obtener asignaciones del profesor:', error);
    res.status(500).json({ success: false, error: 'Error al obtener asignaciones del profesor' });
  }
};

const create = async (req, res) => {
  try {
    const { teacher_id, course_id, grade_id, academic_year, academic_year_id } = req.body;
    if (!teacher_id || !course_id || !grade_id || !academic_year_id) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }
    const newAssignment = await createTeacherAssignment(req.body, req.user?.id);
    res.status(201).json({ success: true, message: 'Asignación creada exitosamente', data: newAssignment });
  } catch (error) {
    console.error('Error al crear asignación:', error);
    res.status(500).json({ success: false, error: 'Error al crear asignación' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getTeacherAssignmentById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Asignación no encontrada' });
    const updated = await updateTeacherAssignment(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Asignación actualizada exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar asignación:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar asignación' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getTeacherAssignmentById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Asignación no encontrada' });
    await deleteTeacherAssignment(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Asignación eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar asignación:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar asignación' });
  }
};

module.exports = { getAll, getById, getByTeacher, create, update, remove };
