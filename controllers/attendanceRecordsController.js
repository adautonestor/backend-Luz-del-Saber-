const { getAllAttendanceRecords, getAttendanceRecordById, createAttendanceRecord, updateAttendanceRecord, registerEntry, registerExit, deleteAttendanceRecord, getAttendanceByStudentAndDate } = require('../models/attendanceRecordsModel');
const { findStudentByDni } = require('../models/studentQrCodesModel');
const { determineEntryStatus, determineExitStatus, canRegisterAttendanceToday } = require('../models/attendanceSchedulesModel');

// Importar utilidades centralizadas de fecha/hora para zona horaria de Lima
const { getTodayLima } = require('../utils/dateTime');

const getAll = async (req, res) => {
  try {
    const filters = {
      student_id: req.query.student_id,
      fecha: req.query.fecha,
      fecha_inicio: req.query.fecha_inicio,
      fecha_fin: req.query.fecha_fin
    };
    const records = await getAllAttendanceRecords(filters);
    res.json({ success: true, data: records, total: records.length });
  } catch (error) {
    console.error('Error al obtener registros de asistencia:', error);
    res.status(500).json({ success: false, error: 'Error al obtener registros de asistencia' });
  }
};

const getById = async (req, res) => {
  try {
    const record = await getAttendanceRecordById(req.params.id);
    if (!record) return res.status(404).json({ success: false, error: 'Registro de asistencia no encontrado' });
    res.json({ success: true, data: record });
  } catch (error) {
    console.error('Error al obtener registro de asistencia:', error);
    res.status(500).json({ success: false, error: 'Error al obtener registro de asistencia' });
  }
};

