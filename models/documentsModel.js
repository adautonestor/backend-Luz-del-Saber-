const pool = require('../config/db');

const getAllDocuments = async (filters = {}, userRole = null) => {
  let query = `
    SELECT d.*, u.first_name AS subido_por_nombre, u.last_names AS subido_por_apellidos
    FROM documents d
    INNER JOIN users u ON d.uploaded_by = u.id
    WHERE d.status = 'active'
  `;
  const params = [];
  let paramCount = 1;

  // Filtrar documentos según el rol del usuario
  if (userRole) {
    if (userRole === 'Profesor') {
      // Los profesores ven documentos para 'teachers' o 'all'
      query += ` AND d.visible_to IN ('teachers', 'all')`;
    } else if (userRole === 'Padre') {
      // Los padres ven documentos para 'parents' o 'all'
      query += ` AND d.visible_to IN ('parents', 'all')`;
    }
    // Director y Secretaria ven todos los documentos (no se agrega filtro)
  }

  if (filters.type) {
    query += ` AND d.type = $${paramCount}`;
    params.push(filters.type);
    paramCount++;
  }

  if (filters.category) {
    query += ` AND d.category = $${paramCount}`;
    params.push(filters.category);
    paramCount++;
  }

  if (filters.visible_to) {
    query += ` AND d.visible_to = $${paramCount}`;
    params.push(filters.visible_to);
    paramCount++;
  }

  if (filters.student_id) {
    query += ` AND d.student_id = $${paramCount}`;
    params.push(filters.student_id);
    paramCount++;
  }

  if (filters.active !== undefined) {
    query += ` AND d.active = $${paramCount}`;
    params.push(filters.active);
    paramCount++;
  }

  query += ' ORDER BY d.upload_date DESC';

  // Limitar resultados
  if (filters.limit) {
    query += ` LIMIT $${paramCount}`;
    params.push(filters.limit);
    paramCount++;
  }

  const result = await pool.query(query, params);
  return result.rows;
};

const getDocumentById = async (id) => {
  const query = `
    SELECT d.*, u.first_name AS subido_por_nombre, u.last_names AS subido_por_apellidos
    FROM documents d
    INNER JOIN users u ON d.uploaded_by = u.id
    WHERE d.id = $1 AND d.status = 'active'
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const createDocument = async (data, userId) => {
  const { title, description, type, category, file_url, file_name, file_type, file_size, visible_to, upload_date, active } = data;
  const result = await pool.query(
    `INSERT INTO documents (title, description, type, category, file_url, file_name, file_type, file_size, visible_to, uploaded_by, upload_date, status, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP) RETURNING *`,
    [title, description, type, category, file_url, file_name, file_type, file_size, visible_to || 'todos', userId, upload_date || new Date(), active !== false ? 'active' : 'inactive', userId]
  );
  return result.rows[0];
};

const updateDocument = async (id, data, userId) => {
  const { title, description, type, category, visible_to, status } = data;
  const result = await pool.query(
    `UPDATE documents SET title = $1, description = $2, type = $3, category = $4, visible_to = $5, status = $6,
     user_id_modification = $7, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $8 RETURNING *`,
    [title, description, type, category, visible_to, status, userId, id]
  );
  return result.rows[0];
};

const deleteDocument = async (id, userId) => {
  await pool.query(
    'UPDATE documents SET status = $1, user_id_modification = $2, date_time_modification = CURRENT_TIMESTAMP WHERE id = $3',
    ['deleted', userId, id]
  );
  return true;
};

module.exports = { getAllDocuments, getDocumentById, createDocument, updateDocument, deleteDocument };
