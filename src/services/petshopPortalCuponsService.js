// src/services/petshopPortalCuponsService.js
// Cupons do pet shop no Bitzy Club. `petShopId` vem SEMPRE do token; cupom de outra loja responde 404.
// Regras reaproveitadas de clubService.criarCupom (limite de ativos, cálculo de dataFim, aviso aos seguidores),
// mas com whitelist de campos (o clubService original espalha o body inteiro no create).
// Não existe exclusão: CupomResgate tem FK com cascade, então apagar o cupom apagaria o histórico dos tutores. Desativar = ativo:false.
const prisma = require('../config/database');
const C = require('../utils/ongPortalCommon');
const { validarUrlImagem } = require('../utils/petshopImagens');
const { calcularDataFim } = require('./clubService');
const notificationService = require('./notificationService');

const CATEGORIAS = ['SERVICOS', 'ALIMENTACAO', 'SAUDE', 'ACESSORIOS', 'GATO', 'OUTROS'];
const ICONES = ['DESCONTO', 'BANHO_TOSA', 'PRODUTO', 'VIP', 'SAZONAL', 'SAUDE', 'ALIMENTACAO', 'BRINDE', 'COMBO'];
const BENEFICIOS = ['DESCONTO_PERCENTUAL', 'DESCONTO_FIXO', 'BRINDE', 'COMBO'];
const DURACOES = ['PERMANENTE', 'MENSAL', 'SEMANAL', 'FLASH', 'HAPPY_HOUR', 'SAZONAL'];
const OBJETIVOS = ['FIDELIZACAO', 'RECUPERACAO', 'AUMENTO_TICKET', 'GIRO_ESTOQUE', 'SAZONAL', 'LANCAMENTO', 'AQUISICAO'];
const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

const CAMPOS = [
  'titulo', 'descricao', 'categoria', 'subcategoria', 'tipoBeneficio', 'valorDesconto', 'codigoDisplay',
  'iconeTipo', 'objetivo', 'duracaoTipo', 'dataFim', 'happyHourInicio', 'happyHourFim',
  'limiteUsoTotal', 'limiteUsoPorUser', 'bannerUrl',
];
// Depois que alguém resgatou, o benefício não pode mudar por baixo dele.
const TRAVADOS_COM_RESGATE = ['tipoBeneficio', 'valorDesconto', 'duracaoTipo', 'dataFim', 'happyHourInicio', 'happyHourFim'];

const agoraAtivo = () => ({ OR: [{ dataFim: null }, { dataFim: { gt: new Date() } }] });
const base = (petShopId) => ({ petShopId, tipo: { not: 'FAVORITO' } }); // o cupom FAVORITO é automático, não aparece aqui

function filtroGrupo(grupo) {
  const agora = new Date();
  switch (grupo) {
    case 'ativos': return { ativo: true, ...agoraAtivo() };
    case 'inativos': return { ativo: false, ...agoraAtivo() };
    case 'encerrados': return { dataFim: { lte: agora } };
    case undefined: return {};
    default: throw C.invalido('Grupo inválido.');
  }
}

// Dia no fuso de São Paulo (o prazo é gravado às 23:59:59-03:00, que em UTC já é o dia seguinte).
const dataFimIso = (c) => (c.dataFim ? C.diaSP(c.dataFim) : null);

function serializar(c, uso = null) {
  const origemCrm = Boolean(c.origemCrmCupomId);
  return {
    id: c.id, titulo: c.titulo, descricao: c.descricao, categoria: c.categoria, subcategoria: c.subcategoria,
    tipoBeneficio: c.tipoBeneficio, valorDesconto: c.valorDesconto, codigoDisplay: c.codigoDisplay,
    iconeTipo: c.iconeTipo, objetivo: c.objetivo, duracaoTipo: c.duracaoTipo,
    dataInicio: c.dataInicio, dataFim: c.dataFim,
    happyHourInicio: c.happyHourInicio, happyHourFim: c.happyHourFim,
    limiteUsoTotal: c.limiteUsoTotal, limiteUsoPorUser: c.limiteUsoPorUser, bannerUrl: c.bannerUrl,
    ativo: c.ativo, encerrado: Boolean(c.dataFim && c.dataFim <= new Date()),
    totalResgates: c.totalResgates, createdAt: c.createdAt,
    origemCrm,
    // O front só mostra o que o backend libera:
    travado: c.totalResgates > 0,   // benefício e prazo não editam mais
    somenteLeitura: origemCrm,      // veio do CRM: editar lá (aqui só ativar/desativar)
    uso, // { resgatados, ativos, utilizados, expirados, usosTotais } | null
  };
}