const create = async (req, res) => {
  try {
    const { student_id, fecha } = req.body;
    if (!student_id || !fecha) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }
    const newRecord = await createAttendanceRecord(req.body, req.user?.id);
    res.status(201).json({ success: true, message: 'Registro de asistencia creado exitosamente', data: newRecord });
  } catch (error) {
    console.error('Error al crear registro de asistencia:', error);
    res.status(500).json({ success: false, error: 'Error al crear registro de asistencia' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getAttendanceRecordById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Registro de asistencia no encontrado' });
    const updated = await updateAttendanceRecord(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Registro de asistencia actualizado exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar registro de asistencia:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar registro de asistencia' });
  }
};

const scanEntry = async (req, res) => {
  try {
    const { student_id, fecha } = req.body;
    if (!student_id || !fecha) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos (student_id, fecha)' });
    }
    const record = await registerEntry(student_id, fecha, req.user?.id);
    res.json({ success: true, message: 'Entrada registrada exitosamente', data: record });
  } catch (error) {
    console.error('Error al registrar entrada:', error);
    res.status(500).json({ success: false, error: 'Error al registrar entrada' });
  }
};

const scanExit = async (req, res) => {
  try {
    const { student_id, fecha } = req.body;
    if (!student_id || !fecha) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos (student_id, fecha)' });
    }
    const record = await registerExit(student_id, fecha, req.user?.id);
    res.json({ success: true, message: 'Salida registrada exitosamente', data: record });
  } catch (error) {
    console.error('Error al registrar salida:', error);
    res.status(500).json({ success: false, error: error.message || 'Error al registrar salida' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getAttendanceRecordById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Registro de asistencia no encontrado' });
    await deleteAttendanceRecord(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Registro de asistencia eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar registro de asistencia:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar registro de asistencia' });
  }
};

/**
 * Determina el próximo tipo de registro permitido para un estudiante
 * Flujo: Entrada1 → Salida1 → Entrada2 → Salida2 → Completo
 * @param {Object} existingRecord - Registro existente del día (puede ser null)
 * @returns {Object} { nextType: 'entrada'|'salida'|null, nextNumber: 1|2, nextName: string, isComplete: boolean }
 */
const getNextAllowedRegistration = (existingRecord) => {
  if (!existingRecord) {
    // Sin registro: primera entrada
    return { nextType: 'entrada', nextNumber: 1, nextName: 'Entrada 1', isComplete: false };
  }

  // Tiene entrada1 pero no salida1 → próximo es salida1
  if (existingRecord.entry_time1 && !existingRecord.exit_time1) {
    return { nextType: 'salida', nextNumber: 1, nextName: 'Salida 1', isComplete: false };
  }

  // Tiene salida1 pero no entrada2 → próximo es entrada2
  if (existingRecord.exit_time1 && !existingRecord.entry_time2) {
    return { nextType: 'entrada', nextNumber: 2, nextName: 'Entrada 2', isComplete: false };
  }

  // Tiene entrada2 pero no salida2 → próximo es salida2
  if (existingRecord.entry_time2 && !existingRecord.exit_time2) {
    return { nextType: 'salida', nextNumber: 2, nextName: 'Salida 2', isComplete: false };
  }

  // Todo completo
  if (existingRecord.exit_time2) {
    return { nextType: null, nextNumber: null, nextName: null, isComplete: true };
  }

  // Estado inesperado, por seguridad permitir entrada
  return { nextType: 'entrada', nextNumber: 1, nextName: 'Entrada 1', isComplete: false };
};

/**
 * Escaneo inteligente de DNI
 * Lee el código de barras del DNI físico, busca al estudiante,
 * determina si es entrada/salida, registra y determina tardanza
 * Valida días aplicables según configuración del nivel
 *
 * MODO AUTOMÁTICO (mode='auto' o no especificado):
 * El sistema determina automáticamente si es entrada o salida según la secuencia.
 *
 * MODO MANUAL (mode='entrada' o mode='salida'):
 * Valida que el tipo solicitado corresponda a la secuencia correcta.
 */
const smartScan = async (req, res) => {
  try {
    const { code, mode = 'auto' } = req.body; // mode: 'auto' | 'entrada' | 'salida'

    if (!code) {
      return res.status(400).json({ success: false, error: 'Debe proporcionar un DNI' });
    }

    // 1. Buscar estudiante por DNI (código de barras del DNI físico)
    const student = await findStudentByDni(code);

    if (!student) {
      return res.status(404).json({
        success: false,
        error: `No se encontró estudiante con DNI: ${code}`,
        dni: code
      });
    }

    // 2. Validar si hoy es día aplicable para registrar asistencia
    const dayValidation = await canRegisterAttendanceToday(student.level_id);
    if (!dayValidation.canRegister) {
      return res.status(400).json({
        success: false,
        error: dayValidation.message,
        dayName: dayValidation.dayName,
        applicableDays: dayValidation.applicableDays,
        student
      });
    }

    // Usar zona horaria de Lima para fecha, timestamp real para hora
    const today = getTodayLima();
    const now = new Date();

    // 3. Verificar si ya existe registro de hoy
    const existingRecord = await getAttendanceByStudentAndDate(student.id, today);

    // 4. Determinar el próximo registro permitido según la secuencia
    const nextAllowed = getNextAllowedRegistration(existingRecord);

    // Si ya completó la jornada
    if (nextAllowed.isComplete) {
      return res.json({
        success: true,
        message: 'Jornada completa - Ya registró todas las entradas y salidas del día',
        data: {
          student,
          record: existingRecord,
          type: null,
          alreadyRegistered: true,
          isComplete: true,
          eventName: 'Jornada completa'
        }
      });
    }

    // 5. Si el modo es manual, validar que corresponda a la secuencia
    if (mode !== 'auto' && mode !== nextAllowed.nextType) {
      const expectedAction = nextAllowed.nextType === 'entrada' ? 'registrar entrada' : 'registrar salida';
      const attemptedAction = mode === 'entrada' ? 'registrar entrada' : 'registrar salida';

      return res.status(400).json({
        success: false,
        error: `Secuencia incorrecta: Intentó ${attemptedAction}, pero debe ${expectedAction} (${nextAllowed.nextName})`,
        expectedType: nextAllowed.nextType,
        expectedNumber: nextAllowed.nextNumber,
        expectedName: nextAllowed.nextName,
        attemptedType: mode,
        student,
        record: existingRecord
      });
    }

    let record;
    let eventType = nextAllowed.nextType;
    let eventNumber = nextAllowed.nextNumber;
    let eventName = nextAllowed.nextName;

    if (eventType === 'entrada') {
      if (eventNumber === 1) {
        // Primera entrada del día
        const entryStatus = await determineEntryStatus(student.level_id, now, 1);

        record = await createAttendanceRecord({
          student_id: student.id,
          date: today,
          entry_time1: now,
          entry_status1: entryStatus,
          registration_type: 'qr'
        }, req.user?.id);
      } else {
        // Segunda entrada (después de la primera salida)
        record = await registerEntry(student.id, today, req.user?.id, student.level_id);
      }
    } else {
      // Registrar salida (1 o 2)
      record = await registerExit(student.id, today, req.user?.id, student.level_id);
    }

    // Obtener el registro actualizado
    const updatedRecord = await getAttendanceByStudentAndDate(student.id, today);

    // Determinar el próximo registro permitido para informar al frontend
    const nextAfterThis = getNextAllowedRegistration(updatedRecord);

    res.json({
      success: true,
      message: `${eventName} registrada correctamente`,
      data: {
        student,
        record: updatedRecord,
        type: eventType,
        eventNumber,
        eventName,
        timestamp: now.toISOString(),
        // Información para el frontend sobre el próximo registro
        nextAllowed: nextAfterThis
      }
    });

  } catch (error) {
    console.error('Error en escaneo inteligente:', error);
    res.status(500).json({ success: false, error: 'Error al procesar escaneo: ' + error.message });
  }
};

/**
 * Obtener el próximo registro permitido para un estudiante específico
 * Útil para que el frontend sepa qué botón habilitar/deshabilitar
 */
const getStudentNextAction = async (req, res) => {
  try {
    const { dni } = req.params;

    if (!dni) {
      return res.status(400).json({ success: false, error: 'Debe proporcionar un DNI' });
    }

    // Buscar estudiante por DNI
    const student = await findStudentByDni(dni);

    if (!student) {
      return res.status(404).json({
        success: false,
        error: `No se encontró estudiante con DNI: ${dni}`,
        dni
      });
    }

    const today = getTodayLima();
    const existingRecord = await getAttendanceByStudentAndDate(student.id, today);
    const nextAllowed = getNextAllowedRegistration(existingRecord);

    res.json({
      success: true,
      data: {
        student,
        record: existingRecord,
        nextAllowed
      }
    });

  } catch (error) {
    console.error('Error al obtener próxima acción:', error);
    res.status(500).json({ success: false, error: 'Error al obtener próxima acción' });
  }
};

/**
 * Obtener resumen de asistencia del día
 */
const getTodaySummary = async (req, res) => {
  try {
    // Usar zona horaria de Perú (UTC-5)
    const today = getTodayLima();
    console.log(`📅 [ATTENDANCE] Consultando registros para fecha Lima: ${today}`);
    const records = await getAllAttendanceRecords({ date: today });

    // Contar estadísticas
    const present = records.filter(r => r.entry_time1).length;
    const late = records.filter(r => r.entry_status1 === 'tardanza').length;
    const onTime = records.filter(r => r.entry_status1 === 'a_tiempo').length;

    res.json({
      success: true,
      data: {
        date: today,
        totalRecords: records.length,
        present,
        late,
        onTime,
        records
      }
    });
  } catch (error) {
    console.error('Error al obtener resumen del día:', error);
    res.status(500).json({ success: false, error: 'Error al obtener resumen' });
  }
};

module.exports = { getAll, getById, create, update, scanEntry, scanExit, remove, smartScan, getTodaySummary, getStudentNextAction };
