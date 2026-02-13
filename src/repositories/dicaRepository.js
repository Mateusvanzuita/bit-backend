const prisma = require('../config/database');
const BaseRepository = require('./baseRepository');

class DicaRepository extends BaseRepository {
  constructor() {
    super('dica');
  }

  async findFullDica(id) {
    return await prisma.dica.findUnique({
      where: { id },
      include: {
        etapas: {
          orderBy: { ordem: 'asc' },
          include: { opcoes: { orderBy: { ordem: 'asc' } } }
        }
      }
    });
  }

  async createHistorico(petId, dicaId) {
    return await prisma.petDicaHistorico.create({
      data: { petId, dicaId, concluida: true }
    });
  }

  async createResposta(data) {
    return await prisma.petDicaResposta.create({ data });
  }

  async updateResultadoIA(historicoId, textoIA) {
    return await prisma.petDicaHistorico.update({
      where: { id: historicoId },
      data: { resultadoIA: textoIA }
    });
  }

  async findHistoricoById(id) {
    return await prisma.petDicaHistorico.findUnique({
      where: { id },
      include: { pet: true, dica: true }
    });
  }
}

module.exports = new DicaRepository();