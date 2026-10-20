// src/services/novidadeService.js
const { Prisma } = require('@prisma/client');
const repo = require('../repositories/novidadeRepository');
const cache = require('../utils/cache');
const { AppError } = require('../middlewares/errorHandler');
const U = require('../utils/novidadeUtils');

const CACHE_TTL = 10 * 60; // 10 min (também é o atraso máximo para uma matéria agendada aparecer)
const VERSAO_KEY = 'novidades:versao';
const LIMITE_PADRAO = 20;
const LIMITE_MAX = 50;

// ── Cache ─────────────────────────────────────────────────────
// Invalidação por "versão": toda escrita incrementa a versão e as chaves antigas
// simplesmente deixam de ser lidas (expiram sozinhas). Se o Redis cair, o feed continua
// funcionando direto do banco.
async function cacheGet(key) {
  try {
    return await cache.get(key);
  } catch (e) {
    return null;
  }
}
async function cacheSet(key, value, ttl = CACHE_TTL) {
  try {
    await cache.set(key, value, ttl);
  } catch (e) {
    /* cache é best-effort */
  }
}
async function versaoCache() {
  return Number(await cacheGet(VERSAO_KEY)) || 1;
}
async function invalidarCache() {
  await cacheSet(VERSAO_KEY, (await versaoCache()) + 1, 30 * 24 * 3600);
}

// ── Helpers ───────────────────────────────────────────────────
function paginacao(params) {
  const page = Math.max(1, parseInt(params.page, 10) || 1);
  const limit = Math.min(LIMITE_MAX, Math.max(1, parseInt(params.limit, 10) || LIMITE_PADRAO));
  return { page, limit, skip: (page - 1) * limit };
}

const infoPaginacao = ({ page, limit }, total) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

const ehVerdadeiro = (v) => v === true || v === 'true' || v === '1';

/** Só os campos permitidos, já limpos. Campos ausentes ficam de fora (serve p/ criar e editar). */
function prepararCampos(body) {
  const d = {};
  if (body.titulo !== undefined) d.titulo = body.titulo.trim();
  if (body.resumo !== undefined) d.resumo = body.resumo.trim();
  if (body.categoria !== undefined) d.categoria = body.categoria;
  if (body.capaUrl !== undefined) d.capaUrl = body.capaUrl ? body.capaUrl.trim() : null;
  if (body.tempoLeituraMin !== undefined) d.tempoLeituraMin = Number(body.tempoLeituraMin);
  if (body.publicadoEm !== undefined) {
    d.publicadoEm = body.publicadoEm ? new Date(body.publicadoEm) : null;
  }
  if (body.status !== undefined) d.status = body.status;
  if (body.especies !== undefined) d.especies = [...new Set(body.especies)];
  if (body.destaque !== undefined) d.destaque = ehVerdadeiro(body.destaque);
  if (body.patrocinado !== undefined) d.patrocinado = ehVerdadeiro(body.patrocinado);
  if (body.parceiroNome !== undefined) {
    d.parceiroNome = body.parceiroNome && body.parceiroNome.trim() ? body.parceiroNome.trim() : null;
  }
  if (body.resumoRapido !== undefined) {
    d.resumoRapido = body.resumoRapido.map((s) => s.trim()).filter(Boolean);
  }
  if (body.blocos !== undefined) d.blocos = U.sanitizarBlocos(body.blocos);
  if (body.dica !== undefined) {
    d.dica = body.dica === null ? Prisma.DbNull : U.sanitizarDica(body.dica);
  }
  if (body.relacionados !== undefined) d.relacionados = [...new Set(body.relacionados)];
  return d;
}

class NovidadeService {
  // ════════════════════════════════════════════════════════════
  //  APP (leitura)
  // ════════════════════════════════════════════════════════════
  async listarPublicas(params = {}) {
    const pag = paginacao(params);
    const { categoria, especie } = params;
    const destaque = ehVerdadeiro(params.destaque);
    const busca = U.normalizarTexto(params.busca || '');

    // Buscas livres não passam pelo cache (evita uma chave nova para cada texto digitado).
    const chave = busca
      ? null
      : `novidades:lista:v${await versaoCache()}:${categoria || ''}|${especie || ''}|${destaque ? 1 : 0}|${pag.page}|${pag.limit}`;
    if (chave) {
      const emCache = await cacheGet(chave);
      if (emCache) return emCache;
    }

    const where = { ...repo.wherePublicada() };
    if (categoria) where.categoria = categoria;
    if (destaque) where.destaque = true;
    if (busca) where.buscaTexto = { contains: busca };
    // Sem espécie definida = serve para qualquer uma (mesma regra do app)
    if (especie) where.OR = [{ especies: { isEmpty: true } }, { especies: { has: especie } }];

    const { itens, total } = await repo.listarPublicas({ where, skip: pag.skip, take: pag.limit });
    const resultado = {
      novidades: itens.map(U.paraAppResumo),
      paginacao: infoPaginacao(pag, total),
    };

    if (chave) await cacheSet(chave, resultado);
    return resultado;
  }

  async obterPublica(slug) {
    const chave = `novidades:item:v${await versaoCache()}:${slug}`;
    const emCache = await cacheGet(chave);
    if (emCache) return emCache;

    const n = await repo.buscarPublicadaPorSlug(slug);
    if (!n) throw new AppError('Novidade não encontrada', 404);

    const relacionados = await this.buscarRelacionados(n, 2);
    const resultado = {
      novidade: U.paraAppCompleta(n),
      relacionados: relacionados.map(U.paraAppResumo),
    };

    await cacheSet(chave, resultado);
    return resultado;
  }

