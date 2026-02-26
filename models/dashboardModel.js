const pool = require('../config/db');

/**
 * Get dashboard statistics for admin panel
 * Aggregates data from multiple tables for overview metrics
 */
const getDashboardStats = async (filters = {}) => {
  const { academic_year } = filters;
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  try {
    // Obtener el ID del año académico activo (o el especificado por parámetro)
    let academicYearId = academic_year;
    if (!academicYearId) {
      const activeYearResult = await pool.query(
        `SELECT id FROM academic_years WHERE status = 'active' LIMIT 1`
      );
      academicYearId = activeYearResult.rows[0]?.id || null;
    }

    // Get active students count - cuenta estudiantes matriculados (enrolled) o activos
    // Un estudiante se considera "activo" cuando tiene status 'enrolled' (matriculado)
    const studentsResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM students
       WHERE status IN ('active', 'enrolled')${academicYearId ? ' AND academic_year_id = $1' : ''}`,
      academicYearId ? [academicYearId] : []
    );

    // Get active teachers count (from users table with teacher role)
    const teachersResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM users u
       INNER JOIN roles r ON u.role_id = r.id
       WHERE u.status = 'active' AND r.name = 'Profesor'`
    );

    // Get monthly income from approved payment intentions
    // Usamos payment_intentions con status 'approved' como fuente de verdad
    // ya que siempre se actualiza correctamente cuando el director aprueba un pago
    const monthlyIncomeResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM payment_intentions
       WHERE status = 'approved'
       AND EXTRACT(MONTH FROM date_time_modification) = $1
       AND EXTRACT(YEAR FROM date_time_modification) = $2`,
      [currentMonth, currentYear]
    );

    // Get pending obligations count and amount
    const pendingObligationsResult = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(pending_balance), 0) as total_pending
       FROM payment_obligations
       WHERE status IN ('pending', 'partial')
       AND due_date < CURRENT_DATE`
    );

    // Get communications count (enviados en el año actual o todos con status 'sent')
    const communicationsResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM communications
       WHERE status = 'sent'
       AND EXTRACT(YEAR FROM send_date) = $1`,
      [currentYear]
    );

    // Get recent avisos (last 5)
    const avisosResult = await pool.query(
      `SELECT id, title, content, date_time_registration
       FROM announcements
       WHERE status = 'active'
       ORDER BY date_time_registration DESC
       LIMIT 5`
    );

    // Get attendance summary for today
    const todayAttendanceResult = await pool.query(
      `SELECT
        COUNT(*) as total_records,
        SUM(CASE WHEN entry_time1 IS NOT NULL THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN entry_time1 IS NULL THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN entry_status1 = 'tardanza' OR late_justified = true THEN 1 ELSE 0 END) as late_count
       FROM attendance_records
       WHERE date = CURRENT_DATE`
    );

    // Get recent activity (últimas 5 actividades del sistema)
    const recentActivityResult = await pool.query(
      `SELECT * FROM (
        SELECT 'matricula' as tipo,
               s.first_names || ' ' || s.last_names as descripcion,
               m.date_time_registration as fecha
        FROM matriculation m
        JOIN students s ON m.student_id = s.id
        WHERE m.status = 'active'

        UNION ALL

        SELECT 'pago' as tipo,
               s.first_names || ' ' || s.last_names || ' - S/ ' || pr.paid_amount as descripcion,
               pr.date_time_registration as fecha
        FROM payment_records pr
        JOIN students s ON pr.student_id = s.id

        UNION ALL

        SELECT 'comunicado' as tipo,
               title as descripcion,
               date_time_registration as fecha
        FROM communications
        WHERE status = 'sent'

        UNION ALL

        SELECT 'aviso' as tipo,
               title as descripcion,
               date_time_registration as fecha
        FROM announcements
        WHERE status = 'active'
      ) actividades
      ORDER BY fecha DESC
      LIMIT 5`
    );

    // Get upcoming meetings (próximas reuniones)
    const upcomingMeetingsResult = await pool.query(
      `SELECT id, title, date, time, status
       FROM parent_meetings
       WHERE status = 'scheduled' OR status = 'active'
       ORDER BY date ASC
       LIMIT 3`
    );

    // Get payments pending (próximos a vencer, no vencidos aún)
    const pendingNotOverdueResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM payment_obligations
       WHERE status = 'pending'
       AND due_date >= CURRENT_DATE`
    );

    // Get completed payments count
    const completedPaymentsResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM payment_obligations
       WHERE status = 'paid'`
    );

    return {
      activeStudents: parseInt(studentsResult.rows[0].count),
      activeTeachers: parseInt(teachersResult.rows[0].count),
      monthlyIncome: parseFloat(monthlyIncomeResult.rows[0].total),
      overduePayments: {
        count: parseInt(pendingObligationsResult.rows[0].count),
        amount: parseFloat(pendingObligationsResult.rows[0].total_pending)
      },
      monthlyComms: parseInt(communicationsResult.rows[0].count),
      recentAvisos: avisosResult.rows,
      todayAttendance: {
        total: parseInt(todayAttendanceResult.rows[0]?.total_records || 0),
        present: parseInt(todayAttendanceResult.rows[0]?.present_count || 0),
        absent: parseInt(todayAttendanceResult.rows[0]?.absent_count || 0),
        late: parseInt(todayAttendanceResult.rows[0]?.late_count || 0)
      },
      recentActivity: recentActivityResult.rows,
      upcomingMeetings: upcomingMeetingsResult.rows,
      pendingPayments: parseInt(pendingNotOverdueResult.rows[0]?.count || 0),
      completedPayments: parseInt(completedPaymentsResult.rows[0]?.count || 0)
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    throw error;
  }
};

/**
 * Get monthly income report
 * Usa payment_intentions aprobadas como fuente de verdad
 */
const getMonthlyIncomeReport = async (year = null) => {
  const targetYear = year || new Date().getFullYear();

  const result = await pool.query(
    `SELECT
      EXTRACT(MONTH FROM date_time_modification) as month,
      COALESCE(SUM(amount), 0) as total_income,
      COUNT(*) as payment_count
     FROM payment_intentions
     WHERE status = 'approved'
     AND EXTRACT(YEAR FROM date_time_modification) = $1
     GROUP BY EXTRACT(MONTH FROM date_time_modification)
     ORDER BY month`,
    [targetYear]
  );

  return result.rows;
};

/**
 * Get enrollment statistics by level
 */
const getEnrollmentStatsByLevel = async (academic_year = null) => {
  const year = academic_year || new Date().getFullYear();

  const result = await pool.query(
    `SELECT
      l.name as level_name,
      COUNT(s.id) as student_count,
      SUM(CASE WHEN s.sex = 'M' THEN 1 ELSE 0 END) as male_count,
      SUM(CASE WHEN s.sex = 'F' THEN 1 ELSE 0 END) as female_count
     FROM levels l
     LEFT JOIN grades g ON g.level_id = l.id
     LEFT JOIN students s ON s.grade_id = g.id AND s.status = 'active' AND s.academic_year_id = $1
     WHERE l.status = 'active'
     GROUP BY l.id, l.name, l.order
     ORDER BY l.order`,
    [year]
  );

  return result.rows;
};

/**
 * Get payment collection rate
 */
const getPaymentCollectionRate = async (academic_year = null) => {
  const year = academic_year || new Date().getFullYear();

  const result = await pool.query(
    `SELECT
      COUNT(*) as total_obligations,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN status = 'partial' THEN 1 ELSE 0 END) as partial_count,
      COALESCE(SUM(total_amount), 0) as total_billed,
      COALESCE(SUM(paid_amount), 0) as total_collected,
      COALESCE(SUM(pending_balance), 0) as total_pending
     FROM payment_obligations po
     INNER JOIN students s ON po.student_id = s.id
     WHERE s.academic_year_id = $1`,
    [year]
  );

  const data = result.rows[0];
  const collectionRate = data.total_billed > 0
    ? (parseFloat(data.total_collected) / parseFloat(data.total_billed) * 100).toFixed(2)
    : 0;

  return {
    totalObligations: parseInt(data.total_obligations),
    paidCount: parseInt(data.paid_count),
    pendingCount: parseInt(data.pending_count),
    partialCount: parseInt(data.partial_count),
    totalBilled: parseFloat(data.total_billed),
    totalCollected: parseFloat(data.total_collected),
    totalPending: parseFloat(data.total_pending),
    collectionRate: parseFloat(collectionRate)
  };
};

/**
 * Get dashboard statistics for a specific teacher
 */
const getTeacherStats = async (teacherId) => {
  try {
    // Get courses count for this teacher
    const coursesResult = await pool.query(
      `SELECT COUNT(DISTINCT course_id) as count
       FROM teacher_assignments
       WHERE teacher_id = $1 AND status = 'active'`,
      [teacherId]
    );

    // Get students count for this teacher (students in sections/grades where teacher has assignments)
    const studentsResult = await pool.query(
      `SELECT COUNT(DISTINCT m.student_id) as count
       FROM matriculation m
       JOIN sections s ON m.section_id = s.id
       JOIN grades g ON s.grade_id = g.id
       JOIN teacher_assignments ta ON ta.grade_id = g.id
       WHERE ta.teacher_id = $1 AND m.status = 'active' AND ta.status = 'active'`,
      [teacherId]
    );

    // Get communications count sent by this teacher
    const communicationsResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM communications
       WHERE sender = $1`,
      [teacherId]
    );

    // Get pending grades count (students in teacher's courses without competency grades)
    let pendingGradesCount = 0;
    try {
      const pendingGradesResult = await pool.query(
        `SELECT COUNT(*) as count
         FROM (
           SELECT DISTINCT m.student_id, ta.course_id
           FROM matriculation m
           JOIN sections s ON m.section_id = s.id
           JOIN grades g ON s.grade_id = g.id
           JOIN teacher_assignments ta ON ta.grade_id = g.id
           WHERE ta.teacher_id = $1 AND m.status = 'active' AND ta.status = 'active'
         ) as student_courses
         WHERE NOT EXISTS (
           SELECT 1 FROM competency_grades cg
           WHERE cg.student_id = student_courses.student_id
           AND cg.course_id = student_courses.course_id
         )`,
        [teacherId]
      );
      pendingGradesCount = parseInt(pendingGradesResult.rows[0]?.count || 0);
    } catch (e) {
      // Si falla, simplemente retornamos los estudiantes totales como pendientes
      pendingGradesCount = parseInt(studentsResult.rows[0]?.count || 0);
    }

    return {
      coursesCount: parseInt(coursesResult.rows[0]?.count || 0),
      studentsCount: parseInt(studentsResult.rows[0]?.count || 0),
      communicationsCount: parseInt(communicationsResult.rows[0]?.count || 0),
      pendingGradesCount: pendingGradesCount
    };
  } catch (error) {
    console.error('Error getting teacher stats:', error);
    throw error;
  }
};

