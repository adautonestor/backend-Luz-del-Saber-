const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, remove } = require('../controllers/rolesController');
const { verificarToken } = require('../middleware/auth');

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.id_rol;
  if (![1].includes(rol)) { // Solo Director (administrador) puede gestionar roles
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

const verificarAccesoLectura = (req, res, next) => {
  const rol = req.user?.id_rol;
  // Director (1) y Secretaria (4) pueden leer roles
  if (![1, 4].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// GET endpoints con permisos de lectura más amplios
router.get('/', verificarToken, verificarAccesoLectura, getAll);
router.get('/:id', verificarToken, verificarAccesoLectura, getById);

// Otros endpoints requieren ser administrador
router.post('/', verificarToken, verificarRolesPermitidos, create);
router.put('/:id', verificarToken, verificarRolesPermitidos, update);
router.delete('/:id', verificarToken, verificarRolesPermitidos, remove);

module.exports = router;
