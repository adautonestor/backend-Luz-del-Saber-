const {
  getAllAcademicYears,
  getAcademicYearById,
  getCurrentAcademicYear,
  createAcademicYear,
  updateAcademicYear,
  activateAcademicYear,
  closeAcademicYear,
  deleteAcademicYear
} = require('../models/academicYearsModel');

/**
 * Transformar estado de inglés a español para el frontend
 */
const transformStatusToSpanish = (status) => {
  const statusMap = {
    'planned': 'planificado',
    'active': 'activo',
    'closed': 'cerrado',
    'inactive': 'inactivo'
  };
  return statusMap[status] || status;
};

/**
 * Transformar objeto de año académico para el frontend
 */
const transformYearForResponse = (year) => {
  if (!year) return null;
  return {
    ...year,
    status: transformStatusToSpanish(year.status)
  };
};

/**
 * Crear los 3 niveles educativos predeterminados para un año académico
 * @param {number} academicYearId - ID del año académico
 * @param {number} userId - ID del usuario que crea
 * @returns {Promise<boolean>} true si se crearon niveles, false si ya existían
 */
const createDefaultLevels = async (academicYearId, userId) => {
  const pool = require('../config/db');

  // Verificar si ya existen niveles activos para este año
  const existingLevels = await pool.query(`
    SELECT COUNT(*) as count FROM levels WHERE academic_year_id = $1 AND status = 'active'
  `, [academicYearId]);

  const levelCount = parseInt(existingLevels.rows[0].count);
  if (levelCount > 0) {
    console.log(`ℹ️ El año ${academicYearId} ya tiene ${levelCount} nivel(es) activo(s), no se crearán predeterminados.`);
    return false;
  }

  const defaultLevels = [
    { name: 'Inicial', code: 'INI', order: 1, description: 'Nivel de educación inicial' },
    { name: 'Primaria', code: 'PRI', order: 2, description: 'Nivel de educación primaria' },
    { name: 'Secundaria', code: 'SEC', order: 3, description: 'Nivel de educación secundaria' }
  ];

  console.log(`🎓 Creando ${defaultLevels.length} niveles predeterminados para año académico ${academicYearId}...`);

  for (const level of defaultLevels) {
    await pool.query(`
      INSERT INTO levels (name, code, "order", description, academic_year_id, status, user_id_registration, date_time_registration)
      VALUES ($1, $2, $3, $4, $5, 'active', $6, CURRENT_TIMESTAMP)
    `, [level.name, level.code, level.order, level.description, academicYearId, userId]);
    console.log(`   ✓ Nivel "${level.name}" creado`);
  }

  console.log(`✅ Niveles predeterminados creados exitosamente para año ${academicYearId}`);
  return true;
};

/**
 * Obtener todos los años escolares con filtros opcionales
 */
const getAll = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      year: req.query.year
    };

    const years = await getAllAcademicYears(filters);

    // Transformar estados a español
    const transformedYears = years.map(transformYearForResponse);

    res.json({
      success: true,
      data: transformedYears,
      total: transformedYears.length
    });
  } catch (error) {
    console.error('Error al obtener años escolares:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener años escolares'
    });
  }
};

/**
 * Obtener un año escolar por ID
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const year = await getAcademicYearById(id);

    if (!year) {
      return res.status(404).json({
        success: false,
        error: 'Año escolar no encontrado'
      });
    }

    res.json({
      success: true,
      data: transformYearForResponse(year)
    });
  } catch (error) {
    console.error('Error al obtener año escolar:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener año escolar'
    });
  }
};

/**
 * Obtener año escolar activo actual
 */
const getCurrent = async (req, res) => {
  try {
    const year = await getCurrentAcademicYear();

    // Devolver 200 con data: null si no hay año activo (no es un error)
    res.json({
      success: true,
      data: year ? transformYearForResponse(year) : null,
      message: year ? null : 'No hay año escolar activo'
    });
  } catch (error) {
    console.error('Error al obtener año escolar actual:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener año escolar actual'
    });
  }
};

/**
 * Crear un nuevo año escolar
 */