  /** Explícitos (na ordem definida) primeiro; completa com a mesma categoria. */
  async buscarRelacionados(n, limite = 2) {
    const slugsExplicitos = (n.relacionados || []).filter((s) => s !== n.slug);
    const encontrados = await repo.buscarPublicadasPorSlugs(slugsExplicitos);
    const explicitos = slugsExplicitos
      .map((s) => encontrados.find((x) => x.slug === s))
      .filter(Boolean)
      .slice(0, limite);

    if (explicitos.length >= limite) return explicitos;

    const completar = await repo.listarMesmaCategoria(
      n.categoria,
      [n.slug, ...explicitos.map((x) => x.slug)],
      limite - explicitos.length,
    );
    return [...explicitos, ...completar];
  }

  // ════════════════════════════════════════════════════════════
  //  ADMIN
  // ════════════════════════════════════════════════════════════
  async listarAdmin(params = {}) {
    const pag = paginacao(params);
    const where = {};
    if (params.status) where.status = params.status;
    if (params.categoria) where.categoria = params.categoria;
    const busca = U.normalizarTexto(params.busca || '');
    if (busca) where.buscaTexto = { contains: busca };

    const { itens, total } = await repo.listarAdmin({ where, skip: pag.skip, take: pag.limit });
    return { novidades: itens, paginacao: infoPaginacao(pag, total) };
  }

  async obterAdmin(id) {
    const n = await repo.buscarPorId(id);
    if (!n) throw new AppError('Novidade não encontrada', 404);
    return U.paraAdmin(n);
  }

  async criar(body) {
    const d = prepararCampos(body);
    if (d.dica === Prisma.DbNull) delete d.dica;

    d.slug = await this.resolverSlugCriacao(body.slug, d.titulo);
    d.status = d.status || 'RASCUNHO';
    if (d.status === 'PUBLICADA' && !d.publicadoEm) d.publicadoEm = new Date();
    if (!d.tempoLeituraMin) d.tempoLeituraMin = U.calcularTempoLeituraMin(d.blocos);
    d.buscaTexto = U.montarBuscaTexto(d);
    if (d.relacionados) d.relacionados = d.relacionados.filter((s) => s !== d.slug);

    try {
      const criada = await repo.criar(d);
      await invalidarCache();
      return U.paraAdmin(criada);
    } catch (e) {
      if (e.code === 'P2002') throw new AppError('Já existe uma novidade com este slug', 409);
      throw e;
    }
  }

  async resolverSlugCriacao(slugInformado, titulo) {
    if (slugInformado) {
      if (await repo.slugExiste(slugInformado)) {
        throw new AppError('Já existe uma novidade com este slug', 409);
      }
      return slugInformado;
    }
    const base = U.gerarSlug(titulo);
    let slug = base;
    let i = 2;
    while (await repo.slugExiste(slug)) {
      slug = `${base}-${i}`;
      i += 1;
    }
    return slug;
  }

  /** O slug é imutável: ele é o id público usado pelo app (e por links/salvos). */
  async atualizar(id, body) {
    const atual = await repo.buscarPorId(id);
    if (!atual) throw new AppError('Novidade não encontrada', 404);

    const d = prepararCampos(body);

    if (d.status === 'PUBLICADA' && d.publicadoEm === undefined && !atual.publicadoEm) {
      d.publicadoEm = new Date();
    }
    if (d.blocos && body.tempoLeituraMin === undefined) {
      d.tempoLeituraMin = U.calcularTempoLeituraMin(d.blocos);
    }
    if (d.titulo !== undefined || d.resumo !== undefined) {
      d.buscaTexto = U.montarBuscaTexto({
        titulo: d.titulo ?? atual.titulo,
        resumo: d.resumo ?? atual.resumo,
      });
    }
    if (d.relacionados) d.relacionados = d.relacionados.filter((s) => s !== atual.slug);

    const patrocinado = d.patrocinado ?? atual.patrocinado;
    const parceiro = d.parceiroNome !== undefined ? d.parceiroNome : atual.parceiroNome;
    if (patrocinado && !parceiro) {
      throw new AppError('parceiroNome é obrigatório em conteúdo patrocinado', 400);
    }

    const atualizada = await repo.atualizar(id, d);
    await invalidarCache();
    return U.paraAdmin(atualizada);
  }

  /** Publicar / agendar / arquivar / voltar para rascunho. */
  async alterarStatus(id, { status, publicadoEm }) {
    const atual = await repo.buscarPorId(id);
    if (!atual) throw new AppError('Novidade não encontrada', 404);

    const dados = { status };
    if (status === 'PUBLICADA') {
      dados.publicadoEm = publicadoEm ? new Date(publicadoEm) : atual.publicadoEm || new Date();
    }

    const atualizada = await repo.atualizar(id, dados);
    await invalidarCache();
    return U.paraAdmin(atualizada);
  }

  async excluir(id) {
    const atual = await repo.buscarPorId(id);
    if (!atual) throw new AppError('Novidade não encontrada', 404);
    await repo.excluir(id);
    await invalidarCache();
  }
}

module.exports = new NovidadeService();
