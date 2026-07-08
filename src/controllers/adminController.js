// src/controllers/adminController.js
const adminService = require('../services/adminService');
const asyncHandler = require('../utils/asyncHandler');

class AdminController {

  // ── AUTH ──────────────────────────────────────────────────────────────────

  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const { admin, token } = await adminService.login(email, password);
    res.status(200).json({ status: 'success', data: { admin, token } });
  });

  criarAdmin = asyncHandler(async (req, res) => {
    const admin = await adminService.criarAdmin(req.body, req.admin);
    res.status(201).json({ status: 'success', data: { admin } });
  });

  me = asyncHandler(async (req, res) => {
    res.status(200).json({ status: 'success', data: { admin: req.admin } });
  });

  // ── MÉTRICAS ──────────────────────────────────────────────────────────────

  metrics = asyncHandler(async (req, res) => {
    const data = await adminService.getMetrics();
    res.status(200).json({ status: 'success', data });
  });

  // ── USUÁRIOS ──────────────────────────────────────────────────────────────

  listarUsuarios = asyncHandler(async (req, res) => {
    const { page, limit, search } = req.query;
    const data = await adminService.listarUsuarios({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
    });
    res.status(200).json({ status: 'success', data });
  });

  detalhesUsuario = asyncHandler(async (req, res) => {
    const user = await adminService.detalhesUsuario(req.params.userId);
    res.status(200).json({ status: 'success', data: { user } });
  });

  // ── SOS PROMPT ────────────────────────────────────────────────────────────

  getSosPrompt = asyncHandler(async (req, res) => {
    const prompt = await adminService.getSosPromptAtivo();
    res.status(200).json({ status: 'success', data: { prompt } });
  });

  listarVersoesPrompt = asyncHandler(async (req, res) => {
    const versoes = await adminService.listarVersoesPrompt();
    res.status(200).json({ status: 'success', data: { versoes } });
  });

  salvarSosPrompt = asyncHandler(async (req, res) => {
    const { conteudo } = req.body;
    const prompt = await adminService.salvarSosPrompt(conteudo, req.admin.id);
    res.status(201).json({ status: 'success', data: { prompt } });
  });

  ativarVersaoPrompt = asyncHandler(async (req, res) => {
    const prompt = await adminService.ativarVersaoPrompt(req.params.promptId, req.admin.id);
    res.status(200).json({ status: 'success', data: { prompt } });
  });

  // ── BROADCAST ─────────────────────────────────────────────────────────────

  broadcast = asyncHandler(async (req, res) => {
    const { titulo, mensagem, tipo, pathKey, filtro } = req.body;
    const resultado = await adminService.broadcastNotificacao({
      titulo,
      mensagem,
      tipo,
      pathKey,
      filtro,
    });
    res.status(200).json({ status: 'success', data: resultado });
  });

    // ── PET SHOPS ─────────────────────────────────────────────────────────────

  listarPetShops = asyncHandler(async (req, res) => {
    const data = await adminService.listarPetShops();
    res.status(200).json({ status: 'success', data });
  });

  atualizarPetShop = asyncHandler(async (req, res) => {
    const petShop = await adminService.atualizarPetShop(req.params.id, req.body);
    res.status(200).json({ status: 'success', data: { petShop } });
  });

  deletarPetShop = asyncHandler(async (req, res) => {
    await adminService.deletarPetShop(req.params.id);
    res.status(200).json({ status: 'success', data: null });
  });
}


module.exports = new AdminController();
