// src/controllers/versaoAppController.js
const versaoAppService = require('../services/versaoAppService');
const asyncHandler = require('../utils/asyncHandler');

class VersaoAppController {
  // PÚBLICO: GET /app/versao?plataforma=ios
  obter = asyncHandler(async (req, res) => {
    const versao = await versaoAppService.obter(String(req.query.plataforma || '').toLowerCase());
    res.status(200).json({ status: 'success', data: { versao } });
  });

  // INTERNO (CRM)
  listar = asyncHandler(async (req, res) => {
    const versoes = await versaoAppService.listar();
    res.status(200).json({ status: 'success', data: { versoes } });
  });

  salvar = asyncHandler(async (req, res) => {
    const versao = await versaoAppService.salvar(req.params.plataforma, req.body);
    res.status(200).json({ status: 'success', data: { versao } });
  });
}

module.exports = new VersaoAppController();