const express = require('express');
const internalController = require('../controllers/internalController');
const { authenticateInternal } = require('../middlewares/internalAuth');
const { uploadSingle } = require('../middlewares/uploadMiddleware');

const router = express.Router();

router.use(authenticateInternal);

router.get('/petshops/by-crm/:crmPetshopId/metricas', internalController.metricasPorCrmPetshopId);
router.post('/petshops/by-crm/:crmPetshopId/cupons', internalController.publicarCupom);
router.post('/vinculo-clinica/gerar-codigo', internalController.gerarCodigoVinculo);
router.post('/vinculo-clinica/sincronizar-vacina', internalController.sincronizarVacina);
router.post('/vinculo-clinica/sincronizar-registro', internalController.sincronizarRegistroClinico);
router.post('/vinculo-clinica/sincronizar-anexo', internalController.sincronizarAnexo);

// ── Gestão de parceiros pelo admin do CRM ──────────────────────────────────
router.post('/petshops/from-crm', internalController.vincularPetShopDoCrm);
router.post('/petshops/direto', internalController.criarPetShopDireto);
router.get('/petshops/direto', internalController.listarPetShopsDiretos);
router.get('/petshops/:id', internalController.buscarPetShop);
router.patch('/petshops/:id', internalController.atualizarPetShop);
router.patch('/petshops/:id/status', internalController.alterarStatusPetShop);
router.get('/petshops/:id/cupons', internalController.listarCuponsDoPetShop);
router.post('/petshops/:id/cupons/admin', internalController.criarCupomAdmin);
router.patch('/cupons/:cupomId', internalController.atualizarCupomAdmin);

// ── Ofertas de produtos ─────────────────────────────────────────────────
router.get('/petshops/:id/ofertas', internalController.listarOfertasDoPetShop);
router.post('/petshops/:id/ofertas', internalController.criarOferta);
router.patch('/ofertas/:ofertaId', internalController.atualizarOferta);
router.delete('/ofertas/:ofertaId', internalController.removerOferta);
router.get('/ofertas/cliques', internalController.listarCliques);
router.post('/ofertas/upload-foto', uploadSingle, internalController.uploadFotoOferta);

module.exports = router;