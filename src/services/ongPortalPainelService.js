// src/services/ongPortalPainelService.js
// Dashboard e métricas. Tudo vem de contagens reais do banco. Não existe registro de visualizações,
// então `visualizacoes` é null (o portal esconde o card). Datas no fuso de São Paulo.
const prisma = require('../config/database');
const C = require('../utils/ongPortalCommon');
const { WHERE_GRUPO_INTERESSE } = require('./ongPortalInteressesService');

const DIAS = { '7d': 7, '30d': 30, '90d': 90 };
const ATIVO = ['ENVIADO', 'EM_CONTATO'];

function serieDiaria(datas, de, dias) {
  const mapa = new Map();
  for (let i = 0; i < dias; i++) mapa.set(C.somarDias(de, i), 0);
  for (const d of datas) {
    const k = C.diaSP(d);
    if (mapa.has(k)) mapa.set(k, mapa.get(k) + 1);
  }
  return [...mapa].map(([data, valor]) => ({ data, valor }));
}

const arred1 = (n) => Math.round(n * 10) / 10;

class OngPortalPainelService {
  async dashboard(ongId) {
    const hoje = C.diaSP(new Date());
    const inicioMes = C.inicioDoDiaSP(`${hoje.slice(0, 8)}01`);

    const [disponiveis, adotados, novos, adocoesMes, grupos, recentes] = await Promise.all([
      prisma.animalAdocao.count({ where: { ongId, status: 'DISPONIVEL' } }),
      prisma.animalAdocao.count({ where: { ongId, status: 'ADOTADO' } }),
      prisma.interesseAdocao.count({ where: { ongId, ...WHERE_GRUPO_INTERESSE.novos } }),
      prisma.interesseAdocao.count({ where: { ongId, status: 'ADOCAO_CONFIRMADA', animal: { adotadoEm: { gte: inicioMes } } } }),
      prisma.interesseAdocao.groupBy({
        by: ['animalId'],
        where: { ongId, status: { in: ATIVO }, animal: { status: { in: ['DISPONIVEL', 'EM_PROCESSO'] } } },
        _count: { _all: true },
        orderBy: { _count: { animalId: 'desc' } },
        take: 5,
      }),
      prisma.interesseAdocao.findMany({
        where: { ongId, status: { in: ATIVO }, animal: { status: { in: ['DISPONIVEL', 'EM_PROCESSO'] } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 5,
        select: { id: true, animalId: true, createdAt: true, user: { select: { nome: true } }, animal: { select: { nome: true } } },
      }),
    ]);

    const animais = grupos.length
      ? await prisma.animalAdocao.findMany({ where: { id: { in: grupos.map((g) => g.animalId) }, ongId }, select: { id: true, nome: true, fotos: true } })
      : [];
    const porId = new Map(animais.map((a) => [a.id, a]));

    return {
      resumo: { animaisDisponiveis: disponiveis, animaisAdotados: adotados, interessesNovos: novos, adocoesNoMes: adocoesMes },
      visualizacoes: null,
      animaisMaisProcurados: grupos
        .filter((g) => porId.has(g.animalId))
        .map((g) => ({ id: g.animalId, nome: porId.get(g.animalId).nome, fotoUrl: porId.get(g.animalId).fotos[0] ?? null, interessados: g._count._all })),
      interessesRecentes: recentes.map((r) => ({
        id: r.id, animalId: r.animalId, animalNome: r.animal.nome, interessadoNome: r.user.nome, criadoEm: r.createdAt,
      })),
    };
  }

  async metricas(ongId, periodo) {
    const dias = DIAS[periodo];
    if (!dias) throw C.invalido('Período inválido (use 7d, 30d ou 90d).');
    const ate = C.diaSP(new Date());
    const de = C.somarDias(ate, -(dias - 1));
    const inicio = C.inicioDoDiaSP(de);
    const noPeriodo = { gte: inicio };

    const [favoritos, interesses, contatos, adocoes, ajudas, datasInteresses, grpInteresses, grpFavoritos] = await Promise.all([
      prisma.favoritoAnimal.count({ where: { animal: { ongId }, createdAt: noPeriodo } }),
      prisma.interesseAdocao.count({ where: { ongId, createdAt: noPeriodo } }),
      // Sem data de "virou contato": contamos os interesses recebidos no período que já chegaram a contato ou adoção.
      prisma.interesseAdocao.count({ where: { ongId, createdAt: noPeriodo, status: { in: ['EM_CONTATO', 'ADOCAO_CONFIRMADA'] } } }),
      prisma.interesseAdocao.count({ where: { ongId, status: 'ADOCAO_CONFIRMADA', animal: { adotadoEm: noPeriodo } } }),
      prisma.ajudaOng.count({ where: { ongId, createdAt: noPeriodo } }),
      prisma.interesseAdocao.findMany({ where: { ongId, createdAt: noPeriodo }, select: { createdAt: true }, take: 20000 }),
      prisma.interesseAdocao.groupBy({ by: ['animalId'], where: { ongId, createdAt: noPeriodo }, _count: { _all: true } }),
      prisma.favoritoAnimal.groupBy({ by: ['animalId'], where: { animal: { ongId }, createdAt: noPeriodo }, _count: { _all: true } }),
    ]);

    const inter = new Map(grpInteresses.map((g) => [g.animalId, g._count._all]));
    const fav = new Map(grpFavoritos.map((g) => [g.animalId, g._count._all]));
    const ids = [...new Set([...inter.keys(), ...fav.keys()])];
    const animais = ids.length
      ? await prisma.animalAdocao.findMany({ where: { id: { in: ids }, ongId }, select: { id: true, nome: true, fotos: true } })
      : [];
    const ranking = animais
      .map((a) => ({
        id: a.id, nome: a.nome, fotoUrl: a.fotos[0] ?? null,
        interessados: inter.get(a.id) ?? 0, favoritos: fav.get(a.id) ?? 0, visualizacoes: null,
      }))
      .sort((x, y) => y.interessados - x.interessados || y.favoritos - x.favoritos || x.nome.localeCompare(y.nome))
      .slice(0, 10);

    return {
      periodo: { de, ate, dias },
      totais: { visualizacoes: null, favoritos, interesses, contatos, adocoes, ajudas },
      conversao: interesses > 0 ? arred1((adocoes / interesses) * 100) : null,
      serie: { visualizacoes: null, interesses: serieDiaria(datasInteresses.map((d) => d.createdAt), de, dias) },
      ranking,
    };
  }
}

module.exports = new OngPortalPainelService();
