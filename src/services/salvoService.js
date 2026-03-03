const prisma = require('../config/database');
const { AppError } = require('../middlewares/errorHandler');

class SalvoService {
  async salvarItem(userId, data) {
    const { titulo, descricao, tipo, referenciaId, pathKey } = data;

    // Verifica se já existe para evitar duplicatas
    const existente = await prisma.salvo.findFirst({
      where: { userId, referenciaId, tipo }
    });

    if (existente) return existente;

    return await prisma.salvo.create({
      data: {
        titulo,
        descricao,
        tipo, // 'ANALISE' ou 'DICA' (conforme seu Enum no Prisma)
        referenciaId,
        pathKey,
        userId
      }
    });
  }

  async listarSalvos(userId) {
    return await prisma.salvo.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }
}

module.exports = new SalvoService();