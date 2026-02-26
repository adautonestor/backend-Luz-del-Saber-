const express = require('express');
const router = express.Router();
const { getAll, getById, getByModule, create, update, remove } = require('../controllers/permissionsController');
const { verificarToken } = require('../middleware/auth');

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.id_rol;
  if (![1].includes(rol)) { // Solo Director (administrador) puede gestionar permisos
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

router.use(verificarToken, verificarRolesPermitidos);

router.get('/', getAll);
router.get('/:id', getById);
router.get('/module/:module', getByModule);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
