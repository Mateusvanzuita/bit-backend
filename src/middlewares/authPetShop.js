// src/middlewares/authPetShop.js
// Protege /petshop-portal/*. Token assinado com PETSHOP_JWT_SECRET e claim type:'petshop'.
// `petShopId` e `usuarioId` vêm SEMPRE do token (e do banco), nunca do corpo/URL.
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const env = require('../config/env');
const { PortalError } = require('../utils/petshopErrors');

async function authPetShop(req, res, next) {
  try {
    const h = req.headers.authorization;
    if (!h || !h.startsWith('Bearer ')) throw new PortalError('Faça login para continuar.', 401, 'NAO_AUTENTICADO');
    if (!env.petshopPortal?.jwtSecret) throw new PortalError('Serviço indisponível.', 503, 'CONFIG');

    let decoded;
    try {
      decoded = jwt.verify(h.slice(7), env.petshopPortal.jwtSecret, { algorithms: ['HS256'], issuer: 'bitzy-petshop' });
    } catch {
      throw new PortalError('Sessão expirada.', 401, 'SESSAO_EXPIRADA');
    }
    if (decoded.type !== 'petshop' || !decoded.sub || !decoded.petShopId) {
      throw new PortalError('Sessão inválida.', 401, 'SESSAO_EXPIRADA');
    }

    // Confere no banco a cada requisição: bloquear no admin vale na hora, não só quando o token vencer.
    const u = await prisma.petShopUsuario.findUnique({
      where: { id: decoded.sub },
      select: { id: true, petShopId: true, status: true },
    });
    if (!u || u.petShopId !== decoded.petShopId) throw new PortalError('Sessão expirada.', 401, 'SESSAO_EXPIRADA');
    if (u.status === 'BLOQUEADO') {
      throw new PortalError('O acesso deste pet shop está bloqueado. Fale com a equipe Bitzy.', 403, 'ACESSO_BLOQUEADO');
    }
    if (u.status !== 'ATIVO') throw new PortalError('Sessão expirada.', 401, 'SESSAO_EXPIRADA');

    req.petshop = { usuarioId: u.id, petShopId: u.petShopId };
    next();
  } catch (e) {
    next(e);
  }
}

module.exports = authPetShop;
