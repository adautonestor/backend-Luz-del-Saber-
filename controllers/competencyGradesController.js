/**
 * 📊 COMPETENCY GRADES CONTROLLER
 *
 * Maneja calificaciones por competencias del currículo MINEDU (sistema literal AD/A/B/C)
 *
 * Este es el controller PRINCIPAL para registro de notas.
 * Se eliminó student_grades para usar solo el modelo por competencias.
 *
 * Endpoints:
 * - GET    /api/competency-grades
 * - GET    /api/competency-grades/:id
 * - GET    /api/competency-grades/student/:studentId
 * - GET    /api/competency-grades/grid (Nuevo - para el grid de notas)
 * - POST   /api/competency-grades
 * - PUT    /api/competency-grades/:id
 * - DELETE /api/competency-grades/:id
 */

const {
  getAllCompetencyGrades,
  getCompetencyGradeById,
  getGradesByStudent,
  getGradesForGrid,
  getReportCardData,
  createCompetencyGrade,
  updateCompetencyGrade,
  deleteCompetencyGrade
} = require('../models/competencyGradesModel');

const { calculateCompetencyAverage, saveCompetencyAverage, deleteCompetencyAverage } = require('../services/gradeAverageService');
const gradingScalesService = require('../services/gradingScalesService');

const getAll = async (req, res) => {
  try {
    const filters = {
      student_id: req.query.student_id,
      curso_id: req.query.curso_id,
      competencia_id: req.query.competencia_id,
      quarter: req.query.quarter,
      profesor_id: req.query.profesor_id
    };
    const grades = await getAllCompetencyGrades(filters);
    res.json({ success: true, data: grades, total: grades.length });
  } catch (error) {
    console.error('Error al obtener calificaciones por competencias:', error);
    res.status(500).json({ success: false, error: 'Error al obtener calificaciones por competencias' });
  }
};

const getById = async (req, res) => {
  try {
    const grade = await getCompetencyGradeById(req.params.id);
    if (!grade) return res.status(404).json({ success: false, error: 'Calificación no encontrada' });
    res.json({ success: true, data: grade });
  } catch (error) {
    console.error('Error al obtener calificación:', error);
    res.status(500).json({ success: false, error: 'Error al obtener calificación' });
  }
};

const getByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const quarter = req.query.quarter || null;
    const grades = await getGradesByStudent(studentId, quarter);
    res.json({ success: true, data: grades, total: grades.length });
  } catch (error) {
    console.error('Error al obtener calificaciones del estudiante:', error);
    res.status(500).json({ success: false, error: 'Error al obtener calificaciones del estudiante' });
  }
};

