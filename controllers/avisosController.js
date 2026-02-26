const { getAllAvisos, getAvisoById, createAviso, updateAviso, deleteAviso } = require('../models/avisosModel');
const {
  uploadToStorage,
  deleteFromStorage,
  getFromStorage,
  getFileUrl,
  generateUniqueFilename,
  useWasabi
} = require('../middleware/upload');

/**
 * Generar key para archivos de avisos
 * @param {string} type - Tipo de archivo ('image' o 'file')
 * @param {string} filename - Nombre del archivo
 * @returns {string} Key para S3
 */
const generateAvisoKey = (type, filename) => {
  return `avisos/${type}s/${filename}`;
};

const getAll = async (req, res) => {
  try {
    const filters = {
      activo: req.query.activo === 'true' ? true : req.query.activo === 'false' ? false : undefined,
      activosPorFecha: req.query.activos === 'true', // Filtrar por fecha (avisos vigentes)
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };
    const avisos = await getAllAvisos(filters);
    res.json({ success: true, data: avisos, total: avisos.length });
  } catch (error) {
    console.error('Error al obtener avisos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener avisos' });
  }
};

const getById = async (req, res) => {
  try {
    const aviso = await getAvisoById(req.params.id);
    if (!aviso) return res.status(404).json({ success: false, error: 'Aviso no encontrado' });
    res.json({ success: true, data: aviso });
  } catch (error) {
    console.error('Error al obtener aviso:', error);
    res.status(500).json({ success: false, error: 'Error al obtener aviso' });
  }
};

const create = async (req, res) => {
  try {
    const { title, content, link } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos (title, content)' });
    }

    let imageUrl = null;
    let fileUrl = null;
    let fileName = null;
    let fileType = null;
    let fileSize = null;

    // Procesar imagen si existe
    if (req.files && req.files.image && req.files.image[0]) {
      const imageFile = req.files.image[0];
      const uniqueFilename = generateUniqueFilename('aviso_img', imageFile.originalname);
      const key = generateAvisoKey('image', uniqueFilename);

      if (useWasabi) {
        console.log(`📤 [AVISOS] Subiendo imagen a Wasabi: ${key}`);
        imageUrl = await uploadToStorage(imageFile.buffer, key, imageFile.mimetype);
      } else {
        // En desarrollo, el archivo ya fue guardado por multer diskStorage
        imageUrl = `uploads/announcements/${imageFile.filename}`;
        console.log(`📤 [AVISOS] Imagen guardada localmente: ${imageUrl}`);
      }
    }

    // Procesar archivo adjunto si existe
    if (req.files && req.files.file && req.files.file[0]) {
      const file = req.files.file[0];
      const uniqueFilename = generateUniqueFilename('aviso_file', file.originalname);
      const key = generateAvisoKey('file', uniqueFilename);

      if (useWasabi) {
        console.log(`📤 [AVISOS] Subiendo archivo a Wasabi: ${key}`);
        fileUrl = await uploadToStorage(file.buffer, key, file.mimetype);
      } else {
        // En desarrollo, el archivo ya fue guardado por multer diskStorage
        fileUrl = `uploads/announcements/${file.filename}`;
        console.log(`📤 [AVISOS] Archivo guardado localmente: ${fileUrl}`);
      }

      fileName = file.originalname;
      fileType = file.mimetype;
      fileSize = file.size;
    }

    const avisoData = {
      title,
      content,
      link: link || null,
      image: imageUrl,
      file: fileUrl,
      file_name: fileName,
      file_type: fileType,
      file_size: fileSize,
      publication_date: new Date()
    };

    const newAviso = await createAviso(avisoData, req.user?.id);

    console.log(`✅ [AVISOS] Aviso creado exitosamente (${useWasabi ? 'Wasabi' : 'Local'})`);

    res.status(201).json({ success: true, message: 'Aviso creado exitosamente', data: newAviso });
  } catch (error) {
    console.error('Error al crear aviso:', error);
    res.status(500).json({ success: false, error: 'Error al crear aviso' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getAvisoById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Aviso no encontrado' });
    const updated = await updateAviso(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Aviso actualizado exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar aviso:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar aviso' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getAvisoById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Aviso no encontrado' });

    // Eliminar imagen del storage si existe
    if (existing.image) {
      try {
        await deleteFromStorage(existing.image);
        console.log(`🗑️ [AVISOS] Imagen eliminada: ${existing.image}`);
      } catch (err) {
        console.warn(`⚠️ [AVISOS] No se pudo eliminar imagen:`, err.message);
      }
    }

    // Eliminar archivo del storage si existe
    if (existing.file) {
      try {
        await deleteFromStorage(existing.file);
        console.log(`🗑️ [AVISOS] Archivo eliminado: ${existing.file}`);
      } catch (err) {
        console.warn(`⚠️ [AVISOS] No se pudo eliminar archivo:`, err.message);
      }
    }

    await deleteAviso(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Aviso eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar aviso:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar aviso' });
  }
};

/**
 * Servir archivo de aviso (PROXY HÍBRIDO)
 * Producción: Descarga de Wasabi S3 y hace streaming
 * Desarrollo: Sirve archivo local
 */
const serveAvisoFile = async (req, res) => {
  try {
    let keyOrPath = req.params.key;
    keyOrPath = decodeURIComponent(keyOrPath);

    console.log(`🔍 [AVISOS] Sirviendo archivo: ${keyOrPath}`);

    try {
      const { stream, contentType, contentLength } = await getFromStorage(keyOrPath);

      res.set({
        'Content-Type': contentType || 'application/octet-stream',
        'Content-Length': contentLength,
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*'
      });

      console.log(`✅ [AVISOS] Archivo servido exitosamente: ${keyOrPath}`);

      stream.pipe(res);
    } catch (error) {
      console.error(`❌ [AVISOS] Archivo no encontrado: ${keyOrPath}`, error.message);
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
  } catch (error) {
    console.error('❌ [AVISOS] Error sirviendo archivo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { getAll, getById, create, update, remove, serveAvisoFile };
