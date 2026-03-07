// src/routes/sosRoutes.js
const express = require('express');
const sosController = require('../controllers/sosController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// Aplica o middleware de autenticação em todas as rotas de SOS
router.use(authMiddleware);

// Rota POST /api/v1/sos
// Responsável por receber o petId e a mensagem do tutor
router.post('/', sosController.create);

module.exports = router;