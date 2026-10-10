// src/routes/adocaoRoutes.js
const express = require('express');
const adocaoController = require('../controllers/adocaoController');
const authMiddleware = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  listarAnimaisValidator,
  listarOngsValidator,
  idValidator,
  animalIdValidator,
  criarInteresseValidator,
  vincularPetValidator,
  criarAlertaValidator,
  denunciaValidator,
  criarAjudaValidator,
} = require('../validators/adocaoValidator');

const router = express.Router();

// Todas as rotas de adoção exigem usuário autenticado
router.use(authMiddleware);

// ── ANIMAIS ────────────────────────────────────────────────────────────────
router.get('/animais', listarAnimaisValidator, validate, adocaoController.listarAnimais);
router.get('/animais/:id', idValidator, validate, adocaoController.detalhesAnimal);
router.post('/animais/:id/denuncias', denunciaValidator, validate, adocaoController.denunciarAnimal);

// ── ONGs ───────────────────────────────────────────────────────────────────
router.get('/ongs', listarOngsValidator, validate, adocaoController.listarOngs);
router.get('/ongs/:id', idValidator, validate, adocaoController.detalhesOng);
router.get('/ongs/:id/ajuda', idValidator, validate, adocaoController.ajudaOng);

// ── INTERESSES ─────────────────────────────────────────────────────────────
router.post('/interesses', criarInteresseValidator, validate, adocaoController.demonstrarInteresse);
// "/meus" ANTES de qualquer rota com :id
router.get('/interesses/meus', adocaoController.meusInteresses);
router.patch('/interesses/:id/cancelar', idValidator, validate, adocaoController.cancelarInteresse);
router.patch('/interesses/:id/pet', vincularPetValidator, validate, adocaoController.vincularPet);

// ── FAVORITOS ──────────────────────────────────────────────────────────────
router.get('/favoritos', adocaoController.listarFavoritos);
router.post('/favoritos/:animalId', animalIdValidator, validate, adocaoController.favoritar);
router.delete('/favoritos/:animalId', animalIdValidator, validate, adocaoController.desfavoritar);

// ── ALERTAS ────────────────────────────────────────────────────────────────
router.get('/alertas', adocaoController.listarAlertas);
router.post('/alertas', criarAlertaValidator, validate, adocaoController.criarAlerta);
router.delete('/alertas/:id', idValidator, validate, adocaoController.removerAlerta);

// ── AJUDAS ─────────────────────────────────────────────────────────────────
router.post('/ajudas', criarAjudaValidator, validate, adocaoController.registrarAjuda);
router.get('/ajudas/minhas', adocaoController.minhasAjudas);
router.patch('/ajudas/:id/cancelar', idValidator, validate, adocaoController.cancelarAjuda);

module.exports = router;