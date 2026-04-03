const {
  getAllCommunications,
  getCommunicationById,
  createCommunication,
  updateCommunication,
  sendCommunication,
  deleteCommunication,
  getRecipientUserIds,
  createReadConfirmationsForRecipients
} = require('../models/communicationsModel');
const {
  uploadToStorage,
  deleteFromStorage,
  getFromStorage,
  generateUniqueFilename,
  useWasabi
} = require('../middleware/upload');

/**
 * Generar key para archivos de comunicaciones
 * @param {string} filename - Nombre del archivo
 * @returns {string} Key para S3
 */
const generateCommunicationKey = (filename) => {
  return `communications/attachments/${filename}`;
};

const getAll = async (req, res) => {
  try {
    const filters = { type: req.query.type, status: req.query.status, priority: req.query.priority };
    const communications = await getAllCommunications(filters);
    res.json({ success: true, data: communications, total: communications.length });
  } catch (error) {
    console.error('Error al obtener comunicaciones:', error);
    res.status(500).json({ success: false, error: 'Error al obtener comunicaciones' });
  }
};

const getById = async (req, res) => {
  try {
    const communication = await getCommunicationById(req.params.id);
    if (!communication) return res.status(404).json({ success: false, error: 'Comunicación no encontrada' });
    res.json({ success: true, data: communication });
  } catch (error) {
    console.error('Error al obtener comunicación:', error);
    res.status(500).json({ success: false, error: 'Error al obtener comunicación' });
  }
};

const create = async (req, res) => {
  try {
    const { title, content, type, recipients } = req.body;
    if (!title || !content || !type || !recipients) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos (title, content, type, recipients)' });
    }

    // Procesar archivos adjuntos si existen
    let attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        let fileKey;

        if (useWasabi) {
          // PRODUCCIÓN: Subir a Wasabi S3
          const uniqueFilename = generateUniqueFilename('comm_attach', file.originalname);
          fileKey = generateCommunicationKey(uniqueFilename);
          await uploadToStorage(file.buffer, fileKey, file.mimetype);
        } else {
          // DESARROLLO: El archivo ya fue guardado por multer en uploads/communications/
          fileKey = `uploads/communications/${file.filename}`;
          console.log(`📎 [COMMUNICATIONS] Archivo guardado localmente: ${fileKey}`);
        }

        attachments.push({
          key: fileKey,
          name: file.originalname,
          type: file.mimetype,
          size: file.size
        });
      }
    }

    // Determinar el estado correcto
    // Si hay scheduled_date y no se especifica status, usar 'scheduled'
    // Si no hay scheduled_date, usar el status proporcionado o 'sent' por defecto
    let finalStatus = req.body.status || 'sent';
    const hasScheduledDate = req.body.scheduled_date && req.body.scheduled_date.trim() !== '';

    if (hasScheduledDate) {
      // Si hay fecha programada, el estado debe ser 'scheduled'
      finalStatus = 'scheduled';
    }

    // Para comunicados programados, NO establecer send_date inmediatamente
    // send_date se establecerá cuando el scheduler procese el comunicado
    const commData = {
      ...req.body,
      attachments: attachments.length > 0 ? attachments : null,
      status: finalStatus,
      // Si es programado, NO establecer send_date (se establecerá cuando se envíe)
      send_date: finalStatus === 'scheduled' ? null : new Date()
    };

    console.log(`📝 [COMMUNICATIONS] Creando comunicado - Status: ${finalStatus}, Scheduled: ${hasScheduledDate ? req.body.scheduled_date : 'N/A'}`);

    const newCommunication = await createCommunication(commData, req.user?.id);

    // Si el comunicado se envió inmediatamente (status='sent'), crear registros de confirmación
    if (finalStatus === 'sent' && newCommunication) {
      try {
        const recipientUserIds = await getRecipientUserIds(recipients);
        if (recipientUserIds.length > 0) {
          await createReadConfirmationsForRecipients(newCommunication.id, recipientUserIds, req.user?.id);
          console.log(`📬 [COMMUNICATIONS] Comunicado ${newCommunication.id} enviado a ${recipientUserIds.length} destinatarios`);
        }
      } catch (confError) {
        console.error('Error creando confirmaciones:', confError);
        // No fallar la creación del comunicado por error en confirmaciones
      }
    }

    res.status(201).json({ success: true, message: 'Comunicación creada exitosamente', data: newCommunication });
  } catch (error) {
    console.error('Error al crear comunicación:', error);
    res.status(500).json({ success: false, error: 'Error al crear comunicación' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getCommunicationById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Comunicación no encontrada' });

    // Parsear adjuntos existentes que el usuario quiere mantener
    let keptAttachments = [];
    if (req.body.existingAttachments) {
      try {
        keptAttachments = JSON.parse(req.body.existingAttachments);
      } catch (e) {
        keptAttachments = [];
      }
    }

    // Detectar adjuntos eliminados y borrarlos de Wasabi
    const existingAttachments = existing.attachments || [];
    const keptKeys = keptAttachments.map(att => att.key).filter(Boolean);

    // Encontrar adjuntos que fueron eliminados (están en existing pero no en kept)
    const removedAttachments = existingAttachments.filter(
      att => att.key && !keptKeys.includes(att.key)
    );

    // Eliminar archivos removidos de Wasabi
    for (const attachment of removedAttachments) {
      try {
        await deleteFromStorage(attachment.key);
      } catch (err) {
        console.warn('No se pudo eliminar archivo de Wasabi:', err.message);
      }
    }

    // Procesar nuevos archivos subidos
    let newUploadedAttachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        let fileKey;

        if (useWasabi) {
          // PRODUCCIÓN: Subir a Wasabi S3
          const uniqueFilename = generateUniqueFilename('comm_attach', file.originalname);
          fileKey = generateCommunicationKey(uniqueFilename);
          await uploadToStorage(file.buffer, fileKey, file.mimetype);
        } else {
          // DESARROLLO: El archivo ya fue guardado por multer en uploads/communications/
          fileKey = `uploads/communications/${file.filename}`;
          console.log(`📎 [COMMUNICATIONS] Archivo actualizado localmente: ${fileKey}`);
        }

        newUploadedAttachments.push({
          key: fileKey,
          name: file.originalname,
          type: file.mimetype,
          size: file.size
        });
      }
    }

    // Combinar adjuntos: existentes que se mantienen + nuevos subidos
    const finalAttachments = [...keptAttachments, ...newUploadedAttachments];

    // Preparar datos para actualizar
    const updateData = {
      ...req.body,
      attachments: finalAttachments.length > 0 ? finalAttachments : null
    };
    delete updateData.existingAttachments; // Limpiar campo temporal

    const updated = await updateCommunication(req.params.id, updateData, req.user?.id);

    res.json({ success: true, message: 'Comunicación actualizada exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar comunicación:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar comunicación' });
  }
};

