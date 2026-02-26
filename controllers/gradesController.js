const { getAllGrades, getGradeById, createGrade, updateGrade, deleteGrade } = require('../models/gradesModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      level_id: req.query.level_id,
      status: req.query.status,
      academic_year_id: req.query.academic_year_id || req.query.año_lectivo_id
    };
    const grades = await getAllGrades(filters);
    res.json({ success: true, data: grades, total: grades.length });
  } catch (error) {
    console.error('Error al obtener grados:', error);
    res.status(500).json({ success: false, error: 'Error al obtener grados' });
  }
};

const getById = async (req, res) => {
  try {
    const grade = await getGradeById(req.params.id);
    if (!grade) return res.status(404).json({ success: false, error: 'Grado no encontrado' });
    res.json({ success: true, data: grade });
  } catch (error) {
    console.error('Error al obtener grado:', error);
    res.status(500).json({ success: false, error: 'Error al obtener grado' });
  }
};

const create = async (req, res) => {
  try {
    const { level_id, name } = req.body;
    if (!level_id || !name) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos (nivel y nombre)' });
    }

    // Generar código automáticamente si no se proporciona
    let code = req.body.code;
    if (!code || code.trim() === '') {
      // Normalizar nombre (sin tildes)
      const normalizedName = name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

      // Tomar las primeras letras del nombre
      const words = normalizedName.split(/\s+/);
      if (words.length === 1) {
        // Una sola palabra: tomar primeras 3-4 letras
        code = words[0].substring(0, 4).toUpperCase();
      } else {
        // Múltiples palabras: generar abreviatura
        const initials = words.map(word => word[0]).join('').toUpperCase();
        code = initials.substring(0, 4);
      }
    }

    // Si no se proporciona 'order', calcularlo automáticamente
    let order = req.body.order;
    if (!order) {
      const existingGrades = await getAllGrades({ level_id, status: 'active' });
      order = existingGrades.length + 1; // Asignar el siguiente número dentro del nivel
    }

    const dataToCreate = {
      ...req.body,
      code,
      order
    };

    const newGrade = await createGrade(dataToCreate, req.user?.id);
    res.status(201).json({ success: true, message: 'Grado creado exitosamente', data: newGrade });
  } catch (error) {
    console.error('Error al crear grado:', error);
    res.status(500).json({ success: false, error: 'Error al crear grado' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getGradeById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Grado no encontrado' });

    // Preservar valores existentes si no se envían nuevos valores
    const dataToUpdate = {
      level_id: req.body.level_id !== undefined ? req.body.level_id : existing.level_id,
      name: req.body.name !== undefined ? req.body.name : existing.name,
      code: req.body.code !== undefined ? req.body.code : existing.code,
      description: req.body.description !== undefined ? req.body.description : existing.description,
      order: req.body.order !== undefined ? req.body.order : existing.order,
      courses_json: req.body.courses_json !== undefined ? req.body.courses_json : existing.courses_json,
      status: req.body.status !== undefined ? req.body.status : existing.status
    };

    const updated = await updateGrade(req.params.id, dataToUpdate, req.user?.id);
    res.json({ success: true, message: 'Grado actualizado exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar grado:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar grado' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getGradeById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Grado no encontrado' });
    await deleteGrade(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Grado eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar grado:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar grado' });
  }
};

module.exports = { getAll, getById, create, update, remove };
