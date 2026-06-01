// src/routes/dicaRoutes.js
const express = require('express');
const dicaController = require('../controllers/dicaController');
const authMiddleware = require('../middlewares/auth');
const { aiLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

router.use(authMiddleware);

// Leitura — sem limiter
router.get('/', dicaController.index);
router.get('/historico/:historicoId', dicaController.getHistorico);
router.get('/:id', dicaController.show);

// Submissão chama IA — limitada por usuário
router.post('/:id/respostas', aiLimiter, dicaController.submitRespostas);

module.exports = router;