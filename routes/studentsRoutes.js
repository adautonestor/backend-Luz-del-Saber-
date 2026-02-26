const express = require('express');
const router = express.Router();
const {
  getAll,
  getById,
  getByDni,
  getByCodigo,
  create,
  update,
  remove,
  getByParent
} = require('../controllers/studentsController');
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

// GET /api/students - Obtener todos los estudiantes con filtros opcionales
router.get('/', getAll);

// GET /api/students/dni/:dni - Buscar estudiante por DNI (rutas específicas primero)
router.get('/dni/:dni', getByDni);

// GET /api/students/codigo/:codigo - Buscar estudiante por código
router.get('/codigo/:codigo', getByCodigo);

// GET /api/students/parent/:padreId - Obtener estudiantes de un padre
router.get('/parent/:padreId', getByParent);

// GET /api/students/:id - Obtener un estudiante por ID (ruta genérica al final)
router.get('/:id', getById);

// POST /api/students - Crear un nuevo estudiante
router.post('/', create);

// PUT /api/students/:id - Actualizar un estudiante
router.put('/:id', update);

// DELETE /api/students/:id - Eliminar un estudiante (soft delete)
router.delete('/:id', remove);

module.exports = router;
