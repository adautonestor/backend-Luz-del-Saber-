const { getAllPaymentRecords, getPaymentRecordById, getRecordsByStudent, createPaymentRecord, updatePaymentRecord, annulPaymentRecord, deletePaymentRecord } = require('../models/paymentRecordsModel');
const path = require('path');
const fs = require('fs');
const { uploadToStorage, generateUniqueFilename, getFileUrl, useWasabi } = require('../middleware/upload');

const getAll = async (req, res) => {
  try {
    const filters = {
      student_id: req.query.student_id,
      concept_id: req.query.concept_id,
      status: req.query.status,
      mes: req.query.mes
    };
    const records = await getAllPaymentRecords(filters);
    res.json({ success: true, data: records, total: records.length });
  } catch (error) {
    console.error('Error al obtener registros de pagos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener registros de pagos' });
  }
};

const getById = async (req, res) => {
  try {
    const record = await getPaymentRecordById(req.params.id);
    if (!record) return res.status(404).json({ success: false, error: 'Registro de pago no encontrado' });
    res.json({ success: true, data: record });
  } catch (error) {
    console.error('Error al obtener registro de pago:', error);
    res.status(500).json({ success: false, error: 'Error al obtener registro de pago' });
  }
};

const getByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const estado = req.query.status || null;
    const records = await getRecordsByStudent(studentId, estado);
    res.json({ success: true, data: records, total: records.length });
  } catch (error) {
    console.error('Error al obtener registros del estudiante:', error);
    res.status(500).json({ success: false, error: 'Error al obtener registros del estudiante' });
  }
};

const create = async (req, res) => {
  try {
    // Parsear el body si viene como string (cuando se usa multipart/form-data)
    let bodyData = req.body;
    if (typeof req.body.data === 'string') {
      bodyData = JSON.parse(req.body.data);
    }

    const { student_id, concept_id, total_amount, paid_amount } = bodyData;

    if (!student_id || !concept_id || !total_amount) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }

    // Si hay archivo adjunto, subirlo a Wasabi/Storage
    if (req.file) {
      console.log('📤 [PAYMENT-RECORD] Subiendo voucher de pago manual...');

      const folder = 'payment-vouchers';
      const filename = generateUniqueFilename('manual-payment', req.file.originalname);
      const key = `${folder}/${filename}`;

      // Subir a Wasabi o almacenamiento local
      const storedPath = await uploadToStorage(
        useWasabi ? req.file.buffer : req.file.path,
        key,
        req.file.mimetype,
        req.file
      );

      const fileUrl = getFileUrl(storedPath, '/api/files');

      console.log('✅ [PAYMENT-RECORD] Voucher subido exitosamente:', storedPath);

      const voucherInfo = {
        filename: filename,
        originalname: req.file.originalname,
        path: storedPath,
        url: fileUrl,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadDate: new Date().toISOString()
      };

      // Agregar info del voucher al array de payments
      if (bodyData.payments && Array.isArray(bodyData.payments)) {
        bodyData.payments = bodyData.payments.map(payment => ({
          ...payment,
          voucher: voucherInfo
        }));
      }

      // También guardar el path del voucher en el registro principal
      bodyData.voucher_path = storedPath;
    }

    const newRecord = await createPaymentRecord(bodyData, req.user?.id);
    res.status(201).json({ success: true, message: 'Registro de pago creado exitosamente', data: newRecord });
  } catch (error) {
    console.error('Error al crear registro de pago:', error);
    res.status(500).json({ success: false, error: 'Error al crear registro de pago: ' + error.message });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getPaymentRecordById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Registro de pago no encontrado' });
    if (existing.estado === 'anulado') {
      return res.status(400).json({ success: false, error: 'No se puede modificar un pago anulado' });
    }
    const updated = await updatePaymentRecord(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Registro de pago actualizado exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar registro de pago:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar registro de pago' });
  }
};

const annul = async (req, res) => {
  try {
    const existing = await getPaymentRecordById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Registro de pago no encontrado' });
    if (existing.estado === 'anulado') {
      return res.status(400).json({ success: false, error: 'El pago ya está anulado' });
    }
    const { motivo } = req.body;
    if (!motivo) {
      return res.status(400).json({ success: false, error: 'Debe proporcionar un motivo de anulación' });
    }
    const annulled = await annulPaymentRecord(req.params.id, motivo, req.user?.id);
    res.json({ success: true, message: 'Pago anulado exitosamente', data: annulled });
  } catch (error) {
    console.error('Error al anular pago:', error);
    res.status(500).json({ success: false, error: 'Error al anular pago' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getPaymentRecordById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Registro de pago no encontrado' });
    await deletePaymentRecord(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Registro de pago eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar registro de pago:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar registro de pago' });
  }
};

const uploadVoucher = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No se proporcionó ningún archivo' });
    }

    console.log('📤 [VOUCHER-UPLOAD] Subiendo voucher...');

    const folder = 'payment-vouchers';
    const filename = generateUniqueFilename('voucher', req.file.originalname);
    const key = `${folder}/${filename}`;

    // Subir a Wasabi o almacenamiento local
    const storedPath = await uploadToStorage(
      useWasabi ? req.file.buffer : req.file.path,
      key,
      req.file.mimetype,
      req.file
    );

    const fileUrl = getFileUrl(storedPath, '/api/files');

    console.log('✅ [VOUCHER-UPLOAD] Voucher subido exitosamente:', storedPath);

    // Información del archivo subido
    const fileInfo = {
      filename: filename,
      originalname: req.file.originalname,
      path: storedPath,
      url: fileUrl,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadDate: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      message: 'Voucher subido exitosamente',
      data: fileInfo
    });

  } catch (error) {
    console.error('Error al subir voucher:', error);
    res.status(500).json({ success: false, error: 'Error al subir el voucher: ' + error.message });
  }
};

module.exports = { getAll, getById, getByStudent, create, update, annul, remove, uploadVoucher };
