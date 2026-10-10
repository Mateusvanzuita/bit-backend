// src/repositories/animalAdocaoRepository.js
const prisma = require('../config/database');
const BaseRepository = require('./baseRepository');
const { ONG_PUBLICO_SELECT } = require('./ongRepository');

const LIMITE_CANDIDATOS = 1000;

class AnimalAdocaoRepository extends BaseRepository {
  constructor() {
    super('animalAdocao');
  }

  // Animais que o app pode mostrar (publicados, de ONG ativa).
  // Feed normal: DISPONIVEL e EM_PROCESSO. Apadrináveis: qualquer um que não foi adotado.
  async listarVisiveis({
    especie,
    porte,
    faseVida,
    sexo,
    ongId,
    apadrinhaveis = false,
    caixa,
  }) {
    const ong = { ativa: true };
    if (caixa) {
      ong.latitude = { gte: caixa.latMin, lte: caixa.latMax };
      ong.longitude = { gte: caixa.lonMin, lte: caixa.lonMax };
    }

    const where = { publicado: true, ong };

    if (apadrinhaveis) {
      where.apadrinhamentoAtivo = true;
      where.status = { not: 'ADOTADO' };
    } else {
      where.status = { in: ['DISPONIVEL', 'EM_PROCESSO'] };
    }
    if (especie) where.especie = especie;
    if (porte) where.porte = porte;
    if (faseVida) where.faseVida = faseVida;
    if (sexo) where.sexo = sexo;
    if (ongId) where.ongId = ongId;

    return await prisma.animalAdocao.findMany({
      where,
      include: { ong: { select: ONG_PUBLICO_SELECT } },
      orderBy: { updatedAt: 'desc' },
      take: LIMITE_CANDIDATOS,
    });
  }

  // Detalhe: mostra qualquer status (links compartilhados de animais já adotados
  // precisam abrir "Já encontrou um lar"), desde que publicado e de ONG ativa.
  async findVisivelById(id) {
    return await prisma.animalAdocao.findFirst({
      where: { id, publicado: true, ong: { ativa: true } },
      include: { ong: { select: ONG_PUBLICO_SELECT } },
    });
  }

  // Mapa { animalId: nPadrinhosEmAndamento }
  async contarPadrinhos(animalIds) {
    if (animalIds.length === 0) return {};
    const grupos = await prisma.ajudaOng.groupBy({
      by: ['animalId'],
      where: { animalId: { in: animalIds }, tipo: 'APADRINHAR', status: 'EM_ANDAMENTO' },
      _count: { _all: true },
    });
    return Object.fromEntries(grupos.map((g) => [g.animalId, g._count._all]));
  }
}

module.exports = new AnimalAdocaoRepository();