const express = require('express');
const dicaController = require('../controllers/dicaController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', dicaController.index);
router.get('/historico/:historicoId', dicaController.getHistorico); // Nova rota
router.get('/:id', dicaController.show);
router.post('/:id/respostas', dicaController.submitRespostas);

module.exports = router;