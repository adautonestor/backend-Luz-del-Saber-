const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, remove, serveDocument } = require('../controllers/documentsController');
const { verificarToken } = require('../middleware/auth');
const { uploadSingleDocument, useWasabi } = require('../middleware/upload');

// Usar middleware híbrido (Wasabi en producción, local en desarrollo)
const uploadDocument = uploadSingleDocument;

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.id_rol;
  if (![1, 2, 3, 4].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Ruta para servir documentos (PROXY HÍBRIDO: Wasabi en producción, local en desarrollo)
// Esta ruta NO requiere autenticación para que los archivos sean accesibles
router.get('/file/:key', serveDocument);

// Rutas protegidas
router.use(verificarToken, verificarRolesPermitidos);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', uploadDocument.single('file'), create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
