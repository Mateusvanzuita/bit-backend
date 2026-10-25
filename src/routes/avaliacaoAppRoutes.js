// src/routes/avaliacaoAppRoutes.js
const express = require('express');
const avaliacaoAppController = require('../controllers/avaliacaoAppController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/estado', avaliacaoAppController.estado);
router.post('/', avaliacaoAppController.criar);
router.patch('/:id', avaliacaoAppController.atualizar);

module.exports = router;