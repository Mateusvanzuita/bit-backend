// src/services/ongPortalAnimaisService.js
// Animais da ONG. `ongId` vem SEMPRE do token; animal de outra ONG responde 404.
const prisma = require('../config/database');
const C = require('../utils/ongPortalCommon');
const { validarUrlImagem } = require('../utils/ongImagens');
const notificationService = require('./notificationService');

const ESPECIES = ['CACHORRO', 'GATO'];
const SEXOS = ['MACHO', 'FEMEA'];
const PORTES = ['PEQUENO', 'MEDIO', 'GRANDE'];
const FASES = ['FILHOTE', 'ADULTO', 'IDOSO'];
const STATUS = ['DISPONIVEL', 'EM_PROCESSO', 'ADOTADO', 'INDISPONIVEL'];
const COMPORTAMENTOS = ['CALMO', 'AGITADO', 'SOCIAVEL', 'TIMIDO', 'AGRESSIVO', 'BRINCALHAO'];
const CONVIVENCIAS = ['CRIANCAS', 'OUTROS_CAES', 'GATOS', 'ESTRANHOS', 'IDOSOS'];
const CATEGORIAS_VACINA = ['vaccine', 'dewormer', 'other'];
const INTERESSE_ATIVO = ['ENVIADO', 'EM_CONTATO'];
const MAX_FOTOS = 10;

const CAMPOS_INPUT = [
  'nome', 'especie', 'sexo', 'porte', 'historia', 'faseVida', 'idadeMeses', 'raca', 'cor', 'pesoKg',
  'temperamento', 'convivencia', 'convivenciaNaoRecomendada', 'castrado', 'vacinado', 'vermifugado',
  'necessidadesEspeciais', 'larTemporario', 'vacinas', 'apadrinhamentoAtivo', 'apadrinhamentoValorSugerido', 'apadrinhamentoCobre',
];

function validarVacinas(v) {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > 30) throw C.invalido('Vacinas: no máximo 30 itens.');
  return v.map((x, i) => {
    if (!x || typeof x !== 'object') throw C.invalido(`Vacina ${i + 1} inválida.`);
    return {
      nome: C.texto(x.nome, 'Nome da vacina', { min: 1, max: 100 }),
      categoria: C.enumerado(x.categoria, CATEGORIAS_VACINA, 'Categoria da vacina'),
      dataAplicacao: C.dataISO(x.dataAplicacao, 'Data de aplicação'),
      proximaDose: x.proximaDose ? C.dataISO(x.proximaDose, 'Próxima dose') : null,
      observacoes: C.texto(x.observacoes, 'Observações da vacina', { max: 300, nulavel: true }),
    };
  });
}

/** Valida e normaliza o AnimalInput (mesmos limites do validador do app/admin). */
function validarAnimal(b) {
  C.soCamposPermitidos(b, [...CAMPOS_INPUT, 'publicado']);
  const apadAtivo = C.booleano(b.apadrinhamentoAtivo ?? false, 'Apadrinhamento');
  return {
    nome: C.texto(b.nome, 'Nome', { min: 1, max: 60 }),
    especie: C.enumerado(b.especie, ESPECIES, 'Espécie'),
    sexo: C.enumerado(b.sexo, SEXOS, 'Sexo'),
    porte: C.enumerado(b.porte, PORTES, 'Porte'),
    historia: C.texto(b.historia, 'História', { min: 10, max: 4000 }),
    faseVida: C.enumerado(b.faseVida ?? null, FASES, 'Fase da vida', { nulavel: true }),
    idadeMeses: C.numero(b.idadeMeses, 'Idade', { min: 0, max: 400, inteiro: true }),
    raca: C.texto(b.raca, 'Raça', { max: 80, nulavel: true }),
    cor: C.texto(b.cor, 'Cor', { max: 60, nulavel: true }),
    pesoKg: C.numero(b.pesoKg, 'Peso', { min: 0.1, max: 120 }),
    temperamento: C.listaEnum(b.temperamento, COMPORTAMENTOS, 'Temperamento'),
    convivencia: C.listaEnum(b.convivencia, CONVIVENCIAS, 'Convivência'),
    convivenciaNaoRecomendada: C.listaEnum(b.convivenciaNaoRecomendada, CONVIVENCIAS, 'Convivência não recomendada'),
    castrado: C.booleano(b.castrado, 'Castrado', { nulavel: true }),
    vacinado: C.booleano(b.vacinado, 'Vacinado', { nulavel: true }),
    vermifugado: C.booleano(b.vermifugado, 'Vermifugado', { nulavel: true }),
    necessidadesEspeciais: C.texto(b.necessidadesEspeciais, 'Necessidades especiais', { max: 1000, nulavel: true }),
    larTemporario: C.booleano(b.larTemporario ?? false, 'Lar temporário'),
    vacinas: validarVacinas(b.vacinas),
    apadrinhamentoAtivo: apadAtivo,
    // Sem apadrinhamento ativo, valor e descrição não ficam gravados.
    apadrinhamentoValorSugerido: apadAtivo ? C.numero(b.apadrinhamentoValorSugerido, 'Valor sugerido', { min: 1, max: 100000 }) : null,
    apadrinhamentoCobre: apadAtivo ? C.texto(b.apadrinhamentoCobre, 'O que o apadrinhamento cobre', { max: 200, nulavel: true }) : null,
  };
}