function validar(b, petShopId, atual = null) {
  const tipoBeneficio = C.enumerado(b.tipoBeneficio ?? 'DESCONTO_PERCENTUAL', BENEFICIOS, 'Tipo de benefício');
  const descricao = C.texto(b.descricao, 'Descrição', { max: 500, nulavel: true });
  let valorDesconto = C.numero(b.valorDesconto ?? null, 'Valor do desconto', { min: 0.01, max: 100000 });
  if (tipoBeneficio === 'DESCONTO_PERCENTUAL') {
    if (valorDesconto === null || valorDesconto < 1 || valorDesconto > 100) throw C.invalido('O desconto percentual deve ficar entre 1 e 100.');
  } else if (tipoBeneficio === 'DESCONTO_FIXO') {
    if (valorDesconto === null) throw C.invalido('Informe o valor do desconto em reais.');
  } else {
    valorDesconto = null; // brinde e combo se descrevem no texto
    if (!descricao) throw C.invalido('Descreva o brinde ou o combo na descrição.');
  }

  const duracaoTipo = C.enumerado(b.duracaoTipo ?? 'PERMANENTE', DURACOES, 'Duração');
  let dataFimManual = null;
  if (duracaoTipo === 'SAZONAL') {
    const dia = C.dataISO(String(b.dataFim ?? '').slice(0, 10), 'Data de término');
    dataFimManual = new Date(`${dia}T23:59:59-03:00`);
    // Cupom já resgatado não muda de prazo: não exige data futura só para editar o texto.
    if (!(atual && atual.totalResgates > 0) && dataFimManual <= new Date()) throw C.invalido('A data de término deve ser futura.');
  }
  let happyHourInicio = null;
  let happyHourFim = null;
  if (duracaoTipo === 'HAPPY_HOUR') {
    happyHourInicio = b.happyHourInicio;
    happyHourFim = b.happyHourFim;
    if (!HORA.test(String(happyHourInicio)) || !HORA.test(String(happyHourFim))) throw C.invalido('Informe o horário do happy hour (HH:MM).');
    if (happyHourFim <= happyHourInicio) throw C.invalido('O fim do happy hour deve ser depois do início.');
  }

  const codigo = C.texto(b.codigoDisplay, 'Código', { max: 30, nulavel: true });
  return {
    dados: {
      titulo: C.texto(b.titulo, 'Título', { min: 3, max: 100 }),
      descricao,
      categoria: C.enumerado(b.categoria ?? 'OUTROS', CATEGORIAS, 'Categoria'),
      subcategoria: C.texto(b.subcategoria, 'Subcategoria', { max: 80, nulavel: true }),
      tipoBeneficio,
      valorDesconto,
      codigoDisplay: codigo ? codigo.toUpperCase() : null,
      iconeTipo: C.enumerado(b.iconeTipo ?? 'DESCONTO', ICONES, 'Ícone'),
      objetivo: C.enumerado(b.objetivo ?? 'FIDELIZACAO', OBJETIVOS, 'Objetivo'),
      duracaoTipo,
      tipo: duracaoTipo === 'SAZONAL' ? 'SAZONAL' : 'FIXO',
      happyHourInicio,
      happyHourFim,
      limiteUsoTotal: C.numero(b.limiteUsoTotal ?? null, 'Limite total de resgates', { min: 1, max: 1000000, inteiro: true }),
      // 0 = ilimitado por pessoa (mesma regra de clubService.utilizarCupom)
      limiteUsoPorUser: C.numero(b.limiteUsoPorUser ?? 1, 'Limite por pessoa', { min: 0, max: 100, inteiro: true }) ?? 1,
      bannerUrl: b.bannerUrl ? validarUrlImagem(b.bannerUrl, petShopId, 'cupom-banner', 'Banner', atual?.bannerUrl ?? null) : null,
    },
    dataFimManual,
  };
}

