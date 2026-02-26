const pool = require('../config/db');

const getAllCompetencyGrades = async (filters = {}) => {
  // 🆕 ACTUALIZADO: Ahora soporta tanto course_competency_id como category_id + subcategory_id
  let query = `
    SELECT cg.*,
           s.first_names AS student_first_names, s.last_names AS student_last_names, s.grade_id,
           c.name AS course_name,
           comp.name AS competency_name, comp.code AS competency_code,
           t.first_name AS teacher_first_names, t.last_names AS teacher_last_names
    FROM competency_grades cg
    INNER JOIN students s ON cg.student_id = s.id
    INNER JOIN courses c ON cg.course_id = c.id
    LEFT JOIN course_competencies cc ON cg.course_competency_id = cc.id
    LEFT JOIN competencies comp ON cc.competency_id = comp.id
    LEFT JOIN users t ON cg.teacher_id = t.id
    WHERE cg.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.student_id) {
    query += ` AND cg.student_id = $${paramCount}`;
    params.push(filters.student_id);
    paramCount++;
  }

  if (filters.course_id) {
    query += ` AND cg.course_id = $${paramCount}`;
    params.push(filters.course_id);
    paramCount++;
  }

  if (filters.competency_id) {
    query += ` AND cc.competency_id = $${paramCount}`;
    params.push(filters.competency_id);
    paramCount++;
  }

  if (filters.quarter) {
    query += ` AND cg.quarter = $${paramCount}`;
    params.push(filters.quarter);
    paramCount++;
  }

  if (filters.teacher_id) {
    query += ` AND cg.teacher_id = $${paramCount}`;
    params.push(filters.teacher_id);
    paramCount++;
  }

  query += ' ORDER BY cg.registration_date DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getCompetencyGradeById = async (id) => {
  // 🆕 ACTUALIZADO: LEFT JOIN para soportar el nuevo sistema
  const query = `
    SELECT cg.*,
           s.first_names AS student_first_names, s.last_names AS student_last_names,
           c.name AS course_name,
           comp.name AS competency_name
    FROM competency_grades cg
    INNER JOIN students s ON cg.student_id = s.id
    INNER JOIN courses c ON cg.course_id = c.id
    LEFT JOIN course_competencies cc ON cg.course_competency_id = cc.id
    LEFT JOIN competencies comp ON cc.competency_id = comp.id
    WHERE cg.id = $1 AND cg.status = 'active'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const getGradesByStudent = async (studentId, quarter = null) => {
  // 🆕 ACTUALIZADO: LEFT JOIN y incluir category_id, subcategory_id en el SELECT
  let query = `
    SELECT cg.*,
           c.name AS course_name,
           comp.name AS competency_name,
           comp.code AS competency_code
    FROM competency_grades cg
    INNER JOIN courses c ON cg.course_id = c.id
    LEFT JOIN course_competencies cc ON cg.course_competency_id = cc.id
    LEFT JOIN competencies comp ON cc.competency_id = comp.id
    WHERE cg.student_id = $1 AND cg.status = 'active'
  `;
  const params = [studentId];

  if (quarter) {
    query += ' AND cg.quarter = $2';
    params.push(quarter);
  }

  query += ' ORDER BY c.name, COALESCE(comp."order", 0), cg.category_id, cg.subcategory_id';
  const result = await pool.query(query, params);
  return result.rows;
};

const createCompetencyGrade = async (data, userId) => {
  const {
    student_id, course_id, course_competency_id, category_id, subcategory_id,
    quarter, value, grading_system, observation, teacher_id, registration_date
  } = data;

  // 🆕 Soportar ambos sistemas: course_competency_id (legacy) o category_id + subcategory_id (nuevo)
  const result = await pool.query(
    `INSERT INTO competency_grades (
      student_id, course_id, course_competency_id, category_id, subcategory_id,
      teacher_id, quarter, value, grading_system, observation,
      registration_date, last_modification, user_id_registration, date_time_registration
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, $12, CURRENT_TIMESTAMP)
     RETURNING *`,
    [
      student_id,
      course_id,
      course_competency_id || null,  // Puede ser null si se usa category_id
      category_id || null,           // 🆕 Nuevo campo
      subcategory_id || null,        // 🆕 Nuevo campo
      teacher_id || userId,
      quarter,
      value,
      grading_system || 'literal',
      observation,
      registration_date || new Date(),
      userId
    ]
  );
  return result.rows[0];
};

const updateCompetencyGrade = async (id, data, userId) => {
  const { value, observation } = data;
  const result = await pool.query(
    `UPDATE competency_grades SET value = $1, observation = $2,
     user_id_modification = $3, date_time_modification = CURRENT_TIMESTAMP, last_modification = CURRENT_TIMESTAMP
     WHERE id = $4 RETURNING *`,
    [value, observation, userId, id]
  );
  return result.rows[0];
};

const deleteCompetencyGrade = async (id, userId) => {
  await pool.query(
    'UPDATE competency_grades SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactive', userId, id]
  );
  return true;
};