const create = async (req, res) => {
  try {
    const userId = req.user?.id;

    // Validaciones básicas
    const { nombre, año, fecha_inicio, fecha_fin } = req.body;

    if (!nombre || !año || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    // Mapear estados del español al inglés
    const stateMap = {
      'planificado': 'planned',
      'activo': 'active',
      'cerrado': 'closed'
    };

    // Mapear tipos a abreviaciones para el código
    const typeMap = {
      'regular': 'REG',
      'recuperacion': 'REC',
      'vacacional': 'VAC',
      'intensivo': 'INT',
      'verano': 'VER',
      'especial': 'ESP'
    };

    const yearType = req.body.type || 'regular';
    const yearCode = req.body.year_code || `${año}-${typeMap[yearType] || 'REG'}`;

    // Mapear tipos a nombres descriptivos para mensajes de error
    const typeDisplayNames = {
      'regular': 'Regular',
      'recuperacion': 'Recuperación',
      'vacacional': 'Vacacional',
      'intensivo': 'Intensivo',
      'verano': 'Verano',
      'especial': 'Especial'
    };

    // Transformar campos del español al inglés para el modelo
    const yearData = {
      name: nombre,
      year: año,
      start_date: fecha_inicio,
      end_date: fecha_fin,
      type: yearType,
      description: req.body.description || null,
      status: stateMap[req.body.status] || req.body.status || 'planned',
      year_code: yearCode,
      file: req.body.file || null
    };

    const pool = require('../config/db');

    // Verificar si ya existe un año activo con la misma combinación año + tipo
    const existingActive = await pool.query(`
      SELECT id, name FROM academic_years
      WHERE year = $1 AND type = $2 AND status != 'inactive'
      LIMIT 1
    `, [año, yearType]);

    if (existingActive.rows.length > 0) {
      const typeDisplayName = typeDisplayNames[yearType] || yearType;
      return res.status(400).json({
        success: false,
        error: `Ya existe un año lectivo de tipo "${typeDisplayName}" para el año ${año}. Solo puede existir un año lectivo por cada tipo y año.`
      });
    }

    // Verificar si existe un año con el mismo año+tipo pero INACTIVO (eliminado)
    const existingInactive = await pool.query(`
      SELECT id FROM academic_years
      WHERE year = $1 AND type = $2 AND status = 'inactive'
      LIMIT 1
    `, [año, yearType]);

    let newYear;

    if (existingInactive.rows.length > 0) {
      // Si existe uno inactivo, lo reactivamos y actualizamos
      const inactiveId = existingInactive.rows[0].id;
      console.log(`📝 Reactivando año inactivo ID ${inactiveId} (año ${año}, tipo ${yearType})`);

      await pool.query(`
        UPDATE academic_years
        SET name = $1, start_date = $2, end_date = $3, description = $4,
            status = $5, year_code = $6, file = $7,
            user_id_modification = $8, date_time_modification = CURRENT_TIMESTAMP,
            close_date = NULL, close_reason = NULL, close_observations = NULL
        WHERE id = $9
      `, [
        yearData.name,
        yearData.start_date,
        yearData.end_date,
        yearData.description,
        yearData.status,
        yearData.year_code,
        yearData.file,
        userId,
        inactiveId
      ]);

      // Obtener el año actualizado
      newYear = await getAcademicYearById(inactiveId);
      console.log(`✅ Año reactivado exitosamente: ${newYear.name}`);
    } else {
      // Crear nuevo año normalmente
      newYear = await createAcademicYear(yearData, userId);
    }

    // SIEMPRE crear los 3 niveles predeterminados (Inicial, Primaria, Secundaria)
    // La función verifica internamente si ya existen para no duplicar
    try {
      const levelsCreated = await createDefaultLevels(newYear.id, userId);
      if (levelsCreated) {
        console.log(`🎓 Niveles predeterminados (Inicial, Primaria, Secundaria) creados para año ${newYear.id}`);
      }
    } catch (defaultError) {
      console.error('Error al crear niveles predeterminados:', defaultError);
      // No fallar la creación del año si falla la creación de niveles
    }

    res.status(201).json({
      success: true,
      message: 'Año escolar creado exitosamente',
      data: transformYearForResponse(newYear)
    });
  } catch (error) {
    console.error('Error al crear año escolar:', error);

    // Manejar error de duplicado
    if (error.code === '23505') {
      const detail = error.detail || '';
      let errorMessage = 'Ya existe un año académico con estos datos.';

      // Extraer información del detalle del error
      if (detail.includes('year, type')) {
        const yearMatch = detail.match(/\(year, type\)=\((\d+), (\w+)\)/);
        if (yearMatch) {
          const year = yearMatch[1];
          const type = yearMatch[2];
          const typeMap = {
            'regular': 'Regular',
            'intensivo': 'Intensivo',
            'verano': 'Verano',
            'especial': 'Especial'
          };
          errorMessage = `Ya existe un año académico ${year} de tipo "${typeMap[type] || type}". No se pueden crear años duplicados.`;
        }
      }

      return res.status(409).json({
        success: false,
        error: errorMessage
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al crear año escolar'
    });
  }
};

/**
 * Actualizar un año escolar
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Verificar que el año escolar existe
    const existing = await getAcademicYearById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Año escolar no encontrado'
      });
    }

    // Si solo se está enviando status: 'activo', usar la función específica de activación
    const bodyKeys = Object.keys(req.body);
    if (bodyKeys.length === 1 && req.body.status === 'activo') {
      const activatedYear = await activateAcademicYear(id, userId);
      return res.json({
        success: true,
        message: 'Año escolar activado exitosamente',
        data: transformYearForResponse(activatedYear)
      });
    }

    // Mapear estados del español al inglés
    const stateMap = {
      'planificado': 'planned',
      'activo': 'active',
      'cerrado': 'closed'
    };

    // Mapear tipos a abreviaciones para el código
    const typeMap = {
      'regular': 'REG',
      'recuperacion': 'REC',
      'vacacional': 'VAC',
      'intensivo': 'INT',
      'verano': 'VER',
      'especial': 'ESP'
    };

    // Determinar valores actualizados
    const updatedYear = req.body.año || existing.year;
    const updatedType = req.body.type || existing.type;

    // Mapear tipos a nombres descriptivos para mensajes de error
    const typeDisplayNames = {
      'regular': 'Regular',
      'recuperacion': 'Recuperación',
      'vacacional': 'Vacacional',
      'intensivo': 'Intensivo',
      'verano': 'Verano',
      'especial': 'Especial'
    };

    // Verificar si ya existe otro año con la misma combinación año + tipo
    const pool = require('../config/db');
    const existingDuplicate = await pool.query(`
      SELECT id, name FROM academic_years
      WHERE year = $1 AND type = $2 AND status != 'inactive' AND id != $3
      LIMIT 1
    `, [updatedYear, updatedType, id]);

    if (existingDuplicate.rows.length > 0) {
      const typeDisplayName = typeDisplayNames[updatedType] || updatedType;
      return res.status(400).json({
        success: false,
        error: `Ya existe un año lectivo de tipo "${typeDisplayName}" para el año ${updatedYear}. Solo puede existir un año lectivo por cada tipo y año.`
      });
    }

    // Regenerar código si cambió el año o el tipo, o si no existe
    let yearCode = existing.year_code;
    if (req.body.año || req.body.type || !existing.year_code) {
      yearCode = `${updatedYear}-${typeMap[updatedType] || 'REG'}`;
    }
    // Permitir override manual si se proporciona explícitamente
    if (req.body.year_code !== undefined) {
      yearCode = req.body.year_code;
    }

    // Transformar campos del español al inglés para el modelo
    const yearData = {
      name: req.body.nombre || existing.name,
      year: updatedYear,
      start_date: req.body.fecha_inicio || existing.start_date,
      end_date: req.body.fecha_fin || existing.end_date,
      type: updatedType,
      description: req.body.description !== undefined ? req.body.description : existing.description,
      status: req.body.status ? (stateMap[req.body.status] || req.body.status) : existing.status,
      copy_structure: req.body.copiarEstructura !== undefined ? req.body.copiarEstructura : existing.copy_structure,
      year_code: yearCode,
      file: req.body.file !== undefined ? req.body.file : existing.file
    };

    const result = await updateAcademicYear(id, yearData, userId);

    res.json({
      success: true,
      message: 'Año escolar actualizado exitosamente',
      data: transformYearForResponse(result)
    });
  } catch (error) {
    console.error('Error al actualizar año escolar:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar año escolar'
    });
  }
};

/**
 * Generar snapshot de datos del año para archivar
 * @param {number} yearId - ID del año escolar
 * @returns {Promise<Object>} Datos de archivo del año
 */
const generateArchiveSnapshot = async (yearId) => {
  const pool = require('../config/db');

  // Obtener el año numérico para la consulta financiera
  const yearRecord = await getAcademicYearById(yearId);
  const numericYear = yearRecord?.year || yearId;

  // Niveles
  const levels = await pool.query(`
    SELECT id, name, description, code, "order", status
    FROM levels
    WHERE academic_year_id = $1 AND status = 'active'
    ORDER BY "order"
  `, [yearId]);

  // Grados
  const grades = await pool.query(`
    SELECT g.id, g.name, g.description, g.code, g."order", g.level_id, l.name as level_name
    FROM grades g
    JOIN levels l ON g.level_id = l.id
    WHERE g.academic_year_id = $1 AND g.status = 'active'
    ORDER BY l."order", g."order"
  `, [yearId]);

  // Secciones
  const sections = await pool.query(`
    SELECT s.id, s.name, s.grade_id, s.capacity, s.shift, g.name as grade_name, l.name as level_name
    FROM sections s
    JOIN grades g ON s.grade_id = g.id
    JOIN levels l ON g.level_id = l.id
    WHERE s.academic_year_id = $1 AND s.status = 'active'
    ORDER BY l."order", g."order", s.name
  `, [yearId]);

  // Cursos
  const courses = await pool.query(`
    SELECT c.id, c.name, c.code, c.area, c.level_id, c.weekly_hours, l.name as level_name
    FROM courses c
    LEFT JOIN levels l ON c.level_id = l.id
    WHERE c.academic_year_id = $1 AND c.status = 'active'
    ORDER BY c.name
  `, [yearId]);

  // Estudiantes matriculados
  const students = await pool.query(`
    SELECT
      s.id, s.code, s.first_names, s.last_names, s.dni, s.gender, s.birth_date,
      sec.name as section_name,
      g.name as grade_name,
      l.name as level_name
    FROM students s
    LEFT JOIN sections sec ON s.section_id = sec.id
    LEFT JOIN grades g ON sec.grade_id = g.id
    LEFT JOIN levels l ON g.level_id = l.id
    WHERE s.academic_year_id = $1 AND s.status = 'active'
    ORDER BY l."order", g."order", sec.name, s.last_names, s.first_names
  `, [yearId]);

  // Resumen financiero (usar el año numérico, no el ID)
  const financial = await pool.query(`
    SELECT
      COUNT(DISTINCT pr.id) as total_payments,
      COALESCE(SUM(pr.paid_amount), 0) as total_collected,
      COUNT(DISTINCT po.id) as total_obligations,
      COALESCE(SUM(po.total_amount), 0) as total_expected
    FROM payment_records pr
    JOIN payment_obligations po ON pr.obligation_id = po.id
    WHERE po.academic_year = $1
  `, [numericYear]);

  // Construir objeto de archivo
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalLevels: levels.rows.length,
      totalGrades: grades.rows.length,
      totalSections: sections.rows.length,
      totalCourses: courses.rows.length,
      totalStudents: students.rows.length,
      totalPayments: parseInt(financial.rows[0]?.total_payments || 0),
      totalCollected: parseFloat(financial.rows[0]?.total_collected || 0),
      totalExpected: parseFloat(financial.rows[0]?.total_expected || 0)
    },
    academicStructure: {
      levels: levels.rows,
      grades: grades.rows,
      sections: sections.rows,
      courses: courses.rows
    },
    students: students.rows,
    financialSummary: {
      totalPayments: parseInt(financial.rows[0]?.total_payments || 0),
      totalCollected: parseFloat(financial.rows[0]?.total_collected || 0),
      totalExpected: parseFloat(financial.rows[0]?.total_expected || 0),
      completedPayments: parseInt(financial.rows[0]?.total_payments || 0)
    }
  };
};

