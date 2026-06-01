// src/services/sosService.js
const petRepository = require('../repositories/petRepository');
const aiService = require('./aiService');
const sosRepository = require('../repositories/sosRepository');
const cache = require('../utils/cache');
const { AppError } = require('../middlewares/errorHandler');
const { SYSTEM_PROMPT, buildPrimeiroAtendimentoPrompt, buildContinuacaoChatPrompt } = require('../utils/sosPrompt');

// ── TTLs ──────────────────────────────────────────────────────────────────────
const TTL = {
  HISTORICO: 24 * 60 * 60,   // 24h — histórico de conversa ativa
  CACHE_IA: 24 * 60 * 60,    // 24h — cache de respostas da IA (igual ao anterior)
};

// ── Chaves Redis ──────────────────────────────────────────────────────────────
function keyHistorico(atendimentoId) {
  return `sos:historico:${atendimentoId}`;
}

function keyCacheIA(petId, mensagem) {
  const normalizada = mensagem.toLowerCase().trim().replace(/\s+/g, ' ');
  return `sos:ia:${petId}:${normalizada}`;
}

// ── Helper: calcular idade do pet ─────────────────────────────────────────────
function calcularIdadePet(dataNascimento) {
  const nascimento = new Date(dataNascimento);
  const hoje = new Date();
  let anos = hoje.getFullYear() - nascimento.getFullYear();
  let meses = hoje.getMonth() - nascimento.getMonth();
  if (meses < 0) { anos--; meses += 12; }
  return { anos, meses };
}

