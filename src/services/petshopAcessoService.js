// src/services/petshopAcessoService.js
// Gestão do ACESSO dos pet shops ao portal e acompanhamento da loja, para o admin do CRM
// (chamado só por rotas /internal, protegidas pela chave servidor-a-servidor).
const crypto = require('crypto');
const prisma = require('../config/database');
const env = require('../config/env');
const emailService = require('./emailService');
const painel = require('./petshopPortalPainelService');
const { AppError } = require('../middlewares/errorHandler');

const CONVITE_VALIDADE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

const sha256 = (txt) => crypto.createHash('sha256').update(txt).digest('hex');
const novoToken = () => crypto.randomBytes(32).toString('base64url');
const emailNormalizado = (e) => String(e).trim().toLowerCase();

// Status mostrado ao admin. O convite que venceu vira CONVITE_EXPIRADO (não é gravado).
function statusDoAcesso(u) {
  if (u.status === 'CONVIDADO' && (!u.conviteExpiraEm || u.conviteExpiraEm < new Date())) return 'CONVITE_EXPIRADO';
  return u.status;
}

function serializarAcesso(u) {
  if (!u) return null;
  return {
    usuarioId: u.id, nome: u.nome, email: u.email, status: statusDoAcesso(u),
    conviteEnviadoEm: u.conviteEnviadoEm,
    conviteExpiraEm: u.status === 'CONVIDADO' ? u.conviteExpiraEm : null,
    ultimoLoginEm: u.ultimoLoginEm,
  };
}

const ACESSO_SELECT = { id: true, nome: true, email: true, status: true, conviteEnviadoEm: true, conviteExpiraEm: true, ultimoLoginEm: true };
const primeiro = (petShopId) => prisma.petShopUsuario.findFirst({ where: { petShopId }, orderBy: { createdAt: 'asc' } });

class PetShopAcessoService {
  async _petShop(id) {
    const p = await prisma.petShop.findUnique({ where: { id } });
    if (!p) throw new AppError('Pet shop não encontrado.', 404);
    return p;
  }

  // ── Detalhe e acompanhamento (monitoramento no admin) ─────────────────────
  async detalhar(petShopId) {
    const ps = await this._petShop(petShopId);
    const usuario = await prisma.petShopUsuario.findFirst({ where: { petShopId }, orderBy: { createdAt: 'asc' }, select: ACESSO_SELECT });
    const [resumo, ultCupom, ultOferta] = await Promise.all([
      painel.contagens(petShopId),
      prisma.cupom.aggregate({ where: { petShopId }, _max: { updatedAt: true } }),
      prisma.ofertaProduto.aggregate({ where: { petShopId }, _max: { updatedAt: true } }),
    ]);
    const acesso = serializarAcesso(usuario);
    const datas = [ultCupom._max.updatedAt, ultOferta._max.updatedAt, usuario?.ultimoLoginEm].filter(Boolean);
    return {
      acesso,
      atividade: {
        ...resumo,
        ultimaAtividadeEm: datas.length ? new Date(Math.max(...datas.map((d) => d.getTime()))) : null,
      },
      checklist: painel.montarChecklist(ps, { ...resumo, acessoAtivo: acesso?.status === 'ATIVO' }),
    };
  }

  // ── Convite ───────────────────────────────────────────────────────────────
  // Gera o convite (ou reenvia, se ainda não foi usado). O link sai UMA vez, aqui.
  async gerarConvite(petShopId, { nome, email }, criadoPor) {
    const ps = await this._petShop(petShopId);
    const emailFinal = emailNormalizado(email);
    const existente = await primeiro(petShopId);

    if (existente?.status === 'ATIVO') throw new AppError('Este pet shop já tem acesso ativo.', 409, 'ACESSO_JA_ATIVO');
    if (existente?.status === 'BLOQUEADO') throw new AppError('O acesso está bloqueado. Reative antes de enviar novo convite.', 409, 'ACESSO_BLOQUEADO');

    const emUso = await prisma.petShopUsuario.findUnique({ where: { email: emailFinal }, select: { id: true } });
    if (emUso && emUso.id !== existente?.id) throw new AppError('Este e-mail já é usado por outro pet shop.', 409, 'EMAIL_EM_USO');

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
      ? await prisma.petShopUsuario.update({ where: { id: existente.id }, data: dadosConvite, select: ACESSO_SELECT })
      : await prisma.petShopUsuario.create({ data: { petShopId, ...dadosConvite }, select: ACESSO_SELECT });

    const conviteUrl = `${env.petshopPortalUrl}/primeiro-acesso?token=${encodeURIComponent(token)}`;

    // Falha de e-mail não derruba a geração: o admin ainda pode copiar o link.
    let emailEnviado = true;
    try {
      await emailService.sendPetShopConvite(emailFinal, dadosConvite.nome, ps.nome, conviteUrl);
    } catch (err) {
      emailEnviado = false;
      console.error('[PetShopAcesso] Falha ao enviar e-mail de convite:', err.message);
    }

    return { acesso: serializarAcesso(usuario), conviteUrl, emailEnviado };
  }

  // Convite ainda não usado: apagar o registro (nada foi aberto). Acesso ATIVO só bloqueia.
  async revogarConvite(petShopId) {
    const u = await primeiro(petShopId);
    if (!u) throw new AppError('Este pet shop não tem convite.', 404);
    if (u.status !== 'CONVIDADO') throw new AppError('Só dá para revogar um convite ainda não usado. Para acesso ativo, use "Bloquear".', 409);
    await prisma.petShopUsuario.delete({ where: { id: u.id } });
    return { ok: true };
  }

  async alterarStatusAcesso(petShopId, bloqueado) {
    const u = await primeiro(petShopId);
    if (!u) throw new AppError('Este pet shop não tem acesso criado.', 404);

    if (bloqueado) {
      // Bloqueia e invalida convite pendente e sessões abertas.
      const r = await prisma.$transaction([
        prisma.petShopUsuario.update({
          where: { id: u.id },
          data: { status: 'BLOQUEADO', conviteTokenHash: null, conviteExpiraEm: null },
          select: ACESSO_SELECT,
        }),
        prisma.petShopRefreshToken.updateMany({ where: { usuarioId: u.id, revogadoEm: null }, data: { revogadoEm: new Date() } }),
      ]);
      return serializarAcesso(r[0]);
    }

    if (u.status !== 'BLOQUEADO') throw new AppError('O acesso não está bloqueado.', 409);
    // Quem já definiu senha volta a ATIVO; quem nunca entrou precisa de um convite novo.
    const r = await prisma.petShopUsuario.update({
      where: { id: u.id }, data: { status: u.senhaHash ? 'ATIVO' : 'CONVIDADO' }, select: ACESSO_SELECT,
    });
    return serializarAcesso(r);
  }
}

module.exports = new PetShopAcessoService();
module.exports.serializarAcesso = serializarAcesso;
