const petRepository = require('../repositories/petRepository');
const aiService = require('./aiService');
const sosRepository = require('../repositories/sosRepository');
const { AppError } = require('../middlewares/errorHandler');

/**
 * ========== CACHE DE RESPOSTAS ==========
 */
const responseCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;
const CACHE_MAX_SIZE = 100;

// ✅ NOVO: Armazenar históricos em memória (temporário até migration)
const historicoEmMemoria = new Map();

class SosService {
  /**
   * Processa emergência (primeira mensagem do chat)
   */
  async processarEmergencia(userId, petId, mensagemUser) {
    const startTime = Date.now();
    
    try {
      console.log(`📥 [SOS] Iniciando processamento da emergência...`);

      // 1. Busca dados do pet
      const pet = await petRepository.findByIdAndUser(petId, userId);
      
      if (!pet) {
        throw new AppError('Pet não encontrado', 404);
      }

      // 2. Calcular idade dinâmica
      const nascimento = new Date(pet.dataNascimento);
      const hoje = new Date();
      let anos = hoje.getFullYear() - nascimento.getFullYear();
      let meses = hoje.getMonth() - nascimento.getMonth();
      
      if (meses < 0) {
        anos--;
        meses += 12;
      }

      // 3. Montar contexto DO PET
      const dadosPet = `
Pet: ${pet.nome} | 
Espécie: ${pet.especie} | 
Raça: ${pet.raca} | 
Peso: ${pet.peso}kg | 
Idade: ${anos}a ${meses}m | 
Castrado: ${pet.castrado ? 'Sim' : 'Não'}
      `.trim();

      // 4. Verificar cache
      const mensagemNormalizada = mensagemUser
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
      const cacheKey = `${petId}:${mensagemNormalizada}`;
      const cachedResponse = this.getFromCache(cacheKey);

      let respostaIA;

      if (cachedResponse) {
        console.log(`✅ [CACHE] Resposta encontrada no cache!`);
        respostaIA = cachedResponse;
      } else {
        // 5. Prompt otimizado para PRIMEIRA mensagem
        const promptFinal = `
DADOS DO PET:
${dadosPet}

PROBLEMA/DÚVIDA DO TUTOR:
${mensagemUser}

VOCÊ É O SOS BITZY, UM VETERINÁRIO VIRTUAL ESPECIALISTA EM PETS.

RESPONDA RAPIDAMENTE:
1. **Diagnóstico preliminar**: O que pode estar acontecendo (máximo 2 linhas)
2. **Recomendações imediatas**: O que fazer agora (máximo 3 linhas)
3. **Próximas perguntas**: Faça 2-3 perguntas de acompanhamento para entender melhor (no final da resposta)

Seja direto, claro e reconfortante. Faça perguntas para continuar conversando!
        `.trim();

        // 6. Chamar IA
        console.log('🤖 [IA] Enviando para OpenAI...');
        const iaStartTime = Date.now();

        respostaIA = await aiService.gerarAnaliseBitzy(promptFinal);

        const iaTime = Date.now() - iaStartTime;
        console.log(`✅ [IA] Resposta gerada em ${iaTime}ms`);

        // 7. Salvar no cache
        this.saveToCache(cacheKey, respostaIA);
      }

      // 8. Salvar no banco
      console.log('💾 [DB] Salvando no banco de dados...');

      const atendimento = await sosRepository.create({
        userId,
        petId,
        mensagemUser,
        respostaIA,
      });

      // ✅ NOVO: Salvar histórico em memória (temporário)
      historicoEmMemoria.set(atendimento.id, [
        {
          role: 'user',
          content: mensagemUser,
          timestamp: new Date()
        },
        {
          role: 'assistant',
          content: respostaIA,
          timestamp: new Date()
        }
      ]);

      const totalTime = Date.now() - startTime;
      console.log(`✅ [SOS] Atendimento criado em ${totalTime}ms`);
      console.log(`   ID: ${atendimento.id}\n`);

      return atendimento;

    } catch (error) {
      console.error(`❌ [SOS] Erro:`, error.message);
      throw error;
    }
  }

