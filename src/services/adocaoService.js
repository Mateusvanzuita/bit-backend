// src/services/adocaoService.js
const prisma = require('../config/database');
const logger = require('../config/logger');
const ongRepository = require('../repositories/ongRepository');
const animalAdocaoRepository = require('../repositories/animalAdocaoRepository');
const { AppError } = require('../middlewares/errorHandler');
const { calcDistanciaKm, caixaGeografica, normalizarTexto } = require('../utils/geo');

// ── Regras de negócio ─────────────────────────────────────────────────────────
const LIMITE_INTERESSES_ATIVOS = 3;
const LIMITE_ALERTAS = 5;
const LIMITE_AJUDAS_ATIVAS = 10;

const INTERESSE_ATIVO = ['ENVIADO', 'EM_CONTATO'];
const AJUDA_ATIVA = ['ENVIADA', 'EM_ANDAMENTO'];

// ── Serializadores (formato que o app espera — ver src/types/adocao.ts) ───────

const arred = (km) => Number(km.toFixed(1));

function distanciaAteOng(ong, loc) {
  if (loc?.latitude == null || loc?.longitude == null) return null;
  if (ong.latitude == null || ong.longitude == null) return null;
  return arred(calcDistanciaKm(loc.latitude, loc.longitude, ong.latitude, ong.longitude));
}

function serializarOngResumo(ong, distanciaKm = null) {
  return {
    id: ong.id,
    nome: ong.nome,
    logoUrl: ong.logoUrl,
    cidade: ong.cidade,
    estado: ong.estado,
    verificada: ong.verificada,
    distanciaKm,
  };
}

// Nunca devolve latitude/longitude nem endereço: a distância é calculada aqui.
function serializarOng(ong, { distanciaKm = null, totalAnimaisDisponiveis = 0 } = {}) {
  return {
    ...serializarOngResumo(ong, distanciaKm),
    tipo: ong.tipo,
    descricao: ong.descricao,
    bannerUrl: ong.bannerUrl,
    bairro: ong.bairro,
    whatsapp: ong.whatsapp,
    instagramUrl: ong.instagramUrl,
    siteUrl: ong.siteUrl,
    cidadesAtendidas: ong.cidadesAtendidas,
    processoAdocao: ong.processoAdocao,
    taxaAdocao: ong.taxaAdocao,
    totalAnimaisDisponiveis,
  };
}

function serializarAnimal(a, { distanciaKm = null, favorito = false, padrinhos = 0, ongCompleta = null } = {}) {
  return {
    id: a.id,
    nome: a.nome,
    especie: a.especie,
    sexo: a.sexo,
    porte: a.porte,
    faseVida: a.faseVida,
    idadeMeses: a.idadeMeses,
    raca: a.raca,
    cor: a.cor,
    pesoKg: a.pesoKg,
    fotos: a.fotos,
    historia: a.historia,
    temperamento: a.temperamento,
    convivencia: a.convivencia,
    convivenciaNaoRecomendada: a.convivenciaNaoRecomendada,
    castrado: a.castrado,
    vacinado: a.vacinado,
    vermifugado: a.vermifugado,
    necessidadesEspeciais: a.necessidadesEspeciais,
    larTemporario: a.larTemporario,
    vacinas: Array.isArray(a.vacinas) ? a.vacinas : [],
    apadrinhamento: a.apadrinhamentoAtivo
      ? {
          ativo: true,
          valorSugeridoMensal: a.apadrinhamentoValorSugerido ?? 0,
          cobre: a.apadrinhamentoCobre ?? '',
          padrinhosAtuais: padrinhos,
        }
      : null,
    status: a.status,
    cidade: a.ong.cidade,
    estado: a.ong.estado,
    distanciaKm,
    atualizadoEm: a.updatedAt,
    favorito,
    ong: ongCompleta ?? serializarOngResumo(a.ong, distanciaKm),
  };
}

