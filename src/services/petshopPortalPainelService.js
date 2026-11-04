// src/services/petshopPortalPainelService.js
// Início, métricas e interações do pet shop. `petShopId` vem SEMPRE do token.
// Datas no fuso de São Paulo (mesmos helpers do portal da ONG).
const prisma = require('../config/database');
const C = require('../utils/ongPortalCommon');

const DIA = 86400000;
const PERIODOS = { '7d': 7, '30d': 30, '90d': 90 };
const agoraAtivo = () => ({ OR: [{ dataFim: null }, { dataFim: { gt: new Date() } }] });

/** Primeiro nome + inicial do sobrenome (o portal nunca mostra e-mail nem nome completo do tutor). */
function nomeCurto(nome) {
  const p = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (!p.length) return 'Tutor';
  return p.length > 1 ? `${p[0]} ${p[p.length - 1][0].toUpperCase()}.` : p[0];
}

/** Checklist do cadastro: regras no backend para o portal e o admin falarem a mesma língua. */
function montarChecklist(ps, { cuponsAtivos, ofertasAtivas, acessoAtivo }) {
  return [
    { chave: 'acesso', label: 'Acesso ao portal ativo', ok: Boolean(acessoAtivo) },
    { chave: 'logo', label: 'Logo enviada', ok: Boolean(ps.logoUrl) },
    { chave: 'banner', label: 'Capa enviada', ok: Boolean(ps.bannerUrl) },
    { chave: 'descricao', label: 'Descrição preenchida', ok: Boolean(ps.descricao) },
    { chave: 'whatsapp', label: 'WhatsApp informado', ok: Boolean(ps.whatsapp) },
    { chave: 'oferta', label: 'Ao menos uma oferta ativa', ok: ofertasAtivas > 0 },
    { chave: 'cupom', label: 'Ao menos um cupom ativo', ok: cuponsAtivos > 0 },
  ];
}

async function contagens(petShopId) {
  const desde = new Date(Date.now() - 30 * DIA);
  const [seguidores, favoritos, cuponsAtivos, ofertasAtivas, cliques30d, resgates30d] = await Promise.all([
    prisma.petShopSeguidor.count({ where: { petShopId } }),
    prisma.petShopFavorito.count({ where: { petShopId } }),
    prisma.cupom.count({ where: { petShopId, tipo: { not: 'FAVORITO' }, ativo: true, ...agoraAtivo() } }),
    prisma.ofertaProduto.count({ where: { petShopId, ativo: true } }),
    prisma.ofertaClique.count({ where: { petShopId, criadoEm: { gte: desde } } }),
    prisma.cupomResgate.count({ where: { petShopId, resgatadoEm: { gte: desde } } }),
  ]);
  return { seguidores, favoritos, cuponsAtivos, ofertasAtivas, cliques30d, resgates30d };
}

async function topOfertas(petShopId, desde, take = 5) {
  const grupos = await prisma.ofertaClique.groupBy({
    by: ['ofertaId'], where: { petShopId, criadoEm: { gte: desde } },
    _count: { _all: true }, orderBy: { _count: { ofertaId: 'desc' } }, take,
  });
  if (!grupos.length) return [];
  const ofertas = await prisma.ofertaProduto.findMany({
    where: { id: { in: grupos.map((g) => g.ofertaId) } }, select: { id: true, nome: true, fotoUrl: true },
  });
  const por = new Map(ofertas.map((o) => [o.id, o]));
  return grupos.map((g) => ({
    id: g.ofertaId, nome: por.get(g.ofertaId)?.nome ?? 'Oferta removida', fotoUrl: por.get(g.ofertaId)?.fotoUrl ?? null, cliques: g._count._all,
  }));
}

async function topCupons(petShopId, desde, take = 5) {
  const grupos = await prisma.cupomResgate.groupBy({
    by: ['cupomId'], where: { petShopId, resgatadoEm: { gte: desde } },
    _count: { _all: true }, _sum: { totalUsos: true }, orderBy: { _count: { cupomId: 'desc' } }, take,
  });
  if (!grupos.length) return [];
  const cupons = await prisma.cupom.findMany({ where: { id: { in: grupos.map((g) => g.cupomId) } }, select: { id: true, titulo: true, tipo: true } });
  const por = new Map(cupons.map((c) => [c.id, c]));
  return grupos.map((g) => ({
    id: g.cupomId, titulo: por.get(g.cupomId)?.titulo ?? 'Cupom removido', resgates: g._count._all, usos: g._sum.totalUsos ?? 0,
  }));
}

