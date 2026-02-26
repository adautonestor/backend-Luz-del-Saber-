const pool = require('../config/db');

const getAllAvisos = async (filters = {}) => {
  let query = `
    SELECT a.*, u.first_name AS publicado_por_nombre, u.last_names AS publicado_por_apellidos
    FROM announcements a
    INNER JOIN users u ON a.published_by = u.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;

  // Para admin: mostrar todos. Para otros roles: solo activos
  if (filters.soloActivos) {
    query += ` AND a.status = 'active'`;
  }

  query += ' ORDER BY a.publication_date DESC';

  // Limitar resultados
  if (filters.limit) {
    query += ` LIMIT $${paramCount}`;
    params.push(filters.limit);
    paramCount++;
  }

  const result = await pool.query(query, params);
  return result.rows;
};

const getAvisoById = async (id) => {
  const query = `
    SELECT a.*, u.first_name AS publicado_por_nombre, u.last_names AS publicado_por_apellidos
    FROM announcements a
    INNER JOIN users u ON a.published_by = u.id
    WHERE a.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const createAviso = async (data, userId) => {
  const { title, content, link, image, file, file_name, file_type, file_size, publication_date } = data;
  const result = await pool.query(
    `INSERT INTO announcements (title, content, link, image, file, file_name, file_type, file_size, published_by, publication_date, user_id_registration, date_time_registration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP) RETURNING *`,
    [title, content, link, image, file, file_name, file_type, file_size, userId, publication_date || new Date(), userId]
  );
  return result.rows[0];
};

const updateAviso = async (id, data, userId) => {
  // Obtener el aviso actual para campos que no se actualizan
  const current = await getAvisoById(id);
  if (!current) return null;

  // Mapear 'activo' a 'status' si viene del frontend
  let status = current.status;
  if (data.activo !== undefined) {
    status = data.activo ? 'active' : 'inactive';
  } else if (data.status !== undefined) {
    status = data.status;
  }

  const title = data.title !== undefined ? data.title : current.title;
  const content = data.content !== undefined ? data.content : current.content;
  const link = data.link !== undefined ? data.link : current.link;
  const image = data.image !== undefined ? data.image : current.image;
  const file = data.file !== undefined ? data.file : current.file;
  const file_name = data.file_name !== undefined ? data.file_name : current.file_name;
  const file_type = data.file_type !== undefined ? data.file_type : current.file_type;
  const file_size = data.file_size !== undefined ? data.file_size : current.file_size;

  const result = await pool.query(
    `UPDATE announcements SET title = $1, content = $2, link = $3, image = $4, file = $5, file_name = $6, file_type = $7, file_size = $8, status = $9,
     user_id_modification = $10, date_time_modification = CURRENT_TIMESTAMP
     WHERE id = $11 RETURNING *`,
    [title, content, link, image, file, file_name, file_type, file_size, status, userId, id]
  );
  return result.rows[0];
};

const deleteAviso = async (id, userId) => {
  // Hard delete - eliminar completamente el registro
  await pool.query('DELETE FROM announcements WHERE id = $1', [id]);
  return true;
};

module.exports = { getAllAvisos, getAvisoById, createAviso, updateAviso, deleteAviso };
