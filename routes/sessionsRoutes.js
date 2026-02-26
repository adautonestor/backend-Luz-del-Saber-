const express = require('express');
const router = express.Router();
const { getAll, getById, getByUser, getActive, create, close, closeAllUser } = require('../controllers/sessionsController');
const { verificarToken } = require('../middleware/auth');

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.id_rol;
  if (![1, 2, 3, 4].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

router.use(verificarToken, verificarRolesPermitidos);

router.get('/', getAll);
router.get('/active', getActive);
router.get('/:id', getById);
router.get('/user/:userId', getByUser);
router.post('/', create);
router.put('/:id/close', close);
router.put('/user/:userId/close-all', closeAllUser);

module.exports = router;
