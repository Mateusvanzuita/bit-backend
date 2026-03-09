// src/services/aiService.js
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  httpClient: {
    timeout: 30000, // ✅ Timeout AQUI (na inicialização)
  }
});

class AIService {
  /**
   * Gera análise Bitzy COM CORREÇÃO DO TIMEOUT
   */
  async gerarAnaliseBitzy(promptCompleto, retryCount = 0) {
    try {
      const startTime = Date.now();
      
      console.log('\n========== INICIANDO ANÁLISE IA ==========');
      console.log('⏱️  [IA] Timestamp:', new Date().toISOString());
      console.log('🔑 [IA] API Key presente?', !!process.env.OPENAI_API_KEY);
      console.log('🤖 [IA] Modelo:', 'gpt-4o-mini');
      console.log('📝 [IA] Prompt size:', promptCompleto.length, 'caracteres');
      console.log('⏱️  [IA] Max tokens: 200');
      console.log('=========================================\n');

      // Validação de API Key
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('❌ OPENAI_API_KEY não está definida no .env');
      }

      if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
        throw new Error('❌ OPENAI_API_KEY não começa com "sk-" (formato inválido)');
      }

      console.log('📤 [IA] Enviando requisição para OpenAI...');

      // ✅ CORREÇÃO: Remover timeout daqui e colocar APENAS os parâmetros válidos
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: "Você é o SOS Bitzy. Responda BREVEMENTE em máximo 150 palavras. Seja direto e prático." 
          },
          { 
            role: "user", 
            content: promptCompleto 
          }
        ],
        temperature: 0.7,
        max_tokens: 200,
        // ❌ NÃO colocar timeout aqui! OpenAI não reconhece este parâmetro
      });

      console.log('✅ [IA] Resposta recebida com sucesso!');
      console.log('📊 [IA] Tokens usados:', response.usage?.total_tokens || 'N/A');
      console.log('📊 [IA] Finish reason:', response.choices[0]?.finish_reason || 'N/A');

      const processingTime = Date.now() - startTime;
      console.log(`✅ [IA] Tempo total: ${processingTime}ms (${(processingTime / 1000).toFixed(1)}s)\n`);

      const resposta = response.choices[0].message.content;
      
      return resposta;

    } catch (error) {
      console.error('\n❌ ===== ERRO NA IA =====');
      console.error('❌ Nome do erro:', error.name);
      console.error('❌ Mensagem:', error.message);
      console.error('❌ Status HTTP:', error.status);
      console.error('========================\n');

      // ✅ RETRY AUTOMÁTICO (até 2 tentativas)
      if (retryCount < 2 && this.isRetryableError(error)) {
        console.log(`🔄 [IA] Retry ${retryCount + 1}/2 em 2 segundos...\n`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return this.gerarAnaliseBitzy(promptCompleto, retryCount + 1);
      }

      // ✅ RESPOSTA DE FALLBACK
      console.warn('⚠️  [IA] Usando resposta de fallback\n');
      return this.gerarRespostaFallback();
    }
  }

  /**
   * Verifica se erro é retentável
   */
  isRetryableError(error) {
    return (
      error.status === 429 ||
      error.status === 500 ||
      error.status === 502 ||
      error.status === 503 ||
      error.status === 504 ||
      error.code === 'ECONNABORTED' ||
      error.code === 'ECONNREFUSED' ||
      error.message?.includes('timeout')
    );
  }

  /**
   * Resposta de fallback
   */
  gerarRespostaFallback() {
    return `
🐾 SOS Bitzy - Recomendações Gerais

Desculpe, não conseguimos conectar à IA no momento.

✅ O que você pode fazer agora:
1. **Observar o pet**: Procure por sinais de desconforto, letargia ou mudanças no comportamento
2. **Manter confortável**: Certifique-se que tem água fresca e lugar para descansar
3. **Consultar veterinário**: Se persistir ou piorar, busque ajuda profissional

Tente fazer nova análise em alguns minutos. Desculpe pelo inconveniente!
    `.trim();
  }

  /**
   * Versão ULTRA-RÁPIDA (gpt-3.5-turbo)
   */
  async gerarAnaliseRapida(promptCompleto) {
    try {
      console.log('⚡ [IA] Usando modelo RÁPIDO (gpt-3.5-turbo)...');

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { 
            role: "system", 
            content: "Responda em máximo 100 palavras. Seja direto." 
          },
          { 
            role: "user", 
            content: promptCompleto 
          }
        ],
        temperature: 0.7,
        max_tokens: 150,
        // ✅ Sem timeout aqui também!
      });

      console.log('⚡ [IA] Análise rápida concluída\n');
      return response.choices[0].message.content;

    } catch (error) {
      console.error('❌ [IA] Erro na análise rápida:', error.message);
      return this.gerarRespostaFallback();
    }
  }

  /**
   * Com streaming (tempo real)
   */
  async gerarAnaliseBitzyStream(promptCompleto, onChunk) {
    try {
      const startTime = Date.now();
      
      console.log('🌊 [IA] Iniciando análise com STREAMING...');

      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: "Você é o SOS Bitzy. Responda em máximo 200 palavras." 
          },
          { 
            role: "user", 
            content: promptCompleto 
          }
        ],
        temperature: 0.7,
        max_tokens: 200,
        stream: true, // ✅ Streaming ativado
      });

      let fullResponse = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          onChunk?.(content); // Callback a cada chunk
        }
      }

      const processingTime = Date.now() - startTime;
      console.log(`🌊 [IA] Streaming concluído em ${(processingTime / 1000).toFixed(1)}s`);

      return fullResponse;

    } catch (error) {
      console.error('❌ [IA] Erro no streaming:', error.message);
      return this.gerarRespostaFallback();
    }
  }
}

module.exports = new AIService();