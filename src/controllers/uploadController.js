// src/controllers/uploadController.js
const asyncHandler = require('../utils/asyncHandler');
const userRepository = require('../repositories/userRepository');
const cloudinary = require('../config/cloudinary');

class UploadController {
  /**
   * Upload de foto do perfil do usuário
   * POST /api/v1/perfil/avatar
   */
  uploadUserPhoto = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        status: 'fail',
        message: 'Nenhuma imagem enviada.',
      });
    }

    const user = await userRepository.findById(userId);

    // Deleta avatar antigo do Cloudinary se existir
    if (user?.avatar) {
      try {
        const publicId = extractPublicId(user.avatar);
        if (publicId) await cloudinary.uploader.destroy(publicId);
      } catch (e) {
        console.warn('⚠️ Não foi possível deletar avatar antigo:', e.message);
      }
    }

    // Salva nova URL no campo 'avatar'
    const updatedUser = await userRepository.update(userId, {
      avatar: req.file.path,
    });

    console.log(`✅ [UPLOAD] Avatar do usuário ${userId} atualizado: ${req.file.path}`);

    res.status(200).json({
      status: 'success',
      data: {
        avatarUrl: req.file.path,
        user: updatedUser,
      },
    });
  });
}

function extractPublicId(url) {
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    const withoutVersion = parts[1].replace(/^v\d+\//, '');
    return withoutVersion.replace(/\.[^.]+$/, '');
  } catch {
    return null;
  }
}

module.exports = new UploadController();