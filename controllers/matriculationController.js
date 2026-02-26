const { getAllMatriculations, getMatriculationById, getMatriculationByStudentAndYear, createMatriculation, createMatriculationWithTransaction, updateMatriculation, approveMatriculation, deleteMatriculation, updateContractFilePath } = require('../models/matriculationModel');
const {
  uploadToStorage,
  deleteFromStorage,
  getFromStorage,
  getFileUrl,
  generateUniqueFilename,
  generateContractKey,
  useWasabi
} = require('../middleware/upload');

const getAll = async (req, res) => {
  try {
    const filters = {
      student_id: req.query.student_id,
      academic_year_id: req.query.academic_year_id,
      level_id: req.query.level_id,
      grade_id: req.query.grade_id,
      section_id: req.query.section_id,
      teacher_id: req.query.teacher_id,
      status: req.query.status
    };
    const matriculations = await getAllMatriculations(filters);
    res.json({ success: true, data: matriculations, total: matriculations.length });
  } catch (error) {
    console.error('Error al obtener matrículas:', error);
    res.status(500).json({ success: false, error: 'Error al obtener matrículas' });
  }
};

const getById = async (req, res) => {
  try {
    const matriculation = await getMatriculationById(req.params.id);
    if (!matriculation) return res.status(404).json({ success: false, error: 'Matrícula no encontrada' });
    res.json({ success: true, data: matriculation });
  } catch (error) {
    console.error('Error al obtener matrícula:', error);
    res.status(500).json({ success: false, error: 'Error al obtener matrícula' });
  }
};

const getByStudentAndYear = async (req, res) => {
  try {
    const { studentId, year } = req.params;
    const matriculation = await getMatriculationByStudentAndYear(studentId, year);
    if (!matriculation) return res.status(404).json({ success: false, error: 'Matrícula no encontrada' });
    res.json({ success: true, data: matriculation });
  } catch (error) {
    console.error('Error al obtener matrícula:', error);
    res.status(500).json({ success: false, error: 'Error al obtener matrícula' });
  }
};

const getByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    // Usar getAllMatriculations con filtro de student_id
    const matriculations = await getAllMatriculations({ student_id: studentId });
    res.json({ success: true, data: matriculations, matriculas: matriculations });
  } catch (error) {
    console.error('Error al obtener matrículas del estudiante:', error);
    res.status(500).json({ success: false, error: 'Error al obtener matrículas del estudiante' });
  }
};

