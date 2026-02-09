// src/services/petService.js
const petRepository = require('../repositories/petRepository');
const { AppError } = require('../middlewares/errorHandler');

class PetService {
async createPet(userId, petData) {
  // 1. Mapeamos os campos exatamente como seu App envia no register.tsx
  const formattedData = {
    nome: petData.nome,        // O App envia 'nome' e não 'name'
    raca: petData.raca,        // O App envia 'raca' e não 'breed'
    sexo: petData.sexo,        // O App já envia 'MACHO' ou 'FEMEA'
    
    // O App envia 'dog' ou 'cat', o Prisma exige 'CACHORRO' ou 'GATO'
    especie: petData.especie === 'DOG' ? 'CACHORRO' : 'GATO', 
    
    porte: petData.porte?.toUpperCase() || 'MEDIO',
    peso: parseFloat(petData.peso) || 0,
    idade: parseInt(petData.idade) || 0,
    meses: parseInt(petData.meses) || 0,
    cor: petData.cor,
    castrado: petData.castrado || false,
    comportamento: petData.comportamento || 'CALMO',
    convivencia: petData.convivencia || [],
    userId: userId,
    dataNascimento: petData.dataNascimento ? new Date(petData.dataNascimento) : null
  };

  // 2. Agora o Prisma receberá todos os campos preenchidos corretamente
  return await petRepository.create(formattedData);
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