/**
 * Servicio Centralizado de Escalas de Calificación
 *
 * Este servicio maneja toda la lógica relacionada con las escalas de calificación
 * por nivel educativo, incluyendo:
 * - Obtención de configuración
 * - Conversiones entre letras y números
 * - Validación de valores
 * - Bloqueo de niveles
 *
 * @module services/gradingScalesService
 */

const pool = require('../config/db');
const systemSettingsModel = require('../models/systemSettingsModel');

const CONFIG_KEY = 'grading_scales_config';

// ============================================
// CONFIGURACIÓN POR DEFECTO (fallback)
// ============================================

const DEFAULT_CONFIG = {
  academic_year_id: null,
  locked_levels: [],
  levels: {
    // Los niveles se cargan dinámicamente de la BD
  }
};

const DEFAULT_LETTER_SCALE = [
  { value: 'A', label: 'Logro destacado', numericValue: 4, color: '#22c55e', order: 1 },
  { value: 'B', label: 'Logro esperado', numericValue: 3, color: '#3b82f6', order: 2 },
  { value: 'C', label: 'En proceso', numericValue: 2, color: '#eab308', order: 3 },
  { value: 'D', label: 'En inicio', numericValue: 1, color: '#ef4444', order: 4 }
];

const DEFAULT_NUMERIC_CONFIG = {
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

// ============================================
// FUNCIONES DE OBTENCIÓN DE CONFIGURACIÓN
// ============================================

/**
 * Obtiene la configuración completa de escalas de calificación
 * @param {number} academicYearId - ID del año académico (opcional)
 * @returns {Object} Configuración de escalas
 */
const getGradingScalesConfig = async (academicYearId = null) => {
  try {
    const setting = await systemSettingsModel.getSettingByKey(CONFIG_KEY);

    if (!setting || !setting.value) {
      console.log('[GradingScales] No se encontró configuración, usando defaults');
      return await buildDefaultConfig(academicYearId);
    }

    const config = typeof setting.value === 'string'
      ? JSON.parse(setting.value)
      : setting.value;

    // IMPORTANTE: Si la config tiene academic_year_id = null, es una config global
    // No debemos reconstruirla porque perderíamos los locked_levels
    // Solo reconstruir si la config tiene un año DIFERENTE y NO es null
    const configHasSpecificYear = config.academic_year_id !== null && config.academic_year_id !== undefined;
    const requestHasSpecificYear = academicYearId !== null && academicYearId !== undefined;

    if (requestHasSpecificYear && configHasSpecificYear && config.academic_year_id !== academicYearId) {
      // Solo reconstruir si AMBOS tienen año específico y son DIFERENTES
      console.log('[GradingScales] Configuración de otro año específico, creando nueva pero PRESERVANDO bloqueos');
      // PRESERVAR locked_levels al crear nueva configuración
      const preserveData = {
        locked_levels: config.locked_levels || [],
        locked_at: config.locked_at || {}
      };
      return await buildDefaultConfig(academicYearId, preserveData);
    }

    // Si la config no tiene año (es global) o coincide, usarla
    return config;
  } catch (error) {
    console.error('[GradingScales] Error al obtener configuración:', error);
    return await buildDefaultConfig(academicYearId);
  }
};

/**
 * Construye la configuración por defecto basada en los niveles existentes
 * IMPORTANTE: Primero intenta leer desde academic_config (configuración del admin)
 * y solo si no existe, usa los valores hardcodeados.
 * @param {number} academicYearId - ID del año académico
 * @param {Object} preserveData - Datos a preservar (locked_levels, locked_at) de config anterior
 * @returns {Object} Configuración por defecto
 */
const buildDefaultConfig = async (academicYearId = null, preserveData = null) => {
  try {
    // Obtener año académico activo si no se especifica
    if (!academicYearId) {
      const yearResult = await pool.query(
        `SELECT id FROM academic_years WHERE status = 'active' ORDER BY year DESC LIMIT 1`
      );
      academicYearId = yearResult.rows[0]?.id || 1;
    }

    // Obtener niveles activos FILTRADOS POR AÑO ACADÉMICO
    // IMPORTANTE: Solo cargar niveles del año académico especificado para evitar duplicados
    const levelsResult = await pool.query(
      `SELECT id, name, code, "order"
       FROM levels
       WHERE status = 'active'
         AND (academic_year_id = $1 OR academic_year_id IS NULL)
       ORDER BY "order"`,
      [academicYearId]
    );
    console.log(`[GradingScales] Niveles cargados para año ${academicYearId}:`, levelsResult.rows.map(l => `${l.id}:${l.name}`));

    // ====== FALLBACK CRÍTICO ======
    // Intentar leer desde academic_config primero (configuración del admin en Settings)
    // Esto asegura que si el admin configuró algo, se use aunque grading_scales_config no exista
    let academicConfig = null;
    try {
      const academicSetting = await systemSettingsModel.getSettingByKey('academic_config');
      if (academicSetting && academicSetting.value) {
        academicConfig = typeof academicSetting.value === 'string'
          ? JSON.parse(academicSetting.value)
          : academicSetting.value;
        console.log('[GradingScales] Usando academic_config como fallback:', Object.keys(academicConfig.gradingSystems || {}));
      }
    } catch (e) {
      console.log('[GradingScales] No se pudo leer academic_config, usando defaults');
    }

    // Mapeo de códigos legacy a claves de academic_config
    const legacyCodeMap = {
      'INI': 'inicial',
      'PRI': 'primaria',
      'SEC': 'secundaria'
    };

    const levels = {};
    for (const level of levelsResult.rows) {
      // Buscar configuración en academic_config
      const legacyKey = legacyCodeMap[level.code] || level.code?.toLowerCase();
      const adminConfig = academicConfig?.gradingSystems?.[legacyKey] ||
                          academicConfig?.gradingSystems?.[level.id] ||
                          academicConfig?.gradingSystems?.[String(level.id)];

      if (adminConfig) {
        // Usar configuración del admin
        if (adminConfig.type === 'letters' || adminConfig.type === 'literal') {
          const scaleArray = Array.isArray(adminConfig.scale) ? adminConfig.scale : ['A', 'B', 'C', 'D'];
          levels[level.id] = {
            level_id: level.id,
            level_name: level.name,
            level_code: level.code,
            type: 'letters',
            scale: scaleArray.map((letter, index) => ({
              value: letter,
              label: adminConfig.descriptions?.[letter] || letter,
              numericValue: adminConfig.numericValues?.[letter] ?? (4 - index),
              color: ['#22c55e', '#3b82f6', '#eab308', '#ef4444'][index] || '#9ca3af',
              order: index + 1
            })),
            passingGrade: adminConfig.passingGrade || 'B',
            passingNumericValue: adminConfig.numericValues?.[adminConfig.passingGrade] ?? 3
          };
        } else {
          // Tipo numérico
          levels[level.id] = {
            level_id: level.id,
            level_name: level.name,
            level_code: level.code,
            type: 'numeric',
            minValue: adminConfig.scale?.min ?? 0,
            maxValue: adminConfig.scale?.max ?? 20,
            passingGrade: adminConfig.passingGrade ?? 11,
            ranges: [
              { min: 18, max: 20, label: 'Logro destacado', color: '#22c55e', order: 1 },
              { min: 14, max: 17, label: 'Logro esperado', color: '#3b82f6', order: 2 },
              { min: 11, max: 13, label: 'En proceso', color: '#eab308', order: 3 },
              { min: 0, max: 10, label: 'En inicio', color: '#ef4444', order: 4 }
            ]
          };
        }
        console.log(`[GradingScales] Nivel ${level.name} configurado desde academic_config (${adminConfig.type})`);
      } else {
        // Fallback a valores hardcodeados
        // Por defecto: Inicial y Primaria usan letras, Secundaria usa números
        const isNumeric = level.code === 'SEC' || level.name.toLowerCase().includes('secundaria');

        if (isNumeric) {
          levels[level.id] = {
            level_id: level.id,
            level_name: level.name,
            level_code: level.code,
            ...DEFAULT_NUMERIC_CONFIG
          };
        } else {
          levels[level.id] = {
            level_id: level.id,
            level_name: level.name,
            level_code: level.code,
            type: 'letters',
            scale: [...DEFAULT_LETTER_SCALE],
            passingGrade: 'B',
            passingNumericValue: 3
          };
        }
        console.log(`[GradingScales] Nivel ${level.name} configurado con defaults (${isNumeric ? 'numeric' : 'letters'})`);
      }
    }

    return {
      academic_year_id: academicYearId,
      // PRESERVAR locked_levels si se proporcionan (importante para no perder bloqueos)
      locked_levels: preserveData?.locked_levels || [],
      locked_at: preserveData?.locked_at || {},
      created_at: new Date().toISOString(),
      levels
    };
  } catch (error) {
    console.error('[GradingScales] Error al construir config por defecto:', error);
    // Incluso en error, intentar preservar locked_levels
    return {
      ...DEFAULT_CONFIG,
      locked_levels: preserveData?.locked_levels || [],
      locked_at: preserveData?.locked_at || {}
    };
  }
};

/**
 * Obtiene la configuración de escala para un nivel específico
 * @param {number} levelId - ID del nivel
 * @param {number} academicYearId - ID del año académico (opcional)
 * @returns {Object|null} Configuración del nivel
 */
const getScaleForLevel = async (levelId, academicYearId = null) => {
  const config = await getGradingScalesConfig(academicYearId);
  return config.levels?.[levelId] || config.levels?.[String(levelId)] || null;
};

// ============================================
// FUNCIONES DE CONVERSIÓN
// ============================================

/**
 * Convierte una letra a su valor numérico equivalente
 * @param {string} letter - Letra de calificación (A, B, C, D, etc.)
 * @param {number} levelId - ID del nivel
 * @param {number} academicYearId - ID del año académico (opcional)
 * @returns {number|null} Valor numérico equivalente
 */
const convertLetterToNumeric = async (letter, levelId, academicYearId = null) => {
  const scaleConfig = await getScaleForLevel(levelId, academicYearId);

  if (!scaleConfig || scaleConfig.type !== 'letters') {
    // Fallback a escala por defecto
    const defaultItem = DEFAULT_LETTER_SCALE.find(
      item => item.value.toUpperCase() === String(letter).toUpperCase()
    );
    return defaultItem?.numericValue || null;
  }

  const gradeItem = scaleConfig.scale.find(
    item => item.value.toUpperCase() === String(letter).toUpperCase()
  );

  return gradeItem?.numericValue || null;
};

/**
 * Convierte un valor numérico a letra según la escala del nivel
 * @param {number} value - Valor numérico
 * @param {number} levelId - ID del nivel
 * @param {number} academicYearId - ID del año académico (opcional)
 * @returns {string|null} Letra equivalente
 */
const convertNumericToLetter = async (value, levelId, academicYearId = null) => {
  const scaleConfig = await getScaleForLevel(levelId, academicYearId);

  if (!scaleConfig) {
    return null;
  }

  // Para escalas de letras, buscar por valor numérico
  if (scaleConfig.type === 'letters') {
    // Ordenar por numericValue descendente
    const sortedScale = [...scaleConfig.scale].sort((a, b) => b.numericValue - a.numericValue);

    for (const item of sortedScale) {
      if (value >= item.numericValue) {
        return item.value;
      }
    }
    // Si no se encontró, retornar la última (más baja)
    return sortedScale[sortedScale.length - 1]?.value || null;
  }

  // Para escalas numéricas, buscar en rangos
  if (scaleConfig.type === 'numeric' && scaleConfig.ranges) {
    for (const range of scaleConfig.ranges) {
      if (value >= range.min && value <= range.max) {
        return range.label;
      }
    }
  }

  return null;
};

/**
 * Obtiene la tabla de conversión completa para un nivel
 * @param {number} levelId - ID del nivel
 * @param {number} academicYearId - ID del año académico (opcional)
 * @returns {Object} Objeto con mappings letra->número
 */
const getConversionTable = async (levelId, academicYearId = null) => {
  const scaleConfig = await getScaleForLevel(levelId, academicYearId);

  if (!scaleConfig || scaleConfig.type !== 'letters') {
    // Retornar tabla por defecto
    const table = {};
    for (const item of DEFAULT_LETTER_SCALE) {
      table[item.value] = item.numericValue;
    }
    return table;
  }

  const table = {};
  for (const item of scaleConfig.scale) {
    table[item.value] = item.numericValue;
  }
  return table;
};

// ============================================
// FUNCIONES DE VALIDACIÓN
// ============================================

/**
 * Valida si un valor de calificación es válido para el nivel
 * @param {string|number} value - Valor a validar
 * @param {number} levelId - ID del nivel
 * @param {number} academicYearId - ID del año académico (opcional)
 * @returns {Object} { isValid: boolean, message: string }
 */
const validateGradeValue = async (value, levelId, academicYearId = null) => {
  const scaleConfig = await getScaleForLevel(levelId, academicYearId);

  if (!scaleConfig) {
    return { isValid: false, message: 'Nivel no configurado' };
  }

  if (scaleConfig.type === 'letters') {
    const validLetters = scaleConfig.scale.map(item => item.value.toUpperCase());
    const upperValue = String(value).toUpperCase();

    if (validLetters.includes(upperValue)) {
      return { isValid: true, message: 'Valor válido' };
    }
    return {
      isValid: false,
      message: `Valor inválido. Valores permitidos: ${validLetters.join(', ')}`
    };
  }

  if (scaleConfig.type === 'numeric') {
    const numValue = parseFloat(value);

    if (isNaN(numValue)) {
      return { isValid: false, message: 'El valor debe ser numérico' };
    }

    if (numValue < scaleConfig.minValue || numValue > scaleConfig.maxValue) {
      return {
        isValid: false,
        message: `El valor debe estar entre ${scaleConfig.minValue} y ${scaleConfig.maxValue}`
      };
    }

    return { isValid: true, message: 'Valor válido' };
  }

  return { isValid: false, message: 'Tipo de escala no reconocido' };
};

/**
 * Verifica si una calificación es aprobatoria
 * @param {string|number} value - Valor de calificación
 * @param {number} levelId - ID del nivel
 * @param {number} academicYearId - ID del año académico (opcional)
 * @returns {boolean} true si es aprobatoria
 */
const isPassingGrade = async (value, levelId, academicYearId = null) => {
  const scaleConfig = await getScaleForLevel(levelId, academicYearId);

  if (!scaleConfig) {
    return false;
  }

  if (scaleConfig.type === 'letters') {
    const numericValue = await convertLetterToNumeric(value, levelId, academicYearId);
    return numericValue !== null && numericValue >= scaleConfig.passingNumericValue;
  }

  if (scaleConfig.type === 'numeric') {
    const numValue = parseFloat(value);
    return !isNaN(numValue) && numValue >= scaleConfig.passingGrade;
  }

  return false;
};

// ============================================
// FUNCIONES DE BLOQUEO
// ============================================

/**
 * Verifica si un nivel está bloqueado para modificaciones
 * @param {number} levelId - ID del nivel
 * @param {number} academicYearId - ID del año académico (opcional)
 * @returns {boolean} true si está bloqueado
 */
const isLevelLocked = async (levelId, academicYearId = null) => {
  const config = await getGradingScalesConfig(academicYearId);
  const lockedLevels = config.locked_levels || [];
  return lockedLevels.includes(levelId) || lockedLevels.includes(String(levelId));
};

/**
 * Bloquea un nivel para evitar modificaciones a su escala
 * @param {number} levelId - ID del nivel
 * @param {number} academicYearId - ID del año académico
 * @param {number} userId - ID del usuario que bloquea
 * @returns {Object} Configuración actualizada
 */
const lockLevel = async (levelId, academicYearId, userId) => {
  const config = await getGradingScalesConfig(academicYearId);

  if (!config.locked_levels) {
    config.locked_levels = [];
  }

  const levelIdNum = parseInt(levelId);
  if (!config.locked_levels.includes(levelIdNum)) {
    config.locked_levels.push(levelIdNum);
    config.locked_at = config.locked_at || {};
    config.locked_at[levelIdNum] = {
      date: new Date().toISOString(),
      user_id: userId
    };
  }

  await systemSettingsModel.upsertSetting(CONFIG_KEY, config, userId);
  return config;
};

/**
 * Verifica si hay notas registradas para un nivel en un año académico
 * @param {number} levelId - ID del nivel
 * @param {number} academicYearId - ID del año académico
 * @returns {boolean} true si hay notas
 */
const hasGradesForLevel = async (levelId, academicYearId) => {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM competency_grades cg
      INNER JOIN students s ON cg.student_id = s.id
      WHERE s.level_id = $1
        AND cg.status = 'active'
        AND EXISTS (
          SELECT 1 FROM academic_years ay
          WHERE ay.id = $2
        )
      LIMIT 1
    `, [levelId, academicYearId]);

    return parseInt(result.rows[0]?.count || 0) > 0;
  } catch (error) {
    console.error('[GradingScales] Error verificando notas:', error);
    return false;
  }
};

/**
 * Bloquea automáticamente un nivel si se detecta que tiene notas
 * @param {number} levelId - ID del nivel
 * @param {number} academicYearId - ID del año académico
 * @param {number} userId - ID del usuario
 * @returns {boolean} true si se bloqueó
 */
const autoLockIfHasGrades = async (levelId, academicYearId, userId) => {
  const isLocked = await isLevelLocked(levelId, academicYearId);

  if (!isLocked) {
    const hasGrades = await hasGradesForLevel(levelId, academicYearId);
    if (hasGrades) {
      await lockLevel(levelId, academicYearId, userId);
      console.log(`[GradingScales] Nivel ${levelId} bloqueado automáticamente`);
      return true;
    }
  }

  return false;
};

// ============================================
// FUNCIONES DE ACTUALIZACIÓN
// ============================================

/**
 * Compara si dos configuraciones de nivel tienen cambios significativos
 * Ignora propiedades de metadata como updated_at, created_at, etc.
 * @param {Object} current - Configuración actual
 * @param {Object} incoming - Configuración entrante
 * @returns {boolean} true si hay cambios significativos
 */
const hasSignificantChanges = (current, incoming) => {
  if (!current || !incoming) return false;

  // Propiedades significativas que NO se pueden cambiar en niveles bloqueados
  const significantProps = [
    'type',           // Tipo de escala (letters/numeric)
    'minValue',       // Valor mínimo (numeric)
    'maxValue',       // Valor máximo (numeric)
    'passingGrade',   // Calificación aprobatoria
    'passingNumericValue', // Valor numérico de aprobación
    'scale',          // Escala (array de letras o objeto min/max)
    'ranges'          // Rangos para escala numérica
  ];

  for (const prop of significantProps) {
    const currentVal = current[prop];
    const incomingVal = incoming[prop];

    // Si ambos son undefined/null, no hay cambio
    if (currentVal == null && incomingVal == null) continue;

    // Comparar como JSON para arrays y objetos
    if (JSON.stringify(currentVal) !== JSON.stringify(incomingVal)) {
      console.log(`[GradingScales] Cambio detectado en propiedad '${prop}':`, {
        current: currentVal,
        incoming: incomingVal
      });
      return true;
    }
  }

  return false;
};

/**
 * Actualiza la configuración de escalas
 * @param {Object} newConfig - Nueva configuración
 * @param {number} userId - ID del usuario que actualiza
 * @returns {Object} Configuración actualizada
 */
const updateGradingScalesConfig = async (newConfig, userId) => {
  // Verificar niveles bloqueados
  const currentConfig = await getGradingScalesConfig(newConfig.academic_year_id);
  const lockedLevels = currentConfig.locked_levels || [];

  // Verificar si se intenta modificar un nivel bloqueado
  for (const levelId of lockedLevels) {
    const currentLevel = currentConfig.levels?.[levelId];
    const newLevel = newConfig.levels?.[levelId];

    if (currentLevel && newLevel) {
      // Comparar solo propiedades significativas (no metadata)
      if (hasSignificantChanges(currentLevel, newLevel)) {
        throw new Error(`No se puede modificar el nivel ${levelId} porque ya tiene notas registradas`);
      }
      // Si no hay cambios significativos, preservar la configuración original del nivel bloqueado
      // para evitar perder metadata (updated_at, etc.)
      newConfig.levels[levelId] = currentLevel;
    }
  }

  // Mantener los niveles bloqueados
  newConfig.locked_levels = lockedLevels;
  newConfig.updated_at = new Date().toISOString();
  newConfig.updated_by = userId;

  await systemSettingsModel.upsertSetting(CONFIG_KEY, newConfig, userId);
  return newConfig;
};

/**
 * Actualiza la escala de un nivel específico
 * @param {number} levelId - ID del nivel
 * @param {Object} levelConfig - Nueva configuración del nivel
 * @param {number} academicYearId - ID del año académico
 * @param {number} userId - ID del usuario
 * @returns {Object} Configuración actualizada
 */
const updateLevelScale = async (levelId, levelConfig, academicYearId, userId) => {
  // Verificar si el nivel está bloqueado
  const isLocked = await isLevelLocked(levelId, academicYearId);
  if (isLocked) {
    throw new Error('No se puede modificar la escala: el nivel ya tiene notas registradas');
  }

  const config = await getGradingScalesConfig(academicYearId);

  if (!config.levels) {
    config.levels = {};
  }

  config.levels[levelId] = {
    ...config.levels[levelId],
    ...levelConfig,
    level_id: levelId,
    updated_at: new Date().toISOString()
  };

  await systemSettingsModel.upsertSetting(CONFIG_KEY, config, userId);
  return config;
};

// ============================================
// FUNCIONES AUXILIARES PARA REPORTES
// ============================================

/**
 * Genera la cláusula CASE WHEN SQL para conversión de letras a números
 * @param {number} levelId - ID del nivel
 * @param {string} columnName - Nombre de la columna (ej: 'cg.value')
 * @param {number} academicYearId - ID del año académico (opcional)
 * @returns {string} Cláusula CASE WHEN SQL
 */
const buildConversionCaseWhen = async (levelId, columnName = 'cg.value', academicYearId = null) => {
  const scaleConfig = await getScaleForLevel(levelId, academicYearId);

  if (!scaleConfig || scaleConfig.type !== 'letters') {
    // Escala por defecto
    return `
      CASE
        WHEN ${columnName} = 'A' THEN 4
        WHEN ${columnName} = 'B' THEN 3
        WHEN ${columnName} = 'C' THEN 2
        WHEN ${columnName} = 'D' THEN 1
        ELSE NULL
      END
    `;
  }

  const cases = scaleConfig.scale
    .map(item => `WHEN ${columnName} = '${item.value}' THEN ${item.numericValue}`)
    .join('\n        ');

  return `
      CASE
        ${cases}
        ELSE NULL
      END
    `;
};

/**
 * Genera la cláusula CASE WHEN SQL para conversión de letras a números
 * para TODOS los niveles (útil para reportes que cruzan múltiples niveles)
 * @param {string} levelColumn - Nombre de la columna del nivel (ej: 'l.id')
 * @param {string} valueColumn - Nombre de la columna del valor (ej: 'cg.value')
 * @param {string} gradingSystemColumn - Columna del sistema de calificación
 * @param {number} academicYearId - ID del año académico (opcional)
 * @returns {string} Cláusula CASE WHEN SQL completa
 */
const buildMultiLevelConversionCaseWhen = async (levelColumn = 'l.id', valueColumn = 'cg.value', gradingSystemColumn = 'cg.grading_system', academicYearId = null) => {
  try {
    const config = await getGradingScalesConfig(academicYearId);
    const levels = config.levels || {};

    const cases = [];

    // Generar cases para cada nivel configurado
    for (const [levelId, levelConfig] of Object.entries(levels)) {
      if (levelConfig.type === 'letters' && levelConfig.scale) {
        for (const item of levelConfig.scale) {
          cases.push(`WHEN ${levelColumn} = ${levelId} AND UPPER(${valueColumn}) = '${item.value.toUpperCase()}' THEN ${item.numericValue}`);
        }
      }
    }

    // Si no hay configuración, usar defaults
    if (cases.length === 0) {
      cases.push(`WHEN UPPER(${valueColumn}) = 'A' THEN 4`);
      cases.push(`WHEN UPPER(${valueColumn}) = 'B' THEN 3`);
      cases.push(`WHEN UPPER(${valueColumn}) = 'C' THEN 2`);
      cases.push(`WHEN UPPER(${valueColumn}) = 'D' THEN 1`);
    }

    // Agregar caso para valores numéricos
    cases.push(`WHEN ${gradingSystemColumn} = 'numeric' THEN CAST(${valueColumn} AS DECIMAL)`);

    return `
      CASE
        ${cases.join('\n        ')}
        ELSE NULL
      END
    `;
  } catch (error) {
    console.error('[GradingScales] Error generando CASE WHEN multi-nivel:', error);
    // Fallback
    return `
      CASE
        WHEN UPPER(${valueColumn}) = 'A' THEN 4
        WHEN UPPER(${valueColumn}) = 'B' THEN 3
        WHEN UPPER(${valueColumn}) = 'C' THEN 2
        WHEN UPPER(${valueColumn}) = 'D' THEN 1
        WHEN ${gradingSystemColumn} = 'numeric' THEN CAST(${valueColumn} AS DECIMAL)
        ELSE NULL
      END
    `;
  }
};

/**
 * Genera cláusula WHERE para filtrar notas aprobatorias (multi-nivel)
 * @param {string} levelColumn - Nombre de la columna del nivel
 * @param {string} valueColumn - Nombre de la columna del valor
 * @param {string} gradingSystemColumn - Columna del sistema de calificación
 * @param {number} academicYearId - ID del año académico (opcional)
 * @returns {string} Cláusula de condición SQL
 */
const buildMultiLevelPassingCondition = async (levelColumn = 'l.id', valueColumn = 'cg.value', gradingSystemColumn = 'cg.grading_system', academicYearId = null) => {
  try {
    const config = await getGradingScalesConfig(academicYearId);
    const levels = config.levels || {};

    const conditions = [];

    // Generar condiciones para cada nivel
    for (const [levelId, levelConfig] of Object.entries(levels)) {
      if (levelConfig.type === 'letters' && levelConfig.scale) {
        const passingLetters = levelConfig.scale
          .filter(item => item.numericValue >= (levelConfig.passingNumericValue || 3))
          .map(item => `'${item.value.toUpperCase()}'`)
          .join(', ');

        if (passingLetters) {
          conditions.push(`(${levelColumn} = ${levelId} AND UPPER(${valueColumn}) IN (${passingLetters}))`);
        }
      } else if (levelConfig.type === 'numeric') {
        conditions.push(`(${levelColumn} = ${levelId} AND ${gradingSystemColumn} = 'numeric' AND CAST(${valueColumn} AS DECIMAL) >= ${levelConfig.passingGrade || 11})`);
      }
    }

    // Si no hay configuración, usar default
    if (conditions.length === 0) {
      return `(UPPER(${valueColumn}) IN ('A', 'B') OR (${gradingSystemColumn} = 'numeric' AND CAST(${valueColumn} AS DECIMAL) >= 11))`;
    }

    return `(${conditions.join(' OR ')})`;
  } catch (error) {
    console.error('[GradingScales] Error generando condición aprobatoria:', error);
    return `(UPPER(${valueColumn}) IN ('A', 'B') OR (${gradingSystemColumn} = 'numeric' AND CAST(${valueColumn} AS DECIMAL) >= 11))`;
  }
};

/**
 * Genera cláusula WHERE para filtrar notas aprobatorias
 * @param {number} levelId - ID del nivel
 * @param {string} columnName - Nombre de la columna
 * @param {string} gradingSystemColumn - Columna que indica el tipo de escala
 * @param {number} academicYearId - ID del año académico (opcional)
 * @returns {string} Cláusula WHERE
 */
const buildPassingGradeCondition = async (levelId, columnName = 'cg.value', gradingSystemColumn = 'cg.grading_system', academicYearId = null) => {
  const scaleConfig = await getScaleForLevel(levelId, academicYearId);

  if (!scaleConfig) {
    // Condición por defecto
    return `(${columnName} IN ('A', 'B') OR (${gradingSystemColumn} = 'numeric' AND CAST(${columnName} AS DECIMAL) >= 11))`;
  }

  if (scaleConfig.type === 'letters') {
    // Obtener letras aprobatorias (las que tienen numericValue >= passingNumericValue)
    const passingLetters = scaleConfig.scale
      .filter(item => item.numericValue >= scaleConfig.passingNumericValue)
      .map(item => `'${item.value}'`)
      .join(', ');

    return `${columnName} IN (${passingLetters})`;
  }

  if (scaleConfig.type === 'numeric') {
    return `CAST(${columnName} AS DECIMAL) >= ${scaleConfig.passingGrade}`;
  }

  return 'FALSE';
};

// ============================================
// EXPORTACIONES
// ============================================

module.exports = {
  // Configuración
  getGradingScalesConfig,
  getScaleForLevel,
  updateGradingScalesConfig,
  updateLevelScale,

  // Conversiones
  convertLetterToNumeric,
  convertNumericToLetter,
  getConversionTable,

  // Validación
  validateGradeValue,
  isPassingGrade,

  // Bloqueo
  isLevelLocked,
  lockLevel,
  hasGradesForLevel,
  autoLockIfHasGrades,

  // Auxiliares para SQL
  buildConversionCaseWhen,
  buildPassingGradeCondition,
  buildMultiLevelConversionCaseWhen,
  buildMultiLevelPassingCondition,

  // Constantes
  CONFIG_KEY,
  DEFAULT_LETTER_SCALE,
  DEFAULT_NUMERIC_CONFIG
};
