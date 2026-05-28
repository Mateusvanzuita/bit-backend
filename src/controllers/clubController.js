// src/controllers/clubController.js
const clubService = require('../services/clubService');
const asyncHandler = require('../utils/asyncHandler');

class ClubController {

  // ── PET SHOPS ──────────────────────────────────────────────────────────────

  // GET /club/petshops
  // Query: latitude, longitude, cidade, estado, raioKm
  listarPetShops = asyncHandler(async (req, res) => {
    const { latitude, longitude, cidade, estado, raioKm } = req.query;
    const petShops = await clubService.listarPetShops(req.user.id, {
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      cidade,
      estado,
      raioKm: raioKm ? parseFloat(raioKm) : undefined,
    });
    res.status(200).json({ status: 'success', data: { petShops } });
  });

  // GET /club/petshops/:petShopId
  detalhesPetShop = asyncHandler(async (req, res) => {
    const petShop = await clubService.detalhesPetShop(req.params.petShopId, req.user.id);
    res.status(200).json({ status: 'success', data: { petShop } });
  });

  // ── SEGUIR / DEIXAR DE SEGUIR ──────────────────────────────────────────────

  // POST /club/petshops/:petShopId/seguir
  seguir = asyncHandler(async (req, res) => {
    const result = await clubService.seguirPetShop(req.user.id, req.params.petShopId);
    res.status(200).json({ status: 'success', data: result });
  });

  // DELETE /club/petshops/:petShopId/seguir
  deixarDeSeguir = asyncHandler(async (req, res) => {
    const result = await clubService.deixarDeSeguir(req.user.id, req.params.petShopId);
    res.status(200).json({ status: 'success', data: result });
  });

  // ── FAVORITAR ──────────────────────────────────────────────────────────────

  // POST /club/petshops/:petShopId/favoritar
  favoritar = asyncHandler(async (req, res) => {
    const result = await clubService.favoritarPetShop(req.user.id, req.params.petShopId);
    res.status(200).json({ status: 'success', data: result });
  });

  // DELETE /club/favorito
  desfavoritar = asyncHandler(async (req, res) => {
    const result = await clubService.desfavoritarPetShop(req.user.id);
    res.status(200).json({ status: 'success', data: result });
  });

  // ── CUPONS ────────────────────────────────────────────────────────────────

  // GET /club/cupons
  // Query: latitude, longitude, cidade, estado
  listarCupons = asyncHandler(async (req, res) => {
    const { latitude, longitude, cidade, estado } = req.query;
    const cupons = await clubService.listarCuponsDisponiveis(req.user.id, {
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      cidade,
      estado,
    });
    res.status(200).json({ status: 'success', data: { cupons } });
  });

  // POST /club/cupons/:cupomId/resgatar
  resgatar = asyncHandler(async (req, res) => {
    const resgate = await clubService.resgatarCupom(req.user.id, req.params.cupomId);
    res.status(201).json({ status: 'success', data: { resgate } });
  });

  // PATCH /club/resgates/:resgateId/utilizar
  utilizar = asyncHandler(async (req, res) => {
    const resgate = await clubService.utilizarCupom(req.user.id, req.params.resgateId);
    res.status(200).json({ status: 'success', data: { resgate } });
  });

  // GET /club/carteira
  carteira = asyncHandler(async (req, res) => {
    const resgates = await clubService.carteiraCupons(req.user.id);
    res.status(200).json({ status: 'success', data: { resgates } });
  });

  // ── GESTÃO DE CUPONS (petshop / admin) ────────────────────────────────────

  // POST /club/petshops/:petShopId/cupons
  criarCupom = asyncHandler(async (req, res) => {
    const cupom = await clubService.criarCupom(req.params.petShopId, req.body);
    res.status(201).json({ status: 'success', data: { cupom } });
  });

  // PATCH /club/petshops/:petShopId/cupons/:cupomId
  atualizarCupom = asyncHandler(async (req, res) => {
    const cupom = await clubService.atualizarCupom(
      req.params.cupomId,
      req.params.petShopId,
      req.body,
    );
    res.status(200).json({ status: 'success', data: { cupom } });
  });

  // DELETE /club/petshops/:petShopId/cupons/:cupomId
  desativarCupom = asyncHandler(async (req, res) => {
    await clubService.desativarCupom(req.params.cupomId, req.params.petShopId);
    res.status(200).json({ status: 'success', message: 'Cupom desativado com sucesso' });
  });

  // GET /club/petshops/:petShopId/metricas
  metricas = asyncHandler(async (req, res) => {
    const dados = await clubService.metricasPetShop(req.params.petShopId);
    res.status(200).json({ status: 'success', data: dados });
  });
}

module.exports = new ClubController();