const { getAllPsychologicalReports, getPsychologicalReportById, getReportsByStudent, createPsychologicalReport, updatePsychologicalReport, deletePsychologicalReport } = require('../models/psychologicalReportsModel');
const {
  uploadToStorage,
  deleteFromStorage,
  getFromStorage,
  getFileUrl,
  generateUniqueFilename,
  useWasabi
} = require('../middleware/upload');

/**
 * Generar key de S3 para informes psicológicos
 */
const generatePsychReportKey = (studentId, academicYear, filename) => {
  return `psychological-reports/${academicYear}/student_${studentId}/${filename}`;
};

/**
 * Obtener todos los informes psicológicos
 */
const getAll = async (req, res) => {
  try {
    const filters = {
      student_id: req.query.student_id,
      type: req.query.type,
      academic_year: req.query.academic_year
    };
    const reports = await getAllPsychologicalReports(filters);

    console.log(`📋 [PSYCH-REPORTS] Obtenidos ${reports.length} informes de la BD`);

    // Agregar URL completa a cada informe (la columna DB es file_url)
    const reportsWithUrls = reports.map(report => {
      const originalUrl = report.file_url;
      const processedUrl = originalUrl ? getFileUrl(originalUrl, '/api/psychological-reports/file') : null;

      if (originalUrl) {
        console.log(`📎 [PSYCH-REPORTS] Informe ${report.id}: file_url original="${originalUrl}" → procesado="${processedUrl}"`);
      }

      return {
        ...report,
        file_url: processedUrl
      };
    });

    res.json({ success: true, data: reportsWithUrls, total: reportsWithUrls.length });
  } catch (error) {
    console.error('Error al obtener informes psicológicos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener informes psicológicos' });
  }
};

/**
 * Obtener informe por ID
 */
const getById = async (req, res) => {
  try {
    const report = await getPsychologicalReportById(req.params.id);
    if (!report) return res.status(404).json({ success: false, error: 'Informe no encontrado' });

    // Agregar URL completa (la columna DB es file_url)
    report.file_url = report.file_url ? getFileUrl(report.file_url, '/api/psychological-reports/file') : null;

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error al obtener informe:', error);
    res.status(500).json({ success: false, error: 'Error al obtener informe' });
  }
};

/**
 * Obtener informes por estudiante
 */
const getByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const academicYear = req.query.academic_year || null;
    const reports = await getReportsByStudent(studentId, academicYear);

    // Agregar URL completa a cada informe (la columna DB es file_url)
    const reportsWithUrls = reports.map(report => ({
      ...report,
      file_url: report.file_url ? getFileUrl(report.file_url, '/api/psychological-reports/file') : null
    }));

    res.json({ success: true, data: reportsWithUrls, total: reportsWithUrls.length });
  } catch (error) {
    console.error('Error al obtener informes del estudiante:', error);
    res.status(500).json({ success: false, error: 'Error al obtener informes del estudiante' });
  }
};

/**
 * Crear informe psicológico (HÍBRIDO)
 * Producción: Sube a Wasabi S3
 * Desarrollo: Guarda en disco local
 */
const create = async (req, res) => {
  try {
    const { student_id, academic_year, issue_date, observations } = req.body;

    // Validar campos requeridos
    if (!student_id) {
      return res.status(400).json({ success: false, error: 'Debe especificar el estudiante' });
    }

    if (!academic_year) {
      return res.status(400).json({ success: false, error: 'Debe especificar el año académico' });
    }

    // Validar que se haya subido un archivo
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Debe subir un archivo PDF' });
    }

    // Generar nombre único para el archivo
    const uniqueFilename = generateUniqueFilename('informe_psicologico', req.file.originalname);

    let storedPath;

    if (useWasabi) {
      // PRODUCCIÓN: Subir a Wasabi S3
      const s3Key = generatePsychReportKey(student_id, academic_year, uniqueFilename);

      console.log(`📤 [PSYCH-REPORTS] Subiendo a Wasabi: ${s3Key}`);

      storedPath = await uploadToStorage(
        req.file.buffer,
        s3Key,
        req.file.mimetype
      );
    } else {
      // DESARROLLO: Ya está guardado en disco por multer
      storedPath = `uploads/psychological-reports/${req.file.filename}`;
      console.log(`📤 [PSYCH-REPORTS] Guardado localmente: ${storedPath}`);
    }

    // Preparar datos para guardar en BD
    const reportData = {
      student_id: parseInt(student_id),
      academic_year: academic_year,
      issue_date: issue_date || new Date().toISOString().split('T')[0],
      file_name: req.file.originalname,
      file_path: storedPath,
      file_size: req.file.size,
      observations: observations || null
    };

    const newReport = await createPsychologicalReport(reportData, req.user?.id);

    // Agregar URL completa a la respuesta (la columna DB es file_url)
    newReport.file_url = getFileUrl(storedPath, '/api/psychological-reports/file');

    console.log(`✅ [PSYCH-REPORTS] Informe creado exitosamente (${useWasabi ? 'Wasabi' : 'Local'})`);

    res.status(201).json({
      success: true,
      message: 'Informe creado exitosamente',
      data: newReport,
      storage: useWasabi ? 'wasabi' : 'local'
    });

  } catch (error) {
    console.error('Error al crear informe:', error);
    res.status(500).json({ success: false, error: 'Error al crear informe: ' + error.message });
  }
};

