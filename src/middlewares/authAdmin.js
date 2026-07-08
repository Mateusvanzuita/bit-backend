// src/middlewares/authAdmin.js
const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');
const config = require('../config/env');
const prisma = require('../config/database');

/**
 * Middleware de autenticação exclusivo para rotas /admin.
 * Valida o token JWT de admin e verifica se o admin ainda está ativo.
 * Popula req.admin com os dados do admin autenticado.
 */
const authAdmin = async (req, res, next) => {
  try {
    // ── 1. Extrai token ───────────────────────────────────────────────────
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next(new AppError('Acesso restrito. Token não fornecido.', 401));
    }

    const token = authHeader.split(' ')[1];

    // ── 2. Verifica assinatura e expiração ────────────────────────────────
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch {
      return next(new AppError('Token inválido ou expirado.', 401));
    }

    // ── 3. Garante que é um token de admin (não de usuário comum) ─────────
    if (decoded.type !== 'admin') {
      return next(new AppError('Acesso negado. Token inválido para esta área.', 403));
    }

    // ── 4. Verifica se o admin ainda existe e está ativo ──────────────────
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
      select: { id: true, nome: true, email: true, role: true, ativo: true },
    });

    if (!admin || !admin.ativo) {
      return next(new AppError('Admin não encontrado ou desativado.', 401));
    }

    // ── 5. Popula req.admin ───────────────────────────────────────────────
    req.admin = admin;
    next();
  } catch (err) {
    return next(new AppError('Erro na autenticação do admin.', 500));
  }
};

/**
 * Middleware de autorização por role.
 * Uso: router.delete('/admins/:id', authAdmin, requireRole('SUPER_ADMIN'), controller)
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.admin?.role)) {
      return next(new AppError('Você não tem permissão para esta ação.', 403));
    }
    next();
  };
};

module.exports = { authAdmin, requireRole };
