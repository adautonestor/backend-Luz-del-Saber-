const express = require('express');
const router = express.Router();
const { getAll, getById, getByMeeting, getByParent, create, update, remove } = require('../controllers/meetingAttendancesController');
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
router.get('/meeting/:meetingId', getByMeeting);
router.get('/parent/:parentId', getByParent);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
