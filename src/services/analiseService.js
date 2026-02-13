const analiseRepository = require('../repositories/analiseRepository');
const petRepository = require('../repositories/petRepository');
const { AppError } = require('../middlewares/errorHandler');
const aiService = require('./aiService');

class AnaliseService {
  async listAllAnalises() {
    return await analiseRepository.findAll({ orderBy: { createdAt: 'desc' } });
  }

  async getAnaliseDetails(id) {
    const analise = await analiseRepository.findFullAnalise(id);
    if (!analise) throw new AppError('Análise não encontrada', 404);
    return analise;
  }

async salvarAnaliseCompleta(userId, petId, analiseId, respostas) {
    // 1. Validação e busca de dados do Pet
    const pet = await petRepository.findByIdAndUser(petId, userId);
    if (!pet) throw new AppError('Pet não encontrado ou acesso negado', 404);

    // 2. Busca o prompt base da análise
    const analiseBase = await analiseRepository.findById(analiseId);
    
    // Verificação de segurança: Se o prompt não vier do banco, paramos aqui.
    if (!analiseBase || !analiseBase.prompt) {
      throw new AppError('Configuração de IA não encontrada para esta análise no banco de dados.', 500);
    }

    // 3. Criar o registro de histórico (AnaliseHistorico)
    const historico = await analiseRepository.createHistorico(petId, analiseId);

    // 4. Salvar todas as respostas vinculadas a este histórico e preparar resumo para a IA
    let resumoRespostas = "";
    const promises = respostas.map(resp => {
      resumoRespostas += `Pergunta (ID Etapa: ${resp.etapaId}): Resposta ID: ${resp.opcaoId || 'N/A'}, Texto: ${resp.texto || 'N/A'}\n`;
      return analiseRepository.createResposta({
        historicoId: historico.id,
        etapaId: resp.etapaId,
        opcaoId: resp.opcaoId || null,
        texto: resp.texto || null,
        fotoUrl: resp.fotoUrl || null
      });
    });

    await Promise.all(promises);

    // 5. Montar o Prompt Final com tratamento de segurança para campos opcionais
    // Evita erro se convivencia for nulo ou não for um array
    const convivenciaStr = Array.isArray(pet.convivencia) ? pet.convivencia.join(', ') : 'Não informada';
    
    const promptFinal = `
      ${analiseBase.prompt}
      
      DADOS DO PET:
      Nome: ${pet.nome}, Espécie: ${pet.especie}, Raça: ${pet.raca || 'N/D'}, 
      Idade: ${pet.idade} anos e ${pet.meses} meses, Sexo: ${pet.sexo}, 
      Porte: ${pet.porte}, Castrado: ${pet.castrado ? 'Sim' : 'Não'}, 
      Comportamento: ${pet.comportamento}, Convivência: ${convivenciaStr}.
      
      RESPOSTAS DO TUTOR:
      ${resumoRespostas}
    `;

    // 6. Chamar a IA e salvar o resultado com Try/Catch para identificar o erro 500
    try {
      // Chama o serviço da OpenAI
      const resultadoIA = await aiService.gerarAnaliseBitzy(promptFinal);
      
      // Atualiza o registro de histórico com o texto gerado
      await analiseRepository.updateResultadoIA(historico.id, resultadoIA);

      // Retorna o histórico completo para o frontend
      return { ...historico, resultadoIA };

    } catch (error) {
      // Este log aparecerá no seu terminal do VS Code/Backend
      console.error("❌ ERRO AO PROCESSAR IA BITZY:", error.message);
      
      // Lança o erro detalhado para o frontend entender o que falhou
      throw new AppError(`Falha na comunicação com a IA: ${error.message}`, 500);
    }
  }

  async getHistoricoById(id) {
  const historico = await analiseRepository.findHistoricoById(id);
  if (!historico) throw new AppError('Resultado da análise não encontrado', 404);
  return historico;
}
}

module.exports = new AnaliseService();