/**
 * Actualizar informe psicológico
 */
const update = async (req, res) => {
  try {
    const existing = await getPsychologicalReportById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Informe no encontrado' });

    let updateData = { ...req.body };

    // Si se sube un nuevo archivo
    if (req.file) {
      // Eliminar archivo anterior si existe (la columna DB es file_url)
      if (existing.file_url) {
        try {
          await deleteFromStorage(existing.file_url);
          console.log(`🗑️ [PSYCH-REPORTS] Archivo anterior eliminado: ${existing.file_url}`);
        } catch (err) {
          console.warn(`⚠️ [PSYCH-REPORTS] No se pudo eliminar archivo anterior:`, err.message);
        }
      }

      // Generar nuevo nombre y subir
      const uniqueFilename = generateUniqueFilename('informe_psicologico', req.file.originalname);

      if (useWasabi) {
        const s3Key = generatePsychReportKey(existing.student_id, existing.academic_year, uniqueFilename);
        updateData.file_path = await uploadToStorage(req.file.buffer, s3Key, req.file.mimetype);
      } else {
        updateData.file_path = `uploads/psychological-reports/${req.file.filename}`;
      }

      updateData.file_name = req.file.originalname;
      updateData.file_size = req.file.size;

      console.log(`📤 [PSYCH-REPORTS] Nuevo archivo actualizado: ${updateData.file_path}`);
    }

    const updated = await updatePsychologicalReport(req.params.id, updateData, req.user?.id);

    // Agregar URL completa (la columna DB es file_url)
    updated.file_url = updated.file_url ? getFileUrl(updated.file_url, '/api/psychological-reports/file') : null;

    res.json({ success: true, message: 'Informe actualizado exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar informe:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar informe' });
  }
};

/**
 * Eliminar informe psicológico
 */
const remove = async (req, res) => {
  try {
    const existing = await getPsychologicalReportById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Informe no encontrado' });

    // Eliminar archivo del storage (la columna DB es file_url)
    if (existing.file_url) {
      try {
        await deleteFromStorage(existing.file_url);
        console.log(`🗑️ [PSYCH-REPORTS] Archivo eliminado: ${existing.file_url}`);
      } catch (err) {
        console.warn(`⚠️ [PSYCH-REPORTS] No se pudo eliminar archivo:`, err.message);
      }
    }

    await deletePsychologicalReport(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Informe eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar informe:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar informe' });
  }
};

/**
 * Servir archivo PDF (PROXY HÍBRIDO)
 * Producción: Descarga de Wasabi S3 y hace streaming
 * Desarrollo: Sirve archivo local
 */
const serveFile = async (req, res) => {
  try {
    let keyOrPath = req.params.key || req.params.filename;

    // Decodificar si viene URL encoded
    keyOrPath = decodeURIComponent(keyOrPath);

    console.log(`🔍 [PSYCH-REPORTS] Sirviendo archivo: ${keyOrPath}`);

    try {
      const { stream, contentType, contentLength } = await getFromStorage(keyOrPath);

      // Configurar headers
      res.set({
        'Content-Type': contentType || 'application/pdf',
        'Content-Length': contentLength,
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*'
      });

      console.log(`✅ [PSYCH-REPORTS] Archivo servido (${useWasabi ? 'Wasabi' : 'Local'}): ${keyOrPath}`);

      // Stream al cliente
      stream.pipe(res);

    } catch (storageError) {
      console.log(`❌ [PSYCH-REPORTS] Archivo no encontrado: ${keyOrPath}`);
      console.log(`❌ [PSYCH-REPORTS] Error detalle:`, storageError.message);
      return res.status(404).json({ success: false, error: 'Archivo no encontrado', path: keyOrPath });
    }

  } catch (error) {
    console.error('Error al servir archivo:', error);
    res.status(500).json({ success: false, error: 'Error al servir archivo' });
  }
};

module.exports = { getAll, getById, getByStudent, create, update, remove, serveFile };
