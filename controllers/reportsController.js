const reportsModel = require('../models/reportsModel');

/**
 * GET /api/reports/general-stats
 */
const getGeneralStats = async (req, res) => {
  try {
    const { academic_year } = req.query;
    const stats = await reportsModel.getGeneralStats(academic_year);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error in getGeneralStats:', error);
    res.status(500).json({ success: false, error: 'Error al obtener estadísticas generales' });
  }
};

/**
 * GET /api/reports/grades-summary
 */
const getGradesSummary = async (req, res) => {
  try {
    const { academic_year } = req.query;
    const data = await reportsModel.getGradesSummary(academic_year);

    res.json({
      success: true,
      data: {
        type: 'table',
        title: 'Resumen de Notas por Grado y Sección',
        headers: ['Nivel', 'Grado', 'Sección', 'Estudiantes', 'Notas Registradas', 'Promedio', 'Tasa Aprobación'],
        data
      }
    });
  } catch (error) {
    console.error('ERROR in getGradesSummary:', error);
    res.status(500).json({ success: false, error: 'Error al obtener resumen de notas' });
  }
};

/**
 * GET /api/reports/honor-roll
 */
const getHonorRoll = async (req, res) => {
  try {
    const { academic_year, limit } = req.query;
    const data = await reportsModel.getHonorRoll(academic_year, limit || 20);

    // Formatear datos para incluir excellentGrades
    const formattedData = data.map(student => ({
      ...student,
      excellentGrades: student.excellentCount || 0
    }));

    res.json({
      success: true,
      data: {
        type: 'honor-roll',
        title: 'Cuadro de Honor - Estudiantes Destacados',
        headers: ['Puesto', 'Estudiante', 'Codigo', 'Nivel', 'Grado', 'Seccion', 'Promedio', 'Notas A/AD'],
        data: formattedData,
        stats: {
          totalStudents: data.length,
          topAverage: data.length > 0 ? data[0].averageGrade : '0.00'
        }
      }
    });
  } catch (error) {
    console.error('Error in getHonorRoll:', error);
    res.status(500).json({ success: false, error: 'Error al obtener cuadro de honor' });
  }
};

/**
 * GET /api/reports/failed-students
 */
const getFailedStudents = async (req, res) => {
  try {
    const { academic_year } = req.query;
    const result = await reportsModel.getFailedStudents(academic_year);

    // Calcular estadísticas por materia
    const subjectStats = {};
    result.students.forEach(student => {
      student.failedCourses.forEach(course => {
        if (!subjectStats[course.courseName]) {
          subjectStats[course.courseName] = {
            name: course.courseName,
            area: course.courseArea || 'Sin area',
            failedCount: 0,
            averageGrade: 'C',
            failurePercentage: '0'
          };
        }
        subjectStats[course.courseName].failedCount++;
      });
    });

    // Calcular porcentaje de desaprobacion por materia
    Object.keys(subjectStats).forEach(key => {
      subjectStats[key].failurePercentage = result.totalStudents > 0
        ? ((subjectStats[key].failedCount / result.totalStudents) * 100).toFixed(1)
        : '0';
    });

    const failureRate = result.totalStudents > 0
      ? ((result.totalFailedStudents / result.totalStudents) * 100).toFixed(1)
      : '0';

    res.json({
      success: true,
      data: {
        type: 'failed-students-report',
        title: 'Reporte de Estudiantes Desaprobados',
        headers: ['Estudiante', 'Codigo', 'Nivel', 'Grado', 'Seccion', 'Cursos Desaprobados', 'Contacto Padre'],
        data: result.students,
        stats: {
          totalFailedStudents: result.totalFailedStudents,
          totalStudents: result.totalStudents,
          failureRate: failureRate,
          subjectStats: Object.values(subjectStats).sort((a, b) => b.failedCount - a.failedCount)
        }
      }
    });
  } catch (error) {
    console.error('Error in getFailedStudents:', error);
    res.status(500).json({ success: false, error: 'Error al obtener estudiantes desaprobados' });
  }
};

/**
 * GET /api/reports/courses-without-grades
 */
