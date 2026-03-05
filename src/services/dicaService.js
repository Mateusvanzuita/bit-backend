const dicaRepository = require('../repositories/dicaRepository');
const petRepository = require('../repositories/petRepository');
const aiService = require('./aiService');
const { AppError } = require('../middlewares/errorHandler');

class DicaService {
  async listAllDicas() {
    return await dicaRepository.findAll({ orderBy: { createdAt: 'desc' } });
  }

  async getDicaDetails(id) {
    const dica = await dicaRepository.findFullDica(id);
    if (!dica) throw new AppError('Dica não encontrada', 404);
    return dica;
  }

  async gerarDicaPersonalizada(userId, petId, dicaId, respostas) {
    // 1. Validação
    const pet = await petRepository.findByIdAndUser(petId, userId);
    if (!pet) throw new AppError('Pet não encontrado ou acesso negado', 404);

    const dicaBase = await dicaRepository.findById(dicaId);
    if (!dicaBase || !dicaBase.prompt) {
      throw new AppError('Configuração de IA não encontrada para esta dica.', 500);
    }

    const historico = await dicaRepository.createHistorico(petId, dicaId);

    // Verifique se o historico foi criado e tem ID
    if (!historico || !historico.id) {
      throw new AppError('Erro ao criar histórico da dica', 500);
    }
    // 3. Salvar Respostas (Corrigindo o nome da chave para petDicaHistoricoId)
  const promises = respostas.map(resp => {
  return dicaRepository.createResposta({
    historicoId: historico.id,
    petId: petId,
    dicaId: dicaId,
    etapaId: resp.etapaId, // O ID da etapa que vem do frontend
    opcaoId: resp.opcaoId || null,
    texto: resp.texto || null
  });
});

    await Promise.all(promises);

    // 4. Preparar resumo para IA (opcional, melhora o prompt)
    const resumoRespostas = respostas.map(r => `- ${r.etapaId}: ${r.texto || r.opcaoId}`).join('\n');

    // 5. Chamar IA
    try {
      const promptFinal = `
        ${dicaBase.prompt}
        Pet: ${pet.nome} (${pet.especie}).
        Respostas: ${resumoRespostas}
      `;

      const resultadoIA = await aiService.gerarAnaliseBitzy(promptFinal);

      // 6. Salvar resultado final
      await dicaRepository.updateResultadoIA(historico.id, resultadoIA);

      return { ...historico, resultadoIA };
    } catch (error) {
      console.error("❌ ERRO IA DICA:", error);
      throw new AppError("Falha ao gerar dica com IA", 500);
    }
  }

  async getHistorico(id) {
    const result = await dicaRepository.findHistoricoById(id);
    if (!result) throw new AppError('Histórico não encontrado', 404);
    return result;
  }
}

module.exports = new DicaService();