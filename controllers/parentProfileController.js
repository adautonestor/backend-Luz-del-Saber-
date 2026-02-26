const parentProfileModel = require('../models/parentProfileModel');

/**
 * Obtener el perfil del usuario autenticado
 * @route GET /api/parent-profile/me
 */
const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const profile = await parentProfileModel.getParentProfileById(userId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Perfil no encontrado'
      });
    }

    res.json({
      success: true,
      data: profile
    });

  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el perfil'
    });
  }
};

/**
 * Actualizar el perfil del usuario autenticado
 * @route PUT /api/parent-profile/me
 */
const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileData = req.body;

    // Validar que los campos requeridos estén presentes
    if (!profileData.first_name || !profileData.last_names) {
      return res.status(400).json({
        success: false,
        error: 'Los campos first_name y last_names son requeridos'
      });
    }

    const updatedProfile = await parentProfileModel.updateParentProfile(userId, profileData);

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: updatedProfile
    });

  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el perfil'
    });
  }
};

/**
 * Obtener los hijos asociados al usuario autenticado
 * @route GET /api/parent-profile/children
 */
const getMyChildren = async (req, res) => {
  try {
    const parentId = req.user.id;
    const children = await parentProfileModel.getChildrenByParentId(parentId);

    res.json({
      success: true,
      data: children
    });

  } catch (error) {
    console.error('Error al obtener hijos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener la lista de hijos'
    });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  getMyChildren
};