// RECUSADO e interesses de animal adotado/indisponível chegam ao app como ENCERRADO.
function statusInteresseEfetivo(i) {
  if (i.status === 'RECUSADO') return 'ENCERRADO';
  if (INTERESSE_ATIVO.includes(i.status) && ['ADOTADO', 'INDISPONIVEL'].includes(i.animal.status)) {
    return 'ENCERRADO';
  }
  return i.status;
}

function serializarInteresse(i) {
  return {
    id: i.id,
    status: statusInteresseEfetivo(i),
    respostas: i.respostas,
    criadoEm: i.createdAt,
    canceladoEm: i.canceladoEm ?? null,
    petCadastradoId: i.petCadastradoId ?? null,
    animal: {
      id: i.animal.id,
      nome: i.animal.nome,
      especie: i.animal.especie,
      fotoUrl: i.animal.fotos?.[0] ?? null,
      status: i.animal.status,
    },
    ong: { id: i.ong.id, nome: i.ong.nome, whatsapp: i.ong.whatsapp },
  };
}

function serializarAjuda(a) {
  return {
    id: a.id,
    tipo: a.tipo,
    ongId: a.ongId,
    animalId: a.animalId ?? undefined,
    itens: a.itens,
    atividades: a.atividades,
    valorMensal: a.valorMensal ?? undefined,
    valorDoado: a.valorDoado ?? undefined,
    disponibilidade: a.disponibilidade ?? undefined,
    mensagem: a.mensagem ?? undefined,
    status: a.status,
    criadoEm: a.createdAt,
    ongNome: a.ong.nome,
    ongWhatsapp: a.ong.whatsapp,
    animalNome: a.animal?.nome ?? null,
  };
}

const INCLUDE_INTERESSE = {
  animal: { select: { id: true, nome: true, especie: true, fotos: true, status: true } },
  ong: { select: { id: true, nome: true, whatsapp: true } },
};

const INCLUDE_AJUDA = {
  ong: { select: { id: true, nome: true, whatsapp: true } },
  animal: { select: { id: true, nome: true } },
};

const comoLista = (v) => (Array.isArray(v) ? v : []);

// ── Serviço ───────────────────────────────────────────────────────────────────

class AdocaoService {
  // ── ANIMAIS ────────────────────────────────────────────────────────────────

  async listarAnimais(userId, filtros) {
    const {
      latitude,
      longitude,
      cidade,
      estado,
      raioKm,
      cursor,
      limite = 10,
      ...resto
    } = filtros;

    const temGps = latitude != null && longitude != null;
    const loc = { latitude, longitude };

    // Sem raio = não esconde ninguém distante: ordena por distância (o app mostra km).
    const caixa = temGps && raioKm ? caixaGeografica(latitude, longitude, raioKm) : null;

    const candidatos = await animalAdocaoRepository.listarVisiveis({ ...resto, caixa });

    const comDistancia = candidatos.map((a) => ({
      a,
      distanciaKm: distanciaAteOng(a.ong, loc),
    }));

    // Sem GPS: mesma cidade → mesmo estado → resto; desempate: mais recentes.
    const rank = ({ a }) =>
      cidade && normalizarTexto(a.ong.cidade) === normalizarTexto(cidade)
        ? 0
        : estado && normalizarTexto(a.ong.estado) === normalizarTexto(estado)
          ? 1
          : 2;

    comDistancia.sort((x, y) =>
      temGps
        ? (x.distanciaKm ?? 99999) - (y.distanciaKm ?? 99999)
        : rank(x) - rank(y) || y.a.updatedAt - x.a.updatedAt,
    );

    const offset = Number.parseInt(cursor, 10) || 0;
    const pagina = comDistancia.slice(offset, offset + limite);
    const proximoCursor = offset + limite < comDistancia.length ? String(offset + limite) : null;

    const ids = pagina.map(({ a }) => a.id);
    const [favoritos, padrinhos] = await Promise.all([
      prisma.favoritoAnimal.findMany({ where: { userId, animalId: { in: ids } }, select: { animalId: true } }),
      animalAdocaoRepository.contarPadrinhos(ids),
    ]);
    const favSet = new Set(favoritos.map((f) => f.animalId));

    return {
      animais: pagina.map(({ a, distanciaKm }) =>
        serializarAnimal(a, {
          distanciaKm,
          favorito: favSet.has(a.id),
          padrinhos: padrinhos[a.id] ?? 0,
        }),
      ),
      proximoCursor,
    };
  }