/**
 * 🆕 ACTUALIZADO: Obtiene calificaciones en formato grid para el módulo de registro de notas
 * Ahora soporta tanto course_competency_id como category_id + subcategory_id
 *
 * @param {Object} filters - course_id, grade_id, section_id, quarter
 * @returns {Object} { students: [...], competencies: [...], structure: {...} }
 */
const getGradesForGrid = async (filters) => {
  const { course_id, grade_id, section_id, quarter } = filters;

  // 1. Obtener estudiantes de la sección
  const studentsQuery = `
    SELECT s.id, s.code, s.dni, s.first_names, s.last_names
    FROM students s
    WHERE s.grade_id = $1
      AND s.section_id = $2
      AND s.status = 'active'
    ORDER BY s.last_names, s.first_names
  `;
  const studentsResult = await pool.query(studentsQuery, [grade_id, section_id]);
  const students = studentsResult.rows;

  // 2. Obtener estructura de evaluación (PRIORIDAD: se usa primero si existe)
  const structureQuery = `
    SELECT es.id, es.categories, es.competencies, es.grading_system
    FROM evaluation_structures es
    WHERE es.course_id = $1
      AND es.grade_id = $2
      AND es.quarter = $3
      AND es.status = 'active'
    LIMIT 1
  `;
  const structureResult = await pool.query(structureQuery, [course_id, grade_id, quarter]);
  const structure = structureResult.rows[0] || null;

  // 3. Obtener competencias del curso (FALLBACK: si no hay estructura)
  const competenciesQuery = `
    SELECT cc.id as course_competency_id, cc.name, cc.description, cc.order,
           comp.code as competency_code
    FROM course_competencies cc
    INNER JOIN competencies comp ON cc.competency_id = comp.id
    WHERE cc.course_id = $1
      AND cc.status = 'active'
    ORDER BY cc.order
  `;
  const competenciesResult = await pool.query(competenciesQuery, [course_id]);
  const competencies = competenciesResult.rows;

  // 4. 🆕 Obtener calificaciones existentes (ahora incluye category_id y subcategory_id)
  const gradesQuery = `
    SELECT cg.id, cg.student_id, cg.course_competency_id,
           cg.category_id, cg.subcategory_id,
           cg.value, cg.observation, cg.grading_system
    FROM competency_grades cg
    WHERE cg.course_id = $1
      AND cg.quarter = $2
      AND cg.status = 'active'
  `;
  const gradesResult = await pool.query(gradesQuery, [course_id, quarter]);
  const grades = gradesResult.rows;

  // 5. Organizar datos en formato grid
  const studentsWithGrades = students.map(student => {
    const studentGrades = {};

    if (structure && structure.competencies) {
      // 🆕 Sistema nuevo: usar category_id + subcategory_id de evaluation_structures
      structure.competencies.forEach(comp => {
        if (comp.subcategorias && comp.subcategorias.length > 0) {
          comp.subcategorias.forEach(sub => {
            const grade = grades.find(
              g => g.student_id === student.id &&
                   g.category_id === comp.id &&
                   g.subcategory_id === sub.id
            );

            studentGrades[sub.id] = {
              grade_id: grade?.id || null,
              value: grade?.value || null,
              observation: grade?.observation || null,
              category_id: comp.id,
              subcategory_id: sub.id
            };
          });
        }
      });
    } else {
      // Sistema legacy: usar course_competency_id
      competencies.forEach(comp => {
        const grade = grades.find(
          g => g.student_id === student.id && g.course_competency_id === comp.course_competency_id
        );

        studentGrades[comp.course_competency_id] = {
          grade_id: grade?.id || null,
          value: grade?.value || null,
          observation: grade?.observation || null,
          course_competency_id: comp.course_competency_id
        };
      });
    }

    return {
      ...student,
      grades: studentGrades
    };
  });

  return {
    students: studentsWithGrades,
    competencies,
    structure
  };
};

