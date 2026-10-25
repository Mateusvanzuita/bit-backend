// Montada em /internal/config-versao-app (já protegida pelo authenticateInternal).
const express = require('express');
const versaoAppController = require('../controllers/versaoAppController');

const router = express.Router();
router.get('/', versaoAppController.listar);
router.put('/:plataforma', versaoAppController.salvar);

module.exports = router;