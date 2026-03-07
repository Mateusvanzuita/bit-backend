const petRepository = require('../repositories/petRepository');
const aiService = require('./aiService');
const { AppError } = require('../middlewares/errorHandler');

class SosService {
  async processarEmergencia(userId, petId, mensagemUser) {
    // 1. Busca dados completos do pet para o 1º parágrafo do prompt
    const pet = await petRepository.findByIdAndUser(petId, userId);
    if (!pet) throw new AppError('Pet não encontrado', 404);

    // 2. Monta o contexto do Pet para a IA
    const dadosPet = `Nome: ${pet.nome}, Espécie: ${pet.especie}, Raça: ${pet.raca}, Peso: ${pet.peso}kg, Idade: ${pet.idade} anos e ${pet.meses} meses, Castrado: ${pet.castrado ? 'Sim' : 'Não'}.`;

    // 3. Prompt seguindo suas REGRAS ABSOLUTAS
    const promptFinal = `
      Você é o SOS Bitzy... (copie aqui seu prompt completo)
      
      DADOS DO PET DO USUÁRIO:
      ${dadosPet}

      DÚVIDA/PROBLEMA DO TUTOR:
      ${mensagemUser}
    `;

    // 4. Chama a IA
    const respostaIA = await aiService.gerarAnaliseBitzy(promptFinal);

    // 5. Salva no banco (opcional, mas recomendado)
    // await sosRepository.create({ userId, petId, mensagemUser, respostaIA });

    return { respostaIA };
  }
}

module.exports = new SosService();