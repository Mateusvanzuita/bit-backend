const sosService = require('../services/sosService');
const asyncHandler = require('../utils/asyncHandler');

class SosController {
  create = asyncHandler(async (req, res) => {
    const { petId, mensagem } = req.body;
    const userId = req.user.id;

    const atendimento = await sosService.processarEmergencia(userId, petId, mensagem);
    
    res.status(201).json({ 
      status: 'success', 
      data: atendimento 
    });
  });
}

module.exports = new SosController();