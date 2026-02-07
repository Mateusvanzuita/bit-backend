const prisma = require('../config/database');
const BaseRepository = require('./baseRepository');

class PetRepository extends BaseRepository {
  constructor() {
    // Passa o nome do model 'pet' para o BaseRepository
    super('pet');
  }

  /**
   * Busca todos os pets vinculados a um usuário específico
   */
  async findByUserId(userId) {
    return await prisma.pet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Busca um pet específico garantindo que ele pertença ao usuário logado
   * Útil para operações de Show, Update e Delete com segurança.
   */
  async findByIdAndUser(id, userId) {
    return await prisma.pet.findFirst({
      where: {
        id: id,
        userId: userId
      }
    });
  }
}

module.exports = new PetRepository();