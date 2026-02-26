const express = require('express');
const router = express.Router();
const { login, getMe } = require('../controllers/authController');
const { verificarToken } = require('../middleware/auth');

// POST /api/auth/login - Iniciar sesión
router.post('/login', login);

// GET /api/auth/me - Obtener información del usuario autenticado
// Este endpoint requiere token JWT válido
router.get('/me', verificarToken, getMe);

module.exports = router;
