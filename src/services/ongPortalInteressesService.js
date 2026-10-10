// src/services/ongPortalInteressesService.js
// Interesses ("Quero conhecer") recebidos pela ONG e pedidos de ajuda. O backend decide o que pode ser feito
// (`acoesPermitidas`, `statusEfetivo`); o portal só mostra.
const prisma = require('../config/database');
const C = require('../utils/ongPortalCommon');
const notificationService = require('./notificationService');
const { avisarInteressadosAdotado } = require('./ongPortalAnimaisService');

const ATIVO = ['ENVIADO', 'EM_CONTATO'];
const ANIMAL_ABERTO = ['DISPONIVEL', 'EM_PROCESSO'];
const GRUPOS_INTERESSE = ['novos', 'em_contato', 'finalizados'];
const GRUPOS_AJUDA = ['novos', 'em_andamento', 'finalizados'];

// Um interesse ainda aberto cujo animal já foi adotado/ficou indisponível é mostrado como ENCERRADO.
const WHERE_GRUPO_INTERESSE = {
  novos: { status: 'ENVIADO', animal: { status: { in: ANIMAL_ABERTO } } },
  em_contato: { status: 'EM_CONTATO', animal: { status: { in: ANIMAL_ABERTO } } },
  finalizados: {
    OR: [
      { status: { in: ['CANCELADO', 'RECUSADO', 'ADOCAO_CONFIRMADA'] } },
      { status: { in: ATIVO }, animal: { status: { notIn: ANIMAL_ABERTO } } },
    ],
  },
};

const MORADIAS = ['CASA_COM_QUINTAL', 'CASA_SEM_QUINTAL', 'APARTAMENTO'];
const EXPERIENCIAS = ['PRIMEIRO_PET', 'JA_TIVE', 'TENHO_PETS'];

function statusEfetivo(i) {
  return ATIVO.includes(i.status) && !ANIMAL_ABERTO.includes(i.animal.status) ? 'ENCERRADO' : i.status;
}

function acoesInteresse(i) {
  if (!ATIVO.includes(i.status) || !ANIMAL_ABERTO.includes(i.animal.status)) return [];
  const a = [];
  if (i.status === 'ENVIADO') a.push('INICIAR_CONTATO');
  a.push('RECUSAR', 'CONFIRMAR_ADOCAO');
  return a;
}

const animalResumo = (a) => ({ id: a.id, nome: a.nome, especie: a.especie, fotoUrl: a.fotos[0] ?? null });

// `respostas` é JSON livre no banco: só passam os campos conhecidos.
function respostasSeguras(r) {
  const o = r && typeof r === 'object' ? r : {};
  return {
    moradia: MORADIAS.includes(o.moradia) ? o.moradia : 'APARTAMENTO',
    temCriancas: o.temCriancas === true,
    temOutrosPets: o.temOutrosPets === true,
    experiencia: EXPERIENCIAS.includes(o.experiencia) ? o.experiencia : 'PRIMEIRO_PET',
    mensagem: typeof o.mensagem === 'string' && o.mensagem.trim() ? o.mensagem : null,
  };
}

const INCLUDE_INTERESSE = {
  user: { select: { nome: true, email: true, cidade: true, estado: true } },
  animal: { select: { id: true, nome: true, especie: true, fotos: true, status: true } },
};

function detalheInteresse(i) {
  return {
    id: i.id,
    status: i.status,
    statusEfetivo: statusEfetivo(i),
    criadoEm: i.createdAt,
    consentimentoEm: i.consentimentoEm,
    animal: { ...animalResumo(i.animal), status: i.animal.status },
    // Só nome, e-mail e cidade/UF. Sem userId, sem telefone.
    interessado: { nome: i.user.nome, email: i.user.email, cidade: i.user.cidade ?? null, estado: i.user.estado ?? null },
    respostas: respostasSeguras(i.respostas),
    acoesPermitidas: acoesInteresse(i),
  };
}

