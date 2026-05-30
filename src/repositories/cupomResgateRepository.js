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
      orderBy: { _count: { id: 'desc' } },
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

    return { porCupom, totalMes, totalGeral };
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
        avisoEnviado: { not: nivel },
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