const { getAllAuditLogs, getAuditLogById, getLogsByUser, getLogsByTable, createAuditLog } = require('../models/auditLogsModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      usuario_id: req.query.usuario_id,
      tabla: req.query.tabla,
      accion: req.query.accion,
      fecha_inicio: req.query.fecha_inicio,
      fecha_fin: req.query.fecha_fin
    };
    const logs = await getAllAuditLogs(filters);
    res.json({ success: true, data: logs, total: logs.length });
  } catch (error) {
    console.error('Error al obtener logs de auditoría:', error);
    res.status(500).json({ success: false, error: 'Error al obtener logs de auditoría' });
  }
};

const getById = async (req, res) => {
  try {
    const log = await getAuditLogById(req.params.id);
    if (!log) return res.status(404).json({ success: false, error: 'Log no encontrado' });
    res.json({ success: true, data: log });
  } catch (error) {
    console.error('Error al obtener log:', error);
    res.status(500).json({ success: false, error: 'Error al obtener log' });
  }
};

const getByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    const logs = await getLogsByUser(userId, limit);
    res.json({ success: true, data: logs, total: logs.length });
  } catch (error) {
    console.error('Error al obtener logs del usuario:', error);
    res.status(500).json({ success: false, error: 'Error al obtener logs del usuario' });
  }
};

const getByTable = async (req, res) => {
  try {
    const { table } = req.params;
    const registroId = req.query.registro_id || null;
    const logs = await getLogsByTable(table, registroId);
    res.json({ success: true, data: logs, total: logs.length });
  } catch (error) {
    console.error('Error al obtener logs de la tabla:', error);
    res.status(500).json({ success: false, error: 'Error al obtener logs de la tabla' });
  }
};

const create = async (req, res) => {
  try {
    const { usuario_id, tabla, accion } = req.body;
    if (!usuario_id || !tabla || !accion) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }
    const newLog = await createAuditLog(req.body);
    res.status(201).json({ success: true, message: 'Log creado exitosamente', data: newLog });
  } catch (error) {
    console.error('Error al crear log:', error);
    res.status(500).json({ success: false, error: 'Error al crear log' });
  }
};

module.exports = { getAll, getById, getByUser, getByTable, create };
