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
    const pet = await petRepository.findByIdAndUser(petId, userId);
    if (!pet) throw new AppError('Pet não encontrado', 404);

    const dicaBase = await dicaRepository.findById(dicaId);
    if (!dicaBase || !dicaBase.prompt) throw new AppError('Configuração de IA não encontrada para esta dica.', 500);

    // 1. Criar Histórico
    const historico = await dicaRepository.createHistorico(petId, dicaId);

    // 2. Salvar Respostas e preparar resumo para IA
    let resumoRespostas = "";
    for (const resp of respostas) {
      await dicaRepository.createResposta({
        historicoId: historico.id,
        etapaId: resp.etapaId,
        opcaoId: resp.opcaoId,
        petId: petId, // Repassando o petId
      dicaId: dicaId
      });
      resumoRespostas += `- Pergunta ID ${resp.etapaId}: Opção ID ${resp.opcaoId}\n`;
    }

    // 3. Montar Prompt
    const promptFinal = `
      ${dicaBase.prompt}
      DADOS DO PET: ${pet.nome}, Espécie: ${pet.especie}, Idade: ${pet.idade} anos.
      RESPOSTAS: ${resumoRespostas}
    `;

    // 4. Chamar IA
    try {
      const resultadoIA = await aiService.gerarAnaliseBitzy(promptFinal);
      await dicaRepository.updateResultadoIA(historico.id, resultadoIA);
      return { ...historico, resultadoIA };
    } catch (error) {
      console.error("Erro Dica IA:", error);
      throw new AppError("Falha ao gerar dica personalizada.", 500);
    }
  }

  async getHistorico(id) {
    return await dicaRepository.findHistoricoById(id);
  }
}

module.exports = new DicaService();