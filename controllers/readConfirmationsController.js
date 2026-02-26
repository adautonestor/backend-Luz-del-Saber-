const { getAllReadConfirmations, getReadConfirmationById, getConfirmationsByCommunication, getConfirmationsByUser, getConfirmation, createReadConfirmation, markAsRead, deleteReadConfirmation } = require('../models/readConfirmationsModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      comunicacion_id: req.query.comunicacion_id,
      usuario_id: req.query.usuario_id,
      leido: req.query.leido !== undefined ? req.query.leido === 'true' : undefined
    };
    const confirmations = await getAllReadConfirmations(filters);
    res.json({ success: true, data: confirmations, total: confirmations.length });
  } catch (error) {
    console.error('Error al obtener confirmaciones de lectura:', error);
    res.status(500).json({ success: false, error: 'Error al obtener confirmaciones de lectura' });
  }
};

const getById = async (req, res) => {
  try {
    const confirmation = await getReadConfirmationById(req.params.id);
    if (!confirmation) return res.status(404).json({ success: false, error: 'Confirmación no encontrada' });
    res.json({ success: true, data: confirmation });
  } catch (error) {
    console.error('Error al obtener confirmación:', error);
    res.status(500).json({ success: false, error: 'Error al obtener confirmación' });
  }
};

const getByCommunication = async (req, res) => {
  try {
    const { communicationId } = req.params;
    const confirmations = await getConfirmationsByCommunication(communicationId);
    res.json({ success: true, data: confirmations, total: confirmations.length });
  } catch (error) {
    console.error('Error al obtener confirmaciones de la comunicación:', error);
    res.status(500).json({ success: false, error: 'Error al obtener confirmaciones de la comunicación' });
  }
};

const getByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const confirmations = await getConfirmationsByUser(userId);
    res.json({ success: true, data: confirmations, total: confirmations.length });
  } catch (error) {
    console.error('Error al obtener confirmaciones del usuario:', error);
    res.status(500).json({ success: false, error: 'Error al obtener confirmaciones del usuario' });
  }
};

const create = async (req, res) => {
  try {
    const { comunicacion_id, usuario_id } = req.body;
    if (!comunicacion_id || !usuario_id) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }

    // Usar markAsRead que maneja tanto crear como actualizar
    const confirmation = await markAsRead(comunicacion_id, usuario_id);
    res.status(201).json({ success: true, message: 'Confirmación creada exitosamente', data: confirmation, confirmacion: confirmation });
  } catch (error) {
    console.error('Error al crear confirmación:', error);
    res.status(500).json({ success: false, error: 'Error al crear confirmación' });
  }
};

const markRead = async (req, res) => {
  try {
    const { communicationId, userId } = req.params;
    const marked = await markAsRead(communicationId, userId);
    res.json({ success: true, message: 'Comunicación marcada como leída', data: marked });
  } catch (error) {
    console.error('Error al marcar como leída:', error);
    res.status(500).json({ success: false, error: 'Error al marcar como leída' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getReadConfirmationById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Confirmación no encontrada' });
    await deleteReadConfirmation(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Confirmación eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar confirmación:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar confirmación' });
  }
};

module.exports = { getAll, getById, getByCommunication, getByUser, create, markRead, remove };
