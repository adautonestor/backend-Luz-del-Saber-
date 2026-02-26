const { getAllCourses, getCourseById, createCourse, updateCourse, deleteCourse } = require('../models/coursesModel');

const getAll = async (req, res) => {
  try {
    const filters = {
      grade_id: req.query.grade_id,
      level_id: req.query.level_id,
      status: req.query.status,
      academic_year_id: req.query.academic_year_id || req.query.año_lectivo_id
    };
    const courses = await getAllCourses(filters);
    res.json({ success: true, data: courses, total: courses.length });
  } catch (error) {
    console.error('Error al obtener cursos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener cursos' });
  }
};

const getById = async (req, res) => {
  try {
    const course = await getCourseById(req.params.id);
    if (!course) return res.status(404).json({ success: false, error: 'Curso no encontrado' });
    res.json({ success: true, data: course });
  } catch (error) {
    console.error('Error al obtener curso:', error);
    res.status(500).json({ success: false, error: 'Error al obtener curso' });
  }
};

const create = async (req, res) => {
  try {
    const { name, level_id } = req.body;
    // area puede ser un ID (número) o un string (nombre del área)
    let area = req.body.area;
    let academic_area_id = req.body.academic_area_id;

    console.log('📥 [coursesController.create] Datos recibidos:', req.body);

    // Si area es un número, es el ID del área académica
    if (typeof area === 'number' || (typeof area === 'string' && !isNaN(parseInt(area)) && area.length <= 3)) {
      academic_area_id = parseInt(area);
      // Obtener el nombre del área desde la BD
      const { getAcademicAreaById } = require('../models/academicAreasModel');
      const areaData = await getAcademicAreaById(academic_area_id);
      area = areaData?.name || 'Área';
    }

    if (!name || !level_id || (!area && !academic_area_id)) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos (nombre, nivel y área)' });
    }

    // Generar código automáticamente si no se proporciona
    let code = req.body.code;
    if (!code || code.trim() === '') {
      // Mapeo de áreas a abreviaturas (3-4 letras)
      const areaAbbreviations = {
        'comunicación': 'COM',
        'matemática': 'MAT',
        'matemáticas': 'MAT',
        'ciencia y tecnología': 'CYT',
        'ciencias': 'CYT',
        'personal social': 'PSO',
        'ciencias sociales': 'PSO',
        'educación física': 'EFI',
        'arte y cultura': 'ART',
        'arte': 'ART',
        'inglés': 'ING',
        'ingles': 'ING',
        'educación religiosa': 'REL',
        'religión': 'REL'
      };

      // Obtener abreviatura del área
      const normalizedArea = (area || '').toLowerCase().trim();
      const areaCode = areaAbbreviations[normalizedArea] ||
                       (area ? area.substring(0, 3).toUpperCase() : 'ARE');

      // Obtener el nivel para generar el código completo
      const { getAllLevels } = require('../models/levelsModel');
      const levels = await getAllLevels();
      const level = levels.find(l => l.id === parseInt(level_id));

      // Generar código del nivel (primeras 3 letras)
      const levelCode = level?.code ||
                       level?.name?.substring(0, 3).toUpperCase() ||
                       'LVL';

      // Código final: AREA-NIVEL (ej: COM-PRI, MAT-SEC)
      code = `${areaCode}-${levelCode}`;
    }

    // Preparar datos del curso
    const courseData = {
      name: req.body.name,
      code,
      level_id: req.body.level_id,
      academic_area_id: academic_area_id || req.body.academic_area_id,
      area: area,
      type: req.body.type || 'required',
      description: req.body.description,
      objectives: req.body.objectives,
      methodology: req.body.methodology,
      resources: req.body.resources,
      evaluation: req.body.evaluation,
      status: req.body.status || 'active',
      academic_year_id: req.body.academic_year_id // ✅ Incluir academic_year_id
    };

    console.log('========== BACKEND - CREAR CURSO ==========');
    console.log('📥 [coursesController.create] req.body.academic_year_id:', req.body.academic_year_id);
    console.log('✅ [coursesController.create] courseData:', JSON.stringify(courseData, null, 2));

    const newCourse = await createCourse(courseData, req.user?.id || 1);
    res.status(201).json({ success: true, message: 'Curso creado exitosamente', data: newCourse });
  } catch (error) {
    console.error('Error al crear curso:', error);
    res.status(500).json({ success: false, error: 'Error al crear curso' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await getCourseById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Curso no encontrado' });

    // area puede ser un ID (número) o un string (nombre del área)
    let area = req.body.area;
    let academic_area_id = req.body.academic_area_id;

    // Si area es un número, es el ID del área académica
    if (area !== undefined && (typeof area === 'number' || (typeof area === 'string' && !isNaN(parseInt(area)) && area.length <= 3))) {
      academic_area_id = parseInt(area);
      // Obtener el nombre del área desde la BD
      const { getAcademicAreaById } = require('../models/academicAreasModel');
      const areaData = await getAcademicAreaById(academic_area_id);
      area = areaData?.name || existing.area;
    }

    // Preservar valores existentes si no se envían nuevos valores
    const dataToUpdate = {
      name: req.body.name !== undefined ? req.body.name : existing.name,
      code: req.body.code !== undefined ? req.body.code : existing.code,
      level_id: req.body.level_id !== undefined ? req.body.level_id : existing.level_id,
      academic_area_id: academic_area_id !== undefined ? academic_area_id : (req.body.academic_area_id !== undefined ? req.body.academic_area_id : existing.academic_area_id),
      area: area !== undefined ? area : existing.area,
      type: req.body.type !== undefined ? req.body.type : existing.type,
      description: req.body.description !== undefined ? req.body.description : existing.description,
      objectives: req.body.objectives !== undefined ? req.body.objectives : existing.objectives,
      methodology: req.body.methodology !== undefined ? req.body.methodology : existing.methodology,
      resources: req.body.resources !== undefined ? req.body.resources : existing.resources,
      evaluation: req.body.evaluation !== undefined ? req.body.evaluation : existing.evaluation,
      status: req.body.status !== undefined ? req.body.status : existing.status,
      academic_year_id: req.body.academic_year_id !== undefined ? req.body.academic_year_id : existing.academic_year_id
    };

    const updated = await updateCourse(req.params.id, dataToUpdate, req.user?.id || 1);
    res.json({ success: true, message: 'Curso actualizado exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar curso:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar curso' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await getCourseById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Curso no encontrado' });
    await deleteCourse(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Curso eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar curso:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar curso' });
  }
};

module.exports = { getAll, getById, create, update, remove };
