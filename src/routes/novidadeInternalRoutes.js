// src/routes/novidadeInternalRoutes.js
// Montada dentro do internalRoutes.js (em /internal/novidades), que já aplica o
// authenticateInternal (x-internal-api-key). Chamada só pelo backend do CRM,
// que é quem autentica o admin e repassa o pedido para cá.
const express = require('express');
const novidadeController = require('../controllers/novidadeController');
const {
  validar,
  idParam,
  listarAdminQuery,
  criarValidator,
  atualizarValidator,
  statusValidator,
} = require('../validators/novidadeValidator');

const router = express.Router();

router.get('/', listarAdminQuery, validar, novidadeController.listarAdmin);
router.get('/:id', idParam, validar, novidadeController.obterAdmin);
router.post('/', criarValidator, validar, novidadeController.criar);
router.put('/:id', idParam, atualizarValidator, validar, novidadeController.atualizar);
router.patch('/:id/status', idParam, statusValidator, validar, novidadeController.alterarStatus);
router.delete('/:id', idParam, validar, novidadeController.excluir);

module.exports = router;