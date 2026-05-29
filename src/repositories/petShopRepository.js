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
  async findNearby({ latitude, longitude, raioKm = 30, cidade, estado }) {
    // Haversine via SQL raw para performance
    // 1 grau de latitude ≈ 111 km
    const raioGraus = raioKm / 111;

    const where = {
      ativo: true,
      planoAtivo: true,
    };

    if (latitude && longitude) {
      where.latitude = {
        gte: latitude - raioGraus,
        lte: latitude + raioGraus,
      };
      where.longitude = {
        gte: longitude - raioGraus,
        lte: longitude + raioGraus,
      };
    } else if (cidade) {
      where.cidade = { contains: cidade, mode: 'insensitive' };
      if (estado) where.estado = estado;
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
}

module.exports = new PetShopRepository();