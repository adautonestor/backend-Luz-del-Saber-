/**
 * Servicio Centralizado de Estados de Asistencia
 * Determina estados de entrada/salida basándose en horarios configurados
 * Considera: tolerance_minutes, applicable_days, tiempos esperados de salida
 */

const pool = require('../config/db');
const { getLimaComponents } = require('../utils/dateTime');

/**
 * Helper: Convertir tiempo (HH:MM:SS o HH:MM) a minutos desde medianoche
 * Siempre usa hora de Lima para objetos Date (independiente del timezone del servidor)
 * @param {string|Date} time - Hora en formato string o Date
 * @returns {number} Minutos desde medianoche (hora Lima)
 */
const timeToMinutes = (time) => {
  if (!time) return null;

  if (time instanceof Date) {
    // Usar componentes de Lima para obtener hora/minutos correctos
    const lima = getLimaComponents(time);
    return lima.hours * 60 + lima.minutes;
  }

  // String format: "HH:MM:SS" or "HH:MM"
  const parts = String(time).split(':').map(Number);
  return parts[0] * 60 + (parts[1] || 0);
};

/**
 * Obtener configuración de horario por nivel
 * Primero busca por level_id exacto. Si no encuentra, busca por código de nivel
 * (fallback cross-year: los niveles se duplican por año académico con IDs distintos
 *  pero mismo código, e.g. INI, PRI, SEC)
 * @param {number} levelId - ID del nivel
 * @returns {Object|null} Configuración del horario
 */
const getScheduleByLevel = async (levelId) => {
  if (!levelId) return null;

  // 1. Búsqueda exacta por level_id
  const exactQuery = `
    SELECT ats.*
    FROM attendance_schedules ats
    WHERE ats.level_id = $1 AND ats.status = 'active'
    LIMIT 1
  `;
  const exactResult = await pool.query(exactQuery, [levelId]);
  if (exactResult.rows[0]) {
    return exactResult.rows[0];
  }

  // 2. Fallback: buscar horario de cualquier nivel con el mismo código
  //    Esto cubre el caso donde los horarios fueron configurados para
  //    niveles de un año académico anterior (IDs diferentes, mismo código)
  const fallbackQuery = `
    SELECT ats.*
    FROM attendance_schedules ats
    INNER JOIN levels l_schedule ON ats.level_id = l_schedule.id
    WHERE l_schedule.code = (SELECT code FROM levels WHERE id = $1)
      AND ats.status = 'active'
    ORDER BY ats.date_time_registration DESC
    LIMIT 1
  `;
  const fallbackResult = await pool.query(fallbackQuery, [levelId]);
  if (fallbackResult.rows[0]) {
    console.log(`🔄 [ATTENDANCE] Horario no encontrado para level_id=${levelId}, usando horario de nivel equivalente (level_id=${fallbackResult.rows[0].level_id})`);
  }
  return fallbackResult.rows[0] || null;
};

/**
 * Validar si hoy es un día aplicable para registrar asistencia
 * @param {number} levelId - ID del nivel
 * @returns {Object} { canRegister: boolean, message?: string, dayName?: string }
 */
const canRegisterAttendanceToday = async (levelId) => {
  const schedule = await getScheduleByLevel(levelId);

  if (!schedule) {
    // Sin configuración, permitir cualquier día
    return { canRegister: true };
  }

  // Obtener día actual en Lima (0=Domingo, 1=Lunes, ..., 6=Sábado)
  const lima = getLimaComponents();
  const currentDay = lima.dayOfWeek;

  // Parsear applicable_days (puede ser string JSON o array)
  let applicableDays = schedule.applicable_days;
  if (typeof applicableDays === 'string') {
    try {
      applicableDays = JSON.parse(applicableDays);
    } catch (e) {
      applicableDays = [1, 2, 3, 4, 5]; // Default: Lunes a Viernes
    }
  }

  if (!Array.isArray(applicableDays) || applicableDays.length === 0) {
    applicableDays = [1, 2, 3, 4, 5]; // Default: Lunes a Viernes
  }

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const currentDayName = dayNames[currentDay];

  if (!applicableDays.includes(currentDay)) {
    return {
      canRegister: false,
      message: `No se permite registro de asistencia los días ${currentDayName}`,
      dayName: currentDayName,
      applicableDays: applicableDays.map(d => dayNames[d]).join(', ')
    };
  }

  return { canRegister: true, dayName: currentDayName };
};

/**
 * Determinar estado de ENTRADA según horario configurado
 * Incluye tolerance_minutes en el cálculo
 * @param {number} levelId - ID del nivel del estudiante
 * @param {Date} entryTime - Hora de entrada
 * @param {number} entryNumber - 1 para primera entrada, 2 para segunda entrada
 * @returns {string} 'a_tiempo' | 'tardanza'
 */
