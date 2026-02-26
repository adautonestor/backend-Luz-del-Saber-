const { getAllDocuments, getDocumentById, createDocument, updateDocument, deleteDocument } = require('../models/documentsModel');
const {
  uploadToStorage,
  deleteFromStorage,
  getFromStorage,
  getFileUrl,
  generateUniqueFilename,
  useWasabi
} = require('../middleware/upload');

/**
 * Generar key para documentos
 * @param {string} filename - Nombre del archivo
 * @returns {string} Key para S3
 */
const generateDocumentKey = (filename) => {
  return `documents/${filename}`;
};

const getAll = async (req, res) => {
  try {
    const filters = {
      type: req.query.type,
      categoria: req.query.categoria,
      visible_para: req.query.visible_para,
      student_id: req.query.student_id,
      activo: req.query.activo === 'true' ? true : req.query.activo === 'false' ? false : undefined,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };

    // Obtener el rol del usuario autenticado
    const userRole = req.user?.rol;

    // Pasar el rol al modelo para filtrar documentos
    const documents = await getAllDocuments(filters, userRole);
    res.json({ success: true, data: documents, total: documents.length });
  } catch (error) {
    console.error('Error al obtener documentos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener documentos' });
  }
};

const getById = async (req, res) => {
  try {
    const document = await getDocumentById(req.params.id);
    if (!document) return res.status(404).json({ success: false, error: 'Documento no encontrado' });
    res.json({ success: true, data: document });
  } catch (error) {
    console.error('Error al obtener documento:', error);
    res.status(500).json({ success: false, error: 'Error al obtener documento' });
  }
};

const create = async (req, res) => {
  try {
    const { title, description, type, category, visible_to } = req.body;

    if (!title || !type) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos: title, type' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No se ha subido ningún archivo' });
    }

    // Mapear valores del frontend a valores estandarizados
    const visibleToMapping = {
      'padres': 'parents',
      'docentes': 'teachers',
      'ambos': 'all',
      'parents': 'parents',
      'teachers': 'teachers',
      'all': 'all'
    };

    const standardizedVisibleTo = visibleToMapping[visible_to] || 'all';

    // Subir archivo usando almacenamiento híbrido (Wasabi en producción, local en desarrollo)
    let storedPath = null;
    const uniqueFilename = generateUniqueFilename('doc', req.file.originalname);
    const key = generateDocumentKey(uniqueFilename);

    if (useWasabi) {
      // PRODUCCIÓN: Subir a Wasabi S3
      console.log(`📤 [DOCUMENTS] Subiendo a Wasabi: ${key}`);
      storedPath = await uploadToStorage(req.file.buffer, key, req.file.mimetype);
    } else {
      // DESARROLLO: Ya está guardado en disco por multer
      storedPath = `uploads/documents/${req.file.filename}`;
      console.log(`📤 [DOCUMENTS] Guardado localmente: ${storedPath}`);
    }

    // Construir datos del documento con información del archivo
    const documentData = {
      title,
      description: description || '',
      type,
      category: category || null,
      file_url: storedPath,
      file_name: req.file.originalname,
      file_type: req.file.mimetype,
      file_size: req.file.size,
      visible_to: standardizedVisibleTo,
      active: true
    };

    const newDocument = await createDocument(documentData, req.user?.id);

    // Agregar URL pública del archivo a la respuesta
    if (newDocument.file_url) {
      newDocument.file_public_url = getFileUrl(newDocument.file_url, '/api/documents/file');
    }

    console.log(`✅ [DOCUMENTS] Documento creado exitosamente (${useWasabi ? 'Wasabi' : 'Local'})`);

    res.status(201).json({ success: true, message: 'Documento creado exitosamente', data: newDocument });
  } catch (error) {
    console.error('Error al crear documento:', error);
    res.status(500).json({ success: false, error: 'Error al crear documento' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getDocumentById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Documento no encontrado' });
    const updated = await updateDocument(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Documento actualizado exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar documento:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar documento' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getDocumentById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Documento no encontrado' });

    // Eliminar archivo del storage si existe
    if (existing.file_url) {
      try {
        await deleteFromStorage(existing.file_url);
        console.log(`🗑️ [DOCUMENTS] Archivo eliminado: ${existing.file_url}`);
      } catch (err) {
        console.warn(`⚠️ [DOCUMENTS] No se pudo eliminar archivo:`, err.message);
      }
    }

    await deleteDocument(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Documento eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar documento' });
  }
};

/**
 * Servir documento (PROXY HÍBRIDO)
 * Producción: Descarga de Wasabi S3 y hace streaming
 * Desarrollo: Sirve archivo local
 */
const serveDocument = async (req, res) => {
  try {
    let keyOrPath = req.params.key;
    keyOrPath = decodeURIComponent(keyOrPath);

    console.log(`🔍 [DOCUMENTS] Sirviendo documento: ${keyOrPath}`);

    try {
      const { stream, contentType, contentLength } = await getFromStorage(keyOrPath);

      res.set({
        'Content-Type': contentType || 'application/octet-stream',
        'Content-Length': contentLength,
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*'
      });

      console.log(`✅ [DOCUMENTS] Documento servido exitosamente: ${keyOrPath}`);

      stream.pipe(res);
    } catch (error) {
      console.error(`❌ [DOCUMENTS] Archivo no encontrado: ${keyOrPath}`, error.message);
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
  } catch (error) {
    console.error('❌ [DOCUMENTS] Error sirviendo documento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { getAll, getById, create, update, remove, serveDocument };
