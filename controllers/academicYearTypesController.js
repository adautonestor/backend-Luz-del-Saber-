const academicYearTypesModel = require('../models/academicYearTypesModel');

/**
 * Obtener todos los tipos de año académico
 */
const getAll = async (req, res) => {
  try {
    const { status } = req.query;
    const types = await academicYearTypesModel.getAllAcademicYearTypes({ status });

    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    console.error('Error obteniendo tipos de año académico:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tipos de año académico',
      error: error.message
    });
  }
};

/**
 * Obtener un tipo por ID
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const type = await academicYearTypesModel.getAcademicYearTypeById(id);

    if (!type) {
      return res.status(404).json({
        success: false,
        message: 'Tipo de año académico no encontrado'
      });
    }

    res.json({
      success: true,
      data: type
    });
  } catch (error) {
    console.error('Error obteniendo tipo de año académico:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tipo de año académico',
      error: error.message
    });
  }
};

/**
 * Crear un nuevo tipo de año académico
 */
const create = async (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const { name, code, description, color, icon, order } = req.body;

    // Validaciones básicas
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Nombre y código son requeridos'
      });
    }

    // Verificar si el código ya existe
    const existing = await academicYearTypesModel.getAcademicYearTypeByCode(code);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un tipo con ese código'
      });
    }

    const newType = await academicYearTypesModel.createAcademicYearType(
      { name, code, description, color, icon, order },
      userId
    );

    res.status(201).json({
      success: true,
      message: 'Tipo de año académico creado exitosamente',
      data: newType
    });
  } catch (error) {
    console.error('Error creando tipo de año académico:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear tipo de año académico',
      error: error.message
    });
  }
};

/**
 * Actualizar un tipo de año académico
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 1;
    const { name, code, description, color, icon, order, status } = req.body;

    // Verificar que existe
    const existing = await academicYearTypesModel.getAcademicYearTypeById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Tipo de año académico no encontrado'
      });
    }

    // Si cambia el código, verificar que no exista
    if (code && code !== existing.code) {
      const codeExists = await academicYearTypesModel.getAcademicYearTypeByCode(code);
      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un tipo con ese código'
        });
      }
    }

    const updatedType = await academicYearTypesModel.updateAcademicYearType(
      id,
      {
        name: name || existing.name,
        code: code || existing.code,
        description: description !== undefined ? description : existing.description,
        color: color || existing.color,
        icon: icon || existing.icon,
        order: order !== undefined ? order : existing.order,
        status: status || existing.status
      },
      userId
    );

    res.json({
      success: true,
      message: 'Tipo de año académico actualizado exitosamente',
      data: updatedType
    });
  } catch (error) {
    console.error('Error actualizando tipo de año académico:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar tipo de año académico',
      error: error.message
    });
  }
};

/**
 * Eliminar un tipo de año académico
 */
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 1;

    const deleted = await academicYearTypesModel.deleteAcademicYearType(id, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Tipo de año académico no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Tipo de año académico eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando tipo de año académico:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar tipo de año académico',
      error: error.message
    });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};
