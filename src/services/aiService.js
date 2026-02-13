// src/services/aiService.js
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});

class AIService {
  async gerarAnaliseBitzy(promptCompleto) {
    try {
      const response = await openai.responses.create({
        model: "gpt-5-nano",
        input: promptCompleto,
        store: true,
      });

      // Seguindo o modelo de retorno do seu exemplo
      const result = await response;
      return result.output_text;
    } catch (error) {
      console.error('Erro ao chamar OpenAI:', error);
      return "Desculpe, não conseguimos processar a análise agora. Por favor, consulte um veterinário.";
    }
  }
}

module.exports = new AIService();