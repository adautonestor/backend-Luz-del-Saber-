const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * Dashboard routes
 * All routes require authentication
 */

// Get dashboard statistics
router.get('/stats', authenticateToken, dashboardController.getDashboardStats);

// Get monthly income report
router.get('/monthly-income', authenticateToken, dashboardController.getMonthlyIncomeReport);

// Get enrollment statistics by level
router.get('/enrollment-stats', authenticateToken, dashboardController.getEnrollmentStats);

// Get payment collection rate
router.get('/collection-rate', authenticateToken, dashboardController.getCollectionRate);

// Get teacher dashboard statistics
router.get('/teacher-stats/:teacherId', authenticateToken, dashboardController.getTeacherStats);

// Get teacher's schedule for today
router.get('/teacher-schedule/:teacherId', authenticateToken, dashboardController.getTeacherTodaySchedule);

module.exports = router;
