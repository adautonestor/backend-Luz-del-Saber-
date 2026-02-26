const { getAllParentMeetings, getParentMeetingById, getMeetingsByGradeAndSection, createParentMeeting, updateParentMeeting, cancelMeeting, deleteParentMeeting } = require('../models/parentMeetingsModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      grade_id: req.query.grade_id,
      section_id: req.query.section_id,
      academic_year_id: req.query.academic_year_id,
      status: req.query.status
    };
    const meetings = await getAllParentMeetings(filters);
    res.json({ success: true, data: meetings, total: meetings.length });
  } catch (error) {
    console.error('Error al obtener reuniones:', error);
    res.status(500).json({ success: false, error: 'Error al obtener reuniones' });
  }
};

const getById = async (req, res) => {
  try {
    const meeting = await getParentMeetingById(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, error: 'Reunión no encontrada' });
    res.json({ success: true, data: meeting });
  } catch (error) {
    console.error('Error al obtener reunión:', error);
    res.status(500).json({ success: false, error: 'Error al obtener reunión' });
  }
};

const getByGradeAndSection = async (req, res) => {
  try {
    const { gradeId, sectionId } = req.params;
    const academicYearId = req.query.academic_year_id || null;
    const meetings = await getMeetingsByGradeAndSection(gradeId, sectionId, academicYearId);
    res.json({ success: true, data: meetings, total: meetings.length });
  } catch (error) {
    console.error('Error al obtener reuniones:', error);
    res.status(500).json({ success: false, error: 'Error al obtener reuniones' });
  }
};

const create = async (req, res) => {
  try {
    const { titulo, fecha_reunion, hora_inicio, hora_fin } = req.body;
    if (!titulo || !fecha_reunion || !hora_inicio || !hora_fin) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }
    const newMeeting = await createParentMeeting(req.body, req.user?.id);
    res.status(201).json({ success: true, message: 'Reunión creada exitosamente', data: newMeeting });
  } catch (error) {
    console.error('Error al crear reunión:', error);
    res.status(500).json({ success: false, error: 'Error al crear reunión' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getParentMeetingById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Reunión no encontrada' });
    if (existing.estado === 'cancelada') {
      return res.status(400).json({ success: false, error: 'No se puede modificar una reunión cancelada' });
    }
    const updated = await updateParentMeeting(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Reunión actualizada exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar reunión:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar reunión' });
  }
};

const cancel = async (req, res) => {
  try {
    const existing = await getParentMeetingById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Reunión no encontrada' });
    if (existing.estado === 'cancelada') {
      return res.status(400).json({ success: false, error: 'La reunión ya está cancelada' });
    }
    const { motivo } = req.body;
    if (!motivo) {
      return res.status(400).json({ success: false, error: 'Debe proporcionar un motivo de cancelación' });
    }
    const cancelled = await cancelMeeting(req.params.id, motivo, req.user?.id);
    res.json({ success: true, message: 'Reunión cancelada exitosamente', data: cancelled });
  } catch (error) {
    console.error('Error al cancelar reunión:', error);
    res.status(500).json({ success: false, error: 'Error al cancelar reunión' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getParentMeetingById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Reunión no encontrada' });
    await deleteParentMeeting(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Reunión eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar reunión:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar reunión' });
  }
};

module.exports = { getAll, getById, getByGradeAndSection, create, update, cancel, remove };