  async detalhesAnimal(userId, animalId) {
    const animal = await animalAdocaoRepository.findVisivelById(animalId);
    if (!animal) throw new AppError('Animal não encontrado.', 404);

    const [favorito, padrinhos, totais] = await Promise.all([
      prisma.favoritoAnimal.findUnique({ where: { userId_animalId: { userId, animalId } } }),
      animalAdocaoRepository.contarPadrinhos([animalId]),
      ongRepository.contarDisponiveis([animal.ongId]),
    ]);

    return serializarAnimal(animal, {
      favorito: !!favorito,
      padrinhos: padrinhos[animalId] ?? 0,
      ongCompleta: serializarOng(animal.ong, { totalAnimaisDisponiveis: totais[animal.ongId] ?? 0 }),
    });
  }

  // ── ONGs ───────────────────────────────────────────────────────────────────

  async listarOngs({ latitude, longitude, cidade, estado, raioKm }) {
    const temGps = latitude != null && longitude != null;
    const caixa = temGps && raioKm ? caixaGeografica(latitude, longitude, raioKm) : null;

    const ongs = await ongRepository.listarAtivas({ caixa });
    const totais = await ongRepository.contarDisponiveis(ongs.map((o) => o.id));

    const resultado = ongs.map((o) =>
      serializarOng(o, {
        distanciaKm: distanciaAteOng(o, { latitude, longitude }),
        totalAnimaisDisponiveis: totais[o.id] ?? 0,
      }),
    );

    const rank = (o) =>
      cidade && normalizarTexto(o.cidade) === normalizarTexto(cidade)
        ? 0
        : estado && normalizarTexto(o.estado) === normalizarTexto(estado)
          ? 1
          : 2;

    return resultado.sort((a, b) =>
      temGps
        ? (a.distanciaKm ?? 99999) - (b.distanciaKm ?? 99999)
        : rank(a) - rank(b) || a.nome.localeCompare(b.nome),
    );
  }

  async detalhesOng(ongId) {
    const ong = await ongRepository.findAtivaPublica(ongId);
    if (!ong) throw new AppError('ONG não encontrada.', 404);
    const totais = await ongRepository.contarDisponiveis([ongId]);
    return serializarOng(ong, { totalAnimaisDisponiveis: totais[ongId] ?? 0 });
  }

  // "Como ajudar": PIX só aparece para ONG verificada.
  async ajudaOng(ongId) {
    const ong = await ongRepository.findAtivaComAjuda(ongId);
    if (!ong) throw new AppError('ONG não encontrada.', 404);

    const totalApadrinhaveis = await prisma.animalAdocao.count({
      where: {
        ongId,
        publicado: true,
        apadrinhamentoAtivo: true,
        status: { not: 'ADOTADO' },
      },
    });

    const pix =
      ong.verificada && ong.pixChave && ong.pixTipoChave && ong.pixTitular
        ? { chave: ong.pixChave, tipoChave: ong.pixTipoChave, titular: ong.pixTitular }
        : null;

    return {
      pix,
      necessidades: comoLista(ong.necessidades),
      entregaDoacoes: ong.entregaDoacoes ?? null,
      voluntariado: comoLista(ong.voluntariado),
      totalApadrinhaveis,
    };
  }

  // ── INTERESSES ─────────────────────────────────────────────────────────────

