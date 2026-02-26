const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, send, remove, serveCommunicationFile } = require('../controllers/communicationsController');
const { verificarToken } = require('../middleware/auth');
const { uploadMultipleFiles } = require('../middleware/upload');

// Middleware para subir múltiples archivos adjuntos
const uploadAttachments = uploadMultipleFiles.array('attachments', 10); // Máximo 10 archivos

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.id_rol;
  if (![1, 2, 3, 4].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Ruta pública para servir archivos (PROXY HÍBRIDO)
router.get('/file/:key', serveCommunicationFile);

// Rutas protegidas
router.use(verificarToken, verificarRolesPermitidos);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', uploadAttachments, create);
router.put('/:id', uploadAttachments, update);
router.put('/:id/send', send);
router.delete('/:id', remove);

module.exports = router;
