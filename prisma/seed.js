const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('=== SEED: Datos minimos para funcionamiento del sistema ===\n');

  const defaultPasswordHash = await bcrypt.hash('123456', 10);

  // ============================================================
  // NIVEL 1: Tablas base sin dependencias (FK)
  // Tablas: roles, permissions, academic_year_types,
  //         academic_areas, payment_methods, system_settings
  // ============================================================

  console.log('[1/10] Roles...');
  await prisma.roles.createMany({
    data: [
      { name: 'Director', description: 'Director general - Administrador del sistema', status: 'active' },
      { name: 'Profesor', description: 'Docente de la institucion', status: 'active' },
      { name: 'Padre', description: 'Padre de familia o apoderado', status: 'active' },
      { name: 'Secretaria', description: 'Personal de secretaria', status: 'active' },
    ],
    skipDuplicates: true,
  });

  console.log('[1/10] Permisos...');
  await prisma.permissions.createMany({
    data: [
      // Director (administrador completo)
      { name: 'director.dashboard', description: 'Acceso al dashboard del director', module: 'director', action: 'view' },
      { name: 'director.users', description: 'Gestion de usuarios', module: 'director', action: 'manage' },
      { name: 'director.students', description: 'Gestion de estudiantes', module: 'director', action: 'manage' },
      { name: 'director.enrollment', description: 'Gestion de matriculas', module: 'director', action: 'manage' },
      { name: 'director.structure', description: 'Gestion de estructura academica', module: 'director', action: 'manage' },
      { name: 'director.rubrics', description: 'Gestion de rubricas de evaluacion', module: 'director', action: 'manage' },
      { name: 'director.schedules', description: 'Gestion de horarios', module: 'director', action: 'manage' },
      { name: 'director.grades', description: 'Gestion de notas', module: 'director', action: 'manage' },
      { name: 'director.report_cards', description: 'Gestion de boletas', module: 'director', action: 'manage' },
      { name: 'director.attendance', description: 'Gestion de asistencia', module: 'director', action: 'manage' },
      { name: 'director.payments', description: 'Gestion de pagos', module: 'director', action: 'manage' },
      { name: 'director.communications', description: 'Gestion de comunicados', module: 'director', action: 'manage' },
      { name: 'director.documents', description: 'Gestion de documentos', module: 'director', action: 'manage' },
      { name: 'director.reports', description: 'Acceso a reportes', module: 'director', action: 'view' },
      { name: 'director.settings', description: 'Configuracion del sistema', module: 'director', action: 'manage' },
      // Profesor
      { name: 'teacher.dashboard', description: 'Acceso al dashboard del profesor', module: 'teacher', action: 'view' },
      { name: 'teacher.courses', description: 'Ver cursos asignados', module: 'teacher', action: 'view' },
      { name: 'teacher.grades', description: 'Gestion de notas de sus cursos', module: 'teacher', action: 'manage' },
      { name: 'teacher.attendance', description: 'Registro de asistencia', module: 'teacher', action: 'manage' },
      { name: 'teacher.communications', description: 'Envio de comunicados', module: 'teacher', action: 'create' },
      { name: 'teacher.students', description: 'Ver estudiantes asignados', module: 'teacher', action: 'view' },
      // Padre
      { name: 'parent.dashboard', description: 'Acceso al dashboard del padre', module: 'parent', action: 'view' },
      { name: 'parent.children', description: 'Ver informacion de hijos', module: 'parent', action: 'view' },
      { name: 'parent.grades', description: 'Ver notas de hijos', module: 'parent', action: 'view' },
      { name: 'parent.attendance', description: 'Ver asistencia de hijos', module: 'parent', action: 'view' },
      { name: 'parent.payments', description: 'Gestion de pagos', module: 'parent', action: 'manage' },
      { name: 'parent.communications', description: 'Ver comunicados', module: 'parent', action: 'view' },
      { name: 'parent.report_cards', description: 'Ver boletas de notas', module: 'parent', action: 'view' },
      // Secretaria
      { name: 'secretary.dashboard', description: 'Acceso al dashboard de secretaria', module: 'secretary', action: 'view' },
      { name: 'secretary.students', description: 'Gestion de estudiantes', module: 'secretary', action: 'manage' },
      { name: 'secretary.enrollment', description: 'Gestion de matriculas', module: 'secretary', action: 'manage' },
      { name: 'secretary.schedules', description: 'Gestion de horarios', module: 'secretary', action: 'manage' },
      { name: 'secretary.documents', description: 'Gestion de documentos', module: 'secretary', action: 'manage' },
    ],
    skipDuplicates: true,
  });

  console.log('[1/10] Tipos de anio academico...');
  await prisma.academic_year_types.createMany({
    data: [
      { name: 'Regular', code: 'regular', description: 'Anio academico regular', order: 1, user_id_registration: 1 },
      { name: 'Vacacional', code: 'vacacional', description: 'Periodo vacacional con cursos de nivelacion', order: 2, user_id_registration: 1 },
      { name: 'Recuperacion', code: 'recuperacion', description: 'Periodo de recuperacion academica', order: 3, user_id_registration: 1 },
    ],
    skipDuplicates: true,
  });

  console.log('[1/10] Areas academicas...');
  await prisma.academic_areas.createMany({
    data: [
      { name: 'Comunicacion', description: 'Area de Comunicacion y Lenguaje', order: 1, user_id_registration: 1 },
      { name: 'Matematica', description: 'Area de Matematica', order: 2, user_id_registration: 1 },
      { name: 'Ciencia y Tecnologia', description: 'Area de Ciencias', order: 3, user_id_registration: 1 },
      { name: 'Personal Social', description: 'Area de Ciencias Sociales', order: 4, user_id_registration: 1 },
      { name: 'Educacion Fisica', description: 'Area de Educacion Fisica', order: 5, user_id_registration: 1 },
      { name: 'Arte y Cultura', description: 'Area de Arte', order: 6, user_id_registration: 1 },
      { name: 'Ingles', description: 'Idioma Extranjero', order: 7, user_id_registration: 1 },
      { name: 'Educacion Religiosa', description: 'Area de Religion', order: 8, user_id_registration: 1 },
    ],
    skipDuplicates: true,
  });

  console.log('[1/10] Metodos de pago...');
  await prisma.payment_methods.createMany({
    data: [
      { type: 'yape', name: 'Yape - Colegio Luz del Saber', phone_number: '987654321', instructions: 'Enviar comprobante al WhatsApp despues del pago', user_id_registration: 1 },
      { type: 'transferencia', name: 'Transferencia Bancaria BCP', bank: 'Banco de Credito del Peru', account_number: '1234567890', cci: '00212345678901234567', holder: 'I.E. Luz del Saber', instructions: 'Enviar voucher por correo o WhatsApp', user_id_registration: 1 },
      { type: 'efectivo', name: 'Pago en Efectivo', instructions: 'Realizar el pago en la oficina de administracion de 8:00 AM a 4:00 PM', user_id_registration: 1 },
    ],
    skipDuplicates: true,
  });

  // ============================================================
  // NIVEL 2: Dependen de NIVEL 1
  // Tablas: users, roles_permissions, academic_years
  // ============================================================

  const roles = await prisma.roles.findMany();
  const directorRole = roles.find(r => r.name === 'Director');
  const teacherRole = roles.find(r => r.name === 'Profesor');
  const parentRole = roles.find(r => r.name === 'Padre');
  const secretaryRole = roles.find(r => r.name === 'Secretaria');

  console.log('[2/10] Usuarios base...');
  await prisma.users.createMany({
    data: [
      {
        email: 'director@luzdelsaber.edu.pe',
        password: defaultPasswordHash,
        first_name: 'Carlos',
        last_names: 'Rodriguez Perez',
        dni: '12345678',
        role_id: directorRole.id,
        phone: '987654321',
        status: 'active',
        user_id_registration: 1,
      },
      {
        email: 'secretaria@luzdelsaber.edu.pe',
        password: defaultPasswordHash,
        first_name: 'Patricia',
        last_names: 'Morales Vega',
        dni: '90123456',
        role_id: secretaryRole.id,
        phone: '987654329',
        status: 'active',
        user_id_registration: 1,
      },
    ],
    skipDuplicates: true,
  });

  console.log('[2/10] Roles-Permisos...');
  const permissions = await prisma.permissions.findMany();
  const rolePermissionMap = {
    [directorRole.id]: permissions, // Director tiene TODOS los permisos
    [teacherRole.id]: permissions.filter(p => p.module === 'teacher'),
    [parentRole.id]: permissions.filter(p => p.module === 'parent'),
    [secretaryRole.id]: permissions.filter(p => p.module === 'secretary'),
  };

  const rolePermData = [];
  for (const [roleId, perms] of Object.entries(rolePermissionMap)) {
    for (const perm of perms) {
      rolePermData.push({ role_id: parseInt(roleId), permission_id: perm.id, user_id_registration: 1 });
    }
  }
  // Insertar en lotes para evitar duplicados
  for (const rp of rolePermData) {
    await prisma.roles_permissions.upsert({
      where: { role_id_permission_id: { role_id: rp.role_id, permission_id: rp.permission_id } },
      update: {},
      create: rp,
    });
  }

  console.log('[2/10] Anios academicos...');
  await prisma.academic_years.createMany({
    data: [
      {
        name: 'Anio Academico 2025',
        year: 2025,
        year_code: '2025-REG',
        type: 'regular',
        start_date: new Date('2025-03-01'),
        end_date: new Date('2025-12-20'),
        description: 'Anio escolar 2025',
        status: 'closed',
        user_id_registration: 1,
      },
      {
        name: 'Anio Academico 2026',
        year: 2026,
        year_code: '2026-REG',
        type: 'regular',
        start_date: new Date('2026-03-02'),
        end_date: new Date('2026-12-18'),
        description: 'Anio escolar 2026',
        status: 'active',
        user_id_registration: 1,
      },
    ],
    skipDuplicates: true,
  });

  // ============================================================
  // NIVEL 3: Dependen de NIVEL 2 (academic_years)
  // Tablas: levels, payment_concepts, competencies, academic_calendar
  // ============================================================

  const currentYear = await prisma.academic_years.findFirst({ where: { year: 2026 } });

  console.log('[3/10] Niveles educativos...');
  await prisma.levels.createMany({
    data: [
      { name: 'Inicial', code: 'INI', description: 'Nivel Inicial (3-5 anios)', order: 1, academic_year_id: currentYear.id, user_id_registration: 1 },
      { name: 'Primaria', code: 'PRI', description: 'Nivel Primaria (1ro-6to)', order: 2, academic_year_id: currentYear.id, user_id_registration: 1 },
      { name: 'Secundaria', code: 'SEC', description: 'Nivel Secundaria (1ro-5to)', order: 3, academic_year_id: currentYear.id, user_id_registration: 1 },
    ],
    skipDuplicates: true,
  });

  console.log('[3/10] Conceptos de pago...');
  await prisma.payment_concepts.createMany({
    data: [
      { name: 'Matricula 2026', description: 'Pago unico de matricula anual', type: 'matricula', amount: 300.00, frequency: 'anual', applies_to_all: true, levels: ['inicial', 'primaria', 'secundaria'], unique_payment_date: new Date('2026-03-02'), academic_year_id: currentYear.id, user_id_registration: 1 },
      { name: 'Mensualidad', description: 'Pension mensual de ensenanza', type: 'mensual', amount: 450.00, frequency: 'mensual', due_day: 10, applies_to_all: true, levels: ['inicial', 'primaria', 'secundaria'], applicable_months: ['Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'], academic_year_id: currentYear.id, user_id_registration: 1 },
      { name: 'APAFA', description: 'Cuota anual de Asociacion de Padres de Familia', type: 'unico', amount: 50.00, frequency: 'anual', applies_to_all: true, levels: ['inicial', 'primaria', 'secundaria'], unique_payment_date: new Date('2026-04-01'), academic_year_id: currentYear.id, user_id_registration: 1 },
      { name: 'Seguro Escolar', description: 'Seguro contra accidentes escolares', type: 'unico', amount: 80.00, frequency: 'anual', applies_to_all: true, levels: ['inicial', 'primaria', 'secundaria'], unique_payment_date: new Date('2026-03-15'), academic_year_id: currentYear.id, user_id_registration: 1 },
    ],
    skipDuplicates: true,
  });

  const levels = await prisma.levels.findMany();
  const areas = await prisma.academic_areas.findMany();
  const inicialLevel = levels.find(l => l.name === 'Inicial');
  const primariaLevel = levels.find(l => l.name === 'Primaria');
  const secundariaLevel = levels.find(l => l.name === 'Secundaria');
  const comunicacionArea = areas.find(a => a.name === 'Comunicacion');
  const matematicaArea = areas.find(a => a.name === 'Matematica');
  const cienciaArea = areas.find(a => a.name === 'Ciencia y Tecnologia');

  console.log('[3/10] Competencias...');
  await prisma.competencies.createMany({
    data: [
      { code: 'COM-01', name: 'Lee diversos tipos de textos escritos', level_id: primariaLevel.id, academic_area_id: comunicacionArea.id, order: 1, user_id_registration: 1 },
      { code: 'COM-02', name: 'Escribe diversos tipos de textos', level_id: primariaLevel.id, academic_area_id: comunicacionArea.id, order: 2, user_id_registration: 1 },
      { code: 'MAT-01', name: 'Resuelve problemas de cantidad', level_id: primariaLevel.id, academic_area_id: matematicaArea.id, order: 1, user_id_registration: 1 },
      { code: 'MAT-02', name: 'Resuelve problemas de regularidad', level_id: primariaLevel.id, academic_area_id: matematicaArea.id, order: 2, user_id_registration: 1 },
      { code: 'CYT-01', name: 'Indaga mediante metodos cientificos', level_id: primariaLevel.id, academic_area_id: cienciaArea.id, order: 1, user_id_registration: 1 },
    ],
    skipDuplicates: true,
  });

  console.log('[3/10] Calendario academico 2026...');
  await prisma.academic_calendar.createMany({
    data: [
      { title: 'Inicio de Clases 2026', description: 'Primer dia del anio escolar 2026', start_date: new Date('2026-03-02'), type: 'academico', academic_year_id: currentYear.id, user_id_registration: 1 },
      { title: 'Primer Bimestre', description: 'Primer periodo de evaluacion', start_date: new Date('2026-03-02'), end_date: new Date('2026-05-08'), type: 'bimestre', academic_year_id: currentYear.id, user_id_registration: 1 },
      { title: 'Segundo Bimestre', description: 'Segundo periodo de evaluacion', start_date: new Date('2026-05-11'), end_date: new Date('2026-07-24'), type: 'bimestre', academic_year_id: currentYear.id, user_id_registration: 1 },
      { title: 'Tercer Bimestre', description: 'Tercer periodo de evaluacion', start_date: new Date('2026-08-10'), end_date: new Date('2026-10-16'), type: 'bimestre', academic_year_id: currentYear.id, user_id_registration: 1 },
      { title: 'Cuarto Bimestre', description: 'Cuarto periodo de evaluacion', start_date: new Date('2026-10-19'), end_date: new Date('2026-12-18'), type: 'bimestre', academic_year_id: currentYear.id, user_id_registration: 1 },
      { title: 'Fiestas Patrias', description: 'Feriado nacional', start_date: new Date('2026-07-28'), end_date: new Date('2026-07-29'), type: 'feriado', academic_year_id: currentYear.id, user_id_registration: 1 },
      { title: 'Dia del Maestro', description: 'Celebracion del Dia del Maestro', start_date: new Date('2026-07-06'), type: 'evento', academic_year_id: currentYear.id, user_id_registration: 1 },
    ],
    skipDuplicates: true,
  });

  // ============================================================
  // NIVEL 4: Dependen de NIVEL 3 (levels, competencies)
  // Tablas: grades, capacities, attendance_schedules, discount_configs
  // ============================================================

  console.log('[4/10] Grados...');
  await prisma.grades.createMany({
    data: [
      // Inicial
      { level_id: inicialLevel.id, name: '3 Anios', code: 'INI-3', order: 1, academic_year_id: currentYear.id, user_id_registration: 1 },
      { level_id: inicialLevel.id, name: '4 Anios', code: 'INI-4', order: 2, academic_year_id: currentYear.id, user_id_registration: 1 },
      { level_id: inicialLevel.id, name: '5 Anios', code: 'INI-5', order: 3, academic_year_id: currentYear.id, user_id_registration: 1 },
      // Primaria
      { level_id: primariaLevel.id, name: '1ro Grado', code: 'PRI-1', order: 1, academic_year_id: currentYear.id, user_id_registration: 1 },
      { level_id: primariaLevel.id, name: '2do Grado', code: 'PRI-2', order: 2, academic_year_id: currentYear.id, user_id_registration: 1 },
      { level_id: primariaLevel.id, name: '3ro Grado', code: 'PRI-3', order: 3, academic_year_id: currentYear.id, user_id_registration: 1 },
      { level_id: primariaLevel.id, name: '4to Grado', code: 'PRI-4', order: 4, academic_year_id: currentYear.id, user_id_registration: 1 },
      { level_id: primariaLevel.id, name: '5to Grado', code: 'PRI-5', order: 5, academic_year_id: currentYear.id, user_id_registration: 1 },
      { level_id: primariaLevel.id, name: '6to Grado', code: 'PRI-6', order: 6, academic_year_id: currentYear.id, user_id_registration: 1 },
      // Secundaria
      { level_id: secundariaLevel.id, name: '1ro Secundaria', code: 'SEC-1', order: 1, academic_year_id: currentYear.id, user_id_registration: 1 },
      { level_id: secundariaLevel.id, name: '2do Secundaria', code: 'SEC-2', order: 2, academic_year_id: currentYear.id, user_id_registration: 1 },
      { level_id: secundariaLevel.id, name: '3ro Secundaria', code: 'SEC-3', order: 3, academic_year_id: currentYear.id, user_id_registration: 1 },
      { level_id: secundariaLevel.id, name: '4to Secundaria', code: 'SEC-4', order: 4, academic_year_id: currentYear.id, user_id_registration: 1 },
      { level_id: secundariaLevel.id, name: '5to Secundaria', code: 'SEC-5', order: 5, academic_year_id: currentYear.id, user_id_registration: 1 },
    ],
    skipDuplicates: true,
  });

  const competencies = await prisma.competencies.findMany();
  const com01 = competencies.find(c => c.code === 'COM-01');
  const mat01 = competencies.find(c => c.code === 'MAT-01');

  console.log('[4/10] Capacidades...');
  await prisma.capacities.createMany({
    data: [
      { competency_id: com01.id, code: 'COM-01-CAP-01', name: 'Obtiene informacion del texto escrito', order: 1, user_id_registration: 1 },
      { competency_id: com01.id, code: 'COM-01-CAP-02', name: 'Infiere e interpreta informacion del texto', order: 2, user_id_registration: 1 },
      { competency_id: mat01.id, code: 'MAT-01-CAP-01', name: 'Traduce cantidades a expresiones numericas', order: 1, user_id_registration: 1 },
      { competency_id: mat01.id, code: 'MAT-01-CAP-02', name: 'Comunica su comprension sobre los numeros', order: 2, user_id_registration: 1 },
    ],
    skipDuplicates: true,
  });

  console.log('[4/10] Horarios de asistencia...');
  await prisma.attendance_schedules.createMany({
    data: [
      { level_id: inicialLevel.id, entry1_start_time: new Date('1970-01-01T08:00:00'), entry1_limit_time: new Date('1970-01-01T08:30:00'), exit1_expected_time: new Date('1970-01-01T12:30:00'), tolerance_minutes: 15, applicable_days: [1, 2, 3, 4, 5], user_id_registration: 1 },
      { level_id: primariaLevel.id, entry1_start_time: new Date('1970-01-01T07:30:00'), entry1_limit_time: new Date('1970-01-01T08:00:00'), exit1_expected_time: new Date('1970-01-01T13:00:00'), entry2_start_time: new Date('1970-01-01T14:00:00'), entry2_limit_time: new Date('1970-01-01T14:30:00'), exit2_expected_time: new Date('1970-01-01T17:00:00'), tolerance_minutes: 15, applicable_days: [1, 2, 3, 4, 5], user_id_registration: 1 },
      { level_id: secundariaLevel.id, entry1_start_time: new Date('1970-01-01T07:45:00'), entry1_limit_time: new Date('1970-01-01T08:15:00'), exit1_expected_time: new Date('1970-01-01T14:00:00'), tolerance_minutes: 10, applicable_days: [1, 2, 3, 4, 5], user_id_registration: 1 },
    ],
    skipDuplicates: true,
  });

  console.log('[4/10] Configuracion de descuentos...');
  await prisma.discount_configs.createMany({
    data: [
      { children_quantity: 2, level: 'Primaria', discount_percentage: 10.00, description: 'Descuento por 2 hijos en primaria', academic_year: 2026, user_id_registration: 1 },
      { children_quantity: 3, level: 'Primaria', discount_percentage: 15.00, description: 'Descuento por 3+ hijos en primaria', academic_year: 2026, user_id_registration: 1 },
      { children_quantity: 2, level: 'Secundaria', discount_percentage: 10.00, description: 'Descuento por 2 hijos en secundaria', academic_year: 2026, user_id_registration: 1 },
      { children_quantity: 3, level: 'Secundaria', discount_percentage: 15.00, description: 'Descuento por 3+ hijos en secundaria', academic_year: 2026, user_id_registration: 1 },
    ],
    skipDuplicates: true,
  });

  // ============================================================
  // NIVEL 5: Dependen de NIVEL 4 (grades)
  // Tablas: sections, courses
  // ============================================================

  const grades = await prisma.grades.findMany();
  const gradeMap = {};
  for (const g of grades) gradeMap[g.code] = g;

  console.log('[5/10] Secciones...');
  const sectionData = [];
  for (const g of grades) {
    const cap = g.code.startsWith('INI') ? 25 : g.code.startsWith('PRI') ? 30 : 35;
    sectionData.push(
      { grade_id: g.id, name: 'A', capacity: cap, shift: 'manana', academic_year: 2026, academic_year_id: currentYear.id, user_id_registration: 1 },
      { grade_id: g.id, name: 'B', capacity: cap, shift: 'tarde', academic_year: 2026, academic_year_id: currentYear.id, user_id_registration: 1 },
    );
  }
  await prisma.sections.createMany({ data: sectionData, skipDuplicates: true });

  const personalSocialArea = areas.find(a => a.name === 'Personal Social');

  console.log('[5/10] Cursos...');
  await prisma.courses.createMany({
    data: [
      // Inicial - 3 Anios
      { name: 'Comunicacion', code: 'COM-INI-3', grade_id: gradeMap['INI-3'].id, level_id: inicialLevel.id, academic_area_id: comunicacionArea.id, weekly_hours: 4, type: 'required', academic_year_id: currentYear.id, user_id_registration: 1 },
      { name: 'Matematica', code: 'MAT-INI-3', grade_id: gradeMap['INI-3'].id, level_id: inicialLevel.id, academic_area_id: matematicaArea.id, weekly_hours: 3, type: 'required', academic_year_id: currentYear.id, user_id_registration: 1 },
      // Inicial - 4 Anios
      { name: 'Comunicacion', code: 'COM-INI-4', grade_id: gradeMap['INI-4'].id, level_id: inicialLevel.id, academic_area_id: comunicacionArea.id, weekly_hours: 5, type: 'required', academic_year_id: currentYear.id, user_id_registration: 1 },
      { name: 'Matematica', code: 'MAT-INI-4', grade_id: gradeMap['INI-4'].id, level_id: inicialLevel.id, academic_area_id: matematicaArea.id, weekly_hours: 4, type: 'required', academic_year_id: currentYear.id, user_id_registration: 1 },
      // Inicial - 5 Anios
      { name: 'Comunicacion', code: 'COM-INI-5', grade_id: gradeMap['INI-5'].id, level_id: inicialLevel.id, academic_area_id: comunicacionArea.id, weekly_hours: 5, type: 'required', academic_year_id: currentYear.id, user_id_registration: 1 },
      { name: 'Matematica', code: 'MAT-INI-5', grade_id: gradeMap['INI-5'].id, level_id: inicialLevel.id, academic_area_id: matematicaArea.id, weekly_hours: 5, type: 'required', academic_year_id: currentYear.id, user_id_registration: 1 },
      { name: 'Psicomotricidad', code: 'PSI-INI-5', grade_id: gradeMap['INI-5'].id, level_id: inicialLevel.id, academic_area_id: personalSocialArea.id, weekly_hours: 3, type: 'required', academic_year_id: currentYear.id, user_id_registration: 1 },
      // Primaria - 1ro
      { name: 'Comunicacion', code: 'COM-PRI-1', grade_id: gradeMap['PRI-1'].id, level_id: primariaLevel.id, academic_area_id: comunicacionArea.id, weekly_hours: 6, type: 'required', academic_year_id: currentYear.id, user_id_registration: 1 },
      { name: 'Matematica', code: 'MAT-PRI-1', grade_id: gradeMap['PRI-1'].id, level_id: primariaLevel.id, academic_area_id: matematicaArea.id, weekly_hours: 6, type: 'required', academic_year_id: currentYear.id, user_id_registration: 1 },
      { name: 'Ciencia y Tecnologia', code: 'CYT-PRI-1', grade_id: gradeMap['PRI-1'].id, level_id: primariaLevel.id, academic_area_id: cienciaArea.id, weekly_hours: 4, type: 'required', academic_year_id: currentYear.id, user_id_registration: 1 },
      // Primaria - 2do
      { name: 'Comunicacion', code: 'COM-PRI-2', grade_id: gradeMap['PRI-2'].id, level_id: primariaLevel.id, academic_area_id: comunicacionArea.id, weekly_hours: 6, type: 'required', academic_year_id: currentYear.id, user_id_registration: 1 },
      { name: 'Matematica', code: 'MAT-PRI-2', grade_id: gradeMap['PRI-2'].id, level_id: primariaLevel.id, academic_area_id: matematicaArea.id, weekly_hours: 6, type: 'required', academic_year_id: currentYear.id, user_id_registration: 1 },
    ],
    skipDuplicates: true,
  });

  // ============================================================
  // NIVEL 6: Configuraciones del sistema
  // Tabla: system_settings (incluye grading_scales_config)
  // ============================================================

  console.log('[6/10] Configuraciones del sistema...');
  await prisma.system_settings.createMany({
    data: [
      { key: 'school_name', value: { name: 'Institucion Educativa Luz del Saber' }, user_id_registration: 1 },
      { key: 'current_academic_year', value: { year: 2026, id: currentYear.id }, user_id_registration: 1 },
      { key: 'grading_system', value: { inicial: 'literal', primaria: 'literal', secundaria: 'vigesimal' }, user_id_registration: 1 },
      { key: 'attendance_config', value: { enable_double_shift: true, tolerance_minutes: 15, require_justification: true }, user_id_registration: 1 },
      { key: 'payment_config', value: { currency: 'PEN', monthlyDueDate: 10, lateFeePercentage: 5, minPartialPayment: 50, paymentReminders: true, reminderDays: [5, 3, 1], moraEnabled: true, moraDiaria: 0.80, moraMaxima: 24.00, diasMaximosMora: 30 }, user_id_registration: 1 },
      { key: 'communication_config', value: { enable_email: true, enable_sms: false, enable_push: true }, user_id_registration: 1 },
    ],
    skipDuplicates: true,
  });

  // Escalas de calificacion (depende de IDs de niveles)
  const gradingScalesConfig = {
    academic_year_id: currentYear.id,
    locked_levels: [],
    created_at: new Date().toISOString(),
    levels: {
      [inicialLevel.id]: {
        level_id: inicialLevel.id, level_name: 'Inicial', level_code: 'INI', type: 'letters',
        scale: [
          { value: 'A', label: 'Logro destacado', numericValue: 4, color: '#22c55e', order: 1 },
          { value: 'B', label: 'Logro esperado', numericValue: 3, color: '#3b82f6', order: 2 },
          { value: 'C', label: 'En proceso', numericValue: 2, color: '#eab308', order: 3 },
          { value: 'D', label: 'En inicio', numericValue: 1, color: '#ef4444', order: 4 },
        ],
        passingGrade: 'B', passingNumericValue: 3,
      },
      [primariaLevel.id]: {
        level_id: primariaLevel.id, level_name: 'Primaria', level_code: 'PRI', type: 'letters',
        scale: [
          { value: 'A', label: 'Logro destacado', numericValue: 4, color: '#22c55e', order: 1 },
          { value: 'B', label: 'Logro esperado', numericValue: 3, color: '#3b82f6', order: 2 },
          { value: 'C', label: 'En proceso', numericValue: 2, color: '#eab308', order: 3 },
          { value: 'D', label: 'En inicio', numericValue: 1, color: '#ef4444', order: 4 },
        ],
        passingGrade: 'B', passingNumericValue: 3,
      },
      [secundariaLevel.id]: {
        level_id: secundariaLevel.id, level_name: 'Secundaria', level_code: 'SEC', type: 'numeric',
        minValue: 0, maxValue: 20, passingGrade: 11,
        ranges: [
          { min: 18, max: 20, label: 'Logro destacado', color: '#22c55e', order: 1 },
          { min: 14, max: 17, label: 'Logro esperado', color: '#3b82f6', order: 2 },
          { min: 11, max: 13, label: 'En proceso', color: '#eab308', order: 3 },
          { min: 0, max: 10, label: 'En inicio', color: '#ef4444', order: 4 },
        ],
      },
    },
  };

  await prisma.system_settings.create({
    data: { key: 'grading_scales_config', value: gradingScalesConfig, status: 'active', user_id_registration: 1 },
  });

  // ============================================================
  // RESUMEN
  // ============================================================

  console.log('\n=== SEED COMPLETADO ===\n');
  console.log('Datos creados (19 tablas obligatorias):');
  console.log('  Nivel 1: roles(4), permissions(34), academic_year_types(3), academic_areas(8), payment_methods(3)');
  console.log('  Nivel 2: users(2), roles_permissions(vinculados), academic_years(2: 2025 cerrado, 2026 activo)');
  console.log('  Nivel 3: levels(3), payment_concepts(4), competencies(5), academic_calendar(7)');
  console.log('  Nivel 4: grades(14), capacities(4), attendance_schedules(3), discount_configs(4)');
  console.log('  Nivel 5: sections(28), courses(12)');
  console.log('  Nivel 6: system_settings(7 incluye grading_scales_config)');
  console.log('');
  console.log('Credenciales:');
  console.log('  Director: director@luzdelsaber.edu.pe / 123456');
  console.log('  Secretaria: secretaria@luzdelsaber.edu.pe / 123456');
  console.log('');
  console.log('Nota: No se crearon estudiantes, profesores, padres ni datos operativos.');
}

main()
  .catch((e) => {
    console.error('Error durante seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
