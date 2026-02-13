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

  // No seu analiseController.js
getHistorico = asyncHandler(async (req, res) => {
  const { historicoId } = req.params;
  const historico = await analiseService.getHistoricoById(historicoId);
  
  res.status(200).json({ 
    status: 'success', 
    data: historico 
  });
});

submit = asyncHandler(async (req, res) => {
  const { petId, respostas } = req.body;
  console.log("📥 [CONTROLLER] Recebido submit para Pet:", petId);

  const result = await analiseService.salvarAnaliseCompleta(
    req.user.id, 
    petId, 
    req.params.id, 
    respostas
  );

  console.log("📤 [CONTROLLER] IA finalizou. Enviando resposta para o App...");
  
  return res.status(201).json({ 
    status: 'success', 
    data: { historico: result } // Ajustado para bater com o front
  });
});
}

module.exports = new AnaliseController();