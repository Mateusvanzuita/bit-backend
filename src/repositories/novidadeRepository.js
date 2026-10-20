// src/repositories/novidadeRepository.js
const prisma = require('../config/database');

// Listas não trazem blocos/dica (payload leve); o detalhe traz tudo.
const SELECT_LISTA = {
  slug: true,
  titulo: true,
  resumo: true,
  categoria: true,
  capaUrl: true,
  tempoLeituraMin: true,
  publicadoEm: true,
  especies: true,
  destaque: true,
  patrocinado: true,
  parceiroNome: true,
};

const SELECT_ADMIN_LISTA = {
  id: true,
  ...SELECT_LISTA,
  status: true,
  createdAt: true,
  updatedAt: true,
};

class NovidadeRepository {
  /** Regra única de "visível no app": publicada e com data já alcançada (suporta agendamento). */
  wherePublicada() {
    return { status: 'PUBLICADA', publicadoEm: { lte: new Date() } };
  }

  async listarPublicas({ where, skip, take }) {
    const [itens, total] = await Promise.all([
      prisma.novidade.findMany({
        where,
        select: SELECT_LISTA,
        orderBy: [{ publicadoEm: 'desc' }, { id: 'asc' }],
        skip,
        take,
      }),
      prisma.novidade.count({ where }),
    ]);
    return { itens, total };
  }

  async listarAdmin({ where, skip, take }) {
    const [itens, total] = await Promise.all([
      prisma.novidade.findMany({
        where,
        select: SELECT_ADMIN_LISTA,
        orderBy: [{ updatedAt: 'desc' }],
        skip,
        take,
      }),
      prisma.novidade.count({ where }),
    ]);
    return { itens, total };
  }

  buscarPorId(id) {
    return prisma.novidade.findUnique({ where: { id } });
  }

  buscarPublicadaPorSlug(slug) {
    return prisma.novidade.findFirst({ where: { slug, ...this.wherePublicada() } });
  }

  async buscarPublicadasPorSlugs(slugs) {
    if (!slugs.length) return [];
    return prisma.novidade.findMany({
      where: { slug: { in: slugs }, ...this.wherePublicada() },
      select: SELECT_LISTA,
    });
  }

  async listarMesmaCategoria(categoria, excluirSlugs, take) {
    if (take <= 0) return [];
    return prisma.novidade.findMany({
      where: { categoria, slug: { notIn: excluirSlugs }, ...this.wherePublicada() },
      select: SELECT_LISTA,
      orderBy: { publicadoEm: 'desc' },
      take,
    });
  }

  async slugExiste(slug) {
    const r = await prisma.novidade.findUnique({ where: { slug }, select: { id: true } });
    return !!r;
  }

  criar(data) {
    return prisma.novidade.create({ data });
  }

  atualizar(id, data) {
    return prisma.novidade.update({ where: { id }, data });
  }

  excluir(id) {
    return prisma.novidade.delete({ where: { id } });
  }
}

module.exports = new NovidadeRepository();
