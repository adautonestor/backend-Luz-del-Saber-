/**
 * 📊 GRADE AVERAGE SERVICE
 *
 * Servicio para calcular promedios ponderados de competencias
 * Usa la estructura de evaluación y los pesos configurados por el profesor
 */

const pool = require('../config/db');
const gradingScalesService = require('./gradingScalesService');

/**
 * Genera el ID de una competencia de la misma manera que el frontend
 * @param {object} competency - Objeto de competencia
 * @param {number} index - Índice de la competencia
 * @returns {string} ID generado
 */
function generateCompetencyId(competency, index) {
  if (competency.id) {
    return competency.id;
  }

  const competenceName = competency.nombreCompetencia || competency.name || `Competencia ${competency.numero || index + 1}`;
  return `COMP_${competenceName.replace(/\s+/g, '_').toUpperCase()}`;
}

/**
 * Calcula el promedio ponderado de una competencia para un estudiante en un bimestre
 *
 * @param {number} studentId - ID del estudiante
 * @param {number} courseId - ID del curso
 * @param {string} categoryId - ID de la categoría/competencia
 * @param {number} quarter - Número de bimestre (1-4)
 * @returns {Promise<{average: number|null, details: object}>}
 */
async function calculateCompetencyAverage(studentId, courseId, categoryId, quarter) {
  try {
    // 0. Obtener el nivel del estudiante para usar la escala correcta
    const studentQuery = await pool.query(
      `SELECT s.level_id, ay.id as academic_year_id
       FROM students s
       LEFT JOIN academic_years ay ON ay.status = 'active'
       WHERE s.id = $1
       LIMIT 1`,
      [studentId]
    );

    const levelId = studentQuery.rows[0]?.level_id;
    const academicYearId = studentQuery.rows[0]?.academic_year_id;

    // 1. Obtener la estructura de evaluación
    const structureQuery = await pool.query(
      `SELECT competencies
       FROM evaluation_structures
       WHERE course_id = $1 AND quarter = $2 AND status = 'active'
       LIMIT 1`,
      [courseId, quarter]
    );

    if (structureQuery.rows.length === 0) {
      return { average: null, details: { error: 'No evaluation structure found' } };
    }

    const structure = structureQuery.rows[0].competencies;

    // Manejar tanto estructuras con objeto {competencias: [...]} como arrays directos
    const competencias = structure.competencias || (Array.isArray(structure) ? structure : []);

    if (!competencias || competencias.length === 0) {
      return { average: null, details: { error: 'Invalid evaluation structure' } };
    }

    // 2. Buscar la competencia específica generando IDs si es necesario
    const competency = competencias.find((comp, index) => {
      const compId = generateCompetencyId(comp, index);
      return compId === categoryId;
    });

    if (!competency) {
      return { average: null, details: { error: 'Competency not found in structure' } };
    }

    const subcategories = competency.subcategorias || [];

    if (subcategories.length === 0) {
      return { average: null, details: { error: 'No subcategories configured' } };
    }

    // 3. Calcular el promedio ponderado
    let weightedSum = 0;
    let totalWeight = 0;
    const details = {
      competency: competency.nombreCompetencia,
      levelId,
      subcategories: []
    };

    for (const subcategory of subcategories) {
      // El peso en la BD está en porcentaje (0-100), convertir a decimal (0-1)
      const pesoPercentage = parseFloat(subcategory.peso || subcategory.weight || 0);
      const weight = pesoPercentage / 100;

      if (weight > 0) {
        // Buscar la nota del estudiante para esta subcategoría
        const gradeQuery = await pool.query(
          `SELECT value, grading_system
           FROM competency_grades
           WHERE student_id = $1
             AND course_id = $2
             AND category_id = $3
             AND subcategory_id = $4
             AND quarter = $5
             AND status = 'active'
           LIMIT 1`,
          [studentId, courseId, categoryId, subcategory.id, quarter]
        );

        if (gradeQuery.rows.length > 0) {
          const { value, grading_system } = gradeQuery.rows[0];
          let gradeValue;

          // Convertir la nota según el sistema de calificación usando el servicio centralizado
          if (grading_system === 'literal') {
            // Usar servicio de escalas para conversión dinámica
            gradeValue = await gradingScalesService.convertLetterToNumeric(value, levelId, academicYearId);
          } else {
            // Para escalas numéricas: usar el valor directamente
            gradeValue = parseFloat(value);
            if (isNaN(gradeValue)) {
              gradeValue = null;
            }
          }

          if (gradeValue !== null) {
            const contribution = gradeValue * weight;

            weightedSum += contribution;
            totalWeight += weight;

            details.subcategories.push({
              name: subcategory.name,
              weight: weight * 100,
              grade: gradeValue,
              gradeDisplay: grading_system === 'literal' ? String(value).toUpperCase() : gradeValue,
              contribution
            });
          }
        } else {
          details.subcategories.push({
            name: subcategory.name,
            weight: weight * 100,
            grade: null,
            contribution: 0
          });
        }
      }
    }

    // 4. Calcular el promedio final
    if (totalWeight > 0) {
      const average = weightedSum; // Ya está ponderado

      details.weightedSum = weightedSum;
      details.totalWeight = totalWeight * 100; // Convertir a porcentaje para visualización
      details.average = parseFloat(average.toFixed(2));

      return { average: parseFloat(average.toFixed(2)), details };
    } else {
      return { average: null, details: { ...details, error: 'No valid grades with weight' } };
    }

  } catch (error) {
    console.error('Error calculando promedio de competencia:', error);
    throw error;
  }
}

