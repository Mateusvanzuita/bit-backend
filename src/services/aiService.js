// src/services/aiService.js
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});

class AIService {
  async gerarAnaliseBitzy(promptCompleto) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", 
        messages: [
          { role: "system", content: "Você é o assistente virtual da Bitzy, especialista em saúde e bem-estar pet." },
          { role: "user", content: promptCompleto }
        ],
        temperature: 0.7,
      });
      return response.choices[0].message.content;

    } catch (error) {
      console.error('Erro ao chamar OpenAI:', error);
      return "Desculpe, não conseguimos processar a análise agora. Por favor, consulte um veterinário.";
    }
  }
}

module.exports = new AIService();