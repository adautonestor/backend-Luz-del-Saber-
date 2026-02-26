const { getAllPaymentIntentions, getPaymentIntentionById, createPaymentIntention, updatePaymentIntention, approvePaymentIntention, rejectPaymentIntention } = require('../models/paymentIntentionsModel');
const { uploadToStorage, generateUniqueFilename, getFileUrl, useWasabi } = require('../middleware/upload');

const getAll = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      student_id: req.query.student_id,
      parent_id: req.query.parent_id
    };
    const intentions = await getAllPaymentIntentions(filters);
    res.json({ success: true, data: intentions, total: intentions.length });
  } catch (error) {
    console.error('Error al obtener intenciones de pago:', error);
    res.status(500).json({ success: false, error: 'Error al obtener intenciones de pago' });
  }
};

const getById = async (req, res) => {
  try {
    const intention = await getPaymentIntentionById(req.params.id);
    if (!intention) return res.status(404).json({ success: false, error: 'Intención de pago no encontrada' });
    res.json({ success: true, data: intention });
  } catch (error) {
    console.error('Error al obtener intención de pago:', error);
    res.status(500).json({ success: false, error: 'Error al obtener intención de pago' });
  }
};

const create = async (req, res) => {
  try {
    // Aceptar ambos formatos de nombres (frontend y legacy)
    const obligation_id = req.body.obligation_id || req.body.obligacion_id;
    const student_id = req.body.student_id;
    const user_id = req.body.user_id || req.body.parent_id;
    const amount = req.body.amount;
    const payment_method = req.body.payment_method || req.body.medio_pago;
    const operation_number = req.body.operation_number || req.body.numero_operacion;

    if (!obligation_id || !student_id || !user_id || !amount || !payment_method) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos (obligation_id, student_id, user_id, amount, payment_method)'
      });
    }

    // Normalizar datos para el modelo
    const intentionData = {
      obligation_id,
      student_id,
      user_id,
      amount,
      payment_method,
      operation_number: operation_number || null,
      observations: req.body.observations || null,
      voucher: req.body.voucher || null,
      payment_date: req.body.payment_date || new Date(),
      registration_date: req.body.registration_date || new Date()
    };

    const newIntention = await createPaymentIntention(intentionData, req.user?.id);
    res.status(201).json({ success: true, message: 'Intención de pago creada exitosamente', data: newIntention });
  } catch (error) {
    console.error('Error al crear intención de pago:', error);
    res.status(500).json({ success: false, error: 'Error al crear intención de pago' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getPaymentIntentionById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Intención de pago no encontrada' });
    const updated = await updatePaymentIntention(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Intención de pago actualizada exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar intención de pago:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar intención de pago' });
  }
};

const approve = async (req, res) => {
  try {
    const existing = await getPaymentIntentionById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Intención de pago no encontrada' });
    const approved = await approvePaymentIntention(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Intención de pago aprobada exitosamente', data: approved });
  } catch (error) {
    console.error('Error al aprobar intención de pago:', error);
    res.status(500).json({ success: false, error: 'Error al aprobar intención de pago' });
  }
};

const reject = async (req, res) => {
  try {
    // Aceptar ambos nombres de campo
    const motivo_rechazo = req.body.motivo_rechazo || req.body.rejection_reason;
    if (!motivo_rechazo) {
      return res.status(400).json({ success: false, error: 'El motivo de rechazo es requerido' });
    }
    const existing = await getPaymentIntentionById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Intención de pago no encontrada' });
    const rejected = await rejectPaymentIntention(req.params.id, motivo_rechazo, req.user?.id);
    res.json({ success: true, message: 'Intención de pago rechazada', data: rejected });
  } catch (error) {
    console.error('Error al rechazar intención de pago:', error);
    res.status(500).json({ success: false, error: 'Error al rechazar intención de pago' });
  }
};

/**
 * Subir voucher/comprobante de pago
 * POST /api/payment-intentions/upload-voucher
 * Permite rol padre (5) para subir comprobantes
 */
const uploadVoucher = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No se envió ningún archivo' });
    }

    console.log('📤 [VOUCHER] Subiendo comprobante de pago...');

    const folder = req.body.folder || 'payment-vouchers';
    const filename = generateUniqueFilename('voucher', req.file.originalname);
    const key = `${folder}/${filename}`;

    const storedPath = await uploadToStorage(
      useWasabi ? req.file.buffer : req.file.path,
      key,
      req.file.mimetype,
      req.file
    );

    const fileUrl = getFileUrl(storedPath, '/api/files');

    console.log('✅ [VOUCHER] Comprobante subido exitosamente:', storedPath);

    res.json({
      success: true,
      message: 'Comprobante subido exitosamente',
      data: {
        path: storedPath,
        url: fileUrl
      }
    });

  } catch (error) {
    console.error('❌ [VOUCHER] Error al subir comprobante:', error);
    res.status(500).json({ success: false, error: 'Error al subir comprobante: ' + error.message });
  }
};

module.exports = { getAll, getById, create, update, approve, reject, uploadVoucher };
