const path = require('path');
const { getAllScheduleImages, getScheduleImageById, getScheduleImageByGradeAndSection, createScheduleImage, updateScheduleImage, deleteScheduleImage } = require('../models/scheduleImagesModel');
const {
  uploadToStorage,
  deleteFromStorage,
  getFromStorage,
  getFileUrl,
  generateUniqueFilename,
  generateScheduleKey,
  useWasabi
} = require('../middleware/upload');

/**
 * Obtener todas las imágenes de horarios
 */
const getAll = async (req, res) => {
  try {
    const filters = {
      grade_id: req.query.grade_id,
      section_id: req.query.section_id,
      level_id: req.query.level_id,
      teacher_id: req.query.teacher_id,
      type: req.query.type
    };
    const images = await getAllScheduleImages(filters);

    // Agregar URL completa a cada imagen
    const imagesWithUrls = images.map(img => ({
      ...img,
      image_url: img.file_path ? getFileUrl(img.file_path, '/api/schedule-images/file') : null
    }));

    res.json({ success: true, data: imagesWithUrls, total: imagesWithUrls.length });
  } catch (error) {
    console.error('Error al obtener imágenes de horarios:', error);
    res.status(500).json({ success: false, error: 'Error al obtener imágenes de horarios' });
  }
};

/**
 * Obtener imagen por ID
 */
const getById = async (req, res) => {
  try {
    const image = await getScheduleImageById(req.params.id);
    if (!image) return res.status(404).json({ success: false, error: 'Imagen no encontrada' });

    // Agregar URL completa
    image.image_url = image.file_path ? getFileUrl(image.file_path, '/api/schedule-images/file') : null;

    res.json({ success: true, data: image });
  } catch (error) {
    console.error('Error al obtener imagen:', error);
    res.status(500).json({ success: false, error: 'Error al obtener imagen' });
  }
};

/**
 * Obtener imagen por grado y sección
 */
const getByGradeAndSection = async (req, res) => {
  try {
    const { gradeId, sectionId } = req.params;
    const image = await getScheduleImageByGradeAndSection(gradeId, sectionId);
    if (!image) return res.status(404).json({ success: false, error: 'Imagen no encontrada' });

    // Agregar URL completa
    image.image_url = image.file_path ? getFileUrl(image.file_path, '/api/schedule-images/file') : null;

    res.json({ success: true, data: image });
  } catch (error) {
    console.error('Error al obtener imagen:', error);
    res.status(500).json({ success: false, error: 'Error al obtener imagen' });
  }
};

/**
 * Crear nueva imagen de horario (HÍBRIDO)
 * Producción: Sube a Wasabi S3
 * Desarrollo: Guarda en disco local
 */
const create = async (req, res) => {
  try {
    const { titulo, description, type, level_id, grade_id, section_id, teacher_id } = req.body;

    // Validar que se haya subido una imagen
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Debe subir una imagen' });
    }

    // Validar campos según el tipo
    if (type === 'alumnos' && (!grade_id || !section_id)) {
      return res.status(400).json({ success: false, error: 'Para horarios de alumnos debe especificar grado y sección' });
    }

    if (type === 'docentes' && !level_id) {
      return res.status(400).json({ success: false, error: 'Para horarios de docentes debe especificar el nivel' });
    }

    // Generar nombre único para el archivo
    const uniqueFilename = generateUniqueFilename('horario', req.file.originalname);

    let storedPath;

    if (useWasabi) {
      // PRODUCCIÓN: Subir a Wasabi S3
      const s3Key = generateScheduleKey(type, level_id, grade_id, section_id, uniqueFilename);

      console.log(`📤 [SCHEDULES] Subiendo a Wasabi: ${s3Key}`);

      storedPath = await uploadToStorage(
        req.file.buffer,
        s3Key,
        req.file.mimetype
      );
    } else {
      // DESARROLLO: Ya está guardado en disco por multer
      storedPath = `uploads/schedules/${req.file.filename}`;
      console.log(`📤 [SCHEDULES] Guardado localmente: ${storedPath}`);
    }

    // Preparar datos para guardar en BD
    const imageData = {
      title: titulo,
      description: description || '',
      type: type,
      level_id: level_id ? parseInt(level_id) : null,
      grade_id: grade_id ? parseInt(grade_id) : null,
      section_id: section_id ? parseInt(section_id) : null,
      teacher_id: teacher_id ? parseInt(teacher_id) : null,
      file_name: req.file.originalname,
      file_path: storedPath,  // Key de S3 o path local
      file_size: req.file.size,
      file_type: req.file.mimetype
    };

    const newImage = await createScheduleImage(imageData, req.user?.id);

    // Agregar URL completa a la respuesta
    newImage.image_url = getFileUrl(storedPath, '/api/schedule-images/file');

    console.log(`✅ [SCHEDULES] Imagen creada exitosamente (${useWasabi ? 'Wasabi' : 'Local'})`);

    res.status(201).json({
      success: true,
      message: 'Imagen creada exitosamente',
      data: newImage,
      storage: useWasabi ? 'wasabi' : 'local'
    });

  } catch (error) {
    console.error('Error al crear imagen:', error);
    res.status(500).json({ success: false, error: 'Error al crear imagen: ' + error.message });
  }
};

