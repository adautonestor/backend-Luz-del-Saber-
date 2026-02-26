const express = require('express');
const router = express.Router();
const {
  getAll,
  getById,
  create,
  update,
  remove,
  getByRole
} = require('../controllers/usersController');
const { verificarToken } = require('../middleware/auth');

// 👉 Middleware para validar los roles permitidos
const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.id_rol;
  if (![1, 2, 3, 4].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Todas las rutas requieren autenticación y roles permitidos
router.use(verificarToken, verificarRolesPermitidos);

// GET /api/users - Obtener todos los usuarios con filtros opcionales
router.get('/', getAll);

// GET /api/users/by-role/:role - Obtener usuarios por rol (ej: padre, profesor)
router.get('/by-role/:role', getByRole);

// GET /api/users/:id - Obtener un usuario por ID
router.get('/:id', getById);

// POST /api/users - Crear un nuevo usuario
router.post('/', create);

// PUT /api/users/:id - Actualizar un usuario
router.put('/:id', update);

// DELETE /api/users/:id - Eliminar un usuario (soft delete)
router.delete('/:id', remove);

module.exports = router;
