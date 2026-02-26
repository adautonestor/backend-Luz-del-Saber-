const pool = require('../config/db');

const getAllCourses = async (filters = {}) => {
  let query = `
    SELECT c.*,
           l.name AS level_name,
           aa.name AS area_name,
           json_agg(
             DISTINCT jsonb_build_object(
               'assignment_id', ca.id,
               'teacher_id', ca.teacher_id,
               'teacher_name', CONCAT(u.first_name, ' ', u.last_names),
               'grade_id', ca.grade_id,
               'grade_name', g.name,
               'section_id', ca.section_id,
               'section_name', s.name,
               'weekly_hours', ca.weekly_hours,
               'academic_year_id', ca.academic_year_id,
               'academic_year', ay.year
             )
           ) FILTER (WHERE ca.id IS NOT NULL) AS assignments
    FROM courses c
    LEFT JOIN levels l ON c.level_id = l.id
    LEFT JOIN academic_areas aa ON c.academic_area_id = aa.id
    LEFT JOIN course_assignments ca ON c.id = ca.course_id AND ca.status = 'active'
    LEFT JOIN users u ON ca.teacher_id = u.id
    LEFT JOIN grades g ON ca.grade_id = g.id
    LEFT JOIN sections s ON ca.section_id = s.id
    LEFT JOIN academic_years ay ON ca.academic_year_id = ay.id
    WHERE c.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.level_id) {
    query += ` AND c.level_id = $${paramCount}`;
    params.push(filters.level_id);
    paramCount++;
  }

  if (filters.status) {
    query += ` AND c.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }

  if (filters.academic_year_id) {
    // Filtrar por academic_year_id en courses O en course_assignments
    query += ` AND (c.academic_year_id = $${paramCount} OR ca.academic_year_id = $${paramCount})`;
    params.push(filters.academic_year_id);
    paramCount++;
  }

  if (filters.grade_id) {
    query += ` AND ca.grade_id = $${paramCount}`;
    params.push(filters.grade_id);
    paramCount++;
  }

  query += ' GROUP BY c.id, l.name, aa.name ORDER BY c.name';
  const result = await pool.query(query, params);
  return result.rows;
};

const getCourseById = async (id) => {
  const query = `
    SELECT c.*,
           l.name AS level_name,
           aa.name AS area_name,
           json_agg(
             DISTINCT jsonb_build_object(
               'assignment_id', ca.id,
               'teacher_id', ca.teacher_id,
               'teacher_name', CONCAT(u.first_name, ' ', u.last_names),
               'grade_id', ca.grade_id,
               'grade_name', g.name,
               'section_id', ca.section_id,
               'section_name', s.name,
               'weekly_hours', ca.weekly_hours,
               'academic_year_id', ca.academic_year_id,
               'academic_year', ay.year
             )
           ) FILTER (WHERE ca.id IS NOT NULL) AS assignments
    FROM courses c
    LEFT JOIN levels l ON c.level_id = l.id
    LEFT JOIN academic_areas aa ON c.academic_area_id = aa.id
    LEFT JOIN course_assignments ca ON c.id = ca.course_id AND ca.status = 'active'
    LEFT JOIN users u ON ca.teacher_id = u.id
    LEFT JOIN grades g ON ca.grade_id = g.id
    LEFT JOIN sections s ON ca.section_id = s.id
    LEFT JOIN academic_years ay ON ca.academic_year_id = ay.id
    WHERE c.id = $1 AND c.status = 'active'
    GROUP BY c.id, l.name, aa.name
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const createCourse = async (data, userId) => {
  const { name, code, grade_id, level_id, academic_area_id, area, type, description, objectives, methodology, resources, evaluation, status, academic_year_id } = data;

  console.log('🗄️ [coursesModel.createCourse] Valores a insertar:');
  console.log('  - name:', name);
  console.log('  - code:', code);
  console.log('  - grade_id:', grade_id);
  console.log('  - level_id:', level_id);
  console.log('  - academic_area_id:', academic_area_id);
  console.log('  - area:', area);
  console.log('  - type:', type || 'required');
  console.log('  - description:', description);
  console.log('  - academic_year_id:', academic_year_id);
  console.log('  - status:', status || 'active');
  console.log('  - userId:', userId);

  const result = await pool.query(
    `INSERT INTO courses (name, code, grade_id, level_id, academic_area_id, area, type, description, objectives, methodology, resources, evaluation, status, academic_year_id, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP) RETURNING *`,
    [name, code, grade_id, level_id, academic_area_id, area, type || 'required', description, objectives, methodology, resources, evaluation, status || 'active', academic_year_id, userId]
  );
  return result.rows[0];
};

const updateCourse = async (id, data, userId) => {
  const { name, code, grade_id, level_id, academic_area_id, area, type, description, objectives, methodology, resources, evaluation, status, academic_year_id } = data;
  const result = await pool.query(
    `UPDATE courses SET name = $1, code = $2, grade_id = $3, level_id = $4, academic_area_id = $5, area = $6, type = $7, description = $8, objectives = $9, methodology = $10, resources = $11, evaluation = $12, status = $13, academic_year_id = $14,
     user_id_modification = $15, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $16 RETURNING *`,
    [name, code, grade_id, level_id, academic_area_id, area, type, description, objectives, methodology, resources, evaluation, status, academic_year_id, userId, id]
  );
  return result.rows[0];
};

const deleteCourse = async (id, userId) => {
  await pool.query(
    'UPDATE courses SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['deleted', userId, id]
  );
  return true;
};

module.exports = { getAllCourses, getCourseById, createCourse, updateCourse, deleteCourse };
