const pool = require('../config/db');
const { getCurrentAcademicYear } = require('../models/academicYearsModel');

/**
 * Mapa de nombres de meses a números
 */
const MONTH_NAME_TO_NUMBER = {
  'enero': 1,
  'febrero': 2,
  'marzo': 3,
  'abril': 4,
  'mayo': 5,
  'junio': 6,
  'julio': 7,
  'agosto': 8,
  'septiembre': 9,
  'octubre': 10,
  'noviembre': 11,
  'diciembre': 12
};

/**
 * Convertir nombre de mes a número
 * @param {string} monthName - Nombre del mes
 * @returns {number|null} Número del mes o null si no es válido
 */
const monthNameToNumber = (monthName) => {
  if (typeof monthName === 'number') return monthName;
  if (typeof monthName !== 'string') return null;
  return MONTH_NAME_TO_NUMBER[monthName.toLowerCase()] || null;
};

/**
 * Servicio de Generación Automática de Obligaciones de Pago
 *
 * Este servicio se encarga de generar automáticamente obligaciones de pago
 * para estudiantes matriculados cuando se crea o actualiza un concepto de pago.
 *
 * Principios aplicados:
 * - Single Responsibility: Solo se encarga de generar obligaciones
 * - DRY: Reutiliza lógica común
 * - Single Source of Truth: La BD es la única fuente de verdad
 */

/**
 * Obtener estudiantes matriculados aplicables a un concepto de pago
 * @param {number} academicYearId - ID del año académico
 * @param {Object} concept - Concepto de pago con filtros
 * @returns {Promise<Array>} Lista de estudiantes aplicables
 */
const getApplicableStudents = async (academicYearId, concept) => {
  const { levels, excluded_students } = concept;

  console.log(`\n--- Buscando estudiantes aplicables ---`);
  console.log(`Año académico ID: ${academicYearId}`);
  console.log(`Niveles del concepto:`, levels);
  console.log(`Estudiantes excluidos:`, excluded_students);

  // Query mejorada: buscar nivel tanto en student.level_id como en matriculation.level_id
  // Nota: estudiantes pueden tener status 'active' o 'enrolled' (matriculados)
  let query = `
    SELECT DISTINCT s.id, s.code, s.first_names, s.last_names, s.level_id, s.grade_id,
           COALESCE(l_student.name, l_matric.name) AS level_name
    FROM students s
    INNER JOIN matriculation m ON s.id = m.student_id
    LEFT JOIN levels l_student ON s.level_id = l_student.id
    LEFT JOIN levels l_matric ON m.level_id = l_matric.id
    WHERE m.academic_year_id = $1
      AND m.status = 'active'
      AND s.status IN ('active', 'enrolled')
  `;

  const params = [academicYearId];
  let paramCount = 2;

  // Filtrar por niveles (los niveles vienen como nombres en minúsculas: ['inicial', 'primaria', etc.])
  if (levels && Array.isArray(levels) && levels.length > 0) {
    // Normalizar: convertir a string y lowercase, filtrar valores vacíos
    const normalizedLevels = levels
      .map(n => typeof n === 'string' ? n.toLowerCase().trim() : String(n).toLowerCase().trim())
      .filter(n => n.length > 0);

    if (normalizedLevels.length > 0) {
      // Buscar en ambas fuentes de nivel (estudiante o matrícula)
      query += ` AND (LOWER(TRIM(l_student.name)) = ANY($${paramCount}::text[]) OR LOWER(TRIM(l_matric.name)) = ANY($${paramCount}::text[]))`;
      params.push(normalizedLevels);
      console.log(`Filtro de niveles aplicado:`, normalizedLevels);
      paramCount++;
    } else {
      console.log(`Array de niveles vacío después de normalizar - aplica a todos los niveles`);
    }
  } else {
    console.log(`Sin filtro de niveles (applies_to_all) - aplica a todos los niveles`);
  }

  // Excluir estudiantes específicos
  if (excluded_students && Array.isArray(excluded_students) && excluded_students.length > 0) {
    query += ` AND s.id != ALL($${paramCount}::int[])`;
    params.push(excluded_students);
    console.log(`Excluyendo ${excluded_students.length} estudiantes`);
    paramCount++;
  }

  query += ' ORDER BY s.last_names, s.first_names';

  console.log(`Query SQL final:`, query);
  console.log(`Parámetros:`, params);

  const result = await pool.query(query, params);

  console.log(`Total de estudiantes encontrados: ${result.rows.length}`);
  if (result.rows.length > 0) {
    console.log(`Primeros 3 estudiantes:`, result.rows.slice(0, 3).map(s => ({
      id: s.id,
      nombre: `${s.first_names} ${s.last_names}`,
      nivel: s.level_name
    })));
  } else {
    // Diagnóstico adicional si no hay estudiantes
    console.log(`\n⚠️ DIAGNÓSTICO: No se encontraron estudiantes. Verificando datos...`);

    // Verificar si hay matrículas para este año
    const matricCheck = await pool.query(
      `SELECT COUNT(*) as total FROM matriculation WHERE academic_year_id = $1 AND status = 'active'`,
      [academicYearId]
    );
    console.log(`  - Matrículas activas para año ${academicYearId}: ${matricCheck.rows[0].total}`);

    // Verificar detalles de las matrículas
    const matricDetails = await pool.query(
      `SELECT m.id, m.student_id, m.level_id as matric_level_id, m.status as matric_status,
              s.id as student_id, s.first_names, s.last_names, s.level_id as student_level_id, s.status as student_status,
              l_m.name as matric_level_name, l_s.name as student_level_name
       FROM matriculation m
       LEFT JOIN students s ON m.student_id = s.id
       LEFT JOIN levels l_m ON m.level_id = l_m.id
       LEFT JOIN levels l_s ON s.level_id = l_s.id
       WHERE m.academic_year_id = $1 AND m.status = 'active'
       LIMIT 5`,
      [academicYearId]
    );
    console.log(`  - Detalle de matrículas:`, matricDetails.rows.map(m => ({
      matricula_id: m.id,
      estudiante: `${m.first_names} ${m.last_names}`,
      student_status: m.student_status,
      nivel_matricula: m.matric_level_name || `ID: ${m.matric_level_id}`,
      nivel_estudiante: m.student_level_name || `ID: ${m.student_level_id}`
    })));

    // Verificar niveles existentes
    const levelsCheck = await pool.query(
      `SELECT name FROM levels WHERE status = 'active' ORDER BY name`
    );
    console.log(`  - Niveles activos en BD:`, levelsCheck.rows.map(l => l.name));
  }
  console.log(`--- Fin búsqueda de estudiantes ---\n`);

  return result.rows;
};

