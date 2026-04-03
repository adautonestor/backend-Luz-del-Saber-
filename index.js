const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
require('dotenv').config();

// Importar scheduler de comunicados programados
const { startScheduler: startCommunicationsScheduler } = require('./jobs/communicationsScheduler');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const usersRoutes = require('./routes/usersRoutes');
const studentsRoutes = require('./routes/studentsRoutes');
const academicYearsRoutes = require('./routes/academicYearsRoutes');
const academicYearTypesRoutes = require('./routes/academicYearTypesRoutes');
const levelsRoutes = require('./routes/levelsRoutes');
const gradesRoutes = require('./routes/gradesRoutes');
const sectionsRoutes = require('./routes/sectionsRoutes');
const coursesRoutes = require('./routes/coursesRoutes');
const paymentConceptsRoutes = require('./routes/paymentConceptsRoutes');
const paymentObligationsRoutes = require('./routes/paymentObligationsRoutes');
const paymentIntentionsRoutes = require('./routes/paymentIntentionsRoutes');
const paymentMethodsRoutes = require('./routes/paymentMethodsRoutes');
const attendanceRecordsRoutes = require('./routes/attendanceRecordsRoutes');
const studentQrCodesRoutes = require('./routes/studentQrCodesRoutes');
const communicationsRoutes = require('./routes/communicationsRoutes');
const avisosRoutes = require('./routes/avisosRoutes');
const documentsRoutes = require('./routes/documentsRoutes');
const matriculationRoutes = require('./routes/matriculationRoutes');
// ❌ ELIMINADO: const studentGradesRoutes = require('./routes/studentGradesRoutes');
const schedulesRoutes = require('./routes/schedulesRoutes');
const teacherAssignmentsRoutes = require('./routes/teacherAssignmentsRoutes');
const courseAssignmentsRoutes = require('./routes/courseAssignmentsRoutes');
const scheduleImagesRoutes = require('./routes/scheduleImagesRoutes');
const academicAreasRoutes = require('./routes/academicAreasRoutes');
const competenciesRoutes = require('./routes/competenciesRoutes');
const capacitiesRoutes = require('./routes/capacitiesRoutes');
const courseCompetenciesRoutes = require('./routes/courseCompetenciesRoutes');
const competencyGradesRoutes = require('./routes/competencyGradesRoutes');
const quarterAveragesRoutes = require('./routes/quarterAveragesRoutes');
const studentBehaviorsRoutes = require('./routes/studentBehaviorsRoutes');
const evaluationStructuresRoutes = require('./routes/evaluationStructuresRoutes');
const paymentRecordsRoutes = require('./routes/paymentRecordsRoutes');
const discountConfigsRoutes = require('./routes/discountConfigsRoutes');
const reportCardVisibilityRoutes = require('./routes/reportCardVisibilityRoutes');
const academicCalendarRoutes = require('./routes/academicCalendarRoutes');
const parentMeetingsRoutes = require('./routes/parentMeetingsRoutes');
const meetingAttendancesRoutes = require('./routes/meetingAttendancesRoutes');
const psychologicalReportsRoutes = require('./routes/psychologicalReportsRoutes');
const readConfirmationsRoutes = require('./routes/readConfirmationsRoutes');
const rolesRoutes = require('./routes/rolesRoutes');
const permissionsRoutes = require('./routes/permissionsRoutes');
const auditLogsRoutes = require('./routes/auditLogsRoutes');
const systemSettingsRoutes = require('./routes/systemSettingsRoutes');
const attendanceSchedulesRoutes = require('./routes/attendanceSchedulesRoutes');
// ❌ ELIMINADO: const gradeHistoryRoutes = require('./routes/gradeHistoryRoutes');
const rolesPermissionsRoutes = require('./routes/rolesPermissionsRoutes');
const sessionsRoutes = require('./routes/sessionsRoutes');
const teacherTasksRoutes = require('./routes/teacherTasksRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
const filesRoutes = require('./routes/filesRoutes');
const parentProfileRoutes = require('./routes/parentProfileRoutes');

const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 📌 Servir archivos estáticos (uploads)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rutas de Autenticación
app.use('/api/auth', authRoutes);

// Rutas de Usuarios y Entidades Relacionadas
app.use('/api/users', usersRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/parent-profile', parentProfileRoutes);

// Rutas de Estructura Académica
app.use('/api/academic-years', academicYearsRoutes);
app.use('/api/academic-year-types', academicYearTypesRoutes);
app.use('/api/levels', levelsRoutes);
app.use('/api/grades', gradesRoutes);
app.use('/api/sections', sectionsRoutes);
app.use('/api/courses', coursesRoutes);

// Rutas de Pagos
app.use('/api/payment-concepts', paymentConceptsRoutes);
app.use('/api/payment-obligations', paymentObligationsRoutes);
app.use('/api/payment-intentions', paymentIntentionsRoutes);
app.use('/api/payment-methods', paymentMethodsRoutes);

// Rutas de Asistencia
app.use('/api/attendance-records', attendanceRecordsRoutes);
app.use('/api/attendance-schedules', attendanceSchedulesRoutes);
app.use('/api/student-qr-codes', studentQrCodesRoutes);

// Rutas de Comunicaciones
app.use('/api/communications', communicationsRoutes);
app.use('/api/avisos', avisosRoutes);
app.use('/api/documents', documentsRoutes);

// Rutas de Matrícula
app.use('/api/matriculation', matriculationRoutes);

// ❌ ELIMINADO: student-grades y grade-history (usar competency-grades)
// app.use('/api/student-grades', studentGradesRoutes);
// app.use('/api/grade-history', gradeHistoryRoutes);

// Rutas de Horarios y Asignaciones
app.use('/api/schedules', schedulesRoutes);
app.use('/api/teacher-assignments', teacherAssignmentsRoutes);
app.use('/api/teacher-tasks', teacherTasksRoutes);
app.use('/api/course-assignments', courseAssignmentsRoutes);
app.use('/api/schedule-images', scheduleImagesRoutes);

// Rutas de Competencias y Capacidades
app.use('/api/academic-areas', academicAreasRoutes);
app.use('/api/competencies', competenciesRoutes);
app.use('/api/capacities', capacitiesRoutes);
app.use('/api/course-competencies', courseCompetenciesRoutes);

// Rutas de Evaluación y Conducta
app.use('/api/competency-grades', competencyGradesRoutes);
app.use('/api/quarter-averages', quarterAveragesRoutes);
app.use('/api/student-behaviors', studentBehaviorsRoutes);
app.use('/api/evaluation-structures', evaluationStructuresRoutes);

// Rutas de Gestión de Pagos Adicionales
app.use('/api/payment-records', paymentRecordsRoutes);
app.use('/api/discount-configs', discountConfigsRoutes);

// Rutas de Configuración y Calendario
app.use('/api/report-card-visibility', reportCardVisibilityRoutes);
app.use('/api/academic-calendar', academicCalendarRoutes);

// Rutas de Reuniones
app.use('/api/parent-meetings', parentMeetingsRoutes);
app.use('/api/meeting-attendances', meetingAttendancesRoutes);

// Rutas de Informes y Confirmaciones
app.use('/api/psychological-reports', psychologicalReportsRoutes);
app.use('/api/read-confirmations', readConfirmationsRoutes);

// Rutas de Sistema y Seguridad
app.use('/api/roles', rolesRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/roles-permissions', rolesPermissionsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/system-settings', systemSettingsRoutes);

// Rutas de Dashboard y Reportes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);

// Proxy para archivos (Wasabi/Local)
app.use('/api/files', filesRoutes);

// Ruta de prueba
app.get('/api/ping', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', time: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor backend corriendo en http://localhost:${PORT}`);
  console.log(`📦 Modo de almacenamiento: ${process.env.NODE_ENV === 'production' ? 'WASABI S3' : 'LOCAL'}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`   Bucket: ${process.env.WASABI_BUCKET_NAME}`);
  }
  console.log('');

  // Iniciar scheduler de comunicados programados
  startCommunicationsScheduler();
});
