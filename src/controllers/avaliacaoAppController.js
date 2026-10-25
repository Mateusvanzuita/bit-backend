// src/controllers/avaliacaoAppController.js
const avaliacaoAppService = require('../services/avaliacaoAppService');
const asyncHandler = require('../utils/asyncHandler');

class AvaliacaoAppController {
  // ── APP ─────────────────────────────────────────────────
  criar = asyncHandler(async (req, res) => {
    const avaliacao = await avaliacaoAppService.criar(req.user.id, req.body);
    res.status(201).json({ status: 'success', data: { avaliacao } });
  });

  atualizar = asyncHandler(async (req, res) => {
    await avaliacaoAppService.atualizar(req.user.id, req.params.id, req.body);
    res.status(200).json({ status: 'success', message: 'Avaliação atualizada' });
  });

  estado = asyncHandler(async (req, res) => {
    const data = await avaliacaoAppService.estado(req.user.id);
    res.status(200).json({ status: 'success', data });
  });

  // ── ADMIN ───────────────────────────────────────────────
  listar = asyncHandler(async (req, res) => {
    const { page, limit, nota, gatilho, plataforma, versao, status, de, ate, comComentario } = req.query;
    const data = await avaliacaoAppService.listar({
      page: page ? Math.max(1, parseInt(page, 10)) : 1,
      limit: limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 20,
      nota, gatilho, plataforma, versao, status, de, ate, comComentario,
    });
    res.status(200).json({ status: 'success', data });
  });

  resumo = asyncHandler(async (req, res) => {
    const data = await avaliacaoAppService.resumo({ de: req.query.de, ate: req.query.ate });
    res.status(200).json({ status: 'success', data });
  });

  atualizarStatus = asyncHandler(async (req, res) => {
    const avaliacao = await avaliacaoAppService.atualizarStatus(req.params.id, req.body?.status);
    res.status(200).json({ status: 'success', data: { avaliacao } });
  });
}

module.exports = new AvaliacaoAppController();