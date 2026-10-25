// Montada em /internal/avaliacoes-app (já protegida pelo authenticateInternal).
const express = require('express');
const avaliacaoAppController = require('../controllers/avaliacaoAppController');

const router = express.Router();
router.get('/resumo', avaliacaoAppController.resumo);
router.get('/', avaliacaoAppController.listar);
router.patch('/:id/status', avaliacaoAppController.atualizarStatus);

module.exports = router;