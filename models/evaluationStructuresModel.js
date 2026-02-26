const pool = require('../config/db');

/**
 * IMPORTANTE: Sistema de Evaluación por Competencias
 *
 * Cada competencia funciona de manera INDEPENDIENTE:
 * - No se mezclan notas entre competencias diferentes
 * - Cada competencia tiene su propia calificación (0-20 o AD/A/B/C)
 * - El "peso" dentro de una competencia es solo para distribuir las subcategorías/criterios de ESA competencia
 * - La nota final de una competencia es el promedio ponderado de sus subcategorías
 * - En la boleta se muestran todas las competencias por separado
 *
 * Ejemplo:
 * - Competencia 1: "Resuelve problemas de cantidad" -> Nota: 18
 *   - Subcategoría 1.1: Tareas (peso 30%) -> 16
 *   - Subcategoría 1.2: Examen (peso 70%) -> 19
 *   - Nota final competencia 1: (16*0.3 + 19*0.7) = 18
 *
 * - Competencia 2: "Comunica su comprensión" -> Nota: 15
 *   - Subcategoría 2.1: Exposición (peso 50%) -> 14
 *   - Subcategoría 2.2: Informe (peso 50%) -> 16
 *   - Nota final competencia 2: (14*0.5 + 16*0.5) = 15
 *
 * En la boleta se muestra:
 * - Competencia 1: 18
 * - Competencia 2: 15
 * (No se promedian entre sí)
 */

const getAllEvaluationStructures = async (filters = {}) => {
  let query = `
    SELECT es.*, c.name AS course_name, g.name AS grade_name,
           ay.year AS academic_year, u.first_name AS user_name
    FROM evaluation_structures es
    LEFT JOIN courses c ON es.course_id = c.id
    LEFT JOIN grades g ON es.grade_id = g.id
    LEFT JOIN academic_years ay ON es.academic_year_id = ay.id
    LEFT JOIN users u ON es.user_id_registration = u.id
    WHERE es.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.course_id) {
    query += ` AND es.course_id = $${paramCount}`;
    params.push(filters.course_id);
    paramCount++;
  }

  if (filters.grade_id) {
    query += ` AND es.grade_id = $${paramCount}`;
    params.push(filters.grade_id);
    paramCount++;
  }

  if (filters.academic_year_id) {
    query += ` AND es.academic_year_id = $${paramCount}`;
    params.push(filters.academic_year_id);
    paramCount++;
  }

  if (filters.quarter) {
    query += ` AND es.quarter = $${paramCount}`;
    params.push(filters.quarter);
    paramCount++;
  }

  query += ' ORDER BY es.date_time_registration DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getEvaluationStructureById = async (id) => {
  const query = `
    SELECT es.*, c.name AS course_name, g.name AS grade_name,
           ay.year AS academic_year
    FROM evaluation_structures es
    LEFT JOIN courses c ON es.course_id = c.id
    LEFT JOIN grades g ON es.grade_id = g.id
    LEFT JOIN academic_years ay ON es.academic_year_id = ay.id
    WHERE es.id = $1 AND es.status = 'active'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const getStructuresByCourse = async (courseId, gradeId = null, academicYearId = null) => {
  let query = `
    SELECT es.*, g.name AS grade_name, ay.year AS academic_year
    FROM evaluation_structures es
    LEFT JOIN grades g ON es.grade_id = g.id
    LEFT JOIN academic_years ay ON es.academic_year_id = ay.id
    WHERE es.course_id = $1 AND es.status = 'active'
  `;
  const params = [courseId];
  let paramCount = 2;

  if (gradeId) {
    query += ` AND es.grade_id = $${paramCount}`;
    params.push(gradeId);
    paramCount++;
  }

  if (academicYearId) {
    query += ` AND es.academic_year_id = $${paramCount}`;
    params.push(academicYearId);
  }

  query += ' ORDER BY es.quarter';
  const result = await pool.query(query, params);
  return result.rows;
};

const createEvaluationStructure = async (data, userId) => {
  const { course_id, grade_id, academic_year_id, quarter, structure_json, teacher_id, grading_system, academic_year } = data;
  const result = await pool.query(
    `INSERT INTO evaluation_structures (
      course_id, grade_id, academic_year_id, quarter,
      competencies, grading_system, academic_year,
      teacher_id, user_id_registration, date_time_registration, status
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, 'active')
     RETURNING *`,
    [
      course_id,
      grade_id,
      academic_year_id,
      quarter,
      structure_json,
      grading_system || 'literal',
      academic_year || new Date().getFullYear(),
      teacher_id || null,
      userId
    ]
  );
  return result.rows[0];
};

const updateEvaluationStructure = async (id, data, userId) => {
  const { structure_json, grading_system } = data;
  const result = await pool.query(
    `UPDATE evaluation_structures
     SET competencies = $1,
         grading_system = COALESCE($2, grading_system),
         user_id_modification = $3,
         date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $4 AND status = 'active'
     RETURNING *`,
    [structure_json, grading_system, userId, id]
  );
  return result.rows[0];
};

const deleteEvaluationStructure = async (id, userId) => {
  await pool.query(
    'UPDATE evaluation_structures SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactive', userId, id]
  );
  return true;
};

