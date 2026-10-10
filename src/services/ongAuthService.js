// src/services/ongAuthService.js
// Autenticação do portal das ONGs: convite, primeiro acesso, login, refresh (rotativo), logout, recuperação de senha.
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const env = require('../config/env');
const emailService = require('./emailService');
const { OngError } = require('../utils/ongErrors');

const RESET_VALIDADE_MS = 60 * 60 * 1000; // 1 hora
const GRACE_REFRESH_MS = 10 * 1000;        // duas abas renovando juntas não derrubam a sessão
const BCRYPT_COST = 12;
// Hash fictício: gasta o mesmo tempo quando o e-mail não existe (evita descobrir e-mails pelo tempo de resposta).
const HASH_FALSO = '$2a$12$C6UzMDM.H6dfI/f/IKcEeO5b1Z5kq1p2kZ6rjkYQmQZs4xWmJ5J9u';

const sha256 = (t) => crypto.createHash('sha256').update(t).digest('hex');
const novoToken = () => crypto.randomBytes(32).toString('base64url');
const normEmail = (e) => String(e || '').trim().toLowerCase();
const TOKEN_FORMATO = /^[A-Za-z0-9_-]{20,100}$/;

const MSG_CREDENCIAIS = 'E-mail ou senha incorretos.';
const MSG_LINK = 'Este link é inválido ou já foi usado.';

function validarSenha(senha) {
  if (typeof senha !== 'string' || senha.length < 8) {
    throw new OngError('A senha precisa ter pelo menos 8 caracteres.', 400, 'SENHA_FRACA');
  }
  if (senha.length > 72) throw new OngError('A senha pode ter no máximo 72 caracteres.', 400, 'SENHA_FRACA');
  if (!/[A-Za-z]/.test(senha) || !/\d/.test(senha)) {
    throw new OngError('Use letras e números na senha.', 400, 'SENHA_FRACA');
  }
}

function assinarAcesso(usuario) {
  if (!env.ongPortal?.jwtSecret) throw new OngError('Serviço indisponível.', 503, 'CONFIG');
  return jwt.sign({ type: 'ong', ongId: usuario.ongId }, env.ongPortal.jwtSecret, {
    subject: usuario.id,
    expiresIn: env.ongPortal.accessTtl,
    issuer: 'bitzy-ong',
    algorithm: 'HS256',
  });
}

const serializarSessao = (u) => ({
  usuario: { id: u.id, nome: u.nome, email: u.email },
  ong: {
    id: u.ong.id, nome: u.ong.nome, tipo: u.ong.tipo, logoUrl: u.ong.logoUrl,
    verificada: u.ong.verificada, ativa: u.ong.ativa,
  },
});

const bloqueado = (u) => u.status === 'BLOQUEADO' || !u.ong.ativa;
const erroBloqueio = () =>
  new OngError('O acesso desta ONG está bloqueado. Fale com a equipe Bitzy.', 403, 'ONG_BLOQUEADA');

async function emitirRefresh(usuarioId, familiaId = crypto.randomUUID()) {
  const raw = novoToken();
  const dias = env.ongPortal?.refreshTtlDias ?? 30;
  await prisma.ongRefreshToken.create({
    data: { usuarioId, familiaId, tokenHash: sha256(raw), expiraEm: new Date(Date.now() + dias * 86400000) },
  });
  return raw;
}

const incluirOng = { ong: { select: { id: true, nome: true, tipo: true, logoUrl: true, verificada: true, ativa: true } } };

class OngAuthService {
  // ── Convite ───────────────────────────────────────────────────────────────
  async _conviteValido(token) {
    if (!TOKEN_FORMATO.test(String(token || ''))) throw new OngError(MSG_LINK, 404, 'CONVITE_INVALIDO');
    const u = await prisma.ongUsuario.findUnique({
      where: { conviteTokenHash: sha256(token) },
      include: incluirOng,
    });
    if (!u || u.status !== 'CONVIDADO') throw new OngError(MSG_LINK, 404, 'CONVITE_INVALIDO');
    if (!u.conviteExpiraEm || u.conviteExpiraEm < new Date()) {
      throw new OngError('Este convite expirou. Peça um novo à equipe Bitzy.', 410, 'CONVITE_EXPIRADO');
    }
    if (!u.ong.ativa) throw erroBloqueio();
    return u;
  }

  async consultarConvite(token) {
    const u = await this._conviteValido(token);
    return { email: u.email, nome: u.nome, ongNome: u.ong.nome };
  }

  async primeiroAcesso(token, senha) {
    validarSenha(senha);
    const u = await this._conviteValido(token);
    const senhaHash = await bcrypt.hash(senha, BCRYPT_COST);
    // Atômico: se dois cliques/abas usarem o mesmo link, só um passa.
    const r = await prisma.ongUsuario.updateMany({
      where: { id: u.id, status: 'CONVIDADO', conviteTokenHash: sha256(token), conviteExpiraEm: { gt: new Date() } },
      data: { senhaHash, status: 'ATIVO', conviteTokenHash: null, conviteExpiraEm: null },
    });
    if (r.count === 0) throw new OngError(MSG_LINK, 404, 'CONVITE_INVALIDO');
    return { email: u.email };
  }

