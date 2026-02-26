const { getAllSchedules, getScheduleById, getScheduleByGradeAndSection, createSchedule, updateSchedule, deleteSchedule } = require('../models/schedulesModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      grade_id: req.query.grade_id,
      section_id: req.query.section_id,
      academic_year_id: req.query.academic_year_id
    };
    const schedules = await getAllSchedules(filters);
    res.json({ success: true, data: schedules, total: schedules.length });
  } catch (error) {
    console.error('Error al obtener horarios:', error);
    res.status(500).json({ success: false, error: 'Error al obtener horarios' });
  }
};

const getById = async (req, res) => {
  try {
    const schedule = await getScheduleById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, error: 'Horario no encontrado' });
    res.json({ success: true, data: schedule });
  } catch (error) {
    console.error('Error al obtener horario:', error);
    res.status(500).json({ success: false, error: 'Error al obtener horario' });
  }
};

const getByGradeAndSection = async (req, res) => {
  try {
    const { gradeId, sectionId, yearId } = req.params;
    const schedule = await getScheduleByGradeAndSection(gradeId, sectionId, yearId);
    if (!schedule) return res.status(404).json({ success: false, error: 'Horario no encontrado' });
    res.json({ success: true, data: schedule });
  } catch (error) {
    console.error('Error al obtener horario:', error);
    res.status(500).json({ success: false, error: 'Error al obtener horario' });
  }
};

const create = async (req, res) => {
  try {
    const { grado_id, seccion_id, academic_year_id, horario_data } = req.body;
    if (!grado_id || !seccion_id || !academic_year_id || !horario_data) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }

    // Verificar si ya existe horario
    const existing = await getScheduleByGradeAndSection(grado_id, seccion_id, academic_year_id);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Ya existe un horario para este grado, sección y año escolar' });
    }

    const newSchedule = await createSchedule(req.body, req.user?.id);
    res.status(201).json({ success: true, message: 'Horario creado exitosamente', data: newSchedule });
  } catch (error) {
    console.error('Error al crear horario:', error);
    res.status(500).json({ success: false, error: 'Error al crear horario' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getScheduleById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Horario no encontrado' });
    const updated = await updateSchedule(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Horario actualizado exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar horario:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar horario' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getScheduleById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Horario no encontrado' });
    await deleteSchedule(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Horario eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar horario:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar horario' });
  }
};

module.exports = { getAll, getById, getByGradeAndSection, create, update, remove };
