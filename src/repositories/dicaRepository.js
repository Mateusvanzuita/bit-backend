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
      data: { 
        petId, 
        dicaId, 
        concluida: false // Começa falso pois a IA ainda vai processar
      }
    });
  }

// src/repositories/dicaRepository.js

async createResposta(data) {
  return await prisma.petDicaResposta.create({
    data: {
      historicoId: data.historicoId,
      petId: data.petId,
      dicaId: data.dicaId,
      etapaId: data.etapaId,
      opcaoId: data.opcaoId || null,
      // Alterado de 'texto' para 'valor' para bater com o teu PostgreSQL
      valor: data.texto || data.valor || null 
    }
  });
}

  async updateResultadoIA(historicoId, textoIA) {
    return await prisma.petDicaHistorico.update({
      where: { id: historicoId },
      data: { 
        resultadoIA: textoIA,
        concluida: true // Agora sim marca como concluída
      }
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