function montarDadosPet(pet) {
  const { anos, meses } = calcularIdadePet(pet.dataNascimento);
  return `Pet: ${pet.nome} | Espécie: ${pet.especie} | Raça: ${pet.raca} | Peso: ${pet.peso}kg | Idade: ${anos}a ${meses}m | Castrado: ${pet.castrado ? 'Sim' : 'Não'}`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────

class SosService {

  // ── PRIMEIRA MENSAGEM ─────────────────────────────────────────────────────

  async processarEmergencia(userId, petId, mensagemUser) {
    const startTime = Date.now();

    try {
      console.log('📥 [SOS] Iniciando processamento da emergência...');

      const pet = await petRepository.findByIdAndUser(petId, userId);
      if (!pet) throw new AppError('Pet não encontrado', 404);

      const dadosPet = montarDadosPet(pet);

      // Cache de IA: mesma pergunta + mesmo pet = mesma resposta
      const cacheIAKey = keyCacheIA(petId, mensagemUser);
      let respostaIA = await cache.get(cacheIAKey);

      if (respostaIA) {
        console.log('✅ [CACHE] Resposta encontrada no cache Redis!');
      } else {
        const promptFinal = buildPrimeiroAtendimentoPrompt(dadosPet, mensagemUser);

        console.log('🤖 [IA] Enviando para OpenAI...');
        const iaStart = Date.now();
        respostaIA = await aiService.gerarAnaliseBitzy(promptFinal, SYSTEM_PROMPT);
        console.log(`✅ [IA] Resposta gerada em ${Date.now() - iaStart}ms`);

        await cache.set(cacheIAKey, respostaIA, TTL.CACHE_IA);
      }

      console.log('💾 [DB] Salvando no banco de dados...');
      const atendimento = await sosRepository.create({
        userId,
        petId,
        mensagemUser,
        respostaIA,
      });

      // Salva histórico inicial no Redis (substitui o Map em memória)
      const historico = [
        { role: 'user',      content: mensagemUser, timestamp: new Date() },
        { role: 'assistant', content: respostaIA,   timestamp: new Date() },
      ];
      await cache.set(keyHistorico(atendimento.id), historico, TTL.HISTORICO);

      console.log(`✅ [SOS] Atendimento criado em ${Date.now() - startTime}ms — ID: ${atendimento.id}`);
      return atendimento;

    } catch (error) {
      console.error('❌ [SOS] Erro:', error.message);
      throw error;
    }
  }

  // ── CONTINUAR CHAT ────────────────────────────────────────────────────────

  async adicionarMensagemAoChat(atendimentoId, userId, novaMensagem) {
    const startTime = Date.now();

    try {
      console.log('📥 [CHAT] Adicionando nova mensagem ao chat...');

      const atendimento = await sosRepository.findByIdAndUser(atendimentoId, userId);
      if (!atendimento) throw new AppError('Atendimento não encontrado', 404);

      const pet = await petRepository.findById(atendimento.petId);
      const dadosPet = montarDadosPet(pet);

      // Recupera histórico do Redis
      const historico = await cache.get(keyHistorico(atendimentoId)) || [];

      const historicoTexto = historico
        .map(msg => `${msg.role === 'user' ? 'TUTOR' : 'SOS BITZY'}: ${msg.content}`)
        .join('\n\n');

      const promptFinal = buildContinuacaoChatPrompt(dadosPet, historicoTexto, novaMensagem);

      console.log('🤖 [CHAT] Enviando para OpenAI...');
      const iaStart = Date.now();
      const respostaIA = await aiService.gerarAnaliseBitzy(promptFinal, SYSTEM_PROMPT);
      console.log(`✅ [CHAT] Resposta gerada em ${Date.now() - iaStart}ms`);

      // Atualiza histórico no Redis
      const historicoAtualizado = [
        ...historico,
        { role: 'user',      content: novaMensagem, timestamp: new Date() },
        { role: 'assistant', content: respostaIA,   timestamp: new Date() },
      ];
      await cache.set(keyHistorico(atendimentoId), historicoAtualizado, TTL.HISTORICO);

      console.log('💾 [DB] Atualizando histórico...');
      const atendimentoAtualizado = await sosRepository.update(atendimentoId, { respostaIA });

      console.log(`✅ [CHAT] Mensagem processada em ${Date.now() - startTime}ms — ${historicoAtualizado.length} mensagens`);

      return {
        ...atendimentoAtualizado,
        respostaIA,
        historico: historicoAtualizado,
      };

    } catch (error) {
      console.error('❌ [CHAT] Erro:', error.message);
      throw error;
    }
  }

  // ── HISTÓRICO COMPLETO ────────────────────────────────────────────────────

  async obterHistoricoCompleto(atendimentoId, userId) {
    try {
      const atendimento = await sosRepository.findByIdAndUser(atendimentoId, userId);
      if (!atendimento) throw new AppError('Atendimento não encontrado', 404);

      const historico = await cache.get(keyHistorico(atendimentoId)) || [];

      return {
        atendimentoId: atendimento.id,
        petId: atendimento.petId,
        status: 'ativo',
        criadoEm: atendimento.createdAt,
        atualizadoEm: atendimento.updatedAt,
        mensagens: historico,
      };

    } catch (error) {
      console.error('❌ [CHAT] Erro ao obter histórico:', error.message);
      throw error;
    }
  }

  // ── ENCERRAR ATENDIMENTO ──────────────────────────────────────────────────

  async encerrarAtendimento(atendimentoId, userId) {
    try {
      const atendimento = await sosRepository.findByIdAndUser(atendimentoId, userId);
      if (!atendimento) throw new AppError('Atendimento não encontrado', 404);

      // Remove histórico do Redis ao encerrar
      await cache.del(keyHistorico(atendimentoId));

      console.log(`✅ [SOS] Atendimento ${atendimentoId} encerrado`);
      return atendimento;

    } catch (error) {
      console.error('❌ [SOS] Erro ao encerrar:', error.message);
      throw error;
    }
  }

  // ── BUSCAR ATENDIMENTO ────────────────────────────────────────────────────

  async getAtendimento(id, userId) {
    try {
      const atendimento = await sosRepository.findByIdAndUser(id, userId);
      if (!atendimento) throw new AppError('Atendimento não encontrado', 404);

      const historico = await cache.get(keyHistorico(id)) || [];

      return { ...atendimento, historico };

    } catch (error) {
      throw error;
    }
  }

  // ── ESTATÍSTICAS DE CACHE (utilitário) ───────────────────────────────────

  async getEstatisticasCache() {
    try {
      const redis = require('../config/redis');
      const [historicoKeys, iaKeys] = await Promise.all([
        redis.keys('sos:historico:*'),
        redis.keys('sos:ia:*'),
      ]);
      return {
        historicosAtivos: historicoKeys.length,
        respostasIACacheadas: iaKeys.length,
      };
    } catch {
      return { historicosAtivos: 0, respostasIACacheadas: 0 };
    }
  }
}

module.exports = new SosService();