  async demonstrarInteresse(userId, { animalId, respostas, consentimento }) {
    if (consentimento !== true) {
      throw new AppError('É necessário autorizar o compartilhamento dos seus dados com a ONG.', 400);
    }

    const animal = await prisma.animalAdocao.findUnique({
      where: { id: animalId },
      include: { ong: { select: { id: true, nome: true, ativa: true } } },
    });
    if (!animal || !animal.publicado || !animal.ong.ativa) {
      throw new AppError('Animal não encontrado.', 404);
    }

    if (animal.status === 'ADOTADO') {
      throw new AppError(`${animal.nome} acabou de encontrar um lar 💛 Que tal conhecer outros amigos?`, 409);
    }
    if (animal.status !== 'DISPONIVEL') {
      throw new AppError(`${animal.nome} não está disponível para novos interesses no momento.`, 409);
    }

    // "Ativo de verdade": ignora interesses cujo animal já foi adotado/ficou indisponível.
    const ativos = await prisma.interesseAdocao.findMany({
      where: {
        userId,
        status: { in: INTERESSE_ATIVO },
        animal: { status: { in: ['DISPONIVEL', 'EM_PROCESSO'] } },
      },
      select: { animalId: true },
    });
    if (ativos.some((i) => i.animalId === animalId)) {
      throw new AppError('Você já enviou interesse para este animal.', 409);
    }
    if (ativos.length >= LIMITE_INTERESSES_ATIVOS) {
      throw new AppError(
        `Você já tem ${LIMITE_INTERESSES_ATIVOS} interesses ativos. Cancele um para enviar outro.`,
        429,
      );
    }

    const interesse = await prisma.interesseAdocao.create({
      data: {
        userId,
        animalId,
        ongId: animal.ongId,
        respostas,
        consentimentoEm: new Date(),
      },
      include: INCLUDE_INTERESSE,
    });

    // Sem painel da ONG: a equipe enxerga o interesse em /admin/adocao/interesses
    // e repassa à ONG. Este log permite alertar (ex: e-mail/Slack) no futuro.
    logger.info(
      { interesseId: interesse.id, ongId: animal.ongId, animalId },
      '[Adocao] Novo interesse recebido',
    );

    return serializarInteresse(interesse);
  }

  async meusInteresses(userId) {
    const interesses = await prisma.interesseAdocao.findMany({
      where: { userId },
      include: INCLUDE_INTERESSE,
      orderBy: { createdAt: 'desc' },
    });
    return interesses.map(serializarInteresse);
  }

  async cancelarInteresse(userId, interesseId) {
    const interesse = await prisma.interesseAdocao.findFirst({
      where: { id: interesseId, userId },
    });
    if (!interesse) throw new AppError('Interesse não encontrado.', 404);
    if (!INTERESSE_ATIVO.includes(interesse.status)) {
      throw new AppError('Este interesse não pode mais ser cancelado.', 409);
    }

    const atualizado = await prisma.interesseAdocao.update({
      where: { id: interesseId },
      data: { status: 'CANCELADO', canceladoEm: new Date() },
      include: INCLUDE_INTERESSE,
    });
    return serializarInteresse(atualizado);
  }

  // Liga o interesse (adoção confirmada) ao pet que o tutor criou em "Meus pets".
  async vincularPet(userId, interesseId, petId) {
    const interesse = await prisma.interesseAdocao.findFirst({
      where: { id: interesseId, userId },
    });
    if (!interesse) throw new AppError('Interesse não encontrado.', 404);
    if (interesse.status !== 'ADOCAO_CONFIRMADA') {
      throw new AppError('A adoção ainda não foi confirmada pela ONG.', 409);
    }

    const pet = await prisma.pet.findFirst({ where: { id: petId, userId }, select: { id: true } });
    if (!pet) throw new AppError('Pet não encontrado.', 404);

    const atualizado = await prisma.interesseAdocao.update({
      where: { id: interesseId },
      data: { petCadastradoId: petId },
      include: INCLUDE_INTERESSE,
    });
    return serializarInteresse(atualizado);
  }