/** Um ponto por dia (dias sem ocorrência = 0), em ordem cronológica. */
function serieDiaria(datas, de, dias) {
  const cont = new Map();
  for (const d of datas) {
    const k = C.diaSP(d);
    cont.set(k, (cont.get(k) ?? 0) + 1);
  }
  return Array.from({ length: dias }, (_, i) => {
    const data = C.somarDias(de, i);
    return { data, valor: cont.get(data) ?? 0 };
  });
}

class PetShopPortalPainelService {
  async dashboard(petShopId) {
    const desde = new Date(Date.now() - 30 * DIA);
    const [ps, resumo, ofertas, cupons] = await Promise.all([
      prisma.petShop.findUnique({
        where: { id: petShopId },
        select: { id: true, logoUrl: true, bannerUrl: true, descricao: true, whatsapp: true, ativo: true, aprovado: true, planoAtivo: true },
      }),
      contagens(petShopId),
      topOfertas(petShopId, desde),
      topCupons(petShopId, desde),
    ]);
    if (!ps) throw C.naoEncontrado('Pet shop não encontrado.');
    return {
      situacao: { ativo: ps.ativo, aprovado: ps.aprovado, planoAtivo: ps.planoAtivo },
      resumo,
      topOfertas: ofertas,
      topCupons: cupons,
      checklist: montarChecklist(ps, { ...resumo, acessoAtivo: true }),
    };
  }

  async metricas(petShopId, periodo) {
    const dias = PERIODOS[periodo];
    if (!dias) throw C.invalido('Período inválido (use 7d, 30d ou 90d).');
    const ate = C.diaSP(new Date());
    const de = C.somarDias(ate, -(dias - 1));
    const inicio = C.inicioDoDiaSP(de);
    const fim = C.inicioDoDiaSP(C.somarDias(ate, 1));
    const janela = { gte: inicio, lt: fim };

    const [cliques, resgates, usos, novosSeguidores, novosFavoritos] = await Promise.all([
      prisma.ofertaClique.findMany({ where: { petShopId, criadoEm: janela }, select: { criadoEm: true } }),
      prisma.cupomResgate.findMany({ where: { petShopId, resgatadoEm: janela }, select: { resgatadoEm: true } }),
      prisma.cupomResgate.count({ where: { petShopId, utilizadoEm: janela } }),
      prisma.petShopSeguidor.count({ where: { petShopId, createdAt: janela } }),
      prisma.petShopFavorito.count({ where: { petShopId, favoritadoEm: janela } }),
    ]);

    return {
      periodo: { de, ate, dias },
      totais: { cliques: cliques.length, resgates: resgates.length, usos, novosSeguidores, novosFavoritos },
      // Quantos resgates viraram uso no balcão (%). null quando ainda não houve resgate no período.
      conversaoUso: resgates.length ? Math.round((usos / resgates.length) * 1000) / 10 : null,
      serie: {
        cliques: serieDiaria(cliques.map((c) => c.criadoEm), de, dias),
        resgates: serieDiaria(resgates.map((r) => r.resgatadoEm), de, dias),
      },
      rankingOfertas: await topOfertas(petShopId, inicio, 10),
      rankingCupons: await topCupons(petShopId, inicio, 10),
    };
  }

  /** Quem clicou nas ofertas (para a loja saber quem chamou no WhatsApp). Só nome curto e cidade. */
  async interacoes(petShopId, q) {
    const pagina = Math.max(1, Number(q.pagina) || 1);
    const porPagina = Math.min(50, Math.max(1, Number(q.porPagina) || 20));
    const where = { petShopId };
    if (q.ofertaId) where.ofertaId = C.exigirUuid(String(q.ofertaId));
    const [linhas, total] = await Promise.all([
      prisma.ofertaClique.findMany({
        where, orderBy: { criadoEm: 'desc' }, skip: (pagina - 1) * porPagina, take: porPagina,
        include: { user: { select: { nome: true } } },
      }),
      prisma.ofertaClique.count({ where }),
    ]);
    return {
      itens: linhas.map((c) => ({
        id: c.id, ofertaId: c.ofertaId, ofertaNome: c.ofertaNome,
        tutor: nomeCurto(c.user?.nome), cidade: c.cidadeSnapshot, estado: c.estadoSnapshot, criadoEm: c.criadoEm,
      })),
      total, pagina, porPagina,
    };
  }
}

module.exports = new PetShopPortalPainelService();
module.exports.montarChecklist = montarChecklist;
module.exports.contagens = contagens;