const create = async (req, res) => {
  try {
    const { student_id, course_id, course_competency_id, category_id, subcategory_id, quarter, value } = req.body;

    // 🔄 CAMBIO: Permitir category_id y subcategory_id como alternativa a course_competency_id
    // Esto permite compatibilidad con el sistema de evaluation_structures que usa IDs de string
    const usesCategorySystem = category_id && subcategory_id;

    // Validar campos requeridos según el sistema utilizado
    if (!student_id || !course_id || !quarter || !value) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos básicos requeridos',
        received: req.body,
        required: ['student_id', 'course_id', 'quarter', 'value', 'y uno de: course_competency_id o (category_id + subcategory_id)']
      });
    }

    if (!course_competency_id && !usesCategorySystem) {
      return res.status(400).json({
        success: false,
        error: 'Debe proporcionar course_competency_id o (category_id + subcategory_id)',
        received: req.body
      });
    }

    const pool = require('../config/db');

    // 🎯 VALIDACIÓN DE ESCALA: Obtener el nivel del estudiante y validar el valor
    const studentQuery = await pool.query(
      `SELECT s.level_id, ay.id as academic_year_id
       FROM students s
       LEFT JOIN academic_years ay ON ay.status = 'active'
       WHERE s.id = $1
       LIMIT 1`,
      [student_id]
    );

    if (studentQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Estudiante no encontrado'
      });
    }

    const { level_id: levelId, academic_year_id: academicYearId } = studentQuery.rows[0];

    // Validar que el valor sea válido según la escala del nivel
    const validationResult = await gradingScalesService.validateGradeValue(value, levelId, academicYearId);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Valor de calificación inválido',
        message: validationResult.message,
        levelId,
        value
      });
    }

    // 🔒 AUTO-BLOQUEO: Activar bloqueo del nivel cuando se registra nota
    try {
      await gradingScalesService.autoLockIfHasGrades(levelId, academicYearId, req.user?.id || 1);
    } catch (lockError) {
      console.warn('[CompetencyGrades] Advertencia al verificar bloqueo:', lockError.message);
      // No bloquear el registro de la nota si falla el auto-bloqueo
    }

    let result;
    let isUpdate = false;

    if (usesCategorySystem) {
      // Sistema nuevo: usar category_id y subcategory_id
      // Buscar calificación existente por category_id + subcategory_id
      const existingQuery = await pool.query(
        `SELECT id FROM competency_grades
         WHERE student_id = $1 AND category_id = $2 AND subcategory_id = $3 AND quarter = $4 AND status = 'active'`,
        [student_id, category_id, subcategory_id, quarter]
      );

      if (existingQuery.rows.length > 0) {
        // Ya existe, hacer UPDATE
        const existingId = existingQuery.rows[0].id;
        result = await updateCompetencyGrade(existingId, req.body, req.user?.id);
        isUpdate = true;
      } else {
        // No existe, hacer INSERT
        result = await createCompetencyGrade(req.body, req.user?.id);
      }
    } else {
      // Sistema antiguo: usar course_competency_id
      const existingQuery = await pool.query(
        `SELECT id FROM competency_grades
         WHERE student_id = $1 AND course_competency_id = $2 AND quarter = $3 AND status = 'active'`,
        [student_id, course_competency_id, quarter]
      );

      if (existingQuery.rows.length > 0) {
        const existingId = existingQuery.rows[0].id;
        result = await updateCompetencyGrade(existingId, req.body, req.user?.id);
        isUpdate = true;
      } else {
        result = await createCompetencyGrade(req.body, req.user?.id);
      }
    }

    // 📊 Calcular y guardar el promedio de la competencia
    let competencyAverage = null;
    try {
      const categoryIdToUse = category_id || result.category_id;

      if (categoryIdToUse) {
        const averageResult = await calculateCompetencyAverage(
          student_id,
          course_id,
          categoryIdToUse,
          quarter
        );

        competencyAverage = averageResult.average;

        // 💾 Guardar el promedio en la tabla competency_quarter_averages
        if (competencyAverage !== null) {
          // Obtener academic_year_id del course_assignment
          const assignmentQuery = await pool.query(
            `SELECT academic_year_id FROM course_assignments
             WHERE course_id = $1 AND status = 'active'
             LIMIT 1`,
            [course_id]
          );

          if (assignmentQuery.rows.length > 0) {
            const academicYearId = assignmentQuery.rows[0].academic_year_id;
            const gradingSystem = req.body.grading_system || result.grading_system || 'literal';

            await saveCompetencyAverage(
              student_id,
              course_id,
              categoryIdToUse,
              quarter,
              competencyAverage,
              academicYearId,
              gradingSystem,
              averageResult.details
            );
          }
        }
      }
    } catch (avgError) {
      // Error no crítico, continuar
    }

    res.status(isUpdate ? 200 : 201).json({
      success: true,
      message: `Calificación ${isUpdate ? 'actualizada' : 'registrada'} exitosamente`,
      data: result,
      action: isUpdate ? 'updated' : 'created',
      competencyAverage: competencyAverage // Incluir el promedio calculado
    });
  } catch (error) {
    console.error('❌ Error al registrar calificación:', error);
    res.status(500).json({ success: false, error: 'Error al registrar calificación', details: error.message });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getCompetencyGradeById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Calificación no encontrada' });
    const updated = await updateCompetencyGrade(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Calificación actualizada exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar calificación:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar calificación' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getCompetencyGradeById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Calificación no encontrada' });

    // Guardar datos antes de eliminar para recalcular promedios
    const { student_id, course_id, category_id, quarter } = existing;

    await deleteCompetencyGrade(req.params.id, req.user?.id);

    // 🔄 Recalcular promedio después de eliminar
    if (category_id) {
      try {
        const averageResult = await calculateCompetencyAverage(
          student_id,
          course_id,
          category_id,
          quarter
        );

        // Obtener academic_year_id
        const pool = require('../config/db');
        const assignmentQuery = await pool.query(
          `SELECT academic_year_id FROM course_assignments
           WHERE course_id = $1 AND status = 'active'
           LIMIT 1`,
          [course_id]
        );

        if (assignmentQuery.rows.length > 0) {
          const academicYearId = assignmentQuery.rows[0].academic_year_id;

          if (averageResult.average !== null) {
            // Actualizar el promedio
            await saveCompetencyAverage(
              student_id,
              course_id,
              category_id,
              quarter,
              averageResult.average,
              academicYearId,
              existing.grading_system || 'literal',
              averageResult.details
            );
          } else {
            // No hay más notas, eliminar el promedio
            await deleteCompetencyAverage(student_id, course_id, category_id, quarter, academicYearId);
          }
        }
      } catch (avgError) {
        // Error no crítico, continuar
      }
    }

    res.json({ success: true, message: 'Calificación eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar calificación:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar calificación' });
  }
};

