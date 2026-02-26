/**
 * Utilidades para manejo de fecha y hora con zona horaria de Lima, Perú (UTC-5)
 * IMPORTANTE: Perú no tiene horario de verano, siempre es UTC-5
 *
 * ARQUITECTURA:
 * - Para ALMACENAR en PostgreSQL: usar new Date() directamente (TIMESTAMPTZ guarda en UTC)
 * - Para COMPARAR horarios: usar getLimaHours/getLimaMinutes (obtiene hora/minuto de Lima)
 * - Para MOSTRAR al usuario: usar utcToLima() o formatDateTimeLima()
 */

// Offset de Lima en minutos respecto a UTC
const LIMA_OFFSET_MINUTES = -5 * 60; // UTC-5 = -300 minutos

/**
 * Obtiene los componentes de hora de Lima desde un timestamp UTC
 * Funciona correctamente en cualquier zona horaria del servidor
 * @param {Date} date - Objeto Date (cualquier timezone)
 * @returns {Object} { hours, minutes, seconds, date, month, year, dayOfWeek }
 */
const getLimaComponents = (date = new Date()) => {
  // Obtener el tiempo UTC en milisegundos
  const utcMs = date.getTime();

  // Crear una fecha "ficticia" que represente la hora de Lima
  // sumando el offset de Lima al UTC
  const limaMs = utcMs + (LIMA_OFFSET_MINUTES * 60 * 1000);
  const limaDate = new Date(limaMs);

  return {
    hours: limaDate.getUTCHours(),
    minutes: limaDate.getUTCMinutes(),
    seconds: limaDate.getUTCSeconds(),
    date: limaDate.getUTCDate(),
    month: limaDate.getUTCMonth(),
    year: limaDate.getUTCFullYear(),
    dayOfWeek: limaDate.getUTCDay() // 0=Domingo, 1=Lunes, ..., 6=Sábado
  };
};

/**
 * Obtiene la fecha y hora actual con los valores de Lima
 * NOTA: Este objeto Date tiene el timestamp ajustado para mostrar hora de Lima
 *       cuando se usan getHours(), getMinutes(), etc.
 *       NO usar para almacenar en PostgreSQL - usar new Date() directamente
 * @returns {Date} Objeto Date con hora de Lima
 */
const getNowLima = () => {
  const lima = getLimaComponents();
  // Crear un Date con los componentes de Lima usando UTC para evitar
  // que el constructor aplique el offset local
  return new Date(Date.UTC(lima.year, lima.month, lima.date, lima.hours, lima.minutes, lima.seconds));
};

/**
 * Obtiene la fecha actual en Lima en formato ISO (YYYY-MM-DD)
 * @returns {string} Fecha en formato 'YYYY-MM-DD'
 */