  // ── Login / sessão ────────────────────────────────────────────────────────
  async login(email, senha) {
    const u = await prisma.ongUsuario.findUnique({ where: { email: normEmail(email) }, include: incluirOng });
    const ok = await bcrypt.compare(String(senha || ''), u?.senhaHash || HASH_FALSO);
    if (!u || !u.senhaHash || !ok) throw new OngError(MSG_CREDENCIAIS, 401, 'CREDENCIAIS_INVALIDAS');
    // Só depois de acertar a senha dizemos que está bloqueado (não revela e-mails).
    if (bloqueado(u)) throw erroBloqueio();

    await prisma.ongUsuario.update({ where: { id: u.id }, data: { ultimoLoginEm: new Date() } });
    const refreshToken = await emitirRefresh(u.id);
    return { accessToken: assinarAcesso(u), refreshToken, ...serializarSessao(u) };
  }

  async refresh(rawToken) {
    const nao = () => new OngError('Sessão expirada.', 401, 'SESSAO_EXPIRADA');
    if (!rawToken || !TOKEN_FORMATO.test(rawToken)) throw nao();

    const t = await prisma.ongRefreshToken.findUnique({
      where: { tokenHash: sha256(rawToken) },
      include: { usuario: { include: incluirOng } },
    });
    if (!t || t.revogadoEm || t.expiraEm < new Date()) throw nao();

    if (t.usadoEm) {
      // Token já trocado. Logo depois: provável corrida entre abas (só recusa). Muito depois: reuso suspeito → derruba a sessão.
      if (Date.now() - t.usadoEm.getTime() > GRACE_REFRESH_MS) await this._revogarFamilia(t.familiaId);
      throw nao();
    }
    if (bloqueado(t.usuario) || t.usuario.status !== 'ATIVO') {
      await this._revogarFamilia(t.familiaId);
      throw erroBloqueio();
    }

    // Rotação atômica: só uma requisição consegue "gastar" este token.
    const r = await prisma.ongRefreshToken.updateMany({
      where: { id: t.id, usadoEm: null, revogadoEm: null },
      data: { usadoEm: new Date() },
    });
    if (r.count === 0) throw nao();

    const refreshToken = await emitirRefresh(t.usuarioId, t.familiaId);
    return { accessToken: assinarAcesso(t.usuario), refreshToken };
  }

  async _revogarFamilia(familiaId) {
    await prisma.ongRefreshToken.updateMany({ where: { familiaId, revogadoEm: null }, data: { revogadoEm: new Date() } });
  }

  async logout(rawToken) {
    if (!rawToken || !TOKEN_FORMATO.test(rawToken)) return;
    const t = await prisma.ongRefreshToken.findUnique({ where: { tokenHash: sha256(rawToken) } });
    if (t) await this._revogarFamilia(t.familiaId);
  }

  async me(usuarioId) {
    const u = await prisma.ongUsuario.findUnique({ where: { id: usuarioId }, include: incluirOng });
    if (!u) throw new OngError('Sessão expirada.', 401, 'SESSAO_EXPIRADA');
    if (bloqueado(u)) throw erroBloqueio();
    return serializarSessao(u);
  }

  // ── Recuperação de senha ──────────────────────────────────────────────────
  // Resposta SEMPRE igual (existindo ou não o e-mail), para não revelar quem tem acesso.
  async esqueciSenha(email) {
    const u = await prisma.ongUsuario.findUnique({ where: { email: normEmail(email) }, include: incluirOng });
    if (!u || u.status !== 'ATIVO' || !u.ong.ativa) return;

    const raw = novoToken();
    await prisma.$transaction([
      prisma.ongResetToken.deleteMany({ where: { usuarioId: u.id, usadoEm: null } }),
      prisma.ongResetToken.create({
        data: { usuarioId: u.id, tokenHash: sha256(raw), expiraEm: new Date(Date.now() + RESET_VALIDADE_MS) },
      }),
    ]);
    const link = `${env.ongPortalUrl}/redefinir-senha?token=${raw}`;
    try {
      await emailService.sendOngResetSenha(u.email, u.nome, link);
    } catch (e) {
      console.error('Falha ao enviar e-mail de redefinição (ONG):', e.message);
    }
  }

  async redefinirSenha(token, senha) {
    validarSenha(senha);
    const invalido = () => new OngError('Este link é inválido ou expirou. Peça um novo.', 410, 'RESET_INVALIDO');
    if (!TOKEN_FORMATO.test(String(token || ''))) throw invalido();

    const hash = sha256(token);
    const t = await prisma.ongResetToken.findUnique({
      where: { tokenHash: hash },
      include: { usuario: { include: incluirOng } },
    });
    if (!t || t.usadoEm || t.expiraEm < new Date() || t.usuario.status !== 'ATIVO' || !t.usuario.ong.ativa) {
      throw invalido();
    }

    const senhaHash = await bcrypt.hash(senha, BCRYPT_COST);
    const r = await prisma.ongResetToken.updateMany({
      where: { id: t.id, usadoEm: null, expiraEm: { gt: new Date() } },
      data: { usadoEm: new Date() },
    });
    if (r.count === 0) throw invalido();

    await prisma.$transaction([
      prisma.ongUsuario.update({ where: { id: t.usuarioId }, data: { senhaHash } }),
      // Trocou a senha: todas as sessões abertas caem.
      prisma.ongRefreshToken.updateMany({ where: { usuarioId: t.usuarioId, revogadoEm: null }, data: { revogadoEm: new Date() } }),
    ]);
  }
}

module.exports = new OngAuthService();
module.exports.sha256 = sha256;
