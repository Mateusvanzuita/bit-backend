// src/repositories/sosRepository.js
const prisma = require('../config/database');
const BaseRepository = require('./baseRepository');

class SosRepository extends BaseRepository {
  constructor() {
    // Passa o nome do model 'sosAtendimento' definido no seu schema.prisma
    super('sosAtendimento');
  }

  /**
   * Busca um atendimento específico garantindo que pertença ao usuário logado.
   * Útil para carregar a tela de chat com segurança.
   */
  async findByIdAndUser(id, userId) {
    return await prisma.sosAtendimento.findFirst({
      where: {
        id: id,
        userId: userId
      },
      include: {
        pet: {
          select: {
            nome: true,
            especie: true
          }
        }
      }
    });
  }

  /**
   * Busca todos os atendimentos de um usuário específico
   */
  async findByUserId(userId) {
    return await prisma.sosAtendimento.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        pet: {
          select: {
            nome: true,
            foto: true
          }
        }
      }
    });
  }
}

module.exports = new SosRepository();