const send = async (req, res) => {
  try {
    const existing = await getCommunicationById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Comunicación no encontrada' });
    const sent = await sendCommunication(req.params.id, req.user?.id);

    // Crear registros de confirmación para todos los destinatarios
    if (sent) {
      try {
        const recipientUserIds = await getRecipientUserIds(existing.recipients);
        if (recipientUserIds.length > 0) {
          await createReadConfirmationsForRecipients(sent.id, recipientUserIds, req.user?.id);
          console.log(`📬 [COMMUNICATIONS] Comunicado ${sent.id} enviado a ${recipientUserIds.length} destinatarios`);
        }
      } catch (confError) {
        console.error('Error creando confirmaciones:', confError);
      }
    }

    res.json({ success: true, message: 'Comunicación enviada exitosamente', data: sent });
  } catch (error) {
    console.error('Error al enviar comunicación:', error);
    res.status(500).json({ success: false, error: 'Error al enviar comunicación' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getCommunicationById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Comunicación no encontrada' });

    // Eliminar archivos adjuntos del storage si existen
    if (existing.attachments && Array.isArray(existing.attachments)) {
      for (const attachment of existing.attachments) {
        try {
          await deleteFromStorage(attachment.key);
        } catch (err) {
          console.warn('No se pudo eliminar archivo:', err.message);
        }
      }
    }

    await deleteCommunication(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Comunicación eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar comunicación:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar comunicación' });
  }
};

/**
 * Servir archivo de comunicación (PROXY HÍBRIDO)
 * Producción: Descarga de Wasabi S3 y hace streaming
 * Desarrollo: Sirve archivo local
 */
const serveCommunicationFile = async (req, res) => {
  try {
    let keyOrPath = req.params.key;
    keyOrPath = decodeURIComponent(keyOrPath);

    try {
      const { stream, contentType, contentLength } = await getFromStorage(keyOrPath);

      res.set({
        'Content-Type': contentType || 'application/octet-stream',
        'Content-Length': contentLength,
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*'
      });

      stream.pipe(res);
    } catch (error) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
  } catch (error) {
    console.error('Error sirviendo archivo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { getAll, getById, create, update, send, remove, serveCommunicationFile };