/**
 * Calcular fecha de vencimiento para una obligación
 * @param {number} year - Año
 * @param {number} month - Mes (1-12)
 * @param {number} dueDay - Día de vencimiento (del concepto)
 * @returns {Date} Fecha de vencimiento
 */
const calculateDueDate = (year, month, dueDay) => {
  // Si no hay día específico, usar el último día del mes
  if (!dueDay) {
    return new Date(year, month, 0); // día 0 = último día del mes anterior
  }

  // Asegurarse que el día no exceda los días del mes
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const day = Math.min(dueDay, lastDayOfMonth);

  return new Date(year, month - 1, day);
};

/**
 * Verificar si una obligación ya existe
 * @param {number} studentId - ID del estudiante
 * @param {number} conceptId - ID del concepto
 * @param {number} academicYear - Año académico
 * @param {number|null} dueMonth - Mes de vencimiento (null para pagos únicos)
 * @returns {Promise<boolean>} true si ya existe
 */
const obligationExists = async (studentId, conceptId, academicYear, dueMonth) => {
  // Para pagos únicos (dueMonth = null), buscar exactamente donde due_month IS NULL
  // Para pagos mensuales, buscar donde due_month = dueMonth
  let query;
  let params;

  if (dueMonth === null || dueMonth === undefined) {
    query = `
      SELECT id FROM payment_obligations
      WHERE student_id = $1
        AND concept_id = $2
        AND academic_year = $3
        AND due_month IS NULL
        AND status != 'deleted'
      LIMIT 1
    `;
    params = [studentId, conceptId, academicYear];
  } else {
    query = `
      SELECT id FROM payment_obligations
      WHERE student_id = $1
        AND concept_id = $2
        AND academic_year = $3
        AND due_month = $4
        AND status != 'deleted'
      LIMIT 1
    `;
    params = [studentId, conceptId, academicYear, dueMonth];
  }

  const result = await pool.query(query, params);
  return result.rows.length > 0;
};

/**
 * Generar obligaciones para un concepto de tipo "mensualidad"
 * @param {Object} concept - Concepto de pago
 * @param {Array} students - Estudiantes aplicables
 * @param {number} userId - ID del usuario que genera
 * @returns {Promise<number>} Cantidad de obligaciones creadas
 */
