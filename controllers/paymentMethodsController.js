const { getAllPaymentMethods, getPaymentMethodById, createPaymentMethod, updatePaymentMethod, deletePaymentMethod } = require('../models/paymentMethodsModel');
const { getFileUrl, deleteFromStorage } = require('../middleware/upload');

// Funcion para agregar URL completa a qr_code
const addImageUrl = (method) => {
  if (method && method.qr_code) {
    // Si ya es una URL completa, no modificar
    if (method.qr_code.startsWith('http')) {
      return method;
    }
    // Convertir key a URL del proxy
    method.qr_code = getFileUrl(method.qr_code, '/api/files');
  }
  return method;
};

const getAll = async (req, res) => {
  try {
    const filters = { type: req.query.type, status: req.query.status };
    const methods = await getAllPaymentMethods(filters);
    // Agregar URLs a las imagenes
    const methodsWithUrls = methods.map(addImageUrl);
    res.json({ success: true, data: methodsWithUrls, total: methodsWithUrls.length });
  } catch (error) {
    console.error('Error al obtener métodos de pago:', error);
    res.status(500).json({ success: false, error: 'Error al obtener métodos de pago' });
  }
};

const getById = async (req, res) => {
  try {
    const method = await getPaymentMethodById(req.params.id);
    if (!method) return res.status(404).json({ success: false, error: 'Método de pago no encontrado' });
    res.json({ success: true, data: addImageUrl(method) });
  } catch (error) {
    console.error('Error al obtener método de pago:', error);
    res.status(500).json({ success: false, error: 'Error al obtener método de pago' });
  }
};

const create = async (req, res) => {
  try {
    const { type, name } = req.body;
    if (!type || !name) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos (type, name)' });
    }
    const newMethod = await createPaymentMethod(req.body, req.user?.id);
    res.status(201).json({ success: true, message: 'Método de pago creado exitosamente', data: addImageUrl(newMethod) });
  } catch (error) {
    console.error('Error al crear método de pago:', error);
    res.status(500).json({ success: false, error: 'Error al crear método de pago' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getPaymentMethodById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Método de pago no encontrado' });
    const updated = await updatePaymentMethod(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Método de pago actualizado exitosamente', data: addImageUrl(updated) });
  } catch (error) {
    console.error('Error al actualizar método de pago:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar método de pago' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getPaymentMethodById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Método de pago no encontrado' });

    // Si tiene imagen (qr_code), eliminarla de Wasabi/storage
    if (existing.qr_code && !existing.qr_code.startsWith('http')) {
      try {
        console.log(`🗑️ [PAYMENT] Eliminando imagen: ${existing.qr_code}`);
        await deleteFromStorage(existing.qr_code);
        console.log(`✅ [PAYMENT] Imagen eliminada exitosamente`);
      } catch (imgError) {
        console.warn(`⚠️ [PAYMENT] No se pudo eliminar imagen: ${imgError.message}`);
        // Continuar con la eliminación del método aunque falle la imagen
      }
    }

    // Eliminación física del método de pago
    await deletePaymentMethod(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Método de pago eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar método de pago:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar método de pago' });
  }
};

module.exports = { getAll, getById, create, update, remove };
