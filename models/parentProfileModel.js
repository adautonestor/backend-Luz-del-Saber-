const pool = require('../config/db');

/**
 * Obtener perfil completo de un usuario padre por ID
 * @param {number} userId - ID del usuario padre
 * @returns {Promise<Object|null>} Perfil del padre o null
 */
const getParentProfileById = async (userId) => {
  const query = `
    SELECT
      u.id,
      u.email,
      u.first_name,
      u.last_names,
      u.dni,
      u.document_type,
      u.phone,
      u.address,
      u.relationship,
      u.status,
      u.role_id,
      u.birth_date,
      u.gender,
      u.marital_status,
      u.nationality,
      u.occupation,
      u.company,
      u.work_phone,
      u.secondary_email,
      u.district,
      u.province,
      u.department,
      u.postal_code,
      u.emergency_contact_name,
      u.emergency_contact_relationship,
      u.emergency_contact_phone,
      u.emergency_contact_address,
      r.name AS rol
    FROM users u
    INNER JOIN roles r ON u.role_id = r.id
    WHERE u.id = $1 AND u.status != 'deleted'
  `;

  const result = await pool.query(query, [userId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Actualizar perfil de un usuario padre
 * @param {number} userId - ID del usuario padre
 * @param {Object} profileData - Datos del perfil a actualizar
 * @returns {Promise<Object>} Perfil actualizado
 */
const updateParentProfile = async (userId, profileData) => {
  const {
    first_name,
    last_names,
    phone,
    address,
    birth_date,
    gender,
    marital_status,
    nationality,
    occupation,
    company,
    work_phone,
    secondary_email,
    district,
    province,
    department,
    postal_code,
    emergency_contact_name,
    emergency_contact_relationship,
    emergency_contact_phone,
    emergency_contact_address
  } = profileData;

  const query = `
    UPDATE users SET
      first_name = $1,
      last_names = $2,
      phone = $3,
      address = $4,
      birth_date = $5,
      gender = $6,
      marital_status = $7,
      nationality = $8,
      occupation = $9,
      company = $10,
      work_phone = $11,
      secondary_email = $12,
      district = $13,
      province = $14,
      department = $15,
      postal_code = $16,
      emergency_contact_name = $17,
      emergency_contact_relationship = $18,
      emergency_contact_phone = $19,
      emergency_contact_address = $20,
      user_id_modification = $21,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $22
    RETURNING id
  `;

  const values = [
    first_name,
    last_names,
    phone || null,
    address || null,
    birth_date || null,
    gender || null,
    marital_status || null,
    nationality || null,
    occupation || null,
    company || null,
    work_phone || null,
    secondary_email || null,
    district || null,
    province || null,
    department || null,
    postal_code || null,
    emergency_contact_name || null,
    emergency_contact_relationship || null,
    emergency_contact_phone || null,
    emergency_contact_address || null,
    userId, // El usuario se actualiza a sí mismo
    userId
  ];

  const result = await pool.query(query, values);

  // Obtener el perfil actualizado completo
  return await getParentProfileById(result.rows[0].id);
};

/**
 * Obtener hijos asociados a un padre
 * @param {number} parentId - ID del usuario padre (user_id)
 * @returns {Promise<Array>} Lista de hijos
 */
const getChildrenByParentId = async (parentId) => {
  const query = `
    SELECT
      s.id,
      s.first_names,
      s.last_names,
      s.dni,
      s.birth_date,
      s.gender,
      s.level_id,
      s.grade_id,
      s.section_id,
      s.academic_year_id,
      s.parents,
      l.name AS level_name,
      g.name AS grade_name,
      sec.name AS section_name,
      ay.year AS academic_year,
      ay.name AS academic_year_name
    FROM students s
    LEFT JOIN levels l ON s.level_id = l.id
    LEFT JOIN grades g ON s.grade_id = g.id
    LEFT JOIN sections sec ON s.section_id = sec.id
    LEFT JOIN academic_years ay ON s.academic_year_id = ay.id
    WHERE s.status != 'deleted'
      AND s.parents IS NOT NULL
      AND s.parents::jsonb @> jsonb_build_array(jsonb_build_object('user_id', $1::int))
    ORDER BY s.first_names, s.last_names
  `;

  const result = await pool.query(query, [parentId]);

  // Procesar los resultados para extraer la relación del padre
  return result.rows.map(child => {
    let relationship = 'No especificado';

    // Buscar la relación en el JSON parents usando user_id
    if (child.parents && Array.isArray(child.parents)) {
      const parentInfo = child.parents.find(p => p.user_id === parentId);
      if (parentInfo && parentInfo.relationship) {
        relationship = parentInfo.relationship;
      }
    }

    return {
      id: child.id,
      first_names: child.first_names,
      last_names: child.last_names,
      dni: child.dni,
      birth_date: child.birth_date,
      gender: child.gender,
      relationship: relationship,
      level: child.level_name,
      grade: child.grade_name,
      section: child.section_name,
      academic_year: child.academic_year,
      academic_year_name: child.academic_year_name
    };
  });
};

module.exports = {
  getParentProfileById,
  updateParentProfile,
  getChildrenByParentId
};
