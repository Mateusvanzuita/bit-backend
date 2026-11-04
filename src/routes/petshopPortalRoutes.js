// src/routes/petshopPortalRoutes.js
// Montar em src/routes/index.js:   router.use('/petshop-portal', require('./petshopPortalRoutes'));
const express = require('express');
const petshopCsrf = require('../middlewares/petshopCsrf');
const authPetShop = require('../middlewares/authPetShop');
const petshopUpload = require('../middlewares/petshopUpload');
const { portalAuthLimiter, petshopUploadLimiter } = require('../middlewares/rateLimiter');
const { portalErrorHandler } = require('../utils/petshopErrors');
const auth = require('../controllers/petshopPortalAuthController');
const c = require('../controllers/petshopPortalController');

const router = express.Router();

// Toda requisição do portal precisa do cabeçalho X-Requested-With (defesa extra contra CSRF).
router.use(petshopCsrf);
// Respostas com dados de pessoas e sessões nunca ficam em cache.
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

// ── Autenticação (públicas) ─────────────────────────────────────────────────
router.get('/auth/convite/:token', portalAuthLimiter, auth.consultarConvite);
router.post('/auth/primeiro-acesso', portalAuthLimiter, auth.primeiroAcesso);
router.post('/auth/login', portalAuthLimiter, auth.login);
router.post('/auth/refresh', portalAuthLimiter, auth.refresh);
router.post('/auth/logout', auth.logout);
router.post('/auth/esqueci-senha', portalAuthLimiter, auth.esqueciSenha);
router.post('/auth/redefinir-senha', portalAuthLimiter, auth.redefinirSenha);

// ── Protegidas: pet shop pelo token ─────────────────────────────────────────
router.use(authPetShop);

router.get('/me', auth.me);
router.get('/dashboard', c.dashboard);
router.get('/metricas', c.metricas);
router.get('/interacoes', c.interacoes);

router.get('/perfil', c.obterPerfil);
router.patch('/perfil', c.atualizarPerfil);

router.get('/cupons', c.listarCupons);
router.post('/cupons', c.criarCupom);
router.get('/cupons/:id', c.obterCupom);
router.patch('/cupons/:id', c.atualizarCupom);
router.patch('/cupons/:id/status', c.statusCupom);

router.get('/ofertas', c.listarOfertas);
router.post('/ofertas', c.criarOferta);
router.get('/ofertas/:id', c.obterOferta);
router.patch('/ofertas/:id', c.atualizarOferta);
router.patch('/ofertas/:id/status', c.statusOferta);

router.post('/uploads/:tipo', petshopUploadLimiter, petshopUpload, c.upload);

router.use(portalErrorHandler);

module.exports = router;
