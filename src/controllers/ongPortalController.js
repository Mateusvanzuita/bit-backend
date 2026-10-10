// src/controllers/ongPortalController.js
// Finos de propósito: `ongId` SEMPRE de req.ong (token + banco). Nada de ongId vindo de body/query/params.
const asyncHandler = require('../utils/asyncHandler');
const perfil = require('../services/ongPortalPerfilService');
const animais = require('../services/ongPortalAnimaisService');
const interesses = require('../services/ongPortalInteressesService');
const painel = require('../services/ongPortalPainelService');

const ok = (res, data, status = 200) => res.status(status).json({ status: 'success', data });
const ong = (req) => req.ong.ongId;

exports.dashboard = asyncHandler(async (req, res) => ok(res, await painel.dashboard(ong(req))));
exports.metricas = asyncHandler(async (req, res) => ok(res, await painel.metricas(ong(req), req.query.periodo ?? '30d')));

exports.obterPerfil = asyncHandler(async (req, res) => ok(res, await perfil.obterPerfil(ong(req))));
exports.atualizarPerfil = asyncHandler(async (req, res) => ok(res, await perfil.atualizarPerfil(ong(req), req.body)));

exports.listarAnimais = asyncHandler(async (req, res) => ok(res, await animais.listar(ong(req), req.query)));
exports.obterAnimal = asyncHandler(async (req, res) => ok(res, await animais.obter(ong(req), req.params.id)));
exports.criarAnimal = asyncHandler(async (req, res) => ok(res, await animais.criar(ong(req), req.body), 201));
exports.atualizarAnimal = asyncHandler(async (req, res) => ok(res, await animais.atualizar(ong(req), req.params.id, req.body)));
exports.statusAnimal = asyncHandler(async (req, res) => ok(res, await animais.alterarStatus(ong(req), req.params.id, req.body)));
exports.publicacaoAnimal = asyncHandler(async (req, res) => ok(res, await animais.alterarPublicacao(ong(req), req.params.id, req.body)));
exports.fotosAnimal = asyncHandler(async (req, res) => ok(res, await animais.atualizarFotos(ong(req), req.params.id, req.body)));

exports.upload = asyncHandler(async (req, res) => ok(res, { url: req.file.path }, 201));

exports.listarInteresses = asyncHandler(async (req, res) => ok(res, await interesses.listar(ong(req), req.query)));
exports.obterInteresse = asyncHandler(async (req, res) => ok(res, await interesses.obter(ong(req), req.params.id)));
exports.statusInteresse = asyncHandler(async (req, res) => ok(res, await interesses.alterarStatus(ong(req), req.params.id, req.body)));
exports.confirmarAdocao = asyncHandler(async (req, res) => ok(res, await interesses.confirmarAdocao(ong(req), req.params.id)));

exports.obterAjuda = asyncHandler(async (req, res) => ok(res, await perfil.obterAjuda(ong(req))));
exports.salvarAjuda = asyncHandler(async (req, res) => ok(res, await perfil.salvarAjuda(ong(req), req.body)));
exports.listarPedidos = asyncHandler(async (req, res) => ok(res, await interesses.listarPedidos(ong(req), req.query)));
exports.statusPedido = asyncHandler(async (req, res) => ok(res, await interesses.alterarStatusPedido(ong(req), req.params.id, req.body)));