  // ── FAVORITOS ──────────────────────────────────────────────────────────────

  async favoritar(userId, animalId) {
    const animal = await animalAdocaoRepository.findVisivelById(animalId);
    if (!animal) throw new AppError('Animal não encontrado.', 404);

    await prisma.favoritoAnimal.upsert({
      where: { userId_animalId: { userId, animalId } },
      create: { userId, animalId },
      update: {},
    });
    return { favorito: true };
  }

  async desfavoritar(userId, animalId) {
    await prisma.favoritoAnimal.deleteMany({ where: { userId, animalId } });
    return { favorito: false };
  }

  async listarFavoritos(userId) {
    const favoritos = await prisma.favoritoAnimal.findMany({
      where: { userId, animal: { publicado: true, ong: { ativa: true } } },
      include: {
        animal: { include: { ong: { select: ongRepository.constructor.name ? require('../repositories/ongRepository').ONG_PUBLICO_SELECT : undefined } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const ids = favoritos.map((f) => f.animalId);
    const padrinhos = await animalAdocaoRepository.contarPadrinhos(ids);

    return favoritos.map((f) =>
      serializarAnimal(f.animal, { favorito: true, padrinhos: padrinhos[f.animalId] ?? 0 }),
    );
  }

  // ── ALERTAS ("Avise-me quando chegar um assim") ────────────────────────────

  async criarAlerta(userId, dados) {
    const total = await prisma.alertaAdocao.count({ where: { userId } });
    if (total >= LIMITE_ALERTAS) {
      throw new AppError(`Você já tem ${LIMITE_ALERTAS} alertas. Remova um para criar outro.`, 429);
    }
    return await prisma.alertaAdocao.create({
      data: {
        userId,
        especie: dados.especie ?? null,
        porte: dados.porte ?? null,
        faseVida: dados.faseVida ?? null,
        sexo: dados.sexo ?? null,
        cidade: dados.cidade ?? null,
        estado: dados.estado ? dados.estado.toUpperCase() : null,
      },
      select: {
        id: true,
        especie: true,
        porte: true,
        faseVida: true,
        sexo: true,
        cidade: true,
        estado: true,
        createdAt: true,
      },
    }).then(({ createdAt, ...resto }) => ({ ...resto, criadoEm: createdAt }));
  }

  async listarAlertas(userId) {
    const alertas = await prisma.alertaAdocao.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return alertas.map(({ createdAt, userId: _u, ultimoAvisoEm, ...resto }) => ({
      ...resto,
      criadoEm: createdAt,
    }));
  }

  async removerAlerta(userId, alertaId) {
    const r = await prisma.alertaAdocao.deleteMany({ where: { id: alertaId, userId } });
    if (r.count === 0) throw new AppError('Alerta não encontrado.', 404);
  }

  // ── DENÚNCIAS ──────────────────────────────────────────────────────────────

  async denunciarAnimal(userId, animalId, { motivo, detalhe }) {
    const animal = await prisma.animalAdocao.findUnique({
      where: { id: animalId },
      select: { id: true, nome: true, ongId: true },
    });
    if (!animal) throw new AppError('Animal não encontrado.', 404);

    // Idempotente: repetir a denúncia pendente não duplica nem revela nada.
    const existente = await prisma.denunciaAnimal.findFirst({
      where: { animalId, userId, resolvida: false },
    });
    if (!existente) {
      await prisma.denunciaAnimal.create({
        data: { animalId, userId, motivo, detalhe: detalhe || null },
      });
      logger.warn({ animalId, ongId: animal.ongId, motivo }, '[Adocao] Anúncio denunciado');
    }
  }

  // ── AJUDAS ─────────────────────────────────────────────────────────────────

  async registrarAjuda(userId, dados) {
    if (dados.consentimento !== true) {
      throw new AppError('É necessário autorizar o compartilhamento dos seus dados com a ONG.', 400);
    }

    const ong = await ongRepository.findAtivaComAjuda(dados.ongId);
    if (!ong) throw new AppError('ONG não encontrada.', 404);

    const ativas = await prisma.ajudaOng.findMany({
      where: { userId, status: { in: AJUDA_ATIVA } },
      select: { tipo: true, animalId: true },
    });

    let animalId = null;

    if (dados.tipo === 'APADRINHAR') {
      if (!dados.animalId) throw new AppError('Escolha o animal que você quer apadrinhar.', 400);
      const animal = await prisma.animalAdocao.findFirst({
        where: { id: dados.animalId, ongId: ong.id, publicado: true },
      });
      if (!animal || !animal.apadrinhamentoAtivo || animal.status === 'ADOTADO') {
        throw new AppError('Este animal não está disponível para apadrinhamento.', 409);
      }
      if (ativas.some((a) => a.tipo === 'APADRINHAR' && a.animalId === animal.id)) {
        throw new AppError('Você já pediu para apadrinhar este animal.', 409);
      }
      if (!dados.valorMensal) throw new AppError('Informe a contribuição mensal.', 400);
      animalId = animal.id;
    }

    if (dados.tipo === 'ITENS' && !(dados.itens?.length > 0)) {
      throw new AppError('Escolha pelo menos um item.', 400);
    }
    if (dados.tipo === 'VOLUNTARIADO' && !(dados.atividades?.length > 0)) {
      throw new AppError('Escolha pelo menos uma atividade.', 400);
    }
    if (dados.tipo === 'DOACAO_FINANCEIRA' && !(ong.verificada && ong.pixChave)) {
      throw new AppError('Esta ONG não recebe doações por PIX pelo Bitzy.', 409);
    }

    if (ativas.length >= LIMITE_AJUDAS_ATIVAS) {
      throw new AppError(
        'Você já tem vários pedidos de ajuda em andamento. Cancele algum para enviar outro.',
        429,
      );
    }

    const ajuda = await prisma.ajudaOng.create({
      data: {
        userId,
        ongId: ong.id,
        tipo: dados.tipo,
        animalId,
        itens: dados.itens ?? [],
        atividades: dados.atividades ?? [],
        valorMensal: dados.valorMensal ?? null,
        valorDoado: dados.valorDoado ?? null,
        disponibilidade: dados.disponibilidade ?? null,
        mensagem: dados.mensagem ?? null,
        consentimentoEm: new Date(),
      },
      include: INCLUDE_AJUDA,
    });

    logger.info({ ajudaId: ajuda.id, ongId: ong.id, tipo: dados.tipo }, '[Adocao] Novo pedido de ajuda');
    return serializarAjuda(ajuda);
  }

  async minhasAjudas(userId) {
    const ajudas = await prisma.ajudaOng.findMany({
      where: { userId },
      include: INCLUDE_AJUDA,
      orderBy: { createdAt: 'desc' },
    });
    return ajudas.map(serializarAjuda);
  }

  async cancelarAjuda(userId, ajudaId) {
    const ajuda = await prisma.ajudaOng.findFirst({ where: { id: ajudaId, userId } });
    if (!ajuda) throw new AppError('Pedido não encontrado.', 404);
    if (!AJUDA_ATIVA.includes(ajuda.status)) {
      throw new AppError('Este pedido não pode mais ser cancelado.', 409);
    }
    const atualizada = await prisma.ajudaOng.update({
      where: { id: ajudaId },
      data: { status: 'CANCELADA' },
      include: INCLUDE_AJUDA,
    });
    return serializarAjuda(atualizada);
  }
}

module.exports = new AdocaoService();
module.exports.serializarInteresse = serializarInteresse;
module.exports.serializarAnimal = serializarAnimal;
module.exports.INCLUDE_INTERESSE = INCLUDE_INTERESSE;