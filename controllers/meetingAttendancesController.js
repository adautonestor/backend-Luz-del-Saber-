const { getAllMeetingAttendances, getMeetingAttendanceById, getAttendancesByMeeting, getAttendancesByParent, createMeetingAttendance, updateMeetingAttendance, deleteMeetingAttendance } = require('../models/meetingAttendancesModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      reunion_id: req.query.reunion_id,
      parent_id: req.query.parent_id,
      student_id: req.query.student_id,
      asistio: req.query.asistio !== undefined ? req.query.asistio === 'true' : undefined
    };
    const attendances = await getAllMeetingAttendances(filters);
    res.json({ success: true, data: attendances, total: attendances.length });
  } catch (error) {
    console.error('Error al obtener asistencias:', error);
    res.status(500).json({ success: false, error: 'Error al obtener asistencias' });
  }
};

const getById = async (req, res) => {
  try {
    const attendance = await getMeetingAttendanceById(req.params.id);
    if (!attendance) return res.status(404).json({ success: false, error: 'Asistencia no encontrada' });
    res.json({ success: true, data: attendance });
  } catch (error) {
    console.error('Error al obtener asistencia:', error);
    res.status(500).json({ success: false, error: 'Error al obtener asistencia' });
  }
};

const getByMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const attendances = await getAttendancesByMeeting(meetingId);
    res.json({ success: true, data: attendances, total: attendances.length });
  } catch (error) {
    console.error('Error al obtener asistencias de la reunión:', error);
    res.status(500).json({ success: false, error: 'Error al obtener asistencias de la reunión' });
  }
};

const getByParent = async (req, res) => {
  try {
    const { parentId } = req.params;
    const attendances = await getAttendancesByParent(parentId);
    res.json({ success: true, data: attendances, total: attendances.length });
  } catch (error) {
    console.error('Error al obtener asistencias del padre:', error);
    res.status(500).json({ success: false, error: 'Error al obtener asistencias del padre' });
  }
};

const create = async (req, res) => {
  try {
    const { reunion_id, parent_id } = req.body;
    if (!reunion_id || !parent_id) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }
    const newAttendance = await createMeetingAttendance(req.body, req.user?.id);
    res.status(201).json({ success: true, message: 'Asistencia registrada exitosamente', data: newAttendance });
  } catch (error) {
    console.error('Error al registrar asistencia:', error);
    res.status(500).json({ success: false, error: 'Error al registrar asistencia' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getMeetingAttendanceById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Asistencia no encontrada' });
    const updated = await updateMeetingAttendance(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Asistencia actualizada exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar asistencia:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar asistencia' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getMeetingAttendanceById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Asistencia no encontrada' });
    await deleteMeetingAttendance(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Asistencia eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar asistencia:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar asistencia' });
  }
};

module.exports = { getAll, getById, getByMeeting, getByParent, create, update, remove };