function acoesPedido(status) {
  if (status === 'ENVIADA') return ['INICIAR', 'CONCLUIR'];
  if (status === 'EM_ANDAMENTO') return ['CONCLUIR'];
  return [];
}

function pedido(a) {
  return {
    id: a.id, tipo: a.tipo, status: a.status, criadoEm: a.createdAt, consentimentoEm: a.consentimentoEm,
    solicitante: { nome: a.user.nome, email: a.user.email },
    animal: a.animal ? { id: a.animal.id, nome: a.animal.nome } : null,
    itens: a.itens, atividades: a.atividades, valorMensal: a.valorMensal, valorDoado: a.valorDoado,
    disponibilidade: a.disponibilidade, mensagem: a.mensagem,
    acoesPermitidas: acoesPedido(a.status),
  };
}

class OngPortalInteressesService {
  // ── Interesses ────────────────────────────────────────────────────────────
  async listar(ongId, q) {
    const grupo = C.enumerado(q.grupo ?? 'novos', GRUPOS_INTERESSE, 'Grupo');
    const base = { ongId };
    if (q.animalId !== undefined) {
      if (typeof q.animalId !== 'string' || !C.UUID.test(q.animalId)) throw C.invalido('animalId inválido.');
      base.animalId = q.animalId;
    }
    const where = { ...base, ...WHERE_GRUPO_INTERESSE[grupo] };

    const { pagina, proximoCursor } = await C.paginar({
      where, cursor: q.cursor, limite: q.limite,
      consulta: (args) => prisma.interesseAdocao.findMany({ ...args, include: INCLUDE_INTERESSE }),
    });
    const [novos, emContato, finalizados] = await Promise.all(
      GRUPOS_INTERESSE.map((g) => prisma.interesseAdocao.count({ where: { ...base, ...WHERE_GRUPO_INTERESSE[g] } })),
    );
    const total = { novos, em_contato: emContato, finalizados }[grupo];

    return {
      itens: pagina.map((i) => ({
        id: i.id,
        statusEfetivo: statusEfetivo(i),
        criadoEm: i.createdAt,
        animal: animalResumo(i.animal),
        interessado: { nome: i.user.nome, cidade: i.user.cidade ?? null, estado: i.user.estado ?? null },
      })),
      proximoCursor,
      total,
      contagens: { novos, emContato, finalizados },
    };
  }

  async _achar(ongId, id) {
    C.exigirUuid(id);
    const i = await prisma.interesseAdocao.findFirst({ where: { id, ongId }, include: INCLUDE_INTERESSE });
    if (!i) throw C.naoEncontrado('Interesse não encontrado.');
    return i;
  }

  async obter(ongId, id) {
    return detalheInteresse(await this._achar(ongId, id));
  }

  async alterarStatus(ongId, id, body) {
    C.soCamposPermitidos(body, ['status']);
    const novo = C.enumerado(body.status, ['EM_CONTATO', 'RECUSADO'], 'Status');
    const i = await this._achar(ongId, id);
    const permitida = novo === 'EM_CONTATO' ? 'INICIAR_CONTATO' : 'RECUSAR';
    if (!acoesInteresse(i).includes(permitida)) {
      throw C.conflito('Este interesse não pode mais ser alterado.');
    }
    // Atômico: só muda se o status ainda for o que acabamos de ler.
    const r = await prisma.interesseAdocao.updateMany({ where: { id, ongId, status: i.status }, data: { status: novo } });
    if (r.count === 0) throw C.conflito('Este interesse mudou. Atualize a página.');
    return this.obter(ongId, id);
  }

