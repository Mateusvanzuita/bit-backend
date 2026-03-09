const sosService = require('../services/sosService');
const asyncHandler = require('../utils/asyncHandler');

class SosController {
  /**
   * Cria um novo atendimento SOS
   * POST /api/v1/sos
   */
  create = asyncHandler(async (req, res) => {
    const { petId, mensagem } = req.body;
    const userId = req.user.id;
    
    const atendimento = await sosService.processarEmergencia(userId, petId, mensagem);
    
    res.status(201).json({ 
      status: 'success', 
      data: atendimento 
    });
  });

  /**
   * Busca um atendimento específico (para carregar chat)
   * GET /api/v1/sos/:id
   */
  show = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    const atendimento = await sosService.getAtendimento(id, userId);
    
    res.status(200).json({ 
      status: 'success', 
      data: atendimento 
    });
  });

  /**
   * ========== NOVO: Continuar conversa ==========
   * Adiciona nova mensagem ao chat contínuo
   * POST /api/v1/sos/:id/mensagem
   * 
   * Body:
   * {
   *   "mensagem": "E se ele tiver febre?"
   * }
   */
  adicionarMensagem = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { mensagem } = req.body;
    const userId = req.user.id;

    // Validações
    if (!mensagem || mensagem.trim().length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Mensagem não pode estar vazia'
      });
    }

    if (mensagem.length > 500) {
      return res.status(400).json({
        status: 'fail',
        message: 'Mensagem muito longa (máximo 500 caracteres)'
      });
    }

    // Processar nova mensagem no chat
    const atendimentoAtualizado = await sosService.adicionarMensagemAoChat(
      id,
      userId,
      mensagem
    );

    res.status(200).json({
      status: 'success',
      data: atendimentoAtualizado
    });
  });

  /**
   * ========== NOVO: Obter histórico completo ==========
   * Retorna todas as mensagens do chat
   * GET /api/v1/sos/:id/historico
   */
  obterHistorico = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const historico = await sosService.obterHistoricoCompleto(id, userId);

    res.status(200).json({
      status: 'success',
      data: historico
    });
  });

  /**
   * ========== NOVO: Encerrar atendimento ==========
   * Finaliza o chat (usuário não quer mais responder)
   * PATCH /api/v1/sos/:id/encerrar
   */
  encerrar = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const atendimento = await sosService.encerrarAtendimento(id, userId);

    res.status(200).json({
      status: 'success',
      message: 'Atendimento encerrado',
      data: atendimento
    });
  });
}

module.exports = new SosController();