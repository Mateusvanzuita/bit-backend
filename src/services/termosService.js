const prisma = require('../config/database');
const { AppError } = require('../middlewares/errorHandler');

class TermosService {
  // Cria ou atualiza uma política de privacidade
  async upsertPolitica(data) {
    return await prisma.politicaPrivacidade.create({
      data: {
        versao: data.versao,
        conteudo: data.conteudo
      }
    });
  }

  // Cria ou atualiza um termo de uso
  async upsertTermo(data) {
    return await prisma.termoUso.create({
      data: {
        versao: data.versao,
        conteudo: data.conteudo
      }
    });
  }

  // Registra o aceite do usuário
  async registrarAceite(userId, data) {
    return await prisma.userAceiteTermos.create({
      data: {
        userId: userId,
        politicaPrivacidadeId: data.politicaPrivacidadeId,
        termoUsoId: data.termoUsoId,
        ip: data.ip
      }
    });
  }

  // Busca a versão mais recente de cada um
  async getLatestTermos() {
    const politica = await prisma.politicaPrivacidade.findFirst({
      orderBy: { publicadoEm: 'desc' }
    });
    const termo = await prisma.termoUso.findFirst({
      orderBy: { publicadoEm: 'desc' }
    });
    return { politica, termo };
  }
}

module.exports = new TermosService();