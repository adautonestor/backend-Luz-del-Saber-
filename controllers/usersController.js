const {
  getAllUsers,
  getUserById,
  getUserByEmail,
  getUserByDni,
  createUser,
  updateUser,
  deleteUser,
  getUsersByRoleName
} = require('../models/usersModel');

/**
 * Obtener todos los usuarios con filtros opcionales
 */
const getAll = async (req, res) => {
  try {
    const filters = {
      role_id: req.query.role_id,
      status: req.query.status
    };

    const users = await getAllUsers(filters);
    res.json({
      success: true,
      data: users,
      total: users.length
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener usuarios'
    });
  }
};

/**
 * Obtener un usuario por ID
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUserById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener usuario'
    });
  }
};

/**
 * Crear un nuevo usuario
 */
const create = async (req, res) => {
  try {
    const userId = req.user?.id;

    // Validaciones básicas
    const { email, password, first_name, last_names, dni, role_id } = req.body;

    if (!email || !password || !first_name || !last_names || !dni || !role_id) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    // Verificar duplicado por email
    const existingByEmail = await getUserByEmail(email);
    if (existingByEmail) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe un usuario con ese email'
      });
    }

    // Verificar duplicado por DNI
    const existingByDni = await getUserByDni(dni);
    if (existingByDni) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe un usuario con ese DNI'
      });
    }

    const newUser = await createUser(req.body, userId);

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: newUser
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear usuario'
    });
  }
};

/**
 * Actualizar un usuario
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Verificar que el usuario existe
    const existing = await getUserById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Impedir que la secretaria (rol 4) modifique a un administrador (rol 1)
    if (req.user?.id_rol === 4 && existing.role_id === 1) {
      return res.status(403).json({
        success: false,
        error: 'No tiene permisos para modificar usuarios con rol de administrador.'
      });
    }

    // Impedir que el administrador (Director) sea marcado como inactivo
    if (existing.role_id === 1 && req.body.status === 'inactive') {
      return res.status(400).json({
        success: false,
        error: 'El usuario Director es el administrador principal del sistema y debe permanecer activo para garantizar el acceso y gestión de la plataforma. No es posible desactivar esta cuenta.'
      });
    }

    // Verificar duplicados si se cambia email
    if (req.body.email && req.body.email !== existing.email) {
      const existingByEmail = await getUserByEmail(req.body.email);
      if (existingByEmail && existingByEmail.id !== parseInt(id)) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe otro usuario con ese email'
        });
      }
    }

    // Verificar duplicados si se cambia DNI
    if (req.body.dni && req.body.dni !== existing.dni) {
      const existingByDni = await getUserByDni(req.body.dni);
      if (existingByDni && existingByDni.id !== parseInt(id)) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe otro usuario con ese DNI'
        });
      }
    }

    const updatedUser = await updateUser(id, req.body, userId);

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar usuario'
    });
  }
};

/**
 * Eliminar un usuario (soft delete)
 */
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const existing = await getUserById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Impedir que la secretaria (rol 4) elimine a un administrador (rol 1)
    if (req.user?.id_rol === 4 && existing.role_id === 1) {
      return res.status(403).json({
        success: false,
        error: 'No tiene permisos para eliminar usuarios con rol de administrador.'
      });
    }

    // Impedir eliminar al administrador (Director)
    if (existing.role_id === 1) {
      return res.status(400).json({
        success: false,
        error: 'El usuario Director es el administrador principal del sistema y no puede ser eliminado. Esta cuenta es esencial para la gestión de la plataforma.'
      });
    }

    await deleteUser(id, userId);

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar usuario'
    });
  }
};

/**
 * Obtener usuarios por rol
 */
const getByRole = async (req, res) => {
  try {
    const { role } = req.params;

    if (!role) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del rol es requerido'
      });
    }

    const users = await getUsersByRoleName(role);

    res.json({
      success: true,
      data: users,
      total: users.length
    });
  } catch (error) {
    console.error('Error al obtener usuarios por rol:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener usuarios por rol'
    });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getByRole
};
