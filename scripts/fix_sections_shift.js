/**
 * Script para corregir el turno de todas las secciones
 * Cambia 'tarde' o 'Tarde' a 'mañana' ya que el colegio opera en turno único
 *
 * Ejecutar con: node scripts/fix_sections_shift.js
 */

const pool = require('../config/db');

async function fixSectionsShift() {
  console.log('='.repeat(60));
  console.log('Corrección de turnos en secciones');
  console.log('='.repeat(60));

  try {
    // Verificar cuántas secciones tienen turno 'tarde'
    const checkResult = await pool.query(`
      SELECT id, name, shift, grade_id
      FROM sections
      WHERE LOWER(shift) = 'tarde'
    `);

    console.log(`\nSecciones con turno 'tarde' encontradas: ${checkResult.rows.length}`);

    if (checkResult.rows.length === 0) {
      console.log('No hay secciones que corregir. Todas tienen turno correcto.');
      return;
    }

    // Mostrar las secciones que se van a corregir
    console.log('\nSecciones a corregir:');
    checkResult.rows.forEach(section => {
      console.log(`  - ID: ${section.id}, Nombre: ${section.name}, Turno actual: ${section.shift}`);
    });

    // Actualizar todas las secciones con turno 'tarde' a 'mañana'
    const updateResult = await pool.query(`
      UPDATE sections
      SET shift = 'mañana',
          date_time_modification = CURRENT_TIMESTAMP
      WHERE LOWER(shift) = 'tarde'
      RETURNING id, name, shift
    `);

    console.log(`\n✓ ${updateResult.rows.length} secciones actualizadas correctamente a turno 'mañana'`);

    // Verificar el resultado
    const verifyResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM sections
      WHERE LOWER(shift) = 'tarde'
    `);

    if (parseInt(verifyResult.rows[0].count) === 0) {
      console.log('✓ Verificación exitosa: No quedan secciones con turno "tarde"');
    } else {
      console.log(`⚠ Advertencia: Aún hay ${verifyResult.rows[0].count} secciones con turno "tarde"`);
    }

  } catch (error) {
    console.error('Error al corregir turnos:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Ejecutar el script
fixSectionsShift()
  .then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('Script finalizado');
    console.log('='.repeat(60));
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
