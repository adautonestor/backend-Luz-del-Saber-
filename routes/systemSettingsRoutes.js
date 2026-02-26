const express = require('express');
const router = express.Router();
const {
  getAll,
  getById,
  getByKey,
  getByCategory,
  create,
  update,
  updateByKey,
  uploadLogo,
  uploadFile,
  remove,
  getPublicSchoolInfo,
  // Escalas de calificación
  getGradingScales,
  updateGradingScales,
  updateLevelScale,
  getLevelScale,
  lockLevelScale,
  isLevelLocked,
  validateGradeValue,
  convertGradeValue,
  getConversionTable
} = require('../controllers/systemSettingsController');
const { verificarToken } = require('../middleware/auth');
const { uploadSingleImage } = require('../middleware/upload');

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.id_rol;
  // Director (1), Secretaria (2), y roles administrativos
  if (![1, 2].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Ruta PUBLICA - No requiere autenticacion (para login y otras paginas publicas)
router.get('/public/school-info', getPublicSchoolInfo);

// ============================================
// RUTAS DE ESCALAS DE CALIFICACIÓN - LECTURA
// Accesibles para TODOS los usuarios autenticados (incluido Padre)
// Necesario para mostrar notas correctamente
// ============================================
router.get('/grading-scales/active', verificarToken, getGradingScales);
router.get('/grading-scales/:academicYearId/level/:levelId', verificarToken, getLevelScale);
router.get('/grading-scales/:academicYearId/conversion-table/:levelId', verificarToken, getConversionTable);
router.get('/grading-scales/:academicYearId/is-locked/:levelId', verificarToken, isLevelLocked);

// Rutas protegidas (solo Director y Secretaria)
router.use(verificarToken, verificarRolesPermitidos);

// Rutas especificas primero (antes de las rutas con parametros)
router.get('/key/:key', getByKey);
router.get('/category/:category', getByCategory);
router.put('/key/:key/value', updateByKey);
router.post('/upload-logo', uploadSingleImage.single('logo'), uploadLogo);
router.post('/upload-file', uploadSingleImage.single('file'), uploadFile);

// ============================================
// RUTAS DE ESCALAS DE CALIFICACIÓN
// ============================================

// Rutas de validación y conversión (sin parámetro de año)
router.post('/grading-scales/validate', validateGradeValue);
router.post('/grading-scales/convert', convertGradeValue);

// Rutas con año académico
router.get('/grading-scales/:academicYearId', getGradingScales);
router.put('/grading-scales/:academicYearId', updateGradingScales);

// Rutas de nivel específico
router.get('/grading-scales/:academicYearId/level/:levelId', getLevelScale);
router.put('/grading-scales/:academicYearId/level/:levelId', updateLevelScale);
router.get('/grading-scales/:academicYearId/conversion-table/:levelId', getConversionTable);

// Rutas de bloqueo
router.post('/grading-scales/:academicYearId/lock/:levelId', lockLevelScale);
router.get('/grading-scales/:academicYearId/is-locked/:levelId', isLevelLocked);

// ============================================
// Rutas CRUD generales
router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
