// src/controllers/ongPortalAuthController.js
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');
const ongAuth = require('../services/ongAuthService');

const COOKIE = 'bitzy_ong_rt';
const COOKIE_PATH = '/api/v1/ong-portal/auth';

function cookieOpts() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    domain: env.ongPortal?.cookieDomain,
    path: COOKIE_PATH, // o cookie só viaja para as rotas de auth
  };
}

const setRefresh = (res, raw) =>
  res.cookie(COOKIE, raw, { ...cookieOpts(), maxAge: (env.ongPortal?.refreshTtlDias ?? 30) * 86400000 });
const clearRefresh = (res) => res.clearCookie(COOKIE, cookieOpts());

// Lê o cookie sem depender de cookie-parser.
function lerRefresh(req) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const parte of raw.split(';')) {
    const i = parte.indexOf('=');
    if (i > 0 && parte.slice(0, i).trim() === COOKIE) return decodeURIComponent(parte.slice(i + 1).trim());
  }
  return null;
}

const ok = (res, data, status = 200) => res.status(status).json({ status: 'success', data });

exports.consultarConvite = asyncHandler(async (req, res) => ok(res, await ongAuth.consultarConvite(req.params.token)));

exports.primeiroAcesso = asyncHandler(async (req, res) => ok(res, await ongAuth.primeiroAcesso(req.body.token, req.body.senha)));

exports.login = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken, usuario, ong } = await ongAuth.login(req.body.email, req.body.senha);
  setRefresh(res, refreshToken);
  ok(res, { accessToken, usuario, ong });
});

exports.refresh = asyncHandler(async (req, res) => {
  try {
    const { accessToken, refreshToken } = await ongAuth.refresh(lerRefresh(req));
    setRefresh(res, refreshToken);
    ok(res, { accessToken });
  } catch (e) {
    // Sessão inválida/bloqueada: limpa o cookie para o portal não insistir.
    if (e.statusCode === 401 || e.code === 'ONG_BLOQUEADA') clearRefresh(res);
    throw e;
  }
});

exports.logout = asyncHandler(async (req, res) => {
  await ongAuth.logout(lerRefresh(req));
  clearRefresh(res);
  ok(res, { ok: true });
});

exports.esqueciSenha = asyncHandler(async (req, res) => {
  await ongAuth.esqueciSenha(req.body.email);
  // Sempre a mesma resposta.
  ok(res, { ok: true });
});

exports.redefinirSenha = asyncHandler(async (req, res) => {
  await ongAuth.redefinirSenha(req.body.token, req.body.senha);
  ok(res, { ok: true });
});

exports.me = asyncHandler(async (req, res) => ok(res, await ongAuth.me(req.ong.usuarioId)));
