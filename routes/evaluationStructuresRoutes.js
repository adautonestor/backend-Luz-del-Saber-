const express = require('express');
const router = express.Router();
const { getAll, getById, getByCourse, create, update, remove, addColumn, removeColumn, getOrCreate } = require('../controllers/evaluationStructuresController');
const { verificarToken } = require('../middleware/auth');

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.id_rol;
  if (![1, 2, 3, 4].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

router.use(verificarToken, verificarRolesPermitidos);

// Ruta especial para obtener o crear automáticamente (debe ir ANTES de '/:id')
router.get('/get-or-create', getOrCreate);

router.get('/', getAll);
router.get('/:id', getById);
router.get('/course/:courseId', getByCourse);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

// Rutas para columnas personalizadas
router.post('/:structureId/columns', addColumn);
router.delete('/:structureId/columns/:columnId', removeColumn);

module.exports = router;
