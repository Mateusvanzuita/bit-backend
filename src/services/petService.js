// src/services/petService.js
const petRepository = require('../repositories/petRepository');
const { AppError } = require('../middlewares/errorHandler');

class PetService {
  async createPet(userId, petData) {
    return await petRepository.create({
      ...petData,
      userId,
      dataNascimento: petData.dataNascimento ? new Date(petData.dataNascimento) : null
    });
  }

  async getAllPets(userId) {
    return await petRepository.findByUserId(userId);
  }

  async getPetById(id, userId) {
    const pet = await petRepository.findByIdAndUser(id, userId);
    if (!pet) throw new AppError('Pet não encontrado', 404);
    return pet;
  }

  async updatePet(id, userId, updateData) {
    const pet = await petRepository.findByIdAndUser(id, userId);
    if (!pet) throw new AppError('Pet não encontrado ou permissão negada', 404);

    if (updateData.dataNascimento) {
      updateData.dataNascimento = new Date(updateData.dataNascimento);
    }

    return await petRepository.update(id, updateData);
  }

  async deletePet(id, userId) {
    const pet = await petRepository.findByIdAndUser(id, userId);
    if (!pet) throw new AppError('Pet não encontrado', 404);
    
    return await petRepository.delete(id);
  }
}

module.exports = new PetService();