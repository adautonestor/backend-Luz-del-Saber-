const { getAllPaymentObligations, getPaymentObligationById, createPaymentObligation, updatePaymentObligation, deletePaymentObligation, getObligationsByStudent } = require('../models/paymentObligationsModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      student_id: req.query.student_id,
      status: req.query.status,
      academic_year: req.query.academic_year,
      due_month: req.query.due_month
    };
    const obligations = await getAllPaymentObligations(filters);
    res.json({ success: true, data: obligations, total: obligations.length });
  } catch (error) {
    console.error('Error al obtener obligaciones de pago:', error);
    res.status(500).json({ success: false, error: 'Error al obtener obligaciones de pago' });
  }
};

const getById = async (req, res) => {
  try {
    const obligation = await getPaymentObligationById(req.params.id);
    if (!obligation) return res.status(404).json({ success: false, error: 'Obligación de pago no encontrada' });
    res.json({ success: true, data: obligation });
  } catch (error) {
    console.error('Error al obtener obligación de pago:', error);
    res.status(500).json({ success: false, error: 'Error al obtener obligación de pago' });
  }
};

const getByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const academicYear = req.query.academic_year || null;
    const obligations = await getObligationsByStudent(studentId, academicYear);
    res.json({ success: true, data: obligations, total: obligations.length });
  } catch (error) {
    console.error('Error al obtener obligaciones del estudiante:', error);
    res.status(500).json({ success: false, error: 'Error al obtener obligaciones del estudiante' });
  }
};

const create = async (req, res) => {
  try {
    const { student_id, concept_id, academic_year, due_date, total_amount } = req.body;
    if (!student_id || !concept_id || !academic_year || !due_date || !total_amount) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }
    const newObligation = await createPaymentObligation(req.body, req.user?.id);
    res.status(201).json({ success: true, message: 'Obligación de pago creada exitosamente', data: newObligation });
  } catch (error) {
    console.error('Error al crear obligación de pago:', error);
    res.status(500).json({ success: false, error: 'Error al crear obligación de pago' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getPaymentObligationById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Obligación de pago no encontrada' });
    const updated = await updatePaymentObligation(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Obligación de pago actualizada exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar obligación de pago:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar obligación de pago' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getPaymentObligationById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Obligación de pago no encontrada' });
    await deletePaymentObligation(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Obligación de pago eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar obligación de pago:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar obligación de pago' });
  }
};

module.exports = { getAll, getById, getByStudent, create, update, remove };
