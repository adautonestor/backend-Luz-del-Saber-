const pool = require('../config/db');

/**
 * Obtener todos los estudiantes con información relacionada
 * @param {Object} filters - Filtros opcionales (level_id, grade_id, section_id, status, academic_year_id)
 * @returns {Promise<Array>} Lista de estudiantes
 */
const getAllStudents = async (filters = {}) => {
  let query = `
    SELECT
      s.*,
      l.name AS level_name,
      g.name AS grade_name,
      sec.name AS section_name,
      ay.name AS academic_year_name,
      m.contract_file_path AS attached_contract,
      m.enrollment_date AS matriculation_date,
      -- Datos del padre/apoderado principal
      parent_info.parent_id,
      parent_info.parent_name,
      parent_info.parent_phone,
      parent_info.parent_email,
      parent_info.parent_relationship
    FROM students s
    LEFT JOIN levels l ON s.level_id = l.id
    LEFT JOIN grades g ON s.grade_id = g.id
    LEFT JOIN sections sec ON s.section_id = sec.id
    LEFT JOIN academic_years ay ON s.academic_year_id = ay.id
    LEFT JOIN LATERAL (
      SELECT contract_file_path, enrollment_date
      FROM matriculation
      WHERE student_id = s.id
      ORDER BY academic_year_id DESC
      LIMIT 1
    ) m ON true
    -- Obtener datos del padre principal desde el array JSON 'parents'
    LEFT JOIN LATERAL (
      SELECT
        u.id AS parent_id,
        CONCAT(u.first_name, ' ', u.last_names) AS parent_name,
        u.phone AS parent_phone,
        u.email AS parent_email,
        p->>'relationship' AS parent_relationship
      FROM jsonb_array_elements(COALESCE(s.parents, '[]'::jsonb)) AS p
      LEFT JOIN users u ON u.id = (p->>'user_id')::int
      WHERE (p->>'user_id') IS NOT NULL
      ORDER BY (p->>'is_primary')::boolean DESC NULLS LAST
      LIMIT 1
    ) parent_info ON true
    WHERE s.status != 'deleted'
  `;

  const params = [];
  let paramCount = 1;

  if (filters.level_id) {
    query += ` AND s.level_id = $${paramCount}`;
    params.push(filters.level_id);
    paramCount++;
  }

  if (filters.grade_id) {
    query += ` AND s.grade_id = $${paramCount}`;
    params.push(filters.grade_id);
    paramCount++;
  }

  if (filters.section_id) {
    query += ` AND s.section_id = $${paramCount}`;
    params.push(filters.section_id);
    paramCount++;
  }

  if (filters.status) {
    query += ` AND s.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }

  if (filters.academic_year_id) {
    query += ` AND s.academic_year_id = $${paramCount}`;
    params.push(filters.academic_year_id);
    paramCount++;
  }

  query += ` ORDER BY s.last_names, s.first_names`;

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Obtener un estudiante por ID
 * @param {number} id - ID del estudiante
 * @returns {Promise<Object|null>} Estudiante encontrado o null
 */
const getStudentById = async (id) => {
  const query = `
    SELECT
      s.*,
      l.name AS level_name,
      g.name AS grade_name,
      sec.name AS section_name,
      ay.name AS academic_year_name,
      m.contract_file_path AS attached_contract,
      m.enrollment_date AS matriculation_date,
      -- Datos del padre/apoderado principal
      parent_info.parent_id,
      parent_info.parent_name,
      parent_info.parent_phone,
      parent_info.parent_email,
      parent_info.parent_relationship
    FROM students s
    LEFT JOIN levels l ON s.level_id = l.id
    LEFT JOIN grades g ON s.grade_id = g.id
    LEFT JOIN sections sec ON s.section_id = sec.id
    LEFT JOIN academic_years ay ON s.academic_year_id = ay.id
    LEFT JOIN LATERAL (
      SELECT contract_file_path, enrollment_date
      FROM matriculation
      WHERE student_id = s.id
      ORDER BY academic_year_id DESC
      LIMIT 1
    ) m ON true
    -- Obtener datos del padre principal desde el array JSON 'parents'
    LEFT JOIN LATERAL (
      SELECT
        u.id AS parent_id,
        CONCAT(u.first_name, ' ', u.last_names) AS parent_name,
        u.phone AS parent_phone,
        u.email AS parent_email,
        p->>'relationship' AS parent_relationship
      FROM jsonb_array_elements(COALESCE(s.parents, '[]'::jsonb)) AS p
      LEFT JOIN users u ON u.id = (p->>'user_id')::int
      WHERE (p->>'user_id') IS NOT NULL
      ORDER BY (p->>'is_primary')::boolean DESC NULLS LAST
      LIMIT 1
    ) parent_info ON true
    WHERE s.id = $1 AND s.status != 'deleted'
  `;

  const result = await pool.query(query, [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Buscar estudiante por DNI
 * @param {string} dni - DNI del estudiante
 * @returns {Promise<Object|null>} Estudiante encontrado o null
 */
const getStudentByDni = async (dni) => {
  const query = `
    SELECT * FROM students
    WHERE dni = $1 AND status != 'deleted'
  `;

  const result = await pool.query(query, [dni]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Buscar estudiante por código
 * @param {string} codigo - Código del estudiante
 * @returns {Promise<Object|null>} Estudiante encontrado o null
 */
const getStudentByCodigo = async (codigo) => {
  const query = `
    SELECT * FROM students
    WHERE code = $1 AND status != 'deleted'
  `;

  const result = await pool.query(query, [codigo]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Crear un nuevo estudiante
 * @param {Object} studentData - Datos del estudiante
 * @param {number} userId - ID del usuario que registra
 * @returns {Promise<Object>} Estudiante creado
 */
const createStudent = async (studentData, userId) => {
  const {
    barcode,
    first_names,
    last_names,
    paternal_last_name,
    maternal_last_name,
    dni,
    document_type,
    birth_date,
    gender,
    address,
    phone,
    level_id,
    grade_id,
    section_id,
    academic_year_id,
    enrollment_date,
    has_double_shift,
    parents,
    attached_contract,
    status
  } = studentData;

  // Primero insertamos el registro con código temporal
  const insertQuery = `
    INSERT INTO students (
      code, barcode, first_names, last_names, paternal_last_name, maternal_last_name,
      dni, document_type, birth_date, gender, address, phone,
      level_id, grade_id, section_id, academic_year_id, enrollment_date,
      has_double_shift, parents, attached_contract, status,
      user_id_registration, date_time_registration
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
      $17, $18, $19, $20, $21, $22, CURRENT_TIMESTAMP
    ) RETURNING *
  `;

  const insertValues = [
    'TEMP', // Código temporal que será actualizado
    barcode,
    first_names,
    last_names,
    paternal_last_name || null,
    maternal_last_name || null,
    dni,
    document_type || 'DNI',
    birth_date,
    gender,
    address,
    phone || null,
    level_id || null,
    grade_id || null,
    section_id || null,
    academic_year_id || null,
    enrollment_date || null,
    has_double_shift || false,
    parents ? JSON.stringify(parents) : null,
    attached_contract ? JSON.stringify(attached_contract) : null,
    status || 'active',
    userId
  ];

  const insertResult = await pool.query(insertQuery, insertValues);
  const newStudent = insertResult.rows[0];

  // Ahora generamos el código con formato EST-{ID}-{AÑO}
  const currentYear = new Date().getFullYear();
  const generatedCode = `EST-${newStudent.id}-${currentYear}`;

  // Actualizamos el registro con el código correcto
  const updateQuery = `
    UPDATE students
    SET code = $1
    WHERE id = $2
    RETURNING *
  `;

  const updateResult = await pool.query(updateQuery, [generatedCode, newStudent.id]);
  return updateResult.rows[0];
};

/**
 * Actualizar un estudiante
 * @param {number} id - ID del estudiante
 * @param {Object} studentData - Datos a actualizar (solo los campos que se quieren modificar)
 * @param {number} userId - ID del usuario que modifica
 * @returns {Promise<Object>} Estudiante actualizado
 */
const updateStudent = async (id, studentData, userId) => {
  // Primero obtenemos el estudiante actual
  const currentStudent = await getStudentById(id);
  if (!currentStudent) {
    throw new Error('Estudiante no encontrado');
  }

  // Merge de datos: mantenemos los valores actuales y solo actualizamos los que vienen
  const updatedData = {
    code: studentData.code !== undefined ? studentData.code : currentStudent.code,
    barcode: studentData.barcode !== undefined ? studentData.barcode : currentStudent.barcode,
    first_names: studentData.first_names !== undefined ? studentData.first_names : currentStudent.first_names,
    last_names: studentData.last_names !== undefined ? studentData.last_names : currentStudent.last_names,
    paternal_last_name: studentData.paternal_last_name !== undefined ? studentData.paternal_last_name : currentStudent.paternal_last_name,
    maternal_last_name: studentData.maternal_last_name !== undefined ? studentData.maternal_last_name : currentStudent.maternal_last_name,
    dni: studentData.dni !== undefined ? studentData.dni : currentStudent.dni,
    document_type: studentData.document_type !== undefined ? studentData.document_type : currentStudent.document_type,
    birth_date: studentData.birth_date !== undefined ? studentData.birth_date : currentStudent.birth_date,
    gender: studentData.gender !== undefined ? studentData.gender : currentStudent.gender,
    address: studentData.address !== undefined ? studentData.address : currentStudent.address,
    phone: studentData.phone !== undefined ? studentData.phone : currentStudent.phone,
    level_id: studentData.level_id !== undefined ? studentData.level_id : currentStudent.level_id,
    grade_id: studentData.grade_id !== undefined ? studentData.grade_id : currentStudent.grade_id,
    section_id: studentData.section_id !== undefined ? studentData.section_id : currentStudent.section_id,
    academic_year_id: studentData.academic_year_id !== undefined ? studentData.academic_year_id : currentStudent.academic_year_id,
    enrollment_date: studentData.enrollment_date !== undefined ? studentData.enrollment_date : currentStudent.enrollment_date,
    has_double_shift: studentData.has_double_shift !== undefined ? studentData.has_double_shift : currentStudent.has_double_shift,
    parents: studentData.parents !== undefined ? studentData.parents : currentStudent.parents,
    attached_contract: studentData.attached_contract !== undefined ? studentData.attached_contract : currentStudent.attached_contract,
    status: studentData.status !== undefined ? studentData.status : currentStudent.status
  };

  const query = `
    UPDATE students SET
      code = $1,
      barcode = $2,
      first_names = $3,
      last_names = $4,
      paternal_last_name = $5,
      maternal_last_name = $6,
      dni = $7,
      document_type = $8,
      birth_date = $9,
      gender = $10,
      address = $11,
      phone = $12,
      level_id = $13,
      grade_id = $14,
      section_id = $15,
      academic_year_id = $16,
      enrollment_date = $17,
      has_double_shift = $18,
      parents = $19,
      attached_contract = $20,
      status = $21,
      user_id_modification = $22,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $23
    RETURNING *
  `;

  const values = [
    updatedData.code,
    updatedData.barcode,
    updatedData.first_names,
    updatedData.last_names,
    updatedData.paternal_last_name,
    updatedData.maternal_last_name,
    updatedData.dni,
    updatedData.document_type || 'DNI',
    updatedData.birth_date,
    updatedData.gender,
    updatedData.address,
    updatedData.phone,
    updatedData.level_id,
    updatedData.grade_id,
    updatedData.section_id,
    updatedData.academic_year_id,
    updatedData.enrollment_date,
    updatedData.has_double_shift,
    updatedData.parents ? JSON.stringify(updatedData.parents) : null,
    updatedData.attached_contract ? JSON.stringify(updatedData.attached_contract) : null,
    updatedData.status || 'active',
    userId,
    id
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Eliminar un estudiante (soft delete)
 * @param {number} id - ID del estudiante
 * @param {number} userId - ID del usuario que elimina
 * @returns {Promise<boolean>} true si se eliminó correctamente
 */
const deleteStudent = async (id, userId) => {
  const query = `
    UPDATE students SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $2
  `;

  const result = await pool.query(query, [userId, id]);
  return result.rowCount > 0;
};

/**
 * Obtener estudiantes por padre (user_id del padre)
 * @param {number} padreId - ID del padre (user_id)
 * @returns {Promise<Array>} Lista de estudiantes
 */
const getStudentsByParent = async (padreId) => {
  const query = `
    SELECT
      s.*,
      l.name AS level_name,
      g.name AS grade_name,
      sec.name AS section_name,
      ay.name AS academic_year_name,
      m.contract_file_path AS attached_contract
    FROM students s
    LEFT JOIN levels l ON s.level_id = l.id
    LEFT JOIN grades g ON s.grade_id = g.id
    LEFT JOIN sections sec ON s.section_id = sec.id
    LEFT JOIN academic_years ay ON s.academic_year_id = ay.id
    LEFT JOIN LATERAL (
      SELECT contract_file_path
      FROM matriculation
      WHERE student_id = s.id
      ORDER BY academic_year DESC
      LIMIT 1
    ) m ON true
    WHERE s.parents::jsonb @> jsonb_build_array(jsonb_build_object('user_id', $1::int))
      AND s.status != 'deleted'
    ORDER BY s.last_names, s.first_names
  `;

  const result = await pool.query(query, [padreId]);
  return result.rows;
};

/**
 * Verificar si un estudiante tiene al menos un padre/tutor asignado
 * @param {number} studentId - ID del estudiante
 * @returns {Promise<Object>} { hasParent: boolean, parentInfo: Object|null }
 */
const validateStudentHasParent = async (studentId) => {
  const query = `
    SELECT
      id,
      code,
      first_names,
      last_names,
      parents
    FROM students
    WHERE id = $1 AND status != 'deleted'
  `;

  const result = await pool.query(query, [studentId]);

  if (result.rows.length === 0) {
    return {
      hasParent: false,
      parentInfo: null,
      error: 'Estudiante no encontrado'
    };
  }

  const student = result.rows[0];
  const parents = student.parents || [];

  // Verificar si el array de padres tiene al menos un elemento con user_id
  const hasValidParent = Array.isArray(parents) &&
    parents.length > 0 &&
    parents.some(p => p.user_id);

  if (!hasValidParent) {
    return {
      hasParent: false,
      parentInfo: null,
      studentInfo: {
        id: student.id,
        code: student.code,
        fullName: `${student.first_names} ${student.last_names}`
      },
      error: `El estudiante ${student.code} (${student.first_names} ${student.last_names}) no tiene un padre/tutor asignado`
    };
  }

  // Encontrar el padre primario o el primero en la lista
  const primaryParent = parents.find(p => p.is_primary && p.user_id) ||
                        parents.find(p => p.user_id);

  return {
    hasParent: true,
    parentInfo: primaryParent,
    studentInfo: {
      id: student.id,
      code: student.code,
      fullName: `${student.first_names} ${student.last_names}`
    }
  };
};

/**
 * Obtener estudiantes por padre con información enriquecida (promedios, asistencia, pagos, tutor, comportamiento)
 * @param {number} padreId - ID del padre (user_id)
 * @param {number} academicYear - Año académico (ej: 2024, 2025)
 * @returns {Promise<Array>} Lista de estudiantes con datos enriquecidos
 */
const getStudentsByParentEnriched = async (padreId, academicYear = null) => {
  // Si no se proporciona año, obtener el año actual
  const currentYear = academicYear || new Date().getFullYear();

  const query = `
    SELECT
      s.*,
      l.name AS level_name,
      g.name AS grade_name,
      sec.name AS section_name,
      ay.name AS academic_year_name,
      ay.year AS academic_year,
      m.contract_file_path AS attached_contract,

      -- Tutor de la sección
      CASE
        WHEN tutor.id IS NOT NULL
        THEN CONCAT(tutor.first_name, ' ', tutor.last_names)
        ELSE NULL
      END AS tutor_nombre,

      -- Promedio general del estudiante (último bimestre disponible)
      COALESCE(promedios.promedio_general, 0) AS promedio_general,

      -- Porcentaje de asistencia
      COALESCE(asistencia.porcentaje_asistencia, 0) AS porcentaje_asistencia,
      asistencia.total_dias,
      asistencia.dias_presente,

      -- Pagos pendientes
      COALESCE(pagos.cantidad_pendientes, 0) AS cantidad_pagos_pendientes,
      COALESCE(pagos.monto_pendiente, 0) AS monto_pendiente,

      -- Última actividad (última asistencia registrada)
      ultima_actividad.ultima_asistencia,

      -- Comportamiento
      comportamiento.discipline AS comportamiento_disciplina,
      comportamiento.parent_rating AS comportamiento_evaluacion,
      comportamiento.comments AS comportamiento_comentarios,
      comportamiento.quarter AS comportamiento_bimestre,

      -- Aula más frecuente
      aula.classroom AS aula,

      -- Materias con promedios (JSON)
      COALESCE(materias.materias_json, '[]'::json) AS materias,

      -- Horario (JSON)
      COALESCE(horario.horario_json, '[]'::json) AS horario

    FROM students s
    LEFT JOIN levels l ON s.level_id = l.id
    LEFT JOIN grades g ON s.grade_id = g.id
    LEFT JOIN sections sec ON s.section_id = sec.id
    LEFT JOIN academic_years ay ON s.academic_year_id = ay.id
    LEFT JOIN users tutor ON sec.tutor_id = tutor.id

    -- Contrato de matrícula más reciente
    LEFT JOIN LATERAL (
      SELECT contract_file_path
      FROM matriculation
      WHERE student_id = s.id
      ORDER BY academic_year_id DESC
      LIMIT 1
    ) m ON true

    -- Promedio general del estudiante (desde competency_quarter_averages)
    LEFT JOIN LATERAL (
      SELECT
        ROUND(AVG(course_avg)::numeric, 2) AS promedio_general
      FROM (
        SELECT AVG(cqa.average_value) AS course_avg
        FROM competency_quarter_averages cqa
        INNER JOIN academic_years ay_cqa ON cqa.academic_year_id = ay_cqa.id
        WHERE cqa.student_id = s.id
          AND ay_cqa.year = $2
          AND cqa.status != 'deleted'
        GROUP BY cqa.course_id
      ) course_averages
    ) promedios ON true

    -- Asistencia del estudiante
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (WHERE entry_status1 IN ('presente', 'puntual', 'a_tiempo')) AS dias_presente,
        COUNT(*) AS total_dias,
        CASE
          WHEN COUNT(*) > 0 THEN
            ROUND((COUNT(*) FILTER (WHERE entry_status1 IN ('presente', 'puntual', 'a_tiempo'))::numeric / COUNT(*)::numeric) * 100, 2)
          ELSE 0
        END AS porcentaje_asistencia
      FROM attendance_records
      WHERE student_id = s.id
        AND status != 'deleted'
        AND EXTRACT(YEAR FROM date) = $2
    ) asistencia ON true

    -- Pagos pendientes
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) AS cantidad_pendientes,
        COALESCE(SUM(pending_balance), 0)::numeric(10,2) AS monto_pendiente
      FROM payment_obligations
      WHERE student_id = s.id
        AND status = 'pending'
        AND academic_year = $2
    ) pagos ON true

    -- Última asistencia registrada
    LEFT JOIN LATERAL (
      SELECT MAX(date) AS ultima_asistencia
      FROM attendance_records
      WHERE student_id = s.id
        AND status != 'deleted'
    ) ultima_actividad ON true

    -- Comportamiento (último bimestre)
    LEFT JOIN LATERAL (
      SELECT
        discipline,
        parent_rating,
        comments,
        quarter
      FROM student_behaviors
      WHERE student_id = s.id
        AND academic_year = $2
        AND status != 'deleted'
      ORDER BY quarter DESC
      LIMIT 1
    ) comportamiento ON true

    -- Aula más frecuente
    LEFT JOIN LATERAL (
      SELECT classroom
      FROM schedules
      WHERE section_id = s.section_id
        AND status != 'deleted'
        AND classroom IS NOT NULL
      GROUP BY classroom
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) aula ON true

    -- Materias con promedios (desde competency_quarter_averages)
    LEFT JOIN LATERAL (
      SELECT
        COALESCE(
          json_agg(
            json_build_object(
              'curso_id', qa.course_id,
              'curso_nombre', c.name,
              'promedio', qa.promedio_curso,
              'bimestre', qa.quarter
            )
          ) FILTER (WHERE qa.course_id IS NOT NULL),
          '[]'::json
        ) AS materias_json
      FROM (
        SELECT DISTINCT ON (cqa.course_id)
          cqa.course_id,
          ROUND(AVG(cqa.average_value)::numeric, 2) AS promedio_curso,
          cqa.quarter
        FROM competency_quarter_averages cqa
        INNER JOIN academic_years ay_mat ON cqa.academic_year_id = ay_mat.id
        WHERE cqa.student_id = s.id
          AND ay_mat.year = $2
          AND cqa.status != 'deleted'
        GROUP BY cqa.course_id, cqa.quarter
        ORDER BY cqa.course_id, cqa.quarter DESC
      ) qa
      LEFT JOIN courses c ON qa.course_id = c.id
    ) materias ON true

    -- Horario semanal
    LEFT JOIN LATERAL (
      SELECT
        COALESCE(
          json_agg(
            json_build_object(
              'dia', sch.day,
              'hora_inicio', sch.start_time,
              'hora_fin', sch.end_time,
              'curso', c.name,
              'aula', sch.classroom
            ) ORDER BY sch.day, sch.start_time
          ) FILTER (WHERE sch.id IS NOT NULL),
          '[]'::json
        ) AS horario_json
      FROM schedules sch
      LEFT JOIN courses c ON sch.course_id = c.id
      WHERE sch.section_id = s.section_id
        AND sch.status != 'deleted'
    ) horario ON true

    WHERE s.parents::jsonb @> jsonb_build_array(jsonb_build_object('user_id', $1::int))
      AND s.status != 'deleted'
    ORDER BY s.last_names, s.first_names
  `;

  const result = await pool.query(query, [padreId, currentYear]);
  return result.rows;
};

module.exports = {
  getAllStudents,
  getStudentById,
  getStudentByDni,
  getStudentByCodigo,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentsByParent,
  getStudentsByParentEnriched,
  validateStudentHasParent
};
