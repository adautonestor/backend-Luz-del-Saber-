const pool = require('../config/db');
const gradingScalesService = require('../services/gradingScalesService');

/**
 * Obtener el año académico activo
 * @returns {Promise<number|null>} ID del año académico activo o null
 */
const getActiveAcademicYearId = async () => {
  try {
    // Primero buscar año con status='active'
    let result = await pool.query(
      `SELECT id, name, status FROM academic_years WHERE status = 'active' ORDER BY year DESC LIMIT 1`
    );

    if (result.rows.length > 0) {
      console.log('[ReportsModel] Found active academic year:', result.rows[0]);
      return result.rows[0].id;
    }

    // Si no hay año activo, buscar el año más reciente (no inactivo)
    result = await pool.query(
      `SELECT id, name, status FROM academic_years WHERE status != 'inactive' ORDER BY year DESC LIMIT 1`
    );

    if (result.rows.length > 0) {
      console.log('[ReportsModel] No active year found, using most recent:', result.rows[0]);
      return result.rows[0].id;
    }

    console.log('[ReportsModel] No academic year found');
    return null;
  } catch (error) {
    console.error('Error getting active academic year:', error);
    return null;
  }
};

/**
 * Parsear y validar el academicYearId recibido
 * Si el valor es un año (ej: 2026), busca el ID correspondiente
 */
