const pool = require('../config/db');

const getAllCourseAssignments = async (filters = {}) => {
  let query = `
    SELECT ca.*,
           c.name AS course_name,
           c.code AS course_code,
           c.level_id,
           c.area,
           c.description AS course_description,
           g.name AS grade_name,
           l.name AS level_name,
           ay.year AS academic_year,
           s.name AS section_name,
           u.first_name AS teacher_first_name,
           u.last_names AS teacher_last_names
    FROM course_assignments ca
    INNER JOIN courses c ON ca.course_id = c.id
    INNER JOIN grades g ON ca.grade_id = g.id
    INNER JOIN levels l ON c.level_id = l.id
    INNER JOIN academic_years ay ON ca.academic_year_id = ay.id
    LEFT JOIN sections s ON ca.section_id = s.id
    LEFT JOIN users u ON ca.teacher_id = u.id
    WHERE ca.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.course_id) {
    query += ` AND ca.course_id = $${paramCount}`;
    params.push(filters.course_id);
    paramCount++;
  }

  if (filters.grade_id) {
    query += ` AND ca.grade_id = $${paramCount}`;
    params.push(filters.grade_id);
    paramCount++;
  }

  if (filters.section_id) {
    query += ` AND (ca.section_id = $${paramCount} OR ca.section_id IS NULL)`;
    params.push(filters.section_id);
    paramCount++;
  }

  if (filters.teacher_id) {
    query += ` AND ca.teacher_id = $${paramCount}`;
    params.push(filters.teacher_id);
    paramCount++;
  }

  if (filters.academic_year_id) {
    query += ` AND ca.academic_year_id = $${paramCount}`;
    params.push(filters.academic_year_id);
    paramCount++;
  }

  if (filters.level_id) {
    query += ` AND c.level_id = $${paramCount}`;
    params.push(filters.level_id);
    paramCount++;
  }

  query += ' ORDER BY g."order", c.name';
  const result = await pool.query(query, params);
  return result.rows;
};

const getCourseAssignmentById = async (id) => {
  const query = `
    SELECT ca.*, c.name AS course_name, c.code AS course_code,
           g.name AS grade_name, ay.year AS academic_year
    FROM course_assignments ca
    INNER JOIN courses c ON ca.course_id = c.id
    INNER JOIN grades g ON ca.grade_id = g.id
    INNER JOIN academic_years ay ON ca.academic_year_id = ay.id
    WHERE ca.id = $1 AND ca.status = 'active'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const getCoursesByGrade = async (gradeId, academicYearId = null) => {
  let query = `
    SELECT ca.*, c.name AS course_name, c.code AS course_code,
           ay.year AS academic_year
    FROM course_assignments ca
    INNER JOIN courses c ON ca.course_id = c.id
    INNER JOIN academic_years ay ON ca.academic_year_id = ay.id
    WHERE ca.grade_id = $1 AND ca.status = 'active'
  `;
  const params = [gradeId];

  if (academicYearId) {
    query += ' AND ca.academic_year_id = $2';
    params.push(academicYearId);
  }

  query += ' ORDER BY c.name';
  const result = await pool.query(query, params);
  return result.rows;
};

const createCourseAssignment = async (data, userId) => {
  const {
    course_id,
    grade_id,
    teacher_id,
    academic_year_id,
    weekly_hours,
    section_id,
    observations,
    status
  } = data;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Obtener TODAS las secciones del grado si no se especifica una sección específica
    let sectionIds = [];
    if (section_id) {
      sectionIds = [section_id];
    } else {
      // Buscar todas las secciones activas del grado
      const sectionsResult = await client.query(
        `SELECT id, name, shift FROM sections
         WHERE grade_id = $1 AND status = 'active'
         ORDER BY name, shift`,
        [grade_id]
      );
      sectionIds = sectionsResult.rows.map(s => s.id);
    }

    // 2. Insertar/Actualizar en course_assignments
    const assignmentResult = await client.query(
      `INSERT INTO course_assignments (
         course_id, grade_id, teacher_id, academic_year_id,
         weekly_hours, section_id, observations, status,
         user_id_registration, date_time_registration
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
       ON CONFLICT (course_id, grade_id, academic_year_id)
       DO UPDATE SET
         teacher_id = EXCLUDED.teacher_id,
         weekly_hours = EXCLUDED.weekly_hours,
         section_id = EXCLUDED.section_id,
         observations = EXCLUDED.observations,
         status = EXCLUDED.status,
         user_id_modification = $9,
         date_time_modification = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        course_id,
        grade_id,
        teacher_id,
        academic_year_id,
        weekly_hours || 4,
        section_id || null,
        observations || null,
        status || 'active',
        userId
      ]
    );

    // 3. Obtener el año académico numérico
    const yearResult = await client.query(
      'SELECT year FROM academic_years WHERE id = $1',
      [academic_year_id]
    );
    const academic_year = yearResult.rows[0]?.year;

    // 4. Sincronizar teacher_assignments CON TODAS LAS SECCIONES
    // Verificar si ya existe
    const existingTA = await client.query(
      `SELECT id FROM teacher_assignments
       WHERE teacher_id = $1 AND course_id = $2 AND grade_id = $3 AND academic_year_id = $4`,
      [teacher_id, course_id, grade_id, academic_year_id]
    );

    // Usar el array de secciones encontradas
    const sectionIdsJson = sectionIds.length > 0 ? JSON.stringify(sectionIds) : null;

    if (existingTA.rows.length > 0) {
      // Actualizar
      await client.query(
        `UPDATE teacher_assignments
         SET section_ids = $1,
             status = $2,
             user_id_modification = $3,
             date_time_modification = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [
          sectionIdsJson,
          status || 'active',
          userId,
          existingTA.rows[0].id
        ]
      );
    } else {
      // Insertar
      await client.query(
        `INSERT INTO teacher_assignments (
           teacher_id, course_id, grade_id, section_ids,
           academic_year, academic_year_id, status,
           user_id_registration, date_time_registration
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
        [
          teacher_id,
          course_id,
          grade_id,
          sectionIdsJson,
          academic_year,
          academic_year_id,
          status || 'active',
          userId
        ]
      );
    }

    // 5. Actualizar courses.teachers con los profesores asignados
    // Obtener todos los profesores únicos asignados a este curso
    const teachersResult = await client.query(
      `SELECT DISTINCT
         ca.teacher_id,
         CONCAT(u.first_name, ' ', u.last_names) as teacher_name
       FROM course_assignments ca
       INNER JOIN users u ON ca.teacher_id = u.id
       WHERE ca.course_id = $1 AND ca.status = 'active'`,
      [course_id]
    );

    const teachers = teachersResult.rows.map(row => ({
      teacher_id: row.teacher_id,
      teacher_name: row.teacher_name
    }));

    await client.query(
      `UPDATE courses
       SET teachers = $1,
           user_id_modification = $2,
           date_time_modification = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [JSON.stringify(teachers), userId, course_id]
    );

    // 5. Sincronizar evaluation_structures.teacher_id
    // Actualizar todas las estructuras de evaluación de este curso/grado/año
    await client.query(
      `UPDATE evaluation_structures
       SET teacher_id = $1,
           user_id_modification = $2,
           date_time_modification = CURRENT_TIMESTAMP
       WHERE course_id = $3
         AND grade_id = $4
         AND academic_year_id = $5
         AND status = 'active'`,
      [teacher_id, userId, course_id, grade_id, academic_year_id]
    );

    await client.query('COMMIT');
    return assignmentResult.rows[0];

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const updateCourseAssignment = async (id, data, userId) => {
  const {
    teacher_id,
    weekly_hours,
    section_id,
    observations,
    status
  } = data;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Obtener datos actuales de la asignación
    const currentResult = await client.query(
      'SELECT course_id, grade_id, academic_year_id FROM course_assignments WHERE id = $1',
      [id]
    );
    const current = currentResult.rows[0];

    // 2. Actualizar course_assignments
    const result = await client.query(
      `UPDATE course_assignments
       SET teacher_id = $1,
           weekly_hours = $2,
           section_id = $3,
           observations = $4,
           status = $5,
           user_id_modification = $6,
           date_time_modification = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [teacher_id, weekly_hours, section_id, observations, status, userId, id]
    );

    // 3. Obtener año académico
    const yearResult = await client.query(
      'SELECT year FROM academic_years WHERE id = $1',
      [current.academic_year_id]
    );
    const academic_year = yearResult.rows[0]?.year;

    // 4. Actualizar teacher_assignments
    const existingTA = await client.query(
      `SELECT id FROM teacher_assignments
       WHERE teacher_id = $1 AND course_id = $2 AND grade_id = $3 AND academic_year_id = $4`,
      [teacher_id, current.course_id, current.grade_id, current.academic_year_id]
    );

    if (existingTA.rows.length > 0) {
      await client.query(
        `UPDATE teacher_assignments
         SET section_ids = $1,
             status = $2,
             user_id_modification = $3,
             date_time_modification = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [
          section_id ? JSON.stringify([section_id]) : null,
          status || 'active',
          userId,
          existingTA.rows[0].id
        ]
      );
    } else {
      await client.query(
        `INSERT INTO teacher_assignments (
           teacher_id, course_id, grade_id, section_ids,
           academic_year, academic_year_id, status,
           user_id_registration, date_time_registration
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
        [
          teacher_id,
          current.course_id,
          current.grade_id,
          section_id ? JSON.stringify([section_id]) : null,
          academic_year,
          current.academic_year_id,
          status || 'active',
          userId
        ]
      );
    }

    // 5. Actualizar courses.teachers
    const teachersResult = await client.query(
      `SELECT DISTINCT
         ca.teacher_id,
         CONCAT(u.first_name, ' ', u.last_names) as teacher_name
       FROM course_assignments ca
       INNER JOIN users u ON ca.teacher_id = u.id
       WHERE ca.course_id = $1 AND ca.status = 'active'`,
      [current.course_id]
    );

    const teachers = teachersResult.rows.map(row => ({
      teacher_id: row.teacher_id,
      teacher_name: row.teacher_name
    }));

    await client.query(
      `UPDATE courses
       SET teachers = $1,
           user_id_modification = $2,
           date_time_modification = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [JSON.stringify(teachers), userId, current.course_id]
    );

    // 6. Sincronizar evaluation_structures.teacher_id
    // Actualizar todas las estructuras de evaluación de este curso/grado/año
    await client.query(
      `UPDATE evaluation_structures
       SET teacher_id = $1,
           user_id_modification = $2,
           date_time_modification = CURRENT_TIMESTAMP
       WHERE course_id = $3
         AND grade_id = $4
         AND academic_year_id = $5
         AND status = 'active'`,
      [teacher_id, userId, current.course_id, current.grade_id, current.academic_year_id]
    );

    await client.query('COMMIT');
    return result.rows[0];

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const deleteCourseAssignment = async (id, userId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Obtener datos de la asignación antes de eliminarla
    const currentResult = await client.query(
      'SELECT course_id, grade_id, teacher_id, academic_year_id FROM course_assignments WHERE id = $1',
      [id]
    );
    const current = currentResult.rows[0];

    // 2. Marcar como inactiva en course_assignments
    await client.query(
      'UPDATE course_assignments SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
      ['inactive', userId, id]
    );

    // 3. Marcar como inactiva en teacher_assignments
    await client.query(
      `UPDATE teacher_assignments
       SET status = 'inactive',
           user_id_modification = $1,
           date_time_modification = CURRENT_TIMESTAMP
       WHERE teacher_id = $2 AND course_id = $3 AND grade_id = $4 AND academic_year_id = $5`,
      [userId, current.teacher_id, current.course_id, current.grade_id, current.academic_year_id]
    );

    // 4. Actualizar courses.teachers (remover profesores inactivos)
    const teachersResult = await client.query(
      `SELECT DISTINCT
         ca.teacher_id,
         CONCAT(u.first_name, ' ', u.last_names) as teacher_name
       FROM course_assignments ca
       INNER JOIN users u ON ca.teacher_id = u.id
       WHERE ca.course_id = $1 AND ca.status = 'active'`,
      [current.course_id]
    );

    const teachers = teachersResult.rows.map(row => ({
      teacher_id: row.teacher_id,
      teacher_name: row.teacher_name
    }));

    await client.query(
      `UPDATE courses
       SET teachers = $1,
           user_id_modification = $2,
           date_time_modification = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [JSON.stringify(teachers.length > 0 ? teachers : null), userId, current.course_id]
    );

    // 5. Limpiar evaluation_structures.teacher_id (poner en null)
    // Ya que se eliminó la asignación del profesor
    await client.query(
      `UPDATE evaluation_structures
       SET teacher_id = NULL,
           user_id_modification = $1,
           date_time_modification = CURRENT_TIMESTAMP
       WHERE course_id = $2
         AND grade_id = $3
         AND academic_year_id = $4
         AND teacher_id = $5
         AND status = 'active'`,
      [userId, current.course_id, current.grade_id, current.academic_year_id, current.teacher_id]
    );

    await client.query('COMMIT');
    return true;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { getAllCourseAssignments, getCourseAssignmentById, getCoursesByGrade, createCourseAssignment, updateCourseAssignment, deleteCourseAssignment };