/**
 * GET /api/competency-grades/grid
 * Obtiene las calificaciones en formato grid para el módulo de registro de notas
 *
 * Query params:
 * - course_id: ID del curso
 * - grade_id: ID del grado
 * - section_id: ID de la sección
 * - quarter: Número del bimestre
 */
const getGrid = async (req, res) => {
  try {
    const { course_id, grade_id, section_id, quarter } = req.query;

    if (!course_id || !grade_id || !section_id || !quarter) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros requeridos',
        required: ['course_id', 'grade_id', 'section_id', 'quarter']
      });
    }

    const gridData = await getGradesForGrid({
      course_id: parseInt(course_id),
      grade_id: parseInt(grade_id),
      section_id: parseInt(section_id),
      quarter: parseInt(quarter)
    });

    res.json({
      success: true,
      data: gridData
    });
  } catch (error) {
    console.error('Error al obtener grid de calificaciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener grid de calificaciones',
      details: error.message
    });
  }
};

/**
 * GET /api/competency-grades/averages
 * Obtiene los promedios calculados de un estudiante
 *
 * Query params:
 * - student_id: ID del estudiante
 * - course_id: ID del curso
 * - category_id: ID de la categoría/competencia
 * - quarter: Número del bimestre
 */
const getAverages = async (req, res) => {
  try {
    const { student_id, course_id, quarter, academic_year_id } = req.query;

    if (!student_id || !quarter) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros requeridos: student_id, quarter'
      });
    }

    const { getSavedAverages } = require('../services/gradeAverageService');
    const pool = require('../config/db');

    // Obtener academic_year_id si no se proporciona
    let yearId = academic_year_id;
    if (!yearId) {
      const yearQuery = await pool.query(
        `SELECT id FROM academic_years WHERE status = 'active' ORDER BY id DESC LIMIT 1`
      );
      if (yearQuery.rows.length > 0) {
        yearId = yearQuery.rows[0].id;
      } else {
        return res.status(404).json({
          success: false,
          error: 'No se encontró año académico activo'
        });
      }
    }

    // Obtener promedios guardados de la base de datos
    const averages = await getSavedAverages(
      parseInt(student_id),
      course_id ? parseInt(course_id) : null,
      parseInt(quarter),
      parseInt(yearId)
    );

    res.json({
      success: true,
      data: averages,
      total: averages.length
    });
  } catch (error) {
    console.error('Error al obtener promedios:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener promedios',
      details: error.message
    });
  }
};

/**
 * GET /api/competency-grades/report-card/:studentId
 * Obtiene los datos de boleta para un estudiante en un bimestre específico
 * Incluye todas las notas de cada curso con sus comentarios
 *
 * Path params:
 * - studentId: ID del estudiante
 *
 * Query params:
 * - quarter: Número del bimestre (1-4)
 */
const getReportCard = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { quarter } = req.query;

    if (!studentId || !quarter) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros requeridos: studentId (path), quarter (query)'
      });
    }

    const reportCardData = await getReportCardData(
      parseInt(studentId),
      parseInt(quarter)
    );

    if (!reportCardData) {
      return res.status(404).json({
        success: false,
        error: 'Estudiante no encontrado'
      });
    }

    res.json({
      success: true,
      data: reportCardData
    });
  } catch (error) {
    console.error('Error al obtener datos de boleta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener datos de boleta',
      details: error.message
    });
  }
};

module.exports = { getAll, getById, getByStudent, getGrid, getAverages, getReportCard, create, update, remove };
