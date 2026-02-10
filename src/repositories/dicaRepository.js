const prisma = require('../config/database');
const BaseRepository = require('./baseRepository');

class DicaRepository extends BaseRepository {
  constructor() {
    super('dica');
  }

  // Busca a dica com todas as relações para montar o questionário no App
  async findFullDica(id) {
    return await prisma.dica.findUnique({
      where: { id },
      include: {
        etapas: {
          orderBy: { ordem: 'asc' },
          include: {
            opcoes: { orderBy: { ordem: 'asc' } }
          }
        }
      }
    });
  }

  // Registra ou atualiza a resposta do pet para uma etapa específica
  async upsertResposta(petId, dicaId, etapaId, opcaoId) {
    return await prisma.petDicaResposta.upsert({
      where: {
        petId_dicaId_etapaId: { petId, dicaId, etapaId }
      },
      update: { opcaoId },
      create: { petId, dicaId, etapaId, opcaoId }
    });
  }
}

module.exports = new DicaRepository();