const express = require('express');
const router = express.Router();
const { getAll, getById, getByStudent, getGrid, create, update, remove, getAverages, getReportCard } = require('../controllers/competencyGradesController');
const { verificarToken } = require('../middleware/auth');

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.id_rol;
  if (![1, 2, 3, 4].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

router.use(verificarToken, verificarRolesPermitidos);

// ⚠️ IMPORTANTE: Las rutas más específicas PRIMERO
router.get('/averages', getAverages);                    // GET /api/competency-grades/averages
router.get('/grid', getGrid);                            // GET /api/competency-grades/grid
router.get('/report-card/:studentId', getReportCard);    // GET /api/competency-grades/report-card/:studentId
router.get('/student/:studentId', getByStudent);         // GET /api/competency-grades/student/:id
router.get('/:id', getById);                             // GET /api/competency-grades/:id
router.get('/', getAll);                                 // GET /api/competency-grades

router.post('/', create);                        // POST /api/competency-grades
router.put('/:id', update);                      // PUT /api/competency-grades/:id
router.delete('/:id', remove);                   // DELETE /api/competency-grades/:id

module.exports = router;
