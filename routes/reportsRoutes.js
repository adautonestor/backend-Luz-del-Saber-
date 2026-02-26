const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Estadísticas generales
router.get('/general-stats', reportsController.getGeneralStats);

// Reportes Académicos
router.get('/grades-summary', reportsController.getGradesSummary);
router.get('/honor-roll', reportsController.getHonorRoll);
router.get('/failed-students', reportsController.getFailedStudents);
router.get('/courses-without-grades', reportsController.getCoursesWithoutGrades);

// Reportes Financieros
router.get('/financial-stats', reportsController.getFinancialStats);
router.get('/delinquent-parents', reportsController.getDelinquentParents);
router.get('/accounts-receivable', reportsController.getAccountsReceivable);
router.get('/payment-methods', reportsController.getPaymentMethods);
router.get('/collection-rate', reportsController.getCollectionRate);

// Reportes Administrativos
router.get('/enrollment-stats', reportsController.getEnrollmentStats);
router.get('/teaching-staff', reportsController.getTeachingStaff);

module.exports = router;
