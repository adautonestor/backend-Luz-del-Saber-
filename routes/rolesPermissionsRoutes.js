const express = require('express');
const router = express.Router();
const { getAll, getById, getByRole, getByPermission, create, remove } = require('../controllers/rolesPermissionsController');
const { verificarToken } = require('../middleware/auth');

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.id_rol;
  if (![1].includes(rol)) { // Solo Director (administrador del sistema)
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

router.use(verificarToken, verificarRolesPermitidos);

router.get('/', getAll);
router.get('/:id', getById);
router.get('/role/:roleId', getByRole);
router.get('/permission/:permissionId', getByPermission);
router.post('/', create);
router.delete('/:id', remove);

module.exports = router;