/**
 * Obtiene los datos de boleta para un estudiante en un bimestre específico
 * Incluye todas las notas agrupadas por curso con sus comentarios
 *
 * @param {number} studentId - ID del estudiante
 * @param {number} quarter - Número del bimestre (1-4)
 * @returns {Object} Datos de la boleta organizados por curso
 */
const getReportCardData = async (studentId, quarter) => {
  // 1. Obtener datos del estudiante incluyendo grade_id
  const studentQuery = `
    SELECT s.id, s.code, s.dni, s.first_names, s.last_names,
           s.grade_id,
           g.name as grade_name, sec.name as section_name,
           l.name as level_name
    FROM students s
    LEFT JOIN grades g ON s.grade_id = g.id
    LEFT JOIN sections sec ON s.section_id = sec.id
    LEFT JOIN levels l ON g.level_id = l.id
    WHERE s.id = $1 AND s.status IN ('active', 'enrolled')
  `;
  const studentResult = await pool.query(studentQuery, [studentId]);
  const student = studentResult.rows[0];

  if (!student) {
    return null;
  }

  // 2. Obtener todas las notas del estudiante para el bimestre (query simple que funciona)
  const gradesQuery = `
    SELECT cg.id, cg.course_id, cg.category_id, cg.subcategory_id,
           cg.value, cg.observation, cg.grading_system,
           c.name as course_name, c.code as course_code
    FROM competency_grades cg
    INNER JOIN courses c ON cg.course_id = c.id
    WHERE cg.student_id = $1
      AND cg.quarter = $2
      AND cg.status = 'active'
    ORDER BY c.name, cg.category_id, cg.subcategory_id
  `;
  const gradesResult = await pool.query(gradesQuery, [studentId, quarter]);

  // 3. Obtener IDs de cursos únicos para buscar sus estructuras de evaluación
  const uniqueCourseIds = [...new Set(gradesResult.rows.map(g => g.course_id))];

  // 4. Obtener estructuras de evaluación para cada curso (separadamente)
  const evaluationStructuresMap = {};
  if (student.grade_id && uniqueCourseIds.length > 0) {
    const structuresQuery = `
      SELECT course_id, competencies
      FROM evaluation_structures
      WHERE course_id = ANY($1)
        AND grade_id = $2
        AND quarter = $3
        AND status = 'active'
    `;
    try {
      const structuresResult = await pool.query(structuresQuery, [uniqueCourseIds, student.grade_id, quarter]);
      structuresResult.rows.forEach(row => {
        evaluationStructuresMap[row.course_id] = row.competencies;
      });
    } catch (e) {
      // Si falla, continuar sin estructuras
    }
  }

  // 5. Función auxiliar para obtener nombre de categoría/subcategoría
  const getNames = (courseId, categoryId, subcategoryId) => {
    let categoryName = categoryId || 'Sin categoría';
    let subcategoryName = subcategoryId || 'Sin subcategoría';

    const structure = evaluationStructuresMap[courseId];
    if (structure) {
      let competencies;

      // Parsear JSON si es string
      if (typeof structure === 'string') {
        try {
          competencies = JSON.parse(structure);
        } catch (e) {
          competencies = null;
        }
      } else {
        competencies = structure;
      }

      // Soportar ambos formatos: {competencias: [...]} y array directo [...]
      if (competencies) {
        const competenciesArray = competencies.competencias || competencies;

        if (Array.isArray(competenciesArray)) {
          for (const comp of competenciesArray) {
            // Comparación case-insensitive
            const compId = (comp.id || '').toLowerCase();
            const catId = (categoryId || '').toLowerCase();

            if (compId === catId) {
              categoryName = comp.nombreCompetencia || comp.name || categoryName;

              if (comp.subcategorias && Array.isArray(comp.subcategorias)) {
                const sub = comp.subcategorias.find(s => {
                  const subId = (s.id || '').toLowerCase();
                  const subcatId = (subcategoryId || '').toLowerCase();
                  return subId === subcatId;
                });

                if (sub) {
                  subcategoryName = sub.name || sub.nombre || subcategoryName;
                }
              }
              break;
            }
          }
        }
      }
    }

    // Fallback: si aún tenemos IDs crudos, hacerlos más legibles
    if (categoryName.startsWith('COMP_') || (categoryName.includes('_') && !categoryName.includes(' '))) {
      categoryName = categoryName.replace(/^COMP_/i, '').replace(/_/g, ' ');
      categoryName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1).toLowerCase();
    }
    if (subcategoryName.includes('_') && !subcategoryName.includes(' ')) {
      const parts = subcategoryName.split('_');
      subcategoryName = parts[parts.length - 1];
      subcategoryName = subcategoryName.charAt(0).toUpperCase() + subcategoryName.slice(1).toLowerCase();
    }

    return { categoryName, subcategoryName };
  };

  // 6. Organizar las notas por curso
  const courseGrades = {};

  for (const grade of gradesResult.rows) {
    const courseId = grade.course_id;

    if (!courseGrades[courseId]) {
      courseGrades[courseId] = {
        course_id: courseId,
        course_name: grade.course_name,
        course_code: grade.course_code,
        grading_system: grade.grading_system,
        categories: [],
        grades: []
      };
    }

    const { categoryName, subcategoryName } = getNames(courseId, grade.category_id, grade.subcategory_id);

    courseGrades[courseId].grades.push({
      id: grade.id,
      category_id: grade.category_id,
      category_name: categoryName,
      subcategory_id: grade.subcategory_id,
      subcategory_name: subcategoryName,
      value: grade.value,
      observation: grade.observation,
      grading_system: grade.grading_system
    });
  }

  // 7. Calcular promedios por curso
  for (const courseId in courseGrades) {
    const course = courseGrades[courseId];
    const validGrades = course.grades.filter(g => g.value && g.value !== '');

    if (validGrades.length > 0) {
      if (course.grading_system === 'vigesimal' || course.grading_system === 'secundaria') {
        const numericGrades = validGrades.map(g => parseFloat(g.value)).filter(v => !isNaN(v));
        course.average = numericGrades.length > 0
          ? (numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length).toFixed(1)
          : null;
      } else {
        // Sistema literal - calcular moda o promedio ponderado
        const letterCounts = {};
        validGrades.forEach(g => {
          const letter = g.value?.toUpperCase();
          if (letter) {
            letterCounts[letter] = (letterCounts[letter] || 0) + 1;
          }
        });
        course.average = Object.keys(letterCounts).reduce((a, b) =>
          letterCounts[a] > letterCounts[b] ? a : b, ''
        ) || null;
      }
    } else {
      course.average = null;
    }
  }

  return {
    student: {
      id: student.id,
      code: student.code,
      dni: student.dni,
      full_name: `${student.last_names}, ${student.first_names}`,
      first_names: student.first_names,
      last_names: student.last_names,
      grade: student.grade_name,
      section: student.section_name,
      level: student.level_name
    },
    quarter: quarter,
    courses: Object.values(courseGrades)
  };
};

module.exports = {
  getAllCompetencyGrades,
  getCompetencyGradeById,
  getGradesByStudent,
  getGradesForGrid,
  getReportCardData,
  createCompetencyGrade,
  updateCompetencyGrade,
  deleteCompetencyGrade
};
