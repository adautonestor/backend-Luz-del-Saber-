const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * Middleware para verificar el token JWT
 */
const verificarToken = async (req, res, next) => {
  try {
    // Obtener el token del header Authorization
    const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token no proporcionado'
      });
    }

    // Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Obtener el nombre del rol desde la base de datos
    const roleQuery = await pool.query('SELECT name FROM roles WHERE id = $1', [decoded.role_id]);
    const roleName = roleQuery.rows[0]?.name || null;

    // Agregar la información del usuario al request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      id_rol: decoded.role_id,
      rol: roleName  // Agregar el nombre del rol
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expirado'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Token inválido'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Error al verificar token'
    });
  }
};

/**
 * Middleware para verificar roles específicos
 * @param {Array<number>} rolesPermitidos - Array de IDs de roles permitidos
 */
const verificarRoles = (rolesPermitidos) => {
  return (req, res, next) => {
    const rol = req.user?.id_rol;

    if (!rol || !rolesPermitidos.includes(rol)) {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado: No tiene permisos suficientes'
      });
    }

    next();
  };
};

module.exports = {
  verificarToken,
  verificarRoles
};
