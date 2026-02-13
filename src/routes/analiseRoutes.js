// src/routes/analiseRoutes.js
const express = require('express');
const analiseController = require('../controllers/analiseController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', analiseController.index);

// DEVE vir antes do /:id para o Express não se confundir
router.get('/historico/:historicoId', analiseController.getHistorico); 

router.get('/:id', analiseController.show);
router.post('/:id/submit', analiseController.submit);

module.exports = router;