const getTodayLima = () => {
  const lima = getLimaComponents();
  const year = lima.year;
  const month = String(lima.month + 1).padStart(2, '0');
  const day = String(lima.date).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Obtiene la hora actual en Lima en formato HH:MM:SS
 * @returns {string} Hora en formato 'HH:MM:SS'
 */
const getTimeLima = () => {
  const lima = getLimaComponents();
  const hours = String(lima.hours).padStart(2, '0');
  const minutes = String(lima.minutes).padStart(2, '0');
  const seconds = String(lima.seconds).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * Obtiene el timestamp actual para almacenar en PostgreSQL
 * PostgreSQL TIMESTAMPTZ almacena en UTC y convierte automáticamente
 * @returns {Date} Objeto Date con el timestamp real actual
 */
const getTimestampForDB = () => {
  return new Date();
};

/**
 * Convierte una hora UTC/cualquier timezone a hora de Lima para mostrar
 * @param {Date|string} dateInput - Fecha en cualquier formato
 * @returns {Date} Fecha con valores de Lima
 */
const utcToLima = (dateInput) => {
  const date = new Date(dateInput);
  const lima = getLimaComponents(date);
  return new Date(Date.UTC(lima.year, lima.month, lima.date, lima.hours, lima.minutes, lima.seconds));
};

/**
 * Formatea una fecha para mostrar en formato legible (Lima)
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha formateada 'DD/MM/YYYY HH:MM:SS'
 */
const formatDateTimeLima = (date) => {
  const lima = getLimaComponents(new Date(date));
  const day = String(lima.date).padStart(2, '0');
  const month = String(lima.month + 1).padStart(2, '0');
  const year = lima.year;
  const hours = String(lima.hours).padStart(2, '0');
  const minutes = String(lima.minutes).padStart(2, '0');
  const seconds = String(lima.seconds).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

/**
 * Verifica si una hora de Lima está dentro de un rango
 * @param {string} startTime - Hora de inicio 'HH:MM'
 * @param {string} endTime - Hora de fin 'HH:MM'
 * @returns {boolean} true si la hora actual está en el rango
 */
const isWithinTimeLima = (startTime, endTime) => {
  const lima = getLimaComponents();
  const currentMinutes = lima.hours * 60 + lima.minutes;

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

// ============================================================================
// FUNCIONES DE VALIDACIÓN Y CONVERSIÓN PARA API (Contrato ISO 8601 con Z)
// ============================================================================

/**
 * Convierte cualquier Date a ISO UTC string (contrato API)
 * SIEMPRE usar esta función para respuestas de API que incluyan DateTime
 * @param {Date|string|number} date - Fecha en cualquier formato
 * @returns {string|null} ISO 8601 string con Z (ej: '2026-01-28T18:05:00.000Z') o null si inválido
 */
const toUtcIso = (date) => {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
};

/**
 * Parsea y valida una fecha recibida del cliente
 * SOLO acepta ISO 8601 con offset (Z o +/-HH:MM) o epoch milliseconds
 * Rechaza fechas "naive" (sin zona horaria) que causan problemas de conversión
 *
 * @param {string|number} input - Fecha del cliente
 * @returns {{ valid: boolean, date: Date|null, error: string|null }}
 */
const parseClientDateTime = (input) => {
  if (!input) {
    return { valid: false, date: null, error: 'Fecha requerida' };
  }

  // Epoch milliseconds (number)
  if (typeof input === 'number') {
    const d = new Date(input);
    if (isNaN(d.getTime())) {
      return { valid: false, date: null, error: 'Epoch timestamp inválido' };
    }
    return { valid: true, date: d, error: null };
  }

  if (typeof input !== 'string') {
    return { valid: false, date: null, error: 'Formato de fecha inválido' };
  }

  // Permitir fechas DATE puras (YYYY-MM-DD) para campos de fecha civil
  const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (dateOnlyRegex.test(input)) {
    // IMPORTANTE: Para fechas civiles (sin hora), interpretarlas como medianoche UTC
    // Esto garantiza consistencia entre local y producción
    // El string YYYY-MM-DD se guarda tal cual en columnas DATE de PostgreSQL
    const d = new Date(input + 'T00:00:00.000Z');
    return { valid: true, date: d, error: null, isDateOnly: true };
  }

  // ISO 8601 con Z (UTC): 2026-01-28T18:05:00.000Z
  const isoWithZRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
  if (isoWithZRegex.test(input)) {
    const d = new Date(input);
    if (isNaN(d.getTime())) {
      return { valid: false, date: null, error: 'Fecha ISO inválida' };
    }
    return { valid: true, date: d, error: null };
  }

  // ISO 8601 con offset: 2026-01-28T13:05:00-05:00
  const isoWithOffsetRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?[+-]\d{2}:\d{2}$/;
  if (isoWithOffsetRegex.test(input)) {
    const d = new Date(input);
    if (isNaN(d.getTime())) {
      return { valid: false, date: null, error: 'Fecha ISO con offset inválida' };
    }
    return { valid: true, date: d, error: null };
  }

  // Rechazar fechas naive (sin timezone)
  const naiveDateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d{1,3})?$/;
  if (naiveDateTimeRegex.test(input)) {
    return {
      valid: false,
      date: null,
      error: 'Fecha sin zona horaria no permitida. Use formato ISO 8601 con Z (ej: 2026-01-28T18:05:00.000Z)'
    };
  }

  // Cualquier otro formato - intentar parsear pero advertir
  const d = new Date(input);
  if (isNaN(d.getTime())) {
    return { valid: false, date: null, error: 'Formato de fecha no reconocido' };
  }

  return { valid: true, date: d, error: null };
};

/**
 * Obtiene el timestamp UTC actual como ISO string (para API responses)
 * @returns {string} ISO 8601 UTC string
 */
const utcNow = () => {
  return new Date().toISOString();
};

/**
 * Middleware Express para validar fechas en request body
 * Valida campos DateTime especificados y rechaza fechas naive
 *
 * @param {string[]} dateFields - Lista de campos a validar
 * @param {Object} options - Opciones adicionales
 * @param {boolean} options.required - Si true, campos son requeridos
 * @returns {Function} Middleware Express
 *
 * @example
 * router.post('/events', validateDateFields(['scheduled_date', 'expiration_date']), controller.create);
 */
const validateDateFields = (dateFields = [], options = {}) => {
  return (req, res, next) => {
    const errors = [];

    for (const field of dateFields) {
      const value = req.body[field];

      // Si el campo no está presente
      if (value === undefined || value === null || value === '') {
        if (options.required) {
          errors.push(`${field}: Campo requerido`);
        }
        continue;
      }

      // Validar el formato
      const result = parseClientDateTime(value);
      if (!result.valid) {
        errors.push(`${field}: ${result.error}`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Errores de validación en fechas',
        details: errors
      });
    }

    next();
  };
};

// ============================================================================
// FUNCIONES ADICIONALES PARA CONSISTENCIA LOCAL/PRODUCCIÓN
// ============================================================================

/**
 * Obtiene la fecha actual en Lima como string YYYY-MM-DD
 * CONSISTENTE entre local y producción - no depende de TZ del servidor
 * @returns {string} Fecha en formato 'YYYY-MM-DD'
 */
const getTodayLimaISO = () => {
  // Usar Intl.DateTimeFormat para obtener la fecha en Lima independiente del servidor
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date()); // Retorna 'YYYY-MM-DD'
};

/**
 * Obtiene la hora actual en Lima como string HH:MM:SS
 * CONSISTENTE entre local y producción
 * @returns {string} Hora en formato 'HH:MM:SS'
 */
const getTimeLimaISO = () => {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  return formatter.format(new Date()); // Retorna 'HH:MM:SS'
};

/**
 * Convierte un timestamp UTC a fecha/hora en Lima usando Intl (consistente)
 * @param {Date|string} dateInput - Fecha/hora en cualquier formato
 * @returns {{ date: string, time: string, datetime: string }}
 */
const formatForLima = (dateInput) => {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    return { date: '', time: '', datetime: '' };
  }

  const dateFormatter = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const timeFormatter = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const datetimeFormatter = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  return {
    date: dateFormatter.format(date),
    time: timeFormatter.format(date),
    datetime: datetimeFormatter.format(date)
  };
};

/**
 * Verifica si la hora actual en Lima está dentro de un rango de tiempo
 * CONSISTENTE entre local y producción
 * @param {string} startTime - Hora de inicio 'HH:MM' o 'HH:MM:SS'
 * @param {string} endTime - Hora de fin 'HH:MM' o 'HH:MM:SS'
 * @returns {boolean}
 */
const isWithinTimeLimaConsistent = (startTime, endTime) => {
  const currentTime = getTimeLimaISO(); // 'HH:MM:SS'
  const [currentH, currentM] = currentTime.split(':').map(Number);
  const currentMinutes = currentH * 60 + currentM;

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

/**
 * Obtiene los componentes de fecha/hora en Lima de forma CONSISTENTE
 * Usa Intl.DateTimeFormat para no depender de la TZ del servidor
 * @param {Date} date - Objeto Date (por defecto: ahora)
 * @returns {Object} { hours, minutes, seconds, date, month, year, dayOfWeek }
 */
const getLimaComponentsConsistent = (date = new Date()) => {
  const limaDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Lima' }));

  // Usar formatToParts para obtener componentes exactos
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short'
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type) => parts.find(p => p.type === type)?.value;

  const weekdayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };

  return {
    hours: parseInt(getPart('hour')),
    minutes: parseInt(getPart('minute')),
    seconds: parseInt(getPart('second')),
    date: parseInt(getPart('day')),
    month: parseInt(getPart('month')) - 1, // 0-indexed como JS Date
    year: parseInt(getPart('year')),
    dayOfWeek: weekdayMap[getPart('weekday')] || 0
  };
};

module.exports = {
  // Funciones existentes para Lima (mantener compatibilidad)
  getLimaComponents,
  getNowLima,
  getTodayLima,
  getTimeLima,
  getTimestampForDB,
  utcToLima,
  formatDateTimeLima,
  isWithinTimeLima,
  LIMA_OFFSET_MINUTES,

  // Nuevas funciones CONSISTENTES (usar estas en código nuevo)
  getTodayLimaISO,
  getTimeLimaISO,
  formatForLima,
  isWithinTimeLimaConsistent,
  getLimaComponentsConsistent,

  // Funciones para contrato API
  toUtcIso,
  parseClientDateTime,
  utcNow,
  validateDateFields
};
