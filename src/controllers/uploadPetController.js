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

  /**
   * Upload de foto do pet
   * POST /api/v1/pets/:id/foto
   */
  uploadPetPhoto = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const petId = req.params.id;

    if (!req.file) {
      return res.status(400).json({
        status: 'fail',
        message: 'Nenhuma imagem enviada.',
      });
    }

    const petRepository = require('../repositories/petRepository');

    const pet = await petRepository.findByIdAndUser(petId, userId);
    if (!pet) {
      return res.status(404).json({ status: 'fail', message: 'Pet não encontrado.' });
    }

    // Deleta foto antiga do Cloudinary se existir
    if (pet.foto) {
      try {
        const publicId = extractPublicId(pet.foto);
        if (publicId) await cloudinary.uploader.destroy(publicId);
      } catch (e) {
        console.warn('⚠️ Não foi possível deletar foto antiga do pet:', e.message);
      }
    }

    const updatedPet = await petRepository.update(petId, { foto: req.file.path });

    console.log(`✅ [UPLOAD] Foto do pet ${petId} atualizada: ${req.file.path}`);

    res.status(200).json({
      status: 'success',
      data: {
        fotoUrl: req.file.path,
        pet: updatedPet,
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