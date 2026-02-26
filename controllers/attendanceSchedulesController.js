const {
  getAllAttendanceSchedules,
  getAttendanceScheduleById,
  getScheduleByLevelId,
  createAttendanceSchedule,
  updateAttendanceSchedule,
  upsertAttendanceSchedule,
  deleteAttendanceSchedule
} = require('../models/attendanceSchedulesModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      level_id: req.query.level_id
    };
    const schedules = await getAllAttendanceSchedules(filters);
    res.json({ success: true, data: schedules, total: schedules.length });
  } catch (error) {
    console.error('Error al obtener horarios de asistencia:', error);
    res.status(500).json({ success: false, error: 'Error al obtener horarios de asistencia' });
  }
};

const getById = async (req, res) => {
  try {
    const schedule = await getAttendanceScheduleById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, error: 'Horario no encontrado' });
    res.json({ success: true, data: schedule });
  } catch (error) {
    console.error('Error al obtener horario:', error);
    res.status(500).json({ success: false, error: 'Error al obtener horario' });
  }
};

const getByLevelId = async (req, res) => {
  try {
    const { levelId } = req.params;
    const schedule = await getScheduleByLevelId(levelId);
    if (!schedule) return res.status(404).json({ success: false, error: 'Horario no encontrado para este nivel' });
    res.json({ success: true, data: schedule });
  } catch (error) {
    console.error('Error al obtener horario por nivel:', error);
    res.status(500).json({ success: false, error: 'Error al obtener horario' });
  }
};

const create = async (req, res) => {
  try {
    const { level_id, entry1_start_time, entry1_limit_time, exit1_expected_time } = req.body;
    if (!level_id || !entry1_start_time || !entry1_limit_time || !exit1_expected_time) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos: level_id, entry1_start_time, entry1_limit_time, exit1_expected_time' });
    }
    const newSchedule = await createAttendanceSchedule(req.body, req.user?.id);
    res.status(201).json({ success: true, message: 'Horario creado exitosamente', data: newSchedule });
  } catch (error) {
    console.error('Error al crear horario:', error);
    res.status(500).json({ success: false, error: 'Error al crear horario' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getAttendanceScheduleById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Horario no encontrado' });
    const updated = await updateAttendanceSchedule(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Horario actualizado exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar horario:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar horario' });
  }
};

/**
 * Guardar múltiples horarios (upsert)
 * Recibe un array de horarios y los crea/actualiza por level_id
 */
const saveAll = async (req, res) => {
  try {
    const { schedules } = req.body;
    if (!schedules || !Array.isArray(schedules)) {
      return res.status(400).json({ success: false, error: 'Se requiere un array de horarios' });
    }

    const results = [];
    for (const schedule of schedules) {
      if (!schedule.level_id || !schedule.entry1_start_time || !schedule.entry1_limit_time || !schedule.exit1_expected_time) {
        continue; // Saltar horarios incompletos
      }
      const result = await upsertAttendanceSchedule(schedule, req.user?.id);
      results.push(result);
    }

    res.json({ success: true, message: 'Horarios guardados exitosamente', data: results, total: results.length });
  } catch (error) {
    console.error('Error al guardar horarios:', error);
    res.status(500).json({ success: false, error: 'Error al guardar horarios' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getAttendanceScheduleById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Horario no encontrado' });
    await deleteAttendanceSchedule(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Horario eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar horario:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar horario' });
  }
};

module.exports = { getAll, getById, getByLevelId, create, update, saveAll, remove };
