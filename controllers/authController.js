const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { findUserByEmail, findUserById } = require('../models/authModel');
const { updateLastLogin } = require('../models/usersModel');

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validar que se envíen los campos requeridos
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    // Buscar usuario con su rol y permisos
    const usuario = await findUserByEmail(email);

    if (!usuario) {
      return res.status(404).json({ error: 'Correo no registrado o usuario inactivo' });
    }

    // Comparar contraseñas con bcrypt
    const coincide = await bcrypt.compare(password, usuario.password);
    if (!coincide) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // Actualizar el último acceso del usuario
    await updateLastLogin(usuario.id);

    // Generar token JWT
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, role_id: usuario.role_id },
      process.env.JWT_SECRET,
      { expiresIn: '4h' }
    );

    // Excluir el password de la respuesta por seguridad
    const { password: _, ...usuarioSinPassword } = usuario;

    // Responder con datos completos del usuario + permisos
    res.json({
      mensaje: 'Login exitoso',
      token,
      usuario: usuarioSinPassword
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

/**
 * Obtener información del usuario autenticado (validar token)
 * Este endpoint requiere que el usuario esté autenticado
 */
const getMe = async (req, res) => {
  try {
    // req.user viene del middleware verificarToken
    const userId = req.user.id;

    // Buscar usuario con su rol y permisos
    const usuario = await findUserById(userId);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (usuario.status !== 'active') {
      return res.status(403).json({ error: 'Usuario inactivo' });
    }

    // Excluir el password de la respuesta
    const { password: _, ...usuarioSinPassword } = usuario;

    res.json({
      success: true,
      usuario: usuarioSinPassword
    });
  } catch (error) {
    console.error('Error en getMe:', error);
    res.status(500).json({ error: 'Error al obtener información del usuario' });
  }
};

module.exports = { login, getMe };
