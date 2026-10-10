// src/services/ongAcessoService.js
// Gestão do ACESSO das ONGs ao portal e acompanhamento da ONG, para o admin do CRM
// (chamado só por rotas /internal, protegidas pela chave servidor-a-servidor).
const crypto = require('crypto');
const prisma = require('../config/database');
const env = require('../config/env');
const emailService = require('./emailService');
const adocaoAdminService = require('./adocaoAdminService');
const ongRepository = require('../repositories/ongRepository');
const { AppError } = require('../middlewares/errorHandler');

const CONVITE_VALIDADE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

const sha256 = (txt) => crypto.createHash('sha256').update(txt).digest('hex');
const novoToken = () => crypto.randomBytes(32).toString('base64url');
const emailNormalizado = (e) => String(e).trim().toLowerCase();

// Status mostrado ao admin. O convite que venceu vira CONVITE_EXPIRADO (não é gravado).
function statusDoAcesso(u) {
  if (u.status === 'CONVIDADO' && (!u.conviteExpiraEm || u.conviteExpiraEm < new Date())) {
    return 'CONVITE_EXPIRADO';
  }
  return u.status;
}

function serializarAcesso(u) {
  if (!u) return null;
  return {
    usuarioId: u.id,
    nome: u.nome,
    email: u.email,
    status: statusDoAcesso(u),
    conviteEnviadoEm: u.conviteEnviadoEm,
    conviteExpiraEm: u.status === 'CONVIDADO' ? u.conviteExpiraEm : null,
    ultimoLoginEm: u.ultimoLoginEm,
  };
}

const ACESSO_SELECT = {
  id: true, nome: true, email: true, status: true,
  conviteEnviadoEm: true, conviteExpiraEm: true, ultimoLoginEm: true,
};

// { [ongId]: { [status]: n } }
function contagensPorOng(linhas) {
  const out = {};
  for (const l of linhas) {
    out[l.ongId] ??= {};
    out[l.ongId][l.status] = l._count._all;
  }
  return out;
}