/**
 * Actualizar imagen de horario
 */
const update = async (req, res) => {
  try {
    const existing = await getScheduleImageById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Imagen no encontrada' });

    let updateData = { ...req.body };

    // Si se sube una nueva imagen
    if (req.file) {
      // Eliminar archivo anterior si existe
      if (existing.file_path) {
        try {
          await deleteFromStorage(existing.file_path);
          console.log(`🗑️ [SCHEDULES] Archivo anterior eliminado: ${existing.file_path}`);
        } catch (err) {
          console.warn(`⚠️ [SCHEDULES] No se pudo eliminar archivo anterior:`, err.message);
        }
      }

      // Generar nuevo nombre y subir
      const uniqueFilename = generateUniqueFilename('horario', req.file.originalname);

      if (useWasabi) {
        const s3Key = generateScheduleKey(
          existing.type,
          existing.level_id,
          existing.grade_id,
          existing.section_id,
          uniqueFilename
        );
        updateData.file_path = await uploadToStorage(req.file.buffer, s3Key, req.file.mimetype);
      } else {
        updateData.file_path = `uploads/schedules/${req.file.filename}`;
      }

      updateData.file_name = req.file.originalname;
      updateData.file_size = req.file.size;
      updateData.file_type = req.file.mimetype;

      console.log(`📤 [SCHEDULES] Nueva imagen actualizada: ${updateData.file_path}`);
    }

    const updated = await updateScheduleImage(req.params.id, updateData, req.user?.id);

    // Agregar URL completa
    updated.image_url = updated.file_path ? getFileUrl(updated.file_path, '/api/schedule-images/file') : null;

    res.json({ success: true, message: 'Imagen actualizada exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar imagen:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar imagen' });
  }
};

/**
 * Eliminar imagen de horario
 */
const remove = async (req, res) => {
  try {
    const existing = await getScheduleImageById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Imagen no encontrada' });

    // Eliminar archivo del storage
    if (existing.file_path) {
      try {
        await deleteFromStorage(existing.file_path);
        console.log(`🗑️ [SCHEDULES] Archivo eliminado: ${existing.file_path}`);
      } catch (err) {
        console.warn(`⚠️ [SCHEDULES] No se pudo eliminar archivo:`, err.message);
      }
    }

    await deleteScheduleImage(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Imagen eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar imagen:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar imagen' });
  }
};

/**
 * Servir imagen (PROXY HÍBRIDO)
 * Producción: Descarga de Wasabi S3 y hace streaming
 * Desarrollo: Sirve archivo local
 */
const serveImage = async (req, res) => {
  try {
    // El parámetro viene como key URL encoded
    let keyOrPath = req.params.key || req.params.filename;

    // Decodificar si viene URL encoded
    keyOrPath = decodeURIComponent(keyOrPath);

    console.log(`🔍 [SCHEDULES] Sirviendo imagen: ${keyOrPath}`);

    try {
      const { stream, contentType, contentLength } = await getFromStorage(keyOrPath);

      // Configurar headers
      res.set({
        'Content-Type': contentType || 'application/octet-stream',
        'Content-Length': contentLength,
        'Cache-Control': 'public, max-age=31536000', // Cache 1 año
        'Access-Control-Allow-Origin': '*'
      });

      console.log(`✅ [SCHEDULES] Imagen servida (${useWasabi ? 'Wasabi' : 'Local'}): ${keyOrPath}`);

      // Stream al cliente
      stream.pipe(res);

    } catch (storageError) {
      console.log(`❌ [SCHEDULES] Imagen no encontrada: ${keyOrPath}`);
      return res.status(404).json({ success: false, error: 'Imagen no encontrada' });
    }

  } catch (error) {
    console.error('Error al servir imagen:', error);
    res.status(500).json({ success: false, error: 'Error al servir imagen' });
  }
};

module.exports = { getAll, getById, getByGradeAndSection, create, update, remove, serveImage };
