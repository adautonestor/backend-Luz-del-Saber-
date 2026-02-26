const { getAllDiscountConfigs, getDiscountConfigById, getActiveDiscounts, createDiscountConfig, updateDiscountConfig, deleteDiscountConfig } = require('../models/discountConfigsModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      concept_id: req.query.concept_id,
      type: req.query.type,
      activo: req.query.activo !== undefined ? req.query.activo === 'true' : undefined
    };
    const configs = await getAllDiscountConfigs(filters);
    res.json({ success: true, data: configs, total: configs.length });
  } catch (error) {
    console.error('Error al obtener configuraciones de descuentos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener configuraciones de descuentos' });
  }
};

const getById = async (req, res) => {
  try {
    const config = await getDiscountConfigById(req.params.id);
    if (!config) return res.status(404).json({ success: false, error: 'Configuración no encontrada' });
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ success: false, error: 'Error al obtener configuración' });
  }
};

const getActive = async (req, res) => {
  try {
    const conceptoId = req.query.concept_id || null;
    const discounts = await getActiveDiscounts(conceptoId);
    res.json({ success: true, data: discounts, total: discounts.length });
  } catch (error) {
    console.error('Error al obtener descuentos activos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener descuentos activos' });
  }
};

const create = async (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name || !type) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }
    const newConfig = await createDiscountConfig(req.body, req.user?.id);
    res.status(201).json({ success: true, message: 'Configuración creada exitosamente', data: newConfig });
  } catch (error) {
    console.error('Error al crear configuración:', error);
    res.status(500).json({ success: false, error: 'Error al crear configuración' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getDiscountConfigById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Configuración no encontrada' });
    const updated = await updateDiscountConfig(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Configuración actualizada exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar configuración' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getDiscountConfigById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Configuración no encontrada' });
    await deleteDiscountConfig(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Configuración eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar configuración:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar configuración' });
  }
};

module.exports = { getAll, getById, getActive, create, update, remove };
