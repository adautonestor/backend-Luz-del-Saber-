const { getAllPaymentConcepts, getPaymentConceptById, createPaymentConcept, updatePaymentConcept, deletePaymentConcept } = require('../models/paymentConceptsModel');
const { generateObligationsForConcept, deleteObligationsForConcept } = require('../services/obligationGeneratorService');
const { getObligationsByConcept } = require('../models/paymentObligationsModel');

const getAll = async (req, res) => {
  try {
    const filters = { type: req.query.type, academic_year_id: req.query.academic_year_id, status: req.query.status };
    const concepts = await getAllPaymentConcepts(filters);
    res.json({ success: true, data: concepts, total: concepts.length });
  } catch (error) {
    console.error('Error al obtener conceptos de pago:', error);
    res.status(500).json({ success: false, error: 'Error al obtener conceptos de pago' });
  }
};

const getById = async (req, res) => {
  try {
    const concept = await getPaymentConceptById(req.params.id);
    if (!concept) return res.status(404).json({ success: false, error: 'Concepto de pago no encontrado' });
    res.json({ success: true, data: concept });
  } catch (error) {
    console.error('Error al obtener concepto de pago:', error);
    res.status(500).json({ success: false, error: 'Error al obtener concepto de pago' });
  }
};

const create = async (req, res) => {
  try {
    console.log('\n[PaymentConceptsController] === CREANDO CONCEPTO DE PAGO ===');
    console.log('[PaymentConceptsController] Body recibido:', JSON.stringify(req.body, null, 2));
    console.log('[PaymentConceptsController] User ID:', req.user?.id);

    const { name, type, amount, academic_year_id } = req.body;
    if (!name || !type || !amount || !academic_year_id) {
      console.error('[PaymentConceptsController] Campos faltantes:', { name: !!name, type: !!type, amount: !!amount, academic_year_id: !!academic_year_id });
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }

    // Crear el concepto
    console.log('[PaymentConceptsController] Creando concepto en BD...');
    const newConcept = await createPaymentConcept(req.body, req.user?.id);
    console.log('[PaymentConceptsController] Concepto creado:', JSON.stringify(newConcept, null, 2));

    // Generar obligaciones automáticamente
    let generationResult = { created: 0, students: 0 };
    try {
      console.log('[PaymentConceptsController] Iniciando generación de obligaciones...');
      generationResult = await generateObligationsForConcept(newConcept, req.user?.id);
      console.log('[PaymentConceptsController] Resultado generación:', generationResult);
    } catch (genError) {
      console.error('[PaymentConceptsController] Error al generar obligaciones automáticas:', genError.message);
      console.error('[PaymentConceptsController] Stack:', genError.stack);
      // No fallar la creación del concepto si falla la generación
    }

    console.log('[PaymentConceptsController] === CONCEPTO CREADO EXITOSAMENTE ===\n');

    res.status(201).json({
      success: true,
      message: 'Concepto de pago creado exitosamente',
      data: newConcept,
      obligationsGenerated: generationResult.created,
      studentsAffected: generationResult.students
    });

  } catch (error) {
    console.error('[PaymentConceptsController] Error al crear concepto de pago:', error);
    res.status(500).json({ success: false, error: 'Error al crear concepto de pago' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getPaymentConceptById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Concepto de pago no encontrado' });
    const updated = await updatePaymentConcept(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Concepto de pago actualizado exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar concepto de pago:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar concepto de pago' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getPaymentConceptById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Concepto de pago no encontrado' });
    await deletePaymentConcept(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Concepto de pago eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar concepto de pago:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar concepto de pago' });
  }
};

/**
 * Regenerar obligaciones para un concepto específico
 * Elimina las obligaciones no pagadas y las genera nuevamente
 */
const regenerate = async (req, res) => {
  try {
    const conceptId = parseInt(req.params.id);
    const concept = await getPaymentConceptById(conceptId);

    if (!concept) {
      return res.status(404).json({ success: false, error: 'Concepto de pago no encontrado' });
    }

    if (concept.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Solo se pueden regenerar obligaciones para conceptos activos' });
    }

    // Eliminar obligaciones pendientes (no pagadas, sin montos pagados)
    const deleted = await deleteObligationsForConcept(
      conceptId,
      concept.academic_year_id,
      req.user?.id
    );

    // Generar nuevamente
    const generationResult = await generateObligationsForConcept(concept, req.user?.id);

    res.json({
      success: true,
      message: 'Obligaciones regeneradas exitosamente',
      obligationsDeleted: deleted,
      obligationsGenerated: generationResult.created,
      studentsAffected: generationResult.students
    });

  } catch (error) {
    console.error('Error al regenerar obligaciones:', error);
    res.status(500).json({ success: false, error: 'Error al regenerar obligaciones' });
  }
};

/**
 * Obtener obligaciones generadas para un concepto
 */
const getObligations = async (req, res) => {
  try {
    const conceptId = parseInt(req.params.id);
    const concept = await getPaymentConceptById(conceptId);

    if (!concept) {
      return res.status(404).json({ success: false, error: 'Concepto de pago no encontrado' });
    }

    const obligations = await getObligationsByConcept(conceptId);

    res.json({
      success: true,
      data: obligations,
      total: obligations.length
    });

  } catch (error) {
    console.error('Error al obtener obligaciones del concepto:', error);
    res.status(500).json({ success: false, error: 'Error al obtener obligaciones del concepto' });
  }
};

/**
 * Diagnóstico: Verificar estudiantes y niveles disponibles
 */
const diagnose = async (req, res) => {
  try {
    const pool = require('../config/db');
    const academicYearId = req.query.academic_year_id || null;

    // 1. Verificar niveles existentes
    const levelsResult = await pool.query(`
      SELECT id, name, code, status FROM levels WHERE status = 'active' ORDER BY name
    `);

    // 2. Verificar matrículas activas
    const matriculationResult = await pool.query(`
      SELECT
        m.academic_year_id,
        COUNT(*) as total_matriculas,
        COUNT(CASE WHEN m.status = 'active' THEN 1 END) as matriculas_activas
      FROM matriculation m
      ${academicYearId ? 'WHERE m.academic_year_id = $1' : ''}
      GROUP BY m.academic_year_id
      ORDER BY m.academic_year_id DESC
    `, academicYearId ? [academicYearId] : []);

    // 3. Verificar estudiantes con nivel asignado
    const studentsWithLevelResult = await pool.query(`
      SELECT
        l.name as nivel,
        COUNT(s.id) as total_estudiantes,
        COUNT(CASE WHEN s.status = 'active' THEN 1 END) as estudiantes_activos
      FROM students s
      LEFT JOIN levels l ON s.level_id = l.id
      WHERE s.status = 'active'
      GROUP BY l.name
      ORDER BY l.name
    `);

    // 4. Estudiantes matriculados por nivel en año específico
    let enrolledByLevel = [];
    if (academicYearId) {
      const enrolledResult = await pool.query(`
        SELECT
          l.name as nivel,
          COUNT(DISTINCT s.id) as estudiantes_matriculados
        FROM students s
        INNER JOIN matriculation m ON s.id = m.student_id
        LEFT JOIN levels l ON s.level_id = l.id
        WHERE m.academic_year_id = $1
          AND m.status = 'active'
          AND s.status = 'active'
        GROUP BY l.name
        ORDER BY l.name
      `, [academicYearId]);
      enrolledByLevel = enrolledResult.rows;
    }

    res.json({
      success: true,
      diagnosis: {
        levels: levelsResult.rows,
        matriculation_summary: matriculationResult.rows,
        students_by_level: studentsWithLevelResult.rows,
        enrolled_by_level: enrolledByLevel,
        notes: [
          'Para que se generen obligaciones, los estudiantes deben:',
          '1. Tener status = "active"',
          '2. Tener una matrícula activa (status = "active") para el año académico',
          '3. Tener un level_id que coincida con un nivel existente',
          '4. El nombre del nivel debe coincidir (case-insensitive) con los niveles del concepto'
        ]
      }
    });
  } catch (error) {
    console.error('Error en diagnóstico:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getAll, getById, create, update, remove, regenerate, getObligations, diagnose };