const getCoursesWithoutGrades = async (req, res) => {
  try {
    const { academic_year } = req.query;
    const result = await reportsModel.getCoursesWithoutGrades(academic_year);

    const criticalCourses = result.courses.filter(c => c.status === 'Critico').length;
    const percentageWithoutGrades = result.totalCourses > 0
      ? ((result.coursesWithoutGrades / result.totalCourses) * 100).toFixed(1)
      : '0';

    // Agrupar por docente para stats
    const teacherStats = {};
    result.courses.forEach(course => {
      if (course.assignedTeacher && course.assignedTeacher !== 'Sin asignar') {
        if (!teacherStats[course.assignedTeacher]) {
          teacherStats[course.assignedTeacher] = {
            name: course.assignedTeacher,
            contact: course.teacherContact,
            coursesWithoutGrades: 0,
            totalHours: 0
          };
        }
        teacherStats[course.assignedTeacher].coursesWithoutGrades++;
        teacherStats[course.assignedTeacher].totalHours += course.weeklyHours || 0;
      }
    });

    res.json({
      success: true,
      data: {
        type: 'courses-no-grades-table',
        title: 'Cursos sin Notas Registradas',
        headers: ['Curso', 'Area', 'Nivel/Grado', 'Secciones', 'Docente', 'Contacto', 'Horas/Sem', 'Ultimo Registro', 'Estado'],
        data: result.courses,
        stats: {
          coursesWithoutGrades: result.coursesWithoutGrades,
          totalCourses: result.totalCourses,
          criticalCourses,
          percentageWithoutGrades,
          teacherStats: Object.values(teacherStats).sort((a, b) => b.coursesWithoutGrades - a.coursesWithoutGrades)
        }
      }
    });
  } catch (error) {
    console.error('Error in getCoursesWithoutGrades:', error);
    res.status(500).json({ success: false, error: 'Error al obtener cursos sin notas' });
  }
};

/**
 * GET /api/reports/financial-stats
 */
const getFinancialStats = async (req, res) => {
  try {
    const { academic_year } = req.query;
    const stats = await reportsModel.getFinancialStats(academic_year);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error in getFinancialStats:', error);
    res.status(500).json({ success: false, error: 'Error al obtener estadísticas financieras' });
  }
};

/**
 * GET /api/reports/delinquent-parents
 */
const getDelinquentParents = async (req, res) => {
  try {
    const { academic_year } = req.query;
    const data = await reportsModel.getDelinquentParents(academic_year);

    const totalDebt = data.reduce((sum, p) => sum + p.totalDebt, 0);
    const averageDebt = data.length > 0 ? totalDebt / data.length : 0;

    res.json({
      success: true,
      data: {
        type: 'delinquent-table',
        title: 'Reporte de Padres Morosos',
        headers: ['Padre/Madre', 'Estudiante', 'Nivel', 'Grado', 'Sección', 'Contacto', 'Deuda Total', 'Obligaciones', 'Conceptos'],
        data,
        stats: {
          totalDelinquentParents: data.length,
          totalDebt,
          averageDebt: averageDebt.toFixed(2)
        }
      }
    });
  } catch (error) {
    console.error('Error in getDelinquentParents:', error);
    res.status(500).json({ success: false, error: 'Error al obtener padres morosos' });
  }
};

/**
 * GET /api/reports/accounts-receivable
 */
const getAccountsReceivable = async (req, res) => {
  try {
    const { academic_year } = req.query;
    const data = await reportsModel.getAccountsReceivable(academic_year);

    const totalPending = data.reduce((sum, r) => sum + r.pendingBalance, 0);
    const totalOverdue = data.reduce((sum, r) => sum + r.overdueAmount, 0);

    // Formatear datos con nombres correctos
    const formattedData = data.map(item => ({
      conceptName: item.concept,
      conceptType: item.type,
      obligationsCount: item.obligationsCount,
      totalAmount: item.totalAmount,
      paidAmount: item.paidAmount,
      pendingBalance: item.pendingBalance,
      overdueAmount: item.overdueAmount,
      collectionRate: item.collectionRate + '%'
    }));

    res.json({
      success: true,
      data: {
        type: 'accounts-receivable',
        title: 'Cuentas por Cobrar',
        headers: ['Concepto', 'Tipo', 'Obligaciones', 'Monto Total', 'Cobrado', 'Pendiente', 'Vencido', 'Tasa Cobro'],
        data: formattedData,
        stats: {
          totalConcepts: data.length,
          totalPending,
          totalOverdue
        }
      }
    });
  } catch (error) {
    console.error('Error in getAccountsReceivable:', error);
    res.status(500).json({ success: false, error: 'Error al obtener cuentas por cobrar' });
  }
};

