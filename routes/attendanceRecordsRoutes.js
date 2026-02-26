const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, scanEntry, scanExit, remove, smartScan, getTodaySummary, getStudentNextAction } = require('../controllers/attendanceRecordsController');
const { verificarToken } = require('../middleware/auth');

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.id_rol;
  if (![1, 2, 3, 4].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

router.use(verificarToken, verificarRolesPermitidos);

// Rutas específicas primero
router.get('/today-summary', getTodaySummary);
router.get('/next-action/:dni', getStudentNextAction);
router.post('/smart-scan', smartScan);
router.post('/scan-entry', scanEntry);
router.post('/scan-exit', scanExit);

// Rutas generales
router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