class PetShopPortalCuponsService {
  async _petShop(petShopId) {
    const p = await prisma.petShop.findUnique({
      where: { id: petShopId },
      select: { id: true, nome: true, planoAtivo: true, limiteCuponsAtivos: true },
    });
    if (!p) throw C.naoEncontrado('Pet shop não encontrado.');
    return p;
  }

  async _achar(petShopId, id) {
    C.exigirUuid(id);
    const c = await prisma.cupom.findFirst({ where: { id, ...base(petShopId) } });
    if (!c) throw C.naoEncontrado('Cupom não encontrado.');
    return c;
  }

  // Conta só o que ocupa vaga de verdade (ativo e dentro do prazo, sem o cupom automático de favorito).
  async _checarLimite(ps, ignorarId = null) {
    const ativos = await prisma.cupom.count({
      where: { ...base(ps.id), ativo: true, ...agoraAtivo(), ...(ignorarId ? { id: { not: ignorarId } } : {}) },
    });
    const limite = ps.limiteCuponsAtivos ?? 10;
    if (ativos >= limite) {
      throw C.conflito(`Você já tem ${limite} cupons ativos. Desative ou aguarde um encerrar para criar outro.`);
    }
  }

  async _uso(ids) {
    if (!ids.length) return new Map();
    const grupos = await prisma.cupomResgate.groupBy({
      by: ['cupomId', 'status'], where: { cupomId: { in: ids } }, _count: { id: true }, _sum: { totalUsos: true },
    });
    const mapa = new Map();
    for (const g of grupos) {
      const u = mapa.get(g.cupomId) ?? { resgatados: 0, ativos: 0, utilizados: 0, expirados: 0, usosTotais: 0 };
      u.resgatados += g._count.id;
      u.usosTotais += g._sum.totalUsos ?? 0;
      if (g.status === 'ATIVO') u.ativos += g._count.id;
      if (g.status === 'UTILIZADO') u.utilizados += g._count.id;
      if (g.status === 'EXPIRADO') u.expirados += g._count.id;
      mapa.set(g.cupomId, u);
    }
    return mapa;
  }

  async listar(petShopId, q) {
    const where = { ...base(petShopId), ...filtroGrupo(q.grupo) };
    const { pagina, proximoCursor } = await C.paginar({
      where, cursor: q.cursor, limite: q.limite,
      consulta: (args) => prisma.cupom.findMany(args),
    });
    const [uso, total, ativos, inativos, encerrados] = await Promise.all([
      this._uso(pagina.map((c) => c.id)),
      prisma.cupom.count({ where }),
      prisma.cupom.count({ where: { ...base(petShopId), ...filtroGrupo('ativos') } }),
      prisma.cupom.count({ where: { ...base(petShopId), ...filtroGrupo('inativos') } }),
      prisma.cupom.count({ where: { ...base(petShopId), ...filtroGrupo('encerrados') } }),
    ]);
    return {
      itens: pagina.map((c) => serializar(c, uso.get(c.id) ?? null)),
      proximoCursor,
      total,
      contagens: { ativos, inativos, encerrados },
    };
  }

  async obter(petShopId, id) {
    const c = await this._achar(petShopId, id);
    const uso = await this._uso([c.id]);
    return { ...serializar(c, uso.get(c.id) ?? null), dataFimDia: dataFimIso(c) };
  }

