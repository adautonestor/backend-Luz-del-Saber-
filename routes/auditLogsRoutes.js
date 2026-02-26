const express = require('express');
const router = express.Router();
const { getAll, getById, getByUser, getByTable, create } = require('../controllers/auditLogsController');
const { verificarToken } = require('../middleware/auth');

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.id_rol;
  if (![1].includes(rol)) { // Solo Director (administrador) puede ver logs de auditoría
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

router.use(verificarToken, verificarRolesPermitidos);

router.get('/', getAll);
router.get('/:id', getById);
router.get('/user/:userId', getByUser);
router.get('/table/:table', getByTable);
router.post('/', create);

module.exports = router;