const create = async (req, res) => {
  try {
    const { student_id, academic_year_id, level_id, grade_id, section_id } = req.body;

    // Validación de campos requeridos
    if (!student_id || !academic_year_id || !level_id || !grade_id || !section_id) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    // Verificar si ya existe matrícula
    const existing = await getMatriculationByStudentAndYear(student_id, academic_year_id);
    if (existing) {
      return res.status(400).json({ success: false, error: 'El estudiante ya tiene matrícula para este año escolar' });
    }

    let contractPath = null;

    // Si se subió un archivo de contrato, usar almacenamiento híbrido
    if (req.file) {
      const uniqueFilename = generateUniqueFilename('contrato', req.file.originalname);

      if (useWasabi) {
        // PRODUCCIÓN: Subir a Wasabi S3
        const s3Key = generateContractKey(student_id, academic_year_id, uniqueFilename);
        console.log(`📤 [CONTRACTS] Subiendo a Wasabi: ${s3Key}`);
        contractPath = await uploadToStorage(req.file.buffer, s3Key, req.file.mimetype);
      } else {
        // DESARROLLO: Ya está guardado en disco por multer
        contractPath = `uploads/contracts/${req.file.filename}`;
        console.log(`📤 [CONTRACTS] Guardado localmente: ${contractPath}`);
      }
    }

    const matriculationData = {
      ...req.body,
      contract_file_path: contractPath
    };

    const newMatriculation = await createMatriculation(matriculationData, req.user?.id);

    // Agregar URL del contrato a la respuesta
    if (newMatriculation.contract_file_path) {
      newMatriculation.contract_url = getFileUrl(newMatriculation.contract_file_path, '/api/matriculations/contract');
    }

    console.log(`✅ [CONTRACTS] Matrícula creada exitosamente (${useWasabi ? 'Wasabi' : 'Local'})`);

    res.status(201).json({
      success: true,
      message: 'Matrícula creada exitosamente',
      data: newMatriculation,
      storage: useWasabi ? 'wasabi' : 'local'
    });
  } catch (error) {
    console.error('Error al crear matrícula:', error);
    res.status(500).json({ success: false, error: error.message || 'Error al crear matrícula' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getMatriculationById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Matrícula no encontrada' });

    const updateData = { ...req.body };

    // Si se subió un nuevo archivo de contrato
    if (req.file) {
      // Eliminar archivo anterior si existe
      if (existing.contract_file_path) {
        try {
          await deleteFromStorage(existing.contract_file_path);
          console.log(`🗑️ [CONTRACTS] Archivo anterior eliminado: ${existing.contract_file_path}`);
        } catch (err) {
          console.warn(`⚠️ [CONTRACTS] No se pudo eliminar archivo anterior:`, err.message);
        }
      }

      // Subir nuevo archivo
      const uniqueFilename = generateUniqueFilename('contrato', req.file.originalname);

      if (useWasabi) {
        const s3Key = generateContractKey(existing.student_id, existing.academic_year_id, uniqueFilename);
        updateData.contract_file_path = await uploadToStorage(req.file.buffer, s3Key, req.file.mimetype);
      } else {
        updateData.contract_file_path = `uploads/contracts/${req.file.filename}`;
      }

      console.log(`📤 [CONTRACTS] Nuevo contrato actualizado: ${updateData.contract_file_path}`);
    }

    const updated = await updateMatriculation(req.params.id, updateData, req.user?.id);

    // Agregar URL del contrato
    if (updated.contract_file_path) {
      updated.contract_url = getFileUrl(updated.contract_file_path, '/api/matriculations/contract');
    }

    res.json({ success: true, message: 'Matrícula actualizada exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar matrícula:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar matrícula' });
  }
};

const approve = async (req, res) => {
  try {
    const existing = await getMatriculationById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Matrícula no encontrada' });
    const approved = await approveMatriculation(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Matrícula aprobada exitosamente', data: approved });
  } catch (error) {
    console.error('Error al aprobar matrícula:', error);
    res.status(500).json({ success: false, error: 'Error al aprobar matrícula' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getMatriculationById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Matrícula no encontrada' });

    // Eliminar archivo de contrato si existe
    if (existing.contract_file_path) {
      try {
        await deleteFromStorage(existing.contract_file_path);
        console.log(`🗑️ [CONTRACTS] Archivo eliminado: ${existing.contract_file_path}`);
      } catch (err) {
        console.warn(`⚠️ [CONTRACTS] No se pudo eliminar archivo:`, err.message);
      }
    }

    await deleteMatriculation(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Matrícula eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar matrícula:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar matrícula' });
  }
};

/**
 * Actualizar contrato de matrícula por estudiante y año (HÍBRIDO)
 */
const updateContractByStudentAndYear = async (req, res) => {
  try {
    const { studentId, year } = req.params;

    console.log('=== INICIO updateContractByStudentAndYear ===');

    const matriculation = await getMatriculationByStudentAndYear(studentId, year);

    if (!matriculation) {
      return res.status(404).json({
        success: false,
        error: 'No se encontró matrícula para este estudiante en el año especificado'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó archivo de contrato'
      });
    }

    // Eliminar archivo anterior si existe
    if (matriculation.contract_file_path) {
      try {
        await deleteFromStorage(matriculation.contract_file_path);
        console.log(`🗑️ [CONTRACTS] Archivo anterior eliminado: ${matriculation.contract_file_path}`);
      } catch (err) {
        console.warn(`⚠️ [CONTRACTS] No se pudo eliminar archivo anterior:`, err.message);
      }
    }

    // Subir nuevo archivo
    const uniqueFilename = generateUniqueFilename('contrato', req.file.originalname);
    let contractPath;

    if (useWasabi) {
      const s3Key = generateContractKey(studentId, year, uniqueFilename);
      console.log(`📤 [CONTRACTS] Subiendo a Wasabi: ${s3Key}`);
      contractPath = await uploadToStorage(req.file.buffer, s3Key, req.file.mimetype);
    } else {
      contractPath = `uploads/contracts/${req.file.filename}`;
      console.log(`📤 [CONTRACTS] Guardado localmente: ${contractPath}`);
    }

    const updated = await updateContractFilePath(matriculation.id, contractPath, req.user?.id);

    // Agregar URL del contrato
    updated.contract_url = getFileUrl(contractPath, '/api/matriculations/contract');

    console.log(`✅ [CONTRACTS] Contrato actualizado (${useWasabi ? 'Wasabi' : 'Local'})`);

    return res.json({
      success: true,
      message: 'Contrato actualizado exitosamente',
      data: updated,
      storage: useWasabi ? 'wasabi' : 'local'
    });
  } catch (error) {
    console.error('Error en updateContractByStudentAndYear:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar contrato'
    });
  }
};

/**
 * Eliminar contrato de matrícula por estudiante y año (HÍBRIDO)
 */
const deleteContractByStudentAndYear = async (req, res) => {
  try {
    const { studentId, year } = req.params;

    const matriculation = await getMatriculationByStudentAndYear(studentId, year);

    if (!matriculation) {
      return res.status(404).json({
        success: false,
        error: 'No se encontró matrícula para este estudiante en el año especificado'
      });
    }

    // Eliminar archivo del storage si existe
    if (matriculation.contract_file_path) {
      try {
        await deleteFromStorage(matriculation.contract_file_path);
        console.log(`🗑️ [CONTRACTS] Archivo eliminado: ${matriculation.contract_file_path}`);
      } catch (err) {
        console.warn(`⚠️ [CONTRACTS] No se pudo eliminar archivo:`, err.message);
      }
    }

    const updated = await updateContractFilePath(matriculation.id, null, req.user?.id);

    return res.json({
      success: true,
      message: 'Contrato eliminado exitosamente',
      data: updated
    });
  } catch (error) {
    console.error('Error en deleteContractByStudentAndYear:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar contrato'
    });
  }
};

/**
 * Crear matrícula con transacción atómica (HÍBRIDO)
 * Incluye creación de matrícula, actualización de estudiante y generación de obligaciones de pago
 */
const createWithTransaction = async (req, res) => {
  try {
    const { student_id } = req.body;

    // Parsear paymentSchedule si viene como string (desde FormData)
    let paymentSchedule = req.body.paymentSchedule;
    if (typeof paymentSchedule === 'string') {
      try {
        paymentSchedule = JSON.parse(paymentSchedule);
      } catch (e) {
        paymentSchedule = [];
      }
    }

    console.log('=== INICIO createWithTransaction ===');

    if (!student_id) {
      return res.status(400).json({
        success: false,
        error: 'Falta el campo requerido: student_id'
      });
    }

    const academicYearId = req.body.academic_year_id;
    if (academicYearId) {
      const existing = await getAllMatriculations({
        student_id,
        academic_year_id: academicYearId
      });

      if (existing && existing.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'El estudiante ya tiene matrícula para este año lectivo'
        });
      }
    }

    let contractPath = null;

    // Si se subió un archivo de contrato, usar almacenamiento híbrido
    if (req.file) {
      const uniqueFilename = generateUniqueFilename('contrato', req.file.originalname);

      if (useWasabi) {
        const s3Key = generateContractKey(student_id, academicYearId, uniqueFilename);
        console.log(`📤 [CONTRACTS] Subiendo a Wasabi: ${s3Key}`);
        contractPath = await uploadToStorage(req.file.buffer, s3Key, req.file.mimetype);
      } else {
        contractPath = `uploads/contracts/${req.file.filename}`;
        console.log(`📤 [CONTRACTS] Guardado localmente: ${contractPath}`);
      }
    }

    const matriculationData = {
      ...req.body,
      contract_file_path: contractPath
    };

    const result = await createMatriculationWithTransaction(
      matriculationData,
      paymentSchedule || [],
      req.user?.id
    );

    // Agregar URL del contrato si existe
    if (result.matriculation && result.matriculation.contract_file_path) {
      result.matriculation.contract_url = getFileUrl(result.matriculation.contract_file_path, '/api/matriculations/contract');
    }

    console.log(`✅ [CONTRACTS] Matrícula con transacción creada (${useWasabi ? 'Wasabi' : 'Local'})`);

    res.status(201).json({
      success: true,
      message: 'Matrícula creada exitosamente con transacción atómica',
      data: result,
      storage: useWasabi ? 'wasabi' : 'local'
    });
  } catch (error) {
    console.error('Error en createWithTransaction:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al crear matrícula con transacción'
    });
  }
};

/**
 * Servir contrato (PROXY HÍBRIDO)
 * Producción: Descarga de Wasabi S3 y hace streaming
 * Desarrollo: Sirve archivo local
 */
const serveContract = async (req, res) => {
  try {
    let keyOrPath = req.params.key;
    keyOrPath = decodeURIComponent(keyOrPath);

    console.log(`🔍 [CONTRACTS] Sirviendo contrato: ${keyOrPath}`);

    try {
      const { stream, contentType, contentLength } = await getFromStorage(keyOrPath);

      res.set({
        'Content-Type': contentType || 'application/pdf',
        'Content-Length': contentLength,
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, max-age=3600'
      });

      console.log(`✅ [CONTRACTS] Contrato servido (${useWasabi ? 'Wasabi' : 'Local'}): ${keyOrPath}`);

      stream.pipe(res);
    } catch (storageError) {
      console.log(`❌ [CONTRACTS] Contrato no encontrado: ${keyOrPath}`);
      return res.status(404).json({ success: false, error: 'Contrato no encontrado' });
    }
  } catch (error) {
    console.error('Error al servir contrato:', error);
    res.status(500).json({ success: false, error: 'Error al servir contrato' });
  }
};

module.exports = {
  getAll,
  getById,
  getByStudent,
  getByStudentAndYear,
  create,
  createWithTransaction,
  update,
  approve,
  remove,
  updateContractByStudentAndYear,
  deleteContractByStudentAndYear,
  serveContract
};
