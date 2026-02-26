/**
 * Script para recalcular promedios de competencias faltantes
 *
 * Este script:
 * 1. Busca todas las notas en competency_grades
 * 2. Agrupa por student_id, course_id, category_id, quarter
 * 3. Calcula el promedio usando gradeAverageService
 * 4. Guarda el promedio en competency_quarter_averages
 */

const pool = require('../config/db');
const { calculateCompetencyAverage, saveCompetencyAverage } = require('../services/gradeAverageService');

async function recalculateAllAverages() {
  try {
    console.log('🔄 Iniciando recálculo de promedios...\n');

    // Obtener todas las combinaciones únicas de student_id, course_id, category_id, quarter
    const query = `
      SELECT DISTINCT
        student_id,
        course_id,
        category_id,
        quarter,
        grading_system
      FROM competency_grades
      WHERE status = 'active'
        AND category_id IS NOT NULL
      ORDER BY student_id, course_id, quarter, category_id
    `;

    const result = await pool.query(query);
    console.log(`📊 Encontradas ${result.rows.length} combinaciones para recalcular\n`);

    let successCount = 0;
    let errorCount = 0;
    let skipCount = 0;

    for (const row of result.rows) {
      const { student_id, course_id, category_id, quarter, grading_system } = row;

      try {
        console.log(`\n📐 Calculando promedio para:`);
        console.log(`   Estudiante: ${student_id}, Curso: ${course_id}, Competencia: ${category_id}, Bimestre: ${quarter}`);

        // Calcular el promedio
        const averageResult = await calculateCompetencyAverage(
          student_id,
          course_id,
          category_id,
          quarter
        );

        if (averageResult.average !== null) {
          // Obtener academic_year_id del course_assignment
          const assignmentQuery = await pool.query(
            `SELECT academic_year_id
             FROM course_assignments
             WHERE course_id = $1 AND status = 'active'
             LIMIT 1`,
            [course_id]
          );

          if (assignmentQuery.rows.length > 0) {
            const academicYearId = assignmentQuery.rows[0].academic_year_id;

            // Guardar el promedio
            await saveCompetencyAverage(
              student_id,
              course_id,
              category_id,
              quarter,
              averageResult.average,
              academicYearId,
              grading_system || 'literal',
              averageResult.details
            );

            console.log(`   ✅ Promedio guardado: ${averageResult.average}`);
            successCount++;
          } else {
            console.log(`   ⚠️  No se encontró course_assignment activo`);
            skipCount++;
          }
        } else {
          console.log(`   ⚠️  No se pudo calcular promedio (sin estructura o sin notas válidas)`);
          skipCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n\n📈 Resumen:');
    console.log(`   ✅ Exitosos: ${successCount}`);
    console.log(`   ⚠️  Omitidos: ${skipCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    console.log(`   📊 Total procesados: ${result.rows.length}`);

  } catch (error) {
    console.error('❌ Error fatal en recálculo de promedios:', error);
    throw error;
  }
}

// Ejecutar el script
recalculateAllAverages()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script finalizado con errores:', error);
    process.exit(1);
  });
