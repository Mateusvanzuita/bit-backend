// src/repositories/analiseRepository.js
const prisma = require('../config/database');
const BaseRepository = require('./baseRepository');

class AnaliseRepository extends BaseRepository {
  constructor() {
    super('analise');
  }

async createHistorico(petId, analiseId) {
  return await prisma.analiseHistorico.create({
    data: {
      petId: petId,      // Corrigido: usando o parâmetro da função
      analiseId: analiseId, // Corrigido: usando o parâmetro da função
      concluida: false   // Inicia como false até a IA responder
    }
  });
}

  async findFullAnalise(id) {
    return await prisma.analise.findUnique({
      where: { id },
      include: {
        etapas: {
          orderBy: { ordem: 'asc' },
          include: { opcoes: { orderBy: { ordem: 'asc' } } }
        }
      }
    });
  }

  async findById(id) {
    return await prisma.analise.findUnique({
      where: { id },
      select: {
        id: true,
        titulo: true,
        prompt: true
      }
    });
  }

  async updateResultadoIA(historicoId, textoIA) {
    return await prisma.analiseHistorico.update({
      where: { id: historicoId },
      data: { resultadoIA: textoIA }
    });
  }

  async createResposta(data) {
    return await prisma.analiseResposta.create({ data });
  }

  async findHistoricoById(id) {
  return await prisma.analiseHistorico.findUnique({
    where: { id },
    include: { analise: true } // Inclui dados da análise se precisar do título no frontend
  });
}
}

module.exports = new AnaliseRepository();