/**
 * Obtener estructura de evaluación por curso, grado, bimestre y año académico
 * @param {number} courseId - ID del curso
 * @param {number} gradeId - ID del grado
 * @param {number} quarter - Número de bimestre (1-4)
 * @param {number} academicYearId - ID del año académico (opcional)
 * @returns {Promise<Object|null>} Estructura encontrada o null
 */
const getStructureByCourseGradeQuarter = async (courseId, gradeId, quarter, academicYearId = null) => {
  let query = `
    SELECT * FROM evaluation_structures
    WHERE course_id = $1
      AND grade_id = $2
      AND quarter = $3
      AND status = 'active'
  `;
  const params = [courseId, gradeId, quarter];

  if (academicYearId) {
    query += ' AND academic_year_id = $4';
    params.push(academicYearId);
  }

  query += ' ORDER BY id DESC LIMIT 1';

  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

/**
 * Crear estructura de evaluación por defecto
 * @param {number} courseId - ID del curso
 * @param {number} gradeId - ID del grado
 * @param {number} quarter - Número de bimestre (1-4)
 * @param {number} academicYearId - ID del año académico
 * @param {number} userId - ID del usuario que crea
 * @returns {Promise<Object>} Estructura creada
 */
const createDefaultStructure = async (courseId, gradeId, quarter, academicYearId, userId) => {
  // Obtener el año académico si no se proporciona
  let finalAcademicYearId = academicYearId;
  let academicYear = new Date().getFullYear();

  if (!academicYearId) {
    const yearResult = await pool.query(
      `SELECT id, year FROM academic_years WHERE status = 'active' ORDER BY id DESC LIMIT 1`
    );

    if (yearResult.rows.length > 0) {
      finalAcademicYearId = yearResult.rows[0].id;
      academicYear = yearResult.rows[0].year;
    }
  } else {
    const yearResult = await pool.query(
      `SELECT year FROM academic_years WHERE id = $1`,
      [academicYearId]
    );
    if (yearResult.rows.length > 0) {
      academicYear = yearResult.rows[0].year;
    }
  }

  // Estructura por defecto basada en categorías
  const defaultCategories = {
    tareas: {
      peso: 30,
      subcategorias: ['Tarea Individual', 'Tarea Grupal']
    },
    evaluaciones: {
      peso: 40,
      subcategorias: ['Práctica Calificada', 'Examen']
    },
    participacion: {
      peso: 20,
      subcategorias: ['Participación en Clase']
    },
    actitud: {
      peso: 10,
      subcategorias: ['Comportamiento']
    }
  };

  const result = await pool.query(
    `INSERT INTO evaluation_structures (
      course_id, grade_id, academic_year_id, quarter,
      categories, grading_system, academic_year,
      teacher_id, user_id_registration, date_time_registration, status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, 'active')
    RETURNING *`,
    [
      courseId,
      gradeId,
      finalAcademicYearId,
      quarter,
      JSON.stringify(defaultCategories),
      'literal',
      academicYear,
      null, // teacher_id
      userId
    ]
  );

  console.log(`✅ Estructura por defecto creada: Curso ${courseId}, Grado ${gradeId}, Bimestre ${quarter}`);
  return result.rows[0];
};

/**
 * Agregar columna personalizada con auto-creación de estructura si no existe
 * @param {number} courseId - ID del curso
 * @param {number} gradeId - ID del grado
 * @param {number} quarter - Número de bimestre (1-4)
 * @param {number} academicYearId - ID del año académico (opcional)
 * @param {string} parentId - ID de la competencia/categoría padre
 * @param {object} columnData - Datos de la columna (name, weight)
 * @param {number} userId - ID del usuario que realiza la acción
 * @returns {Promise<Object>} Estructura actualizada
 */
const addCustomColumnAutoCreate = async (courseId, gradeId, quarter, academicYearId, parentId, columnData, userId) => {
  // 1. Buscar o crear estructura
  let structure = await getStructureByCourseGradeQuarter(courseId, gradeId, quarter, academicYearId);

  if (!structure) {
    console.log('⚠️  Estructura no existe, creando automáticamente...');
    structure = await createDefaultStructure(courseId, gradeId, quarter, academicYearId, userId);
  }

  // 2. Agregar columna a la estructura existente/nueva
  return await addCustomColumn(structure.id, parentId, columnData, userId);
};

/**
 * Agregar columna personalizada a una competencia/categoría
 * @param {number} structureId - ID de la estructura de evaluación
 * @param {string} parentId - ID de la competencia/categoría padre
 * @param {object} columnData - Datos de la columna (name, weight)
 * @param {number} userId - ID del usuario que realiza la acción
 */
const addCustomColumn = async (structureId, parentId, columnData, userId) => {
  console.log('🔧 addCustomColumn llamado con:', {
    structureId,
    parentId,
    columnData,
    userId
  });

  // Obtener la estructura actual
  const structureResult = await pool.query(
    'SELECT competencies, categories FROM evaluation_structures WHERE id = $1 AND status = \'active\'',
    [structureId]
  );

  if (structureResult.rows.length === 0) {
    throw new Error('Estructura de evaluación no encontrada');
  }

  const structure = structureResult.rows[0];
  console.log('📊 Estructura encontrada:', {
    id: structureId,
    hasCompetencies: !!structure.competencies,
    hasCategories: !!structure.categories
  });

  // Determinar si usar competencies o categories
  let dataField = structure.competencies || structure.categories;

  if (!dataField) {
    throw new Error('No hay estructura de evaluación configurada');
  }

  console.log('📋 Campo de datos:', {
    isArray: Array.isArray(dataField),
    isObject: typeof dataField === 'object',
    length: Array.isArray(dataField) ? dataField.length : Object.keys(dataField).length
  });

  // ✅ CORREGIDO: Si dataField tiene una propiedad 'competencias', extraerla
  if (dataField.competencias && Array.isArray(dataField.competencias)) {
    console.log('📦 Extrayendo array de competencias del objeto wrapper');
    dataField = dataField.competencias;
  }

  // Buscar la competencia/categoría padre
  let updated = false;

  if (Array.isArray(dataField)) {
    // Formato de competencias (array)
    console.log('📌 Procesando competencias como array...');
    dataField = dataField.map(comp => {
      const competenceId = comp.id || `COMP_${comp.nombreCompetencia?.replace(/\s+/g, '_').toUpperCase()}`;
      console.log(`   Competencia: ${comp.nombreCompetencia} → ID: ${competenceId} (buscando: ${parentId})`);

      if (competenceId === parentId) {
        console.log('   ✅ COINCIDENCIA ENCONTRADA - Validando porcentajes');

        // Asegurar que existe el array de subcategorías
        if (!comp.subcategorias) {
          comp.subcategorias = [];
        }

        // Validar que la suma de porcentajes no supere 100%
        const currentTotalWeight = comp.subcategorias.reduce((sum, sub) => sum + (sub.peso || 0), 0);
        const newTotalWeight = currentTotalWeight + columnData.weight;

        console.log(`   📊 Peso actual: ${currentTotalWeight}%, nuevo peso: ${columnData.weight}%, total: ${newTotalWeight}%`);

        if (newTotalWeight > 100) {
          throw new Error(`La suma de porcentajes no puede superar 100%. Actualmente tienes ${currentTotalWeight}% asignado. Si agregas ${columnData.weight}% llegarías a ${newTotalWeight}%. Puedes agregar como máximo ${100 - currentTotalWeight}%.`);
        }

        // Agregar la subcategoría personalizada
        comp.subcategorias.push({
          id: columnData.id,
          name: columnData.name,
          peso: columnData.weight,
          isCustom: true
        });

        updated = true;
      }

      return comp;
    });

    // ✅ CORREGIDO: Volver a empaquetar en el objeto wrapper si era necesario
    if (structure.competencies && structure.competencies.competencias) {
      dataField = { competencias: dataField };
    }
  } else if (typeof dataField === 'object') {
    // Formato de categories (objeto) o competencias mal formateadas
    console.log('📌 Procesando como objeto...');

    // Intentar buscar en las claves del objeto
    for (const key in dataField) {
      const item = dataField[key];
      const competenceId = item.id || `COMP_${item.nombreCompetencia?.replace(/\s+/g, '_').toUpperCase()}`;
      console.log(`   Item [${key}]: ${item.nombreCompetencia || key} → ID: ${competenceId} (buscando: ${parentId})`);

      if (competenceId === parentId || key === parentId.toLowerCase()) {
        console.log('   ✅ COINCIDENCIA ENCONTRADA - Validando porcentajes');

        if (!item.subcategorias) {
          item.subcategorias = [];
        }

        if (!Array.isArray(item.subcategorias)) {
          item.subcategorias = [];
        }

        // Validar que la suma de porcentajes no supere 100%
        const currentTotalWeight = item.subcategorias.reduce((sum, sub) => sum + (sub.peso || 0), 0);
        const newTotalWeight = currentTotalWeight + columnData.weight;

        console.log(`   📊 Peso actual: ${currentTotalWeight}%, nuevo peso: ${columnData.weight}%, total: ${newTotalWeight}%`);

        if (newTotalWeight > 100) {
          throw new Error(`La suma de porcentajes no puede superar 100%. Actualmente tienes ${currentTotalWeight}% asignado. Si agregas ${columnData.weight}% llegarías a ${newTotalWeight}%. Puedes agregar como máximo ${100 - currentTotalWeight}%.`);
        }

        item.subcategorias.push({
          id: columnData.id,
          name: columnData.name,
          peso: columnData.weight,
          isCustom: true
        });

        updated = true;
        break;
      }
    }
  }

  if (!updated) {
    throw new Error(`No se encontró la competencia/categoría padre: ${parentId}`);
  }

  // Actualizar la estructura
  const fieldToUpdate = structure.competencies ? 'competencies' : 'categories';
  const result = await pool.query(
    `UPDATE evaluation_structures
     SET ${fieldToUpdate} = $1,
         user_id_modification = $2,
         date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $3 AND status = 'active'
     RETURNING *`,
    [JSON.stringify(dataField), userId, structureId]
  );

  return result.rows[0];
};

/**
 * Eliminar columna personalizada de una competencia/categoría
 * @param {number} structureId - ID de la estructura de evaluación
 * @param {string} columnId - ID de la columna a eliminar
 * @param {number} userId - ID del usuario que realiza la acción
 */
const removeCustomColumn = async (structureId, columnId, userId) => {
  console.log('🗑️ removeCustomColumn llamado con:', {
    structureId,
    columnId,
    userId
  });

  // Obtener la estructura actual
  const structureResult = await pool.query(
    'SELECT competencies, categories FROM evaluation_structures WHERE id = $1 AND status = \'active\'',
    [structureId]
  );

  if (structureResult.rows.length === 0) {
    throw new Error('Estructura de evaluación no encontrada');
  }

  const structure = structureResult.rows[0];

  // Determinar si usar competencies o categories
  let dataField = structure.competencies || structure.categories;

  if (!dataField) {
    throw new Error('No hay estructura de evaluación configurada');
  }

  console.log('📋 Campo de datos:', {
    isArray: Array.isArray(dataField),
    isObject: typeof dataField === 'object',
    hasCompetencias: !!dataField.competencias
  });

  // ✅ CORREGIDO: Si dataField tiene una propiedad 'competencias', extraerla
  if (dataField.competencias && Array.isArray(dataField.competencias)) {
    console.log('📦 Extrayendo array de competencias del objeto wrapper');
    dataField = dataField.competencias;
  }

  let updated = false;

  if (Array.isArray(dataField)) {
    // Formato de competencias (array)
    console.log('📌 Procesando competencias como array...');
    dataField = dataField.map(comp => {
      if (comp.subcategorias && Array.isArray(comp.subcategorias)) {
        const originalLength = comp.subcategorias.length;
        console.log(`   Competencia: ${comp.nombreCompetencia}, subcategorías antes: ${originalLength}`);

        comp.subcategorias = comp.subcategorias.filter(sub => {
          console.log(`      Subcategoría: ${sub.id} (buscando: ${columnId})`);
          return sub.id !== columnId;
        });

        console.log(`   Subcategorías después: ${comp.subcategorias.length}`);

        if (comp.subcategorias.length < originalLength) {
          console.log('   ✅ Columna eliminada de esta competencia');
          updated = true;
        }
      }

      return comp;
    });

    // ✅ CORREGIDO: Volver a empaquetar en el objeto wrapper si era necesario
    if (structure.competencies && structure.competencies.competencias) {
      dataField = { competencias: dataField };
    }
  } else if (typeof dataField === 'object') {
    // Formato de categories (objeto)
    console.log('📌 Procesando como objeto...');
    for (const categoryKey in dataField) {
      if (dataField[categoryKey].subcategorias && Array.isArray(dataField[categoryKey].subcategorias)) {
        const originalLength = dataField[categoryKey].subcategorias.length;
        dataField[categoryKey].subcategorias = dataField[categoryKey].subcategorias.filter(
          sub => sub.id !== columnId
        );

        if (dataField[categoryKey].subcategorias.length < originalLength) {
          updated = true;
        }
      }
    }
  }

  if (!updated) {
    throw new Error(`No se encontró la columna personalizada: ${columnId}`);
  }

  // Actualizar la estructura
  const fieldToUpdate = structure.competencies ? 'competencies' : 'categories';
  const result = await pool.query(
    `UPDATE evaluation_structures
     SET ${fieldToUpdate} = $1,
         user_id_modification = $2,
         date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $3 AND status = 'active'
     RETURNING *`,
    [JSON.stringify(dataField), userId, structureId]
  );

  return result.rows[0];
};

module.exports = {
  getAllEvaluationStructures,
  getEvaluationStructureById,
  getStructuresByCourse,
  createEvaluationStructure,
  updateEvaluationStructure,
  deleteEvaluationStructure,
  getStructureByCourseGradeQuarter,
  createDefaultStructure,
  addCustomColumn,
  addCustomColumnAutoCreate,
  removeCustomColumn
};
