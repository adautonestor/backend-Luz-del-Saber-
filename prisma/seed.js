const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Hash para contraseña por defecto: "123456"
  const defaultPasswordHash = await bcrypt.hash('123456', 10);

  // ==============================================
  // NIVEL 1: Tablas base sin FK
  // ==============================================

  console.log('📦 Seeding roles...');
  await prisma.roles.createMany({
    data: [
      { name: 'Director', description: 'Director general de la institución - Administrador del sistema', status: 'active' },
      { name: 'Profesor', description: 'Docente de la institución', status: 'active' },
      { name: 'Padre', description: 'Padre de familia o apoderado', status: 'active' },
      { name: 'Secretaria', description: 'Personal de secretaría', status: 'active' },
    ],
    skipDuplicates: true,
  });

  console.log('🔐 Seeding permissions...');
  await prisma.permissions.createMany({
    data: [
      // DIRECTOR permissions (administrador del sistema)
      { name: 'director.dashboard', description: 'Acceso al dashboard del director', module: 'director', action: 'view' },
      { name: 'director.users', description: 'Gestión de usuarios', module: 'director', action: 'manage' },
      { name: 'director.students', description: 'Gestión de estudiantes', module: 'director', action: 'manage' },
      { name: 'director.enrollment', description: 'Gestión de matrículas', module: 'director', action: 'manage' },
      { name: 'director.structure', description: 'Gestión de estructura académica', module: 'director', action: 'manage' },
      { name: 'director.rubrics', description: 'Gestión de rúbricas de evaluación', module: 'director', action: 'manage' },
      { name: 'director.schedules', description: 'Gestión de horarios', module: 'director', action: 'manage' },
      { name: 'director.grades', description: 'Gestión de notas', module: 'director', action: 'manage' },
      { name: 'director.report_cards', description: 'Gestión de boletas', module: 'director', action: 'manage' },
      { name: 'director.attendance', description: 'Gestión de asistencia', module: 'director', action: 'manage' },
      { name: 'director.payments', description: 'Gestión de pagos', module: 'director', action: 'manage' },
      { name: 'director.communications', description: 'Gestión de comunicados', module: 'director', action: 'manage' },
      { name: 'director.documents', description: 'Gestión de documentos', module: 'director', action: 'manage' },
      { name: 'director.reports', description: 'Acceso a reportes', module: 'director', action: 'view' },
      { name: 'director.settings', description: 'Configuración del sistema', module: 'director', action: 'manage' },

      // TEACHER permissions
      { name: 'teacher.dashboard', description: 'Acceso al dashboard del profesor', module: 'teacher', action: 'view' },
      { name: 'teacher.courses', description: 'Ver cursos asignados', module: 'teacher', action: 'view' },
      { name: 'teacher.grades', description: 'Gestión de notas de sus cursos', module: 'teacher', action: 'manage' },
      { name: 'teacher.attendance', description: 'Registro de asistencia', module: 'teacher', action: 'manage' },
      { name: 'teacher.communications', description: 'Envío de comunicados', module: 'teacher', action: 'create' },
      { name: 'teacher.students', description: 'Ver estudiantes asignados', module: 'teacher', action: 'view' },

      // PARENT permissions
      { name: 'parent.dashboard', description: 'Acceso al dashboard del padre', module: 'parent', action: 'view' },
      { name: 'parent.children', description: 'Ver información de hijos', module: 'parent', action: 'view' },
      { name: 'parent.grades', description: 'Ver notas de hijos', module: 'parent', action: 'view' },
      { name: 'parent.attendance', description: 'Ver asistencia de hijos', module: 'parent', action: 'view' },
      { name: 'parent.payments', description: 'Gestión de pagos', module: 'parent', action: 'manage' },
      { name: 'parent.communications', description: 'Ver comunicados', module: 'parent', action: 'view' },
      { name: 'parent.report_cards', description: 'Ver boletas de notas', module: 'parent', action: 'view' },

      // SECRETARY permissions
      { name: 'secretary.dashboard', description: 'Acceso al dashboard de secretaría', module: 'secretary', action: 'view' },
      { name: 'secretary.students', description: 'Gestión de estudiantes', module: 'secretary', action: 'manage' },
      { name: 'secretary.enrollment', description: 'Gestión de matrículas', module: 'secretary', action: 'manage' },
      { name: 'secretary.schedules', description: 'Gestión de horarios', module: 'secretary', action: 'manage' },
      { name: 'secretary.documents', description: 'Gestión de documentos', module: 'secretary', action: 'manage' },
    ],
    skipDuplicates: true,
  });

  console.log('📅 Seeding academic year types...');
  await prisma.academic_year_types.createMany({
    data: [
      { name: 'Regular', code: 'regular', description: 'Año académico regular', order: 1, user_id_registration: 1 },
      { name: 'Vacacional', code: 'vacacional', description: 'Período vacacional con cursos de nivelación', order: 2, user_id_registration: 1 },
      { name: 'Recuperación', code: 'recuperacion', description: 'Período de recuperación académica', order: 3, user_id_registration: 1 },
    ],
    skipDuplicates: true,
  });

  console.log('📅 Seeding academic years...');
  await prisma.academic_years.createMany({
    data: [
      {
        name: 'Año Académico 2024',
        year: 2024,
        year_code: '2024-REG',
        type: 'regular',
        start_date: new Date('2024-03-01'),
        end_date: new Date('2024-12-20'),
        description: 'Año escolar 2024',
        status: 'closed',
        user_id_registration: 1,
      },
      {
        name: 'Año Académico 2025',
        year: 2025,
        year_code: '2025-REG',
        type: 'regular',
        start_date: new Date('2025-03-01'),
        end_date: new Date('2025-12-20'),
        description: 'Año escolar 2025',
        status: 'active',
        user_id_registration: 1,
      },
    ],
    skipDuplicates: true,
  });

  console.log('📚 Seeding academic areas...');
  await prisma.academic_areas.createMany({
    data: [
      { name: 'Comunicación', description: 'Área de Comunicación y Lenguaje', order: 1, user_id_registration: 1 },
      { name: 'Matemática', description: 'Área de Matemática', order: 2, user_id_registration: 1 },
      { name: 'Ciencia y Tecnología', description: 'Área de Ciencias', order: 3, user_id_registration: 1 },
      { name: 'Personal Social', description: 'Área de Ciencias Sociales', order: 4, user_id_registration: 1 },
      { name: 'Educación Física', description: 'Área de Educación Física', order: 5, user_id_registration: 1 },
      { name: 'Arte y Cultura', description: 'Área de Arte', order: 6, user_id_registration: 1 },
      { name: 'Inglés', description: 'Idioma Extranjero', order: 7, user_id_registration: 1 },
      { name: 'Educación Religiosa', description: 'Área de Religión', order: 8, user_id_registration: 1 },
    ],
    skipDuplicates: true,
  });

  console.log('💳 Seeding payment methods...');
  await prisma.payment_methods.createMany({
    data: [
      {
        type: 'yape',
        name: 'Yape - Colegio Luz del Saber',
        phone_number: '987654321',
        instructions: 'Enviar comprobante al WhatsApp después del pago',
        user_id_registration: 1,
      },
      {
        type: 'transferencia',
        name: 'Transferencia Bancaria BCP',
        bank: 'Banco de Crédito del Perú',
        account_number: '1234567890',
        cci: '00212345678901234567',
        holder: 'I.E. Luz del Saber',
        instructions: 'Enviar voucher por correo o WhatsApp',
        user_id_registration: 1,
      },
      {
        type: 'efectivo',
        name: 'Pago en Efectivo',
        instructions: 'Realizar el pago en la oficina de administración de 8:00 AM a 4:00 PM',
        user_id_registration: 1,
      },
    ],
    skipDuplicates: true,
  });

  // ==============================================
  // NIVEL 2: Dependen de roles y academic_years
  // ==============================================

  console.log('👤 Seeding users (Director y Secretaria)...');
  const roles = await prisma.roles.findMany();
  const directorRole = roles.find(r => r.name === 'Director');
  const teacherRole = roles.find(r => r.name === 'Profesor');
  const parentRole = roles.find(r => r.name === 'Padre');
  const secretaryRole = roles.find(r => r.name === 'Secretaria');

  await prisma.users.createMany({
    data: [
      // 1. Director (Administrador del Sistema)
      {
        email: 'director@luzdelsaber.edu.pe',
        password: defaultPasswordHash,
        first_name: 'Carlos',
        last_names: 'Rodríguez Pérez',
        dni: '12345678',
        role_id: directorRole.id,
        phone: '987654321',
        status: 'active',
        user_id_registration: 1,
      },
      // 8. Secretaria (ID 8 para mantener consistencia si se agregan profesores/padres después)
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

  console.log('🔗 Seeding roles_permissions...');
  const permissions = await prisma.permissions.findMany();
  const directorPerms = permissions.filter(p => p.module === 'director');
  const teacherPerms = permissions.filter(p => p.module === 'teacher');
  const parentPerms = permissions.filter(p => p.module === 'parent');
  const secretaryPerms = permissions.filter(p => p.module === 'secretary');

  // Asignar TODOS los permisos al Director (administrador del sistema)
  for (const perm of permissions) {
    await prisma.roles_permissions.create({
      data: {
        role_id: directorRole.id,
        permission_id: perm.id,
        user_id_registration: 1,
      },
    });
  }

  // Asignar permisos a profesores
  for (const perm of teacherPerms) {
    await prisma.roles_permissions.create({
      data: {
        role_id: teacherRole.id,
        permission_id: perm.id,
        user_id_registration: 1,
      },
    });
  }

  // Asignar permisos a padres
  for (const perm of parentPerms) {
    await prisma.roles_permissions.create({
      data: {
        role_id: parentRole.id,
        permission_id: perm.id,
        user_id_registration: 1,
      },
    });
  }

  // Asignar permisos a secretaria
  for (const perm of secretaryPerms) {
    await prisma.roles_permissions.create({
      data: {
        role_id: secretaryRole.id,
        permission_id: perm.id,
        user_id_registration: 1,
      },
    });
  }

  console.log('🏫 Seeding levels...');
  const academicYears = await prisma.academic_years.findMany();
  const currentYear = academicYears.find(y => y.year === 2025);

  await prisma.levels.createMany({
    data: [
      { name: 'Inicial', code: 'INI', description: 'Nivel Inicial (3-5 años)', order: 1, academic_year_id: currentYear.id, user_id_registration: 1 },
      { name: 'Primaria', code: 'PRI', description: 'Nivel Primaria (1°-6°)', order: 2, academic_year_id: currentYear.id, user_id_registration: 1 },
      { name: 'Secundaria', code: 'SEC', description: 'Nivel Secundaria (1°-5°)', order: 3, academic_year_id: currentYear.id, user_id_registration: 1 },
    ],
    skipDuplicates: true,
  });

  console.log('💰 Seeding payment concepts...');
  await prisma.payment_concepts.createMany({
    data: [
      {
        name: 'Matrícula 2025',
        description: 'Pago único de matrícula anual',
        type: 'matricula',
        amount: 300.00,
        frequency: 'anual',
        applies_to_all: true,
        levels: ['inicial', 'primaria', 'secundaria'],
        unique_payment_date: new Date('2025-03-01'),
        status: 'active',
        academic_year_id: currentYear.id,
        user_id_registration: 1,
      },
      {
        name: 'Mensualidad',
        description: 'Pensión mensual de enseñanza',
        type: 'mensual',
        amount: 450.00,
        frequency: 'mensual',
        due_day: 10,
        applies_to_all: true,
        levels: ['inicial', 'primaria', 'secundaria'],
        applicable_months: ['Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
        unique_payment_date: null,
        status: 'active',
        academic_year_id: currentYear.id,
        user_id_registration: 1,
      },
      {
        name: 'APAFA',
        description: 'Cuota anual de Asociación de Padres de Familia',
        type: 'unico',
        amount: 50.00,
        frequency: 'anual',
        applies_to_all: true,
        levels: ['inicial', 'primaria', 'secundaria'],
        unique_payment_date: new Date('2025-04-01'),
        status: 'active',
        academic_year_id: currentYear.id,
        user_id_registration: 1,
      },
      {
        name: 'Seguro Escolar',
        description: 'Seguro contra accidentes escolares',
        type: 'unico',
        amount: 80.00,
        frequency: 'anual',
        applies_to_all: true,
        levels: ['inicial', 'primaria', 'secundaria'],
        unique_payment_date: new Date('2025-03-15'),
        status: 'active',
        academic_year_id: currentYear.id,
        user_id_registration: 1,
      },
    ],
    skipDuplicates: true,
  });

  console.log('🎓 Seeding competencies...');
  const levels = await prisma.levels.findMany();
  const areas = await prisma.academic_areas.findMany();
  const comunicacionArea = areas.find(a => a.name === 'Comunicación');
  const matematicaArea = areas.find(a => a.name === 'Matemática');
  const cienciaArea = areas.find(a => a.name === 'Ciencia y Tecnología');
  const personalSocialArea = areas.find(a => a.name === 'Personal Social');
  const primariaLevel = levels.find(l => l.name === 'Primaria');

  await prisma.competencies.createMany({
    data: [
      // Competencias de Comunicación
      { code: 'COM-01', name: 'Lee diversos tipos de textos escritos', description: 'Lee diversos tipos de textos escritos en su lengua materna', level_id: primariaLevel.id, academic_area_id: comunicacionArea.id, order: 1, user_id_registration: 1 },
      { code: 'COM-02', name: 'Escribe diversos tipos de textos', description: 'Escribe diversos tipos de textos en su lengua materna', level_id: primariaLevel.id, academic_area_id: comunicacionArea.id, order: 2, user_id_registration: 1 },
      // Competencias de Matemática
      { code: 'MAT-01', name: 'Resuelve problemas de cantidad', description: 'Resuelve problemas de cantidad', level_id: primariaLevel.id, academic_area_id: matematicaArea.id, order: 1, user_id_registration: 1 },
      { code: 'MAT-02', name: 'Resuelve problemas de regularidad', description: 'Resuelve problemas de regularidad, equivalencia y cambio', level_id: primariaLevel.id, academic_area_id: matematicaArea.id, order: 2, user_id_registration: 1 },
      // Competencias de Ciencia
      { code: 'CYT-01', name: 'Indaga mediante métodos científicos', description: 'Indaga mediante métodos científicos para construir conocimientos', level_id: primariaLevel.id, academic_area_id: cienciaArea.id, order: 1, user_id_registration: 1 },
    ],
    skipDuplicates: true,
  });

  // ==============================================
  // NIVEL 3: Dependen de levels
  // ==============================================

  console.log('📊 Seeding grades...');
  const inicialLevel = levels.find(l => l.name === 'Inicial');
  const secundariaLevel = levels.find(l => l.name === 'Secundaria');

  await prisma.grades.createMany({
    data: [
      // Inicial
      { level_id: inicialLevel.id, name: '3 Años', code: 'INI-3', description: 'Inicial 3 años', order: 1, academic_year_id: currentYear.id, user_id_registration: 1 },
      { level_id: inicialLevel.id, name: '4 Años', code: 'INI-4', description: 'Inicial 4 años', order: 2, academic_year_id: currentYear.id, user_id_registration: 1 },
      { level_id: inicialLevel.id, name: '5 Años', code: 'INI-5', description: 'Inicial 5 años', order: 3, academic_year_id: currentYear.id, user_id_registration: 1 },
      // Primaria
      { level_id: primariaLevel.id, name: '1° Grado', code: 'PRI-1', description: 'Primer grado de primaria', order: 1, academic_year_id: currentYear.id, user_id_registration: 1 },
      { level_id: primariaLevel.id, name: '2° Grado', code: 'PRI-2', description: 'Segundo grado de primaria', order: 2, academic_year_id: currentYear.id, user_id_registration: 1 },
      { level_id: primariaLevel.id, name: '3° Grado', code: 'PRI-3', description: 'Tercer grado de primaria', order: 3, academic_year_id: currentYear.id, user_id_registration: 1 },
      { level_id: primariaLevel.id, name: '4° Grado', code: 'PRI-4', description: 'Cuarto grado de primaria', order: 4, academic_year_id: currentYear.id, user_id_registration: 1 },
      { level_id: primariaLevel.id, name: '5° Grado', code: 'PRI-5', description: 'Quinto grado de primaria', order: 5, academic_year_id: currentYear.id, user_id_registration: 1 },
      { level_id: primariaLevel.id, name: '6° Grado', code: 'PRI-6', description: 'Sexto grado de primaria', order: 6, academic_year_id: currentYear.id, user_id_registration: 1 },
      // Secundaria
      { level_id: secundariaLevel.id, name: '1° Secundaria', code: 'SEC-1', description: 'Primer año de secundaria', order: 1, academic_year_id: currentYear.id, user_id_registration: 1 },
      { level_id: secundariaLevel.id, name: '2° Secundaria', code: 'SEC-2', description: 'Segundo año de secundaria', order: 2, academic_year_id: currentYear.id, user_id_registration: 1 },
      { level_id: secundariaLevel.id, name: '3° Secundaria', code: 'SEC-3', description: 'Tercer año de secundaria', order: 3, academic_year_id: currentYear.id, user_id_registration: 1 },
      { level_id: secundariaLevel.id, name: '4° Secundaria', code: 'SEC-4', description: 'Cuarto año de secundaria', order: 4, academic_year_id: currentYear.id, user_id_registration: 1 },
      { level_id: secundariaLevel.id, name: '5° Secundaria', code: 'SEC-5', description: 'Quinto año de secundaria', order: 5, academic_year_id: currentYear.id, user_id_registration: 1 },
    ],
    skipDuplicates: true,
  });

  console.log('🧩 Seeding capacities...');
  const competencies = await prisma.competencies.findMany();
  const com01 = competencies.find(c => c.code === 'COM-01');
  const mat01 = competencies.find(c => c.code === 'MAT-01');

  await prisma.capacities.createMany({
    data: [
      { competency_id: com01.id, code: 'COM-01-CAP-01', name: 'Obtiene información del texto escrito', order: 1, user_id_registration: 1 },
      { competency_id: com01.id, code: 'COM-01-CAP-02', name: 'Infiere e interpreta información del texto', order: 2, user_id_registration: 1 },
      { competency_id: mat01.id, code: 'MAT-01-CAP-01', name: 'Traduce cantidades a expresiones numéricas', order: 1, user_id_registration: 1 },
      { competency_id: mat01.id, code: 'MAT-01-CAP-02', name: 'Comunica su comprensión sobre los números', order: 2, user_id_registration: 1 },
    ],
    skipDuplicates: true,
  });

  // ==============================================
  // NIVEL 4: Dependen de grades
  // ==============================================

  console.log('🏛️ Seeding sections...');
  const grades = await prisma.grades.findMany();

  // Inicial
  const inicial3 = grades.find(g => g.code === 'INI-3');
  const inicial4 = grades.find(g => g.code === 'INI-4');
  const inicial5 = grades.find(g => g.code === 'INI-5');

  // Primaria
  const primerGrado = grades.find(g => g.code === 'PRI-1');
  const segundoGrado = grades.find(g => g.code === 'PRI-2');
  const tercerGrado = grades.find(g => g.code === 'PRI-3');
  const cuartoGrado = grades.find(g => g.code === 'PRI-4');
  const quintoGrado = grades.find(g => g.code === 'PRI-5');
  const sextoGrado = grades.find(g => g.code === 'PRI-6');

  // Secundaria
  const primerSec = grades.find(g => g.code === 'SEC-1');
  const segundoSec = grades.find(g => g.code === 'SEC-2');
  const tercerSec = grades.find(g => g.code === 'SEC-3');
  const cuartoSec = grades.find(g => g.code === 'SEC-4');
  const quintoSec = grades.find(g => g.code === 'SEC-5');

  await prisma.sections.createMany({
    data: [
      // === INICIAL === (sin tutor porque no hay profesores)
      // 3 Años
      { grade_id: inicial3.id, name: 'A', capacity: 25, shift: 'mañana', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },
      { grade_id: inicial3.id, name: 'B', capacity: 25, shift: 'tarde', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },
      // 4 Años
      { grade_id: inicial4.id, name: 'A', capacity: 25, shift: 'mañana', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },
      { grade_id: inicial4.id, name: 'B', capacity: 25, shift: 'tarde', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },
      // 5 Años
      { grade_id: inicial5.id, name: 'A', capacity: 25, shift: 'mañana', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },
      { grade_id: inicial5.id, name: 'B', capacity: 25, shift: 'tarde', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },

      // === PRIMARIA ===
      // 1° Primaria
      { grade_id: primerGrado.id, name: 'A', capacity: 30, shift: 'mañana', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },
      { grade_id: primerGrado.id, name: 'B', capacity: 30, shift: 'tarde', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },
      // 2° Primaria
      { grade_id: segundoGrado.id, name: 'A', capacity: 30, shift: 'mañana', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },
      { grade_id: segundoGrado.id, name: 'B', capacity: 30, shift: 'tarde', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },
      // 3° Primaria
      { grade_id: tercerGrado.id, name: 'A', capacity: 30, shift: 'mañana', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },
      { grade_id: tercerGrado.id, name: 'B', capacity: 30, shift: 'tarde', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },
      // 4° Primaria
      { grade_id: cuartoGrado.id, name: 'A', capacity: 30, shift: 'mañana', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },
      { grade_id: cuartoGrado.id, name: 'B', capacity: 30, shift: 'tarde', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },
      // 5° Primaria
      { grade_id: quintoGrado.id, name: 'A', capacity: 30, shift: 'mañana', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },
      { grade_id: quintoGrado.id, name: 'B', capacity: 30, shift: 'tarde', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },
      // 6° Primaria
      { grade_id: sextoGrado.id, name: 'A', capacity: 30, shift: 'mañana', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },
      { grade_id: sextoGrado.id, name: 'B', capacity: 30, shift: 'tarde', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },

      // === SECUNDARIA ===
      // 1° Secundaria
      { grade_id: primerSec.id, name: 'A', capacity: 35, shift: 'mañana', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },
      { grade_id: primerSec.id, name: 'B', capacity: 35, shift: 'tarde', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },
      // 2° Secundaria
      { grade_id: segundoSec.id, name: 'A', capacity: 35, shift: 'mañana', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },
      { grade_id: segundoSec.id, name: 'B', capacity: 35, shift: 'tarde', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },
      // 3° Secundaria
      { grade_id: tercerSec.id, name: 'A', capacity: 35, shift: 'mañana', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },
      { grade_id: tercerSec.id, name: 'B', capacity: 35, shift: 'tarde', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },
      // 4° Secundaria
      { grade_id: cuartoSec.id, name: 'A', capacity: 35, shift: 'mañana', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },
      { grade_id: cuartoSec.id, name: 'B', capacity: 35, shift: 'tarde', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },
      // 5° Secundaria
      { grade_id: quintoSec.id, name: 'A', capacity: 35, shift: 'mañana', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },
      { grade_id: quintoSec.id, name: 'B', capacity: 35, shift: 'tarde', academic_year: 2025, academic_year_id: currentYear.id, user_id_registration: 1 },
    ],
    skipDuplicates: true,
  });

  console.log('📖 Seeding courses...');
  await prisma.courses.createMany({
    data: [
      // ========== CURSOS DE INICIAL ==========
      // Comunicación - 5 Años
      {
        name: 'Comunicación',
        code: 'COM-INI-5',
        grade_id: inicial5.id,
        level_id: inicialLevel.id,
        academic_area_id: comunicacionArea.id,
        weekly_hours: 5,
        type: 'required',
        academic_year_id: currentYear.id,
        user_id_registration: 1,
        objectives: 'Desarrollar habilidades comunicativas mediante el juego y la exploración. Fomentar la expresión oral y el reconocimiento de símbolos.',
        methodology: 'Aprendizaje lúdico mediante cuentos, canciones y dramatizaciones. Uso de material concreto y pictórico.',
        resources: 'Cuentos ilustrados, títeres, material didáctico, láminas, bloques de construcción.',
        evaluation: 'Evaluación formativa mediante observación directa y lista de cotejo.'
      },
      // Matemática - 5 Años
      {
        name: 'Matemática',
        code: 'MAT-INI-5',
        grade_id: inicial5.id,
        level_id: inicialLevel.id,
        academic_area_id: matematicaArea.id,
        weekly_hours: 5,
        type: 'required',
        academic_year_id: currentYear.id,
        user_id_registration: 1,
        objectives: 'Introducir conceptos matemáticos básicos mediante el juego. Reconocer números, formas y patrones.',
        methodology: 'Aprendizaje mediante material concreto y juegos matemáticos. Clasificación, seriación y conteo.',
        resources: 'Bloques lógicos, ábacos infantiles, rompecabezas, material de conteo, figuras geométricas.',
        evaluation: 'Observación del desarrollo del pensamiento lógico mediante actividades prácticas.'
      },
      // Psicomotricidad - 5 Años
      {
        name: 'Psicomotricidad',
        code: 'PSI-INI-5',
        grade_id: inicial5.id,
        level_id: inicialLevel.id,
        academic_area_id: personalSocialArea.id,
        weekly_hours: 3,
        type: 'required',
        academic_year_id: currentYear.id,
        user_id_registration: 1,
        objectives: 'Desarrollar la motricidad gruesa y fina mediante actividades lúdicas y ejercicios coordinados.',
        methodology: 'Actividades físicas, juegos de coordinación, circuitos psicomotores y expresión corporal.',
        resources: 'Colchonetas, pelotas, aros, conos, túneles, material de expresión corporal.',
        evaluation: 'Evaluación del desarrollo motor mediante escalas de observación y registros anecdóticos.'
      },
      // Comunicación - 4 Años
      {
        name: 'Comunicación',
        code: 'COM-INI-4',
        grade_id: inicial4.id,
        level_id: inicialLevel.id,
        academic_area_id: comunicacionArea.id,
        weekly_hours: 5,
        type: 'required',
        academic_year_id: currentYear.id,
        user_id_registration: 1,
        objectives: 'Estimular la expresión oral y comprensión mediante cuentos y canciones.',
        methodology: 'Metodología lúdica con énfasis en la oralidad y expresión creativa.',
        resources: 'Cuentos, canciones, material manipulativo, láminas ilustradas.',
        evaluation: 'Observación formativa del desarrollo del lenguaje oral.'
      },
      // Matemática - 4 Años
      {
        name: 'Matemática',
        code: 'MAT-INI-4',
        grade_id: inicial4.id,
        level_id: inicialLevel.id,
        academic_area_id: matematicaArea.id,
        weekly_hours: 4,
        type: 'required',
        academic_year_id: currentYear.id,
        user_id_registration: 1,
        objectives: 'Iniciar nociones de cantidad, tamaño y clasificación mediante el juego.',
        methodology: 'Manipulación de material concreto y actividades de clasificación.',
        resources: 'Bloques, material de conteo, juegos didácticos, rompecabezas.',
        evaluation: 'Evaluación mediante observación del desarrollo lógico-matemático.'
      },
      // Comunicación - 3 Años
      {
        name: 'Comunicación',
        code: 'COM-INI-3',
        grade_id: inicial3.id,
        level_id: inicialLevel.id,
        academic_area_id: comunicacionArea.id,
        weekly_hours: 4,
        type: 'required',
        academic_year_id: currentYear.id,
        user_id_registration: 1,
        objectives: 'Estimular el lenguaje oral mediante canciones, cuentos y juegos interactivos.',
        methodology: 'Juego libre y dirigido con énfasis en la expresión oral.',
        resources: 'Canciones infantiles, cuentos cortos, juguetes didácticos.',
        evaluation: 'Observación del desarrollo comunicativo mediante registros.'
      },
      // Matemática - 3 Años
      {
        name: 'Matemática',
        code: 'MAT-INI-3',
        grade_id: inicial3.id,
        level_id: inicialLevel.id,
        academic_area_id: matematicaArea.id,
        weekly_hours: 3,
        type: 'required',
        academic_year_id: currentYear.id,
        user_id_registration: 1,
        objectives: 'Introducir nociones básicas de cantidad y tamaño mediante actividades lúdicas.',
        methodology: 'Juego con material concreto y actividades sensoriales.',
        resources: 'Material de ensartado, bloques de construcción, juguetes de tamaño.',
        evaluation: 'Evaluación formativa mediante observación del desarrollo cognitivo.'
      },

      // ========== CURSOS DE PRIMARIA ==========
      {
        name: 'Comunicación',
        code: 'COM-PRI',
        grade_id: primerGrado.id,
        level_id: primariaLevel.id,
        academic_area_id: comunicacionArea.id,
        weekly_hours: 6,
        type: 'required',
        academic_year_id: currentYear.id,
        user_id_registration: 1,
        objectives: 'Desarrollar competencias comunicativas mediante la lectura, escritura y expresión oral. Fortalecer la comprensión lectora y la producción de textos narrativos.',
        methodology: 'Aprendizaje basado en proyectos con enfoque comunicativo funcional. Uso de material didáctico interactivo, cuentos y dinámicas grupales para el desarrollo de habilidades lingüísticas.',
        resources: 'Libros de texto, cuentos ilustrados, fichas de lectura, material audiovisual, pizarra interactiva, cuadernos de trabajo.',
        evaluation: 'Evaluación formativa continua mediante rúbricas. Portafolio de trabajos, producciones escritas, exposiciones orales y pruebas de comprensión lectora.'
      },
      {
        name: 'Matemática',
        code: 'MAT-PRI',
        grade_id: primerGrado.id,
        level_id: primariaLevel.id,
        academic_area_id: matematicaArea.id,
        weekly_hours: 6,
        type: 'required',
        academic_year_id: currentYear.id,
        user_id_registration: 1,
        objectives: 'Desarrollar el pensamiento lógico-matemático mediante operaciones básicas de suma y resta. Reconocer patrones numéricos y resolución de problemas cotidianos.',
        methodology: 'Método Singapur adaptado al contexto peruano. Uso de material concreto (regletas, ábacos), representación pictórica y abstracta. Aprendizaje cooperativo y resolución de problemas.',
        resources: 'Material base 10, ábacos, regletas de colores, fichas numéricas, juegos matemáticos, software educativo, cuadernos de ejercicios.',
        evaluation: 'Evaluación por competencias con lista de cotejo. Observación directa del uso de material concreto, resolución de problemas escritos, evaluaciones bimestrales y autoevaluación.'
      },
      {
        name: 'Ciencia y Tecnología',
        code: 'CYT-PRI',
        grade_id: primerGrado.id,
        level_id: primariaLevel.id,
        academic_area_id: cienciaArea.id,
        weekly_hours: 4,
        type: 'required',
        academic_year_id: currentYear.id,
        user_id_registration: 1,
        objectives: 'Explorar el entorno natural mediante la observación y experimentación. Comprender conceptos básicos de seres vivos, materia y energía adaptados a su edad.',
        methodology: 'Método científico adaptado a primer grado mediante indagación guiada. Experimentos sencillos, observación de la naturaleza, registros en cuaderno de campo.',
        resources: 'Kit de experimentos básicos, lupas, semillas, terrarios, microscopio escolar, videos educativos, láminas ilustrativas.',
        evaluation: 'Evaluación de indagación científica mediante informes de experimentos. Cuaderno de campo, exposiciones de proyectos, evaluación del trabajo en equipo.'
      },
      {
        name: 'Comunicación',
        code: 'COM-PRI',
        grade_id: segundoGrado.id,
        level_id: primariaLevel.id,
        academic_area_id: comunicacionArea.id,
        weekly_hours: 6,
        type: 'required',
        academic_year_id: currentYear.id,
        user_id_registration: 1,
        objectives: 'Fortalecer competencias comunicativas avanzando en comprensión lectora y producción de textos descriptivos e instructivos.',
        methodology: 'Enfoque comunicativo textual con producción de diversos tipos de texto. Tertulias literarias, proyectos de escritura creativa.',
        resources: 'Biblioteca de aula, tablets educativas, material de escritura, fichas de comprensión lectora, software de lectura interactiva.',
        evaluation: 'Rúbricas de evaluación por competencias comunicativas. Portafolio digital, producciones textuales, dramatizaciones y exposiciones.'
      },
      {
        name: 'Matemática',
        code: 'MAT-PRI',
        grade_id: segundoGrado.id,
        level_id: primariaLevel.id,
        academic_area_id: matematicaArea.id,
        weekly_hours: 6,
        type: 'required',
        academic_year_id: currentYear.id,
        user_id_registration: 1,
        objectives: 'Consolidar operaciones de suma y resta con números hasta el 100. Introducir multiplicación y medición de magnitudes.',
        methodology: 'Resolución de problemas desde contextos reales. Uso progresivo de material concreto hacia representaciones abstractas.',
        resources: 'Material multibase, bloques lógicos, recta numérica, software matemático interactivo, juegos de mesa matemáticos.',
        evaluation: 'Evaluación auténtica mediante resolución de situaciones problemáticas. Pruebas escritas, exposiciones de estrategias, autoevaluación y coevaluación.'
      },
    ],
    skipDuplicates: true,
  });

  // ==============================================
  // NIVEL 5: Configuraciones del sistema
  // ==============================================

  console.log('📅 Seeding attendance_schedules...');
  // Obtener los IDs de los niveles para horarios de asistencia
  const levelsForSchedule = await prisma.levels.findMany();
  const inicialLevelSchedule = levelsForSchedule.find(l => l.name === 'Inicial');
  const primariaLevelSchedule = levelsForSchedule.find(l => l.name === 'Primaria');
  const secundariaLevelSchedule = levelsForSchedule.find(l => l.name === 'Secundaria');

  await prisma.attendance_schedules.createMany({
    data: [
      {
        level_id: primariaLevelSchedule.id,
        entry1_start_time: new Date('1970-01-01T07:30:00'),
        entry1_limit_time: new Date('1970-01-01T08:00:00'),
        exit1_expected_time: new Date('1970-01-01T13:00:00'),
        entry2_start_time: new Date('1970-01-01T14:00:00'),
        entry2_limit_time: new Date('1970-01-01T14:30:00'),
        exit2_expected_time: new Date('1970-01-01T17:00:00'),
        tolerance_minutes: 15,
        applicable_days: [1, 2, 3, 4, 5],
        user_id_registration: 1,
      },
      {
        level_id: secundariaLevelSchedule.id,
        entry1_start_time: new Date('1970-01-01T07:45:00'),
        entry1_limit_time: new Date('1970-01-01T08:15:00'),
        exit1_expected_time: new Date('1970-01-01T14:00:00'),
        tolerance_minutes: 10,
        applicable_days: [1, 2, 3, 4, 5],
        user_id_registration: 1,
      },
      {
        level_id: inicialLevelSchedule.id,
        entry1_start_time: new Date('1970-01-01T08:00:00'),
        entry1_limit_time: new Date('1970-01-01T08:30:00'),
        exit1_expected_time: new Date('1970-01-01T12:30:00'),
        tolerance_minutes: 15,
        applicable_days: [1, 2, 3, 4, 5],
        user_id_registration: 1,
      },
    ],
    skipDuplicates: true,
  });

  console.log('📅 Seeding academic_calendar...');
  await prisma.academic_calendar.createMany({
    data: [
      {
        title: 'Inicio de Clases 2025',
        description: 'Primer día del año escolar 2025',
        start_date: new Date('2025-03-03'),
        type: 'academico',
        academic_year_id: currentYear.id,
        user_id_registration: 1,
      },
      {
        title: 'Primer Bimestre',
        description: 'Primer periodo de evaluación',
        start_date: new Date('2025-03-03'),
        end_date: new Date('2025-05-09'),
        type: 'bimestre',
        academic_year_id: currentYear.id,
        user_id_registration: 1,
      },
      {
        title: 'Segundo Bimestre',
        description: 'Segundo periodo de evaluación',
        start_date: new Date('2025-05-12'),
        end_date: new Date('2025-07-25'),
        type: 'bimestre',
        academic_year_id: currentYear.id,
        user_id_registration: 1,
      },
      {
        title: 'Tercer Bimestre',
        description: 'Tercer periodo de evaluación',
        start_date: new Date('2025-08-11'),
        end_date: new Date('2025-10-17'),
        type: 'bimestre',
        academic_year_id: currentYear.id,
        user_id_registration: 1,
      },
      {
        title: 'Cuarto Bimestre',
        description: 'Cuarto periodo de evaluación',
        start_date: new Date('2025-10-20'),
        end_date: new Date('2025-12-20'),
        type: 'bimestre',
        academic_year_id: currentYear.id,
        user_id_registration: 1,
      },
      {
        title: 'Fiestas Patrias',
        description: 'Celebración de Fiestas Patrias',
        start_date: new Date('2025-07-28'),
        end_date: new Date('2025-07-29'),
        type: 'feriado',
        academic_year_id: currentYear.id,
        user_id_registration: 1,
      },
      {
        title: 'Día del Maestro',
        description: 'Celebración del Día del Maestro',
        start_date: new Date('2025-07-06'),
        type: 'evento',
        academic_year_id: currentYear.id,
        user_id_registration: 1,
      },
    ],
    skipDuplicates: true,
  });

  console.log('📊 Seeding discount_configs...');
  await prisma.discount_configs.createMany({
    data: [
      // Primaria - 2 hijos: 10% descuento
      {
        children_quantity: 2,
        level: 'Primaria',
        discount_percentage: 10.00,
        description: 'Descuento por 2 hijos en primaria',
        academic_year: 2025,
        user_id_registration: 1,
      },
      // Primaria - 3+ hijos: 15% descuento
      {
        children_quantity: 3,
        level: 'Primaria',
        discount_percentage: 15.00,
        description: 'Descuento por 3 o más hijos en primaria',
        academic_year: 2025,
        user_id_registration: 1,
      },
      // Secundaria - 2 hijos: 10% descuento
      {
        children_quantity: 2,
        level: 'Secundaria',
        discount_percentage: 10.00,
        description: 'Descuento por 2 hijos en secundaria',
        academic_year: 2025,
        user_id_registration: 1,
      },
      // Secundaria - 3+ hijos: 15% descuento
      {
        children_quantity: 3,
        level: 'Secundaria',
        discount_percentage: 15.00,
        description: 'Descuento por 3 o más hijos en secundaria',
        academic_year: 2025,
        user_id_registration: 1,
      },
    ],
    skipDuplicates: true,
  });

  console.log('⚙️ Seeding system_settings...');
  await prisma.system_settings.createMany({
    data: [
      {
        key: 'school_name',
        value: { name: 'Institución Educativa Luz del Saber' },
        user_id_registration: 1,
      },
      {
        key: 'current_academic_year',
        value: { year: 2025, id: currentYear.id },
        user_id_registration: 1,
      },
      {
        key: 'grading_system',
        value: {
          inicial: 'literal',
          primaria: 'literal',
          secundaria: 'vigesimal'
        },
        user_id_registration: 1,
      },
      {
        key: 'attendance_config',
        value: {
          enable_double_shift: true,
          tolerance_minutes: 15,
          require_justification: true
        },
        user_id_registration: 1,
      },
      {
        key: 'payment_config',
        value: {
          currency: 'PEN',
          monthlyDueDate: 10,
          lateFeePercentage: 5,
          minPartialPayment: 50,
          paymentReminders: true,
          reminderDays: [5, 3, 1],
          moraEnabled: true,
          moraDiaria: 0.80,
          moraMaxima: 24.00,
          diasMaximosMora: 30
        },
        user_id_registration: 1,
      },
      {
        key: 'communication_config',
        value: {
          enable_email: true,
          enable_sms: false,
          enable_push: true
        },
        user_id_registration: 1,
      },
    ],
    skipDuplicates: true,
  });

  // ==============================================
  // NIVEL 6: Configuración de Escalas de Calificación
  // ==============================================
  console.log('📊 Seeding grading_scales_config...');

  // Obtener IDs de niveles para la configuración de escalas
  const levelsForGrading = await prisma.levels.findMany();
  const inicialLevelGrading = levelsForGrading.find(l => l.code === 'INI');
  const primariaLevelGrading = levelsForGrading.find(l => l.code === 'PRI');
  const secundariaLevelGrading = levelsForGrading.find(l => l.code === 'SEC');

  // Crear configuración de escalas de calificación
  const gradingScalesConfig = {
    academic_year_id: currentYear.id,
    locked_levels: [],
    created_at: new Date().toISOString(),
    levels: {}
  };

  // Configuración para Inicial (letras: A=4, B=3, C=2, D=1)
  if (inicialLevelGrading) {
    gradingScalesConfig.levels[inicialLevelGrading.id] = {
      level_id: inicialLevelGrading.id,
      level_name: 'Inicial',
      level_code: 'INI',
      type: 'letters',
      scale: [
        { value: 'A', label: 'Logro destacado', numericValue: 4, color: '#22c55e', order: 1 },
        { value: 'B', label: 'Logro esperado', numericValue: 3, color: '#3b82f6', order: 2 },
        { value: 'C', label: 'En proceso', numericValue: 2, color: '#eab308', order: 3 },
        { value: 'D', label: 'En inicio', numericValue: 1, color: '#ef4444', order: 4 }
      ],
      passingGrade: 'B',
      passingNumericValue: 3
    };
  }

  // Configuración para Primaria (letras: A=4, B=3, C=2, D=1)
  if (primariaLevelGrading) {
    gradingScalesConfig.levels[primariaLevelGrading.id] = {
      level_id: primariaLevelGrading.id,
      level_name: 'Primaria',
      level_code: 'PRI',
      type: 'letters',
      scale: [
        { value: 'A', label: 'Logro destacado', numericValue: 4, color: '#22c55e', order: 1 },
        { value: 'B', label: 'Logro esperado', numericValue: 3, color: '#3b82f6', order: 2 },
        { value: 'C', label: 'En proceso', numericValue: 2, color: '#eab308', order: 3 },
        { value: 'D', label: 'En inicio', numericValue: 1, color: '#ef4444', order: 4 }
      ],
      passingGrade: 'B',
      passingNumericValue: 3
    };
  }

  // Configuración para Secundaria (numérico: 0-20)
  if (secundariaLevelGrading) {
    gradingScalesConfig.levels[secundariaLevelGrading.id] = {
      level_id: secundariaLevelGrading.id,
      level_name: 'Secundaria',
      level_code: 'SEC',
      type: 'numeric',
      minValue: 0,
      maxValue: 20,
      passingGrade: 11,
      ranges: [
        { min: 18, max: 20, label: 'Logro destacado', color: '#22c55e', order: 1 },
        { min: 14, max: 17, label: 'Logro esperado', color: '#3b82f6', order: 2 },
        { min: 11, max: 13, label: 'En proceso', color: '#eab308', order: 3 },
        { min: 0, max: 10, label: 'En inicio', color: '#ef4444', order: 4 }
      ]
    };
  }

  // Insertar configuración de escalas
  await prisma.system_settings.create({
    data: {
      key: 'grading_scales_config',
      value: gradingScalesConfig,
      status: 'active',
      user_id_registration: 1,
    }
  });

  console.log('✅ Seed completed successfully!');
  console.log('');
  console.log('📊 Resumen de datos creados:');
  console.log('  - 4 Roles (Director, Profesor, Padre, Secretaria)');
  console.log('  - 34 Permisos');
  console.log('  - 2 Usuarios (Director, Secretaria)');
  console.log('  - 2 Años académicos (2024 cerrado, 2025 activo)');
  console.log('  - 7 Eventos del calendario académico');
  console.log('  - 8 Áreas académicas');
  console.log('  - 3 Niveles educativos (Inicial, Primaria, Secundaria)');
  console.log('  - 14 Grados');
  console.log('  - 28 Secciones');
  console.log('  - 12 Cursos');
  console.log('  - 5 Competencias');
  console.log('  - 4 Capacidades');
  console.log('  - 3 Métodos de pago');
  console.log('  - 4 Conceptos de pago');
  console.log('  - 4 Configuraciones de descuento');
  console.log('  - 2 Horarios de asistencia');
  console.log('  - 7 Configuraciones del sistema (incluye grading_scales_config)');
  console.log('');
  console.log('🔑 Credenciales de acceso:');
  console.log('  Director (Admin): director@luzdelsaber.edu.pe / 123456');
  console.log('  Secretaria: secretaria@luzdelsaber.edu.pe / 123456');
  console.log('');
  console.log('📝 Nota: No se crearon estudiantes, profesores, padres ni datos operativos.');
  console.log('   La base de datos está lista para empezar desde cero.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
