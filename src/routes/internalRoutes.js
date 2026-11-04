// src/routes/internalRoutes.js  (SUBSTITUI o arquivo atual)
// Mudanças: saem as rotas de gestão de cupons/ofertas feitas pelo admin (agora o pet shop faz no portal)
// e entram as rotas de ACESSO ao portal. Fica o que o CRM ainda usa: métricas, publicar cupom do CRM,
// vínculo clínico, criar/editar/ativar parceiro, e PATCH /cupons/:id (o CRM desativa cupom ao apagar).
const express = require('express');
const internalController = require('../controllers/internalController');
const { authenticateInternal } = require('../middlewares/internalAuth');
const internalOngController = require('../controllers/internalOngController');
const internalPetShopAcessoController = require('../controllers/internalPetShopAcessoController');
const novidadeInternalRoutes = require('./novidadeInternalRoutes');
const avaliacaoAppInternalRoutes = require('./avaliacaoAppInternalRoutes');
const versaoAppInternalRoutes = require('./versaoAppInternalRoutes');

const router = express.Router();

router.use(authenticateInternal);

router.get('/petshops/by-crm/:crmPetshopId/metricas', internalController.metricasPorCrmPetshopId);
router.post('/petshops/by-crm/:crmPetshopId/cupons', internalController.publicarCupom);
router.get('/petshops/by-crm/:crmPetshopId/cupons-uso', internalController.usoCuponsPorCrmPetshopId);
router.post('/vinculo-clinica/gerar-codigo', internalController.gerarCodigoVinculo);
router.post('/vinculo-clinica/sincronizar-vacina', internalController.sincronizarVacina);
router.post('/vinculo-clinica/sincronizar-registro', internalController.sincronizarRegistroClinico);
router.post('/vinculo-clinica/sincronizar-anexo', internalController.sincronizarAnexo);

// ── Parceiros: cadastro e controle (admin). Conteúdo (cupons/ofertas/perfil) é do portal do pet shop. ──
router.post('/petshops/from-crm', internalController.vincularPetShopDoCrm);
router.post('/petshops/direto', internalController.criarPetShopDireto);
router.get('/petshops/direto', internalController.listarPetShopsDiretos);
router.get('/petshops/:id', internalController.buscarPetShop);
router.patch('/petshops/:id', internalController.atualizarPetShop);
router.patch('/petshops/:id/status', internalController.alterarStatusPetShop);

// ── Acesso ao portal do pet shop + monitoramento ──
router.get('/petshops/:id/acesso', internalPetShopAcessoController.detalhar);
router.post('/petshops/:id/acesso', internalPetShopAcessoController.gerarConvite);
router.delete('/petshops/:id/acesso/convite', internalPetShopAcessoController.revogarConvite);
router.patch('/petshops/:id/acesso/status', internalPetShopAcessoController.alterarStatusAcesso);

// Usado pelo CRM (tenant) ao apagar um cupom publicado: desativa no Club em vez de apagar.
router.patch('/cupons/:cupomId', internalController.atualizarCupomAdmin);

router.get('/ongs', internalOngController.listarOngs);
router.post('/ongs', internalOngController.criarOng);
router.get('/ongs/:id', internalOngController.detalharOng);
router.patch('/ongs/:id/situacao', internalOngController.alterarSituacao);
router.post('/ongs/:id/acesso', internalOngController.gerarConvite);
router.delete('/ongs/:id/acesso/convite', internalOngController.revogarConvite);
router.patch('/ongs/:id/acesso/status', internalOngController.alterarStatusAcesso);

router.use('/novidades', novidadeInternalRoutes);
router.use('/avaliacoes-app', avaliacaoAppInternalRoutes);
router.use('/config-versao-app', versaoAppInternalRoutes);

module.exports = router;
