const { getAllSystemSettings, getSystemSettingById, getSettingByKey, getSettingsByCategory, createSystemSetting, updateSystemSetting, updateSettingByKey, upsertSetting, deleteSystemSetting } = require('../models/systemSettingsModel');
const { uploadToStorage, deleteFromStorage, getFileUrl, generateUniqueFilename, useWasabi } = require('../middleware/upload');
const gradingScalesService = require('../services/gradingScalesService');

const getAll = async (req, res) => {
  try {
    const filters = {
      key: req.query.key
    };
    const settings = await getAllSystemSettings(filters);
    res.json({ success: true, data: settings, total: settings.length });
  } catch (error) {
    console.error('Error al obtener configuraciones:', error);
    res.status(500).json({ success: false, error: 'Error al obtener configuraciones' });
  }
};

const getById = async (req, res) => {
  try {
    const setting = await getSystemSettingById(req.params.id);
    if (!setting) return res.status(404).json({ success: false, error: 'Configuracion no encontrada' });
    res.json({ success: true, data: setting });
  } catch (error) {
    console.error('Error al obtener configuracion:', error);
    res.status(500).json({ success: false, error: 'Error al obtener configuracion' });
  }
};

const getByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await getSettingByKey(key);

    // Si no existe, devolver null con success true (el frontend usará valores por defecto)
    if (!setting) {
      return res.json({ success: true, data: null, message: 'Configuracion no encontrada, usando valores por defecto' });
    }

    res.json({ success: true, data: setting });
  } catch (error) {
    console.error('Error al obtener configuracion:', error);
    res.status(500).json({ success: false, error: 'Error al obtener configuracion' });
  }
};

const getByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const settings = await getSettingsByCategory(category);
    res.json({ success: true, data: settings, total: settings.length });
  } catch (error) {
    console.error('Error al obtener configuraciones de la categoria:', error);
    res.status(500).json({ success: false, error: 'Error al obtener configuraciones de la categoria' });
  }
};

const create = async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || !value) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos (key, value)' });
    }

    // Verificar si ya existe
    const existing = await getSettingByKey(key);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Ya existe una configuracion con esa clave' });
    }

    const newSetting = await createSystemSetting({ key, value }, req.user?.id);
    res.status(201).json({ success: true, message: 'Configuracion creada exitosamente', data: newSetting });
  } catch (error) {
    console.error('Error al crear configuracion:', error);
    res.status(500).json({ success: false, error: 'Error al crear configuracion' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getSystemSettingById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Configuracion no encontrada' });

    const updated = await updateSystemSetting(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Configuracion actualizada exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar configuracion:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar configuracion' });
  }
};

const updateByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const { valor } = req.body;

    if (valor === undefined) {
      return res.status(400).json({ success: false, error: 'El valor es requerido' });
    }

    // Usar upsert para crear si no existe
    const result = await upsertSetting(key, valor, req.user?.id);
    res.json({ success: true, message: 'Configuracion actualizada exitosamente', data: result });
  } catch (error) {
    console.error('Error al actualizar configuracion:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar configuracion' });
  }
};

/**
 * Subir logo del colegio
 * POST /api/system-settings/upload-logo
 * - Se guarda en una fila específica con key='school_logo'
 * - Solo puede haber un logo a la vez (elimina el anterior)
 * - Se almacena físicamente en uploads/logo/
 */
