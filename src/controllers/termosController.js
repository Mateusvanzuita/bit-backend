const termosService = require('../services/termosService');
const asyncHandler = require('../utils/asyncHandler');

class TermosController {
  // Para o Dashboard cadastrar novos textos
  createPolitica = asyncHandler(async (req, res) => {
    const politica = await termosService.upsertPolitica(req.body);
    res.status(201).json({ status: 'success', data: { politica } });
  });

  createTermo = asyncHandler(async (req, res) => {
    const termo = await termosService.upsertTermo(req.body);
    res.status(201).json({ status: 'success', data: { termo } });
  });

  // Para o App mobile buscar o que exibir ao usuário
  getLatest = asyncHandler(async (req, res) => {
    const termos = await termosService.getLatestTermos();
    res.status(200).json({ status: 'success', data: termos });
  });

  // Para o App registrar o aceite do usuário logado
  aceitarTermos = asyncHandler(async (req, res) => {
    const aceite = await termosService.registrarAceite(req.user.id, {
      ...req.body,
      ip: req.ip // Captura o IP automaticamente
    });
    res.status(200).json({ status: 'success', data: { aceite } });
  });
}

module.exports = new TermosController();