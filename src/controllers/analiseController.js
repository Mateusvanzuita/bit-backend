const analiseService = require('../services/analiseService');
const asyncHandler = require('../utils/asyncHandler');

class AnaliseController {
  index = asyncHandler(async (req, res) => {
    const analises = await analiseService.listAllAnalises();
    res.status(200).json({ status: 'success', data: { analises } });
  });

  show = asyncHandler(async (req, res) => {
    const analise = await analiseService.getAnaliseDetails(req.params.id);
    res.status(200).json({ status: 'success', data: { analise } });
  });

  submit = asyncHandler(async (req, res) => {
    const { petId, respostas } = req.body;
    const historico = await analiseService.salvarAnaliseCompleta(
      req.user.id, 
      petId, 
      req.params.id, 
      respostas
    );
    res.status(201).json({ status: 'success', data: { historico } });
  });
}

module.exports = new AnaliseController();