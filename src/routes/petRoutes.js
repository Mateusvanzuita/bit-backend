// src/routes/petRoutes.js
const express = require('express');
const petController = require('../controllers/petController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

router.use(authMiddleware); // Protege todas as rotas abaixo

router.post('/', petController.create);
router.get('/', petController.listAll);
router.get('/:id', petController.show);
router.patch('/:id', petController.update);
router.delete('/:id', petController.delete);

module.exports = router;