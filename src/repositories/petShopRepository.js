// src/repositories/petShopRepository.js
const prisma = require('../config/database');
const BaseRepository = require('./baseRepository');

class PetShopRepository extends BaseRepository {
  constructor() {
    super('petShop');
  }

  async criar(dados) {
    return await prisma.petShop.create({
      data: {
        ...dados,
        pais: dados.pais || 'BR',
        planoInicioEm: dados.planoAtivo ? (dados.planoInicioEm || new Date()) : undefined,
      },
    });
  }

  // ── Busca por proximidade (GPS) ──────────────────────────────────────────
  // Retorna pet shops ativos/com plano dentro de ~raioKm km
  // Filtra por cidade como fallback se não houver coords
  //
  // ⚠️ IMPORTANTE: se nem coordenadas nem cidade forem fornecidas, retorna
  // lista vazia. Nunca deve cair para "sem filtro" — isso já causou um bug
  // em produção onde pet shops de qualquer lugar do Brasil apareciam para
  // usuários sem localização cadastrada (users.latitude / users.cidade nulos).
  async findNearby({ latitude, longitude, raioKm = 30, cidade, estado }) {
    const where = {
      ativo: true,
      planoAtivo: true,
      aprovado: true,
    };

    if (latitude != null && longitude != null) {
      // 1 grau de latitude ≈ 111 km (constante, não varia com a posição)
      const raioGrausLat = raioKm / 111;

      // 1 grau de longitude encolhe conforme se afasta do equador:
      // ao nível do mar, 1° de longitude ≈ 111 km * cos(latitude)
      // Sem essa correção, em latitudes mais altas (sul do Brasil, por
      // exemplo) a caixa de busca fica mais larga que o raioKm pretendido.
      const latRad = (latitude * Math.PI) / 180;
      const kmPorGrauLongitude = 111 * Math.cos(latRad);
      const raioGrausLon = raioKm / Math.max(kmPorGrauLongitude, 1); // evita divisão por ~0 nos polos

      where.latitude = {
        gte: latitude - raioGrausLat,
        lte: latitude + raioGrausLat,
      };
      where.longitude = {
        gte: longitude - raioGrausLon,
        lte: longitude + raioGrausLon,
      };
    } else if (cidade) {
      where.cidade = { contains: cidade, mode: 'insensitive' };
      if (estado) where.estado = estado;
    } else {
      // Sem coordenadas E sem cidade: não há base geográfica para filtrar.
      // Retornar tudo seria vazar pet shops de todo o país para o usuário.
      return [];
    }

    return await prisma.petShop.findMany({
      where,
      select: {
        id: true,
        nome: true,
        descricao: true,
        logoUrl: true,
        bannerUrl: true,
        endereco: true,
        cidade: true,
        estado: true,
        latitude: true,
        longitude: true,
        telefone: true,
        whatsapp: true,
        instagram: true,
        descontoFavorito: true,
        _count: {
          select: {
            seguidores: true,
            favoritos: true,
            cupons: {                    // ← dentro do select
              where: { ativo: true },
            },
          },
        },
      },
      orderBy: { nome: 'asc' },
    });
  }

  async findByIdWithDetails(id) {
    return await prisma.petShop.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            seguidores: true,
            favoritos: true,
            cupons: { where: { ativo: true } },
          },
        },
      },
    });
  }

  // Cupons ativos do pet shop (sem expirados)
  async findCuponsAtivos(petShopId) {
    const agora = new Date();
    return await prisma.cupom.findMany({
      where: {
        petShopId,
        ativo: true,
        OR: [
          { dataFim: null },
          { dataFim: { gt: agora } },
        ],
      },
      orderBy: [
        { tipo: 'asc' },
        { dataFim: 'asc' },
      ],
    });
  }

  async findAllAdmin() {
  return await prisma.petShop.findMany({
    select: {
      id: true,
      nome: true,
      descricao: true,
      logoUrl: true,
      bannerUrl: true,
      endereco: true,
      cidade: true,
      estado: true,
      pais: true,
      latitude: true,
      longitude: true,
      telefone: true,
      whatsapp: true,
      instagram: true,
      website: true,
      ativo: true,
      planoAtivo: true,
      planoInicioEm: true,
      planoFimEm: true,
      descontoFavorito: true,
      limiteCuponsAtivos: true,
      crmPetshopId: true,
      origem: true,
      aprovado: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          seguidores: true,
          favoritos: true,
          cupons: { where: { ativo: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async atualizar(id, dados) {
  return await prisma.petShop.update({
    where: { id },
    data: dados,
  });
}

async deletar(id) {
  return await prisma.petShop.delete({ where: { id } });
}

async buscarPorCrmPetshopId(crmPetshopId) {
  return await prisma.petShop.findUnique({ where: { crmPetshopId } });
}

async listarDiretos() {
  return await prisma.petShop.findMany({
    where: { origem: 'DIRETO' },
    select: {
      id: true,
      nome: true,
      descricao: true,
      logoUrl: true,
      cidade: true,
      estado: true,
      ativo: true,
      aprovado: true,
      createdAt: true,
      _count: {
        select: {
          seguidores: true,
          favoritos: true,
          cupons: { where: { ativo: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
}

module.exports = new PetShopRepository();