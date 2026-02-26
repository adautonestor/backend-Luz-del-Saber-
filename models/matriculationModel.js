const pool = require('../config/db');
const { validateStudentHasParent } = require('./studentsModel');

const getAllMatriculations = async (filters = {}) => {
  let query = `
    SELECT m.*, s.first_names AS student_first_names, s.last_names AS student_last_names, s.code AS student_code,
           l.name AS nivel_nombre, g.name AS grado_nombre, sec.name AS seccion_nombre,
           ay.name AS academic_year_nombre
    FROM matriculation m
    INNER JOIN students s ON m.student_id = s.id
    LEFT JOIN levels l ON m.level_id = l.id
    LEFT JOIN grades g ON m.grade_id = g.id
    LEFT JOIN sections sec ON m.section_id = sec.id
    LEFT JOIN academic_years ay ON m.academic_year_id = ay.id
    WHERE m.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.student_id) {
    query += ` AND m.student_id = $${paramCount}`;
    params.push(filters.student_id);
    paramCount++;
  }

  if (filters.academic_year_id) {
    query += ` AND m.academic_year_id = $${paramCount}`;
    params.push(filters.academic_year_id);
    paramCount++;
  }

  if (filters.level_id) {
    query += ` AND m.level_id = $${paramCount}`;
    params.push(filters.level_id);
    paramCount++;
  }

  if (filters.grade_id) {
    query += ` AND m.grade_id = $${paramCount}`;
    params.push(filters.grade_id);
    paramCount++;
  }

  if (filters.section_id) {
    query += ` AND m.section_id = $${paramCount}`;
    params.push(filters.section_id);
    paramCount++;
  }

  if (filters.status) {
    query += ` AND m.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }

  // Filtro por teacher_id: obtener matrículas de estudiantes que tienen al profesor asignado en algún curso
  if (filters.teacher_id) {
    query = `
      SELECT DISTINCT m.*, s.first_names AS student_first_names, s.last_names AS student_last_names, s.code AS student_code,
             l.name AS nivel_nombre, g.name AS grado_nombre, sec.name AS seccion_nombre,
             ay.name AS academic_year_nombre
      FROM matriculation m
      INNER JOIN students s ON m.student_id = s.id
      LEFT JOIN levels l ON m.level_id = l.id
      LEFT JOIN grades g ON m.grade_id = g.id
      LEFT JOIN sections sec ON m.section_id = sec.id
      LEFT JOIN academic_years ay ON m.academic_year_id = ay.id
      INNER JOIN course_assignments ca ON ca.status = 'active'
        AND ca.academic_year_id = m.academic_year_id
        AND (
          ca.section_id = m.section_id
          OR (ca.section_id IS NULL AND ca.grade_id = m.grade_id)
        )
      WHERE m.status = 'active' AND ca.teacher_id = $${paramCount}
    `;
    params.push(filters.teacher_id);
    paramCount++;
  }

  query += ' ORDER BY m.enrollment_date DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getMatriculationById = async (id) => {
  const query = `
    SELECT m.*, s.first_names AS student_first_names, s.last_names AS student_last_names,
           l.name AS nivel_nombre, g.name AS grado_nombre, sec.name AS seccion_nombre
    FROM matriculation m
    INNER JOIN students s ON m.student_id = s.id
    LEFT JOIN levels l ON m.level_id = l.id
    LEFT JOIN grades g ON m.grade_id = g.id
    LEFT JOIN sections sec ON m.section_id = sec.id
    WHERE m.id = $1 AND m.status = 'active'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const getMatriculationByStudentAndYear = async (studentId, academicYearId) => {
  const query = `
    SELECT * FROM matriculation
    WHERE student_id = $1 AND academic_year_id = $2 AND status = 'active'
  `;
  const result = await pool.query(query, [studentId, academicYearId]);
  return result.rows[0] || null;
};

const createMatriculation = async (data, userId) => {
  const { student_id, academic_year_id, level_id, grade_id, section_id, enrollment_date, status, observations, contract_file_path } = data;

  // Validación estricta: todos los campos _id son obligatorios
  if (!academic_year_id) {
    throw new Error('academic_year_id es obligatorio');
  }
  if (!level_id) {
    throw new Error('level_id es obligatorio');
  }
  if (!grade_id) {
    throw new Error('grade_id es obligatorio');
  }
  if (!section_id) {
    throw new Error('section_id es obligatorio');
  }
  if (!student_id) {
    throw new Error('student_id es obligatorio');
  }

  // INSERT usando exclusivamente campos _id
  const result = await pool.query(
    `INSERT INTO matriculation (student_id, academic_year_id, level_id, grade_id, section_id, enrollment_date, status, observations, contract_file_path, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP) RETURNING *`,
    [student_id, academic_year_id, level_id, grade_id, section_id, enrollment_date || new Date(), status || 'pending', observations, contract_file_path || null, userId]
  );
  return result.rows[0];
};

const updateMatriculation = async (id, data, userId) => {
  // Obtener la matrícula actual para hacer merge de datos
  const current = await getMatriculationById(id);
  if (!current) {
    throw new Error('Matrícula no encontrada');
  }

  // Merge: usar valores actuales si no se proporcionan nuevos
  const mergedData = {
    level_id: data.level_id !== undefined ? data.level_id : current.level_id,
    grade_id: data.grade_id !== undefined ? data.grade_id : current.grade_id,
    section_id: data.section_id !== undefined ? data.section_id : current.section_id,
    status: data.status !== undefined ? data.status : current.status,
    observations: data.observations !== undefined ? data.observations : current.observations,
    contract_file_path: data.contract_file_path !== undefined ? data.contract_file_path : current.contract_file_path
  };

  const query = `UPDATE matriculation SET
     level_id = $1, grade_id = $2, section_id = $3,
     status = $4, observations = $5,
     contract_file_path = $6,
     user_id_modification = $7, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $8 RETURNING *`;

  const params = [
    mergedData.level_id,
    mergedData.grade_id,
    mergedData.section_id,
    mergedData.status,
    mergedData.observations,
    mergedData.contract_file_path,
    userId,
    id
  ];

  const result = await pool.query(query, params);
  return result.rows[0];
};

const approveMatriculation = async (id, userId) => {
  const result = await pool.query(
    `UPDATE matriculation SET status = 'active',
     user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $2 RETURNING *`,
    [userId, id]
  );
  return result.rows[0];
};

const deleteMatriculation = async (id, userId) => {
  await pool.query(
    'UPDATE matriculation SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactive', userId, id]
  );
  return true;
};

/**
 * Actualizar solo el campo contract_file_path de una matrícula
 * @param {number} id - ID de la matrícula
 * @param {string|null} contractFilePath - Ruta del archivo de contrato (null para eliminar)
 * @param {number} userId - ID del usuario que realiza la modificación
 * @returns {Promise<Object>} Matrícula actualizada
 */
const updateContractFilePath = async (id, contractFilePath, userId) => {
  const result = await pool.query(
    `UPDATE matriculation SET
     contract_file_path = $1,
     user_id_modification = $2,
     date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $3 RETURNING *`,
    [contractFilePath, userId, id]
  );
  return result.rows[0];
};

/**
 * Crear matrícula con transacción atómica
 * Incluye: creación de matrícula + actualización de estudiante + generación de obligaciones de pago
 * Si alguna parte falla, se hace rollback automático
 * @param {Object} data - Datos de la matrícula
 * @param {Array} paymentSchedule - Cronograma de pagos a generar
 * @param {number} userId - ID del usuario que registra
 * @returns {Promise<Object>} Matrícula creada con obligaciones generadas
 */
const createMatriculationWithTransaction = async (data, paymentSchedule = [], userId) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    console.log('🔄 Iniciando transacción de matrícula...')

    // PASO 0: Validar que el estudiante tenga padre/tutor asignado
    console.log('  [0/3] Validando padre/tutor del estudiante...')
    const parentValidation = await validateStudentHasParent(data.student_id)

    if (!parentValidation.hasParent) {
      throw new Error(parentValidation.error || 'El estudiante debe tener un padre/tutor asignado antes de ser matriculado')
    }

    console.log(`  ✓ Validación exitosa: Padre asignado (${parentValidation.parentInfo.first_names} ${parentValidation.parentInfo.last_names})`)

    // PASO 1: Crear matrícula
    console.log('  [1/3] Creando matrícula...')
    const { student_id, academic_year_id, level_id, grade_id, section_id, enrollment_date, status, observations, contract_file_path } = data

    // Validación estricta: todos los campos _id son obligatorios
    if (!academic_year_id) throw new Error('academic_year_id es obligatorio')
    if (!level_id) throw new Error('level_id es obligatorio')
    if (!grade_id) throw new Error('grade_id es obligatorio')
    if (!section_id) throw new Error('section_id es obligatorio')
    if (!student_id) throw new Error('student_id es obligatorio')

    // Obtener el año académico para las obligaciones de pago
    const yearData = await client.query('SELECT year FROM academic_years WHERE id = $1', [academic_year_id])
    if (yearData.rows.length === 0) {
      throw new Error(`No se encontró año académico con ID ${academic_year_id}`)
    }
    const academicYear = yearData.rows[0].year

    // INSERT usando exclusivamente campos _id
    const matriculationResult = await client.query(
      `INSERT INTO matriculation (student_id, academic_year_id, level_id, grade_id, section_id, enrollment_date, status, observations, contract_file_path, user_id_registration, date_time_registration)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP) RETURNING *`,
      [student_id, academic_year_id, level_id, grade_id, section_id, enrollment_date || new Date(), status || 'active', observations, contract_file_path || null, userId]
    )

    const newMatriculation = matriculationResult.rows[0]
    console.log(`  ✓ Matrícula creada: ID ${newMatriculation.id}`)

    // PASO 2: Actualizar estudiante (incluyendo código con año lectivo)
    console.log('  [2/3] Actualizando estudiante...')

    // Generar código con el año del año lectivo seleccionado
    const newCode = `EST-${student_id}-${academicYear}`

    await client.query(
      `UPDATE students
       SET level_id = $1, grade_id = $2, section_id = $3, academic_year_id = $4, status = $5,
           code = $6, user_id_modification = $7, date_time_modification = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [level_id, grade_id, section_id, academic_year_id, 'enrolled', newCode, userId, student_id]
    )
    console.log(`  ✓ Estudiante actualizado: ID ${student_id}, Código: ${newCode}`)

    // PASO 3: Generar obligaciones de pago
    console.log(`  [3/3] Generando obligaciones de pago (${paymentSchedule.length} items)...`)
    let obligationsCreated = 0

    for (const obligation of paymentSchedule) {
      try {
        // Determinar status y saldo pendiente según exoneración
        const isExempted = obligation.exonerado === true
        const finalStatus = isExempted ? 'exonerado' : 'pending'
        // El total_amount se mantiene para ver qué monto fue exonerado
        // El pending_balance es 0 si está exonerado (no hay deuda)
        const finalPendingBalance = isExempted ? 0 : obligation.total_amount

        await client.query(
          `INSERT INTO payment_obligations
           (student_id, concept_id, academic_year, due_month, due_date, total_amount, paid_amount, pending_balance, generation_date, status, user_id_registration, date_time_registration)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9, $10, CURRENT_TIMESTAMP)`,
          [
            student_id,
            obligation.concept_id,
            academicYear,
            obligation.due_month || null,
            obligation.due_date,
            obligation.total_amount, // Monto original (para referencia)
            0, // paid_amount
            finalPendingBalance, // 0 si exonerado, monto completo si no
            finalStatus, // 'exonerado' o 'pending'
            userId
          ]
        )
        obligationsCreated++
      } catch (error) {
        console.error(`    ⚠️ Error creando obligación: ${error.message}`)
        throw error // Lanzar para hacer rollback
      }
    }

    console.log(`  ✓ ${obligationsCreated} obligaciones creadas`)

    // COMMIT: Todo OK
    await client.query('COMMIT')
    console.log('✅ Transacción completada exitosamente')

    return {
      matriculation: newMatriculation,
      obligationsCreated,
      success: true
    }

  } catch (error) {
    // ROLLBACK: Algo falló
    await client.query('ROLLBACK')
    console.error('❌ Error en transacción, ROLLBACK ejecutado:', error.message)
    throw error
  } finally {
    client.release()
  }
}

module.exports = {
  getAllMatriculations,
  getMatriculationById,
  getMatriculationByStudentAndYear,
  createMatriculation,
  updateMatriculation,
  approveMatriculation,
  deleteMatriculation,
  updateContractFilePath,
  createMatriculationWithTransaction // Nueva función
};