const generateMonthlyObligations = async (concept, students, userId) => {
  const { id: conceptId, amount, academic_year_id, applicable_months, due_day } = concept;

  if (!applicable_months || !Array.isArray(applicable_months) || applicable_months.length === 0) {
    console.warn(`Concepto ${conceptId} no tiene meses aplicables definidos`);
    return 0;
  }

  const obligations = [];
  const currentYear = new Date().getFullYear();

  // Obtener año académico para validar fechas
  const academicYear = await getCurrentAcademicYear();
  const yearValue = academicYear ? academicYear.year : currentYear;

  // Convertir nombres de meses a números
  const monthNumbers = applicable_months.map(m => monthNameToNumber(m)).filter(m => m !== null);

  if (monthNumbers.length === 0) {
    console.warn(`Concepto ${conceptId}: ninguno de los meses aplicables es válido`);
    return 0;
  }

  for (const student of students) {
    for (const monthNumber of monthNumbers) {
      // Verificar si ya existe
      const exists = await obligationExists(student.id, conceptId, academic_year_id, monthNumber);
      if (exists) {
        console.log(`Obligación ya existe: Estudiante ${student.id}, Concepto ${conceptId}, Mes ${monthNumber}`);
        continue;
      }

      const dueDate = calculateDueDate(yearValue, monthNumber, due_day);

      obligations.push({
        student_id: student.id,
        concept_id: conceptId,
        academic_year: academic_year_id,
        due_month: monthNumber,
        due_date: dueDate.toISOString().split('T')[0],
        total_amount: amount,
        paid_amount: 0,
        pending_balance: amount,
        generation_date: new Date(),
        status: 'pending'
      });
    }
  }

  if (obligations.length === 0) {
    console.log('No hay nuevas obligaciones para crear (todas ya existen)');
    return 0;
  }

  // Inserción masiva con transacción
  const client = await pool.connect();
  let createdCount = 0;

  try {
    await client.query('BEGIN');

    for (const obl of obligations) {
      await client.query(
        `INSERT INTO payment_obligations
         (student_id, concept_id, academic_year, due_month, due_date, total_amount, paid_amount, pending_balance, generation_date, status, user_id_registration, date_time_registration)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)`,
        [
          obl.student_id,
          obl.concept_id,
          obl.academic_year,
          obl.due_month,
          obl.due_date,
          obl.total_amount,
          obl.paid_amount,
          obl.pending_balance,
          obl.generation_date,
          obl.status,
          userId
        ]
      );
      createdCount++;
    }

    await client.query('COMMIT');
    console.log(`✓ ${createdCount} obligaciones mensuales creadas exitosamente`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al insertar obligaciones mensuales:', error);
    throw error;
  } finally {
    client.release();
  }

  return createdCount;
};

/**
 * Generar obligaciones para un concepto de tipo "unico"
 * @param {Object} concept - Concepto de pago
 * @param {Array} students - Estudiantes aplicables
 * @param {number} userId - ID del usuario que genera
 * @returns {Promise<number>} Cantidad de obligaciones creadas
 */
const generateUniqueObligations = async (concept, students, userId) => {
  const { id: conceptId, amount, academic_year_id, unique_payment_date } = concept;

  console.log(`\n=== Generando obligaciones ÚNICAS ===`);
  console.log(`Concepto ID: ${conceptId}`);
  console.log(`Monto: ${amount}`);
  console.log(`Fecha de pago única: ${unique_payment_date}`);
  console.log(`Estudiantes a procesar: ${students.length}`);

  if (!unique_payment_date) {
    console.warn(`Concepto ${conceptId} de tipo único no tiene fecha de pago definida`);
    return 0;
  }

  const obligations = [];
  let existingCount = 0;
  let newCount = 0;

  for (const student of students) {
    // Verificar si ya existe (sin mes)
    const exists = await obligationExists(student.id, conceptId, academic_year_id, null);
    if (exists) {
      console.log(`✓ Ya existe: Estudiante ${student.first_names} ${student.last_names} (ID: ${student.id})`);
      existingCount++;
      continue;
    }

    console.log(`+ Nueva: Estudiante ${student.first_names} ${student.last_names} (ID: ${student.id})`);
    newCount++;

    obligations.push({
      student_id: student.id,
      concept_id: conceptId,
      academic_year: academic_year_id,
      due_month: null,
      due_date: unique_payment_date,
      total_amount: amount,
      paid_amount: 0,
      pending_balance: amount,
      generation_date: new Date(),
      status: 'pending'
    });
  }

  console.log(`\nResumen: ${existingCount} ya existían, ${newCount} nuevas a crear`);

  if (obligations.length === 0) {
    console.log('No hay nuevas obligaciones únicas para crear (todas ya existen)');
    return 0;
  }

  // Inserción masiva con transacción
  const client = await pool.connect();
  let createdCount = 0;

  try {
    await client.query('BEGIN');

    for (const obl of obligations) {
      await client.query(
        `INSERT INTO payment_obligations
         (student_id, concept_id, academic_year, due_month, due_date, total_amount, paid_amount, pending_balance, generation_date, status, user_id_registration, date_time_registration)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)`,
        [
          obl.student_id,
          obl.concept_id,
          obl.academic_year,
          obl.due_month,
          obl.due_date,
          obl.total_amount,
          obl.paid_amount,
          obl.pending_balance,
          obl.generation_date,
          obl.status,
          userId
        ]
      );
      createdCount++;
    }

    await client.query('COMMIT');
    console.log(`✓ ${createdCount} obligaciones únicas creadas exitosamente`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al insertar obligaciones únicas:', error);
    throw error;
  } finally {
    client.release();
  }

  return createdCount;
};

/**
 * Generar obligaciones automáticamente para un concepto de pago
 * @param {Object} concept - Concepto de pago recién creado/actualizado
 * @param {number} userId - ID del usuario que ejecuta la acción
 * @returns {Promise<Object>} Resultado con conteo de obligaciones generadas
 */
const generateObligationsForConcept = async (concept, userId) => {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`GENERACIÓN DE OBLIGACIONES - INICIO`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Concepto: ${concept?.name || 'N/A'} (ID: ${concept?.id || 'N/A'})`);
    console.log(`Tipo: ${concept?.type || 'N/A'}`);
    console.log(`Status: ${concept?.status || 'N/A'}`);
    console.log(`Monto: ${concept?.amount || 'N/A'}`);
    console.log(`Academic Year ID: ${concept?.academic_year_id || 'N/A'}`);
    console.log(`Niveles:`, concept?.levels || 'null');
    console.log(`Meses aplicables:`, concept?.applicable_months || 'null');
    console.log(`Fecha pago único:`, concept?.unique_payment_date || 'null');
    console.log(`User ID:`, userId);

    // Validaciones básicas
    if (!concept || !concept.id || !concept.academic_year_id) {
      console.error(`✗ ERROR: Concepto inválido`);
      console.error(`  - concept: ${!!concept}`);
      console.error(`  - concept.id: ${concept?.id}`);
      console.error(`  - concept.academic_year_id: ${concept?.academic_year_id}`);
      throw new Error('Concepto inválido o sin año académico');
    }

    if (concept.status !== 'active') {
      console.log(`✗ Concepto no está activo (status: ${concept.status}), no se generarán obligaciones`);
      return { created: 0, students: 0 };
    }

    // Obtener estudiantes aplicables
    console.log(`\n--- Buscando estudiantes aplicables ---`);
    const students = await getApplicableStudents(concept.academic_year_id, concept);

    if (students.length === 0) {
      console.log(`✗ No hay estudiantes matriculados aplicables para este concepto`);
      return { created: 0, students: 0 };
    }

    console.log(`✓ Estudiantes aplicables encontrados: ${students.length}`);

    let createdCount = 0;

    // Generar obligaciones según el tipo
    if (concept.type === 'mensualidad') {
      console.log(`\n--- Generando obligaciones MENSUALES ---`);
      createdCount = await generateMonthlyObligations(concept, students, userId);
    } else if (concept.type === 'unico') {
      console.log(`\n--- Generando obligaciones ÚNICAS ---`);
      createdCount = await generateUniqueObligations(concept, students, userId);
    } else {
      console.warn(`✗ Tipo de concepto desconocido: ${concept.type}`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`GENERACIÓN DE OBLIGACIONES - FIN`);
    console.log(`Resultado: ${createdCount} obligaciones creadas para ${students.length} estudiantes`);
    console.log(`${'='.repeat(60)}\n`);

    return {
      created: createdCount,
      students: students.length,
      type: concept.type
    };

  } catch (error) {
    console.error(`\n${'!'.repeat(60)}`);
    console.error(`ERROR EN GENERACIÓN DE OBLIGACIONES`);
    console.error(`Mensaje: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    console.error(`${'!'.repeat(60)}\n`);
    throw error;
  }
};

/**
 * Eliminar obligaciones generadas para un concepto
 * (útil para regeneración)
 * @param {number} conceptId - ID del concepto
 * @param {number} academicYearId - ID del año académico
 * @param {number} userId - ID del usuario que ejecuta
 * @returns {Promise<number>} Cantidad de obligaciones eliminadas
 */
const deleteObligationsForConcept = async (conceptId, academicYearId, userId) => {
  const query = `
    UPDATE payment_obligations
    SET status = 'deleted',
        user_id_modification = $1,
        date_time_modification = CURRENT_TIMESTAMP
    WHERE concept_id = $2
      AND academic_year = $3
      AND status != 'paid'
      AND paid_amount = 0
  `;

  const result = await pool.query(query, [userId, conceptId, academicYearId]);
  return result.rowCount;
};

module.exports = {
  generateObligationsForConcept,
  deleteObligationsForConcept,
  getApplicableStudents
};
