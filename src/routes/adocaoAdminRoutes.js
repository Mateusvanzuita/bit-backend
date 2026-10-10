// src/routes/adocaoAdminRoutes.js
// Montado dentro de adminRoutes (DEPOIS de router.use(authAdmin)):
//   router.use('/adocao', adocaoAdminRoutes);
const express = require('express');
const adocaoAdminController = require('../controllers/adocaoAdminController');
const validate = require('../middlewares/validate');
const {
  idValidator,
  criarOngValidator,
  atualizarOngValidator,
  statusOngValidator,
  criarAnimalValidator,
  atualizarAnimalValidator,
  statusAnimalValidator,
  listarAnimaisAdminValidator,
  listarInteressesAdminValidator,
  statusInteresseValidator,
  listarAjudasAdminValidator,
  statusAjudaValidator,
  listarDenunciasValidator,
  resolverDenunciaValidator,
} = require('../validators/adocaoValidator');

const router = express.Router();

// ── ONGs ───────────────────────────────────────────────────────────────────
router.get('/ongs', adocaoAdminController.listarOngs);
router.post('/ongs', criarOngValidator, validate, adocaoAdminController.criarOng);
router.get('/ongs/:id', idValidator, validate, adocaoAdminController.buscarOng);
router.patch('/ongs/:id', atualizarOngValidator, validate, adocaoAdminController.atualizarOng);
router.patch('/ongs/:id/status', statusOngValidator, validate, adocaoAdminController.alterarStatusOng);

// ── ANIMAIS ────────────────────────────────────────────────────────────────
router.get('/animais', listarAnimaisAdminValidator, validate, adocaoAdminController.listarAnimais);
router.post('/animais', criarAnimalValidator, validate, adocaoAdminController.criarAnimal);
router.get('/animais/:id', idValidator, validate, adocaoAdminController.buscarAnimal);
router.patch('/animais/:id', atualizarAnimalValidator, validate, adocaoAdminController.atualizarAnimal);
router.patch('/animais/:id/status', statusAnimalValidator, validate, adocaoAdminController.alterarStatusAnimal);

// ── INTERESSES ─────────────────────────────────────────────────────────────
router.get('/interesses', listarInteressesAdminValidator, validate, adocaoAdminController.listarInteresses);
router.patch('/interesses/:id/status', statusInteresseValidator, validate, adocaoAdminController.alterarStatusInteresse);
// A ONG aceitou: marca o animal como adotado e avisa o adotante ("Mel encontrou uma família!")
router.post('/interesses/:id/confirmar-adocao', idValidator, validate, adocaoAdminController.confirmarAdocao);

// ── AJUDAS ─────────────────────────────────────────────────────────────────
router.get('/ajudas', listarAjudasAdminValidator, validate, adocaoAdminController.listarAjudas);
router.patch('/ajudas/:id/status', statusAjudaValidator, validate, adocaoAdminController.alterarStatusAjuda);

// ── DENÚNCIAS ──────────────────────────────────────────────────────────────
router.get('/denuncias', listarDenunciasValidator, validate, adocaoAdminController.listarDenuncias);
router.patch('/denuncias/:id/resolver', resolverDenunciaValidator, validate, adocaoAdminController.resolverDenuncia);

module.exports = router;