function detalhe(a) {
  return {
    id: a.id, nome: a.nome, especie: a.especie, sexo: a.sexo, porte: a.porte, historia: a.historia,
    faseVida: a.faseVida, idadeMeses: a.idadeMeses, raca: a.raca, cor: a.cor, pesoKg: a.pesoKg,
    temperamento: a.temperamento, convivencia: a.convivencia, convivenciaNaoRecomendada: a.convivenciaNaoRecomendada,
    castrado: a.castrado, vacinado: a.vacinado, vermifugado: a.vermifugado,
    necessidadesEspeciais: a.necessidadesEspeciais, larTemporario: a.larTemporario,
    vacinas: Array.isArray(a.vacinas) ? a.vacinas : [],
    apadrinhamentoAtivo: a.apadrinhamentoAtivo, apadrinhamentoValorSugerido: a.apadrinhamentoValorSugerido,
    apadrinhamentoCobre: a.apadrinhamentoCobre,
    fotos: a.fotos, status: a.status, publicado: a.publicado, createdAt: a.createdAt,
  };
}

async function avisarInteressadosAdotado(animal, ignorarUserId = null) {
  const interessados = await prisma.interesseAdocao.findMany({
    where: { animalId: animal.id, status: { in: INTERESSE_ATIVO } },
    select: { userId: true },
  });
  await Promise.allSettled(
    interessados.filter((i) => i.userId !== ignorarUserId).map((i) =>
      notificationService.notificar(i.userId, {
        titulo: `${animal.nome} encontrou um lar 💛`,
        mensagem: 'Outros amigos esperam por uma família. Que tal conhecer?',
        tipo: 'SISTEMA',
        pathKey: '/adocao',
      }),
    ),
  );
}

class OngPortalAnimaisService {
  async _achar(ongId, id) {
    C.exigirUuid(id);
    const a = await prisma.animalAdocao.findFirst({ where: { id, ongId } });
    if (!a) throw C.naoEncontrado('Animal não encontrado.');
    return a;
  }

