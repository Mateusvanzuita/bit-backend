// src/routes/notificationRoutes.js
const express = require('express');
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// Todas as rotas exigem autenticação
router.use(authMiddleware);

// ATENÇÃO: a rota estática /todas-lidas deve vir ANTES de /:id
// para o Express não interpretar "todas-lidas" como um parâmetro de id.

router.get('/', notificationController.listar);
router.get('/nao-lidas/count', notificationController.contarNaoLidas);
router.patch('/todas-lidas', notificationController.marcarTodasLidas);
router.patch('/:id/lida', notificationController.marcarLida);
router.delete('/:id', notificationController.deletar);

module.exports = router;