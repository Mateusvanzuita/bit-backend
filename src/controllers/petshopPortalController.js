// src/controllers/petshopPortalController.js
// Finos de propósito: `petShopId` SEMPRE de req.petshop (token + banco). Nada de petShopId vindo de body/query/params.
const asyncHandler = require('../utils/asyncHandler');
const perfil = require('../services/petshopPortalPerfilService');
const cupons = require('../services/petshopPortalCuponsService');
const ofertas = require('../services/petshopPortalOfertasService');
const painel = require('../services/petshopPortalPainelService');

const ok = (res, data, status = 200) => res.status(status).json({ status: 'success', data });
const ps = (req) => req.petshop.petShopId;

exports.dashboard = asyncHandler(async (req, res) => ok(res, await painel.dashboard(ps(req))));
exports.metricas = asyncHandler(async (req, res) => ok(res, await painel.metricas(ps(req), req.query.periodo ?? '30d')));
exports.interacoes = asyncHandler(async (req, res) => ok(res, await painel.interacoes(ps(req), req.query)));

exports.obterPerfil = asyncHandler(async (req, res) => ok(res, await perfil.obter(ps(req))));
exports.atualizarPerfil = asyncHandler(async (req, res) => ok(res, await perfil.atualizar(ps(req), req.body)));

exports.listarCupons = asyncHandler(async (req, res) => ok(res, await cupons.listar(ps(req), req.query)));
exports.obterCupom = asyncHandler(async (req, res) => ok(res, await cupons.obter(ps(req), req.params.id)));
exports.criarCupom = asyncHandler(async (req, res) => ok(res, await cupons.criar(ps(req), req.body), 201));
exports.atualizarCupom = asyncHandler(async (req, res) => ok(res, await cupons.atualizar(ps(req), req.params.id, req.body)));
exports.statusCupom = asyncHandler(async (req, res) => ok(res, await cupons.alterarStatus(ps(req), req.params.id, req.body)));

exports.listarOfertas = asyncHandler(async (req, res) => ok(res, await ofertas.listar(ps(req), req.query)));
exports.obterOferta = asyncHandler(async (req, res) => ok(res, await ofertas.obter(ps(req), req.params.id)));
exports.criarOferta = asyncHandler(async (req, res) => ok(res, await ofertas.criar(ps(req), req.body), 201));
exports.atualizarOferta = asyncHandler(async (req, res) => ok(res, await ofertas.atualizar(ps(req), req.params.id, req.body)));
exports.statusOferta = asyncHandler(async (req, res) => ok(res, await ofertas.alterarStatus(ps(req), req.params.id, req.body)));

exports.upload = asyncHandler(async (req, res) => ok(res, { url: req.file.path }, 201));
