// src/repositories/cupomRepository.js
const prisma = require('../config/database');
const BaseRepository = require('./baseRepository');

class CupomRepository extends BaseRepository {
  constructor() {
    super('cupom');
  }

  // Busca cupom com pet shop incluso (para snapshots no resgate)
  async findByIdWithPetShop(id) {
    return await prisma.cupom.findUnique({
      where: { id },
      include: {
        petShop: {
          select: {
            id: true,
            nome: true,
            ativo: true,
            planoAtivo: true,
          },
        },
      },
    });
  }

  // Todos os cupons ativos de um pet shop com contagem de resgates do usuário
  async findAtivosByPetShop(petShopId, userId) {
    const agora = new Date();
    const cupons = await prisma.cupom.findMany({
      where: {
        petShopId,
        ativo: true,
        OR: [{ dataFim: null }, { dataFim: { gt: agora } }],
      },
      orderBy: [{ tipo: 'asc' }, { dataFim: 'asc' }],
    });

    // Enriquece com status de resgate do usuário
    const ids = cupons.map((c) => c.id);
    const resgatesUser = await prisma.cupomResgate.findMany({
      where: { cupomId: { in: ids }, userId },
      select: { cupomId: true, status: true, resgatadoEm: true, dataFimSnapshot: true },
    });

    const resgateMap = Object.fromEntries(resgatesUser.map((r) => [r.cupomId, r]));

    return cupons.map((c) => ({
      ...c,
      resgate: resgateMap[c.id] || null,
    }));
  }

  // Cupons de todos os pet shops que o usuário segue (feed personalizado)
  async findFeedUsuario(userId) {
    const agora = new Date();

    // IDs dos pet shops seguidos
    const seguindo = await prisma.petShopSeguidor.findMany({
      where: { userId },
      select: { petShopId: true },
    });
    const petShopIds = seguindo.map((s) => s.petShopId);
    if (petShopIds.length === 0) return [];

    const cupons = await prisma.cupom.findMany({
      where: {
        petShopId: { in: petShopIds },
        ativo: true,
        OR: [{ dataFim: null }, { dataFim: { gt: agora } }],
      },
      include: {
        petShop: {
          select: { id: true, nome: true, logoUrl: true, cidade: true },
        },
      },
      orderBy: [{ dataFim: 'asc' }, { createdAt: 'desc' }],
    });

    // Enriquece com status de resgate
    const ids = cupons.map((c) => c.id);
    const resgatesUser = await prisma.cupomResgate.findMany({
      where: { cupomId: { in: ids }, userId },
      select: { cupomId: true, status: true },
    });
    const resgateMap = Object.fromEntries(resgatesUser.map((r) => [r.cupomId, r]));

    return cupons.map((c) => ({ ...c, resgate: resgateMap[c.id] || null }));
  }

  // Incrementa contador de resgates atomicamente
  async incrementarTotalResgates(id) {
    return await prisma.cupom.update({
      where: { id },
      data: { totalResgates: { increment: 1 } },
    });
  }
}

module.exports = new CupomRepository();