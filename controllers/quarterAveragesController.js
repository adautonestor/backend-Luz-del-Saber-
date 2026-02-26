const { getAllQuarterAverages, getQuarterAverageById, getAveragesByStudent, createQuarterAverage, updateQuarterAverage, deleteQuarterAverage } = require('../models/quarterAveragesModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      student_id: req.query.student_id,
      curso_id: req.query.curso_id,
      quarter: req.query.quarter,
      academic_year_id: req.query.academic_year_id
    };
    const averages = await getAllQuarterAverages(filters);
    res.json({ success: true, data: averages, total: averages.length });
  } catch (error) {
    console.error('Error al obtener promedios bimestrales:', error);
    res.status(500).json({ success: false, error: 'Error al obtener promedios bimestrales' });
  }
};

const getById = async (req, res) => {
  try {
    const average = await getQuarterAverageById(req.params.id);
    if (!average) return res.status(404).json({ success: false, error: 'Promedio no encontrado' });
    res.json({ success: true, data: average });
  } catch (error) {
    console.error('Error al obtener promedio:', error);
    res.status(500).json({ success: false, error: 'Error al obtener promedio' });
  }
};

const getByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const añoEscolarId = req.query.academic_year_id || null;
    const averages = await getAveragesByStudent(studentId, añoEscolarId);
    res.json({ success: true, data: averages, total: averages.length });
  } catch (error) {
    console.error('Error al obtener promedios del estudiante:', error);
    res.status(500).json({ success: false, error: 'Error al obtener promedios del estudiante' });
  }
};

const create = async (req, res) => {
  try {
    const { student_id, curso_id, academic_year_id, quarter, promedio } = req.body;
    if (!student_id || !curso_id || !academic_year_id || !quarter || promedio === undefined) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }
    const newAverage = await createQuarterAverage(req.body, req.user?.id);
    res.status(201).json({ success: true, message: 'Promedio registrado exitosamente', data: newAverage });
  } catch (error) {
    console.error('Error al registrar promedio:', error);
    res.status(500).json({ success: false, error: 'Error al registrar promedio' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getQuarterAverageById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Promedio no encontrado' });
    const updated = await updateQuarterAverage(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Promedio actualizado exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar promedio:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar promedio' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getQuarterAverageById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Promedio no encontrado' });
    await deleteQuarterAverage(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Promedio eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar promedio:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar promedio' });
  }
};

module.exports = { getAll, getById, getByStudent, create, update, remove };
