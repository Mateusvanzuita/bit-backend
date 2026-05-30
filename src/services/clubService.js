// src/services/clubService.js
const prisma = require('../config/database');
const petShopRepository = require('../repositories/petShopRepository');
const cupomRepository = require('../repositories/cupomRepository');
const cupomResgateRepository = require('../repositories/cupomResgateRepository');
const { AppError } = require('../middlewares/errorHandler');

// ── Helpers ──────────────────────────────────────────────────────────────────

// Calcula distância em km entre dois pontos (Haversine)
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

// Calcula dataFim com base no duracaoTipo
function calcularDataFim(duracaoTipo, dataInicio = new Date()) {
  switch (duracaoTipo) {
    // PERMANENTE — sem expiração
    case 'PERMANENTE':
      return null;
 
    // MENSAL — fim do mês corrente (último segundo do último dia)
    case 'MENSAL': {
      const fim = new Date(dataInicio);
      fim.setMonth(fim.getMonth() + 1);
      fim.setDate(0);          // último dia do mês atual
      fim.setHours(23, 59, 59, 999);
      return fim;
    }
 
    // SEMANAL — 7 dias a partir do início
    case 'SEMANAL':
      return new Date(dataInicio.getTime() + 7 * 24 * 60 * 60 * 1000);
 
    // FLASH — 24 horas (mantém compatibilidade com HORAS_24 antigo)
    case 'FLASH':
    case 'HORAS_24':
      return new Date(dataInicio.getTime() + 24 * 60 * 60 * 1000);
 
    // HAPPY_HOUR — dataFim = hoje com o horário de fim
    // O backend só valida se está dentro do horário via happyHourInicio/Fim
    // dataFim aqui é o fim do dia para não expirar fora do horário
    case 'HAPPY_HOUR': {
      const fim = new Date(dataInicio);
      fim.setHours(23, 59, 59, 999);
      return fim;
    }
 
    // SAZONAL — dataFim é fornecida explicitamente pelo admin no body
    // Retorna null aqui; o service usa o valor do body se existir
    case 'SAZONAL':
      return null; // será sobrescrito por dados.dataFim no criarCupom
 
    // SEMANA_1 — mantém compatibilidade com schema v1
    case 'SEMANA_1':
      return new Date(dataInicio.getTime() + 7 * 24 * 60 * 60 * 1000);
 
    // ILIMITADO — mantém compatibilidade com schema v1
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

    // Adiciona distância real e status de seguidor/favorito do usuário
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
      throw new AppError(
        'Já existe um pet shop com este nome nesta cidade',
        409,
      );
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

    // upsert — idempotente
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

    // Se era o favorito, remove também
    const favorito = await prisma.petShopFavorito.findUnique({
      where: { userId },
    });
    if (favorito?.petShopId === petShopId) {
      await prisma.petShopFavorito.delete({ where: { userId } });
    }

    return { seguindo: false };
  }

  // ── FAVORITAR PET SHOP ────────────────────────────────────────────────────
  // Regra: apenas 1 favorito por usuário
  // Favoritar garante o cupom permanente de descontoFavorito%

  async favoritarPetShop(userId, petShopId) {
    const petShop = await petShopRepository.findById(petShopId);
    if (!petShop || !petShop.ativo || !petShop.planoAtivo)
      throw new AppError('Pet shop não encontrado no Bitzy Club', 404);

    // Verifica se já tem favorito e é diferente
    const favoritoAtual = await prisma.petShopFavorito.findUnique({
      where: { userId },
    });

    if (favoritoAtual?.petShopId === petShopId)
      throw new AppError('Este pet shop já é o seu favorito', 409);

    // Transação: substitui favorito anterior + garante que segue + cria/atualiza cupom FAVORITO
    await prisma.$transaction(async (tx) => {
      // 1. Remove favorito anterior (se existir) e o cupom FAVORITO antigo
      if (favoritoAtual) {
        await tx.petShopFavorito.delete({ where: { userId } });

        // Desativa o cupom FAVORITO do pet shop anterior para este usuário
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

      // 2. Cria novo favorito com snapshot do desconto
      await tx.petShopFavorito.create({
        data: {
          userId,
          petShopId,
          descontoSnapshot: petShop.descontoFavorito,
        },
      });

      // 3. Garante que o usuário segue o pet shop
      await tx.petShopSeguidor.upsert({
        where: { userId_petShopId: { userId, petShopId } },
        create: { userId, petShopId },
        update: {},
      });

      // 4. Busca ou cria o cupom FAVORITO do pet shop
      let cupomFavorito = await tx.cupom.findFirst({
        where: { petShopId, tipo: 'FAVORITO', ativo: true },
      });

      if (!cupomFavorito) {
        // Pet shop ainda não criou cupom favorito — criamos padrão
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

      // 5. Cria o resgate permanente deste cupom para o usuário
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
          dataFimSnapshot: null, // permanente
        },
        update: { status: 'ATIVO', expiradoEm: null },
      });
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

      // Expira o cupom FAVORITO ativo
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
    // Todos os pet shops próximos
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
        tipo: { not: 'FAVORITO' }, // cupons favorito ficam na carteira, não no feed geral
        OR: [{ dataFim: null }, { dataFim: { gt: agora } }],
      },
      include: {
        petShop: {
          select: { id: true, nome: true, logoUrl: true, cidade: true, estado: true },
        },
      },
      orderBy: [{ dataFim: 'asc' }, { createdAt: 'desc' }],
    });

    // Status de resgate por usuário
    const ids = cupons.map((c) => c.id);
    const resgates = await prisma.cupomResgate.findMany({
      where: { cupomId: { in: ids }, userId },
      select: { cupomId: true, status: true, resgatadoEm: true },
    });
    const resgateMap = Object.fromEntries(resgates.map((r) => [r.cupomId, r]));

    // Mapeia distância do pet shop
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

    // Verifica se o usuário já resgatou
    const resgateExistente = await cupomResgateRepository.findByUserAndCupom(userId, cupomId);
    if (resgateExistente) {
      if (resgateExistente.status === 'ATIVO')
        throw new AppError('Você já resgatou este cupom e ele ainda está ativo', 409);
      if (resgateExistente.status === 'UTILIZADO')
        throw new AppError('Você já utilizou este cupom', 409);
    }

    // Calcula dataFim do resgate baseado no duracaoTipo
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

      // Incrementa contador
      await tx.cupom.update({
        where: { id: cupomId },
        data: { totalResgates: { increment: 1 } },
      });
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

    // Verifica expiração
    if (resgate.dataFimSnapshot && resgate.dataFimSnapshot < new Date())
      throw new AppError('Este cupom expirou', 410);

    return await prisma.cupomResgate.update({
      where: { id: resgateId },
      data: { status: 'UTILIZADO', utilizadoEm: new Date() },
    });
  }

  // ── CARTEIRA DE CUPONS DO USUÁRIO ─────────────────────────────────────────

  async carteiraCupons(userId) {
    return await cupomResgateRepository.findCarteiraUsuario(userId);
  }

  // ── CRIAR CUPOM (admin / pet shop) ───────────────────────────────────────

  async criarCupom(petShopId, dados) {
  const petShop = await petShopRepository.findById(petShopId);
  if (!petShop) throw new AppError('Pet shop não encontrado', 404);
  if (!petShop.planoAtivo)
    throw new AppError('Plano Bitzy Club inativo para este pet shop', 403);
 
  // ── Valida limite de cupons ativos ─────────────────────────
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
 
  // ── Calcula dataFim com base no duracaoTipo ────────────────
  const { duracaoTipo, dataFim: dataFimManual, ...resto } = dados;
  const tipo = duracaoTipo || 'PERMANENTE';
 
  let dataFim;
  if (tipo === 'SAZONAL' && dataFimManual) {
    // SAZONAL: admin informa dataFim explicitamente
    dataFim = new Date(dataFimManual);
  } else {
    dataFim = calcularDataFim(tipo);
  }
 
  return await prisma.cupom.create({
    data: {
      petShopId,
      duracaoTipo: tipo,
      dataFim,
      ...resto,
    },
  });
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

  // ── MÉTRICAS DO PET SHOP ──────────────────────────────────────────────────

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