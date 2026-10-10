// src/middlewares/authOng.js
// Protege /ong-portal/*. Token assinado com ONG_JWT_SECRET e claim type:'ong'.
// O `ongId` e o `usuarioId` vêm SEMPRE do token (e do banco), nunca do corpo/URL da requisição.
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const env = require('../config/env');
const { OngError } = require('../utils/ongErrors');

async function authOng(req, res, next) {
  try {
    const h = req.headers.authorization;
    if (!h || !h.startsWith('Bearer ')) throw new OngError('Faça login para continuar.', 401, 'NAO_AUTENTICADO');
    if (!env.ongPortal?.jwtSecret) throw new OngError('Serviço indisponível.', 503, 'CONFIG');

    let decoded;
    try {
      decoded = jwt.verify(h.slice(7), env.ongPortal.jwtSecret, { algorithms: ['HS256'], issuer: 'bitzy-ong' });
    } catch {
      throw new OngError('Sessão expirada.', 401, 'SESSAO_EXPIRADA');
    }
    if (decoded.type !== 'ong' || !decoded.sub || !decoded.ongId) {
      throw new OngError('Sessão inválida.', 401, 'SESSAO_EXPIRADA');
    }

    // Confere no banco a cada requisição: bloquear no admin vale na hora, não só quando o token vencer.
    const u = await prisma.ongUsuario.findUnique({
      where: { id: decoded.sub },
      select: { id: true, ongId: true, status: true, ong: { select: { ativa: true } } },
    });
    if (!u || u.ongId !== decoded.ongId) throw new OngError('Sessão expirada.', 401, 'SESSAO_EXPIRADA');
    if (u.status === 'BLOQUEADO' || !u.ong.ativa) {
      throw new OngError('O acesso desta ONG está bloqueado. Fale com a equipe Bitzy.', 403, 'ONG_BLOQUEADA');
    }
    if (u.status !== 'ATIVO') throw new OngError('Sessão expirada.', 401, 'SESSAO_EXPIRADA');

    req.ong = { usuarioId: u.id, ongId: u.ongId };
    next();
  } catch (e) {
    next(e);
  }
}

module.exports = authOng;
