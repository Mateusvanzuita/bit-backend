// src/routes/sosRoutes.js
const express = require('express');
const sosController = require('../controllers/sosController');
const authMiddleware = require('../middlewares/auth');
const { aiLimiter } = require('../middlewares/rateLimiter');
const { uploadAudioSingle } = require('../middlewares/uploadMiddleware');
const requireConsentimentoIA = require('../middlewares/requireConsentimentoIA');

const router = express.Router();

router.use(authMiddleware);

// Rotas que chamam IA — limitadas por usuário
router.post(
  '/',
  requireConsentimentoIA,
  aiLimiter,
  sosController.create,
);

router.post(
  '/:id/mensagem',
  requireConsentimentoIA,
  aiLimiter,
  sosController.adicionarMensagem,
);

router.post(
  '/transcrever',
  requireConsentimentoIA,
  aiLimiter,
  uploadAudioSingle,
  sosController.transcrever,
);

// Rotas de leitura — sem limiter de IA
router.get('/:id',           sosController.show);
router.get('/:id/historico', sosController.obterHistorico);
router.patch('/:id/encerrar', sosController.encerrar);

module.exports = router;