  async criar(petShopId, body) {
    C.soCamposPermitidos(body, CAMPOS);
    const ps = await this._petShop(petShopId);
    if (!ps.planoAtivo) {
      throw new (require('../utils/petshopErrors').PortalError)('Seu pet shop ainda não está liberado no Bitzy Club. Fale com a equipe Bitzy.', 403, 'PLANO_INATIVO');
    }
    const { dados, dataFimManual } = validar(body, petShopId);
    await this._checarLimite(ps);

    const cupom = await prisma.cupom.create({
      data: { ...dados, petShopId, dataFim: dataFimManual ?? calcularDataFim(dados.duracaoTipo) },
    });

    // Avisa os seguidores (melhor esforço: não segura a resposta nem derruba a criação).
    void prisma.petShopSeguidor
      .findMany({ where: { petShopId }, select: { userId: true } })
      .then((seguidores) =>
        Promise.allSettled(
          seguidores.map((s) =>
            notificationService.notificar(s.userId, {
              titulo: `Novo benefício em ${ps.nome}! 🚀`,
              mensagem: cupom.descricao ? `${cupom.titulo} — ${cupom.descricao}` : cupom.titulo,
              tipo: 'SISTEMA',
              pathKey: `/clube/${petShopId}`,
            }),
          ),
        ),
      )
      .catch(() => {});

    return this.obter(petShopId, cupom.id);
  }

  async atualizar(petShopId, id, body) {
    C.soCamposPermitidos(body, CAMPOS);
    const atual = await this._achar(petShopId, id);
    if (atual.origemCrmCupomId) throw C.conflito('Este cupom foi publicado pelo CRM. Edite-o por lá.');

    // Campos que o front não mandar continuam como estão.
    const mantidos = {
      titulo: atual.titulo, descricao: atual.descricao, categoria: atual.categoria, subcategoria: atual.subcategoria,
      tipoBeneficio: atual.tipoBeneficio, valorDesconto: atual.valorDesconto, codigoDisplay: atual.codigoDisplay,
      iconeTipo: atual.iconeTipo, objetivo: atual.objetivo, duracaoTipo: atual.duracaoTipo, dataFim: dataFimIso(atual),
      happyHourInicio: atual.happyHourInicio, happyHourFim: atual.happyHourFim,
      limiteUsoTotal: atual.limiteUsoTotal, limiteUsoPorUser: atual.limiteUsoPorUser, bannerUrl: atual.bannerUrl,
    };
    const { dados, dataFimManual } = validar({ ...mantidos, ...body }, petShopId, atual);

    if (atual.totalResgates > 0) {
      // A data de término só conta para cupom sazonal (nos demais o prazo é calculado, não digitado).
      const alterado = TRAVADOS_COM_RESGATE.find(
        (k) => k in body && !(k === 'dataFim' && atual.duracaoTipo !== 'SAZONAL') && String(body[k] ?? '') !== String(mantidos[k] ?? ''),
      );
      if (alterado) throw C.conflito('Este cupom já foi resgatado por tutores. O benefício e o prazo não podem mudar: crie um novo cupom.');
      if (dados.limiteUsoTotal !== null && dados.limiteUsoTotal < atual.totalResgates) {
        throw C.conflito(`O limite total não pode ser menor que os ${atual.totalResgates} resgates já feitos.`);
      }
    }

    // Prazo: só recalcula quando ainda não houve resgate (senão mantém o que os tutores viram).
    const dataFim = atual.totalResgates > 0 ? atual.dataFim : dataFimManual ?? calcularDataFim(dados.duracaoTipo);
    await prisma.cupom.updateMany({
      where: { id, petShopId },
      data: atual.totalResgates > 0
        ? { ...dados, tipoBeneficio: atual.tipoBeneficio, valorDesconto: atual.valorDesconto, duracaoTipo: atual.duracaoTipo, tipo: atual.tipo, happyHourInicio: atual.happyHourInicio, happyHourFim: atual.happyHourFim, dataFim }
        : { ...dados, dataFim },
    });
    return this.obter(petShopId, id);
  }

  async alterarStatus(petShopId, id, body) {
    C.soCamposPermitidos(body, ['ativo']);
    const ativo = C.booleano(body.ativo, 'Ativo');
    const atual = await this._achar(petShopId, id);
    if (atual.ativo === ativo) return this.obter(petShopId, id);
    if (ativo) {
      if (atual.dataFim && atual.dataFim <= new Date()) throw C.conflito('Este cupom já expirou. Crie um novo.');
      await this._checarLimite(await this._petShop(petShopId), id);
    }
    await prisma.cupom.updateMany({ where: { id, petShopId }, data: { ativo } });
    return this.obter(petShopId, id);
  }
}

module.exports = new PetShopPortalCuponsService();
