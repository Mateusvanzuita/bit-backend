const prisma = require('../config/database');

class OfertaRepository {
  async listarAtivasProximas({ cidade, estado, limite = 20 }) {
    return prisma.ofertaProduto.findMany({
      where: {
        ativo: true,
        petShop: {
          ativo: true,
          ...(cidade && estado ? { cidade, estado } : {}),
        },
      },
      include: {
        petShop: { select: { id: true, nome: true, whatsapp: true, telefone: true } },
      },
      orderBy: [{ destaque: 'desc' }, { createdAt: 'desc' }],
      take: limite,
    });
  }

  async buscarPorId(id) {
    return prisma.ofertaProduto.findUnique({
      where: { id },
      include: { petShop: { select: { id: true, nome: true, whatsapp: true, telefone: true } } },
    });
  }

  async registrarClique(dados) {
    return prisma.ofertaClique.create({ data: dados });
  }

  // ── Admin ──────────────────────────────────────────────────

  async listarDoPetShop(petShopId) {
    return prisma.ofertaProduto.findMany({
      where: { petShopId },
      orderBy: [{ destaque: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async criar(dados) {
    return prisma.ofertaProduto.create({ data: dados });
  }

  async atualizar(id, dados) {
    return prisma.ofertaProduto.update({ where: { id }, data: dados });
  }

  async remover(id) {
    return prisma.ofertaProduto.delete({ where: { id } });
  }

  async listarCliques({ petShopId, ofertaId, dataInicio, dataFim, pagina = 1, porPagina = 30 }) {
    const where = {
      ...(petShopId ? { petShopId } : {}),
      ...(ofertaId ? { ofertaId } : {}),
      ...(dataInicio || dataFim
        ? {
            criadoEm: {
              ...(dataInicio ? { gte: new Date(dataInicio) } : {}),
              ...(dataFim ? { lte: new Date(dataFim) } : {}),
            },
          }
        : {}),
    };

    const [dados, total] = await Promise.all([
      prisma.ofertaClique.findMany({
        where,
        include: { user: { select: { nome: true, email: true } } },
        orderBy: { criadoEm: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
      prisma.ofertaClique.count({ where }),
    ]);

    return { dados, total, pagina, porPagina };
  }
}

module.exports = new OfertaRepository();