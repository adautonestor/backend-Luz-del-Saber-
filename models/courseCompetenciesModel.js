const pool = require('../config/db');

const getAllCourseCompetencies = async (filters = {}) => {
  let query = `
    SELECT cc.*, c.name AS curso_nombre, c.code AS curso_codigo,
           comp.name AS competencia_nombre, comp.code AS competencia_codigo,
           u.first_name AS usuario_nombre
    FROM course_competencies cc
    INNER JOIN courses c ON cc.course_id = c.id
    INNER JOIN competencies comp ON cc.competency_id = comp.id
    LEFT JOIN users u ON cc.user_id_registration = u.id
    WHERE cc.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.course_id) {
    query += ` AND cc.course_id = $${paramCount}`;
    params.push(filters.course_id);
    paramCount++;
  }

  if (filters.competency_id) {
    query += ` AND cc.competency_id = $${paramCount}`;
    params.push(filters.competency_id);
    paramCount++;
  }

  if (filters.academic_year) {
    query += ` AND cc.academic_year = $${paramCount}`;
    params.push(filters.academic_year);
    paramCount++;
  }

  query += ' ORDER BY c.name, cc.order';
  const result = await pool.query(query, params);
  return result.rows;
};

const getCourseCompetencyById = async (id) => {
  const query = `
    SELECT cc.*, c.name AS curso_nombre, c.code AS curso_codigo,
           comp.name AS competencia_nombre, comp.code AS competencia_codigo
    FROM course_competencies cc
    INNER JOIN courses c ON cc.course_id = c.id
    INNER JOIN competencies comp ON cc.competency_id = comp.id
    WHERE cc.id = $1 AND cc.status = 'active'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const getCompetenciesByCourse = async (cursoId, añoEscolar = null) => {
  let query = `
    SELECT cc.*, comp.name AS competencia_nombre, comp.code AS competencia_codigo,
           comp.description AS competencia_descripcion
    FROM course_competencies cc
    INNER JOIN competencies comp ON cc.competency_id = comp.id
    WHERE cc.course_id = $1 AND cc.status = 'active'
  `;
  const params = [cursoId];
  let paramCount = 2;

  if (añoEscolar) {
    query += ` AND cc.academic_year = $${paramCount}`;
    params.push(añoEscolar);
  }

  query += ' ORDER BY cc.order';
  const result = await pool.query(query, params);
  return result.rows;
};

const createCourseCompetency = async (data, userId) => {
  const { course_id, competency_id, name, description, order, academic_year } = data;
  const result = await pool.query(
    `INSERT INTO course_competencies (course_id, competency_id, name, description, "order", academic_year, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP) RETURNING *`,
    [course_id, competency_id, name, description, order, academic_year, userId]
  );
  return result.rows[0];
};

const updateCourseCompetency = async (id, data, userId) => {
  const { name, description, order } = data;
  const result = await pool.query(
    `UPDATE course_competencies SET name = COALESCE($1, name),
     description = COALESCE($2, description),
     "order" = COALESCE($3, "order"),
     user_id_modification = $4, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $5 RETURNING *`,
    [name, description, order, userId, id]
  );
  return result.rows[0];
};

const deleteCourseCompetency = async (id, userId) => {
  await pool.query(
    'UPDATE course_competencies SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['inactive', userId, id]
  );
  return true;
};

module.exports = { getAllCourseCompetencies, getCourseCompetencyById, getCompetenciesByCourse, createCourseCompetency, updateCourseCompetency, deleteCourseCompetency };
