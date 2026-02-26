const { getAllEvaluationStructures, getEvaluationStructureById, getStructuresByCourse, createEvaluationStructure, updateEvaluationStructure, deleteEvaluationStructure, addCustomColumn, addCustomColumnAutoCreate, removeCustomColumn, getStructureByCourseGradeQuarter, createDefaultStructure } = require('../models/evaluationStructuresModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      course_id: req.query.course_id,
      grade_id: req.query.grade_id,
      academic_year_id: req.query.academic_year_id,
      quarter: req.query.quarter
    };
    const structures = await getAllEvaluationStructures(filters);
    res.json({ success: true, data: structures, total: structures.length });
  } catch (error) {
    console.error('Error al obtener estructuras de evaluación:', error);
    res.status(500).json({ success: false, error: 'Error al obtener estructuras de evaluación' });
  }
};

const getById = async (req, res) => {
  try {
    const structure = await getEvaluationStructureById(req.params.id);
    if (!structure) return res.status(404).json({ success: false, error: 'Estructura de evaluación no encontrada' });
    res.json({ success: true, data: structure });
  } catch (error) {
    console.error('Error al obtener estructura de evaluación:', error);
    res.status(500).json({ success: false, error: 'Error al obtener estructura de evaluación' });
  }
};

const getByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const gradoId = req.query.grade_id || null;
    const academicYearId = req.query.academic_year_id || null;
    const structures = await getStructuresByCourse(courseId, gradoId, academicYearId);
    res.json({ success: true, data: structures, total: structures.length });
  } catch (error) {
    console.error('Error al obtener estructuras del curso:', error);
    res.status(500).json({ success: false, error: 'Error al obtener estructuras del curso' });
  }
};

const create = async (req, res) => {
  try {
    const { course_id, grade_id, quarter, structure_json } = req.body;
    if (!course_id || !grade_id || !quarter || !structure_json) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: course_id, grade_id, quarter, structure_json'
      });
    }
    const newStructure = await createEvaluationStructure(req.body, req.user?.id);
    res.status(201).json({
      success: true,
      message: 'Estructura de evaluación creada exitosamente',
      data: newStructure
    });
  } catch (error) {
    console.error('Error al crear estructura de evaluación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear estructura de evaluación',
      details: error.message
    });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getEvaluationStructureById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Estructura de evaluación no encontrada' });
    const updated = await updateEvaluationStructure(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Estructura de evaluación actualizada exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar estructura de evaluación:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar estructura de evaluación' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getEvaluationStructureById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Estructura de evaluación no encontrada' });
    await deleteEvaluationStructure(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Estructura de evaluación eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar estructura de evaluación:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar estructura de evaluación' });
  }
};

/**
 * Agregar columna personalizada a una estructura de evaluación
 * Crea la estructura automáticamente si no existe
 */
const addColumn = async (req, res) => {
  try {
    const { structureId } = req.params;
    const { parentId, columnData, courseId, gradeId, quarter, academicYearId } = req.body;

    if (!parentId || !columnData || !columnData.name || columnData.weight === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: parentId, columnData (name, weight)'
      });
    }

    let updated;

    // Si se proporcionan courseId, gradeId y quarter, usar auto-creación
    // O si structureId es 0 o null (indicando que no existe)
    if ((courseId && gradeId && quarter) || !structureId || structureId === '0') {
      if (!courseId || !gradeId || !quarter) {
        return res.status(400).json({
          success: false,
          error: 'Se requieren courseId, gradeId y quarter para crear/actualizar la estructura'
        });
      }

      console.log('🔄 Usando addCustomColumnAutoCreate');
      console.log('   Datos:', { courseId, gradeId, quarter, academicYearId, parentId });

      updated = await addCustomColumnAutoCreate(
        parseInt(courseId),
        parseInt(gradeId),
        parseInt(quarter),
        academicYearId ? parseInt(academicYearId) : null,
        parentId,
        columnData,
        req.user?.id
      );
    } else {
      // Modo tradicional con structureId
      console.log('🔄 Usando addCustomColumn tradicional');
      updated = await addCustomColumn(
        parseInt(structureId),
        parentId,
        columnData,
        req.user?.id
      );
    }

    res.json({
      success: true,
      message: 'Columna personalizada agregada exitosamente',
      data: updated
    });
  } catch (error) {
    console.error('❌ Error al agregar columna personalizada:', error);
    res.status(500).json({
      success: false,
      error: 'Error al agregar columna personalizada',
      details: error.message
    });
  }
};

/**
 * Eliminar columna personalizada de una estructura de evaluación
 */
const removeColumn = async (req, res) => {
  try {
    const { structureId, columnId } = req.params;

    if (!columnId) {
      return res.status(400).json({
        success: false,
        error: 'Falta el ID de la columna'
      });
    }

    const updated = await removeCustomColumn(
      parseInt(structureId),
      columnId,
      req.user?.id
    );

    res.json({
      success: true,
      message: 'Columna personalizada eliminada exitosamente',
      data: updated
    });
  } catch (error) {
    console.error('Error al eliminar columna personalizada:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar columna personalizada',
      details: error.message
    });
  }
};

/**
 * Obtener estructura de evaluación
 * NO auto-crea - el director debe configurar las competencias primero
 */
const getOrCreate = async (req, res) => {
  try {
    const { course_id, grade_id, quarter, academic_year_id } = req.query;

    // Validar parámetros requeridos
    if (!course_id || !grade_id || !quarter) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros requeridos: course_id, grade_id, quarter'
      });
    }

    console.log('🔍 Buscando estructura de evaluación:', {
      course_id: parseInt(course_id),
      grade_id: parseInt(grade_id),
      quarter: parseInt(quarter),
      academic_year_id: academic_year_id ? parseInt(academic_year_id) : null
    });

    // Buscar estructura existente
    let structure = await getStructureByCourseGradeQuarter(
      parseInt(course_id),
      parseInt(grade_id),
      parseInt(quarter),
      academic_year_id ? parseInt(academic_year_id) : null
    );

    // Si existe, retornarla
    if (structure) {
      console.log('✅ Estructura encontrada:', structure.id);
      return res.json({
        success: true,
        data: structure,
        exists: true
      });
    }

    // Si no existe, retornar null (NO auto-crear)
    // El director debe configurar las competencias primero
    console.log('⚠️  Estructura no existe. El director debe configurarla primero.');

    res.json({
      success: true,
      data: null,
      exists: false,
      message: 'No hay estructura de evaluación configurada. El director debe crear las competencias para este curso/grado/bimestre.'
    });
  } catch (error) {
    console.error('❌ Error al obtener estructura de evaluación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estructura de evaluación',
      details: error.message
    });
  }
};

module.exports = { getAll, getById, getByCourse, create, update, remove, addColumn, removeColumn, getOrCreate };