/**
 * Cerrar un año escolar
 */
const close = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo, observaciones, crearSiguienteAño } = req.body;
    const userId = req.user?.id;

    // Verificar que el año escolar existe
    const existing = await getAcademicYearById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Año escolar no encontrado'
      });
    }

    if (!motivo) {
      return res.status(400).json({
        success: false,
        error: 'El motivo de cierre es requerido'
      });
    }

    // Generar snapshot de datos antes de cerrar
    console.log(`Generando archivo de datos para el año ${existing.name}...`);
    const archiveData = await generateArchiveSnapshot(id);
    console.log(`Archivo generado: ${archiveData.summary.totalStudents} estudiantes, ${archiveData.summary.totalLevels} niveles`);

    // Cerrar el año escolar con el archivo de datos
    const closedYear = await closeAcademicYear(id, motivo, observaciones, userId, archiveData);

    let newYear = null;

    // Si se solicita crear el siguiente año automáticamente
    if (crearSiguienteAño) {
      const nextYear = existing.year + 1;

      // Calcular fechas del nuevo año (sumando 1 año a las fechas del año cerrado)
      const startDate = new Date(existing.start_date);
      const endDate = new Date(existing.end_date);

      startDate.setFullYear(startDate.getFullYear() + 1);
      endDate.setFullYear(endDate.getFullYear() + 1);

      // Formatear fechas a YYYY-MM-DD
      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Datos del nuevo año
      const newYearData = {
        name: `Año Académico ${nextYear}`,
        year: nextYear,
        year_code: `${nextYear}-${existing.type === 'regular' ? 'REG' : existing.type.substring(0, 3).toUpperCase()}`,
        type: existing.type || 'regular',
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        description: `Año lectivo ${nextYear} creado automáticamente al cerrar el año ${existing.year}`,
        status: 'planned',
        file: null
      };

      try {
        // Crear el nuevo año
        newYear = await createAcademicYear(newYearData, userId);

        // Crear los 3 niveles predeterminados (Inicial, Primaria, Secundaria)
        await createDefaultLevels(newYear.id, userId);
        console.log(`🎓 Niveles predeterminados creados para el nuevo año ${nextYear}`);

      } catch (error) {
        console.error('Error al crear siguiente año:', error);
        // No fallar el cierre si falla la creación del siguiente año
      }
    }

    const responseMessage = newYear
      ? `Año escolar cerrado exitosamente. Se ha creado automáticamente el año ${newYear.year}.`
      : 'Año escolar cerrado exitosamente';

    res.json({
      success: true,
      message: responseMessage,
      data: {
        closedYear: transformYearForResponse(closedYear),
        newYear: newYear ? transformYearForResponse(newYear) : null
      }
    });
  } catch (error) {
    console.error('Error al cerrar año escolar:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cerrar año escolar'
    });
  }
};