/**
 * Get today's schedule for a specific teacher
 */
const getTeacherTodaySchedule = async (teacherId) => {
  try {
    // Obtener el día de la semana actual (1=Lunes, 7=Domingo)
    // JavaScript: 0=Domingo, 1=Lunes...6=Sábado
    // Convertir a formato de la BD (1=Lunes, 2=Martes...7=Domingo)
    const jsDay = new Date().getDay();
    const dbDay = jsDay === 0 ? 7 : jsDay; // Domingo = 7

    const result = await pool.query(
      `SELECT
        s.id,
        s.start_time,
        s.end_time,
        s.classroom,
        c.name as course_name,
        g.name as grade_name,
        sec.name as section_name
       FROM schedules s
       JOIN courses c ON s.course_id = c.id
       JOIN grades g ON s.grade_id = g.id
       JOIN sections sec ON s.section_id = sec.id
       WHERE s.teacher_id = $1
         AND s.day = $2
         AND s.status = 'active'
       ORDER BY s.start_time ASC`,
      [teacherId, dbDay]
    );

    return result.rows.map(row => ({
      id: row.id,
      time: formatTime(row.start_time),
      endTime: formatTime(row.end_time),
      subject: row.course_name,
      grade: `${row.grade_name} ${row.section_name}`,
      room: row.classroom || 'Sin asignar'
    }));
  } catch (error) {
    console.error('Error getting teacher today schedule:', error);
    throw error;
  }
};

/**
 * Formatear hora de timestamp a string HH:MM AM/PM
 */
const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

module.exports = {
  getDashboardStats,
  getMonthlyIncomeReport,
  getEnrollmentStatsByLevel,
  getPaymentCollectionRate,
  getTeacherStats,
  getTeacherTodaySchedule
};
