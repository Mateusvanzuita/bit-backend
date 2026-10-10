// src/routes/ongPortalRoutes.js
// Montar em src/routes/index.js:   router.use('/ong-portal', require('./ongPortalRoutes'));
const express = require('express');
const ongCsrf = require('../middlewares/ongCsrf');
const authOng = require('../middlewares/authOng');
const ongUpload = require('../middlewares/ongUpload');
const { authLimiter, uploadLimiter } = require('../middlewares/rateLimiter');
const { ongErrorHandler } = require('../utils/ongErrors');
const auth = require('../controllers/ongPortalAuthController');
const c = require('../controllers/ongPortalController');

const router = express.Router();

// Toda requisição do portal precisa do cabeçalho X-Requested-With (defesa extra contra CSRF).
router.use(ongCsrf);
// Respostas com dados de pessoas e sessões nunca ficam em cache.
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

// ── Autenticação (públicas) ─────────────────────────────────────────────────
router.get('/auth/convite/:token', authLimiter, auth.consultarConvite);
router.post('/auth/primeiro-acesso', authLimiter, auth.primeiroAcesso);
router.post('/auth/login', authLimiter, auth.login);
router.post('/auth/refresh', authLimiter, auth.refresh);
router.post('/auth/logout', auth.logout);
router.post('/auth/esqueci-senha', authLimiter, auth.esqueciSenha);
router.post('/auth/redefinir-senha', authLimiter, auth.redefinirSenha);

// ── Protegidas: ONG pelo token ──────────────────────────────────────────────
router.use(authOng);

router.get('/me', auth.me);
router.get('/dashboard', c.dashboard);
router.get('/metricas', c.metricas);

router.get('/perfil', c.obterPerfil);
router.patch('/perfil', c.atualizarPerfil);

router.get('/animais', c.listarAnimais);
router.post('/animais', c.criarAnimal);
router.get('/animais/:id', c.obterAnimal);
router.patch('/animais/:id', c.atualizarAnimal);
router.patch('/animais/:id/status', c.statusAnimal);
router.patch('/animais/:id/publicacao', c.publicacaoAnimal);
router.put('/animais/:id/fotos', c.fotosAnimal);

router.post('/uploads/:tipo', uploadLimiter, ongUpload, c.upload);

router.get('/interesses', c.listarInteresses);
router.get('/interesses/:id', c.obterInteresse);
router.patch('/interesses/:id/status', c.statusInteresse);
router.post('/interesses/:id/confirmar-adocao', c.confirmarAdocao);

router.get('/ajuda', c.obterAjuda);
router.put('/ajuda', c.salvarAjuda);
router.get('/ajudas', c.listarPedidos);
router.patch('/ajudas/:id/status', c.statusPedido);

router.use(ongErrorHandler);

module.exports = router;