/**
 * Eliminar un año escolar (soft delete)
 * Solo se permite si no tiene estudiantes matriculados vigentes
 */
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const pool = require('../config/db');

    const existing = await getAcademicYearById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Año escolar no encontrado'
      });
    }

    // Verificar si el año está activo
    if (existing.status === 'active') {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar un año lectivo activo. Debe cerrarlo o desactivarlo primero.'
      });
    }

    // Verificar si hay estudiantes matriculados vigentes en este año
    const studentsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM students
      WHERE academic_year_id = $1 AND status = 'active'
    `, [id]);

    const studentCount = parseInt(studentsResult.rows[0].count);

    if (studentCount > 0) {
      return res.status(400).json({
        success: false,
        error: `No se puede eliminar este año lectivo porque tiene ${studentCount} estudiante(s) matriculado(s) vigente(s). Debe retirar o trasladar a todos los estudiantes antes de eliminar el año.`
      });
    }

    await deleteAcademicYear(id, userId);

    res.json({
      success: true,
      message: 'Año escolar eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar año escolar:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar año escolar'
    });
  }
};

/**
 * Agregar niveles predeterminados a un año existente que no los tiene
 */
const addDefaultLevels = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const pool = require('../config/db');

    // Verificar que el año existe
    const existing = await getAcademicYearById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Año escolar no encontrado'
      });
    }

    // Verificar si ya tiene niveles
    const existingLevels = await pool.query(`
      SELECT COUNT(*) as count FROM levels WHERE academic_year_id = $1
    `, [id]);

    if (parseInt(existingLevels.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: `Este año ya tiene ${existingLevels.rows[0].count} nivel(es). No se pueden agregar los predeterminados.`
      });
    }

    // Crear los niveles predeterminados
    await createDefaultLevels(id, userId);

    // Obtener los niveles creados
    const newLevels = await pool.query(`
      SELECT id, name, code, "order", description
      FROM levels
      WHERE academic_year_id = $1
      ORDER BY "order"
    `, [id]);

    res.json({
      success: true,
      message: 'Niveles predeterminados agregados exitosamente',
      data: {
        levels: newLevels.rows
      }
    });
  } catch (error) {
    console.error('Error al agregar niveles predeterminados:', error);
    res.status(500).json({
      success: false,
      error: 'Error al agregar niveles predeterminados'
    });
  }
};

module.exports = {
  getAll,
  getById,
  getCurrent,
  create,
  update,
  close,
  remove,
  addDefaultLevels
};