const parseAcademicYearId = async (value) => {
  if (!value || value === 'undefined' || value === 'null' || value === '') {
    return null;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return null;

  // Si el valor parece ser un año (mayor a 1000), buscar el ID real
  if (parsed > 1000) {
    try {
      const result = await pool.query(
        `SELECT id FROM academic_years WHERE year = $1 AND status != 'inactive' ORDER BY id DESC LIMIT 1`,
        [parsed]
      );
      if (result.rows.length > 0) {
        console.log(`[parseAcademicYearId] Converted year ${parsed} to ID ${result.rows[0].id}`);
        return result.rows[0].id;
      }
      console.log(`[parseAcademicYearId] No academic year found for year ${parsed}`);
      return null;
    } catch (error) {
      console.error('[parseAcademicYearId] Error:', error);
      return null;
    }
  }

  return parsed;
};

/**
 * Obtener estadísticas generales para reportes
 */
const getGeneralStats = async (academicYearId = null) => {
  try {
    // Parsear y obtener año académico activo si no se proporciona
    const parsedYearId = await parseAcademicYearId(academicYearId);
    const activeYearId = parsedYearId || await getActiveAcademicYearId();
    console.log('[getGeneralStats] Using academic year ID:', activeYearId);

    // Estudiantes activos matriculados en el año académico activo
    const studentsResult = await pool.query(
      `SELECT COUNT(DISTINCT s.id) as count
       FROM students s
       JOIN matriculation m ON m.student_id = s.id
       WHERE s.status IN ('active', 'enrolled')
       AND m.status = 'active'
       ${activeYearId ? 'AND m.academic_year_id = $1' : ''}`,
      activeYearId ? [activeYearId] : []
    );

    // Estudiantes matriculados en el año académico activo
    const enrolledResult = await pool.query(
      `SELECT COUNT(*) as count FROM matriculation
       WHERE status = 'active'
       ${activeYearId ? 'AND academic_year_id = $1' : ''}`,
      activeYearId ? [activeYearId] : []
    );

    // Profesores activos
    const teachersResult = await pool.query(
      `SELECT COUNT(*) as count FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE r.name = 'Profesor' AND u.status = 'active'`
    );

    // Secciones activas
    const sectionsResult = await pool.query(
      `SELECT COUNT(*) as count FROM sections WHERE status = 'active'`
    );

    // Cursos disponibles
    const coursesResult = await pool.query(
      `SELECT COUNT(*) as count FROM courses WHERE status = 'active'`
    );

    // Notas registradas (solo de estudiantes del año activo)
    const gradesRegisteredResult = await pool.query(
      `SELECT COUNT(DISTINCT cg.id) as count
       FROM competency_grades cg
       JOIN matriculation m ON m.student_id = cg.student_id AND m.status = 'active'
       ${activeYearId ? 'WHERE m.academic_year_id = $1' : ''}`,
      activeYearId ? [activeYearId] : []
    );

    // Promedio general de notas (solo de estudiantes del año activo)
    // Usa conversión dinámica basada en la configuración de escalas
    const conversionCaseWhen = await gradingScalesService.buildMultiLevelConversionCaseWhen(
      'l.id', 'cg.value', 'cg.grading_system', activeYearId
    );

    const avgGradeResult = await pool.query(`
      SELECT ROUND(AVG(${conversionCaseWhen}), 1) as avg_grade
      FROM competency_grades cg
      JOIN matriculation m ON m.student_id = cg.student_id AND m.status = 'active'
      JOIN students s ON s.id = cg.student_id
      JOIN levels l ON l.id = s.level_id
      ${activeYearId ? 'WHERE m.academic_year_id = $1' : ''}
    `, activeYearId ? [activeYearId] : []);

    // Estadísticas financieras
    const financialResult = await pool.query(`
      SELECT
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(SUM(paid_amount), 0) as total_paid,
        COALESCE(SUM(pending_balance), 0) as total_pending
      FROM payment_obligations
    `);

    const totalStudents = parseInt(studentsResult.rows[0].count);
    const enrolledStudents = parseInt(enrolledResult.rows[0].count);
    const financial = financialResult.rows[0];

    return {
      students: {
        total: totalStudents,
        enrolled: enrolledStudents,
        enrollmentRate: totalStudents > 0
          ? ((enrolledStudents / totalStudents) * 100).toFixed(1) + '%'
          : '0%',
        sections: parseInt(sectionsResult.rows[0].count)
      },
      academic: {
        teachers: parseInt(teachersResult.rows[0].count),
        courses: parseInt(coursesResult.rows[0].count),
        gradesRegistered: parseInt(gradesRegisteredResult.rows[0].count),
        averageGrade: avgGradeResult.rows[0].avg_grade
          ? parseFloat(avgGradeResult.rows[0].avg_grade).toFixed(1)
          : 'N/A'
      },
      financial: {
        totalAmount: parseFloat(financial.total_amount),
        totalPaid: parseFloat(financial.total_paid),
        totalPending: parseFloat(financial.total_pending),
        collectionRate: financial.total_amount > 0
          ? ((parseFloat(financial.total_paid) / parseFloat(financial.total_amount)) * 100).toFixed(1) + '%'
          : '0%'
      }
    };
  } catch (error) {
    console.error('Error getting general stats:', error);
    throw error;
  }
};

/**
 * Obtener resumen de notas por grado y sección
 */
const getGradesSummary = async (academicYearId = null) => {
  try {
    // Parsear y obtener año académico activo si no se proporciona
    const parsedYearId = await parseAcademicYearId(academicYearId);
    const activeYearId = parsedYearId || await getActiveAcademicYearId();
    console.log('[getGradesSummary] Using academic year ID:', activeYearId);

    // Generar CASE WHEN dinámico basado en configuración de escalas
    const conversionCaseWhen = await gradingScalesService.buildMultiLevelConversionCaseWhen(
      'l.id', 'cg.value', 'cg.grading_system', activeYearId
    );
    const passingCondition = await gradingScalesService.buildMultiLevelPassingCondition(
      'l.id', 'cg.value', 'cg.grading_system', activeYearId
    );

    const result = await pool.query(`
      SELECT
        l.name as level_name,
        l.id as level_id,
        g.name as grade_name,
        g.id as grade_id,
        sec.name as section_name,
        sec.id as section_id,
        COUNT(DISTINCT m.student_id) as student_count,
        COUNT(DISTINCT cg.id) as grades_count,
        ROUND(AVG(${conversionCaseWhen}), 1) as average_grade,
        -- Calcular tasa de aprobacion real usando configuración dinámica
        COUNT(CASE WHEN ${passingCondition} THEN 1 END) as passing_grades,
        COUNT(CASE WHEN cg.value IS NOT NULL THEN 1 END) as total_grades
      FROM levels l
      JOIN grades g ON g.level_id = l.id
      JOIN sections sec ON sec.grade_id = g.id
      LEFT JOIN matriculation m ON m.section_id = sec.id AND m.status = 'active'
        ${activeYearId ? 'AND m.academic_year_id = $1' : ''}
      LEFT JOIN competency_grades cg ON cg.student_id = m.student_id
      WHERE l.status = 'active' AND g.status = 'active' AND sec.status = 'active'
      GROUP BY l.id, l.name, g.id, g.name, sec.id, sec.name, l."order"
      HAVING COUNT(DISTINCT m.student_id) > 0
      ORDER BY l."order", g.id, sec.name
    `, activeYearId ? [activeYearId] : []);

    const mappedData = result.rows.map(row => {
      // Calcular tasa de aprobacion real basada en notas
      const passingGrades = parseInt(row.passing_grades) || 0;
      const totalGrades = parseInt(row.total_grades) || 0;
      const passingRate = totalGrades > 0
        ? ((passingGrades / totalGrades) * 100).toFixed(1)
        : '0.0';

      return {
        level: row.level_name,
        grade: row.grade_name,
        section: row.section_name,
        studentCount: parseInt(row.student_count),
        gradesCount: parseInt(row.grades_count),
        averageGrade: row.average_grade ? parseFloat(row.average_grade).toFixed(1) : 'Sin notas',
        passingRate: totalGrades > 0 ? `${passingRate}%` : 'Sin notas'
      };
    });

    return mappedData;
  } catch (error) {
    console.error('Error getting grades summary:', error);
    throw error;
  }
};

/**
 * Obtener estudiantes con mejores notas (Cuadro de Honor)
 */
const getHonorRoll = async (academicYearId = null, limit = 20) => {
  try {
    // Parsear y obtener año académico activo si no se proporciona
    const parsedYearId = await parseAcademicYearId(academicYearId);
    const activeYearId = parsedYearId || await getActiveAcademicYearId();
    console.log('[getHonorRoll] Using academic year ID:', activeYearId);

    // Generar CASE WHEN dinámico basado en configuración de escalas
    const conversionCaseWhen = await gradingScalesService.buildMultiLevelConversionCaseWhen(
      'l.id', 'cg.value', 'cg.grading_system', activeYearId
    );

    const result = await pool.query(`
      SELECT
        s.id as student_id,
        s.first_names,
        s.last_names,
        s.code as student_code,
        l.name as level_name,
        g.name as grade_name,
        sec.name as section_name,
        COUNT(cg.id) as grades_count,
        ROUND(AVG(${conversionCaseWhen}), 2) as average_grade,
        SUM(CASE WHEN UPPER(cg.value) IN ('AD', 'A') THEN 1 ELSE 0 END) as excellent_count
      FROM students s
      JOIN matriculation m ON m.student_id = s.id AND m.status = 'active'
        ${activeYearId ? 'AND m.academic_year_id = $2' : ''}
      JOIN sections sec ON sec.id = m.section_id
      JOIN grades g ON g.id = sec.grade_id
      JOIN levels l ON l.id = g.level_id
      JOIN competency_grades cg ON cg.student_id = s.id
      WHERE s.status IN ('active', 'enrolled')
      GROUP BY s.id, s.first_names, s.last_names, s.code, l.name, g.name, sec.name, l."order"
      HAVING COUNT(cg.id) > 0
      ORDER BY average_grade DESC, excellent_count DESC
      LIMIT $1
    `, activeYearId ? [limit, activeYearId] : [limit]);

    return result.rows.map((row, index) => ({
      rank: index + 1,
      studentName: `${row.first_names} ${row.last_names}`,
      studentCode: row.student_code,
      level: row.level_name,
      grade: row.grade_name,
      section: row.section_name,
      averageGrade: row.average_grade ? parseFloat(row.average_grade).toFixed(2) : '0.00',
      gradesCount: parseInt(row.grades_count),
      excellentCount: parseInt(row.excellent_count)
    }));
  } catch (error) {
    console.error('Error getting honor roll:', error);
    throw error;
  }
};

/**
 * Obtener estudiantes desaprobados
 */
const getFailedStudents = async (academicYearId = null) => {
  try {
    // Parsear y obtener año académico activo si no se proporciona
    const parsedYearId = await parseAcademicYearId(academicYearId);
    const activeYearId = parsedYearId || await getActiveAcademicYearId();
    console.log('[getFailedStudents] Using academic year ID:', activeYearId);

    // Total de estudiantes matriculados en el año activo
    const totalStudentsResult = await pool.query(
      `SELECT COUNT(DISTINCT s.id) as count
       FROM students s
       JOIN matriculation m ON m.student_id = s.id AND m.status = 'active'
       WHERE s.status IN ('active', 'enrolled')
       ${activeYearId ? 'AND m.academic_year_id = $1' : ''}`,
      activeYearId ? [activeYearId] : []
    );
    const totalStudents = parseInt(totalStudentsResult.rows[0].count);

    const result = await pool.query(`
      SELECT
        s.id as student_id,
        s.first_names,
        s.last_names,
        s.code as student_code,
        s.phone as student_phone,
        l.name as level_name,
        g.name as grade_name,
        sec.name as section_name,
        c.name as course_name,
        c.area as course_area,
        cg.value as grade_value,
        cg.quarter,
        s.parents->0->>'phone' as parent_phone,
        s.parents->0->>'first_names' as parent_name
      FROM students s
      JOIN matriculation m ON m.student_id = s.id AND m.status = 'active'
        ${activeYearId ? 'AND m.academic_year_id = $1' : ''}
      JOIN sections sec ON sec.id = m.section_id
      JOIN grades g ON g.id = sec.grade_id
      JOIN levels l ON l.id = g.level_id
      JOIN competency_grades cg ON cg.student_id = s.id
      JOIN courses c ON c.id = cg.course_id
      WHERE s.status IN ('active', 'enrolled')
        AND cg.value IN ('C', 'D')
      ORDER BY s.last_names, s.first_names, c.name
    `, activeYearId ? [activeYearId] : []);

    // Agrupar por estudiante
    const studentsMap = {};
    result.rows.forEach(row => {
      if (!studentsMap[row.student_id]) {
        studentsMap[row.student_id] = {
          studentName: `${row.first_names} ${row.last_names}`,
          studentCode: row.student_code,
          level: row.level_name,
          grade: row.grade_name,
          section: row.section_name,
          parentContact: row.parent_phone || row.student_phone || 'Sin contacto',
          parentName: row.parent_name || '',
          subjects: [],
          failedCourses: []
        };
      }
      // Para subjects (usado en el modal)
      studentsMap[row.student_id].subjects.push({
        name: row.course_name,
        grade: row.grade_value,
        area: row.course_area || 'Sin area',
        quarter: row.quarter || 1
      });
      // Para failedCourses (usado en stats)
      studentsMap[row.student_id].failedCourses.push({
        courseName: row.course_name,
        courseArea: row.course_area,
        grade: row.grade_value,
        quarter: row.quarter
      });
    });

    const failedStudentsArray = Object.values(studentsMap).map(student => ({
      ...student,
      failedSubjectsCount: student.failedCourses.length
    })).sort((a, b) => b.failedSubjectsCount - a.failedSubjectsCount);

    return {
      students: failedStudentsArray,
      totalStudents,
      totalFailedStudents: failedStudentsArray.length
    };
  } catch (error) {
    console.error('Error getting failed students:', error);
    throw error;
  }
};

/**
 * Obtener cursos sin notas registradas
 */
const getCoursesWithoutGrades = async (academicYearId = null) => {
  try {
    // Parsear y obtener año académico activo si no se proporciona
    const parsedYearId = await parseAcademicYearId(academicYearId);
    const activeYearId = parsedYearId || await getActiveAcademicYearId();
    console.log('[getCoursesWithoutGrades] Using academic year ID:', activeYearId);

    // Total de cursos activos
    const totalCoursesResult = await pool.query(
      `SELECT COUNT(*) as count FROM courses WHERE status = 'active'`
    );
    const totalCourses = parseInt(totalCoursesResult.rows[0].count);

    // Obtener cursos sin notas (considerando solo estudiantes del año activo)
    const coursesResult = await pool.query(`
      SELECT
        c.id as course_id,
        c.name as course_name,
        c.code as course_code,
        c.area as course_area,
        c.weekly_hours,
        l.name as level_name,
        COUNT(DISTINCT cg.id) as grades_count
      FROM courses c
      JOIN levels l ON l.id = c.level_id
      LEFT JOIN competency_grades cg ON cg.course_id = c.id
        AND cg.student_id IN (
          SELECT m.student_id FROM matriculation m
          WHERE m.status = 'active'
          ${activeYearId ? 'AND m.academic_year_id = $1' : ''}
        )
      WHERE c.status = 'active'
      GROUP BY c.id, c.name, c.code, c.area, c.weekly_hours, l.name
      HAVING COUNT(DISTINCT cg.id) = 0
      ORDER BY l.name, c.name
    `, activeYearId ? [activeYearId] : []);

    // Obtener docentes asignados para esos cursos
    const courseIds = coursesResult.rows.map(r => r.course_id);
    let teachersMap = {};

    if (courseIds.length > 0) {
      const teachersResult = await pool.query(`
        SELECT
          ta.course_id,
          u.first_name || ' ' || u.last_names as teacher_name,
          u.email as teacher_email,
          u.phone as teacher_phone
        FROM teacher_assignments ta
        JOIN users u ON u.id = ta.teacher_id
        WHERE ta.course_id = ANY($1) AND ta.status = 'active'
      `, [courseIds]);

      teachersResult.rows.forEach(t => {
        if (!teachersMap[t.course_id]) {
          teachersMap[t.course_id] = t;
        }
      });
    }

    const result = { rows: coursesResult.rows.map(row => ({
      ...row,
      teacher_name: teachersMap[row.course_id]?.teacher_name || null,
      teacher_email: teachersMap[row.course_id]?.teacher_email || null,
      teacher_phone: teachersMap[row.course_id]?.teacher_phone || null
    })) };

    const coursesWithoutGrades = result.rows.map(row => ({
      courseName: row.course_name,
      courseCode: row.course_code || 'N/A',
      courseArea: row.course_area || 'Sin area',
      level: row.level_name,
      grade: 'Todos',
      sections: 'Todas',
      weeklyHours: row.weekly_hours || 0,
      assignedTeacher: row.teacher_name || 'Sin asignar',
      teacherContact: row.teacher_email || row.teacher_phone || 'Sin contacto',
      lastRegistry: row.last_grade_date ? new Date(row.last_grade_date).toISOString() : null,
      status: row.teacher_name ? 'Atencion' : 'Critico'
    }));

    return {
      courses: coursesWithoutGrades,
      totalCourses,
      coursesWithoutGrades: coursesWithoutGrades.length
    };
  } catch (error) {
    console.error('Error getting courses without grades:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas financieras
 */
const getFinancialStats = async (academicYearId = null) => {
  try {
    // Obligaciones totales
    const obligationsResult = await pool.query(`
      SELECT
        COUNT(*) as total_obligations,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(SUM(paid_amount), 0) as total_paid,
        COALESCE(SUM(pending_balance), 0) as total_pending
      FROM payment_obligations
    `);

    // Obligaciones pendientes (vencidas)
    const overdueResult = await pool.query(`
      SELECT
        COUNT(*) as overdue_count,
        COALESCE(SUM(pending_balance), 0) as overdue_amount
      FROM payment_obligations
      WHERE status = 'pending' AND due_date < CURRENT_DATE
    `);

    // Obligaciones por vencer
    const upcomingResult = await pool.query(`
      SELECT
        COUNT(*) as upcoming_count,
        COALESCE(SUM(pending_balance), 0) as upcoming_amount
      FROM payment_obligations
      WHERE status = 'pending' AND due_date >= CURRENT_DATE AND due_date <= CURRENT_DATE + INTERVAL '30 days'
    `);

    // Pagos del mes actual (usando payment_intentions aprobadas como fuente de verdad)
    const monthlyPaymentsResult = await pool.query(`
      SELECT
        COUNT(*) as payments_count,
        COALESCE(SUM(amount), 0) as payments_amount
      FROM payment_intentions
      WHERE status = 'approved'
        AND EXTRACT(MONTH FROM date_time_modification) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM date_time_modification) = EXTRACT(YEAR FROM CURRENT_DATE)
    `);

    const obligations = obligationsResult.rows[0];
    const overdue = overdueResult.rows[0];
    const upcoming = upcomingResult.rows[0];
    const monthly = monthlyPaymentsResult.rows[0];

    return {
      totalObligations: parseInt(obligations.total_obligations),
      totalAmount: parseFloat(obligations.total_amount),
      totalPaid: parseFloat(obligations.total_paid),
      totalPending: parseFloat(obligations.total_pending),
      overdueCount: parseInt(overdue.overdue_count),
      overdueAmount: parseFloat(overdue.overdue_amount),
      upcomingCount: parseInt(upcoming.upcoming_count),
      upcomingAmount: parseFloat(upcoming.upcoming_amount),
      monthlyPaymentsCount: parseInt(monthly.payments_count),
      monthlyPaymentsAmount: parseFloat(monthly.payments_amount),
      collectionRate: obligations.total_amount > 0
        ? ((parseFloat(obligations.total_paid) / parseFloat(obligations.total_amount)) * 100).toFixed(1)
        : '0.0'
    };
  } catch (error) {
    console.error('Error getting financial stats:', error);
    throw error;
  }
};

/**
 * Obtener padres morosos
 */
const getDelinquentParents = async (academicYearId = null) => {
  try {
    // Parsear y obtener año académico activo si no se proporciona
    const parsedYearId = await parseAcademicYearId(academicYearId);
    const activeYearId = parsedYearId || await getActiveAcademicYearId();
    console.log('[getDelinquentParents] Using academic year ID:', activeYearId);

    const result = await pool.query(`
      SELECT
        s.id as student_id,
        s.first_names as student_first_names,
        s.last_names as student_last_names,
        s.parents->0->>'first_names' as parent_first_name,
        s.parents->0->>'last_names' as parent_last_names,
        s.parents->0->>'phone' as parent_phone,
        s.parents->0->>'dni' as parent_dni,
        l.name as level_name,
        g.name as grade_name,
        sec.name as section_name,
        pc.name as concept_name,
        po.total_amount,
        po.pending_balance,
        po.due_date
      FROM payment_obligations po
      JOIN students s ON s.id = po.student_id
      JOIN matriculation m ON m.student_id = s.id AND m.status = 'active'
        ${activeYearId ? 'AND m.academic_year_id = $1' : ''}
      LEFT JOIN sections sec ON sec.id = m.section_id
      LEFT JOIN grades g ON g.id = sec.grade_id
      LEFT JOIN levels l ON l.id = g.level_id
      LEFT JOIN payment_concepts pc ON pc.id = po.concept_id
      WHERE po.status = 'pending' AND po.due_date < CURRENT_DATE
      ORDER BY po.pending_balance DESC, po.due_date ASC
    `, activeYearId ? [activeYearId] : []);

    // Agrupar por estudiante (ya que padres están en JSON)
    const parentsMap = {};
    result.rows.forEach(row => {
      const parentKey = row.parent_dni || `student_${row.student_id}`;

      if (!parentsMap[parentKey]) {
        parentsMap[parentKey] = {
          parentName: row.parent_first_name
            ? `${row.parent_first_name} ${row.parent_last_names || ''}`.trim()
            : 'Padre no registrado',
          parentEmail: 'Sin email',
          parentPhone: row.parent_phone || 'Sin telefono',
          studentName: `${row.student_first_names} ${row.student_last_names}`,
          level: row.level_name || 'Sin nivel',
          grade: row.grade_name || 'Sin grado',
          section: row.section_name || 'Sin seccion',
          totalDebt: 0,
          obligations: [],
          concepts: [],
          oldestDebt: row.due_date
        };
      }

      parentsMap[parentKey].totalDebt += parseFloat(row.pending_balance || 0);
      parentsMap[parentKey].obligations.push({
        concept: row.concept_name,
        amount: parseFloat(row.pending_balance),
        dueDate: row.due_date
      });

      if (row.concept_name && !parentsMap[parentKey].concepts.includes(row.concept_name)) {
        parentsMap[parentKey].concepts.push(row.concept_name);
      }

      if (new Date(row.due_date) < new Date(parentsMap[parentKey].oldestDebt)) {
        parentsMap[parentKey].oldestDebt = row.due_date;
      }
    });

    return Object.values(parentsMap)
      .map(parent => ({
        ...parent,
        obligationsCount: parent.obligations.length
      }))
      .sort((a, b) => b.totalDebt - a.totalDebt);
  } catch (error) {
    console.error('Error getting delinquent parents:', error);
    throw error;
  }
};

/**
 * Obtener cuentas por cobrar
 */
const getAccountsReceivable = async (academicYearId = null) => {
  try {
    const result = await pool.query(`
      SELECT
        pc.name as concept_name,
        pc.type as concept_type,
        COUNT(po.id) as obligations_count,
        COALESCE(SUM(po.total_amount), 0) as total_amount,
        COALESCE(SUM(po.paid_amount), 0) as paid_amount,
        COALESCE(SUM(po.pending_balance), 0) as pending_balance,
        SUM(CASE WHEN po.due_date < CURRENT_DATE THEN 1 ELSE 0 END) as overdue_count,
        SUM(CASE WHEN po.due_date < CURRENT_DATE THEN po.pending_balance ELSE 0 END) as overdue_amount
      FROM payment_concepts pc
      LEFT JOIN payment_obligations po ON po.concept_id = pc.id AND po.status = 'pending'
      WHERE pc.status = 'active'
      GROUP BY pc.id, pc.name, pc.type
      HAVING COALESCE(SUM(po.pending_balance), 0) > 0
      ORDER BY pending_balance DESC
    `);

    return result.rows.map(row => ({
      concept: row.concept_name,
      type: row.concept_type,
      obligationsCount: parseInt(row.obligations_count),
      totalAmount: parseFloat(row.total_amount),
      paidAmount: parseFloat(row.paid_amount),
      pendingBalance: parseFloat(row.pending_balance),
      overdueCount: parseInt(row.overdue_count),
      overdueAmount: parseFloat(row.overdue_amount),
      collectionRate: row.total_amount > 0
        ? ((parseFloat(row.paid_amount) / parseFloat(row.total_amount)) * 100).toFixed(1)
        : '0.0'
    }));
  } catch (error) {
    console.error('Error getting accounts receivable:', error);
    throw error;
  }
};

/**
 * Obtener métodos de pago
 * Usa payment_intentions aprobadas como fuente de verdad
 */
const getPaymentMethods = async (academicYearId = null) => {
  try {
    // Verificar si hay pagos aprobados
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM payment_intentions WHERE status = 'approved' AND amount > 0`
    );
    const hasRecords = parseInt(countResult.rows[0].count) > 0;

    if (!hasRecords) {
      return {
        methods: [],
        totalAmount: 0,
        totalTransactions: 0,
        message: 'No hay pagos registrados en el sistema'
      };
    }

    // Obtener métodos de pago desde payment_intentions aprobadas
    const result = await pool.query(`
      SELECT
        COALESCE(payment_method, 'No especificado') as method,
        COUNT(*) as transactions_count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM payment_intentions
      WHERE status = 'approved' AND amount > 0
      GROUP BY payment_method
      ORDER BY total_amount DESC
    `);

    const totalAmount = result.rows.reduce((sum, row) => sum + parseFloat(row.total_amount || 0), 0);
    const totalTransactions = result.rows.reduce((sum, row) => sum + parseInt(row.transactions_count || 0), 0);

    return {
      methods: result.rows.map(row => ({
        name: row.method || 'No especificado',
        transactionsCount: parseInt(row.transactions_count) || 0,
        totalAmount: parseFloat(row.total_amount) || 0,
        percentage: totalAmount > 0
          ? ((parseFloat(row.total_amount) / totalAmount) * 100).toFixed(1)
          : '0.0',
        averageAmount: row.transactions_count > 0
          ? (parseFloat(row.total_amount) / parseInt(row.transactions_count)).toFixed(2)
          : '0.00'
      })),
      totalAmount,
      totalTransactions
    };
  } catch (error) {
    console.error('Error getting payment methods:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas de matrícula
 */
const getEnrollmentStats = async (academicYearId = null) => {
  try {
    // Parsear y obtener año académico activo si no se proporciona
    const parsedYearId = await parseAcademicYearId(academicYearId);
    const activeYearId = parsedYearId || await getActiveAcademicYearId();
    console.log('[getEnrollmentStats] Using academic year ID:', activeYearId);

    const result = await pool.query(`
      SELECT
        l.name as level_name,
        l.id as level_id,
        COUNT(DISTINCT m.student_id) as enrolled_students,
        COUNT(DISTINCT sec.id) as sections_count
      FROM levels l
      LEFT JOIN grades g ON g.level_id = l.id AND g.status = 'active'
      LEFT JOIN sections sec ON sec.grade_id = g.id AND sec.status = 'active'
      LEFT JOIN matriculation m ON m.section_id = sec.id AND m.status = 'active'
        ${activeYearId ? 'AND m.academic_year_id = $1' : ''}
      WHERE l.status = 'active'
      GROUP BY l.id, l.name, l."order"
      ORDER BY l."order"
    `, activeYearId ? [activeYearId] : []);

    // Total de estudiantes matriculados en el año activo
    const totalStudentsResult = await pool.query(
      `SELECT COUNT(DISTINCT s.id) as count
       FROM students s
       JOIN matriculation m ON m.student_id = s.id AND m.status = 'active'
       WHERE s.status IN ('active', 'enrolled')
       ${activeYearId ? 'AND m.academic_year_id = $1' : ''}`,
      activeYearId ? [activeYearId] : []
    );
    const totalStudents = parseInt(totalStudentsResult.rows[0].count);

    return result.rows.map(row => ({
      levelName: row.level_name,
      totalStudents: totalStudents,
      enrolledStudents: parseInt(row.enrolled_students) || 0,
      sectionsCount: parseInt(row.sections_count) || 0,
      enrollmentRate: totalStudents > 0
        ? ((parseInt(row.enrolled_students) / totalStudents) * 100).toFixed(1) + '%'
        : '0%'
    }));
  } catch (error) {
    console.error('Error getting enrollment stats:', error);
    throw error;
  }
};

/**
 * Obtener personal docente
 */
const getTeachingStaff = async (academicYearId = null) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id as teacher_id,
        u.first_name,
        u.last_names,
        u.email,
        u.phone,
        COUNT(DISTINCT ta.course_id) as courses_count,
        COUNT(DISTINCT ta.grade_id) as grades_count,
        COALESCE(SUM(c.weekly_hours), 0) as total_weekly_hours,
        STRING_AGG(DISTINCT c.name, ', ') as courses_names,
        ARRAY_AGG(DISTINCT l.name) FILTER (WHERE l.name IS NOT NULL) as levels_array
      FROM users u
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN teacher_assignments ta ON ta.teacher_id = u.id AND ta.status = 'active'
      LEFT JOIN courses c ON c.id = ta.course_id
      LEFT JOIN grades g ON g.id = ta.grade_id
      LEFT JOIN levels l ON l.id = g.level_id
      WHERE r.name = 'Profesor' AND u.status = 'active'
      GROUP BY u.id, u.first_name, u.last_names, u.email, u.phone
      ORDER BY u.last_names, u.first_name
    `);

    return result.rows.map(row => ({
      teacherName: `${row.first_name} ${row.last_names}`,
      email: row.email,
      phone: row.phone || 'Sin telefono',
      coursesCount: parseInt(row.courses_count),
      gradesCount: parseInt(row.grades_count),
      totalWeeklyHours: parseInt(row.total_weekly_hours),
      courses: row.courses_names || 'Sin cursos asignados',
      levels: row.levels_array || []
    }));
  } catch (error) {
    console.error('Error getting teaching staff:', error);
    throw error;
  }
};

module.exports = {
  getGeneralStats,
  getGradesSummary,
  getHonorRoll,
  getFailedStudents,
  getCoursesWithoutGrades,
  getFinancialStats,
  getDelinquentParents,
  getAccountsReceivable,
  getPaymentMethods,
  getEnrollmentStats,
  getTeachingStaff
};
