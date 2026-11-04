// src/services/petshopPortalOfertasService.js
// Ofertas de produtos do pet shop (carrossel/aba Ofertas do app). Produtos e estoque ficam no CRM: aqui é só a vitrine do app.
// Não existe exclusão: OfertaClique tem FK com cascade, então apagar a oferta apagaria o histórico de cliques. Arquivar = ativo:false.
const prisma = require('../config/database');
const C = require('../utils/ongPortalCommon');
const { validarUrlImagem } = require('../utils/petshopImagens');

const CATEGORIAS = ['RACAO', 'ACESSORIOS', 'BANHO_TOSA', 'SAUDE', 'OUTROS'];
const CAMPOS = ['nome', 'fotoUrl', 'categoria', 'preco', 'precoOriginal'];
const MAX_ATIVAS = 50;
const DIA = 86400000;

const serializar = (o, extra = {}) => ({
  id: o.id, nome: o.nome, fotoUrl: o.fotoUrl, categoria: o.categoria,
  preco: o.preco, precoOriginal: o.precoOriginal, ativo: o.ativo, createdAt: o.createdAt,
  ...extra,
});

function validar(b, petShopId, atual = null) {
  C.soCamposPermitidos(b, CAMPOS);
  const preco = C.numero(b.preco ?? null, 'Preço', { min: 0.01, max: 1000000 });
  if (preco === null) throw C.invalido('Informe o preço.');
  const precoOriginal = C.numero(b.precoOriginal ?? null, 'Preço original', { min: 0.01, max: 1000000 });
  if (precoOriginal !== null && precoOriginal <= preco) {
    throw C.invalido('O preço original deve ser maior que o preço da oferta.');
  }
  if (!b.fotoUrl) throw C.invalido('Envie uma foto do produto.');
  return {
    nome: C.texto(b.nome, 'Nome do produto', { min: 2, max: 120 }),
    fotoUrl: validarUrlImagem(b.fotoUrl, petShopId, 'oferta-foto', 'Foto', atual?.fotoUrl ?? null),
    categoria: C.enumerado(b.categoria ?? 'OUTROS', CATEGORIAS, 'Categoria'),
    preco,
    precoOriginal,
  };
}

class PetShopPortalOfertasService {
  async _achar(petShopId, id) {
    C.exigirUuid(id);
    const o = await prisma.ofertaProduto.findFirst({ where: { id, petShopId } });
    if (!o) throw C.naoEncontrado('Oferta não encontrada.');
    return o;
  }

  async listar(petShopId, q) {
    const where = { petShopId };
    if (q.ativo !== undefined) {
      if (!['true', 'false'].includes(q.ativo)) throw C.invalido('Filtro inválido.');
      where.ativo = q.ativo === 'true';
    }
    if (q.categoria !== undefined) where.categoria = C.enumerado(q.categoria, CATEGORIAS, 'Categoria');
    if (q.busca !== undefined && String(q.busca).trim()) {
      const b = String(q.busca).trim();
      if (b.length > 60) throw C.invalido('Busca muito longa.');
      where.nome = { contains: b, mode: 'insensitive' };
    }

    const { pagina, proximoCursor } = await C.paginar({
      where, cursor: q.cursor, limite: q.limite,
      consulta: (args) => prisma.ofertaProduto.findMany(args),
    });

    const ids = pagina.map((o) => o.id);
    const desde = new Date(Date.now() - 30 * DIA);
    const [cliques, total, ativas, inativas] = await Promise.all([
      ids.length
        ? prisma.ofertaClique.groupBy({ by: ['ofertaId'], where: { ofertaId: { in: ids }, criadoEm: { gte: desde } }, _count: { _all: true } })
        : [],
      prisma.ofertaProduto.count({ where }),
      prisma.ofertaProduto.count({ where: { petShopId, ativo: true } }),
      prisma.ofertaProduto.count({ where: { petShopId, ativo: false } }),
    ]);
    const porOferta = new Map(cliques.map((c) => [c.ofertaId, c._count._all]));

    return {
      itens: pagina.map((o) => serializar(o, { cliques30d: porOferta.get(o.id) ?? 0 })),
      proximoCursor,
      total,
      contagens: { ativas, inativas, limiteAtivas: MAX_ATIVAS },
    };
  }

  async obter(petShopId, id) {
    return serializar(await this._achar(petShopId, id));
  }

  async criar(petShopId, body) {
    const dados = validar(body, petShopId);
    const ativas = await prisma.ofertaProduto.count({ where: { petShopId, ativo: true } });
    if (ativas >= MAX_ATIVAS) {
      throw C.conflito(`Você já tem ${MAX_ATIVAS} ofertas ativas. Arquive uma antes de criar outra.`);
    }
    // destaque / pesoDestaque são controle do Admin: nascem no padrão.
    const o = await prisma.ofertaProduto.create({ data: { ...dados, petShopId, ativo: true } });
    return serializar(o);
  }

  async atualizar(petShopId, id, body) {
    const atual = await this._achar(petShopId, id);
    const dados = validar({ ...CAMPOS.reduce((a, k) => ({ ...a, [k]: atual[k] }), {}), ...body }, petShopId, atual);
    const r = await prisma.ofertaProduto.updateMany({ where: { id, petShopId }, data: dados });
    if (r.count === 0) throw C.naoEncontrado('Oferta não encontrada.');
    return this.obter(petShopId, id);
  }

  async alterarStatus(petShopId, id, body) {
    C.soCamposPermitidos(body, ['ativo']);
    const ativo = C.booleano(body.ativo, 'Ativo');
    const atual = await this._achar(petShopId, id);
    if (atual.ativo === ativo) return serializar(atual);
    if (ativo) {
      const ativas = await prisma.ofertaProduto.count({ where: { petShopId, ativo: true } });
      if (ativas >= MAX_ATIVAS) throw C.conflito(`Você já tem ${MAX_ATIVAS} ofertas ativas. Arquive uma antes de reativar.`);
    }
    await prisma.ofertaProduto.updateMany({ where: { id, petShopId }, data: { ativo } });
    return this.obter(petShopId, id);
  }
}

module.exports = new PetShopPortalOfertasService();
