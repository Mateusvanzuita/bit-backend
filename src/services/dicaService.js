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
      // 1. Validação e busca de dados do Pet
      const pet = await petRepository.findByIdAndUser(petId, userId);
      if (!pet) throw new AppError('Pet não encontrado ou acesso negado', 404);

      // 2. Busca o prompt base da dica
      const dicaBase = await dicaRepository.findById(dicaId);

      // Verificação de segurança: Se o prompt não vier do banco, paramos aqui.
      if (!dicaBase || !dicaBase.prompt) {
        throw new AppError('Configuração de IA não encontrada para esta dica no banco de dados.', 500);
      }

      // 3. Criar o registro de histórico (DicaHistorico)
      const historico = await dicaRepository.createHistorico(petId, dicaId);

      // 4. Salvar todas as respostas vinculadas a este histórico e preparar resumo para a IA
      let resumoRespostas = "";
      const promises = respostas.map((resp) => {
        resumoRespostas +=
          `Pergunta (ID Etapa: ${resp.etapaId}): ` +
          `Resposta ID: ${resp.opcaoId || 'N/A'}, ` +
          `Texto: ${resp.texto || 'N/A'}\n`;

        return dicaRepository.createResposta({
          historicoId: historico.id,
          etapaId: resp.etapaId,
          opcaoId: resp.opcaoId || null,
          texto: resp.texto || null,
          fotoUrl: resp.fotoUrl || null,
          petId: petId,
          dicaId: dicaId
        });
      });

      await Promise.all(promises);

      // 5. Montar o Prompt Final com tratamento de segurança para campos opcionais
      const convivenciaStr = Array.isArray(pet.convivencia) ? pet.convivencia.join(', ') : 'Não informada';

      // fallback de segurança para campos que podem vir vazios
      const corStr = pet.cor || 'N/D';

      const promptFinal = `
        ${dicaBase.prompt}
        
        DADOS DO PET:
        Nome: ${pet.nome}, Espécie: ${pet.especie}, Raça: ${pet.raca || 'N/D'}, Cor: ${corStr},
        Idade: ${pet.idade} anos e ${pet.meses} meses, Sexo: ${pet.sexo}, 
        Porte: ${pet.porte}, Castrado: ${pet.castrado ? 'Sim' : 'Não'}, 
        Comportamento: ${pet.comportamento}, Convivência: ${convivenciaStr}.
        
        RESPOSTAS DO TUTOR:
        ${resumoRespostas}
      `;

      // 6. Chamar a IA e salvar o resultado com Try/Catch
      try {
        const resultadoIA = await aiService.gerarAnaliseBitzy(promptFinal);

        await dicaRepository.updateResultadoIA(historico.id, resultadoIA);

        return { ...historico, resultadoIA };
      } catch (error) {
        console.error("❌ ERRO AO PROCESSAR IA BITZY (DICA):", error.message);
        throw new AppError(`Falha na comunicação com a IA: ${error.message}`, 500);
      }
    }

  async getHistorico(id) {
    return await dicaRepository.findHistoricoById(id);
  }
}

module.exports = new DicaService();