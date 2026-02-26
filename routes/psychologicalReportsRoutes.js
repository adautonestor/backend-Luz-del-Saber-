const express = require('express');
const router = express.Router();
const { getAll, getById, getByStudent, create, update, remove, serveFile } = require('../controllers/psychologicalReportsController');
const { verificarToken } = require('../middleware/auth');
const { uploadSingleDocument } = require('../middleware/upload');

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.id_rol;
  if (![1, 2, 3, 4].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Ruta pública para servir archivos PDF (SIN autenticación)
router.get('/file/:key', serveFile);

// Rutas protegidas
router.use(verificarToken, verificarRolesPermitidos);

router.get('/', getAll);
router.get('/:id', getById);
router.get('/student/:studentId', getByStudent);
router.post('/', uploadSingleDocument.single('file'), create);
router.put('/:id', uploadSingleDocument.single('file'), update);
router.delete('/:id', remove);

module.exports = router;
