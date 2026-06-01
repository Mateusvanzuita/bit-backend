// src/routes/analiseRoutes.js
const express = require('express');
const analiseController = require('../controllers/analiseController');
const authMiddleware = require('../middlewares/auth');
const { aiLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

router.use(authMiddleware);

// Leitura — sem limiter
router.get('/', analiseController.index);
router.get('/historico/:historicoId', analiseController.getHistorico);
router.get('/:id', analiseController.show);

// Submissão chama IA — limitada por usuário
router.post('/:id/submit', aiLimiter, analiseController.submit);

module.exports = router;