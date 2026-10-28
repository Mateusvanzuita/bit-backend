// src/repositories/cupomResgateRepository.js
const prisma = require('../config/database');
const BaseRepository = require('./baseRepository');

class CupomResgateRepository extends BaseRepository {
  constructor() {
    super('cupomResgate');
  }

  async findByUserAndCupom(userId, cupomId) {
    return await prisma.cupomResgate.findUnique({
      where: { cupomId_userId: { cupomId, userId } },
    });
  }

  async findCarteiraUsuario(userId) {
    return await prisma.cupomResgate.findMany({
      where: { userId },
      orderBy: [
        { status: 'asc' },
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
            tipoBeneficio: true,
            tipo: true,
            duracaoTipo: true,
            codigoDisplay: true,
            limiteUsoPorUser: true,
          },
        },
      },
    });
  }

  async metricasPorPetShop(petShopId) {
    const porCupom = await prisma.cupomResgate.groupBy({
      by: ['cupomId'],
      where: { petShopId },
      _count: { id: true },
      _sum: { totalUsos: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const statusRaw = await prisma.cupomResgate.groupBy({
      by: ['status'],
      where: { petShopId },
      _count: { id: true },
    });
    const porStatus = Object.fromEntries(statusRaw.map((s) => [s.status, s._count.id]));
    const usos = await prisma.cupomResgate.aggregate({
      where: { petShopId },
      _sum: { totalUsos: true },
    });

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

    return { porCupom, totalMes, totalGeral, porStatus, totalUsos: usos._sum.totalUsos ?? 0 };
  }

  // Uso de cada cupom publicado pelo CRM (chave: origemCrmCupomId), para o CRM mostrar "usado X vezes".
  async usoPorCupomDoCrm(petShopId) {
    const cupons = await prisma.cupom.findMany({
      where: { petShopId, origemCrmCupomId: { not: null } },
      select: { id: true, origemCrmCupomId: true, limiteUsoPorUser: true, dataInicio: true, dataFim: true },
    });
    const grupos = await prisma.cupomResgate.groupBy({
      by: ['cupomId', 'status'],
      where: { petShopId },
      _count: { id: true },
      _sum: { totalUsos: true },
    });

    return cupons.map((c) => {
      const meus = grupos.filter((g) => g.cupomId === c.id);
      const conta = (st) => meus.find((g) => g.status === st)?._count.id ?? 0;
      return {
        origemCrmCupomId: c.origemCrmCupomId,
        limiteUsoPorUser: c.limiteUsoPorUser,
        dataInicio: c.dataInicio,
        dataFim: c.dataFim,
        resgatados: meus.reduce((a, g) => a + g._count.id, 0),
        ativos: conta('ATIVO'),
        utilizados: conta('UTILIZADO'),
        expirados: conta('EXPIRADO'),
        usosTotais: meus.reduce((a, g) => a + (g._sum.totalUsos ?? 0), 0),
      };
    });
  }

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

  // Busca resgates ativos que vencem dentro de um intervalo de tempo
  // e ainda não receberam o aviso daquele nível
  async findVencendoEm({ de, ate, nivel }) {
    return await prisma.cupomResgate.findMany({
      where: {
        status: 'ATIVO',
        OR: [{ avisoEnviado: null }, { avisoEnviado: { not: nivel } }],
        dataFimSnapshot: {
          gte: de,
          lte: ate,
        },
      },
      select: {
        id: true,
        userId: true,
        cupomTitulo: true,
        dataFimSnapshot: true,
        descontoSnapshot: true,
      },
    });
  }

  // Marca o nível de aviso enviado
  async marcarAvisoEnviado(id, nivel) {
    return await prisma.cupomResgate.update({
      where: { id },
      data: { avisoEnviado: nivel },
    });
  }

  async findClientesSumidos(diasSemUso = 30) {
      const agora = new Date();
      const limiteInicio = new Date(agora.getTime() - (diasSemUso + 1) * 24 * 60 * 60 * 1000);
      const limiteFim   = new Date(agora.getTime() - diasSemUso * 24 * 60 * 60 * 1000);

      // Usuários cujo ÚLTIMO uso está entre 30 e 31 dias atrás
      // Garante que o job diário só pega cada usuário uma vez (na janela exata de 30 dias)
      const resultado = await prisma.$queryRaw`
        SELECT
          cr."userId",
          MAX(cr."utilizadoEm") AS "ultimoUso"
        FROM cupom_resgates cr
        WHERE
          cr.status = 'UTILIZADO'
          AND cr."utilizadoEm" IS NOT NULL
        GROUP BY cr."userId"
        HAVING
          MAX(cr."utilizadoEm") >= ${limiteInicio}
          AND MAX(cr."utilizadoEm") <  ${limiteFim}
      `;

      return resultado;
    }
}

module.exports = new CupomResgateRepository();