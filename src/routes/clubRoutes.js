// src/routes/clubRoutes.js  (SUBSTITUI o arquivo atual)
// SEGURANÇA: no arquivo original as rotas de "gestão" (criar pet shop, criar/editar/desativar cupom de QUALQUER
// pet shop e ver métricas de qualquer loja) exigiam só login de TUTOR (comentário no código: "sem middleware de role").
// Qualquer usuário do app podia chamá-las. Agora a gestão é do portal do pet shop (/petshop-portal) e do admin (/internal).
// O app não usa estas rotas (confirmado em src/service/clubService.ts do bitzy-frontend).
const express = require('express');
const clubController = require('../controllers/clubController');
const ofertaController = require('../controllers/ofertaController');
const authMiddleware = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  listarPetShopsValidator,
  petShopIdValidator,
  listarCuponsValidator,
  resgatarCupomValidator,
  utilizarCupomValidator,
} = require('../validators/clubValidator');

const router = express.Router();

// Todas as rotas do club exigem autenticação (tutor)
router.use(authMiddleware);

// ── PET SHOPS ──────────────────────────────────────────────────────────────
router.get('/petshops', listarPetShopsValidator, validate, clubController.listarPetShops);
router.get('/petshops/:petShopId', petShopIdValidator, validate, clubController.detalhesPetShop);

// ── SEGUIR ─────────────────────────────────────────────────────────────────
router.post('/petshops/:petShopId/seguir', petShopIdValidator, validate, clubController.seguir);
router.delete('/petshops/:petShopId/seguir', petShopIdValidator, validate, clubController.deixarDeSeguir);

// ── FAVORITAR (limite: 1 por usuário) ─────────────────────────────────────
router.post('/petshops/:petShopId/favoritar', petShopIdValidator, validate, clubController.favoritar);
router.delete('/favorito', clubController.desfavoritar);

// ── CUPONS — USUÁRIO ──────────────────────────────────────────────────────
router.get('/cupons', listarCuponsValidator, validate, clubController.listarCupons);
router.post('/cupons/:cupomId/resgatar', resgatarCupomValidator, validate, clubController.resgatar);
router.patch('/resgates/:resgateId/utilizar', utilizarCupomValidator, validate, clubController.utilizar);
router.get('/carteira', clubController.carteira);

// ── OFERTAS DE PRODUTOS ────────────────────────────────────────────────────
router.get('/ofertas', ofertaController.listar);
router.post('/ofertas/:id/clique', ofertaController.registrarClique);

module.exports = router;
