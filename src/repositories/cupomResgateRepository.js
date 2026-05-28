// src/repositories/cupomResgateRepository.js
const prisma = require('../config/database');
const BaseRepository = require('./baseRepository');

class CupomResgateRepository extends BaseRepository {
  constructor() {
    super('cupomResgate');
  }

  // Verifica se o usuário já resgatou este cupom
  async findByUserAndCupom(userId, cupomId) {
    return await prisma.cupomResgate.findUnique({
      where: { cupomId_userId: { cupomId, userId } },
    });
  }

  // Todos os resgates ativos do usuário (carteira de cupons)
  async findCarteiraUsuario(userId) {
    return await prisma.cupomResgate.findMany({
      where: { userId },
      orderBy: [
        { status: 'asc' },        // ATIVO primeiro
        { resgatadoEm: 'desc' },
      ],
      include: {
        cupom: {
          select: {
            id: true,
            titulo: true,
            descricao: true,
            iconeTipo: true,
            valorDesconto: true,
            tipoDesconto: true,
            tipo: true,
          },
        },
      },
    });
  }

  // Métricas do pet shop: resgates agrupados por mês
  async metricasPorPetShop(petShopId) {
    // Contagem total e por cupom
    const porCupom = await prisma.cupomResgate.groupBy({
      by: ['cupomId'],
      where: { petShopId },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // Contagem do mês corrente
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const totalMes = await prisma.cupomResgate.count({
      where: {
        petShopId,
        resgatadoEm: { gte: inicioMes },
      },
    });

    const totalGeral = await prisma.cupomResgate.count({
      where: { petShopId },
    });

    return { porCupom, totalMes, totalGeral };
  }

  // Job de expiração: marca como EXPIRADO resgates vencidos
  async expirarVencidos() {
    const agora = new Date();
    return await prisma.cupomResgate.updateMany({
      where: {
        status: 'ATIVO',
        dataFimSnapshot: { lte: agora },
      },
      data: {
        status: 'EXPIRADO',
        expiradoEm: agora,
      },
    });
  }
}

module.exports = new CupomResgateRepository();