/**
 * GET /api/reports/payment-methods
 */
const getPaymentMethods = async (req, res) => {
  try {
    const { academic_year } = req.query;
    const result = await reportsModel.getPaymentMethods(academic_year);
    res.json({
      success: true,
      data: {
        type: 'payment-methods-detailed',
        title: 'Análisis de Métodos de Pago',
        headers: ['Método', 'Transacciones', 'Monto Total', 'Porcentaje', 'Promedio'],
        data: result.methods,
        stats: {
          totalTransactions: result.totalTransactions,
          totalAmount: result.totalAmount,
          methodsCount: result.methods.length
        }
      }
    });
  } catch (error) {
    console.error('Error in getPaymentMethods:', error);
    res.status(500).json({ success: false, error: 'Error al obtener métodos de pago' });
  }
};

/**
 * GET /api/reports/collection-rate
 */
const getCollectionRate = async (req, res) => {
  try {
    const { academic_year } = req.query;
    const stats = await reportsModel.getFinancialStats(academic_year);
    res.json({
      success: true,
      data: {
        type: 'collection-rate',
        title: 'Tasa de Cobranza',
        stats: {
          collectionRate: stats.collectionRate,
          totalAmount: stats.totalAmount,
          totalPaid: stats.totalPaid,
          totalPending: stats.totalPending,
          overdueAmount: stats.overdueAmount
        }
      }
    });
  } catch (error) {
    console.error('Error in getCollectionRate:', error);
    res.status(500).json({ success: false, error: 'Error al obtener tasa de cobranza' });
  }
};

/**
 * GET /api/reports/enrollment-stats
 */
const getEnrollmentStats = async (req, res) => {
  try {
    const { academic_year } = req.query;
    const data = await reportsModel.getEnrollmentStats(academic_year);

    const totalEnrolled = data.reduce((sum, l) => sum + l.enrolledStudents, 0);
    const totalSections = data.reduce((sum, l) => sum + l.sectionsCount, 0);

    res.json({
      success: true,
      data: {
        type: 'enrollment-stats',
        title: 'Estado de Matrícula por Nivel',
        headers: ['Nivel', 'Estudiantes', 'Matriculados', 'Secciones', 'Tasa Matrícula'],
        data,
        stats: {
          totalEnrolled,
          totalSections,
          levelsCount: data.length
        }
      }
    });
  } catch (error) {
    console.error('Error in getEnrollmentStats:', error);
    res.status(500).json({ success: false, error: 'Error al obtener estadísticas de matrícula' });
  }
};

/**
 * GET /api/reports/teaching-staff
 */
const getTeachingStaff = async (req, res) => {
  try {
    const { academic_year } = req.query;
    const data = await reportsModel.getTeachingStaff(academic_year);

    const totalHours = data.reduce((sum, t) => sum + t.totalWeeklyHours, 0);
    const averageHours = data.length > 0 ? totalHours / data.length : 0;

    res.json({
      success: true,
      data: {
        type: 'teaching-staff',
        title: 'Personal Docente - Carga Horaria',
        headers: ['Docente', 'Email', 'Teléfono', 'Cursos', 'Grados', 'Horas/Sem', 'Niveles'],
        data,
        stats: {
          totalTeachers: data.length,
          totalHours,
          averageHours: averageHours.toFixed(1)
        }
      }
    });
  } catch (error) {
    console.error('Error in getTeachingStaff:', error);
    res.status(500).json({ success: false, error: 'Error al obtener personal docente' });
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
  getCollectionRate,
  getEnrollmentStats,
  getTeachingStaff
};
