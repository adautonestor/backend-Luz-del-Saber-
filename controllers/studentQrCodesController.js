const {
  getAllStudentQrCodes,
  getStudentQrCodeById,
  getStudentQrCodeByCode,
  getActiveQrCodeByStudent,
  createStudentQrCode,
  updateStudentQrCode,
  deactivateStudentQrCode,
  deleteStudentQrCode,
  findStudentByDniOrBarcode,
  createBulkQrCodes,
  getStudentsWithQrCodes
} = require('../models/studentQrCodesModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      student_id: req.query.student_id,
      activo: req.query.activo === 'true' ? true : req.query.activo === 'false' ? false : undefined
    };
    const qrCodes = await getAllStudentQrCodes(filters);
    res.json({ success: true, data: qrCodes, total: qrCodes.length });
  } catch (error) {
    console.error('Error al obtener códigos QR:', error);
    res.status(500).json({ success: false, error: 'Error al obtener códigos QR' });
  }
};

const getById = async (req, res) => {
  try {
    const qrCode = await getStudentQrCodeById(req.params.id);
    if (!qrCode) return res.status(404).json({ success: false, error: 'Código QR no encontrado' });
    res.json({ success: true, data: qrCode });
  } catch (error) {
    console.error('Error al obtener código QR:', error);
    res.status(500).json({ success: false, error: 'Error al obtener código QR' });
  }
};

const getByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const qrCode = await getStudentQrCodeByCode(code);
    if (!qrCode) return res.status(404).json({ success: false, error: 'Código QR no encontrado o inactivo' });
    res.json({ success: true, data: qrCode });
  } catch (error) {
    console.error('Error al buscar código QR:', error);
    res.status(500).json({ success: false, error: 'Error al buscar código QR' });
  }
};

const getByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const qrCode = await getActiveQrCodeByStudent(studentId);
    if (!qrCode) return res.status(404).json({ success: false, error: 'No hay código QR activo para este estudiante' });
    res.json({ success: true, data: qrCode });
  } catch (error) {
    console.error('Error al obtener código QR del estudiante:', error);
    res.status(500).json({ success: false, error: 'Error al obtener código QR del estudiante' });
  }
};

const create = async (req, res) => {
  try {
    const { student_id, qr_code } = req.body;
    if (!student_id || !qr_code) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos (student_id, qr_code)' });
    }
    const newQrCode = await createStudentQrCode(req.body, req.user?.id);
    res.status(201).json({ success: true, message: 'Código QR generado exitosamente', data: newQrCode });
  } catch (error) {
    console.error('Error al generar código QR:', error);
    res.status(500).json({ success: false, error: 'Error al generar código QR' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getStudentQrCodeById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Código QR no encontrado' });
    const updated = await updateStudentQrCode(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Código QR actualizado exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar código QR:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar código QR' });
  }
};

const deactivate = async (req, res) => {
  try {
    const existing = await getStudentQrCodeById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Código QR no encontrado' });
    const deactivated = await deactivateStudentQrCode(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Código QR desactivado exitosamente', data: deactivated });
  } catch (error) {
    console.error('Error al desactivar código QR:', error);
    res.status(500).json({ success: false, error: 'Error al desactivar código QR' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getStudentQrCodeById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Código QR no encontrado' });
    await deleteStudentQrCode(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Código QR eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar código QR:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar código QR' });
  }
};

/**
 * Buscar estudiante por DNI, código de barras o QR code
 * Para usar en el escáner de asistencia
 */
const findByDniOrBarcode = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({ success: false, error: 'Debe proporcionar un código' });
    }

    const student = await findStudentByDniOrBarcode(code);

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Estudiante no encontrado con ese código'
      });
    }

    res.json({ success: true, data: student });
  } catch (error) {
    console.error('Error al buscar estudiante:', error);
    res.status(500).json({ success: false, error: 'Error al buscar estudiante' });
  }
};

/**
 * Generar QR codes masivamente para múltiples estudiantes
 */
const generateBulk = async (req, res) => {
  try {
    const { student_ids } = req.body;

    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Debe proporcionar un array de IDs de estudiantes'
      });
    }

    const results = await createBulkQrCodes(student_ids, req.user?.id);

    res.status(201).json({
      success: true,
      message: `${results.length} códigos QR generados exitosamente`,
      data: results,
      total: results.length
    });
  } catch (error) {
    console.error('Error al generar códigos QR masivos:', error);
    res.status(500).json({ success: false, error: 'Error al generar códigos QR' });
  }
};

/**
 * Obtener lista de estudiantes con sus QR codes para generar PDF
 */
const getStudentsForPdf = async (req, res) => {
  try {
    const filters = {
      level_id: req.query.level_id,
      grade_id: req.query.grade_id,
      section_id: req.query.section_id
    };

    const students = await getStudentsWithQrCodes(filters);

    res.json({
      success: true,
      data: students,
      total: students.length
    });
  } catch (error) {
    console.error('Error al obtener estudiantes para PDF:', error);
    res.status(500).json({ success: false, error: 'Error al obtener estudiantes' });
  }
};

module.exports = {
  getAll,
  getById,
  getByCode,
  getByStudent,
  create,
  update,
  deactivate,
  remove,
  findByDniOrBarcode,
  generateBulk,
  getStudentsForPdf
};