const determineEntryStatus = async (levelId, entryTime, entryNumber = 1) => {
  try {
    const schedule = await getScheduleByLevel(levelId);

    if (!schedule) {
      console.log(`⚠️ [ATTENDANCE] No hay horario configurado para nivel ${levelId}, marcando como a_tiempo`);
      return 'a_tiempo';
    }

    // Seleccionar hora límite según número de entrada
    const limitTimeField = entryNumber === 2 ? 'entry2_limit_time' : 'entry1_limit_time';
    const limitTime = schedule[limitTimeField];

    if (!limitTime) {
      console.log(`⚠️ [ATTENDANCE] No hay ${limitTimeField} configurado para nivel ${levelId}`);
      return 'a_tiempo';
    }

    // Obtener tolerancia (default: 0 minutos)
    const toleranceMinutes = schedule.tolerance_minutes || 0;

    // Convertir a minutos para comparación
    const currentTimeMinutes = timeToMinutes(entryTime);
    const limitTimeMinutes = timeToMinutes(limitTime);

    // Límite efectivo = hora límite + tolerancia
    const effectiveLimitMinutes = limitTimeMinutes + toleranceMinutes;

    const entryTimeStr = entryTime instanceof Date
      ? `${String(entryTime.getHours()).padStart(2,'0')}:${String(entryTime.getMinutes()).padStart(2,'0')}`
      : entryTime;

    console.log(`📍 [ATTENDANCE] Entrada${entryNumber} - Nivel ${levelId}:`);
    console.log(`   Hora entrada: ${entryTimeStr} (${currentTimeMinutes} min)`);
    console.log(`   Límite configurado: ${limitTime} (${limitTimeMinutes} min)`);
    console.log(`   Tolerancia: ${toleranceMinutes} min`);
    console.log(`   Límite efectivo: ${effectiveLimitMinutes} min`);

    // Comparar: hora_actual <= (hora_límite + tolerancia) → a_tiempo
    if (currentTimeMinutes <= effectiveLimitMinutes) {
      console.log('   ✅ Estado: a_tiempo');
      return 'a_tiempo';
    } else {
      console.log('   ⚠️ Estado: tardanza');
      return 'tardanza';
    }
  } catch (error) {
    console.error('❌ [ATTENDANCE] Error determinando estado de entrada:', error);
    return 'a_tiempo'; // En caso de error, no penalizar
  }
};

/**
 * Determinar estado de SALIDA según horario configurado
 * @param {number} levelId - ID del nivel del estudiante
 * @param {Date} exitTime - Hora de salida
 * @param {number} exitNumber - 1 para primera salida, 2 para segunda salida
 * @returns {string} 'a_tiempo' | 'salida_temprana'
 */
const determineExitStatus = async (levelId, exitTime, exitNumber = 1) => {
  try {
    const schedule = await getScheduleByLevel(levelId);

    if (!schedule) {
      console.log(`⚠️ [ATTENDANCE] No hay horario configurado para nivel ${levelId}, marcando salida como a_tiempo`);
      return 'a_tiempo';
    }

    // Seleccionar hora esperada de salida según número
    const expectedTimeField = exitNumber === 2 ? 'exit2_expected_time' : 'exit1_expected_time';
    const expectedTime = schedule[expectedTimeField];

    if (!expectedTime) {
      console.log(`⚠️ [ATTENDANCE] No hay ${expectedTimeField} configurado para nivel ${levelId}`);
      return 'a_tiempo';
    }

    // Obtener tolerancia (default: 0 minutos)
    const toleranceMinutes = schedule.tolerance_minutes || 0;

    // Convertir a minutos para comparación
    const currentTimeMinutes = timeToMinutes(exitTime);
    const expectedTimeMinutes = timeToMinutes(expectedTime);

    // Límite mínimo para salida = hora esperada - tolerancia
    const minimumExitMinutes = expectedTimeMinutes - toleranceMinutes;

    const exitTimeStr = exitTime instanceof Date
      ? `${String(exitTime.getHours()).padStart(2,'0')}:${String(exitTime.getMinutes()).padStart(2,'0')}`
      : exitTime;

    console.log(`📍 [ATTENDANCE] Salida${exitNumber} - Nivel ${levelId}:`);
    console.log(`   Hora salida: ${exitTimeStr} (${currentTimeMinutes} min)`);
    console.log(`   Hora esperada: ${expectedTime} (${expectedTimeMinutes} min)`);
    console.log(`   Tolerancia: ${toleranceMinutes} min`);
    console.log(`   Mínimo permitido: ${minimumExitMinutes} min`);

    // Comparar: hora_actual >= (hora_esperada - tolerancia) → a_tiempo
    if (currentTimeMinutes >= minimumExitMinutes) {
      console.log('   ✅ Estado: a_tiempo');
      return 'a_tiempo';
    } else {
      console.log('   ⚠️ Estado: salida_temprana');
      return 'salida_temprana';
    }
  } catch (error) {
    console.error('❌ [ATTENDANCE] Error determinando estado de salida:', error);
    return 'a_tiempo'; // En caso de error, no penalizar
  }
};

/**
 * Obtener resumen de horario para un nivel (útil para mostrar en UI)
 * @param {number} levelId - ID del nivel
 * @returns {Object} Resumen del horario configurado
 */
const getScheduleSummary = async (levelId) => {
  const schedule = await getScheduleByLevel(levelId);

  if (!schedule) {
    return null;
  }

  return {
    levelId: schedule.level_id,
    entry1: {
      startTime: schedule.entry1_start_time,
      limitTime: schedule.entry1_limit_time
    },
    exit1: {
      expectedTime: schedule.exit1_expected_time
    },
    entry2: {
      startTime: schedule.entry2_start_time,
      limitTime: schedule.entry2_limit_time
    },
    exit2: {
      expectedTime: schedule.exit2_expected_time
    },
    toleranceMinutes: schedule.tolerance_minutes,
    applicableDays: schedule.applicable_days
  };
};

module.exports = {
  timeToMinutes,
  getScheduleByLevel,
  canRegisterAttendanceToday,
  determineEntryStatus,
  determineExitStatus,
  getScheduleSummary
};
