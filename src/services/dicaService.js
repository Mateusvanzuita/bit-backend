// src/services/dicaService.js
const dicaRepository = require('../repositories/dicaRepository');
const petRepository = require('../repositories/petRepository');
const aiService = require('./aiService');
const cache = require('../utils/cache');
const { AppError } = require('../middlewares/errorHandler');

const TTL = {
  LISTA_DICAS: 10 * 60,    // 10 min — lista muda raramente
  DICA_DETALHES: 15 * 60,  // 15 min — etapas/opções são estáticas
};

function keyDetalhes(id) {
  return `dica:detalhes:${id}`;
}

class DicaService {
  async listAllDicas() {
    const cached = await cache.get('dicas:lista');
    if (cached) return cached;

    const dicas = await dicaRepository.findAll({ orderBy: { createdAt: 'desc' } });
    await cache.set('dicas:lista', dicas, TTL.LISTA_DICAS);
    return dicas;
  }

  async getDicaDetails(id) {
    const cacheKey = keyDetalhes(id);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const dica = await dicaRepository.findFullDica(id);
    if (!dica) throw new AppError('Dica não encontrada', 404);

    await cache.set(cacheKey, dica, TTL.DICA_DETALHES);
    return dica;
  }

  async gerarDicaPersonalizada(userId, petId, dicaId, respostas) {
    // Dados pessoais + IA — nunca cachear
    const pet = await petRepository.findByIdAndUser(petId, userId);
    if (!pet) throw new AppError('Pet não encontrado ou acesso negado', 404);

    const dicaBase = await dicaRepository.findById(dicaId);
    if (!dicaBase || !dicaBase.prompt) {
      throw new AppError('Configuração de IA não encontrada para esta dica.', 500);
    }

    const historico = await dicaRepository.createHistorico(petId, dicaId);
    if (!historico || !historico.id) {
      throw new AppError('Erro ao criar histórico da dica', 500);
    }

    const promises = respostas.map(resp =>
      dicaRepository.createResposta({
        historicoId: historico.id,
        petId,
        dicaId,
        etapaId: resp.etapaId,
        opcaoId: resp.opcaoId || null,
        texto: resp.texto || null,
      })
    );
    await Promise.all(promises);

    const resumoRespostas = respostas.map(r => `- ${r.etapaId}: ${r.texto || r.opcaoId}`).join('\n');

    try {
      const promptFinal = `
        ${dicaBase.prompt}
        Pet: ${pet.nome} (${pet.especie}).
        Respostas: ${resumoRespostas}
      `;

      const resultadoIA = await aiService.gerarAnaliseBitzy(promptFinal);
      await dicaRepository.updateResultadoIA(historico.id, resultadoIA);
      return { ...historico, resultadoIA };
    } catch (error) {
      console.error('❌ ERRO IA DICA:', error);
      throw new AppError('Falha ao gerar dica com IA', 500);
    }
  }

  async getHistorico(id) {
    // Histórico é pessoal — nunca cachear
    const result = await dicaRepository.findHistoricoById(id);
    if (!result) throw new AppError('Histórico não encontrado', 404);
    return result;
  }
}

module.exports = new DicaService();