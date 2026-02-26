const express = require('express');
const router = express.Router();
const { getAll, getById, getByStudent, getByStudentAndYear, create, createWithTransaction, update, approve, remove, updateContractByStudentAndYear, deleteContractByStudentAndYear, serveContract } = require('../controllers/matriculationController');
const { verificarToken } = require('../middleware/auth');
const { uploadSingleDocument, useWasabi } = require('../middleware/upload');

// Usar el middleware de upload híbrido (Wasabi en producción, local en desarrollo)
const uploadContract = uploadSingleDocument;

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.id_rol;
  if (![1, 2, 3, 4].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

router.use(verificarToken, verificarRolesPermitidos);

// Rutas CRUD de matrículas
router.get('/', getAll);
router.get('/student/:studentId', getByStudent);
router.get('/student/:studentId/year/:year', getByStudentAndYear);
router.get('/:id', getById);
router.post('/', uploadContract.single('contract'), create);
router.post('/with-transaction', uploadContract.single('contract'), createWithTransaction);
router.put('/:id', update);
router.put('/:id/contract', uploadContract.single('contract'), update);
router.put('/student/:studentId/year/:year/contract', uploadContract.single('contract'), updateContractByStudentAndYear);
router.delete('/student/:studentId/year/:year/contract', deleteContractByStudentAndYear);
router.put('/:id/approve', approve);
router.delete('/:id', remove);

// Ruta para servir contratos (PROXY HÍBRIDO: Wasabi en producción, local en desarrollo)
router.get('/contract/:key', serveContract);

module.exports = router;
