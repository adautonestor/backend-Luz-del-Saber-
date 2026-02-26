const express = require('express');
const router = express.Router();
const { getAll, getById, getByGradeAndSection, create, update, cancel, remove } = require('../controllers/parentMeetingsController');
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
router.get('/grade/:gradeId/section/:sectionId', getByGradeAndSection);
router.post('/', create);
router.put('/:id', update);
router.put('/:id/cancel', cancel);
router.delete('/:id', remove);

module.exports = router;