class OngAcessoService {
  // ── Lista ─────────────────────────────────────────────────────────────────
  async listar() {
    const [ongs, animais, interesses, ajudas] = await Promise.all([
      prisma.ong.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, nome: true, tipo: true, cidade: true, estado: true, logoUrl: true,
          verificada: true, ativa: true, createdAt: true,
          usuarios: { select: ACESSO_SELECT, orderBy: { createdAt: 'asc' }, take: 1 },
        },
      }),
      prisma.animalAdocao.groupBy({ by: ['ongId', 'status'], _count: { _all: true } }),
      prisma.interesseAdocao.groupBy({ by: ['ongId', 'status'], _count: { _all: true } }),
      prisma.ajudaOng.groupBy({ by: ['ongId', 'status'], _count: { _all: true } }),
    ]);

    const a = contagensPorOng(animais);
    const i = contagensPorOng(interesses);
    const j = contagensPorOng(ajudas);

    return ongs.map((o) => ({
      id: o.id,
      nome: o.nome,
      tipo: o.tipo,
      cidade: o.cidade,
      estado: o.estado,
      logoUrl: o.logoUrl,
      verificada: o.verificada,
      ativa: o.ativa,
      createdAt: o.createdAt,
      acesso: serializarAcesso(o.usuarios[0]),
      resumo: {
        animaisDisponiveis: a[o.id]?.DISPONIVEL ?? 0,
        interessesNovos: i[o.id]?.ENVIADO ?? 0,
        ajudasNovas: j[o.id]?.ENVIADA ?? 0,
      },
    }));
  }

  // ── Detalhe e acompanhamento ──────────────────────────────────────────────
  async detalhar(id) {
    const ong = await prisma.ong.findUnique({
      where: { id },
      include: { usuarios: { select: ACESSO_SELECT, orderBy: { createdAt: 'asc' }, take: 1 } },
    });
    if (!ong) throw new AppError('ONG não encontrada.', 404);

    const desde30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [animais, interesses, ajudas, publicados, ultAnimal, ultInteresse, ultAjuda, adocoes30d] = await Promise.all([
      prisma.animalAdocao.groupBy({ by: ['status'], where: { ongId: id }, _count: { _all: true } }),
      prisma.interesseAdocao.groupBy({ by: ['status'], where: { ongId: id }, _count: { _all: true } }),
      prisma.ajudaOng.groupBy({ by: ['status'], where: { ongId: id }, _count: { _all: true } }),
      prisma.animalAdocao.count({ where: { ongId: id, publicado: true, status: 'DISPONIVEL' } }),
      prisma.animalAdocao.aggregate({ where: { ongId: id }, _max: { updatedAt: true } }),
      prisma.interesseAdocao.aggregate({ where: { ongId: id }, _max: { updatedAt: true } }),
      prisma.ajudaOng.aggregate({ where: { ongId: id }, _max: { updatedAt: true } }),
      prisma.interesseAdocao.count({ where: { ongId: id, status: 'ADOCAO_CONFIRMADA', updatedAt: { gte: desde30d } } }),
    ]);

    const porStatus = (linhas) => Object.fromEntries(linhas.map((l) => [l.status, l._count._all]));
    const datas = [ultAnimal._max.updatedAt, ultInteresse._max.updatedAt, ultAjuda._max.updatedAt].filter(Boolean);
    const acesso = serializarAcesso(ong.usuarios[0]);

    // Checklist do cadastro: regras no backend para o admin e o portal falarem a mesma língua.
    const checklist = [
      { chave: 'acesso', label: 'Acesso ao portal ativo', ok: acesso?.status === 'ATIVO' },
      { chave: 'logo', label: 'Logo enviada', ok: Boolean(ong.logoUrl) },
      { chave: 'whatsapp', label: 'WhatsApp informado', ok: Boolean(ong.whatsapp) },
      { chave: 'processo', label: 'Processo de adoção descrito', ok: (ong.processoAdocao ?? []).length > 0 },
      { chave: 'pix', label: 'PIX configurado', ok: Boolean(ong.pixChave && ong.pixTitular) },
      { chave: 'animal', label: 'Ao menos um animal disponível e publicado', ok: publicados > 0 },
    ];

    return {
      ong: {
        id: ong.id, nome: ong.nome, tipo: ong.tipo, descricao: ong.descricao, logoUrl: ong.logoUrl,
        cidade: ong.cidade, estado: ong.estado, bairro: ong.bairro, whatsapp: ong.whatsapp,
        instagramUrl: ong.instagramUrl, siteUrl: ong.siteUrl,
        verificada: ong.verificada, ativa: ong.ativa, createdAt: ong.createdAt,
        temPix: Boolean(ong.pixChave),
      },
      acesso,
      atividade: {
        animais: porStatus(animais),
        interesses: porStatus(interesses),
        ajudas: porStatus(ajudas),
        animaisPublicados: publicados,
        adocoesConfirmadas30d: adocoes30d,
        ultimaAtividadeEm: datas.length ? new Date(Math.max(...datas.map((d) => d.getTime()))) : null,
      },
      checklist,
    };
  }

  // ── Cadastro e situação da ONG ────────────────────────────────────────────
  // Reaproveita a regra do admin do Bitzy (duplicidade, arredondar localização de protetor).
  async criarOng(dados) {
    return adocaoAdminService.criarOng(dados);
  }

  // `verificada` (selo + PIX no app) e `ativa` só mudam por aqui, nunca pelo portal da ONG.
  async alterarSituacao(id, { ativa, verificada }) {
    await adocaoAdminService.buscarOng(id);
    const dados = {};
    if (typeof ativa === 'boolean') dados.ativa = ativa;
    if (typeof verificada === 'boolean') dados.verificada = verificada;
    if (!Object.keys(dados).length) throw new AppError('Nada para alterar.', 400);
    await ongRepository.update(id, dados);
    return { ativa, verificada, ...dados };
  }

  // ── Acesso (convite) ──────────────────────────────────────────────────────
  // Gera o convite (ou reenvia, se ainda não foi usado). O link sai UMA vez, aqui.
  async gerarConvite(ongId, { nome, email }, criadoPor) {
    const ong = await adocaoAdminService.buscarOng(ongId);
    if (!ong.ativa) throw new AppError('Reative a ONG antes de gerar o acesso.', 409);

    const emailFinal = emailNormalizado(email);
    const existente = await prisma.ongUsuario.findFirst({ where: { ongId }, orderBy: { createdAt: 'asc' } });

    if (existente?.status === 'ATIVO') {
      throw new AppError('Esta ONG já tem acesso ativo.', 409, 'ACESSO_JA_ATIVO');
    }
    if (existente?.status === 'BLOQUEADO') {
      throw new AppError('O acesso está bloqueado. Reative antes de enviar novo convite.', 409, 'ACESSO_BLOQUEADO');
    }

    const emUso = await prisma.ongUsuario.findUnique({ where: { email: emailFinal }, select: { id: true } });
    if (emUso && emUso.id !== existente?.id) {
      throw new AppError('Este e-mail já é usado por outra ONG.', 409, 'EMAIL_EM_USO');
    }

    const token = novoToken();
    const agora = new Date();
    const dadosConvite = {
      nome: String(nome).trim(),
      email: emailFinal,
      status: 'CONVIDADO',
      conviteTokenHash: sha256(token),
      conviteExpiraEm: new Date(agora.getTime() + CONVITE_VALIDADE_MS),
      conviteEnviadoEm: agora,
      criadoPor: criadoPor ?? null,
    };

    const usuario = existente
      ? await prisma.ongUsuario.update({ where: { id: existente.id }, data: dadosConvite, select: ACESSO_SELECT })
      : await prisma.ongUsuario.create({ data: { ongId, ...dadosConvite }, select: ACESSO_SELECT });

    const conviteUrl = `${env.ongPortalUrl}/primeiro-acesso?token=${encodeURIComponent(token)}`;

    // Falha de e-mail não derruba a geração: o admin ainda pode copiar o link.
    let emailEnviado = true;
    try {
      await emailService.sendOngConvite(emailFinal, dadosConvite.nome, ong.nome, conviteUrl);
    } catch (err) {
      emailEnviado = false;
      console.error('[OngAcesso] Falha ao enviar e-mail de convite:', err.message);
    }

    return { acesso: serializarAcesso(usuario), conviteUrl, emailEnviado };
  }

  // Convite ainda não usado: apagar o registro (nada foi aberto). Acesso ATIVO só bloqueia.
  async revogarConvite(ongId) {
    const u = await prisma.ongUsuario.findFirst({ where: { ongId }, orderBy: { createdAt: 'asc' } });
    if (!u) throw new AppError('Esta ONG não tem convite.', 404);
    if (u.status !== 'CONVIDADO') {
      throw new AppError('Só dá para revogar um convite ainda não usado. Para acesso ativo, use "Bloquear".', 409);
    }
    await prisma.ongUsuario.delete({ where: { id: u.id } });
    return { ok: true };
  }

  async alterarStatusAcesso(ongId, bloqueado) {
    const u = await prisma.ongUsuario.findFirst({ where: { ongId }, orderBy: { createdAt: 'asc' } });
    if (!u) throw new AppError('Esta ONG não tem acesso criado.', 404);

    if (bloqueado) {
      // Bloqueia e invalida qualquer convite pendente.
      const r = await prisma.ongUsuario.update({
        where: { id: u.id },
        data: { status: 'BLOQUEADO', conviteTokenHash: null, conviteExpiraEm: null },
        select: ACESSO_SELECT,
      });
      return serializarAcesso(r);
    }

    if (u.status !== 'BLOQUEADO') throw new AppError('O acesso não está bloqueado.', 409);
    // Quem já definiu senha volta a ATIVO; quem nunca entrou precisa de um convite novo.
    if (!u.senhaHash) {
      const r = await prisma.ongUsuario.update({ where: { id: u.id }, data: { status: 'CONVIDADO' }, select: ACESSO_SELECT });
      return serializarAcesso(r);
    }
    const r = await prisma.ongUsuario.update({ where: { id: u.id }, data: { status: 'ATIVO' }, select: ACESSO_SELECT });
    return serializarAcesso(r);
  }
}

module.exports = new OngAcessoService();