  async listar(ongId, q) {
    const where = { ongId };
    if (q.status !== undefined) where.status = C.enumerado(q.status, STATUS, 'Status');
    if (q.publicado !== undefined) {
      if (!['true', 'false'].includes(q.publicado)) throw C.invalido('Filtro de publicação inválido.');
      where.publicado = q.publicado === 'true';
    }
    if (q.busca !== undefined && String(q.busca).trim()) {
      const b = String(q.busca).trim();
      if (b.length > 60) throw C.invalido('Busca muito longa.');
      where.nome = { contains: b, mode: 'insensitive' };
    }

    const { pagina, proximoCursor } = await C.paginar({
      where, cursor: q.cursor, limite: q.limite,
      consulta: (args) => prisma.animalAdocao.findMany({
        ...args,
        select: {
          id: true, nome: true, especie: true, idadeMeses: true, fotos: true, status: true, publicado: true, createdAt: true,
          _count: { select: { favoritos: true, interesses: { where: { status: { not: 'CANCELADO' } } } } },
        },
      }),
    });
    const total = await prisma.animalAdocao.count({ where });

    return {
      itens: pagina.map((a) => ({
        id: a.id, nome: a.nome, especie: a.especie, idadeMeses: a.idadeMeses, fotoUrl: a.fotos[0] ?? null,
        status: a.status, publicado: a.publicado, createdAt: a.createdAt,
        favoritos: a._count.favoritos, interesses: a._count.interesses,
        visualizacoes: null, // ainda não existe registro de visualizações
      })),
      proximoCursor,
      total,
    };
  }

  async obter(ongId, id) {
    return detalhe(await this._achar(ongId, id));
  }

  async criar(ongId, body) {
    const dados = validarAnimal(body);
    const publicado = C.booleano(body.publicado, 'Publicado');
    const a = await prisma.animalAdocao.create({
      data: {
        ...dados,
        ongId, // do token
        fotos: [],
        status: 'DISPONIVEL',
        publicado,
        publicadoEm: publicado ? new Date() : null,
      },
    });
    return detalhe(a);
  }

  async atualizar(ongId, id, body) {
    if (body && typeof body === 'object' && 'publicado' in body) throw C.invalido('Campo não permitido: publicado.');
    await this._achar(ongId, id);
    const dados = validarAnimal(body);
    const r = await prisma.animalAdocao.updateMany({ where: { id, ongId }, data: dados });
    if (r.count === 0) throw C.naoEncontrado('Animal não encontrado.');
    return this.obter(ongId, id);
  }

  async alterarStatus(ongId, id, body) {
    C.soCamposPermitidos(body, ['status']);
    const novo = C.enumerado(body.status, STATUS, 'Status');
    const atual = await this._achar(ongId, id);
    if (atual.status === novo) return detalhe(atual);

    const data = { status: novo };
    if (novo === 'ADOTADO') data.adotadoEm = new Date();
    else if (atual.status === 'ADOTADO') data.adotadoEm = null; // reabrir limpa a data

    // Só muda se ninguém alterou nesse meio-tempo (ex.: adoção confirmada em outra aba).
    const r = await prisma.animalAdocao.updateMany({ where: { id, ongId, status: atual.status }, data });
    if (r.count === 0) throw C.conflito('A situação deste animal mudou. Atualize a página e tente de novo.');

    if (novo === 'ADOTADO') await avisarInteressadosAdotado(atual);
    return this.obter(ongId, id);
  }

  async alterarPublicacao(ongId, id, body) {
    C.soCamposPermitidos(body, ['publicado']);
    const publicado = C.booleano(body.publicado, 'Publicado');
    const atual = await this._achar(ongId, id);
    const data = { publicado };
    if (publicado && !atual.publicadoEm) data.publicadoEm = new Date();
    await prisma.animalAdocao.updateMany({ where: { id, ongId }, data });
    return this.obter(ongId, id);
  }

  async atualizarFotos(ongId, id, body) {
    C.soCamposPermitidos(body, ['fotos']);
    if (!Array.isArray(body.fotos) || body.fotos.length > MAX_FOTOS) throw C.invalido(`Envie no máximo ${MAX_FOTOS} fotos.`);
    await this._achar(ongId, id);
    const fotos = body.fotos.map((u) => {
      if (typeof u !== 'string') throw C.invalido('Foto inválida.');
      return validarUrlImagem(u, ongId, 'animal-foto', 'Foto');
    });
    if (new Set(fotos).size !== fotos.length) throw C.invalido('Há fotos repetidas.');
    await prisma.animalAdocao.updateMany({ where: { id, ongId }, data: { fotos } });
    return this.obter(ongId, id);
  }
}

module.exports = new OngPortalAnimaisService();
module.exports.validarAnimal = validarAnimal;
module.exports.avisarInteressadosAdotado = avisarInteressadosAdotado;
