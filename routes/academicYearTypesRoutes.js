const express = require('express');
const router = express.Router();
const academicYearTypesController = require('../controllers/academicYearTypesController');
const verificarToken = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// GET /api/academic-year-types - Obtener todos los tipos
router.get('/', academicYearTypesController.getAll);

// GET /api/academic-year-types/:id - Obtener tipo por ID
router.get('/:id', academicYearTypesController.getById);

// POST /api/academic-year-types - Crear nuevo tipo
router.post('/', academicYearTypesController.create);

// PUT /api/academic-year-types/:id - Actualizar tipo
router.put('/:id', academicYearTypesController.update);

// DELETE /api/academic-year-types/:id - Eliminar tipo
router.delete('/:id', academicYearTypesController.remove);

module.exports = router;