const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No se envio ningun archivo' });
    }

    // 1. Obtener logo anterior de la BD (si existe)
    const existingLogo = await getSettingByKey('school_logo');

    // 2. Eliminar logo anterior físicamente si existe
    if (existingLogo && existingLogo.value) {
      const oldLogoData = typeof existingLogo.value === 'string'
        ? JSON.parse(existingLogo.value)
        : existingLogo.value;

      if (oldLogoData.filePath) {
        try {
          await deleteFromStorage(oldLogoData.filePath);
          console.log('🗑️ [SETTINGS] Logo anterior eliminado:', oldLogoData.filePath);
        } catch (err) {
          console.warn('⚠️ [SETTINGS] No se pudo eliminar logo anterior:', err.message);
        }
      }
    }

    // 3. Determinar la ruta del nuevo logo
    let filePath;
    let fileUrl;

    if (useWasabi) {
      // PRODUCCIÓN: Subir a Wasabi S3
      const filename = generateUniqueFilename('school_logo', req.file.originalname);
      const key = `logo/${filename}`;
      filePath = await uploadToStorage(req.file.buffer, key, req.file.mimetype);
      fileUrl = getFileUrl(filePath, '/api/files');
    } else {
      // DESARROLLO: El archivo ya fue guardado por multer en uploads/logo/
      filePath = `uploads/logo/${req.file.filename}`;
      fileUrl = `${process.env.BACKEND_URL || 'http://localhost:4010'}/${filePath}`;
      console.log(`📎 [SETTINGS] Logo guardado localmente: ${filePath}`);
    }

    // 4. Preparar datos del logo para guardar en BD
    const logoData = {
      filePath: filePath,
      fileUrl: fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date().toISOString()
    };

    // 5. Guardar en BD con key='school_logo' (fila específica solo para el logo)
    await upsertSetting('school_logo', logoData, req.user?.id);

    res.json({
      success: true,
      message: 'Logo subido exitosamente',
      data: {
        logoPath: filePath,
        logoUrl: fileUrl,
        fileName: req.file.originalname
      }
    });

  } catch (error) {
    console.error('❌ [SETTINGS] Error al subir logo:', error);
    res.status(500).json({ success: false, error: 'Error al subir logo: ' + error.message });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getSystemSettingById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Configuracion no encontrada' });
    await deleteSystemSetting(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Configuracion eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar configuracion:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar configuracion' });
  }
};

/**
 * Subir archivo generico (imagenes, etc)
 * POST /api/system-settings/upload-file
 */
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No se envio ningun archivo' });
    }

    const folder = req.body.folder || 'general';
    const filename = generateUniqueFilename('file', req.file.originalname);
    const key = `${folder}/${filename}`;

    const storedPath = await uploadToStorage(
      useWasabi ? req.file.buffer : req.file.path,
      key,
      req.file.mimetype,
      req.file
    );

    const fileUrl = getFileUrl(storedPath, '/api/files');

    res.json({
      success: true,
      message: 'Archivo subido exitosamente',
      data: {
        path: storedPath,
        url: fileUrl
      }
    });

  } catch (error) {
    console.error('Error al subir archivo:', error);
    res.status(500).json({ success: false, error: 'Error al subir archivo: ' + error.message });
  }
};

/**
 * Obtener informacion publica del colegio (logo, nombre y direccion)
 * GET /api/system-settings/public/school-info
 * No requiere autenticacion
 * - El logo se obtiene de la fila 'school_logo'
 * - La info del colegio se obtiene de la fila 'school_info'
 */
const getPublicSchoolInfo = async (req, res) => {
  try {
    // Obtener info del colegio
    const schoolInfoSetting = await getSettingByKey('school_info');
    // Obtener logo (fila separada)
    const logoSetting = await getSettingByKey('school_logo');

    let schoolInfo = {
      schoolName: 'Luz del Saber',
      address: ''
    };

    let logoInfo = {
      logoPath: null,
      logoUrl: null
    };

    // Parsear info del colegio
    if (schoolInfoSetting && schoolInfoSetting.value) {
      const value = typeof schoolInfoSetting.value === 'string'
        ? JSON.parse(schoolInfoSetting.value)
        : schoolInfoSetting.value;
      schoolInfo.schoolName = value.name || value.schoolName || 'Luz del Saber';
      schoolInfo.address = value.address || '';
    }

    // Parsear info del logo
    if (logoSetting && logoSetting.value) {
      const value = typeof logoSetting.value === 'string'
        ? JSON.parse(logoSetting.value)
        : logoSetting.value;
      logoInfo.logoPath = value.filePath || null;
      logoInfo.logoUrl = value.fileUrl || null;
    }

    res.json({
      success: true,
      data: {
        ...schoolInfo,
        ...logoInfo
      }
    });
  } catch (error) {
    console.error('Error al obtener info publica del colegio:', error);
    res.status(500).json({ success: false, error: 'Error al obtener informacion' });
  }
};

