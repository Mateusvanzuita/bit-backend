// src/services/avaliacaoAppService.js
const prisma = require('../config/database');
const { AppError } = require('../middlewares/errorHandler');

const PLATAFORMAS = ['ios', 'android'];
const STATUS = ['NOVA', 'EM_ANALISE', 'RESOLVIDA'];

const limpar = (texto, max) => {
  if (typeof texto !== 'string') return null;
  const t = texto.trim().slice(0, max);
  return t || null;
};

const parseData = (valor, fimDoDia = false) => {
  if (!valor) return null;
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return null;
  if (fimDoDia) d.setHours(23, 59, 59, 999);
  return d;
};

function filtroPeriodo(de, ate) {
  const gte = parseData(de);
  const lte = parseData(ate, true);
  if (!gte && !lte) return {};
  return { createdAt: { ...(gte && { gte }), ...(lte && { lte }) } };
}

class AvaliacaoAppService {
  // ── APP ───────────────────────────────────────────────────────────────────

  async criar(userId, body = {}) {
    const nota = Number(body.nota);
    if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
      throw new AppError('A nota deve ser um número inteiro de 1 a 5.', 400);
    }
    const plataforma = String(body.plataforma || '').toLowerCase();
    if (!PLATAFORMAS.includes(plataforma)) {
      throw new AppError('Plataforma inválida.', 400);
    }

    // Trava simples contra abuso: no máximo 5 avaliações por usuário em 24h.
    const recentes = await prisma.avaliacaoApp.count({
      where: { userId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    if (recentes >= 5) throw new AppError('Muitas avaliações em pouco tempo.', 429);

    return await prisma.avaliacaoApp.create({
      data: {
        userId,
        nota,
        comentario: limpar(body.comentario, 1000),
        gatilho: limpar(body.gatilho, 40) || 'DESCONHECIDO',
        plataforma,
        versaoApp: limpar(body.versaoApp, 20),
        build: limpar(body.build, 20),
      },
      select: { id: true, nota: true, createdAt: true },
    });
  }

  // Comentário (notas baixas) e "abriu a loja" (notas altas).
  async atualizar(userId, id, body = {}) {
    const existente = await prisma.avaliacaoApp.findFirst({ where: { id, userId } });
    if (!existente) throw new AppError('Avaliação não encontrada.', 404);

    const data = {};
    if (typeof body.comentario === 'string') data.comentario = limpar(body.comentario, 1000);
    if (body.abriuLoja === true) data.abriuLoja = true;
    if (Object.keys(data).length === 0) throw new AppError('Nada para atualizar.', 400);

    await prisma.avaliacaoApp.update({ where: { id }, data });
  }

  // Sobrevive à reinstalação: o app usa isto para saber quando a pessoa respondeu pela última vez.
  async estado(userId) {
    const ultima = await prisma.avaliacaoApp.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, nota: true },
    });
    return {
      ultimaRespostaEm: ultima?.createdAt ?? null,
      ultimaNota: ultima?.nota ?? null,
    };
  }

  // ── ADMIN ─────────────────────────────────────────────────────────────────

  async listar({ page = 1, limit = 20, nota, gatilho, plataforma, versao, status, de, ate, comComentario }) {
    const where = { ...filtroPeriodo(de, ate) };
    if (nota) where.nota = Number(nota);
    if (gatilho) where.gatilho = gatilho;
    if (plataforma) where.plataforma = plataforma;
    if (versao) where.versaoApp = versao;
    if (STATUS.includes(status)) where.statusAdmin = status;
    if (comComentario === 'true') where.comentario = { not: null };

    const skip = (page - 1) * limit;
    const [avaliacoes, total] = await Promise.all([
      prisma.avaliacaoApp.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { id: true, nome: true, email: true } } },
      }),
      prisma.avaliacaoApp.count({ where }),
    ]);

    return {
      avaliacoes,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async resumo({ de, ate } = {}) {
    const where = filtroPeriodo(de, ate);

    const [agregado, porNota, notasAltas, abriuLoja, porVersao, porGatilho, porPlataforma] =
      await Promise.all([
        prisma.avaliacaoApp.aggregate({ where, _avg: { nota: true }, _count: { id: true } }),
        prisma.avaliacaoApp.groupBy({ by: ['nota'], where, _count: { id: true } }),
        prisma.avaliacaoApp.count({ where: { ...where, nota: { gte: 4 } } }),
        prisma.avaliacaoApp.count({ where: { ...where, abriuLoja: true } }),
        prisma.avaliacaoApp.groupBy({
          by: ['versaoApp'],
          where,
          _avg: { nota: true },
          _count: { id: true },
        }),
        prisma.avaliacaoApp.groupBy({
          by: ['gatilho'],
          where,
          _avg: { nota: true },
          _count: { id: true },
        }),
        prisma.avaliacaoApp.groupBy({
          by: ['plataforma'],
          where,
          _avg: { nota: true },
          _count: { id: true },
        }),
      ]);

    const formatar = (linhas, chave) =>
      linhas.map((l) => ({
        [chave]: l[chave],
        total: l._count.id,
        media: l._avg.nota ? Number(l._avg.nota.toFixed(2)) : null,
      }));

    return {
      total: agregado._count.id,
      media: agregado._avg.nota ? Number(agregado._avg.nota.toFixed(2)) : null,
      distribuicao: Object.fromEntries([1, 2, 3, 4, 5].map((n) => [n, 0]).map(([n]) => [
        n,
        porNota.find((p) => p.nota === n)?._count.id ?? 0,
      ])),
      notasAltas,
      abriuLoja,
      // Das notas 4-5, quantas foram de fato para a loja.
      percentualLoja: notasAltas ? Number(((abriuLoja / notasAltas) * 100).toFixed(1)) : 0,
      porVersao: formatar(porVersao, 'versaoApp'),
      porGatilho: formatar(porGatilho, 'gatilho'),
      porPlataforma: formatar(porPlataforma, 'plataforma'),
    };
  }

  async atualizarStatus(id, status) {
    if (!STATUS.includes(status)) throw new AppError('Status inválido.', 400);
    const existente = await prisma.avaliacaoApp.findUnique({ where: { id } });
    if (!existente) throw new AppError('Avaliação não encontrada.', 404);
    return await prisma.avaliacaoApp.update({
      where: { id },
      data: { statusAdmin: status },
      select: { id: true, statusAdmin: true },
    });
  }
}

module.exports = new AvaliacaoAppService();