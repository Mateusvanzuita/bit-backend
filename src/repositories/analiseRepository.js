const prisma = require('../config/database');
const BaseRepository = require('./baseRepository');

class AnaliseRepository extends BaseRepository {
  constructor() {
    super('analise');
  }

  // Busca a estrutura completa da análise para o App montar o formulário
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

  // Cria o cabeçalho do histórico antes de salvar as respostas individuais
  async createHistorico(petId, analiseId) {
    return await prisma.analiseHistorico.create({
      data: {
        petId,
        analiseId,
        concluida: true // Definimos como concluída ao finalizar o envio
      }
    });
  }

  // Salva cada resposta individual vinculada ao histórico
  async createResposta(data) {
    return await prisma.analiseResposta.create({ data });
  }
}

module.exports = new AnaliseRepository();