// ============================================
// ENDPOINTS DE ESCALAS DE CALIFICACIÓN
// ============================================

/**
 * Obtener configuración de escalas de calificación
 * GET /api/system-settings/grading-scales/:academicYearId
 */
const getGradingScales = async (req, res) => {
  try {
    const { academicYearId } = req.params;
    const config = await gradingScalesService.getGradingScalesConfig(
      academicYearId ? parseInt(academicYearId) : null
    );
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('Error al obtener configuración de escalas:', error);
    res.status(500).json({ success: false, error: 'Error al obtener configuración de escalas' });
  }
};

/**
 * Actualizar configuración de escalas de calificación
 * PUT /api/system-settings/grading-scales/:academicYearId
 */
const updateGradingScales = async (req, res) => {
  try {
    const { academicYearId } = req.params;
    const { levels } = req.body;

    if (!levels) {
      return res.status(400).json({ success: false, error: 'Se requiere la configuración de niveles' });
    }

    const currentConfig = await gradingScalesService.getGradingScalesConfig(
      academicYearId ? parseInt(academicYearId) : null
    );

    const newConfig = {
      ...currentConfig,
      academic_year_id: academicYearId ? parseInt(academicYearId) : currentConfig.academic_year_id,
      levels: levels,
      updated_at: new Date().toISOString()
    };

    const updated = await gradingScalesService.updateGradingScalesConfig(newConfig, req.user?.id);
    res.json({ success: true, message: 'Configuración de escalas actualizada', data: updated });
  } catch (error) {
    console.error('Error al actualizar configuración de escalas:', error);
    res.status(500).json({ success: false, error: error.message || 'Error al actualizar configuración de escalas' });
  }
};

/**
 * Actualizar escala de un nivel específico
 * PUT /api/system-settings/grading-scales/:academicYearId/level/:levelId
 */
const updateLevelScale = async (req, res) => {
  try {
    const { academicYearId, levelId } = req.params;
    const levelConfig = req.body;

    if (!levelConfig) {
      return res.status(400).json({ success: false, error: 'Se requiere la configuración del nivel' });
    }

    const updated = await gradingScalesService.updateLevelScale(
      parseInt(levelId),
      levelConfig,
      academicYearId ? parseInt(academicYearId) : null,
      req.user?.id
    );

    res.json({ success: true, message: 'Escala del nivel actualizada', data: updated });
  } catch (error) {
    console.error('Error al actualizar escala del nivel:', error);
    res.status(500).json({ success: false, error: error.message || 'Error al actualizar escala del nivel' });
  }
};

/**
 * Obtener escala de un nivel específico
 * GET /api/system-settings/grading-scales/:academicYearId/level/:levelId
 */
const getLevelScale = async (req, res) => {
  try {
    const { academicYearId, levelId } = req.params;

    const scale = await gradingScalesService.getScaleForLevel(
      parseInt(levelId),
      academicYearId ? parseInt(academicYearId) : null
    );

    if (!scale) {
      return res.status(404).json({ success: false, error: 'Nivel no encontrado' });
    }

    res.json({ success: true, data: scale });
  } catch (error) {
    console.error('Error al obtener escala del nivel:', error);
    res.status(500).json({ success: false, error: 'Error al obtener escala del nivel' });
  }
};

/**
 * Bloquear escala de un nivel
 * POST /api/system-settings/grading-scales/:academicYearId/lock/:levelId
 */
const lockLevelScale = async (req, res) => {
  try {
    const { academicYearId, levelId } = req.params;

    const updated = await gradingScalesService.lockLevel(
      parseInt(levelId),
      academicYearId ? parseInt(academicYearId) : null,
      req.user?.id
    );

    res.json({
      success: true,
      message: `Nivel ${levelId} bloqueado exitosamente`,
      data: updated
    });
  } catch (error) {
    console.error('Error al bloquear nivel:', error);
    res.status(500).json({ success: false, error: 'Error al bloquear nivel' });
  }
};

