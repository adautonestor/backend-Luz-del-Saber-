const express = require('express');
const router = express.Router();
const {
  getAll,
  getById,
  getByCode,
  getByStudent,
  create,
  update,
  deactivate,
  remove,
  findByDniOrBarcode,
  generateBulk,
  getStudentsForPdf
} = require('../controllers/studentQrCodesController');
const { verificarToken } = require('../middleware/auth');

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.id_rol;
  if (![1, 2, 3, 4].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

router.use(verificarToken, verificarRolesPermitidos);

// Rutas específicas primero (antes de :id)
router.get('/students-for-pdf', getStudentsForPdf);
router.get('/find/:code', findByDniOrBarcode);
router.get('/code/:code', getByCode);
router.get('/student/:studentId', getByStudent);

// Rutas generales
router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.post('/generate-bulk', generateBulk);
router.put('/:id', update);
router.put('/:id/deactivate', deactivate);
router.delete('/:id', remove);

module.exports = router;
