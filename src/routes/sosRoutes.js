// src/routes/sosRoutes.js
const express = require('express');
const sosController = require('../controllers/sosController');
const authMiddleware = require('../middlewares/auth');
const { aiLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

router.use(authMiddleware);

// Rotas que chamam IA — limitadas por usuário
router.post('/',             aiLimiter, sosController.create);
router.post('/:id/mensagem', aiLimiter, sosController.adicionarMensagem);

// Rotas de leitura — sem limiter de IA
router.get('/:id',           sosController.show);
router.get('/:id/historico', sosController.obterHistorico);
router.patch('/:id/encerrar', sosController.encerrar);

module.exports = router;