/**
 * Verificar si un nivel está bloqueado
 * GET /api/system-settings/grading-scales/:academicYearId/is-locked/:levelId
 */
const isLevelLocked = async (req, res) => {
  try {
    const { academicYearId, levelId } = req.params;

    const isLocked = await gradingScalesService.isLevelLocked(
      parseInt(levelId),
      academicYearId ? parseInt(academicYearId) : null
    );

    const hasGrades = await gradingScalesService.hasGradesForLevel(
      parseInt(levelId),
      academicYearId ? parseInt(academicYearId) : null
    );

    res.json({
      success: true,
      data: {
        levelId: parseInt(levelId),
        isLocked,
        hasGrades,
        reason: isLocked ? 'El nivel tiene notas registradas' : null
      }
    });
  } catch (error) {
    console.error('Error al verificar bloqueo de nivel:', error);
    res.status(500).json({ success: false, error: 'Error al verificar bloqueo de nivel' });
  }
};

/**
 * Validar un valor de calificación
 * POST /api/system-settings/grading-scales/validate
 */
const validateGradeValue = async (req, res) => {
  try {
    const { value, levelId, academicYearId } = req.body;

    if (value === undefined || !levelId) {
      return res.status(400).json({ success: false, error: 'Se requiere value y levelId' });
    }

    const validation = await gradingScalesService.validateGradeValue(
      value,
      parseInt(levelId),
      academicYearId ? parseInt(academicYearId) : null
    );

    res.json({ success: true, data: validation });
  } catch (error) {
    console.error('Error al validar calificación:', error);
    res.status(500).json({ success: false, error: 'Error al validar calificación' });
  }
};

/**
 * Convertir valor de calificación
 * POST /api/system-settings/grading-scales/convert
 */
const convertGradeValue = async (req, res) => {
  try {
    const { value, levelId, academicYearId, direction } = req.body;

    if (value === undefined || !levelId) {
      return res.status(400).json({ success: false, error: 'Se requiere value y levelId' });
    }

    let result;
    if (direction === 'toNumeric') {
      result = await gradingScalesService.convertLetterToNumeric(
        value,
        parseInt(levelId),
        academicYearId ? parseInt(academicYearId) : null
      );
    } else {
      result = await gradingScalesService.convertNumericToLetter(
        parseFloat(value),
        parseInt(levelId),
        academicYearId ? parseInt(academicYearId) : null
      );
    }

    res.json({
      success: true,
      data: {
        originalValue: value,
        convertedValue: result,
        direction: direction || 'toLetter'
      }
    });
  } catch (error) {
    console.error('Error al convertir calificación:', error);
    res.status(500).json({ success: false, error: 'Error al convertir calificación' });
  }
};

/**
 * Obtener tabla de conversión para un nivel
 * GET /api/system-settings/grading-scales/:academicYearId/conversion-table/:levelId
 */
const getConversionTable = async (req, res) => {
  try {
    const { academicYearId, levelId } = req.params;

    const table = await gradingScalesService.getConversionTable(
      parseInt(levelId),
      academicYearId ? parseInt(academicYearId) : null
    );

    res.json({ success: true, data: table });
  } catch (error) {
    console.error('Error al obtener tabla de conversión:', error);
    res.status(500).json({ success: false, error: 'Error al obtener tabla de conversión' });
  }
};

module.exports = {
  getAll,
  getById,
  getByKey,
  getByCategory,
  create,
  update,
  updateByKey,
  uploadLogo,
  uploadFile,
  remove,
  getPublicSchoolInfo,
  // Escalas de calificación
  getGradingScales,
  updateGradingScales,
  updateLevelScale,
  getLevelScale,
  lockLevelScale,
  isLevelLocked,
  validateGradeValue,
  convertGradeValue,
  getConversionTable
};
