// src/repositories/ongRepository.js
const prisma = require('../config/database');
const BaseRepository = require('./baseRepository');

// Campos que podem sair na API pública. NUNCA inclui PIX nem as listas de
// "como ajudar" (essas só saem pelo endpoint /ajuda, com regras próprias).
const ONG_PUBLICO_SELECT = {
  id: true,
  nome: true,
  tipo: true,
  descricao: true,
  logoUrl: true,
  bannerUrl: true,
  cidade: true,
  estado: true,
  bairro: true,
  latitude: true,
  longitude: true,
  whatsapp: true,
  instagramUrl: true,
  siteUrl: true,
  verificada: true,
  cidadesAtendidas: true,
  processoAdocao: true,
  taxaAdocao: true,
};

class OngRepository extends BaseRepository {
  constructor() {
    super('ong');
  }

  async listarAtivas({ caixa } = {}) {
    const where = { ativa: true };
    if (caixa) {
      where.latitude = { gte: caixa.latMin, lte: caixa.latMax };
      where.longitude = { gte: caixa.lonMin, lte: caixa.lonMax };
    }
    return await prisma.ong.findMany({ where, select: ONG_PUBLICO_SELECT });
  }

  async findAtivaPublica(id) {
    return await prisma.ong.findFirst({
      where: { id, ativa: true },
      select: ONG_PUBLICO_SELECT,
    });
  }

  async findAtivaComAjuda(id) {
    return await prisma.ong.findFirst({
      where: { id, ativa: true },
      select: {
        id: true,
        nome: true,
        verificada: true,
        whatsapp: true,
        pixChave: true,
        pixTipoChave: true,
        pixTitular: true,
        entregaDoacoes: true,
        necessidades: true,
        voluntariado: true,
      },
    });
  }

  // Mapa { ongId: totalDisponiveis }
  async contarDisponiveis(ongIds) {
    if (ongIds.length === 0) return {};
    const grupos = await prisma.animalAdocao.groupBy({
      by: ['ongId'],
      where: { ongId: { in: ongIds }, status: 'DISPONIVEL', publicado: true },
      _count: { _all: true },
    });
    return Object.fromEntries(grupos.map((g) => [g.ongId, g._count._all]));
  }

  async buscarPorNomeECidade(nome, cidade, estado) {
    return await prisma.ong.findFirst({
      where: {
        nome: { equals: nome, mode: 'insensitive' },
        cidade: { equals: cidade, mode: 'insensitive' },
        estado,
      },
    });
  }
}

module.exports = new OngRepository();
module.exports.ONG_PUBLICO_SELECT = ONG_PUBLICO_SELECT;