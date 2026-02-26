const { getAllSessions, getSessionById, getSessionByToken, getSessionsByUser, getActiveSessions, createSession, closeSession, closeSessionByToken, closeAllUserSessions } = require('../models/sessionsModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      usuario_id: req.query.usuario_id,
      activa: req.query.activa !== undefined ? req.query.activa === 'true' : undefined,
      fecha_inicio: req.query.fecha_inicio
    };
    const sessions = await getAllSessions(filters);
    res.json({ success: true, data: sessions, total: sessions.length });
  } catch (error) {
    console.error('Error al obtener sesiones:', error);
    res.status(500).json({ success: false, error: 'Error al obtener sesiones' });
  }
};

const getById = async (req, res) => {
  try {
    const session = await getSessionById(req.params.id);
    if (!session) return res.status(404).json({ success: false, error: 'Sesión no encontrada' });
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error al obtener sesión:', error);
    res.status(500).json({ success: false, error: 'Error al obtener sesión' });
  }
};

const getByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const sessions = await getSessionsByUser(userId, limit);
    res.json({ success: true, data: sessions, total: sessions.length });
  } catch (error) {
    console.error('Error al obtener sesiones del usuario:', error);
    res.status(500).json({ success: false, error: 'Error al obtener sesiones del usuario' });
  }
};

const getActive = async (req, res) => {
  try {
    const usuarioId = req.query.usuario_id || null;
    const sessions = await getActiveSessions(usuarioId);
    res.json({ success: true, data: sessions, total: sessions.length });
  } catch (error) {
    console.error('Error al obtener sesiones activas:', error);
    res.status(500).json({ success: false, error: 'Error al obtener sesiones activas' });
  }
};

const create = async (req, res) => {
  try {
    const { usuario_id, token } = req.body;
    if (!usuario_id || !token) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }
    const newSession = await createSession(req.body);
    res.status(201).json({ success: true, message: 'Sesión creada exitosamente', data: newSession });
  } catch (error) {
    console.error('Error al crear sesión:', error);
    res.status(500).json({ success: false, error: 'Error al crear sesión' });
  }
};

const close = async (req, res) => {
  try {
    const closed = await closeSession(req.params.id);
    if (!closed) return res.status(404).json({ success: false, error: 'Sesión no encontrada' });
    res.json({ success: true, message: 'Sesión cerrada exitosamente', data: closed });
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    res.status(500).json({ success: false, error: 'Error al cerrar sesión' });
  }
};

const closeAllUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const count = await closeAllUserSessions(userId);
    res.json({ success: true, message: `Se cerraron ${count} sesiones del usuario` });
  } catch (error) {
    console.error('Error al cerrar sesiones:', error);
    res.status(500).json({ success: false, error: 'Error al cerrar sesiones' });
  }
};

module.exports = { getAll, getById, getByUser, getActive, create, close, closeAllUser };
