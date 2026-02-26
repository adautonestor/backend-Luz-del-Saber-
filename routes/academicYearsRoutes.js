const express = require('express');
const router = express.Router();
const {
  getAll,
  getById,
  getCurrent,
  create,
  update,
  close,
  remove,
  addDefaultLevels
} = require('../controllers/academicYearsController');
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

// GET /api/academic-years - Obtener todos los años escolares
router.get('/', getAll);

// GET /api/academic-years/current - Obtener año escolar activo actual
router.get('/current', getCurrent);

// GET /api/academic-years/:id - Obtener un año escolar por ID
router.get('/:id', getById);

// POST /api/academic-years - Crear un nuevo año escolar
router.post('/', create);

// PUT /api/academic-years/:id - Actualizar un año escolar
router.put('/:id', update);

// PUT /api/academic-years/:id/close - Cerrar un año escolar
router.put('/:id/close', close);

// POST /api/academic-years/:id/add-default-levels - Agregar niveles predeterminados a un año existente
router.post('/:id/add-default-levels', addDefaultLevels);

// DELETE /api/academic-years/:id - Eliminar un año escolar (soft delete)
router.delete('/:id', remove);

module.exports = router;
