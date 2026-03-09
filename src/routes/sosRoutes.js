// src/routes/sosRoutes.js
const express = require('express');
const sosController = require('../controllers/sosController');
const authMiddleware = require('../middlewares/auth'); // ✅ CORRETO: seu auth.js está em middlewares/

const router = express.Router();

// ✅ ADICIONAR MIDDLEWARE DE AUTENTICAÇÃO EM TODAS AS ROTAS
router.use(authMiddleware);

/**
 * ========== ROTAS SOS ==========
 */

/**
 * 1. CRIAR ATENDIMENTO (primeira mensagem)
 * POST /api/v1/sos
 * 
 * Headers:
 * {
 *   "Authorization": "Bearer TOKEN"
 * }
 * 
 * Body:
 * {
 *   "petId": "uuid-do-pet",
 *   "mensagem": "Meu cachorro está com dor de barriga"
 * }
 */
router.post('/', sosController.create);

/**
 * 2. ADICIONAR MENSAGEM AO CHAT (continuar conversa)
 * POST /api/v1/sos/:id/mensagem
 * 
 * Headers:
 * {
 *   "Authorization": "Bearer TOKEN"
 * }
 * 
 * Body:
 * {
 *   "mensagem": "Ele está tremendo também"
 * }
 */
router.post('/:id/mensagem', sosController.adicionarMensagem);

/**
 * 3. BUSCAR ATENDIMENTO
 * GET /api/v1/sos/:id
 * 
 * Headers:
 * {
 *   "Authorization": "Bearer TOKEN"
 * }
 */
router.get('/:id', sosController.show);

/**
 * 4. OBTER HISTÓRICO COMPLETO
 * GET /api/v1/sos/:id/historico
 * 
 * Headers:
 * {
 *   "Authorization": "Bearer TOKEN"
 * }
 */
router.get('/:id/historico', sosController.obterHistorico);

/**
 * 5. ENCERRAR ATENDIMENTO
 * PATCH /api/v1/sos/:id/encerrar
 * 
 * Headers:
 * {
 *   "Authorization": "Bearer TOKEN"
 * }
 */
router.patch('/:id/encerrar', sosController.encerrar);

module.exports = router;