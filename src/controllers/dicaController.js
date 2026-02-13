const dicaService = require('../services/dicaService');
const asyncHandler = require('../utils/asyncHandler');

class DicaController {
  index = asyncHandler(async (req, res) => {
    const dicas = await dicaService.listAllDicas();
    res.status(200).json({ status: 'success', data: { dicas } });
  });

  show = asyncHandler(async (req, res) => {
    const dica = await dicaService.getDicaDetails(req.params.id);
    res.status(200).json({ status: 'success', data: { dica } });
  });

  submitRespostas = asyncHandler(async (req, res) => {
    const { petId, respostas } = req.body;
    const result = await dicaService.gerarDicaPersonalizada(
      req.user.id, 
      petId, 
      req.params.id, 
      respostas
    );
    res.status(201).json({ status: 'success', data: result });
  });

  getHistorico = asyncHandler(async (req, res) => {
    const result = await dicaService.getHistorico(req.params.historicoId);
    res.status(200).json({ status: 'success', data: result });
  });
}

module.exports = new DicaController();