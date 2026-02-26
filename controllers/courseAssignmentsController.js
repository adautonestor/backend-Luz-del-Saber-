const { getAllCourseAssignments, getCourseAssignmentById, getCoursesByGrade, createCourseAssignment, updateCourseAssignment, deleteCourseAssignment } = require('../models/courseAssignmentsModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      course_id: req.query.course_id,
      grade_id: req.query.grade_id,
      section_id: req.query.section_id,
      teacher_id: req.query.teacher_id,
      academic_year_id: req.query.academic_year_id,
      level_id: req.query.level_id
    };

    const assignments = await getAllCourseAssignments(filters);

    res.json({ success: true, data: assignments, total: assignments.length });
  } catch (error) {
    console.error('❌ [courseAssignmentsController.getAll] Error:', error);
    res.status(500).json({ success: false, error: 'Error al obtener asignaciones de cursos' });
  }
};

const getById = async (req, res) => {
  try {
    const assignment = await getCourseAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, error: 'Asignación no encontrada' });
    res.json({ success: true, data: assignment });
  } catch (error) {
    console.error('Error al obtener asignación:', error);
    res.status(500).json({ success: false, error: 'Error al obtener asignación' });
  }
};

const getByGrade = async (req, res) => {
  try {
    const { gradeId } = req.params;
    const academicYearId = req.query.academic_year_id || null;
    const courses = await getCoursesByGrade(gradeId, academicYearId);
    res.json({ success: true, data: courses, total: courses.length });
  } catch (error) {
    console.error('Error al obtener cursos del grado:', error);
    res.status(500).json({ success: false, error: 'Error al obtener cursos del grado' });
  }
};

const getByTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const filters = {
      teacher_id: teacherId,
      academic_year_id: req.query.academic_year_id || null
    };
    const assignments = await getAllCourseAssignments(filters);
    res.json({ success: true, data: assignments, total: assignments.length });
  } catch (error) {
    console.error('Error al obtener asignaciones del profesor:', error);
    res.status(500).json({ success: false, error: 'Error al obtener asignaciones del profesor' });
  }
};

const create = async (req, res) => {
  try {
    const { course_id, grade_id, teacher_id, academic_year_id } = req.body;

    if (!course_id || !grade_id || !teacher_id || !academic_year_id) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: course_id, grade_id, teacher_id y academic_year_id son obligatorios'
      });
    }

    const assignmentData = {
      course_id: parseInt(course_id),
      grade_id: parseInt(grade_id),
      teacher_id: parseInt(teacher_id),
      academic_year_id: parseInt(academic_year_id),
      weekly_hours: req.body.weekly_hours ? parseInt(req.body.weekly_hours) : 4,
      section_id: req.body.section_id ? parseInt(req.body.section_id) : null,
      observations: req.body.observations || null,
      status: req.body.status || 'active'
    };

    // createCourseAssignment ahora tiene lógica UPSERT y vincula todas las secciones del grado
    const newAssignment = await createCourseAssignment(assignmentData, req.user?.id || 1);

    res.status(201).json({ success: true, message: 'Asignación guardada exitosamente', data: newAssignment });
  } catch (error) {
    console.error('❌ [courseAssignmentsController.create] Error:', error);

    // Manejar errores de constraint único
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Ya existe una asignación para este curso, grado y año académico'
      });
    }

    res.status(500).json({ success: false, error: 'Error al guardar asignación' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await getCourseAssignmentById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Asignación no encontrada' });
    }

    // Preparar datos para actualización
    const updateData = {
      teacher_id: req.body.teacher_id !== undefined ? parseInt(req.body.teacher_id) : existing.teacher_id,
      weekly_hours: req.body.weekly_hours !== undefined ? parseInt(req.body.weekly_hours) : existing.weekly_hours,
      section_id: req.body.section_id !== undefined ? (req.body.section_id ? parseInt(req.body.section_id) : null) : existing.section_id,
      observations: req.body.observations !== undefined ? req.body.observations : existing.observations,
      status: req.body.status !== undefined ? req.body.status : existing.status
    };

    const updated = await updateCourseAssignment(id, updateData, req.user?.id || 1);

    res.json({ success: true, message: 'Asignación actualizada exitosamente', data: updated });
  } catch (error) {
    console.error('❌ [courseAssignmentsController.update] Error:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar asignación' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getCourseAssignmentById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Asignación no encontrada' });
    await deleteCourseAssignment(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Asignación eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar asignación:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar asignación' });
  }
};

module.exports = { getAll, getById, getByGrade, getByTeacher, create, update, remove };
