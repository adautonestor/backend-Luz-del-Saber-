const { getAllVisibilityConfigs, getVisibilityConfigById, getVisibilityByParams, findExistingConfig, createVisibilityConfig, updateVisibilityConfig, deleteVisibilityConfig } = require('../models/reportCardVisibilityModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      grade_id: req.query.grade_id,
      level_id: req.query.level_id,
      academic_year_id: req.query.academic_year_id,
      quarter: req.query.quarter,
      visible: req.query.visible !== undefined ? req.query.visible === 'true' : undefined
    };
    const configs = await getAllVisibilityConfigs(filters);
    res.json({ success: true, data: configs, total: configs.length });
  } catch (error) {
    console.error('Error al obtener configuraciones de visibilidad:', error);
    res.status(500).json({ success: false, error: 'Error al obtener configuraciones de visibilidad' });
  }
};

const getById = async (req, res) => {
  try {
    const config = await getVisibilityConfigById(req.params.id);
    if (!config) return res.status(404).json({ success: false, error: 'Configuración no encontrada' });
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ success: false, error: 'Error al obtener configuración' });
  }
};

const getByParams = async (req, res) => {
  try {
    const { gradoId, nivelId, yearId, quarter } = req.params;
    const config = await getVisibilityByParams(gradoId, nivelId, yearId, quarter);
    if (!config) return res.status(404).json({ success: false, error: 'Configuración no encontrada' });
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ success: false, error: 'Error al obtener configuración' });
  }
};

const create = async (req, res) => {
  try {
    // Aceptar ambos nombres de campos (grado_id/grade_id, nivel_id/level_id)
    const grade_id = req.body.grado_id || req.body.grade_id || null;
    const level_id = req.body.nivel_id || req.body.level_id || null;
    const { academic_year_id, quarter } = req.body;

    // Solo academic_year_id y quarter son obligatorios
    if (!academic_year_id || !quarter) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos (academic_year_id, quarter)' });
    }

    // Verificar si ya existe config (maneja NULLs correctamente con IS NULL)
    const existing = await findExistingConfig(academic_year_id, quarter, level_id, grade_id);
    if (existing) {
      // UPSERT: actualizar la existente en vez de crear duplicado
      const updatedData = {
        visible: req.body.visible !== false,
        authorization_date: req.body.authorization_date,
        observations: req.body.observations
      };
      const updated = await updateVisibilityConfig(existing.id, updatedData, req.user?.id);
      return res.json({ success: true, message: 'Configuracion actualizada exitosamente', data: updated });
    }

    // Preparar datos para crear
    const configData = {
      grade_id,
      level_id,
      academic_year_id,
      quarter,
      visible: req.body.visible !== false,
      authorization_date: req.body.authorization_date,
      observations: req.body.observations
    };

    const newConfig = await createVisibilityConfig(configData, req.user?.id);
    res.status(201).json({ success: true, message: 'Configuracion creada exitosamente', data: newConfig });
  } catch (error) {
    console.error('Error al crear configuracion:', error);
    res.status(500).json({ success: false, error: 'Error al crear configuracion' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getVisibilityConfigById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Configuración no encontrada' });
    const updated = await updateVisibilityConfig(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Configuración actualizada exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar configuración' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getVisibilityConfigById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Configuración no encontrada' });
    await deleteVisibilityConfig(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Configuración eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar configuración:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar configuración' });
  }
};

module.exports = { getAll, getById, getByParams, create, update, remove };
