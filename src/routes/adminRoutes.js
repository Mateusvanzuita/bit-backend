// src/routes/adminRoutes.js
const express = require('express');
const adminController = require('../controllers/adminController');
const { authAdmin, requireRole } = require('../middlewares/authAdmin');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// ── AUTH (pública) ────────────────────────────────────────────────────────
router.post('/login', adminController.login);

// ── Todas as rotas abaixo exigem token de admin ───────────────────────────
router.use(authAdmin);

// Dados do admin autenticado
router.get('/me', adminController.me);

// Criar novo admin — apenas SUPER_ADMIN
router.post('/admins', requireRole('SUPER_ADMIN'), adminController.criarAdmin);

// ── MÉTRICAS ──────────────────────────────────────────────────────────────
router.get('/metrics', adminController.metrics);

// ── USUÁRIOS ──────────────────────────────────────────────────────────────
router.get('/usuarios', adminController.listarUsuarios);
router.get('/usuarios/:userId', adminController.detalhesUsuario);

// ── PET SHOPS ─────────────────────────────────────────────────────────────
router.get('/petshops', adminController.listarPetShops);
router.patch('/petshops/:id', adminController.atualizarPetShop);
router.delete('/petshops/:id', adminController.deletarPetShop);

// ── SOS PROMPT ────────────────────────────────────────────────────────────
// GET prompt ativo atual
router.get('/sos-prompt', adminController.getSosPrompt);

// Histórico de versões
router.get('/sos-prompt/versoes', adminController.listarVersoesPrompt);

// Salva nova versão (e a ativa automaticamente)
router.post('/sos-prompt', adminController.salvarSosPrompt);

// Ativa uma versão anterior (rollback)
router.patch('/sos-prompt/:promptId/ativar', adminController.ativarVersaoPrompt);

// ── NOTIFICAÇÃO BROADCAST ─────────────────────────────────────────────────
router.post('/notificacoes/broadcast', requireRole('SUPER_ADMIN'), adminController.broadcast);

module.exports = router;
