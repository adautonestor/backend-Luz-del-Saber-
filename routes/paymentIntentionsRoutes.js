const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, approve, reject, uploadVoucher } = require('../controllers/paymentIntentionsController');
const { verificarToken } = require('../middleware/auth');
const { uploadSingleImage, uploadSingleDocument } = require('../middleware/upload');

// Roles administrativos (Director, Secretaria, Docente, Auxiliar)
const verificarRolesAdmin = (req, res, next) => {
  const rol = req.user?.id_rol;
  if (![1, 2, 3, 4].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Roles que pueden crear intenciones de pago (incluye padres - rol 5)
const verificarRolesPago = (req, res, next) => {
  const rol = req.user?.id_rol;
  // 1=Director, 2=Secretaria, 3=Docente, 4=Auxiliar, 5=Padre
  if (![1, 2, 3, 4, 5].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Rutas protegidas con token
router.use(verificarToken);

// Ruta para subir voucher - permite padres (rol 5) - acepta imágenes y PDFs
router.post('/upload-voucher', verificarRolesPago, uploadSingleDocument.single('file'), uploadVoucher);

// Rutas para crear intención - permite padres (rol 5)
router.post('/', verificarRolesPago, create);

// Rutas administrativas (solo admin)
router.get('/', verificarRolesAdmin, getAll);
router.get('/:id', verificarRolesAdmin, getById);
router.put('/:id', verificarRolesAdmin, update);
router.put('/:id/approve', verificarRolesAdmin, approve);
router.put('/:id/reject', verificarRolesAdmin, reject);

module.exports = router;