  /**
   * ========== NOVO: Adicionar mensagem ao chat ==========
   */
  async adicionarMensagemAoChat(atendimentoId, userId, novaMensagem) {
    const startTime = Date.now();
    
    try {
      console.log(`\n📥 [CHAT] Adicionando nova mensagem ao chat...`);

      // 1. Buscar atendimento existente
      const atendimento = await sosRepository.findByIdAndUser(atendimentoId, userId);
      
      if (!atendimento) {
        throw new AppError('Atendimento não encontrado', 404);
      }

      // 2. Buscar dados do pet para contexto
      const pet = await petRepository.findById(atendimento.petId);

      // 3. Recuperar histórico anterior (da memória)
      let historico = historicoEmMemoria.get(atendimentoId) || [];

      // 4. Calcular idade do pet
      const nascimento = new Date(pet.dataNascimento);
      const hoje = new Date();
      let anos = hoje.getFullYear() - nascimento.getFullYear();
      let meses = hoje.getMonth() - nascimento.getMonth();
      
      if (meses < 0) {
        anos--;
        meses += 12;
      }

      const dadosPet = `
Pet: ${pet.nome} | 
Espécie: ${pet.especie} | 
Raça: ${pet.raca} | 
Peso: ${pet.peso}kg | 
Idade: ${anos}a ${meses}m | 
Castrado: ${pet.castrado ? 'Sim' : 'Não'}
      `.trim();

      // 5. Montar prompt com histórico completo
      const historicoTexto = historico
        .map(msg => `${msg.role === 'user' ? 'TUTOR' : 'SOS BITZY'}: ${msg.content}`)
        .join('\n\n');

      const promptFinal = `
DADOS DO PET:
${dadosPet}

===== HISTÓRICO DA CONVERSA =====
${historicoTexto}

===== NOVA MENSAGEM DO TUTOR =====
${novaMensagem}

===== INSTRUÇÕES =====
VOCÊ É O SOS BITZY, VETERINÁRIO VIRTUAL.

Você já discutiu o problema inicial com o tutor. Agora responda esta nova mensagem considerando o contexto da conversa.

RESPONDA:
1. **Responder à pergunta/informação** (máximo 4 linhas)
2. **Próxima ação ou pergunta** (máximo 2 linhas)

Se o tutor parecer satisfeito ou disser que vai ao veterinário, encerre com uma mensagem reconfortante.

Seja conciso, direto e clínico!
      `.trim();

      // 6. Chamar IA
      console.log('🤖 [CHAT] Enviando para OpenAI...');
      const iaStartTime = Date.now();

      const respostaIA = await aiService.gerarAnaliseBitzy(promptFinal);

      const iaTime = Date.now() - iaStartTime;
      console.log(`✅ [CHAT] Resposta gerada em ${iaTime}ms`);

      // 7. Adicionar nova mensagem ao histórico
      historico.push({
        role: 'user',
        content: novaMensagem,
        timestamp: new Date()
      });

      historico.push({
        role: 'assistant',
        content: respostaIA,
        timestamp: new Date()
      });

      // 8. Salvar histórico atualizado em memória
      historicoEmMemoria.set(atendimentoId, historico);

      // 9. Atualizar atendimento no banco (com última resposta)
      console.log('💾 [DB] Atualizando histórico...');

      const atendimentoAtualizado = await sosRepository.update(
        atendimentoId,
        {
          respostaIA: respostaIA,
        }
      );

      const totalTime = Date.now() - startTime;
      console.log(`✅ [CHAT] Mensagem processada em ${totalTime}ms`);
      console.log(`   Histórico: ${historico.length} mensagens\n`);

      return {
        ...atendimentoAtualizado,
        respostaIA: respostaIA, // Assegurar que retorna a resposta
        historico: historico // Retornar histórico também
      };

    } catch (error) {
      console.error(`❌ [CHAT] Erro:`, error.message);
      throw error;
    }
  }

  /**
   * ========== NOVO: Obter histórico completo ==========
   */
  async obterHistoricoCompleto(atendimentoId, userId) {
    try {
      const atendimento = await sosRepository.findByIdAndUser(atendimentoId, userId);
      
      if (!atendimento) {
        throw new AppError('Atendimento não encontrado', 404);
      }

      // Recuperar histórico da memória
      const historico = historicoEmMemoria.get(atendimentoId) || [];

      return {
        atendimentoId: atendimento.id,
        petId: atendimento.petId,
        status: 'ativo',
        criadoEm: atendimento.createdAt,
        atualizadoEm: atendimento.updatedAt,
        mensagens: historico
      };

    } catch (error) {
      console.error(`❌ [CHAT] Erro ao obter histórico:`, error.message);
      throw error;
    }
  }

  /**
   * ========== NOVO: Encerrar atendimento ==========
   */
  async encerrarAtendimento(atendimentoId, userId) {
    try {
      const atendimento = await sosRepository.findByIdAndUser(atendimentoId, userId);
      
      if (!atendimento) {
        throw new AppError('Atendimento não encontrado', 404);
      }

      // Limpar histórico da memória
      historicoEmMemoria.delete(atendimentoId);

      console.log(`✅ [SOS] Atendimento ${atendimentoId} encerrado`);

      return atendimento;

    } catch (error) {
      console.error(`❌ [SOS] Erro ao encerrar:`, error.message);
      throw error;
    }
  }

  /**
   * Buscar atendimento existente (compatibilidade)
   */
  async getAtendimento(id, userId) {
    try {
      const atendimento = await sosRepository.findByIdAndUser(id, userId);
      if (!atendimento) throw new AppError('Atendimento não encontrado', 404);
      
      // Retornar também o histórico
      const historico = historicoEmMemoria.get(id) || [];
      return {
        ...atendimento,
        historico: historico
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * ========== FUNÇÕES DE CACHE ==========
   */
  getFromCache(key) {
    const cached = responseCache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      responseCache.delete(key);
      return null;
    }
    return cached.data;
  }

  saveToCache(key, data) {
    if (responseCache.size >= CACHE_MAX_SIZE) {
      const firstKey = responseCache.keys().next().value;
      responseCache.delete(firstKey);
    }
    responseCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  limparCache() {
    responseCache.clear();
    console.log(`🗑️  [CACHE] Cache limpo`);
  }

  getEstatisticasCache() {
    return {
      itensNoCache: responseCache.size,
      tamanhoMaximo: CACHE_MAX_SIZE,
      percentualOcupado: ((responseCache.size / CACHE_MAX_SIZE) * 100).toFixed(2),
    };
  }
}

module.exports = new SosService();