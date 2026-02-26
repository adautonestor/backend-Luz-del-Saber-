const express = require('express');
const router = express.Router();
const parentProfileController = require('../controllers/parentProfileController');
const { verificarToken } = require('../middleware/auth');

/**
 * @route GET /api/parent-profile/me
 * @desc Obtener perfil del usuario autenticado
 * @access Private
 */
router.get('/me', verificarToken, parentProfileController.getMyProfile);

/**
 * @route PUT /api/parent-profile/me
 * @desc Actualizar perfil del usuario autenticado
 * @access Private
 */
router.put('/me', verificarToken, parentProfileController.updateMyProfile);

/**
 * @route GET /api/parent-profile/children
 * @desc Obtener hijos asociados al usuario autenticado
 * @access Private
 */
router.get('/children', verificarToken, parentProfileController.getMyChildren);

module.exports = router;
