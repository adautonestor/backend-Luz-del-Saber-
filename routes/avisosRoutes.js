const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, remove, serveAvisoFile } = require('../controllers/avisosController');
const { verificarToken } = require('../middleware/auth');
const { uploadMultipleFiles } = require('../middleware/upload');

// Middleware para subir imagen y archivo de avisos
const uploadAvisoFiles = uploadMultipleFiles.fields([
  { name: 'image', maxCount: 1 },
  { name: 'file', maxCount: 1 }
]);

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.id_rol;
  if (![1, 2, 3, 4].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Ruta para servir archivos de avisos (PROXY HÍBRIDO)
// Esta ruta NO requiere autenticación para que los archivos sean accesibles
router.get('/file/:key', serveAvisoFile);

// Rutas protegidas
router.use(verificarToken, verificarRolesPermitidos);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', uploadAvisoFiles, create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