  /**
   * ONG confirma que o animal foi adotado por esta pessoa. ATÔMICO: a transação só conclui se o animal
   * ainda estava aberto E o interesse ainda estava ativo; qualquer outra confirmação concorrente recebe 409.
   */
  async confirmarAdocao(ongId, id) {
    const i = await this._achar(ongId, id);
    if (!acoesInteresse(i).includes('CONFIRMAR_ADOCAO')) {
      throw C.conflito('Não é possível confirmar: este interesse já foi encerrado ou o animal não está mais disponível.');
    }

    await prisma.$transaction(async (tx) => {
      const a = await tx.animalAdocao.updateMany({
        where: { id: i.animalId, ongId, status: { in: ANIMAL_ABERTO } },
        data: { status: 'ADOTADO', adotadoEm: new Date() },
      });
      if (a.count === 0) throw C.conflito('Este animal já foi adotado ou ficou indisponível.');
      const r = await tx.interesseAdocao.updateMany({
        where: { id, ongId, status: { in: ATIVO } },
        data: { status: 'ADOCAO_CONFIRMADA' },
      });
      if (r.count === 0) throw C.conflito('Este interesse já foi encerrado.');
    });

    // Melhor esforço: avisos nunca derrubam a confirmação (já gravada).
    try {
      await notificationService.notificar(i.userId, {
        titulo: `🎉 ${i.animal.nome} encontrou uma família!`,
        mensagem: `Adicione ${i.animal.nome} aos seus pets em poucos toques.`,
        tipo: 'SISTEMA',
        pathKey: `/adocao/boas-vindas/${id}`,
      });
      await avisarInteressadosAdotado(i.animal, i.userId);
    } catch (e) {
      console.error('[ong-portal] aviso pós-adoção falhou:', e.message);
    }
    return this.obter(ongId, id);
  }

  // ── Pedidos de ajuda ──────────────────────────────────────────────────────
  async listarPedidos(ongId, q) {
    const grupo = C.enumerado(q.grupo ?? 'novos', GRUPOS_AJUDA, 'Grupo');
    const STATUS_GRUPO = { novos: ['ENVIADA'], em_andamento: ['EM_ANDAMENTO'], finalizados: ['CONCLUIDA', 'CANCELADA'] };
    const where = { ongId, status: { in: STATUS_GRUPO[grupo] } };

    const { pagina, proximoCursor } = await C.paginar({
      where, cursor: q.cursor, limite: q.limite,
      consulta: (args) => prisma.ajudaOng.findMany({
        ...args,
        include: { user: { select: { nome: true, email: true } }, animal: { select: { id: true, nome: true } } },
      }),
    });
    const [novos, emAndamento, finalizados] = await Promise.all(
      GRUPOS_AJUDA.map((g) => prisma.ajudaOng.count({ where: { ongId, status: { in: STATUS_GRUPO[g] } } })),
    );
    const total = { novos, em_andamento: emAndamento, finalizados }[grupo];
    return { itens: pagina.map(pedido), proximoCursor, total, contagens: { novos, emAndamento, finalizados } };
  }

  async alterarStatusPedido(ongId, id, body) {
    C.soCamposPermitidos(body, ['status']);
    const novo = C.enumerado(body.status, ['EM_ANDAMENTO', 'CONCLUIDA'], 'Status');
    C.exigirUuid(id);
    const a = await prisma.ajudaOng.findFirst({
      where: { id, ongId },
      include: { user: { select: { nome: true, email: true } }, animal: { select: { id: true, nome: true } } },
    });
    if (!a) throw C.naoEncontrado('Pedido não encontrado.');

    const acao = novo === 'EM_ANDAMENTO' ? 'INICIAR' : 'CONCLUIR';
    if (!acoesPedido(a.status).includes(acao)) throw C.conflito('Este pedido não pode mais ser alterado.');

    const r = await prisma.ajudaOng.updateMany({ where: { id, ongId, status: a.status }, data: { status: novo } });
    if (r.count === 0) throw C.conflito('Este pedido não pode mais ser alterado.');
    return pedido({ ...a, status: novo });
  }
}

module.exports = new OngPortalInteressesService();
module.exports.WHERE_GRUPO_INTERESSE = WHERE_GRUPO_INTERESSE;
