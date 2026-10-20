// src/routes/novidadeRoutes.js  →  montada em /novidades (rotas do app)
const express = require('express');
// ⚠️ Copie estes imports EXATAMENTE como estão no topo do petRoutes.js (auth do usuário do app)
const auth = require('../middlewares/auth');
const novidadeController = require('../controllers/novidadeController');
const { validar, slugParam, listarPublicasQuery } = require('../validators/novidadeValidator');

const router = express.Router();

router.use(auth);

// GET /novidades?categoria=&especie=&busca=&destaque=true&page=&limit=
router.get('/', listarPublicasQuery, validar, novidadeController.listar);

// GET /novidades/:slug  → matéria completa + relacionados
router.get('/:slug', slugParam, validar, novidadeController.obter);

module.exports = router;
