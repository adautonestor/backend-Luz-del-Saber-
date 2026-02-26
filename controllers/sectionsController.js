const { getAllSections, getSectionById, createSection, updateSection, deleteSection } = require('../models/sectionsModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      grade_id: req.query.grade_id,
      academic_year: req.query.academic_year,
      academic_year_id: req.query.academic_year_id || req.query.año_lectivo_id
    };
    const sections = await getAllSections(filters);
    res.json({ success: true, data: sections, total: sections.length });
  } catch (error) {
    console.error('Error al obtener secciones:', error);
    res.status(500).json({ success: false, error: 'Error al obtener secciones' });
  }
};

const getById = async (req, res) => {
  try {
    const section = await getSectionById(req.params.id);
    if (!section) return res.status(404).json({ success: false, error: 'Sección no encontrada' });
    res.json({ success: true, data: section });
  } catch (error) {
    console.error('Error al obtener sección:', error);
    res.status(500).json({ success: false, error: 'Error al obtener sección' });
  }
};

const create = async (req, res) => {
  try {
    console.log('=== CREAR SECCIÓN ===');
    console.log('Body recibido:', JSON.stringify(req.body, null, 2));

    const { grade_id, name, academic_year, academic_year_id } = req.body;

    if (!grade_id || !name) {
      console.log('Error: Faltan campos requeridos - grade_id:', grade_id, 'name:', name);
      return res.status(400).json({ success: false, error: 'El nombre y grado son requeridos' });
    }

    if (!academic_year && !academic_year_id) {
      console.log('Error: Falta año académico - academic_year:', academic_year, 'academic_year_id:', academic_year_id);
      return res.status(400).json({ success: false, error: 'El año académico es requerido' });
    }

    const newSection = await createSection(req.body, req.user?.id);
    console.log('Sección creada:', newSection);
    res.status(201).json({ success: true, message: 'Sección creada exitosamente', data: newSection });
  } catch (error) {
    console.error('Error al crear sección:', error);
    console.error('Error detalle:', error.message);
    res.status(500).json({ success: false, error: 'Error al crear sección: ' + error.message });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getSectionById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Sección no encontrada' });

    // Preservar valores existentes si no se envían nuevos valores
    const dataToUpdate = {
      grade_id: req.body.grade_id !== undefined ? req.body.grade_id : existing.grade_id,
      name: req.body.name !== undefined ? req.body.name : existing.name,
      capacity: req.body.capacity !== undefined ? req.body.capacity : existing.capacity,
      tutor_id: req.body.tutor_id !== undefined ? req.body.tutor_id : existing.tutor_id,
      shift: req.body.shift !== undefined ? req.body.shift : existing.shift,
      students: req.body.students !== undefined ? req.body.students : existing.students,
      academic_year: req.body.academic_year !== undefined ? req.body.academic_year : existing.academic_year
    };

    const updated = await updateSection(req.params.id, dataToUpdate, req.user?.id);
    res.json({ success: true, message: 'Sección actualizada exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar sección:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar sección' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getSectionById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Sección no encontrada' });
    await deleteSection(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Sección eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar sección:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar sección' });
  }
};

module.exports = { getAll, getById, create, update, remove };
