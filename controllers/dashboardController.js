const dashboardModel = require('../models/dashboardModel');

/**
 * Get dashboard statistics
 * GET /api/dashboard/stats
 */
const getDashboardStats = async (req, res) => {
  try {
    const { academic_year } = req.query;
    const stats = await dashboardModel.getDashboardStats({ academic_year });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas del dashboard',
      details: error.message
    });
  }
};

/**
 * Get monthly income report
 * GET /api/dashboard/monthly-income
 */
const getMonthlyIncomeReport = async (req, res) => {
  try {
    const { year } = req.query;
    const report = await dashboardModel.getMonthlyIncomeReport(year ? parseInt(year) : null);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error in getMonthlyIncomeReport:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener reporte de ingresos mensuales',
      details: error.message
    });
  }
};

/**
 * Get enrollment statistics by level
 * GET /api/dashboard/enrollment-stats
 */
const getEnrollmentStats = async (req, res) => {
  try {
    const { academic_year } = req.query;
    const stats = await dashboardModel.getEnrollmentStatsByLevel(
      academic_year ? parseInt(academic_year) : null
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error in getEnrollmentStats:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas de matrícula',
      details: error.message
    });
  }
};

/**
 * Get payment collection rate
 * GET /api/dashboard/collection-rate
 */
const getCollectionRate = async (req, res) => {
  try {
    const { academic_year } = req.query;
    const stats = await dashboardModel.getPaymentCollectionRate(
      academic_year ? parseInt(academic_year) : null
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error in getCollectionRate:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener tasa de cobranza',
      details: error.message
    });
  }
};

/**
 * Get teacher dashboard statistics
 * GET /api/dashboard/teacher-stats/:teacherId
 */
const getTeacherStats = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const stats = await dashboardModel.getTeacherStats(parseInt(teacherId));

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error in getTeacherStats:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadisticas del profesor',
      details: error.message
    });
  }
};

/**
 * Get teacher's schedule for today
 * GET /api/dashboard/teacher-schedule/:teacherId
 */
const getTeacherTodaySchedule = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const schedule = await dashboardModel.getTeacherTodaySchedule(parseInt(teacherId));

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Error in getTeacherTodaySchedule:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener horario del día',
      details: error.message
    });
  }
};

module.exports = {
  getDashboardStats,
  getMonthlyIncomeReport,
  getEnrollmentStats,
  getCollectionRate,
  getTeacherStats,
  getTeacherTodaySchedule
};
