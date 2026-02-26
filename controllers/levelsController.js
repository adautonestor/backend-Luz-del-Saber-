const { getAllLevels, getLevelById, createLevel, updateLevel, deleteLevel } = require('../models/levelsModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      academic_year_id: req.query.academic_year_id || req.query.año_lectivo_id
    };
    const levels = await getAllLevels(filters);
    res.json({ success: true, data: levels, total: levels.length });
  } catch (error) {
    console.error('Error al obtener niveles:', error);
    res.status(500).json({ success: false, error: 'Error al obtener niveles' });
  }
};

const getById = async (req, res) => {
  try {
    const level = await getLevelById(req.params.id);
    if (!level) return res.status(404).json({ success: false, error: 'Nivel no encontrado' });
    res.json({ success: true, data: level });
  } catch (error) {
    console.error('Error al obtener nivel:', error);
    res.status(500).json({ success: false, error: 'Error al obtener nivel' });
  }
};

const create = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'El nombre del nivel es requerido' });
    }

    // Generar código automáticamente si no se proporciona
    let code = req.body.code;
    if (!code || code.trim() === '') {
      // Normalizar nombre (sin tildes)
      const normalizedName = name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

      // Separar palabras
      const words = normalizedName.split(/\s+/);

      if (words.length === 1) {
        // Una sola palabra: tomar primeras 3-4 letras
        code = words[0].substring(0, 4).toUpperCase();
      } else {
        // Múltiples palabras: generar abreviatura con iniciales
        const initials = words.map(word => word[0]).join('').toUpperCase();

        if (initials.length >= 3) {
          // Si hay 3 o más iniciales, usar eso
          code = initials.substring(0, 4);
        } else {
          // Si hay menos de 3 iniciales, completar con letras de la primera palabra
          const firstWord = words[0].substring(1, 3).toUpperCase();
          code = (initials + firstWord).substring(0, 4);
        }
      }
    }

    // Calcular 'order' automáticamente según niveles del mismo año académico
    let order = req.body.order;
    if (!order && req.body.academic_year_id) {
      const existingLevels = await getAllLevels({
        status: 'active',
        academic_year_id: req.body.academic_year_id
      });
      order = existingLevels.length + 1;
    } else if (!order) {
      order = 1;
    }

    const dataToCreate = {
      ...req.body,
      code,
      order
    };

    const newLevel = await createLevel(dataToCreate, req.user?.id);
    res.status(201).json({ success: true, message: 'Nivel creado exitosamente', data: newLevel });
  } catch (error) {
    console.error('Error al crear nivel:', error);
    res.status(500).json({ success: false, error: 'Error al crear nivel' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getLevelById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Nivel no encontrado' });

    // Preservar valores existentes si no se envían nuevos valores
    const dataToUpdate = {
      name: req.body.name !== undefined ? req.body.name : existing.name,
      code: req.body.code !== undefined ? req.body.code : existing.code,
      description: req.body.description !== undefined ? req.body.description : existing.description,
      order: req.body.order !== undefined ? req.body.order : existing.order,
      status: req.body.status !== undefined ? req.body.status : existing.status
    };

    const updated = await updateLevel(req.params.id, dataToUpdate, req.user?.id);
    res.json({ success: true, message: 'Nivel actualizado exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar nivel:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar nivel' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getLevelById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Nivel no encontrado' });
    await deleteLevel(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Nivel eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar nivel:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar nivel' });
  }
};

module.exports = { getAll, getById, create, update, remove };
