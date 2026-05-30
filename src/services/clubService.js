// src/services/clubService.js
const prisma = require('../config/database');
const petShopRepository = require('../repositories/petShopRepository');
const cupomRepository = require('../repositories/cupomRepository');
const cupomResgateRepository = require('../repositories/cupomResgateRepository');
const notificationService = require('./notificationService');
const { AppError } = require('../middlewares/errorHandler');

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcDistanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcularDataFim(duracaoTipo, dataInicio = new Date()) {
  switch (duracaoTipo) {
    case 'PERMANENTE':
      return null;
    case 'MENSAL': {
      const fim = new Date(dataInicio);
      fim.setMonth(fim.getMonth() + 1);
      fim.setDate(0);
      fim.setHours(23, 59, 59, 999);
      return fim;
    }
    case 'SEMANAL':
      return new Date(dataInicio.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'FLASH':
    case 'HORAS_24':
      return new Date(dataInicio.getTime() + 24 * 60 * 60 * 1000);
    case 'HAPPY_HOUR': {
      const fim = new Date(dataInicio);
      fim.setHours(23, 59, 59, 999);
      return fim;
    }
    case 'SAZONAL':
      return null;
    case 'SEMANA_1':
      return new Date(dataInicio.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'ILIMITADO':
    default:
      return null;
  }
}

// ── Serviço ───────────────────────────────────────────────────────────────────

class ClubService {

  // ── PET SHOPS ──────────────────────────────────────────────────────────────

  async listarPetShops(userId, { latitude, longitude, cidade, estado, raioKm }) {
    const petShops = await petShopRepository.findNearby({
      latitude,
      longitude,
      cidade,
      estado,
      raioKm: raioKm || 30,
    });

    const [seguidores, favorito] = await Promise.all([
      prisma.petShopSeguidor.findMany({
        where: { userId },
        select: { petShopId: true },
      }),
      prisma.petShopFavorito.findUnique({
        where: { userId },
        select: { petShopId: true },
      }),
    ]);

    const seguindoSet = new Set(seguidores.map((s) => s.petShopId));

    return petShops
      .map((ps) => ({
        ...ps,
        distanciaKm:
          latitude && longitude
            ? Number(calcDistanciaKm(latitude, longitude, ps.latitude, ps.longitude).toFixed(1))
            : null,
        seguindo: seguindoSet.has(ps.id),
        favorito: favorito?.petShopId === ps.id,
      }))
      .sort((a, b) => (a.distanciaKm ?? 999) - (b.distanciaKm ?? 999));
  }

  async detalhesPetShop(petShopId, userId) {
    const petShop = await petShopRepository.findByIdWithDetails(petShopId);
    if (!petShop) throw new AppError('Pet shop não encontrado', 404);
    if (!petShop.ativo || !petShop.planoAtivo)
      throw new AppError('Este pet shop não faz parte do Bitzy Club', 403);

    const [seguindo, favorito, cupons] = await Promise.all([
      prisma.petShopSeguidor.findUnique({
        where: { userId_petShopId: { userId, petShopId } },
      }),
      prisma.petShopFavorito.findUnique({ where: { userId } }),
      cupomRepository.findAtivosByPetShop(petShopId, userId),
    ]);

    return {
      ...petShop,
      seguindo: !!seguindo,
      favorito: favorito?.petShopId === petShopId,
      cupons,
    };
  }

  async criarPetShop(dados) {
    const existente = await prisma.petShop.findFirst({
      where: {
        nome: { equals: dados.nome, mode: 'insensitive' },
        cidade: { equals: dados.cidade, mode: 'insensitive' },
        estado: dados.estado.toUpperCase(),
      },
    });

    if (existente) {
      throw new AppError('Já existe um pet shop com este nome nesta cidade', 409);
    }

    return await petShopRepository.criar({
      ...dados,
      estado: dados.estado.toUpperCase(),
    });
  }

  // ── SEGUIR / DEIXAR DE SEGUIR ──────────────────────────────────────────────

  async seguirPetShop(userId, petShopId) {
    const petShop = await petShopRepository.findById(petShopId);
    if (!petShop || !petShop.ativo || !petShop.planoAtivo)
      throw new AppError('Pet shop não encontrado no Bitzy Club', 404);

    await prisma.petShopSeguidor.upsert({
      where: { userId_petShopId: { userId, petShopId } },
      create: { userId, petShopId },
      update: {},
    });

    return { seguindo: true };
  }

  async deixarDeSeguir(userId, petShopId) {
    await prisma.petShopSeguidor.deleteMany({
      where: { userId, petShopId },
    });

    const favorito = await prisma.petShopFavorito.findUnique({
      where: { userId },
    });
    if (favorito?.petShopId === petShopId) {
      await prisma.petShopFavorito.delete({ where: { userId } });
    }

    return { seguindo: false };
  }

  // ── FAVORITAR PET SHOP ────────────────────────────────────────────────────

  async favoritarPetShop(userId, petShopId) {
    const petShop = await petShopRepository.findById(petShopId);
    if (!petShop || !petShop.ativo || !petShop.planoAtivo)
      throw new AppError('Pet shop não encontrado no Bitzy Club', 404);

    const favoritoAtual = await prisma.petShopFavorito.findUnique({
      where: { userId },
    });

    if (favoritoAtual?.petShopId === petShopId)
      throw new AppError('Este pet shop já é o seu favorito', 409);

    await prisma.$transaction(async (tx) => {
      if (favoritoAtual) {
        await tx.petShopFavorito.delete({ where: { userId } });
        await tx.cupomResgate.updateMany({
          where: {
            userId,
            petShopId: favoritoAtual.petShopId,
            cupom: { tipo: 'FAVORITO' },
            status: 'ATIVO',
          },
          data: { status: 'EXPIRADO', expiradoEm: new Date() },
        });
      }

      await tx.petShopFavorito.create({
        data: {
          userId,
          petShopId,
          descontoSnapshot: petShop.descontoFavorito,
        },
      });

      await tx.petShopSeguidor.upsert({
        where: { userId_petShopId: { userId, petShopId } },
        create: { userId, petShopId },
        update: {},
      });

      let cupomFavorito = await tx.cupom.findFirst({
        where: { petShopId, tipo: 'FAVORITO', ativo: true },
      });

      if (!cupomFavorito) {
        cupomFavorito = await tx.cupom.create({
          data: {
            petShopId,
            titulo: `${petShop.descontoFavorito}% OFF em todas as compras`,
            descricao: `Desconto exclusivo para clientes fiéis do ${petShop.nome}`,
            tipo: 'FAVORITO',
            valorDesconto: petShop.descontoFavorito,
            tipoBeneficio: 'DESCONTO_PERCENTUAL',
            duracaoTipo: 'PERMANENTE',
            iconeTipo: 'VIP',
          },
        });
      }

      await tx.cupomResgate.upsert({
        where: { cupomId_userId: { cupomId: cupomFavorito.id, userId } },
        create: {
          cupomId: cupomFavorito.id,
          userId,
          petShopId,
          status: 'ATIVO',
          petShopNome: petShop.nome,
          cupomTitulo: cupomFavorito.titulo,
          descontoSnapshot: petShop.descontoFavorito,
          dataFimSnapshot: null,
        },
        update: { status: 'ATIVO', expiradoEm: null },
      });
    });

    // ── Notificação: favorito confirmado ──────────────────────────────────
    await notificationService.notificar(userId, {
      titulo: `${petShop.nome} é seu favorito! ⭐`,
      mensagem: `Você ganhou ${petShop.descontoFavorito}% de desconto exclusivo em todas as compras.`,
      tipo: 'SISTEMA',
      pathKey: `/club/petshops/${petShopId}`,
    });

    return {
      favorito: true,
      descontoFavorito: petShop.descontoFavorito,
      petShopNome: petShop.nome,
    };
  }

  async desfavoritarPetShop(userId) {
    const favorito = await prisma.petShopFavorito.findUnique({
      where: { userId },
    });
    if (!favorito) throw new AppError('Você não tem nenhum pet shop favorito', 404);

    await prisma.$transaction(async (tx) => {
      await tx.petShopFavorito.delete({ where: { userId } });
      await tx.cupomResgate.updateMany({
        where: {
          userId,
          petShopId: favorito.petShopId,
          status: 'ATIVO',
          cupom: { tipo: 'FAVORITO' },
        },
        data: { status: 'EXPIRADO', expiradoEm: new Date() },
      });
    });

    return { favorito: false };
  }

  // ── CUPONS ────────────────────────────────────────────────────────────────

  async listarCuponsDisponiveis(userId, { latitude, longitude, cidade, estado }) {
    const petShops = await petShopRepository.findNearby({
      latitude,
      longitude,
      cidade,
      estado,
      raioKm: 30,
    });
    const petShopIds = petShops.map((ps) => ps.id);
    if (petShopIds.length === 0) return [];

    const agora = new Date();
    const cupons = await prisma.cupom.findMany({
      where: {
        petShopId: { in: petShopIds },
        ativo: true,
        tipo: { not: 'FAVORITO' },
        OR: [{ dataFim: null }, { dataFim: { gt: agora } }],
      },
      include: {
        petShop: {
          select: { id: true, nome: true, logoUrl: true, cidade: true, estado: true },
        },
      },
      orderBy: [{ dataFim: 'asc' }, { createdAt: 'desc' }],
    });

    const ids = cupons.map((c) => c.id);
    const resgates = await prisma.cupomResgate.findMany({
      where: { cupomId: { in: ids }, userId },
      select: { cupomId: true, status: true, resgatadoEm: true },
    });
    const resgateMap = Object.fromEntries(resgates.map((r) => [r.cupomId, r]));

    const distMap = Object.fromEntries(
      petShops.map((ps) => [
        ps.id,
        latitude && longitude
          ? Number(calcDistanciaKm(latitude, longitude, ps.latitude, ps.longitude).toFixed(1))
          : null,
      ]),
    );

    return cupons.map((c) => ({
      ...c,
      distanciaKm: distMap[c.petShopId] ?? null,
      resgate: resgateMap[c.id] || null,
    }));
  }

  async resgatarCupom(userId, cupomId) {
    const cupom = await cupomRepository.findByIdWithPetShop(cupomId);

    if (!cupom || !cupom.ativo)
      throw new AppError('Cupom não encontrado ou inativo', 404);
    if (!cupom.petShop.ativo || !cupom.petShop.planoAtivo)
      throw new AppError('Este pet shop não está mais ativo no Bitzy Club', 403);

    const agora = new Date();
    if (cupom.dataFim && cupom.dataFim < agora)
      throw new AppError('Este cupom já expirou', 410);

    if (cupom.limiteUsoTotal && cupom.totalResgates >= cupom.limiteUsoTotal)
      throw new AppError('Este cupom atingiu o limite de resgates', 409);

    const resgateExistente = await cupomResgateRepository.findByUserAndCupom(userId, cupomId);
    if (resgateExistente) {
      if (resgateExistente.status === 'ATIVO')
        throw new AppError('Você já resgatou este cupom e ele ainda está ativo', 409);
      if (resgateExistente.status === 'UTILIZADO')
        throw new AppError('Você já utilizou este cupom', 409);
    }

    const dataFimResgate = calcularDataFim(cupom.duracaoTipo, agora);

    let resgate;
    await prisma.$transaction(async (tx) => {
      resgate = await tx.cupomResgate.create({
        data: {
          cupomId,
          userId,
          petShopId: cupom.petShopId,
          status: 'ATIVO',
          petShopNome: cupom.petShop.nome,
          cupomTitulo: cupom.titulo,
          cupomCategoria: cupom.categoria ?? null,
          tipoBeneficioSnapshot: cupom.tipoBeneficio ?? null,
          descontoSnapshot: cupom.valorDesconto,
          dataFimSnapshot: dataFimResgate,
        },
      });

      await tx.cupom.update({
        where: { id: cupomId },
        data: { totalResgates: { increment: 1 } },
      });
    });

    // ── Notificação: cupom resgatado ──────────────────────────────────────
    await notificationService.notificar(userId, {
      titulo: 'Cupom resgatado! 🎉',
      mensagem: `Seu cupom "${cupom.titulo}" está na sua carteira.`,
      tipo: 'SISTEMA',
      pathKey: '/club/carteira',
    });

    return resgate;
  }

  async utilizarCupom(userId, resgateId) {
    const resgate = await prisma.cupomResgate.findUnique({
      where: { id: resgateId },
    });

    if (!resgate) throw new AppError('Resgate não encontrado', 404);
    if (resgate.userId !== userId) throw new AppError('Não autorizado', 403);
    if (resgate.status !== 'ATIVO')
      throw new AppError(
        resgate.status === 'UTILIZADO'
          ? 'Este cupom já foi utilizado'
          : 'Este cupom está expirado',
        409,
      );

    if (resgate.dataFimSnapshot && resgate.dataFimSnapshot < new Date())
      throw new AppError('Este cupom expirou', 410);

    return await prisma.cupomResgate.update({
      where: { id: resgateId },
      data: { status: 'UTILIZADO', utilizadoEm: new Date() },
    });
  }

  // ── CARTEIRA ──────────────────────────────────────────────────────────────

  async carteiraCupons(userId) {
    return await cupomResgateRepository.findCarteiraUsuario(userId);
  }

  // ── CRIAR CUPOM ───────────────────────────────────────────────────────────

  async criarCupom(petShopId, dados) {
    const petShop = await petShopRepository.findById(petShopId);
    if (!petShop) throw new AppError('Pet shop não encontrado', 404);
    if (!petShop.planoAtivo)
      throw new AppError('Plano Bitzy Club inativo para este pet shop', 403);

    const totalAtivos = await prisma.cupom.count({
      where: { petShopId, ativo: true },
    });

    const limite = petShop.limiteCuponsAtivos ?? 10;
    if (totalAtivos >= limite) {
      throw new AppError(
        `Este pet shop já atingiu o limite de ${limite} cupons ativos. Desative um cupom antes de criar outro.`,
        409,
      );
    }

    const { duracaoTipo, dataFim: dataFimManual, ...resto } = dados;
    const tipo = duracaoTipo || 'PERMANENTE';

    let dataFim;
    if (tipo === 'SAZONAL' && dataFimManual) {
      dataFim = new Date(dataFimManual);
    } else {
      dataFim = calcularDataFim(tipo);
    }

    const cupom = await prisma.cupom.create({
      data: {
        petShopId,
        duracaoTipo: tipo,
        dataFim,
        ...resto,
      },
    });

    // ── Notificação: novo cupom para todos os seguidores ──────────────────
    // Busca seguidores do pet shop e notifica em paralelo (best-effort)
    const seguidores = await prisma.petShopSeguidor.findMany({
      where: { petShopId },
      select: { userId: true },
    });

    await Promise.allSettled(
      seguidores.map((s) =>
        notificationService.notificar(s.userId, {
          titulo: `Novo benefício em ${petShop.nome}! 🚀`,
          mensagem: cupom.descricao
            ? `${cupom.titulo} — ${cupom.descricao}`
            : cupom.titulo,
          tipo: 'SISTEMA',
          pathKey: `/club/petshops/${petShopId}`,
        }),
      ),
    );

    return cupom;
  }

  async atualizarCupom(cupomId, petShopId, dados) {
    const cupom = await prisma.cupom.findUnique({ where: { id: cupomId } });
    if (!cupom || cupom.petShopId !== petShopId)
      throw new AppError('Cupom não encontrado', 404);

    return await prisma.cupom.update({
      where: { id: cupomId },
      data: dados,
    });
  }

  async desativarCupom(cupomId, petShopId) {
    const cupom = await prisma.cupom.findUnique({ where: { id: cupomId } });
    if (!cupom || cupom.petShopId !== petShopId)
      throw new AppError('Cupom não encontrado', 404);

    return await prisma.cupom.update({
      where: { id: cupomId },
      data: { ativo: false },
    });
  }

  // ── MÉTRICAS ──────────────────────────────────────────────────────────────

  async metricasPetShop(petShopId) {
    const petShop = await petShopRepository.findById(petShopId);
    if (!petShop) throw new AppError('Pet shop não encontrado', 404);

    const [metricas, cuponsAtivos] = await Promise.all([
      cupomResgateRepository.metricasPorPetShop(petShopId),
      prisma.cupom.count({ where: { petShopId, ativo: true } }),
    ]);

    const totalSeguidores = await prisma.petShopSeguidor.count({
      where: { petShopId },
    });
    const totalFavoritos = await prisma.petShopFavorito.count({
      where: { petShopId },
    });

    return {
      petShopId,
      totalSeguidores,
      totalFavoritos,
      cuponsAtivos,
      resgates: metricas,
    };
  }
}

module.exports = new ClubService();