// src/routes/clubRoutes.js
const express = require('express');
const clubController = require('../controllers/clubController');
const authMiddleware = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  listarPetShopsValidator,
  petShopIdValidator,
  listarCuponsValidator,
  resgatarCupomValidator,
  utilizarCupomValidator,
  criarCupomValidator,
  atualizarCupomValidator,
} = require('../validators/clubValidator');

const router = express.Router();

// Todas as rotas do club exigem autenticação
router.use(authMiddleware);

// ── PET SHOPS ──────────────────────────────────────────────────────────────

// Lista pet shops próximos ao usuário (GPS ou cidade)
router.get(
  '/petshops',
  listarPetShopsValidator,
  validate,
  clubController.listarPetShops,
);

// Detalhes de um pet shop + seus cupons ativos
router.get(
  '/petshops/:petShopId',
  petShopIdValidator,
  validate,
  clubController.detalhesPetShop,
);

// ── SEGUIR ─────────────────────────────────────────────────────────────────

router.post(
  '/petshops/:petShopId/seguir',
  petShopIdValidator,
  validate,
  clubController.seguir,
);

router.delete(
  '/petshops/:petShopId/seguir',
  petShopIdValidator,
  validate,
  clubController.deixarDeSeguir,
);

// ── FAVORITAR (limite: 1 por usuário) ─────────────────────────────────────

router.post(
  '/petshops/:petShopId/favoritar',
  petShopIdValidator,
  validate,
  clubController.favoritar,
);

// Remove favorito do usuário (sem precisar informar o pet shop)
router.delete(
  '/favorito',
  clubController.desfavoritar,
);

// ── CUPONS — USUÁRIO ──────────────────────────────────────────────────────

// Feed de cupons disponíveis na cidade/GPS do usuário
router.get(
  '/cupons',
  listarCuponsValidator,
  validate,
  clubController.listarCupons,
);

// Resgata um cupom (adiciona à carteira)
router.post(
  '/cupons/:cupomId/resgatar',
  resgatarCupomValidator,
  validate,
  clubController.resgatar,
);

// Marca um resgate como utilizado (apresentado ao atendente)
router.patch(
  '/resgates/:resgateId/utilizar',
  utilizarCupomValidator,
  validate,
  clubController.utilizar,
);

// Carteira de cupons do usuário (ativos + histórico)
router.get(
  '/carteira',
  clubController.carteira,
);

// ── GESTÃO DE CUPONS (pet shop / admin) ───────────────────────────────────
// Por ora sem middleware de role — adicione authPetShop ou authAdmin quando
// implementar o painel do estabelecimento

router.post(
  '/petshops/:petShopId/cupons',
  criarCupomValidator,
  validate,
  clubController.criarCupom,
);

router.patch(
  '/petshops/:petShopId/cupons/:cupomId',
  atualizarCupomValidator,
  validate,
  clubController.atualizarCupom,
);

router.delete(
  '/petshops/:petShopId/cupons/:cupomId',
  clubController.desativarCupom,
);

// ── MÉTRICAS DO PET SHOP ──────────────────────────────────────────────────

router.get(
  '/petshops/:petShopId/metricas',
  petShopIdValidator,
  validate,
  clubController.metricas,
);

module.exports = router;