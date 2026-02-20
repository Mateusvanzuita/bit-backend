const express = require('express');
const termosController = require('../controllers/termosController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// Público ou Logado: Ver os termos atuais
router.get('/latest', termosController.getLatest);

// Apenas Logado: Aceitar os termos
router.post('/aceitar', authMiddleware, termosController.aceitarTermos);
router.post('/politicas', termosController.createPolitica);
router.post('/termos-uso', termosController.createTermo);
module.exports = router;