/**
 * Recalcula todos los promedios de un estudiante en un curso/bimestre
 *
 * @param {number} studentId
 * @param {number} courseId
 * @param {number} quarter
 * @returns {Promise<Array>} Array de promedios calculados por competencia
 */
async function recalculateAllAverages(studentId, courseId, quarter) {
  try {
    // Obtener la estructura de evaluación
    const structureQuery = await pool.query(
      `SELECT competencies
       FROM evaluation_structures
       WHERE course_id = $1 AND quarter = $2 AND status = 'active'
       LIMIT 1`,
      [courseId, quarter]
    );

    if (structureQuery.rows.length === 0) {
      return [];
    }

    const structure = structureQuery.rows[0].competencies;

    // Manejar tanto estructuras con objeto {competencias: [...]} como arrays directos
    const competencias = structure.competencias || (Array.isArray(structure) ? structure : []);

    if (!competencias || competencias.length === 0) {
      return [];
    }

    // Calcular promedio para cada competencia
    const averages = [];

    for (let index = 0; index < competencias.length; index++) {
      const competency = competencias[index];
      const compId = generateCompetencyId(competency, index);

      const result = await calculateCompetencyAverage(studentId, courseId, compId, quarter);

      if (result.average !== null) {
        averages.push({
          categoryId: compId,
          categoryName: competency.nombreCompetencia || competency.name,
          average: result.average,
          details: result.details
        });
      }
    }

    return averages;
  } catch (error) {
    console.error('Error recalculando todos los promedios:', error);
    throw error;
  }
}

/**
 * Guarda o actualiza el promedio calculado en la tabla competency_quarter_averages
 *
 * @param {number} studentId
 * @param {number} courseId
 * @param {string} categoryId
 * @param {number} quarter
 * @param {number} averageValue
 * @param {number} academicYearId
 * @param {string} gradingSystem
 * @param {object} calculationDetails
 * @returns {Promise<void>}
 */
async function saveCompetencyAverage(studentId, courseId, categoryId, quarter, averageValue, academicYearId, gradingSystem, calculationDetails = null) {
  try {
    await pool.query(
      `INSERT INTO competency_quarter_averages
        (student_id, course_id, category_id, quarter, average_value, academic_year_id, grading_system, calculation_details, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (student_id, course_id, category_id, quarter, academic_year_id)
       DO UPDATE SET
         average_value = $5,
         calculation_details = $8,
         updated_at = NOW()`,
      [studentId, courseId, categoryId, quarter, averageValue, academicYearId, gradingSystem, calculationDetails ? JSON.stringify(calculationDetails) : null]
    );
  } catch (error) {
    console.error('❌ Error guardando promedio en BD:', error);
    throw error;
  }
}

/**
 * Elimina el promedio de una competencia (cuando ya no hay notas)
 *
 * @param {number} studentId
 * @param {number} courseId
 * @param {string} categoryId
 * @param {number} quarter
 * @param {number} academicYearId
 * @returns {Promise<void>}
 */
async function deleteCompetencyAverage(studentId, courseId, categoryId, quarter, academicYearId) {
  try {
    await pool.query(
      `DELETE FROM competency_quarter_averages
       WHERE student_id = $1 AND course_id = $2 AND category_id = $3 AND quarter = $4 AND academic_year_id = $5`,
      [studentId, courseId, categoryId, quarter, academicYearId]
    );
  } catch (error) {
    console.error('❌ Error eliminando promedio de BD:', error);
    throw error;
  }
}

/**
 * Obtener promedios guardados desde la base de datos
 * @param {number} studentId - ID del estudiante
 * @param {number} courseId - ID del curso (opcional)
 * @param {number} quarter - Número de bimestre
 * @param {number} academicYearId - ID del año académico
 * @returns {Promise<Array>} Array de promedios guardados
 */
async function getSavedAverages(studentId, courseId = null, quarter, academicYearId) {
  let query = `
    SELECT
      id,
      student_id,
      course_id,
      category_id,
      quarter,
      average_value,
      academic_year_id,
      grading_system,
      calculation_details,
      updated_at
    FROM competency_quarter_averages
    WHERE student_id = $1 AND quarter = $2 AND academic_year_id = $3
  `;

  const params = [studentId, quarter, academicYearId];

  if (courseId) {
    query += ` AND course_id = $4`;
    params.push(courseId);
  }

  query += ` ORDER BY course_id, category_id`;

  const result = await pool.query(query, params);

  return result.rows;
}

module.exports = {
  calculateCompetencyAverage,
  recalculateAllAverages,
  saveCompetencyAverage,
  deleteCompetencyAverage,
  getSavedAverages
};
