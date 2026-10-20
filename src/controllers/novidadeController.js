// src/controllers/novidadeController.js
const novidadeService = require('../services/novidadeService');
const asyncHandler = require('../utils/asyncHandler');

class NovidadeController {
  // ── App ─────────────────────────────────────────────────────
  listar = asyncHandler(async (req, res) => {
    const data = await novidadeService.listarPublicas(req.query);
    res.status(200).json({ status: 'success', data });
  });

  obter = asyncHandler(async (req, res) => {
    const data = await novidadeService.obterPublica(req.params.slug);
    res.status(200).json({ status: 'success', data });
  });

  // ── Admin ───────────────────────────────────────────────────
  listarAdmin = asyncHandler(async (req, res) => {
    const data = await novidadeService.listarAdmin(req.query);
    res.status(200).json({ status: 'success', data });
  });

  obterAdmin = asyncHandler(async (req, res) => {
    const novidade = await novidadeService.obterAdmin(req.params.id);
    res.status(200).json({ status: 'success', data: { novidade } });
  });

  criar = asyncHandler(async (req, res) => {
    const novidade = await novidadeService.criar(req.body);
    res.status(201).json({ status: 'success', data: { novidade } });
  });

  atualizar = asyncHandler(async (req, res) => {
    const novidade = await novidadeService.atualizar(req.params.id, req.body);
    res.status(200).json({ status: 'success', data: { novidade } });
  });

  alterarStatus = asyncHandler(async (req, res) => {
    const novidade = await novidadeService.alterarStatus(req.params.id, req.body);
    res.status(200).json({ status: 'success', data: { novidade } });
  });

  excluir = asyncHandler(async (req, res) => {
    await novidadeService.excluir(req.params.id);
    res.status(204).send();
  });
}

module.exports = new NovidadeController();
