const {
  getAllStudents,
  getStudentById,
  getStudentByDni,
  getStudentByCodigo,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentsByParent,
  getStudentsByParentEnriched
} = require('../models/studentsModel');
const { getUserById } = require('../models/usersModel');

/**
 * Obtener todos los estudiantes con filtros opcionales
 */
const getAll = async (req, res) => {
  try {
    const filters = {
      level_id: req.query.level_id,
      grade_id: req.query.grade_id,
      section_id: req.query.section_id,
      status: req.query.status,
      academic_year_id: req.query.academic_year_id
    };

    const students = await getAllStudents(filters);
    res.json({
      success: true,
      data: students,
      total: students.length
    });
  } catch (error) {
    console.error('Error al obtener estudiantes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estudiantes'
    });
  }
};

/**
 * Obtener un estudiante por ID
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await getStudentById(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Estudiante no encontrado'
      });
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Error al obtener estudiante:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estudiante'
    });
  }
};

/**
 * Buscar estudiante por DNI
 */
const getByDni = async (req, res) => {
  try {
    const { dni } = req.params;
    const student = await getStudentByDni(dni);

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Estudiante no encontrado'
      });
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Error al buscar estudiante por DNI:', error);
    res.status(500).json({
      success: false,
      error: 'Error al buscar estudiante'
    });
  }
};

/**
 * Buscar estudiante por código
 */
const getByCodigo = async (req, res) => {
  try {
    const { codigo } = req.params;
    const student = await getStudentByCodigo(codigo);

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Estudiante no encontrado'
      });
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Error al buscar estudiante por código:', error);
    res.status(500).json({
      success: false,
      error: 'Error al buscar estudiante'
    });
  }
};

/**
 * Crear un nuevo estudiante
 */
const create = async (req, res) => {
  try {
    const userId = req.user?.id;

    // Validaciones básicas (el code se generará automáticamente en el modelo)
    const { barcode, first_names, last_names, dni, birth_date, gender } = req.body;

    if (!barcode || !first_names || !dni || !birth_date || !gender) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    // Verificar duplicados por DNI
    const existingByDni = await getStudentByDni(dni);
    if (existingByDni) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe un estudiante con ese DNI'
      });
    }

    // Convertir parent_id a formato JSON parents si viene parent_id
    let studentDataToSave = { ...req.body };

    if (req.body.parent_id) {
      try {
        // Obtener información completa del padre
        const parentUser = await getUserById(req.body.parent_id);

        if (parentUser) {
          // Construir el array parents en el formato esperado
          studentDataToSave.parents = [
            {
              user_id: parentUser.id,
              dni: parentUser.dni || '',
              phone: parentUser.phone || '',
              first_names: parentUser.first_name || '',
              last_names: parentUser.last_names || '',
              relationship: parentUser.relationship || 'padre',
              is_primary: true
            }
          ];

          // Autocompletar la dirección del estudiante con la dirección del padre
          if (parentUser.address && !studentDataToSave.address) {
            studentDataToSave.address = parentUser.address;
          }
        }

        // Eliminar parent_id ya que no existe en el schema
        delete studentDataToSave.parent_id;
      } catch (err) {
        console.error('Error al obtener datos del padre:', err);
        // Si falla, continuar sin asignar padre
        delete studentDataToSave.parent_id;
      }
    }

    const newStudent = await createStudent(studentDataToSave, userId);

    res.status(201).json({
      success: true,
      message: 'Estudiante creado exitosamente',
      data: newStudent
    });
  } catch (error) {
    console.error('Error al crear estudiante:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear estudiante'
    });
  }
};

/**
 * Actualizar un estudiante
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Verificar que el estudiante existe
    const existing = await getStudentById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Estudiante no encontrado'
      });
    }

    // Verificar duplicados si se cambia DNI
    if (req.body.dni && req.body.dni !== existing.dni) {
      const existingByDni = await getStudentByDni(req.body.dni);
      if (existingByDni && existingByDni.id !== parseInt(id)) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe otro estudiante con ese DNI'
        });
      }
    }

    // Verificar duplicados si se cambia código
    if (req.body.code && req.body.code !== existing.code) {
      const existingByCodigo = await getStudentByCodigo(req.body.code);
      if (existingByCodigo && existingByCodigo.id !== parseInt(id)) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe otro estudiante con ese código'
        });
      }
    }

    // Convertir parent_id a formato JSON parents si viene parent_id
    let studentDataToUpdate = { ...req.body };

    if (req.body.parent_id) {
      try {
        // Obtener información completa del padre
        const parentUser = await getUserById(req.body.parent_id);

        if (parentUser) {
          // Construir el array parents en el formato esperado
          studentDataToUpdate.parents = [
            {
              user_id: parentUser.id,
              dni: parentUser.dni || '',
              phone: parentUser.phone || '',
              first_names: parentUser.first_name || '',
              last_names: parentUser.last_names || '',
              relationship: parentUser.relationship || 'padre',
              is_primary: true
            }
          ];
        }

        // Eliminar parent_id ya que no existe en el schema
        delete studentDataToUpdate.parent_id;
      } catch (err) {
        console.error('Error al obtener datos del padre:', err);
        // Si falla, continuar sin actualizar padre
        delete studentDataToUpdate.parent_id;
      }
    }

    const updatedStudent = await updateStudent(id, studentDataToUpdate, userId);

    res.json({
      success: true,
      message: 'Estudiante actualizado exitosamente',
      data: updatedStudent
    });
  } catch (error) {
    console.error('Error al actualizar estudiante:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar estudiante'
    });
  }
};

/**
 * Eliminar un estudiante (soft delete)
 */
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const existing = await getStudentById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Estudiante no encontrado'
      });
    }

    await deleteStudent(id, userId);

    res.json({
      success: true,
      message: 'Estudiante eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar estudiante:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar estudiante'
    });
  }
};

/**
 * Obtener estudiantes de un padre con información enriquecida
 * Incluye: promedios, asistencia, pagos pendientes, tutor, comportamiento, horario
 * @param {string} req.params.padreId - ID del padre
 * @param {string} req.query.academic_year - Año académico opcional (ej: 2024)
 * @param {boolean} req.query.enriched - Si es true, usa datos enriquecidos (default: true)
 */
const getByParent = async (req, res) => {
  try {
    const { padreId } = req.params;
    const { academic_year, enriched = 'true' } = req.query;

    // Parsear año académico si viene como string
    const academicYear = academic_year ? parseInt(academic_year, 10) : null;

    console.log('[getByParent] padreId:', padreId, 'academicYear:', academicYear, 'enriched:', enriched);

    let students;

    // Por defecto usar la versión enriquecida, salvo que explícitamente se solicite la básica
    if (enriched === 'false') {
      // Versión básica (retrocompatibilidad)
      students = await getStudentsByParent(padreId);
    } else {
      // Versión enriquecida con todos los datos adicionales
      students = await getStudentsByParentEnriched(padreId, academicYear);
    }

    console.log('[getByParent] Estudiantes encontrados:', students.length);
    if (students.length > 0) {
      console.log('[getByParent] Primer estudiante - promedio_general:', students[0].promedio_general, 'materias:', students[0].materias_json);
    }

    res.json({
      success: true,
      data: students,
      total: students.length
    });
  } catch (error) {
    console.error('Error al obtener estudiantes del padre:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estudiantes del padre'
    });
  }
};

module.exports = {
  getAll,
  getById,
  getByDni,
  getByCodigo,
  create,
  update,
  remove,
  getByParent
};
