const { getAllCalendarEvents, getCalendarEventById, getEventsByYear, getEventsByDateRange, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } = require('../models/academicCalendarModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      academic_year_id: req.query.academic_year_id,
      type: req.query.type,
      mes: req.query.mes,
      fecha_inicio: req.query.fecha_inicio,
      fecha_fin: req.query.fecha_fin
    };
    const events = await getAllCalendarEvents(filters);
    res.json({ success: true, data: events, total: events.length });
  } catch (error) {
    console.error('Error al obtener eventos del calendario:', error);
    res.status(500).json({ success: false, error: 'Error al obtener eventos del calendario' });
  }
};

const getById = async (req, res) => {
  try {
    const event = await getCalendarEventById(req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Evento no encontrado' });
    res.json({ success: true, data: event });
  } catch (error) {
    console.error('Error al obtener evento:', error);
    res.status(500).json({ success: false, error: 'Error al obtener evento' });
  }
};

const getByYear = async (req, res) => {
  try {
    const { yearId } = req.params;
    const events = await getEventsByYear(yearId);
    res.json({ success: true, data: events, total: events.length });
  } catch (error) {
    console.error('Error al obtener eventos del año:', error);
    res.status(500).json({ success: false, error: 'Error al obtener eventos del año' });
  }
};

const getByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    const events = await getEventsByDateRange(startDate, endDate);
    res.json({ success: true, data: events, total: events.length });
  } catch (error) {
    console.error('Error al obtener eventos por rango de fechas:', error);
    res.status(500).json({ success: false, error: 'Error al obtener eventos por rango de fechas' });
  }
};

const create = async (req, res) => {
  try {
    const { titulo, fecha_inicio, fecha_fin } = req.body;
    if (!titulo || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }
    const newEvent = await createCalendarEvent(req.body, req.user?.id);
    res.status(201).json({ success: true, message: 'Evento creado exitosamente', data: newEvent });
  } catch (error) {
    console.error('Error al crear evento:', error);
    res.status(500).json({ success: false, error: 'Error al crear evento' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getCalendarEventById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Evento no encontrado' });
    const updated = await updateCalendarEvent(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Evento actualizado exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar evento:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar evento' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getCalendarEventById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Evento no encontrado' });
    await deleteCalendarEvent(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Evento eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar evento:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar evento' });
  }
};

module.exports = { getAll, getById, getByYear, getByDateRange, create, update, remove };
