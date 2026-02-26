const express = require('express');
const router = express.Router();
const { getAll, getById, getByCommunication, getByUser, create, markRead, remove } = require('../controllers/readConfirmationsController');
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
router.get('/:id', getById);
router.get('/communication/:communicationId', getByCommunication);
router.get('/user/:userId', getByUser);
router.post('/', create);
router.put('/mark-read/:communicationId/:userId', markRead);
router.delete('/:id', remove);

module.exports = router;
